import { Kazagumo, KazagumoPlayer, KazagumoTrack, Plugins, PlayerState, KazagumoSearchResult } from 'kazagumo';
import { Connectors } from 'shoukaku';
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextChannel,
    Message,
    GuildMember,
    VoiceBasedChannel
} from 'discord.js';
import { BotClient } from '../types/BotClient.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { COLORS, EMOJIS } from '../utils/constants.js';

// Nodos Lavalink publicos
const LAVALINK_NODES = [
    {
        name: 'Lavalink1',
        url: 'lavalink.jirayu.net:13592',
        auth: 'youshallnotpass',
        secure: false
    },
    {
        name: 'Lavalink2',
        url: 'lava-v4.ajieblogs.eu.org:80',
        auth: 'https://dsc.gg/ajidevserver',
        secure: false
    }
];

export enum LoopMode {
    NONE = 'none',
    TRACK = 'track',
    QUEUE = 'queue'
}

export class MusicManager {
    public kazagumo: Kazagumo;
    private client: BotClient;
    private playerMessages: Map<string, Message> = new Map();
    private textChannels: Map<string, TextChannel> = new Map();

    constructor(client: BotClient) {
        this.client = client;

        this.kazagumo = new Kazagumo({
            defaultSearchEngine: 'youtube',
            plugins: [
                new Plugins.PlayerMoved(client)
            ],
            send: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        }, new Connectors.DiscordJS(client), LAVALINK_NODES);

        this.setupEvents();
        logger.info('MusicManager', 'Manager de Lavalink inicializado');
    }

    private setupEvents(): void {
        // Shoukaku events
        this.kazagumo.shoukaku.on('ready', (name) => {
            logger.info('MusicManager', `Nodo Lavalink conectado: ${name}`);
        });

        this.kazagumo.shoukaku.on('error', (name, error) => {
            logger.error('MusicManager', `Error en nodo ${name}`, error);
        });

        this.kazagumo.shoukaku.on('close', (name, code, reason) => {
            logger.warn('MusicManager', `Nodo ${name} desconectado. Code: ${code}, Reason: ${reason}`);
        });

        this.kazagumo.shoukaku.on('disconnect', (name, count) => {
            logger.warn('MusicManager', `Nodo ${name} desconectado, ${count} players afectados`);
        });

        // Kazagumo player events
        this.kazagumo.on('playerStart', async (player, track) => {
            logger.info('MusicManager', `Reproduciendo: ${track.title}`);
            await this.sendPlayerEmbed(player, track);
        });

        this.kazagumo.on('playerEnd', async (player) => {
            // Si no hay mas canciones, no hacer nada (playerEmpty se encarga)
        });

        this.kazagumo.on('playerEmpty', async (player) => {
            const channel = this.textChannels.get(player.guildId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.INFO)
                    .setDescription(`${EMOJIS.MUSIC} La cola ha terminado. Agrega mas canciones!`);
                await channel.send({ embeds: [embed] });
            }
            await this.deletePlayerMessage(player.guildId);
        });

        this.kazagumo.on('playerDestroy', async (player) => {
            await this.deletePlayerMessage(player.guildId);
            this.textChannels.delete(player.guildId);
            logger.info('MusicManager', 'Player destruido');
        });

        this.kazagumo.on('playerException', (player, data) => {
            logger.error('MusicManager', 'Excepción en player', data);
            const channel = this.textChannels.get(player.guildId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.DANGER)
                    .setDescription(`${EMOJIS.ERROR} **Error:** ${data.exception?.message || 'Error desconocido'}`);
                channel.send({ embeds: [embed] }).catch(() => {});
            }
        });
    }

    /**
     * Reproduce una cancion o la agrega a la cola
     */
    async play(
        voiceChannel: VoiceBasedChannel,
        textChannel: TextChannel,
        query: string,
        requester: GuildMember
    ): Promise<KazagumoSearchResult> {
        const guildId = voiceChannel.guild.id;

        // Guardar canal de texto
        this.textChannels.set(guildId, textChannel);

        // Obtener o crear player
        let player = this.kazagumo.players.get(guildId);

        if (!player) {
            player = await this.kazagumo.createPlayer({
                guildId: guildId,
                voiceId: voiceChannel.id,
                textId: textChannel.id,
                deaf: true,
                volume: 80
            });
        }

        // Buscar cancion
        const result = await this.kazagumo.search(query, { requester });

        if (!result.tracks.length) {
            throw new Error('No se encontraron resultados');
        }

        // Agregar a la cola
        if (result.type === 'PLAYLIST') {
            for (const track of result.tracks) {
                player.queue.add(track);
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.SUCCESS} **Playlist agregada:** ${result.playlistName}`)
                .addFields(
                    { name: 'Canciones', value: `${result.tracks.length}`, inline: true }
                );
            await textChannel.send({ embeds: [embed] });
        } else {
            const track = result.tracks[0];
            player.queue.add(track);

            // Si ya hay algo reproduciendose, notificar que se agrego a la cola
            if (player.playing || player.paused) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setDescription(`${EMOJIS.SUCCESS} **Agregado a la cola:** [${track.title}](${track.uri})`)
                    .addFields(
                        { name: 'Duracion', value: this.formatTime(Math.floor((track.length || 0) / 1000)), inline: true },
                        { name: 'Posicion en cola', value: `#${player.queue.length}`, inline: true }
                    )
                    .setThumbnail(track.thumbnail || null)
                    .setFooter({ text: `Solicitado por ${requester.displayName}` });
                await textChannel.send({ embeds: [embed] });
            }
        }

        // Iniciar reproduccion si no esta reproduciendo
        if (!player.playing && !player.paused) {
            await player.play();
        }

        return result;
    }

    /**
     * Envia el embed del reproductor con botones
     */
    async sendPlayerEmbed(player: KazagumoPlayer, track: KazagumoTrack): Promise<void> {
        const channel = this.textChannels.get(player.guildId);
        if (!channel) return;

        const embed = this.createPlayerEmbed(player, track);
        const buttons = this.createPlayerButtons(player);

        try {
            await this.deletePlayerMessage(player.guildId);

            const message = await channel.send({
                embeds: [embed],
                components: buttons
            });

            this.playerMessages.set(player.guildId, message);
        } catch (error) {
            logger.error('MusicManager', 'Error enviando reproductor', error);
        }
    }

    /**
     * Actualiza el embed del reproductor existente
     */
    async refreshPlayerEmbed(player: KazagumoPlayer): Promise<void> {
        const message = this.playerMessages.get(player.guildId);
        const track = player.queue.current;
        if (!message || !track) return;

        const embed = this.createPlayerEmbed(player, track);
        const buttons = this.createPlayerButtons(player);

        try {
            await message.edit({
                embeds: [embed],
                components: buttons
            });
        } catch (error) {
            logger.error('MusicManager', 'Error actualizando reproductor', error);
        }
    }

    /**
     * Crea el embed del reproductor
     */
    createPlayerEmbed(player: KazagumoPlayer, track: KazagumoTrack): EmbedBuilder {
        const progress = this.createProgressBar(player, track);
        const loopMode = player.loop === LoopMode.NONE
            ? 'Desactivado'
            : player.loop === LoopMode.TRACK
                ? 'Cancion'
                : 'Cola';

        const requester = track.requester as GuildMember | undefined;

        const embed = new EmbedBuilder()
            .setColor(0x1DB954)
            .setAuthor({
                name: 'Reproduciendo ahora',
                iconURL: 'https://i.imgur.com/3Lx4ivB.png'
            })
            .setTitle(track.title || 'Cancion desconocida')
            .setURL(track.uri || null)
            .setThumbnail(track.thumbnail || null)
            .addFields(
                {
                    name: 'Artista',
                    value: track.author || 'Desconocido',
                    inline: true
                },
                {
                    name: 'Duracion',
                    value: this.formatTime(Math.floor((track.length || 0) / 1000)),
                    inline: true
                },
                {
                    name: 'Volumen',
                    value: `${player.volume}%`,
                    inline: true
                },
                {
                    name: 'En cola',
                    value: `${player.queue.length} canciones`,
                    inline: true
                },
                {
                    name: 'Repetir',
                    value: loopMode,
                    inline: true
                },
                {
                    name: 'Fuente',
                    value: track.sourceName || 'Desconocida',
                    inline: true
                }
            )
            .setDescription(progress)
            .setFooter({
                text: `Solicitado por ${requester?.displayName || 'Desconocido'}`,
                iconURL: requester?.user?.avatarURL() || undefined
            })
            .setTimestamp();

        return embed;
    }

    /**
     * Crea la barra de progreso visual
     */
    createProgressBar(player: KazagumoPlayer, track: KazagumoTrack): string {
        const current = Math.floor((player.position || 0) / 1000);
        const total = Math.floor((track.length || 0) / 1000);
        const size = 15;

        const progress = total > 0 ? Math.round((current / total) * size) : 0;
        const emptyProgress = size - progress;

        const progressText = '▬'.repeat(Math.max(0, progress)) + '🔘' + '▬'.repeat(Math.max(0, emptyProgress));
        const currentTime = this.formatTime(current);
        const totalTime = this.formatTime(total);

        return `\`${currentTime}\` ${progressText} \`${totalTime}\``;
    }

    /**
     * Formatea segundos a MM:SS
     */
    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Crea los botones del reproductor
     */
    createPlayerButtons(player: KazagumoPlayer): ActionRowBuilder<ButtonBuilder>[] {
        const isPaused = player.paused;
        const loop = player.loop;

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),

            new ButtonBuilder()
                .setCustomId('music_playpause')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('music_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setEmoji('🔀')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji(loop === LoopMode.QUEUE ? '🔁' : '🔂')
                .setLabel(loop === LoopMode.NONE ? 'Off' : loop === LoopMode.TRACK ? 'Cancion' : 'Cola')
                .setStyle(loop !== LoopMode.NONE ? ButtonStyle.Success : ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('music_voldown')
                .setEmoji('🔉')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('music_volup')
                .setEmoji('🔊')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('music_queue')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Primary)
        );

        return [row1, row2];
    }

    /**
     * Elimina el mensaje del reproductor
     */
    async deletePlayerMessage(guildId: string): Promise<void> {
        const message = this.playerMessages.get(guildId);
        if (message) {
            try {
                await message.delete();
            } catch {
                // El mensaje ya fue eliminado
            }
            this.playerMessages.delete(guildId);
        }
    }

    /**
     * Obtiene el player de un servidor
     */
    getPlayer(guildId: string): KazagumoPlayer | undefined {
        return this.kazagumo.players.get(guildId);
    }

    /**
     * Destruye el manager y limpia recursos
     */
    destroy(): void {
        for (const [guildId] of this.playerMessages) {
            this.deletePlayerMessage(guildId);
        }
        this.playerMessages.clear();
        this.textChannels.clear();
        logger.info('MusicManager', 'Manager destruido');
    }
}

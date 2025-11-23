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

/** Nodos Lavalink públicos para conexión de audio */
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

/** Tiempo de inactividad antes de desconectar (5 minutos) */
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export class MusicManager {
    public kazagumo: Kazagumo;
    private client: BotClient;
    private playerMessages: Map<string, Message> = new Map();
    private textChannels: Map<string, TextChannel> = new Map();
    private trackHistory: Map<string, KazagumoTrack[]> = new Map();
    private inactivityTimers: Map<string, NodeJS.Timeout> = new Map();
    private skipHistorySave: Set<string> = new Set(); // Evita guardar en historial al usar "anterior"

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

        this.kazagumo.on('playerStart', async (player, track) => {
            logger.info('MusicManager', `Reproduciendo: ${track.title}`);

            const guild = this.client.guilds.cache.get(player.guildId);
            const botVoiceChannel = guild?.members.me?.voice.channel;
            const usersInChannel = botVoiceChannel?.members.filter(m => !m.user.bot).size || 0;

            if (usersInChannel > 0) {
                this.clearInactivityTimer(player.guildId);
            }

            await this.sendPlayerEmbed(player, track);
        });

        this.kazagumo.on('playerEnd', async (player) => {
            if (!this.skipHistorySave.has(player.guildId)) {
                const currentTrack = player.queue.current;
                if (currentTrack) {
                    this.addToHistory(player.guildId, currentTrack);
                }
            } else {
                this.skipHistorySave.delete(player.guildId);
            }
        });

        this.kazagumo.on('playerEmpty', async (player) => {
            const channel = this.textChannels.get(player.guildId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.INFO)
                    .setDescription(`${EMOJIS.MUSIC} La cola ha terminado. Agrega mas canciones o me desconectare en 5 minutos.`);
                await channel.send({ embeds: [embed] });
            }
            await this.deletePlayerMessage(player.guildId);
            this.startInactivityTimer(player.guildId);
        });

        this.kazagumo.on('playerDestroy', async (player) => {
            await this.deletePlayerMessage(player.guildId);
            this.textChannels.delete(player.guildId);
            this.trackHistory.delete(player.guildId);
            this.clearInactivityTimer(player.guildId);
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
        const hasHistory = this.hasHistory(player.guildId);

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasHistory),

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
     * Detiene la reproduccion y limpia la cola sin desconectar
     */
    async stop(guildId: string): Promise<boolean> {
        const player = this.kazagumo.players.get(guildId);
        if (!player) return false;

        // Limpiar la cola
        player.queue.clear();

        // Detener la cancion actual
        await player.skip();

        // Limpiar historial
        this.trackHistory.delete(guildId);

        // Eliminar mensaje del reproductor
        await this.deletePlayerMessage(guildId);

        return true;
    }

    /**
     * Conecta el bot a un canal de voz sin reproducir nada
     */
    async join(
        voiceChannel: VoiceBasedChannel,
        textChannel: TextChannel
    ): Promise<KazagumoPlayer> {
        const guildId = voiceChannel.guild.id;

        // Guardar canal de texto
        this.textChannels.set(guildId, textChannel);

        // Verificar si ya existe un player
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

        return player;
    }

    /**
     * Desconecta el bot del canal de voz
     */
    async leave(guildId: string): Promise<boolean> {
        const player = this.kazagumo.players.get(guildId);
        if (!player) return false;

        await player.destroy();
        return true;
    }

    /**
     * Agrega una cancion al historial
     */
    addToHistory(guildId: string, track: KazagumoTrack): void {
        const history = this.trackHistory.get(guildId) || [];
        history.push(track);
        // Mantener solo las ultimas 50 canciones
        if (history.length > 50) {
            history.shift();
        }
        this.trackHistory.set(guildId, history);
    }

    /**
     * Verifica si hay historial disponible
     */
    hasHistory(guildId: string): boolean {
        const history = this.trackHistory.get(guildId);
        return !!history && history.length > 0;
    }

    /**
     * Reproduce la cancion anterior del historial
     */
    async playPrevious(guildId: string): Promise<KazagumoTrack | null> {
        const history = this.trackHistory.get(guildId);
        if (!history || history.length === 0) return null;

        const player = this.kazagumo.players.get(guildId);
        if (!player) return null;

        // Obtener la ultima cancion del historial
        const previousTrack = history.pop();
        if (!previousTrack) return null;

        this.trackHistory.set(guildId, history);

        // Marcar que no debe guardarse en historial al hacer skip
        this.skipHistorySave.add(guildId);

        // Si hay una cancion actual, agregarla al inicio de la cola
        const currentTrack = player.queue.current;
        if (currentTrack) {
            player.queue.unshift(currentTrack);
        }

        // Agregar la cancion anterior al inicio y reproducirla
        player.queue.unshift(previousTrack);
        await player.skip();

        return previousTrack;
    }

    /**
     * Inicia el timer de inactividad
     */
    private startInactivityTimer(guildId: string): void {
        this.clearInactivityTimer(guildId);

        const timer = setTimeout(async () => {
            const player = this.kazagumo.players.get(guildId);
            if (player) {
                const channel = this.textChannels.get(guildId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setDescription(`${EMOJIS.MUSIC} Me desconecte por inactividad. Hasta la proxima!`);
                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
                await player.destroy();
                logger.info('MusicManager', `Player destruido por inactividad en ${guildId}`);
            }
        }, INACTIVITY_TIMEOUT);

        this.inactivityTimers.set(guildId, timer);
        logger.info('MusicManager', `Timer de inactividad iniciado para ${guildId}`);
    }

    /**
     * Limpia el timer de inactividad
     */
    private clearInactivityTimer(guildId: string): void {
        const timer = this.inactivityTimers.get(guildId);
        if (timer) {
            clearTimeout(timer);
            this.inactivityTimers.delete(guildId);
        }
    }

    /**
     * Maneja cuando un usuario sale del canal de voz
     * Llamar desde el evento voiceStateUpdate
     */
    async handleVoiceStateUpdate(guildId: string, voiceChannelId: string | null): Promise<void> {
        const player = this.kazagumo.players.get(guildId);
        if (!player) return;

        // Verificar si el bot sigue en el canal
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;

        const botVoiceChannel = guild.members.me?.voice.channel;
        if (!botVoiceChannel) return;

        // Contar usuarios en el canal (excluyendo bots)
        const usersInChannel = botVoiceChannel.members.filter(m => !m.user.bot).size;

        if (usersInChannel === 0) {
            // No hay usuarios, iniciar timer de desconexion
            const channel = this.textChannels.get(guildId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setDescription(`${EMOJIS.MUSIC} No hay nadie en el canal. Me desconectare en 5 minutos si nadie se une.`);
                await channel.send({ embeds: [embed] }).catch(() => {});
            }
            this.startInactivityTimer(guildId);
        } else {
            // Hay usuarios, cancelar timer si existe
            this.clearInactivityTimer(guildId);
        }
    }

    /**
     * Destruye el manager y limpia recursos
     */
    destroy(): void {
        // Limpiar todos los timers
        for (const [guildId] of this.inactivityTimers) {
            this.clearInactivityTimer(guildId);
        }
        for (const [guildId] of this.playerMessages) {
            this.deletePlayerMessage(guildId);
        }
        this.playerMessages.clear();
        this.textChannels.clear();
        this.trackHistory.clear();
        this.inactivityTimers.clear();
        this.skipHistorySave.clear();
        logger.info('MusicManager', 'Manager destruido');
    }
}

import {
    Events,
    ButtonInteraction,
    EmbedBuilder,
    MessageFlags,
    GuildMember,
    Interaction
} from 'discord.js';
import { Event } from '../types/Events.js';
import { BotClient } from '../types/BotClient.js';
import { logger } from '../utils/logger.js';
import { EMOJIS } from '../utils/constants.js';
import { LoopMode } from '../managers/MusicManager.js';

/**
 * Handler de botones para controles del reproductor de música.
 */
export default {
    name: Events.InteractionCreate,

    async execute(client: BotClient, interaction: Interaction) {
        if (!interaction.isButton()) return;

        const buttonInteraction = interaction as ButtonInteraction;

        if (!buttonInteraction.customId.startsWith('music_')) return;

        const musicManager = client.musicManager;

        if (!musicManager) {
            await buttonInteraction.reply({
                content: 'El sistema de musica no esta disponible.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const guildId = buttonInteraction.guildId;
        if (!guildId) return;

        const player = musicManager.getPlayer(guildId);

        if (!player) {
            await buttonInteraction.reply({
                content: 'No hay musica reproduciendose actualmente.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const member = buttonInteraction.member as GuildMember;
        if (!member.voice.channel) {
            await buttonInteraction.reply({
                content: 'Debes estar en un canal de voz para usar los controles.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const botVoiceChannel = buttonInteraction.guild?.members.me?.voice.channel;
        if (botVoiceChannel && member.voice.channel.id !== botVoiceChannel.id) {
            await buttonInteraction.reply({
                content: 'Debes estar en el mismo canal de voz que el bot.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            await buttonInteraction.deferUpdate();

            const action = buttonInteraction.customId.replace('music_', '');

            switch (action) {
                case 'playpause':
                    if (player.paused) {
                        await player.pause(false);
                        logger.info('MusicButtonHandler', 'Reproduccion reanudada via boton');
                    } else {
                        await player.pause(true);
                        logger.info('MusicButtonHandler', 'Reproduccion pausada via boton');
                    }
                    break;

                case 'skip':
                    await player.skip();
                    logger.info('MusicButtonHandler', 'Cancion saltada via boton');
                    break;

                case 'stop':
                    await musicManager.stop(guildId);
                    logger.info('MusicButtonHandler', 'Cola limpiada via boton');
                    return;

                case 'shuffle':
                    player.queue.shuffle();
                    logger.info('MusicButtonHandler', 'Cola mezclada via boton');
                    break;

                case 'loop':
                    const nextMode = player.loop === LoopMode.NONE
                        ? LoopMode.TRACK
                        : player.loop === LoopMode.TRACK
                            ? LoopMode.QUEUE
                            : LoopMode.NONE;
                    player.setLoop(nextMode);
                    logger.info('MusicButtonHandler', `Modo de repeticion cambiado a ${nextMode} via boton`);
                    break;

                case 'voldown':
                    const newVolDown = Math.max(0, player.volume - 10);
                    await player.setVolume(newVolDown);
                    logger.info('MusicButtonHandler', `Volumen reducido a ${newVolDown}% via boton`);
                    break;

                case 'volup':
                    const newVolUp = Math.min(100, player.volume + 10);
                    await player.setVolume(newVolUp);
                    logger.info('MusicButtonHandler', `Volumen aumentado a ${newVolUp}% via boton`);
                    break;

                case 'queue':
                    await showQueue(buttonInteraction, player, musicManager);
                    return;

                case 'previous':
                    const previousTrack = await musicManager.playPrevious(guildId);
                    if (previousTrack) {
                        logger.info('MusicButtonHandler', `Cancion anterior reproducida: ${previousTrack.title}`);
                    } else {
                        await buttonInteraction.followUp({
                            content: 'No hay canciones anteriores en el historial.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    return;
            }

            await musicManager.refreshPlayerEmbed(player);

        } catch (error) {
            logger.error('MusicButtonHandler', 'Error procesando boton', error);

            try {
                await buttonInteraction.followUp({
                    content: 'Hubo un error al procesar tu solicitud.',
                    flags: MessageFlags.Ephemeral
                });
            } catch {
                // Ignorar
            }
        }
    }
} as Event;

async function showQueue(interaction: ButtonInteraction, player: any, musicManager: any): Promise<void> {
    const current = player.queue.current;
    const tracks = player.queue;

    let description = '';

    if (current) {
        description = `${EMOJIS.PLAY} **Ahora:** [${current.title}](${current.uri}) - \`${musicManager.formatTime(Math.floor((current.length || 0) / 1000))}\`\n\n`;
    }

    if (tracks.length > 0) {
        description += '**Cola:**\n';
        const maxItems = Math.min(10, tracks.length);
        for (let i = 0; i < maxItems; i++) {
            const track = tracks[i];
            description += `**${i + 1}.** [${track.title}](${track.uri}) - \`${musicManager.formatTime(Math.floor((track.length || 0) / 1000))}\`\n`;
        }

        if (tracks.length > 10) {
            description += `\n... y ${tracks.length - 10} canciones mas`;
        }
    } else {
        description += '*No hay canciones en la cola*';
    }

    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`${EMOJIS.MUSIC} Cola de reproduccion`)
        .setDescription(description)
        .setFooter({ text: `${tracks.length + 1} canciones en total` });

    await interaction.followUp({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
    });
}

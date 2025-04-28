import { AudioPlayerStatus, getVoiceConnection, VoiceConnectionStatus, joinVoiceChannel, entersState, VoiceConnection } from "@discordjs/voice";
import { GuildMember, VoiceChannel, CommandInteraction, Message, PermissionsBitField } from "discord.js";
import { musicQueue } from "./musicQueue.js";
import { getAudioPlayer } from "./audioPlayers.js";
import { playSong } from "../commands/prefixCommands/voice/playMusic.js";
import { checkAndDisconnectIfAloneOrInactive } from "./voiceStateHandler.js";

export function pause(guildId: string): string {
    const audioPlayer = getAudioPlayer(guildId);
    if (audioPlayer && audioPlayer.state.status === AudioPlayerStatus.Playing) {
        audioPlayer.pause();
        return "Reproducción pausada.";
    } else {
        return "No hay una canción en reproducción para pausar.";
    }
}

export function resume(guildId: string): string {
    const audioPlayer = getAudioPlayer(guildId);
    if (audioPlayer && audioPlayer.state.status === AudioPlayerStatus.Paused) {
        audioPlayer.unpause();
        return "Reproducción reanudada.";
    } else {
        return "No hay una canción pausada para reanudar.";
    }
}

export async function skip(guildId: string, textChannel: any): Promise<string> {
    const audioPlayer = getAudioPlayer(guildId);
    if (audioPlayer && audioPlayer.state.status === AudioPlayerStatus.Playing) {
        if (musicQueue.hasSongs(guildId)) {
            const nextSong = musicQueue.getNextSong(guildId);
            if (nextSong) {
                await playSong(nextSong.url, audioPlayer, textChannel, guildId);
                return `Canción saltada. Ahora reproduciendo: ${nextSong.title}`;
            }
        } else {
            audioPlayer.stop();
            return "No hay más canciones en la cola para saltar.";
        }
    } else {
        return "No hay una canción en reproducción para saltar.";
    }
    return "No se pudo saltar la canción.";
}

export function stop(guildId: string): string {
    const audioPlayer = getAudioPlayer(guildId);
    if (audioPlayer) {
        musicQueue.clearQueue(guildId);
        audioPlayer.stop();
        return "Reproducción detenida y cola limpiada.";
    } else {
        return "No hay una canción en reproducción para detener.";
    }
}

export async function verifyUserInSameVoiceChannel(
    interaction: CommandInteraction | Message, 
    omitBotNotConnectedMessage: boolean = false
): Promise<boolean> {
    const member = interaction.member as GuildMember;
    const botUser = interaction.client.user;
    if (!botUser) {
        await interaction.reply({ content: "No se pudo obtener la información del bot.", ephemeral: true });
        return false;
    }

    const voiceChannel = member.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        await interaction.reply({ content: "Debes estar en un canal de voz para usar este comando.", ephemeral: true });
        return false;
    }

    const connection = getVoiceConnection(interaction.guild!.id);
    if (!connection) {
        if (!omitBotNotConnectedMessage) {
            await interaction.reply({ content: "El bot no está conectado a ningún canal de voz.", ephemeral: true });
        }
        return false;
    }

    if (connection.joinConfig.channelId !== voiceChannel.id) {
        await interaction.reply({ content: "Debes estar en el mismo canal de voz que el bot para usar este comando.", ephemeral: true });
        return false;
    }

    return true;
}

export async function handleVoiceConnection(member: GuildMember, interaction: CommandInteraction | Message): Promise<{ status: string, connection?: VoiceConnection, message?: string }> {
    const guildId = member.guild.id;
    let connection = getVoiceConnection(guildId);

    const voiceChannel = member.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        return {
            status: "error",
            message: "Debes estar en un canal de voz para usar este comando.",
        };
    }

    const botUser = interaction.client.user;
    if (!botUser) {
        return {
            status: "error",
            message: "No se pudo obtener la información del bot.",
        };
    }

    const permissions = voiceChannel.permissionsFor(botUser);
    if (!permissions?.has(PermissionsBitField.Flags.Connect)) {
        return {
            status: "error",
            message: "No tengo permiso para unirme a este canal de voz.",
        };
    }

    if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
        const existingChannel = member.guild.channels.cache.get(connection.joinConfig.channelId!) as VoiceChannel;
        const otherMembers = existingChannel.members.filter((m) => !m.user.bot);

        if (otherMembers.size > 0) {
            return {
                status: "error",
                message: `El bot ya está siendo utilizado en otro canal. Por favor, espera a que termine.`,
            };
        } else {
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, 5000);
                connection.rejoin({
                    channelId: voiceChannel.id,
                    selfDeaf: false,
                    selfMute: false,
                });
            } catch (error) {
                console.error("Error al mover el bot al nuevo canal de voz:", error);
                return {
                    status: "error",
                    message: "Hubo un error al mover el bot al nuevo canal de voz.",
                };
            }
        }
    }

    if (!connection) {
        try {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: member.guild.voiceAdapterCreator,
            });

            checkAndDisconnectIfAloneOrInactive(connection, voiceChannel, guildId, interaction.client);
            await entersState(connection, VoiceConnectionStatus.Ready, 10000);
        } catch (error) {
            console.error("Error al intentar unirse al canal de voz:", error);
            return {
                status: "error",
                message: "Hubo un error al intentar unirse al canal de voz. Por favor, intenta nuevamente.",
            };
        }
    }

    return {
        status: "success",
        connection,
    };
}

import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    entersState,
    VoiceConnectionStatus,
    AudioPlayerStatus,
    AudioPlayer,
    VoiceConnection
} from "@discordjs/voice";
import play from "play-dl";
import {
    GuildMember,
    Message,
    VoiceChannel,
    PermissionsBitField,
    TextChannel,
    EmbedBuilder
} from "discord.js";
import { checkAndDisconnectIfAloneOrInactive } from "../../utils/voiceStateHandler.js";
import { musicQueue } from "../../utils/musicQueue.js";
import { getAudioPlayer, setAudioPlayer } from "../../utils/audioPlayers.js";
import { Command } from "../../types/command.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";
import { CustomImageURLOptions } from "../../types/embeds.js";
import ytdl from "ytdl-core";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Función para buscar y obtener URL
async function searchAndGetURL(query: string): Promise<{ url: string, title: string, isPlaylist: boolean } | null> {
    try {
        let result = query.match(
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|soundcloud\.com)\/.+$/i
        )
            ? { url: query, title: "", isPlaylist: false }
            : null;

        if (result && !result.title) {
            const url = new URL(result.url);
            const isYouTubePlaylist = url.searchParams.get('list');
            const isYouTubeVideo = url.searchParams.get('v');

            if (isYouTubePlaylist) {
                const playlistInfo = await play.playlist_info(result.url, { incomplete: true });

                if (playlistInfo) {
                    const videos = await playlistInfo.all_videos();
                    if (videos.length > 0) {
                        return { url: result.url, title: playlistInfo.title || "Lista de reproducción sin título", isPlaylist: true };
                    }
                }
            } else if (isYouTubeVideo) {
                const playlistID = url.searchParams.get('list');
                if (playlistID) {
                    const playlistInfo = await play.playlist_info(`https://www.youtube.com/playlist?list=${playlistID}`, { incomplete: true });

                    if (playlistInfo) {
                        const videos = await playlistInfo.all_videos();
                        if (videos.length > 0) {
                            return { url: `https://www.youtube.com/playlist?list=${playlistID}`, title: playlistInfo.title || "Lista de reproducción sin título", isPlaylist: true };
                        }
                    }
                } else {
                    const info = await play.video_info(result.url);
                    result.title = info.video_details.title || result.url;
                }
            }
        }

        if (!result) {
            const searchResults = await play.search(query, { limit: 1 });
            if (searchResults.length > 0) {
                result = { url: searchResults[0].url, title: searchResults[0].title || searchResults[0].url, isPlaylist: false };
            }
        }

        if (!result || !(await play.validate(result.url))) {
            return null;
        }

        return result;
    } catch (error) {
        console.error("Error al buscar y obtener la URL:", error);
        return null;
    }
}

// Función para manejar la conexión de voz
async function handleVoiceConnection(member: GuildMember, message: Message): Promise<{ status: string, connection?: VoiceConnection, message?: string }> {
    const guildId = member.guild.id;
    let connection = getVoiceConnection(guildId);

    const voiceChannel = member.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        return {
            status: "error",
            message: "Debes estar en un canal de voz para usar este comando.",
        };
    }

    const botUser = message.client.user;
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

            checkAndDisconnectIfAloneOrInactive(connection, voiceChannel, guildId, message.client);

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

// Función para reproducir una canción
export async function playSong(
    songUrl: string,
    audioPlayer: AudioPlayer,
    textChannel: any,
    guildId: string
) {
    try {
        const stream = await play.stream(songUrl);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });
        audioPlayer.play(resource);
        const songTitle = musicQueue.getQueue(guildId).find(song => song.url === songUrl)?.title || songUrl;
    } catch (error) {
        console.error(`Error al intentar reproducir la canción ${songUrl}:`, error);
        textChannel.send("La canción no está disponible o no se puede reproducir.");
    }
}

// Configuración de eventos del reproductor de audio
function setupAudioPlayerEvents(
    audioPlayer: AudioPlayer,
    textChannel: any,
    connection: VoiceConnection,
    voiceChannel: VoiceChannel,
    guildId: string
) {
    audioPlayer.on("stateChange", async (oldState, newState) => {
        console.log(`Estado cambiado de ${oldState.status} a ${newState.status}`);

        if (newState.status === AudioPlayerStatus.Idle) {
            if (musicQueue.hasSongs(guildId)) {
                const nextSong = musicQueue.getNextSong(guildId);
                if (nextSong) {
                    await playSong(nextSong.url, audioPlayer, textChannel, guildId);
                    textChannel.send(`Ahora reproduciendo: ${nextSong.title}`);
                } else {
                    textChannel.send("No hay más canciones en la cola.");
                }
            } else {
                textChannel.send("La reproducción ha terminado.");
            }
        }
    });

    audioPlayer.on("error", (error) => {
        console.error("Error en el reproductor de audio:", error);
        textChannel.send("Error en la reproducción de audio. Por favor, intenta nuevamente.");
    });
}

async function verifyUserInVoiceChannel(message: Message): Promise<boolean> {
    const member = message.member as GuildMember | null;
    const voiceChannel = member?.voice.channel as VoiceChannel | null;

    if (!voiceChannel) {
        if (message.channel instanceof TextChannel) {
            await message.channel.send("Debes estar en un canal de voz para usar este comando.");
        }
        return false;
    }

    return true;
}

// Comando para reproducir música
export const playMusicCommand: Command = {
    name: "play",
    alias: ["p"],

    async execute(message: Message, args: string[]) {
        try {
            if (!await verifyUserInVoiceChannel(message)) {
                return;
            }

            if (!args.length) {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send("Por favor, proporciona una URL de YouTube o un término de búsqueda.");
                }
                return;
            }

            const voiceChannel = message.member!.voice.channel as VoiceChannel;
            const guildId = message.guild!.id;
            const query = args.join(" ");

            // Verificar si es una URL de YouTube
            if (!ytdl.validateURL(query)) {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send("Por favor, proporciona una URL válida de YouTube.");
                }
                return;
            }

            // Obtener información del video
            const videoInfo = await ytdl.getInfo(query);
            const song = {
                title: videoInfo.videoDetails.title,
                url: query,
                duration: videoInfo.videoDetails.lengthSeconds,
                thumbnail: videoInfo.videoDetails.thumbnails[0].url
            };

            // Agregar a la cola
            musicQueue.addSong(guildId, song);

            // Crear embed de confirmación
            const dynamicColor = getDynamicColor(message.member!);
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle("Canción Agregada")
                .setDescription(`**${song.title}**`)
                .setThumbnail(song.thumbnail)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embed] });
            }

            // Verificar si ya hay una conexión
            let connection = getVoiceConnection(guildId);
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: message.guild!.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                connection.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                    const nextSong = musicQueue.getNextSong(guildId);
                    if (nextSong) {
                        const resource = createAudioResource(ytdl(nextSong.url));
                        player.play(resource);
                    } else {
                        connection?.destroy();
                    }
                });

                // Reproducir la primera canción
                const resource = createAudioResource(ytdl(song.url));
                player.play(resource);
            }
        } catch (error) {
            console.error("Error al ejecutar el comando playMusicCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

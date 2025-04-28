import { PrefixCommand, CommandCategory } from "../../../types/command.js";
import { Message, TextChannel, GuildMember, VoiceChannel } from "discord.js";
import { pause, resume, skip, stop, verifyUserInSameVoiceChannel, handleVoiceConnection } from "../../../utils/sharedMusicFunctions.js";
import { getVoiceConnection } from "@discordjs/voice";

const pauseCommand: PrefixCommand = {
    name: "pause",
    alias: ["pausar"],
    description: "Pausar la canción",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            if (await verifyUserInSameVoiceChannel(message)) {
                const guildId = message.guild!.id;
                const textChannel = message.channel as TextChannel;
                const result = pause(guildId);
                if (textChannel) {
                    await textChannel.send(result);
                }
            }
        } catch (error) {
            console.error("Error al ejecutar el comando pauseCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const resumeCommand: PrefixCommand = {
    name: "resume",
    alias: ["resumir"],
    description: "Reanudar la canción",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            if (await verifyUserInSameVoiceChannel(message)) {
                const guildId = message.guild!.id;
                const textChannel = message.channel as TextChannel;
                const result = resume(guildId);
                if (textChannel) {
                    await textChannel.send(result);
                }
            }
        } catch (error) {
            console.error("Error al ejecutar el comando resumeCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const skipCommand: PrefixCommand = {
    name: "skip",
    alias: ["saltar"],
    description: "Saltar la canción",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            if (await verifyUserInSameVoiceChannel(message)) {
                const guildId = message.guild!.id;
                const textChannel = message.channel as TextChannel;
                const result = await skip(guildId, textChannel);
                if (textChannel) {
                    await textChannel.send(result);
                }
            }
        } catch (error) {
            console.error("Error al ejecutar el comando skipCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const stopCommand: PrefixCommand = {
    name: "stop",
    alias: ["detener"],
    description: "Detener la canción",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            if (await verifyUserInSameVoiceChannel(message)) {
                const guildId = message.guild!.id;
                const textChannel = message.channel as TextChannel;
                const result = stop(guildId);
                if (textChannel) {
                    await textChannel.send(result);
                }
            }
        } catch (error) {
            console.error("Error al ejecutar el comando stopCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const disconnectCommand: PrefixCommand = {
    name: "disconnect",
    alias: ["dc", "desconectar"],
    description: "Desconectar del canal de voz",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            if (await verifyUserInSameVoiceChannel(message)) {
                const guildId = message.guild!.id;
                const connection = getVoiceConnection(guildId);
                if (connection) {
                    connection.destroy();
                    if (message.channel instanceof TextChannel) {
                        await message.channel.send("Desconectado del canal de voz.");
                    }
                } else {
                    if (message.channel instanceof TextChannel) {
                        await message.channel.send("El bot no está conectado a ningún canal de voz.");
                    }
                }
            }
        } catch (error) {
            console.error("Error al ejecutar el comando disconnectCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const joinCommand: PrefixCommand = {
    name: "join",
    alias: ["unirse"],
    description: "Unirse al canal de voz",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            const member = message.member as GuildMember;
            const voiceChannel = member.voice.channel as VoiceChannel | null;
            if (!voiceChannel) {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send("Debes estar en un canal de voz para usar este comando.");
                }
                return;
            }

            const isInSameChannel = await verifyUserInSameVoiceChannel(message, true);
            if (isInSameChannel) {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send("Ya estamos en el mismo canal de voz.");
                }
                return;
            }

            const { status, connection, message: connectionMessage } = await handleVoiceConnection(member, message);
            if (status === "error") {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send(connectionMessage || "Error de conexión desconocido.");
                }
            } else if (!connection) {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send("No se pudo establecer una conexión de voz.");
                }
            } else {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send(`Conectado al canal de voz: ${voiceChannel.name}`);
                }
            }
        } catch (error) {
            console.error("Error al ejecutar el comando joinCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

export const arrayMusicControls: PrefixCommand[] = [
    pauseCommand,
    resumeCommand,
    skipCommand,
    stopCommand,
    disconnectCommand,
    joinCommand,
];

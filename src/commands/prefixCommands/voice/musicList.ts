import { PrefixCommand, CommandCategory } from "../../../types/command.js";
import { Message, TextChannel, GuildMember, VoiceChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, InteractionCollector, ButtonInteraction, Interaction } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { musicQueue } from "../../../utils/musicQueue.js";
import { getDynamicColor } from "../../../utils/getDynamicColor.js";
import { CustomImageURLOptions } from "../../../types/embeds.js";

async function verifyUserInSameVoiceChannel(message: Message): Promise<boolean> {
    const member = message.member as GuildMember | null;
    const botUser = message.client.user;
    if (!botUser) {
        if (message.channel instanceof TextChannel) {
            await message.channel.send("No se pudo obtener la información del bot.");
        }
        return false;
    }

    const voiceChannel = member?.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        if (message.channel instanceof TextChannel) {
            await message.channel.send("Debes estar en un canal de voz para usar este comando.");
        }
        return false;
    }

    const connection = getVoiceConnection(message.guild!.id);
    if (!connection) {
        if (message.channel instanceof TextChannel) {
            await message.channel.send("El bot no está conectado a ningún canal de voz.");
        }
        return false;
    }

    if (connection.joinConfig.channelId !== voiceChannel.id) {
        if (message.channel instanceof TextChannel) {
            await message.channel.send("Debes estar en el mismo canal de voz que el bot para usar este comando.");
        }
        return false;
    }

    return true;
}

const state = new Map<string, number>();

async function showQueue(message: Message, page: number = 1, interaction?: ButtonInteraction) {
    const guildId = message.guild!.id;
    const queue = musicQueue.getQueue(guildId);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.length / itemsPerPage);

    if (queue.length === 0) {
        if (message.channel instanceof TextChannel) {
            await message.channel.send("No hay canciones en la cola.");
        }
        return;
    }

    if (page > totalPages || page < 1) {
        const errorMessage = `Página inválida. Por favor, selecciona una página entre 1 y ${totalPages}.`;
        if (interaction) {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        } else if (message.channel instanceof TextChannel) {
            await message.channel.send(errorMessage);
        }
        return;
    }

    state.set(message.author.id, page);

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, queue.length);
    const queuePage = queue.slice(startIndex, endIndex);
    const dynamicColor = getDynamicColor(message.member!);
    const embed = new EmbedBuilder()
        .setTitle("Cola de Reproducción")
        .setDescription(queuePage.map((song, index) => `${startIndex + index + 1}. ${song.title}`).join("\n"))
        .setColor(dynamicColor)
        .setFooter({ text: `Página ${page} de ${totalPages}` });

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`queue_prev`)
                .setLabel("Anterior")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId(`queue_next`)
                .setLabel("Siguiente")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages)
        );

    if (interaction) {
        await interaction.update({ embeds: [embed], components: [buttons] });
    } else if (message.channel instanceof TextChannel) {
        const sentMessage = await message.channel.send({ embeds: [embed], components: [buttons] });

        const filter = (i: ButtonInteraction) => i.user.id === message.author.id;
        const collector = sentMessage.createMessageComponentCollector({ 
            filter, 
            time: 300000,
            componentType: ComponentType.Button 
        });

        collector.on("collect", async (i: ButtonInteraction) => {
            let currentPage = state.get(message.author.id) || 1;
            let newPage = currentPage;
            if (i.customId === "queue_prev") {
                newPage = Math.max(1, currentPage - 1);
            } else if (i.customId === "queue_next") {
                newPage = Math.min(totalPages, currentPage + 1);
            }

            state.set(message.author.id, newPage);
            await showQueue(message, newPage, i);
        });

        collector.on("end", () => {
            sentMessage.edit({ components: [] });
        });
    }
}

const queueCommand: PrefixCommand = {
    name: "queue",
    alias: ["cola", "list"],
    description: "Mostrar la cola de reproducción",
    category: CommandCategory.MUSIC,

    async execute(message: Message) {
        try {
            if (!await verifyUserInSameVoiceChannel(message)) {
                return;
            }

            const guildId = message.guild!.id;
            const queue = musicQueue.getQueue(guildId);

            if (!queue || queue.length === 0) {
                if (message.channel instanceof TextChannel) {
                    await message.channel.send("No hay canciones en la cola.");
                }
                return;
            }

            const dynamicColor = getDynamicColor(message.member!);
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle("Cola de Reproducción")
                .setDescription(queue.map((song, index) => `${index + 1}. ${song.title}`).join("\n"))
                .setColor(dynamicColor)
                .setTimestamp();

            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("close")
                        .setLabel("Cerrar")
                        .setStyle(ButtonStyle.Danger)
                );

            if (message.channel instanceof TextChannel) {
                const sentMessage = await message.channel.send({ embeds: [embed], components: [buttons] });

                const collector = sentMessage.createMessageComponentCollector({
                    time: 60000,
                    componentType: ComponentType.Button,
                }) as unknown as InteractionCollector<ButtonInteraction>;

                collector.on("collect", async (interaction: ButtonInteraction) => {
                    if (interaction.user.id !== message.author.id) {
                        await interaction.reply({
                            content: "No puedes interactuar con este mensaje.",
                            ephemeral: true
                        });
                        return;
                    }

                    if (interaction.customId === "close") {
                        await sentMessage.delete();
                    }
                });

                collector.on("end", async () => {
                    try {
                        await sentMessage.edit({ components: [] });
                    } catch (error) {
                        console.error("Error al actualizar el mensaje:", error);
                    }
                });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando musicListCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const removeCommand: PrefixCommand = {
    name: "remove",
    alias: ["remover"],
    description: "Remover una canción de la cola",
    category: CommandCategory.MUSIC,

    async execute(message: Message, args: string[]) {
        if (await verifyUserInSameVoiceChannel(message)) {
            const guildId = message.guild!.id;
            const textChannel = message.channel as TextChannel;
            const index = parseInt(args[0]);

            if (isNaN(index) || index < 1) {
                textChannel.send("Por favor, proporciona un número de canción válido.");
                return;
            }

            const queue = musicQueue.getQueue(guildId);
            if (index > queue.length) {
                textChannel.send("El número de canción proporcionado es mayor que el tamaño de la cola.");
                return;
            }

            const removedSong = queue.splice(index - 1, 1);
            textChannel.send(`La canción \`${removedSong[0].title}\` ha sido removida de la cola.`);
        }
    },
};

export const arrayMusicListControls: PrefixCommand[] = [
    queueCommand,
    removeCommand,
];

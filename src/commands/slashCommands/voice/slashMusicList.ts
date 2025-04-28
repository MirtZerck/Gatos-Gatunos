import {
    CommandInteraction,
    GuildMember,
    VoiceChannel,
    TextChannel,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteractionOptionResolver,
    ButtonInteraction,
    InteractionCollector,
    CacheType,
    MessageComponentInteraction
} from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { musicQueue } from "../../../utils/musicQueue.js";
import { getDynamicColor } from "../../../utils/getDynamicColor.js";

async function verifyUserInSameVoiceChannel(interaction: CommandInteraction): Promise<boolean> {
    const member = interaction.member as GuildMember | null;
    const botUser = interaction.client.user;
    if (!botUser) {
        await interaction.reply({ content: "No se pudo obtener la información del bot.", ephemeral: true });
        return false;
    }

    const voiceChannel = member?.voice.channel as VoiceChannel | null;
    if (!voiceChannel) {
        await interaction.reply({ content: "Debes estar en un canal de voz para usar este comando.", ephemeral: true });
        return false;
    }

    const connection = getVoiceConnection(interaction.guild!.id);
    if (!connection) {
        await interaction.reply({ content: "El bot no está conectado a ningún canal de voz.", ephemeral: true });
        return false;
    }

    if (connection.joinConfig.channelId !== voiceChannel.id) {
        await interaction.reply({ content: "Debes estar en el mismo canal de voz que el bot para usar este comando.", ephemeral: true });
        return false;
    }

    return true;
}

const state = new Map<string, number>();

async function showQueue(interaction: CommandInteraction, page: number = 1, collector?: InteractionCollector<ButtonInteraction<CacheType>>) {
    const guildId = interaction.guild!.id;
    const queue = musicQueue.getQueue(guildId);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.length / itemsPerPage);

    if (queue.length === 0) {
        await interaction.reply({ content: "No hay canciones en la cola.", ephemeral: true });
        return;
    }

    if (page > totalPages || page < 1) {
        await interaction.reply({ content: `Página inválida. Por favor, selecciona una página entre 1 y ${totalPages}.`, ephemeral: true });
        return;
    }

    state.set(interaction.user.id, page);

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, queue.length);
    const queuePage = queue.slice(startIndex, endIndex);

    const dynamicColor = getDynamicColor(interaction.member as GuildMember);
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

    if (collector) {
        const message = await interaction.fetchReply();
        await (message as any).edit({ embeds: [embed], components: [buttons] });
    } else {
        const sentMessage = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });

        const filter = (i: ButtonInteraction) => i.user.id === interaction.user.id;
        const collector = (sentMessage as any).createMessageComponentCollector({ filter, time: 60000 });

        collector.on("collect", async (i: ButtonInteraction) => {
            let currentPage = state.get(interaction.user.id) || 1;
            let newPage = currentPage;
            if (i.customId === "queue_prev") {
                newPage = Math.max(1, currentPage - 1);
            } else if (i.customId === "queue_next") {
                newPage = Math.min(totalPages, currentPage + 1);
            }
            state.set(interaction.user.id, newPage);
            await showQueue(interaction, newPage, collector);
            await i.deferUpdate();
        });

        collector.on("end", () => {
            (sentMessage as any).edit({ components: [] });
        });
    }
}

async function executeQueueCommand(interaction: CommandInteraction) {
    const page = (interaction.options as CommandInteractionOptionResolver).getInteger("page") ?? 1;
    await showQueue(interaction, page);
}

async function executeRemoveCommand(interaction: CommandInteraction) {
    if (await verifyUserInSameVoiceChannel(interaction)) {
        const guildId = interaction.guild!.id;
        const index = (interaction.options as CommandInteractionOptionResolver).getInteger("index", true);

        if (index < 1) {
            await interaction.reply({ content: "Por favor, proporciona un número de canción válido.", ephemeral: true });
            return;
        }

        const queue = musicQueue.getQueue(guildId);
        if (index > queue.length) {
            await interaction.reply({ content: "El número de canción proporcionado es mayor que el tamaño de la cola.", ephemeral: true });
            return;
        }

        const removedSong = queue.splice(index - 1, 1);
        await interaction.reply(`La canción \`${removedSong[0].title}\` ha sido removida de la cola.`);
    }
}

const colaCommand = {
    data: new SlashCommandBuilder()
        .setName("cola")
        .setDescription("Comandos de control de la cola de canciones")
        .addSubcommand(subcommand =>
            subcommand
                .setName("queue")
                .setDescription("Muestra la cola de canciones.")
                .addIntegerOption(option =>
                    option.setName("page")
                        .setDescription("Número de página de la cola a mostrar.")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remueve una canción de la cola.")
                .addIntegerOption(option =>
                    option.setName("index")
                        .setDescription("El número de la canción a remover.")
                        .setRequired(true)
                )
        ),
    async execute(interaction: CommandInteraction) {
        const subcommand = (interaction.options as CommandInteractionOptionResolver).getSubcommand();
        switch (subcommand) {
            case "queue":
                await executeQueueCommand(interaction);
                break;
            case "remove":
                await executeRemoveCommand(interaction);
                break;
            default:
                await interaction.reply("Subcomando no reconocido.");
                break;
        }
    },
};

export const arraySlashMusicListControls = [colaCommand];

import { SlashCommandBuilder, CommandInteraction, GuildMember, CommandInteractionOptionResolver } from "discord.js";
import { handleDirectInteraction, sendInteractionRequest } from "../../../utils/slashEmbedInteraction.js";
import { hasInteractionRequest } from "../../../utils/interactionRequest.js";
import { socialConfig } from "../../../types/social.js";

const actionsCommands: Record<string, socialConfig> = {
    bailes: {
        name: "baile",
        requiresUser: false,
        requiresCount: true,
        descriptionCount: (count) => `\nHan bailado juntos **${count}** veces. 💃`,
        type: "bailar",
        group: "acciones",
        action: "bailar",
        description: (requester, receiver) =>
            `**${requester.displayName}** está bailando con **${receiver.displayName}**.`,
        soloDescription: (requester) =>
            `**${requester.displayName}** se puso a bailar.`,
        footer: "Bailar alegra el corazón.",
        requiresRequest: true,
        requestMessage: (requester, receiver) =>
            `¡Hey ${receiver},! ${requester} quiere bailar contigo. ¿Te animas?`,
        rejectResponse: "Solicitud de baile rechazada.",
        noResponse: "Solicitud de baile no respondida.",
    },
    galletas: {
        name: "galleta",
        requiresUser: false,
        requiresCount: false,
        type: "cookie",
        group: "acciones",
        action: "dar una galleta",
        description: (requester, receiver) =>
            `**${requester.displayName}** le dio una galleta a **${receiver.displayName}**. 🍪`,
        soloDescription: (requester) =>
            `**${requester.displayName}** está comiendo una galleta. 🍪`,
        footer: "Las galletas son muy ricas. uwu",
        requiresRequest: true,
        requestMessage: (requester, receiver) =>
            `¡Oye ${receiver}!, ¿Te gustaría recibir una galleta de ${requester}?`,
        rejectResponse: `Han rechazado tu galleta. x.x`,
        noResponse: "Solicitud de galleta no respondida.",
    },
};

async function executeInteractionCommands(interaction: CommandInteraction, config: socialConfig) {
    try {
        let userMention = (interaction.options as CommandInteractionOptionResolver).getMember("target") as GuildMember;

        let user: GuildMember | null = null;

        if (!config.requiresUser && !userMention) {
            user = interaction.member as GuildMember;
        } else {
            user = userMention;
        }

        if (!user && config.requiresUser) {
            return interaction.reply({
                content: `Debes mencionar a alguien o proporcionar un nombre válido para ${config.action}.`,
                ephemeral: true,
            });
        }

        if (!user) {
            return interaction.reply({
                content: "El usuario no existe o no se pudo encontrar.",
                ephemeral: true,
            });
        }

        if (config.requiresUser && interaction.user.id === user.user.id) {
            return interaction.reply({
                content: `No te puedes ${config.action} a ti mismo.`,
                ephemeral: true,
            });
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        if (user.user.bot || (!config.requiresUser && !userMention)) {
            await handleDirectInteraction(interaction, user, config);
        } else {
            const shouldSendRequest =
                config.requiresRequest &&
                user &&
                interaction.user.id !== user.user.id &&
                !user.user.bot;

            if (shouldSendRequest) {
                if (hasInteractionRequest(user.user.id, interaction.user.id)) {
                    return interaction.editReply({
                        content: "Ya existe una solicitud pendiente para este usuario.",
                    });
                }
                await sendInteractionRequest(interaction, user, config);
            } else {
                await handleDirectInteraction(interaction, user, config);
            }
        }
    } catch (error) {
        console.error("Error ejecutando el comando de interacción:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Ocurrió un error al ejecutar el comando. Por favor, inténtalo de nuevo más tarde.",
                ephemeral: true,
            });
        } else {
            await interaction.followUp({
                content: "Ocurrió un error al ejecutar el comando. Por favor, inténtalo de nuevo más tarde.",
                ephemeral: true,
            });
        }
    }
}

const actCommand = new SlashCommandBuilder()
    .setName("act")
    .setDescription("Realiza una acción.");

const subcommands = [
    {
        name: "dance",
        description: "Baila solo o con alguien.",
        commandHandler: actionsCommands.bailes,
        isTargetRequired: false,
    },
    {
        name: "cookie",
        description: "Come una galleta o dale una a alguien.",
        commandHandler: actionsCommands.galletas,
        isTargetRequired: false,
    },
];

subcommands.forEach((sub) => {
    actCommand.addSubcommand((subcommand) =>
        subcommand
            .setName(sub.name)
            .setDescription(sub.description)
            .addUserOption((option) =>
                option
                    .setName("target")
                    .setDescription(`El usuario al que quieres ${sub.name}.`)
                    .setRequired(sub.isTargetRequired)
            )
    );
});

const executeSubcommand = async (interaction: CommandInteraction, commandHandler: socialConfig) => {
    try {
        await executeInteractionCommands(interaction, commandHandler);
    } catch (error) {
        console.error("Error ejecutando el subcomando:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Ocurrió un error al ejecutar el subcomando. Por favor, inténtalo de nuevo más tarde.",
                ephemeral: true,
            });
        } else {
            await interaction.followUp({
                content: "Ocurrió un error al ejecutar el subcomando. Por favor, inténtalo de nuevo más tarde.",
                ephemeral: true,
            });
        }
    }
};

export const slashActionCommand = {
    data: actCommand,
    async execute(interaction: CommandInteraction) {
        try {
            const subcommandName = (interaction.options as CommandInteractionOptionResolver).getSubcommand();
            const subcommand = subcommands.find((sub) => sub.name === subcommandName);
            if (subcommand) {
                await executeSubcommand(interaction, subcommand.commandHandler);
            } else {
                await interaction.reply({
                    content: "Subcomando no encontrado.",
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error("Error ejecutando el comando principal:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Ocurrió un error al ejecutar el comando. Por favor, inténtalo de nuevo más tarde.",
                    ephemeral: true,
                });
            } else {
                await interaction.followUp({
                    content: "Ocurrió un error al ejecutar el comando. Por favor, inténtalo de nuevo más tarde.",
                    ephemeral: true,
                });
            }
        }
    },
};

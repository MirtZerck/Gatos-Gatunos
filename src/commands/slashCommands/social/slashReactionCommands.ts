import { SlashCommandBuilder, CommandInteraction, GuildMember, CommandInteractionOptionResolver } from "discord.js";
import { handleDirectInteraction, sendInteractionRequest } from "../../../utils/slashEmbedInteraction.js";
import { hasInteractionRequest } from "../../../utils/interactionRequest.js";
import { socialConfig } from "../../../types/social.js";

const reactionsCommands: Record<string, socialConfig> = {
    caliente: {
        name: "horny",
        requiresUser: false,
        requiresCount: false,
        type: "horny",
        group: "reacciones",
        description: (requester, receiver) =>
            `**${requester.displayName}** se calentó con **${receiver.displayName}**. 🔥`,
        soloDescription: (requester) =>
            `**${requester.displayName}** se puso horny. 🔥`,
        footer: "Hace mucho calor por aquí.",
        requiresRequest: false,
    },
    sonrojar: {
        name: "sonrojo",
        requiresUser: false,
        requiresCount: false,
        type: "sonrojar",
        group: "reacciones",
        description: (requester, receiver) =>
            `**${requester.displayName}** se ha sonrojado debido a **${receiver.displayName}**.`,
        soloDescription: (requester) =>
            `**${requester.displayName}** se sonrojó. owo`,
        footer: "Sintiendo mucha penita.",
        requiresRequest: false,
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

const reactCommand = new SlashCommandBuilder()
    .setName("react")
    .setDescription("Ten alguna reacción.");

const subcommands = [
    {
        name: "horny",
        description: "OwO",
        commandHandler: reactionsCommands.caliente,
        isTargetRequired: false,
    },
    {
        name: "blush",
        description: "¿Algo te ha hecho sonrojar?",
        commandHandler: reactionsCommands.sonrojar,
        isTargetRequired: false,
    },
];

subcommands.forEach((sub) => {
    reactCommand.addSubcommand((subcommand) =>
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

export const slashReactCommand = {
    data: reactCommand,
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

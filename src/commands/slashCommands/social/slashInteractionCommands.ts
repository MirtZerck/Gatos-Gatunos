import { SlashCommandBuilder, CommandInteraction, GuildMember, CommandInteractionOptionResolver } from "discord.js";
import { handleDirectInteraction, sendInteractionRequest } from "../../../utils/slashEmbedInteraction.js";
import { hasInteractionRequest } from "../../../utils/interactionRequest.js";
import { socialConfig } from "../../../types/social.js";

const interactionCommands: Record<string, socialConfig> = {
    abrazos: {
        name: "abrazo",
        requiresUser: true,
        requiresCount: true,
        descriptionCount: (count) => `\nSe han dado **${count}** abrazos. 🤗`,
        type: "abrazos",
        group: "interacciones",
        action: "abrazar",
        description: (requester, receiver) =>
            `**${requester.displayName}** le ha dado un abrazo cariñoso a **${receiver.displayName}**. ^^`,
        footer: "¡Un gesto amable hace el día mejor!",
        requiresRequest: true,
        requestMessage: (requester, receiver) =>
            `¡Hola ${receiver}! ${requester} está deseando compartir un abrazo contigo. ¿Qué dices, lo aceptas?`,
        rejectResponse: "Solicitud de abrazo rechazada.",
        noResponse: `Solicitud de abrazo no respondida.`,
    },
    caricias: {
        name: "caricia",
        requiresUser: true,
        requiresCount: true,
        descriptionCount: (count) => `\nSe han dado **${count}** caricias. 🐱`,
        type: "caricias",
        group: "interacciones",
        action: "acariciar",
        description: (requester, receiver) =>
            `**${requester.displayName}** le ha dado una tierna caricia a **${receiver.displayName}**. :3`,
        footer: "Una caricia suave puede iluminar el corazón.",
        requiresRequest: true,
        requestMessage: (requester, receiver) =>
            `¡Hola ${receiver}! ${requester} te quiere dar caricias. ¿Lo aceptarás? owo`,
        rejectResponse: "Solicitud de caricia rechazada.",
        noResponse: "Solicitud de caricia no respondida.",
    },
    besos: {
        name: "beso",
        requiresUser: true,
        requiresCount: true,
        descriptionCount: (count) => `\nSe han besado **${count}** veces. 💋`,
        type: "besos",
        group: "interacciones",
        action: "besar",
        description: (requester, receiver) =>
            `**${requester.displayName}** ha besado a **${receiver.displayName}**. o:`,
        footer: "Un beso tierno, un momento eterno.",
        requiresRequest: true,
        requestMessage: (requester, receiver) =>
            `¡Hola ${receiver}! ${requester} te quiere besar. ¿Vas a recibirlo? OwO`,
        rejectResponse: "Solicitud de beso rechazada.",
        noResponse: "Solicitud de beso no respondida.",
    },
    molestar: {
        name: "molestia",
        requiresUser: false,
        requiresCount: false,
        type: "poke",
        group: "interacciones",
        action: "molestar",
        description: (requester, receiver) =>
            `**${requester.displayName}** está fastidiando a **${receiver.displayName}**.`,
        footer: "Molestar",
        requiresRequest: false,
    },
    spank: {
        name: "nalguear",
        requiresUser: true,
        requiresCount: false,
        type: "spank",
        group: "interacciones",
        action: "nalguear",
        description: (requester, receiver) =>
            `**${requester.displayName}** ha nalgueado a **${receiver.displayName}**. 🙀`,
        footer: "Eso dolió, un poco.",
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

const interactCommand = new SlashCommandBuilder()
    .setName("interact")
    .setDescription("Interactúa con un usuario.");

const subcommands = [
    {
        name: "hug",
        description: "Abraza a alguien. (つ≧▽≦)つ",
        commandHandler: interactionCommands.abrazos,
        isTargetRequired: true,
    },
    {
        name: "pat",
        description: "Acaricia a alguien.",
        commandHandler: interactionCommands.caricias,
        isTargetRequired: true,
    },
    {
        name: "kiss",
        description: "Besa a alguien.",
        commandHandler: interactionCommands.besos,
        isTargetRequired: true,
    },
    {
        name: "poke",
        description: "Molesta a alguien.",
        commandHandler: interactionCommands.molestar,
        isTargetRequired: true,
    },
    {
        name: "spank",
        description: "Nalguea a alguien.",
        commandHandler: interactionCommands.spank,
        isTargetRequired: true,
    },
];

subcommands.forEach((sub) => {
    interactCommand.addSubcommand((subcommand) =>
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

export const slashInteractCommand = {
    name: "interact",
    description: "Interactúa con un usuario",
    category: "social",
    data: interactCommand,
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

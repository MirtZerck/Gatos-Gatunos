import { Message, GuildMember } from "discord.js";
import { getMemberByFilter } from "../../../constants/get-user.js";
import {
    handleDirectInteraction,
    sendInteractionRequest,
} from "../../../utils/embedInteractions.js";
import { hasInteractionRequest } from "../../../utils/interactionRequest.js";
import { socialConfig } from "../../../types/social.js";
import { PrefixCommand, CommandCategory } from "../../../types/command.js";

const reactionsCommands: Record<string, socialConfig> = {
    caliente: {
        name: "horny",
        requiresUser: false,
        requiresCount: false,
        type: "horny",
        group: "reacciones",
        action: "ponerse caliente",
        description: (requester, receiver) =>
            `**${requester.displayName}** se calentó con **${receiver.displayName}**. 🔥`,
        soloDescription: (requester) =>
            `**${requester.displayName}** se puso horny. 🔥`,
        footer: "Hace mucho calor por aquí.",
        requiresRequest: false,
        requestMessage: () => "",
        rejectResponse: "",
        noResponse: "",
    },
    sonrojar: {
        name: "sonrojo",
        requiresUser: false,
        requiresCount: false,
        type: "sonrojar",
        group: "reacciones",
        action: "sonrojar",
        description: (requester, receiver) =>
            `**${requester.displayName}** se ha sonrojado debido a **${receiver.displayName}**.`,
        soloDescription: (requester) =>
            `**${requester.displayName}** se sonrojó. owo`,
        footer: "Sintiendo mucha penita.",
        requiresRequest: false,
        requestMessage: () => "",
        rejectResponse: "",
        noResponse: "",
    },
};

async function executeActionsCommands(
    message: Message,
    args: string[],
    config: socialConfig
) {
    try {
        let userMention = message.mentions.members?.first() || null;
        let user: GuildMember | null = null;

        if (!userMention && args[0]) {
            user = getMemberByFilter(message, args[0]);
        } else if (!config.requiresUser && !args[0]) {
            user = message.member;
        } else {
            user = userMention;
        }

        if (!user && config.requiresUser) {
            return message.reply(
                `Debes mencionar a alguien o proporcionar un nombre válido para ${config.action}.`
            );
        }

        if (!user) {
            return message.reply("El usuario no existe o no se pudo encontrar.");
        }

        if (config.requiresUser && message.author.id === user.user.id) {
            return message.reply(`No te puedes ${config.action} a ti mismo.`);
        }

        if (user && (user.user.bot || (!config.requiresUser && !userMention && !args[0]))) {
            await handleDirectInteraction(message, user, config);
        } else {
            const shouldSendRequest =
                config.requiresRequest &&
                user &&
                message.author.id !== user.user.id &&
                !user.user.bot;

            if (shouldSendRequest) {
                if (hasInteractionRequest(user.user.id, message.author.id)) {
                    return message.reply(
                        "Ya existe una solicitud pendiente para este usuario."
                    );
                }
                await sendInteractionRequest(message, user, config);
            } else {
                await handleDirectInteraction(message, user, config);
            }
        }
    } catch (error) {
        console.error("Error ejecutando el comando:", error);
        message.reply(
            "Ocurrió un error al ejecutar el comando. Por favor, intenta de nuevo."
        );
    }
}

const hornyUserCommand: PrefixCommand = {
    name: "horny",
    alias: ["caliente", "hot"],
    description: "Ponerse caliente",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeActionsCommands(
                message,
                args,
                reactionsCommands.caliente
            );
        } catch (error) {
            console.error("Error en el comando baile:", error);
            message.reply("Ocurrió un error al ejecutar el comando de baile.");
        }
    },
};

const blushUserCommand: PrefixCommand = {
    name: "blush",
    alias: ["sonrojar"],
    description: "Sonrojarse",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeActionsCommands(
                message,
                args,
                reactionsCommands.sonrojar
            );
        } catch (error) {
            console.error("Error en el comando baile:", error);
            message.reply("Ocurrió un error al ejecutar el comando de baile.");
        }
    },
};

export const arrayReactions = [
    hornyUserCommand,
    blushUserCommand,
];

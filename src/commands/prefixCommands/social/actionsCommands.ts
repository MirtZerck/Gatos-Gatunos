import { Message, GuildMember } from "discord.js";
import { getMemberByFilter } from "../../../constants/get-user.js";
import {
    handleDirectInteraction,
    sendInteractionRequest,
} from "../../../utils/embedInteractions.js";
import { hasInteractionRequest } from "../../../utils/interactionRequest.js";
import { socialConfig } from "../../../types/social.js";
import { PrefixCommand, CommandCategory } from "../../../types/command.js";

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
        group: "interacciones",
        action: "dar una galleta",
        description: (requester, receiver) =>
            `**${requester.displayName}** le dió una galleta a **${receiver.displayName}**. 🍪`,
        soloDescription: (requester) =>
            `**${requester.displayName}** está comiendo una galleta. 🍪`,
        footer: "Las galletas son muy ricas. uwu",
        requiresRequest: true,
        requestMessage: (requester, receiver) =>
            `¡Oye ${receiver}!, ¿Te gustaría recibir una galleta de ${requester}?`,
        rejectResponse: `Han rechazado tu galleta. x-x`,
        noResponse: "Solicitud de galleta no respondida.",
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

const danceUserCommand: PrefixCommand = {
    name: "baile",
    alias: ["dance", "bailar"],
    description: "Baile con alguien",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeActionsCommands(
                message,
                args,
                actionsCommands.bailes
            );
        } catch (error) {
            console.error("Error en el comando baile:", error);
            message.reply("Ocurrió un error al ejecutar el comando de baile.");
        }
    },
};

const cookieUserCommand: PrefixCommand = {
    name: "galleta",
    alias: ["cookie"],
    description: "Da una galleta a alguien",    
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeActionsCommands(
                message,
                args,
                actionsCommands.galletas
            );
        } catch (error) {
            console.error("Error en el comando galleta:", error);
            message.reply("Ocurrió un error al ejecutar el comando de galleta.");
        }
    },
};

export const arrayActions = [
    danceUserCommand,
    cookieUserCommand,
];

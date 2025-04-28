import { Message, GuildMember } from "discord.js";
import { getMemberByFilter } from "../../../constants/get-user.js";
import {
    handleDirectInteraction,
    sendInteractionRequest,
} from "../../../utils/embedInteractions.js";
import { hasInteractionRequest } from "../../../utils/interactionRequest.js";
import { socialConfig } from "../../../types/social.js";
import { PrefixCommand, CommandCategory } from "../../../types/command.js";

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
        requiresUser: true,
        requiresCount: false,
        type: "poke",
        group: "interacciones",
        action: "molestar",
        description: (requester, receiver) =>
            `**${requester.displayName}** está fastidiando a **${receiver.displayName}**.`,
        footer: "Molestar",
        requiresRequest: false,
        requestMessage: () => "",
        rejectResponse: "",
        noResponse: "",
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
        requestMessage: () => "",
        rejectResponse: "",
        noResponse: "",
    },
};

async function executeinteractionCommands(
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

const hugUserCommand: PrefixCommand = {
    name: "abrazo",
    alias: ["hug", "abrazar"],
    description: "Abraza a alguien",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeinteractionCommands(
                message,
                args,
                interactionCommands.abrazos
            );
        } catch (error) {
            console.error("Error en el comando abrazo:", error);
            message.reply("Ocurrió un error al ejecutar el comando de abrazo.");
        }
    },
};

const patUserCommand: PrefixCommand = {
    name: "caricia",
    alias: ["pat", "acariciar"],
    description: "Acaricia a alguien",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeinteractionCommands(
                message,
                args,
                interactionCommands.caricias
            );
        } catch (error) {
            console.error("Error en el comando caricia:", error);
            message.reply("Ocurrió un error al ejecutar el comando de caricia.");
        }
    },
};

const kissUserCommand: PrefixCommand = {
    name: "beso",
    alias: ["kiss", "besar"],
    description: "Besa a alguien",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeinteractionCommands(
                message,
                args,
                interactionCommands.besos
            );
        } catch (error) {
            console.error("Error en el comando beso:", error);
            message.reply("Ocurrió un error al ejecutar el comando de beso.");
        }
    },
};

const pokeUserCommand: PrefixCommand = {
    name: "molestia",
    alias: ["poke", "molestar"],
    description: "Molesta a alguien",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeinteractionCommands(
                message,
                args,
                interactionCommands.molestar
            );
        } catch (error) {
            console.error("Error en el comando molestia:", error);
            message.reply("Ocurrió un error al ejecutar el comando de molestia.");
        }
    },
};

const spankUserCommand: PrefixCommand = {
    name: "nalguear",
    alias: ["spank"],
    description: "Nalguea a alguien",
    category: CommandCategory.SOCIAL,

    async execute(message: Message, args: string[]) {
        try {
            await executeinteractionCommands(
                message,
                args,
                interactionCommands.spank
            );
        } catch (error) {
            console.error("Error en el comando molestia:", error);
            message.reply("Ocurrió un error al ejecutar el comando de molestia.");
        }
    },
};


export const arrayInteractions = [
    hugUserCommand,
    patUserCommand,
    kissUserCommand,
    pokeUserCommand,
    spankUserCommand
];
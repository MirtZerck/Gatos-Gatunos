import { getMemberByFilter } from "../../../constants/get-user.js";
import { PermissionsBitField, Message, TextChannel, EmbedBuilder, GuildMember } from "discord.js";
import { PrefixCommand, CommandCategory } from "../../../types/command.js";
import { CustomImageURLOptions } from "../../../types/embeds.js";
import { getDynamicColor } from "../../../utils/getDynamicColor.js";

export const timeoutUser: PrefixCommand = {
    name: "timeout",
    alias: ["mute", "silenciar"],
    description: "Silencia a un usuario",
    category: CommandCategory.MODERATION,

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                await message.reply("No tienes permisos para silenciar usuarios.");
                return;
            }

            const userMention = message.mentions.members?.first();
            let user_id: string;

            if (userMention) {
                user_id = userMention.user.id;
            } else if (args[0]) {
                user_id = args[0];
            } else {
                await message.reply("Por favor, menciona a un usuario o proporciona su ID.");
                return;
            }

            const member = getMemberByFilter(message, user_id);
            if (!member) {
                await message.reply("El usuario no existe o no está en el servidor.");
                return;
            }

            if (!member.moderatable) {
                await message.reply("No puedo silenciar a este usuario.");
                return;
            }

            const duration = parseInt(args[1]);
            if (isNaN(duration) || duration < 1 || duration > 40320) {
                await message.reply("Por favor, proporciona una duración válida en minutos (1-40320).");
                return;
            }

            const reason = args.slice(2).join(" ") || "No se proporcionó una razón.";
            const dynamicColor = getDynamicColor(message.member!);

            const embedTimeout = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Usuario Silenciado`)
                .setDescription(`**Usuario:** ${member.user.tag}\n**Duración:** ${duration} minutos\n**Razón:** ${reason}`)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedTimeout] });
            }

            await member.timeout(duration * 60 * 1000, reason);
        } catch (error) {
            console.error("Error al ejecutar el comando timeoutUser:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

export const removeTimeoutUser: PrefixCommand = {
    name: "untimeout",
    alias: ["unmute", "desilenciar"],
    description: "Quita el silencio a un usuario",
    category: CommandCategory.MODERATION,

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                await message.reply("No tienes permisos para quitar el silencio a usuarios.");
                return;
            }

            const userMention = message.mentions.members?.first();
            let user_id: string;

            if (userMention) {
                user_id = userMention.user.id;
            } else if (args[0]) {
                user_id = args[0];
            } else {
                await message.reply("Por favor, menciona a un usuario o proporciona su ID.");
                return;
            }

            const member = getMemberByFilter(message, user_id);
            if (!member) {
                await message.reply("El usuario no existe o no está en el servidor.");
                return;
            }

            if (!member.moderatable) {
                await message.reply("No puedo quitar el silencio a este usuario.");
                return;
            }

            const reason = args.slice(1).join(" ") || "No se proporcionó una razón.";
            const dynamicColor = getDynamicColor(message.member!);

            const embedRemoveTimeout = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Silencio Removido`)
                .setDescription(`**Usuario:** ${member.user.tag}\n**Razón:** ${reason}`)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedRemoveTimeout] });
            }

            await member.timeout(null, reason);
        } catch (error) {
            console.error("Error al ejecutar el comando removeTimeoutUser:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

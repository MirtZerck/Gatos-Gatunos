import { CommandCategory, PrefixCommand } from "../../../types/command.js";
import { Message, TextChannel, GuildMember, EmbedBuilder, PermissionsBitField } from "discord.js";
import { getMemberByFilter } from "../../../constants/get-user.js";
import { CustomImageURLOptions } from "../../../types/embeds.js";
import { getDynamicColor } from "../../../utils/getDynamicColor.js";

export const kickUserCommand: PrefixCommand = {
    name: "kick",
    alias: ["expulsar"],
    description: "Expulsa a un usuario",
    category: CommandCategory.MODERATION,

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                await message.reply("No tienes permisos para expulsar usuarios.");
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

            if (!member.kickable) {
                await message.reply("No puedo expulsar a este usuario.");
                return;
            }

            const reason = args.slice(1).join(" ") || "No se proporcionó una razón.";
            const dynamicColor = getDynamicColor(message.member!);

            const embedKick = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Usuario Expulsado`)
                .setDescription(`**Usuario:** ${member.user.tag}\n**Razón:** ${reason}`)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedKick] });
            }

            await member.kick(reason);
        } catch (error) {
            console.error("Error al ejecutar el comando kickUserCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

export const kickUser = kickUserCommand;

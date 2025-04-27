import { Command } from "../../types/command.js";
import { Message, TextChannel, GuildMember, EmbedBuilder, PermissionsBitField } from "discord.js";
import { getMemberByFilter } from "../../constants/get-user.js";
import { CustomImageURLOptions } from "../../types/embeds.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";

export const banUserCommand: Command = {
    name: "ban",
    alias: ["banear"],

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                await message.reply("No tienes permisos para banear usuarios.");
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

            if (!member.bannable) {
                await message.reply("No puedo banear a este usuario.");
                return;
            }

            const reason = args.slice(1).join(" ") || "No se proporcionó una razón.";
            const dynamicColor = getDynamicColor(message.member!);

            const embedBan = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Usuario Baneado`)
                .setDescription(`**Usuario:** ${member.user.tag}\n**Razón:** ${reason}`)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedBan] });
            }

            await member.ban({ reason });
        } catch (error) {
            console.error("Error al ejecutar el comando banUserCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const unbanUser: Command = {
    name: "unban",
    alias: ["desbanear", "desban"],

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                await message.reply("No tienes permisos para desbanear usuarios.");
                return;
            }

            const userId = args[0];

            if (!userId || userId.length < 3) {
                await message.reply("Proporciona una ID de usuario válida.");
                return;
            }

            await message.guild?.members.unban(userId);
            if (message.channel instanceof TextChannel) {
                await message.channel.send(`El usuario con ID ${userId} ha sido desbaneado.`);
            }
        } catch (error) {
            console.error("Error al ejecutar el comando unbanUser:", error);
            if (message.channel instanceof TextChannel) {
                await message.channel.send("Error al intentar desbanear al usuario. Asegúrate de que la ID sea correcta y de que tengo los permisos necesarios.");
            }
        }
    },
};

export const arrayBanCommands: Command[] = [banUserCommand, unbanUser];
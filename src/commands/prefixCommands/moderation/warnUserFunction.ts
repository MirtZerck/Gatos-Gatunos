import { getMemberByFilter } from "../../../constants/get-user.js";
import { PermissionsBitField, Message, EmbedBuilder, TextChannel, GuildMember } from "discord.js";
import { checkWarns, editWarns, updateWarnsCount } from "../../../db_service/commands_service.js";
import { getDynamicColor } from "../../../utils/getDynamicColor.js";
import { prefijo } from "../../../constants/prefix.js";
import { PrefixCommand, CommandCategory } from "../../../types/command.js";
import { CustomImageURLOptions } from "../../../types/embeds.js";

const warnUserCommand: PrefixCommand = {
    name: "warn",
    alias: ["advertir"],
    description: "Advertir a un usuario",
    category: CommandCategory.MODERATION,

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                await message.reply("No tienes permisos para advertir usuarios.");
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

            const reason = args.slice(1).join(" ") || "No se proporcionó una razón.";
            const dynamicColor = getDynamicColor(message.member!);

            const embedWarn = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Usuario Advertido`)
                .setDescription(`**Usuario:** ${member.user.tag}\n**Razón:** ${reason}`)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedWarn] });
            }

            // Aquí podrías agregar lógica para guardar las advertencias en una base de datos
        } catch (error) {
            console.error("Error al ejecutar el comando warnUserCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const checkUserWarns: PrefixCommand = {
    name: "checkwarns",
    alias: ["advertencias", "warns"],
    description: "Revisar las advertencias de un usuario",
    category: CommandCategory.MODERATION,


    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                await message.reply("No tienes permisos para revisar las advertencias.");
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

            const serverId = message.guild!.id;
            const userId = member.user.id;

            const { count, reasons } = await checkWarns(userId, serverId);
            const dynamicColor = getDynamicColor(message.member!);

            const embed = new EmbedBuilder()
                .setTitle(`Advertencias para ${member.displayName}`)
                .setColor(dynamicColor)
                .addFields({
                    name: "Total de Advertencias",
                    value: count.toString(),
                    inline: true,
                });

            if (count > 0) {
                reasons.forEach((reason, index) => {
                    embed.addFields({
                        name: `Razón ${index + 1}`,
                        value: reason,
                        inline: false,
                    });
                });
            } else {
                embed.setDescription("Este usuario no tiene advertencias.");
            }

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando checkUserWarns:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

const deleteUserWarns: PrefixCommand = {
    name: "deletewarn",
    alias: ["eliminaradvertencia", "unwarn"],
    description: "Eliminar una advertencia",
    category: CommandCategory.MODERATION,

    async execute(message: Message, args: string[]) {
        try {
            if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                await message.reply("No tienes permisos para editar las advertencias.");
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

            const warnIndexToRemove = parseInt(args[1]) - 1;

            if (isNaN(warnIndexToRemove)) {
                await message.reply(`Escribe el número de advertencia que deseas eliminar, puedes revisar las advertencias existentes con el comando ${prefijo}warns.`);
                return;
            }

            const serverId = message.guild!.id;
            const userId = member.user.id;

            const newWarnsCount = await editWarns(userId, serverId, warnIndexToRemove);
            if (message.channel instanceof TextChannel) {
                await message.channel.send(`La advertencia ha sido eliminada. Ahora el usuario tiene un total de ${newWarnsCount} advertencia(s).`);
            }
        } catch (error) {
            console.error("Error al ejecutar el comando deleteUserWarns:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

export const arrayWarnCommands: PrefixCommand[] = [warnUserCommand, checkUserWarns, deleteUserWarns];

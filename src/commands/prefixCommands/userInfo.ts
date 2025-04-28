import { PrefixCommand, CommandCategory } from "../../types/command.js";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { convertDateToString } from "../../utils/formatDate.js";
import { getMemberByFilter } from "../../constants/get-user.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";
import { formatUserRoles } from "../../constants/formatUserRoles.js";
import { CustomImageURLOptions } from "../../types/embeds.js";

export const userInfoCommand: PrefixCommand = {
    name: "userinfo",
    alias: ["ui", "useri"],
    description: "Muestra información detallada de un usuario",
    category: CommandCategory.UTILITY,

    async execute(message: Message, args: string[]): Promise<void> {
        try {
            const { author, member: messageMember, channel } = message;

            const userMention = message.mentions.members?.first();
            let filtro: string;

            if (userMention) {
                filtro = userMention.user.id;
            } else if (args[0]) {
                filtro = args[0];
            } else {
                filtro = author.id;
            }

            if (filtro.length < 3) {
                await message.reply("El usuario a mencionar debe tener al menos 3 caracteres.");
                return;
            }

            const member = getMemberByFilter(message, filtro);
            if (!member) {
                await message.reply("El usuario no existe");
                return;
            }

            const { user } = member;
            const { username, id } = user;
            const avatarURL = user.displayAvatarURL({ dynamic: true } as CustomImageURLOptions);
            const fechaRegistro = convertDateToString(user.createdAt);
            const fechaIngreso = convertDateToString(member.joinedAt!);

            const dynamicColor = getDynamicColor(message.member!);

            const rolesDescription = formatUserRoles(member);

            const messageEmbed = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Información de ${member.displayName}`)
                .setThumbnail(avatarURL)
                .setDescription(`Información del usuario en el servidor`)
                .addFields(
                    { name: "Registro", value: fechaRegistro, inline: true },
                    { name: "Ingreso", value: fechaIngreso, inline: true },
                    { name: "Roles", value: rolesDescription }
                )
                .setColor(dynamicColor)
                .setFooter({ text: `ID ${id}` })
                .setTimestamp();

            if (channel instanceof TextChannel) {
                await channel.send({ embeds: [messageEmbed] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando userInfoCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

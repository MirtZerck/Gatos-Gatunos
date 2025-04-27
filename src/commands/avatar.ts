import { Command } from "../types/command.js";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { getMemberByFilter } from "../constants/get-user.js"; 
import { CustomImageURLOptions } from "../types/embeds.js";
import { getDynamicColor } from "../utils/getDynamicColor.js";

export const userAvatarCommand: Command = {
    name: "avatar",
    alias: ["av", "avt"],

    async execute(message: Message, args: string[]) {
        try {
            const userMention = message.mentions.members?.first();
            let user_id: string;

            if (userMention) {
                user_id = userMention.user.id;
            } else if (args[0]) {
                user_id = args[0];
            } else {
                user_id = message.author.id;
            }

            const user = getMemberByFilter(message, user_id);

            if (!user) return message.reply("El usuario no existe");

            const dynamicColor = getDynamicColor(message.member!)
            const messageEmbed = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions)
                })
                .setTitle(`Avatar de ${user.user.username}`)
                .setImage(user.user.displayAvatarURL({ size: 1024, dynamic: true } as CustomImageURLOptions))
                .setColor(dynamicColor)
                .setFooter({ text: `ID ${user_id}` })
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [messageEmbed] }).catch((error: Error) => {
                    console.error("Error al enviar el mensaje embed:", error);
                    message.reply(
                        "No se pudo enviar el mensaje embed. Por favor, verifica mis permisos."
                    );
                });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando avatar:", error);
            message.reply(
                "Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde."
            );
        }
    },
};

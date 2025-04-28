/* import { Client, Message, EmbedBuilder, Events } from "discord.js";
import { prefijo } from "../constants/prefix.js";
import { getPromptGTP } from "../utils/openaiApi.js";
import { CustomImageURLOptions } from "../types/embeds.js";

export const openAiChat = async (client: Client) => {
    client.on(Events.MessageCreate, async (message: Message) => {
        try {
            if (message.author.bot || !message.mentions.members?.size) return;

            const mention = message.mentions.members.first();

            if (mention && mention.user.id === client.user?.id) {
                const embedPrefix = new EmbedBuilder()
                    .setAuthor({
                        name: "Hikari Koizumi",
                        iconURL:
                            "https://fotografias.lasexta.com/clipping/cmsimages02/2019/01/25/DB41B993-B4C4-4E95-8B01-C445B8544E8E/98.jpg?crop=4156,2338,x0,y219&width=1900&height=1069&optimize=high&format=webply",
                    })
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions))
                    .setTitle(`Información del Bot`)
                    .addFields(
                        {
                            name: "Prefijo",
                            value: `El prefijo es ${prefijo}`,
                            inline: true,
                        },
                        {
                            name: "Información",
                            value: `Escribe ${prefijo}help`,
                            inline: true,
                        }
                    )
                    .setColor(0x81d4fa)
                    .setTimestamp();

                if (message.content.trim() === `<@${client.user.id}>`) {
                    return message.reply({ embeds: [embedPrefix] }).catch((error) => {
                        console.error("Error al enviar el mensaje embed:", error);
                        message.reply(
                            "No se pudo enviar el mensaje embed. Por favor, verifica mis permisos."
                        );
                    });
                } else {
                    try {
                        const user = message.member?.nickname ?? message.author.username;
                        const prompt = `${user}: ${message.content}`;
                        await message.channel.sendTyping();
                        const response = await getPromptGTP(prompt);
                        message.reply({ content: response }).catch((error) => {
                            console.error("Error al enviar la respuesta:", error);
                            message.reply(
                                "No se pudo enviar la respuesta. Por favor, verifica mis permisos."
                            );
                        });
                    } catch (error) {
                        console.error("Error al obtener la respuesta de OpenAI:", error);
                    }
                }
            }
        } catch (error) {
            console.error("Error al procesar el evento MessageCreate:", error);
        }
    });
};
 */
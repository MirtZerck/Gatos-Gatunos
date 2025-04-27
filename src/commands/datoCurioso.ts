import { obtenerDatoCurioso } from "../utils/apiDatoCurioso.js";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { obtenerDataApi } from "../utils/apiServer.js";
import { Api_Michi_URL } from "../constants/apisUrl.js";
import { Command } from "../types/command.js";
import { CustomImageURLOptions } from "../types/embeds.js";
import { getDynamicColor } from "../utils/getDynamicColor.js";

interface CatImageResponse {
    url: string;
}

export const curiosFactCommand: Command = {
    name: "datocurioso",
    alias: ["dato", "dc"],

    async execute(message: Message, args: string[]) {
        try {
            const dato_curioso = await obtenerDatoCurioso();
            const response = await obtenerDataApi<CatImageResponse[]>(Api_Michi_URL);

            if (Array.isArray(response) && response.length > 0) {
                const imgUrl = response[0].url;
                const dynamicColor = getDynamicColor(message.member!)
                const embedDato = new EmbedBuilder()
                    .setAuthor({
                        name: message.member?.nickname ?? message.author.username,
                        iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                    })
                    .setTitle(`Dato Gatuno`)
                    .setImage(imgUrl)
                    .setDescription(dato_curioso)
                    .setColor(dynamicColor)
                    .setTimestamp();

                if (message.channel instanceof TextChannel) {
                    await message.channel.send({ embeds: [embedDato] }).catch((error: Error) => {
                        console.error("Error al enviar el mensaje embed:", error);
                        message.reply(
                            "No se pudo enviar el mensaje embed. Por favor, verifica mis permisos."
                        );
                    });
                }
            } else {
                throw new Error("No se pudo obtener la imagen del gato.");
            }
        } catch (error) {
            console.error("Error al ejecutar el comando curiosFactCommand:", error);
            message.reply(
                "Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde."
            );
        }
    },
};

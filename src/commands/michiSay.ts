import { Command } from "../types/command.js"
import { CustomImageURLOptions } from "../types/embeds.js";
import { obtenerMichiHablador } from "../utils/apiMichiSay.js";
import { EmbedBuilder, Message } from "discord.js";
import { getDynamicColor } from "../utils/getDynamicColor.js";

export const sendMichiTextCommand: Command = {
    name: "michihablando",
    alias: ["mh"],

    async execute(message: Message, args: string[], commandBody?: string): Promise<void> {
        try {
            if (!commandBody) {
                await message.reply("Envía lo que quieres que diga");
                return;
            }

            const michiHablador = await obtenerMichiHablador(commandBody);
            const dynamicColor = getDynamicColor(message.member!)
            const embedMichiHablador = new EmbedBuilder()
                .setAuthor({
                    name: message.member!.displayName,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setImage(michiHablador)
                .setColor(dynamicColor)
                .setTimestamp();

            await message.channel.send({ embeds: [embedMichiHablador] });
        } catch (error) {
            console.error("Error al ejecutar el comando sendMichiTextCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

import { Command } from "../types/command.js";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { CustomImageURLOptions } from "../types/embeds.js";


export const botPing: Command = {
    name: "ping",
    alias: ["pi"],

    async execute(message: Message) {
        try {
            const ping = Date.now() - message.createdTimestamp;
            const botPing = message.client.ws.ping;


            const embedPing = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Mi ping es:`)
                .setDescription(`Ping calculado: ${ping}ms\nPing del bot: ${botPing}ms`)
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions))
                .setColor(0x81d4fa)
                .setFooter({ text: "Pong" });

            if (message.channel instanceof TextChannel) {
                await message.reply({ embeds: [embedPing] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando mostrarPing:", error);
            await message.reply(
                "Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde."
            );
        }
    },
};

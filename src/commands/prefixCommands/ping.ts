import { PrefixCommand, CommandCategory } from "../../types/command.js";
import { Message } from "discord.js";

export const pingCommand: PrefixCommand = {
    name: "ping",
    alias: ["latencia"],
    description: "Muestra la latencia del bot",
    category: CommandCategory.UTILITY,

    async execute(message: Message, args: string[]): Promise<void> {
        try {
            const sent = await message.reply("Calculando ping...");
            const latency = sent.createdTimestamp - message.createdTimestamp;
            await sent.edit(`🏓 Pong!\nLatencia del bot: ${latency}ms\nLatencia de la API: ${Math.round(message.client.ws.ping)}ms`);
        } catch (error) {
            console.error("Error al ejecutar el comando ping:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

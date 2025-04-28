import { PrefixCommand, CommandCategory } from "../../types/command.js";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { CustomImageURLOptions } from "../../types/embeds.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";

export const datoCuriosoCommand: PrefixCommand = {
    name: "datocurioso",
    alias: ["curiosidad", "curioso"],
    description: "Muestra un dato curioso aleatorio",
    category: CommandCategory.FUN,

    async execute(message: Message, args: string[]): Promise<void> {
        try {
            const datosCuriosos = [
                "Los pulpos tienen tres corazones.",
                "La miel no caduca.",
                "Los pingüinos pueden saltar hasta 2 metros fuera del agua.",
                "El corazón de una ballena azul es tan grande que un humano podría nadar por sus arterias.",
                "Los gatos pueden hacer más de 100 sonidos vocales diferentes.",
                "El ojo de un avestruz es más grande que su cerebro.",
                "Los delfines duermen con un ojo abierto.",
                "Las mariposas saborean con sus pies.",
                "Los elefantes son los únicos mamíferos que no pueden saltar.",
                "Los koalas tienen huellas dactilares casi idénticas a las humanas."
            ];

            const datoAleatorio = datosCuriosos[Math.floor(Math.random() * datosCuriosos.length)];
            const dynamicColor = getDynamicColor(message.member!);

            const messageEmbed = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle("Dato Curioso")
                .setDescription(datoAleatorio)
                .setColor(dynamicColor)
                .setFooter({ text: "¿Sabías que...?" })
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [messageEmbed] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando datoCurioso:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

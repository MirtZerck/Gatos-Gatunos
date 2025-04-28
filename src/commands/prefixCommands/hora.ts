import { EmbedBuilder, Message, PermissionsBitField, TextChannel } from "discord.js";
import moment from "moment-timezone";
import { PrefixCommand, CommandCategory } from "../../types/command.js";
import { CustomImageURLOptions } from "../../types/embeds.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";
import { CommandsService } from "../../db_service/commandsService.js";

export const serverHour: PrefixCommand = {
    name: "horaserver",
    alias: ["hs", "hora", "hour"],
    description: "Muestra la hora del servidor",
    category: CommandCategory.UTILITY,

    async execute(message: Message, args: string[]): Promise<void> {
        try {
            const serverId = message.guild!.id;
            const commandsService = new CommandsService(serverId);
            const timezone = await commandsService.getServerTimezone();

            if (!timezone) {
                message.reply("Un moderador debe establecer la hora del servidor con el comando `setHour` y la zona horaria.");
                return;
            }

            function obtenerHoraServer(timezone: string): string {
                return moment().tz(timezone).format("HH:mm:ss");
            }

            const dynamicColor = getDynamicColor(message.member!);
            const embedHora = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle("Hora del servidor")
                .setDescription(obtenerHoraServer(timezone))
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions))
                .setColor(dynamicColor)
                .setFooter({ text: `(${timezone})` });

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedHora] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando horaServer:", error);
            if (message.channel instanceof TextChannel) {
                await message.channel.send(
                    "No se pudo enviar el mensaje embed. Por favor, verifica mis permisos."
                );
            }
        }
    },
};

export const setHour: PrefixCommand = {
    name: "sethour",
    alias: ["sh", "sethora"],
    description: "Establece la hora del servidor",
    category: CommandCategory.UTILITY,


    async execute(message: Message, args: string[]): Promise<void> {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            message.reply("No tienes permisos para establecer la hora del servidor.");
            return;
        }

        if (args.length !== 1) {
            message.reply("Por favor, proporciona una zona horaria válida. Ejemplo: `America/Bogota`.");
            return;
        }

        const timezone = args[0];
        if (!moment.tz.zone(timezone)) {
            message.reply("La zona horaria proporcionada no es válida.");
            return;
        }

        const serverId = message.guild!.id;
        const commandsService = new CommandsService(serverId);
        await commandsService.setServerTimezone(timezone);

        message.reply(`La zona horaria del servidor se ha configurado a ${timezone}.`);
    },
};

export const arrayCommandsHour = [serverHour, setHour]

export const horaCommand: PrefixCommand = {
    name: "hora",
    alias: ["time", "tiempo"],
    description: "Muestra la hora actual",
    category: CommandCategory.UTILITY,

    async execute(message: Message, args: string[]): Promise<void> {
        try {
            const now = new Date();
            const dynamicColor = getDynamicColor(message.member!);

            const messageEmbed = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle("Hora actual")
                .setDescription(`La hora actual es: ${now.toLocaleTimeString()}`)
                .setColor(dynamicColor)
                .setFooter({ text: "Hora del servidor" })
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [messageEmbed] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando hora:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};
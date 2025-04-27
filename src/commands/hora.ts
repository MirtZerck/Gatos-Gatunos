import { EmbedBuilder, Message, PermissionsBitField, TextChannel } from "discord.js";
import moment from "moment-timezone";
import { Command } from "../types/command.js";
import { CustomImageURLOptions } from "../types/embeds.js";
import { getDynamicColor } from "../utils/getDynamicColor.js";
import { CommandsService } from "../db_service/commandsService.js";

export const serverHour: Command = {
    name: "horaserver",
    alias: ["hs", "hora", "hour"],

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

export const setHour: Command = {
    name: "sethour",
    alias: ["sh", "sethora"],

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
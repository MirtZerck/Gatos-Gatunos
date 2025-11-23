import { Events, Message, EmbedBuilder } from "discord.js";
import { Event } from "../types/Events.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { BotClient } from "../types/BotClient.js";
import { createCustomCommandEmbed } from "../utils/customCommandHelpers.js";
import { COLORS } from "../utils/constants.js";

/**
 * Event handler para comandos personalizados.
 * Escucha mensajes y ejecuta comandos personalizados del servidor.
 * 
 * Este handler se ejecuta DESPUÉS del messageCreate principal,
 * solo si el comando no fue encontrado en los comandos normales.
 */
export default {
    name: Events.MessageCreate,

    async execute(client, message: Message) {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.content.startsWith(config.prefix)) return;

        const customManager = (client as BotClient).customCommandManager;
        if (!customManager) return;

        /* Extraer nombre del comando */
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        /* Verificar si es un comando normal (ya procesado) */
        const normalCommand = client.commands.get(commandName);
        if (normalCommand) return;

        /* Verificar si es un alias de comando normal */
        const aliasCommand = client.commands.find(cmd => {
            if (cmd.type === 'slash-only') return false;
            return 'aliases' in cmd && cmd.aliases?.includes(commandName);
        });
        if (aliasCommand) return;

        /* Intentar ejecutar como comando personalizado */
        try {
            const imageUrl = await customManager.getRandomValue(message.guild.id, commandName);

            if (imageUrl) {
                // Obtener info del comando
                const commandInfo = await customManager.getCommandInfo(message.guild.id, commandName);

                const embed = createCustomCommandEmbed(
                    commandName,
                    imageUrl,
                    commandInfo.count
                );

                await message.reply({ embeds: [embed] });

                logger.info(
                    'CustomCommand',
                    `${message.author.tag} usó comando personalizado: ${commandName} en ${message.guild.name}`
                );
            }
        } catch (error) {
            logger.error('CustomCommandHandler', `Error ejecutando comando personalizado ${commandName}`, error);
        }
    }
} as Event;
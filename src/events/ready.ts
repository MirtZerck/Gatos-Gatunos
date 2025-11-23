import { Events } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";
import { BotClient } from "../types/BotClient.js";
import { config } from "../config.js";

/**
 * Handler del evento ClientReady.
 * Se ejecuta una vez cuando el bot se conecta exitosamente a Discord.
 */
export default {
    name: Events.ClientReady,
    once: true,

    async execute(client: BotClient) {
        if (!client.user) return;

        client.user.setPresence({
            activities: [{ name: `Mi prefijo es: ${config.prefix}`, type: 4, url: 'https://discord.gg/nU9n4Q4r' }],
            status: 'dnd'
        });

        const guilds = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        logger.ready(client.user.tag, guilds, users);

        if (client.musicManager) {
            logger.info('Bot', 'Sistema de música listo');
        }
    }
} as Event;

import { Events } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";

export default {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        logger.ready(
            client.user?.tag || 'Bot',
            client.guilds.cache.size,
            client.users.cache.size
        )

        client.user?.setPresence({
            activities: [{ name: 'Chapulinear', type: 5 }],
            status: 'dnd'
        });

        if (!client.user) return;

        const guilds = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        logger.ready(client.user.tag, guilds, users);

        if (client.musicManager) {
            try {
                logger.info('Bot', '🎵 Inicializando sistema de música...');
                await client.musicManager.initialize();
                logger.info('Bot', '✅ Sistema de música listo');
            } catch (error) {
                logger.error('Bot', '❌ Error inicializando sistema de música', error);
                logger.warn('Bot', '⚠️ El bot continuará sin sistema de música');
            }
        }

    }
} as Event;
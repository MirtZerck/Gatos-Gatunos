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
            logger.info('Bot', '✅ Sistema de música con Spotify listo');
        }

    }
} as Event;
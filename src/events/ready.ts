import { Events } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger_temp.js";

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

    }
} as Event;
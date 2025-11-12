import { Events } from "discord.js";
import { Event } from "../types/Events.js";

export default {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`\n Bot conectado como ${client.user?.username}`);

        client.user?.setPresence({
            activities: [{ name: 'Chapulinear', type: 5 }],            
            status: 'dnd'
        });

        console.log(`📊 Servidores: ${client.guilds.cache.size}`);
        console.log(`👥 Usuarios: ${client.users.cache.size}`);
    }
} as Event;
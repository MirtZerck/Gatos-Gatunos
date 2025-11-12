import { GatewayIntentBits } from "discord.js";
import { config } from './config.js'
import { BotClient } from "./types/BotClient.js";
import { CommandManager } from "./managers/CommandManager.js";
import { EventManager } from "./managers/EventManager.js";

async function main() {
    const client = new BotClient({

        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildVoiceStates

        ]
    });

    console.log('Cargando comandos...');
    const commandManager = new CommandManager();
    await commandManager.loadCommands();
    client.commands = commandManager.commands;

    console.log('Cargando eventos...');
    const commandEvents = new EventManager(client);
    await commandEvents.loadEvents();

    console.log('\n🔌 Conectando al bot...\n');
    await client.login(config.token);
}
main().catch(console.error);

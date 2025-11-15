import { GatewayIntentBits } from "discord.js";
import { config } from './config.js'
import { BotClient } from "./types/BotClient.js";
import { CommandManager } from "./managers/CommandManager.js";
import { EventManager } from "./managers/EventManager.js";
import { logger } from './utils/logger_temp.js';

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

    logger.info('Bot', 'Cargando comandos...');
    const commandManager = new CommandManager();
    await commandManager.loadCommands();
    client.commands = commandManager.commands;
    client.commandManager = commandManager;

    logger.info('Bot', 'Cargando eventos...');
    const commandEvents = new EventManager(client);
    await commandEvents.loadEvents();

    logger.info('Bot', '\n🔌 Conectando al bot...\n');
    await client.login(config.token);
}
main().catch((error) => {
    logger.error('Bot', 'Error fatal al iniciar el bot', error);
    process.exit(1);
});

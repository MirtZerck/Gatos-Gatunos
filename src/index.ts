import { GatewayIntentBits } from "discord.js";
import { config } from './config.js'
import { BotClient } from "./types/BotClient.js";
import { CommandManager } from "./managers/CommandManager.js";
import { CooldownManager } from "./managers/CooldownManager.js";
import { RequestManager } from "./managers/RequestManager.js";
import { EventManager } from "./managers/EventManager.js";
import { logger } from './utils/logger.js';

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

    logger.info('Bot', 'Inicializando sistema de cooldowns...');
    const cooldownManager = new CooldownManager();
    client.cooldownManager = cooldownManager

    cooldownManager.setCooldownConfig('utility', 3000); // 3 segundos
    cooldownManager.setCooldownConfig('interact', 5000) // 5 segundos
    cooldownManager.setCooldownConfig('moderation', 2000) // 2 segundos

    logger.info('Bot', 'Inicializando sistema de solicitudes...');
    const requestManager = new RequestManager();
    client.requestManager = requestManager;

    logger.info('Bot', 'Cargando eventos...');
    const commandEvents = new EventManager(client);
    await commandEvents.loadEvents();

    logger.info('Bot', '\n🔌 Conectando al bot...\n');
    await client.login(config.token);

    process.on('SIGINT', () => {
        logger.info('Bot', 'Cerrando bot...');
        cooldownManager.destroy();
        requestManager.destroy();
        client.destroy();
        process.exit(0);
    });
}

main().catch((error) => {
    logger.error('Bot', 'Error fatal al iniciar el bot', error);
    process.exit(1);
});

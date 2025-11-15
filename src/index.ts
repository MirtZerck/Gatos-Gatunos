import { GatewayIntentBits } from "discord.js";
import { config, firebaseConfig } from './config.js'
import { BotClient } from "./types/BotClient.js";
import { CommandManager } from "./managers/CommandManager.js";
import { CooldownManager } from "./managers/CooldownManager.js";
import { RequestManager } from "./managers/RequestManager.js";
import { FirebaseManager } from "./managers/FirebaseManager.js";
import { InteractionStatsManager } from "./managers/InteractionStatsManager.js";
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

    // ✅ Inicializar Firebase PRIMERO
    logger.info('Bot', '🔥 Conectando con Firebase...');
    const firebaseManager = new FirebaseManager(firebaseConfig);
    try {
        await firebaseManager.initialize();
        client.firebaseManager = firebaseManager;

        // Inicializar InteractionStatsManager
        const interactionStatsManager = new InteractionStatsManager(firebaseManager);
        client.interactionStatsManager = interactionStatsManager;
        logger.info('Bot', '✅ Sistema de estadísticas de interacciones listo');
    } catch (error) {
        logger.error('Bot', '❌ Error conectando con Firebase', error);
        logger.warn('Bot', '⚠️ El bot continuará sin estadísticas de interacciones');
    }

    // Cargar comandos
    logger.info('Bot', 'Cargando comandos...');
    const commandManager = new CommandManager();
    await commandManager.loadCommands();
    client.commands = commandManager.commands;
    client.commandManager = commandManager;

    // Inicializar sistema de cooldowns
    logger.info('Bot', 'Inicializando sistema de cooldowns...');
    const cooldownManager = new CooldownManager();
    client.cooldownManager = cooldownManager

    cooldownManager.setCooldownConfig('utility', 3000); // 3 segundos
    cooldownManager.setCooldownConfig('interact', 5000) // 5 segundos
    cooldownManager.setCooldownConfig('act', 5000) // 5 segundos
    cooldownManager.setCooldownConfig('react', 5000) // 5 segundos
    cooldownManager.setCooldownConfig('moderation', 2000) // 2 segundos

    // Inicializar sistema de solicitudes
    logger.info('Bot', 'Inicializando sistema de solicitudes...');
    const requestManager = new RequestManager();
    client.requestManager = requestManager;

    // Cargar eventos
    logger.info('Bot', 'Cargando eventos...');
    const commandEvents = new EventManager(client);
    await commandEvents.loadEvents();

    logger.info('Bot', '\n🔌 Conectando al bot...\n');
    await client.login(config.token);

    // Manejo de cierre
    process.on('SIGINT', () => {
        logger.info('Bot', 'Cerrando bot...');
        cooldownManager.destroy();
        requestManager.destroy();
        if (firebaseManager) {
            firebaseManager.destroy();
        }
        client.destroy();
        process.exit(0);
    });
}

main().catch((error) => {
    logger.error('Bot', 'Error fatal al iniciar el bot', error);
    process.exit(1);
});
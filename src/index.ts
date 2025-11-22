import { GatewayIntentBits } from "discord.js";
import { config, firebaseAdminConfig } from './config.js'
import { BotClient } from "./types/BotClient.js";
import { CommandManager } from "./managers/CommandManager.js";
import { CooldownManager } from "./managers/CooldownManager.js";
import { RequestManager } from "./managers/RequestManager.js";
import { FirebaseAdminManager } from "./managers/FirebaseAdminManager.js";
import { InteractionStatsManager } from "./managers/InteractionStatsManager.js";
import { MusicManager } from "./managers/MusicManager.js";
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

    // ✅ Inicializar Firebase Admin SDK PRIMERO
    logger.info('Bot', '🔥 Conectando con Firebase Admin SDK...');
    const firebaseAdminManager = new FirebaseAdminManager(firebaseAdminConfig);
    try {
        await firebaseAdminManager.initialize();
        client.firebaseAdminManager = firebaseAdminManager;

        // Inicializar InteractionStatsManager
        const interactionStatsManager = new InteractionStatsManager(firebaseAdminManager);
        client.interactionStatsManager = interactionStatsManager;
        logger.info('Bot', '✅ Sistema de estadísticas de interacciones listo');

        // Inicializar CustomCommandManager
        const { CustomCommandManager } = await import('./managers/CustomCommandManager.js');
        const customCommandManager = new CustomCommandManager(firebaseAdminManager);
        client.customCommandManager = customCommandManager;
        logger.info('Bot', '✅ Sistema de comandos personalizados listo');

    } catch (error) {
        logger.error('Bot', '❌ Error conectando con Firebase Admin SDK', error);
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
    cooldownManager.setCooldownConfig('custom', 5000) // 5 segundos
    cooldownManager.setCooldownConfig('danbooru', 5000) // 5 segundos
    cooldownManager.setCooldownConfig('music', 2000) // 2 segundos

    // Inicializar sistema de solicitudes
    logger.info('Bot', 'Inicializando sistema de solicitudes...');
    const requestManager = new RequestManager();
    client.requestManager = requestManager;

    // Inicializar sistema de música
    logger.info('Bot', 'Preparando sistema de música...');
    const musicManager = new MusicManager(client);
    client.musicManager = musicManager;

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
        if (firebaseAdminManager) {
            firebaseAdminManager.destroy();
        }
        if (musicManager) {
            musicManager.destroy();
        }
        client.destroy();
        process.exit(0);
    });
}

main().catch((error) => {
    logger.error('Bot', 'Error fatal al iniciar el bot', error);
    process.exit(1);
});
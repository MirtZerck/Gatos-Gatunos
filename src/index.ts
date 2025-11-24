import { GatewayIntentBits } from "discord.js";
import { config, firebaseAdminConfig } from './config.js';
import { BotClient } from "./types/BotClient.js";
import { CommandManager } from "./managers/CommandManager.js";
import { CooldownManager } from "./managers/CooldownManager.js";
import { RequestManager } from "./managers/RequestManager.js";
import { FirebaseAdminManager } from "./managers/FirebaseAdminManager.js";
import { InteractionStatsManager } from "./managers/InteractionStatsManager.js";
import { MusicManager } from "./managers/MusicManager.js";
import { EventManager } from "./managers/EventManager.js";
import { logger } from './utils/logger.js';

/**
 * Punto de entrada principal del bot.
 * Inicializa todos los sistemas y conecta con Discord.
 */
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

    // Firebase y sistemas dependientes
    logger.info('Bot', 'Conectando con Firebase Admin SDK...');
    const firebaseAdminManager = new FirebaseAdminManager(firebaseAdminConfig);

    try {
        await firebaseAdminManager.initialize();
        client.firebaseAdminManager = firebaseAdminManager;

        const interactionStatsManager = new InteractionStatsManager(firebaseAdminManager);
        client.interactionStatsManager = interactionStatsManager;
        logger.info('Bot', 'Sistema de estadísticas listo');

        const { CustomCommandManager } = await import('./managers/CustomCommandManager.js');
        const customCommandManager = new CustomCommandManager(firebaseAdminManager);
        client.customCommandManager = customCommandManager;
        logger.info('Bot', 'Sistema de comandos personalizados listo');

        const { WarnManager } = await import('./managers/WarnManager.js');
        const warnManager = new WarnManager(firebaseAdminManager);
        client.warnManager = warnManager;
        logger.info('Bot', 'Sistema de advertencias listo');
    } catch (error) {
        logger.error('Bot', 'Error conectando con Firebase Admin SDK', error);
        logger.warn('Bot', 'El bot continuará sin estadísticas de interacciones');
    }

    // Sistema de comandos
    logger.info('Bot', 'Cargando comandos...');
    const commandManager = new CommandManager();
    await commandManager.loadCommands();
    client.commands = commandManager.commands;
    client.commandManager = commandManager;

    // Conectar CustomCommandManager con CommandManager para validación de nombres
    if (client.customCommandManager) {
        client.customCommandManager.setCommandManager(commandManager);
    }

    // Sistema de cooldowns
    logger.info('Bot', 'Inicializando sistema de cooldowns...');
    const cooldownManager = new CooldownManager();
    client.cooldownManager = cooldownManager;

    cooldownManager.setCooldownConfig('utility', 3000);
    cooldownManager.setCooldownConfig('interact', 5000);
    cooldownManager.setCooldownConfig('act', 5000);
    cooldownManager.setCooldownConfig('react', 5000);
    cooldownManager.setCooldownConfig('moderation', 2000);
    cooldownManager.setCooldownConfig('custom', 5000);
    cooldownManager.setCooldownConfig('danbooru', 5000);
    cooldownManager.setCooldownConfig('music', 2000);

    // Sistema de solicitudes
    logger.info('Bot', 'Inicializando sistema de solicitudes...');
    const requestManager = new RequestManager();
    client.requestManager = requestManager;

    // Sistema de música
    logger.info('Bot', 'Preparando sistema de música...');
    const musicManager = new MusicManager(client);
    client.musicManager = musicManager;

    // Eventos
    logger.info('Bot', 'Cargando eventos...');
    const eventManager = new EventManager(client);
    await eventManager.loadEvents();

    // Conexión
    logger.info('Bot', 'Conectando al bot...');
    await client.login(config.token);

    // Manejo de cierre
    process.on('SIGINT', () => {
        logger.info('Bot', 'Cerrando bot...');
        cooldownManager.destroy();
        requestManager.destroy();
        firebaseAdminManager?.destroy();
        musicManager?.destroy();
        client.aiManager?.destroy();
        client.destroy();
        process.exit(0);
    });
}

main().catch((error) => {
    logger.error('Bot', 'Error fatal al iniciar el bot', error);
    process.exit(1);
});

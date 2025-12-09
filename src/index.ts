import { GatewayIntentBits, Partials } from "discord.js";
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

async function main() {
    const client = new BotClient({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildVoiceStates
        ],
        partials: [Partials.Channel]
    });

    // Firebase y sistemas dependientes
    if (firebaseAdminConfig) {
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

            const { BlockManager } = await import('./managers/BlockManager.js');
            const blockManager = new BlockManager(firebaseAdminManager);
            client.blockManager = blockManager;
            logger.info('Bot', 'Sistema de bloqueos listo');

            const { DiscordAutomodManager } = await import('./managers/DiscordAutomodManager.js');
            const discordAutomodManager = new DiscordAutomodManager();
            client.discordAutomodManager = discordAutomodManager;
            logger.info('Bot', 'Sistema de AutoMod listo');

            const { PremiumManager } = await import('./managers/PremiumManager.js');
            const premiumManager = new PremiumManager(firebaseAdminManager, client);
            client.premiumManager = premiumManager;
            logger.info('Bot', 'Sistema premium listo');

            const { RedeemCodeManager } = await import('./managers/RedeemCodeManager.js');
            const redeemCodeManager = new RedeemCodeManager(firebaseAdminManager);
            client.redeemCodeManager = redeemCodeManager;
            logger.info('Bot', 'Sistema de códigos de canje listo');

            const { DonationManager } = await import('./managers/DonationManager.js');
            const donationManager = new DonationManager(firebaseAdminManager, client);
            client.donationManager = donationManager;
            logger.info('Bot', 'Sistema de donaciones listo');

            const { VoteManager } = await import('./managers/VoteManager.js');
            const voteManager = new VoteManager(firebaseAdminManager, client);
            client.voteManager = voteManager;
            logger.info('Bot', 'Sistema de votos listo');

            if (config.premium.enabled) {
                await premiumManager.startExpirationChecker();
                logger.info('Bot', 'Checker de expiración premium iniciado');
            }

            if (config.premium.enableWebhookServer) {
                const { WebhookServer } = await import('./server/webhookServer.js');
                const webhookServer = new WebhookServer(client, config.premium.webhookServerPort);
                client.webhookServer = webhookServer;
                await webhookServer.start();
                logger.info('Bot', `Servidor de webhooks iniciado en puerto ${config.premium.webhookServerPort}`);
            }
        } catch (error) {
            logger.error('Bot', 'Error conectando con Firebase Admin SDK', error);
            logger.warn('Bot', 'El bot continuará sin funcionalidades que requieren Firebase');
        }
    } else {
        logger.warn('Bot', 'Firebase no configurado - Funcionalidades deshabilitadas:');
        logger.warn('Bot', '  - Comandos personalizados (/custom)');
        logger.warn('Bot', '  - Sistema de advertencias (/moderation warn)');
        logger.warn('Bot', '  - Estadísticas de interacciones (/utility stats)');
        logger.warn('Bot', '  - Configuración de zona horaria por servidor');
        logger.warn('Bot', '  - Memoria persistente de IA');

        const { DiscordAutomodManager } = await import('./managers/DiscordAutomodManager.js');
        const discordAutomodManager = new DiscordAutomodManager();
        client.discordAutomodManager = discordAutomodManager;
        logger.info('Bot', 'Sistema de AutoMod listo (sin Firebase)');
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
    process.on('SIGINT', async () => {
        logger.info('Bot', 'Cerrando bot...');
        cooldownManager.destroy();
        requestManager.destroy();
        client.firebaseAdminManager?.destroy();
        musicManager?.destroy();
        if (client.aiManager) {
            await client.aiManager.destroy();
        }
        if (client.webhookServer) {
            await client.webhookServer.stop();
        }
        client.destroy();
        process.exit(0);
    });
}

main().catch((error) => {
    logger.error('Bot', 'Error fatal al iniciar el bot', error);
    process.exit(1);
});

import { config } from './config.js';
import { CommandManager } from './managers/CommandManager.js';
import { logger } from './utils/logger_temp.js';

async function deploy() {
    const commandManager = new CommandManager();

    logger.info('Deploy', 'Cargando comandos al Slash del bot...');
    await commandManager.loadCommands()

    await commandManager.deployCommands(config.token, config.clientId);
}

deploy().catch((error) => {
    logger.error('Deploy', 'Error al desplegar comandos', error);
    process.exit(1);
})
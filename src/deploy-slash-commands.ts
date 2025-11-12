import { config } from './config.js';
import { CommandManager } from './managers/CommandManager.js';

async function deploy() {
    const commandManager = new CommandManager();

    console.log('Cargando comandos al Slash del bot...');
    await commandManager.loadCommands()

    console.log('');
    await commandManager.deployCommands(config.token, config.clientId);
}

deploy().catch(console.error)
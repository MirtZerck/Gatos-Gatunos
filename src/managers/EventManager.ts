import { BotClient } from "../types/BotClient.js";
import { Event } from "../types/Events.js";
import { readdirSync } from "fs";
import { join, dirname } from 'path'
import { fileURLToPath } from "url";
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * *Gestor de eventos de Discord.
 * *Carga y registra automáticamante todos los event handlers desde el directorio de eventos.
 * 
 * @class EventManager
 * @example
 * ```typescript
 * const eventManager = new EventManager(client);
 * await eventManager.loadEvents();
 * ```
 */
export class EventManager {
    /* Cliente de Discord al que se vincularán los eventos */
    private client: BotClient;

    /**
     * *Crea una nueva instancia del gestor de eventos.
     * 
     * @param {BotClient} client - Instancia del cliente de Discord 
     */

    constructor(client: BotClient) {
        this.client = client;
    }

    /**
     * *Carga todos los eventos desde el directorio de eventos.
     * *Registra automáticamente los listeners en el cliente de Discord.
     * *Soporta eventos que se ejecutan una sola vez (once) o múltiples veces (on).
     * 
     * @async
     * @returns {Promise<void>}
     * @throws {Error} Si hay un error al leer el directorio de eventos
     * 
     * @example
     * ```typescript
     * await eventManager.loadEvents();
     * * // Todos los eventos en src/events/ están ahora registrados
     * ```
     */

    async loadEvents(): Promise<void> {
        const eventsPath = join(__dirname, '../events');
        const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('js'));

        for (const file of eventFiles) {
            const filePath = join(eventsPath, file);
            const eventModule = await import(`file://${filePath}`);
            const event = eventModule.default as Event;

            if (event?.name && event.execute) {
                if (event.once) {
                    this.client.once(event.name, (...args) =>
                        event.execute(this.client, ...args)
                    );
                } else {
                    this.client.on(event.name, (...args) =>
                        event.execute(this.client, ...args)
                    )
                }
                logger.debug('EventManager', `  ├─ ${event.name} ${event.once ? '(once)' : ''}`);

            }
        }

        logger.module('EventManager', eventFiles.length);

    }
}
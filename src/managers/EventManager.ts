import { BotClient } from "../types/BotClient.js";
import { Event } from "../types/Events.js";
import { readdirSync } from "fs";
import { join, dirname } from 'path'
import { fileURLToPath } from "url";
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class EventManager {
    private client: BotClient;

    constructor(client: BotClient) {
        this.client = client;
    }

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
import { ClientEvents } from "discord.js";
import { BotClient } from "./BotClient.js";

/**
 * Definición de un event handler para eventos de Discord.
 * Permite registrar handlers que se ejecutan cuando ocurren eventos específicos.
 *
 * @interface Event
 *
 * @example
 * ```typescript
 * const readyEvent: Event = {
 *     name: Events.ClientReady,
 *     once: true,
 *     execute: async (client) => {
 *         console.log(`Bot conectado como ${client.user?.tag}`);
 *     }
 * };
 * ```
 */
export interface Event {
    /** Nombre del evento de Discord a escuchar */
    name: keyof ClientEvents;
    /** Si true, el handler se ejecuta solo una vez */
    once?: boolean;
    /** Función handler que se ejecuta cuando ocurre el evento */
    execute: (client: BotClient, ...args: ClientEvents[keyof ClientEvents]) => Promise<void> | void;
}

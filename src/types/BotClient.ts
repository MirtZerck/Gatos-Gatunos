import { Client, Collection, ClientOptions } from "discord.js";
import { Command } from "./Command.js";
import { CommandManager } from "../managers/CommandManager.js";
import { CooldownManager } from "../managers/CooldownManager.js";
import { RequestManager } from "../managers/RequestManager.js";
import { FirebaseAdminManager } from "../managers/FirebaseAdminManager.js";
import { InteractionStatsManager } from "../managers/InteractionStatsManager.js";
import { CustomCommandManager } from "../managers/CustomCommandManager.js";
import { MusicManager } from "../managers/MusicManager.js";
import { WarnManager } from "../managers/WarnManager.js";
import { AIManager } from "../ai/core/AIManager.js";

/**
 * Cliente extendido del bot con todos los managers y sistemas integrados.
 * Extiende la clase Client de discord.js agregando funcionalidades específicas.
 *
 * @class BotClient
 * @extends {Client}
 *
 * @example
 * ```typescript
 * const client = new BotClient({
 *     intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
 * });
 *
 * client.commandManager = new CommandManager();
 * await client.login(token);
 * ```
 */
export class BotClient extends Client {
    /** Colección de comandos registrados, indexados por nombre */
    public commands: Collection<string, Command>;

    /** Gestor de carga y registro de comandos */
    public commandManager?: CommandManager;

    /** Sistema de cooldowns para prevenir spam de comandos */
    public cooldownManager?: CooldownManager;

    /** Gestor de solicitudes de interacción entre usuarios */
    public requestManager?: RequestManager;

    /** Conexión con Firebase Admin SDK para persistencia */
    public firebaseAdminManager?: FirebaseAdminManager;

    /** Sistema de estadísticas de interacciones entre usuarios */
    public interactionStatsManager?: InteractionStatsManager;

    /** Gestor de comandos personalizados por servidor */
    public customCommandManager?: CustomCommandManager;

    /** Sistema de reproducción de música con Lavalink */
    public musicManager?: MusicManager;

    /** Sistema de advertencias por servidor */
    public warnManager?: WarnManager;

    /** Sistema de inteligencia artificial */
    public aiManager?: AIManager;

    /**
     * Crea una nueva instancia del cliente del bot.
     *
     * @param {ClientOptions} options - Opciones de configuración del cliente de Discord
     */
    constructor(options: ClientOptions) {
        super(options);
        this.commands = new Collection();
    }
}

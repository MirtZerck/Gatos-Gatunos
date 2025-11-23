import { Collection, REST, Routes } from "discord.js";
import { Command, PrefixOnlyCommand, SubcommandInfo } from "../types/Command.js";
import { readdirSync, statSync } from "fs";
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gestor centralizado de comandos del bot.
 * Maneja la carga, registro y búsqueda de comandos desde el sistema de archivos.
 *
 * @class CommandManager
 *
 * @example
 * ```typescript
 * const manager = new CommandManager();
 * await manager.loadCommands();
 * const command = manager.getCommand('ping');
 * ```
 */
export class CommandManager {
    /** Colección de comandos cargados, indexados por nombre */
    public commands: Collection<string, Command>;

    /** Set de nombres de comandos originales (excluye aliases y wrappers) */
    private originalCommandNames: Set<string>;

    constructor() {
        this.commands = new Collection();
        this.originalCommandNames = new Set();
    }

    /**
     * Carga todos los comandos desde el directorio de comandos y sus subcarpetas.
     * Registra comandos originales y sus aliases automáticamente.
     *
     * @async
     * @returns {Promise<void>}
     * @throws {Error} Si hay un error crítico al cargar los archivos de comandos
     *
     * @example
     * ```typescript
     * await commandManager.loadCommands();
     * console.log(`${commandManager.commands.size} comandos cargados`);
     * ```
     */
    async loadCommands(): Promise<void> {
        logger.info('CommandManager', 'Cargando comandos...');

        const commandPath = join(__dirname, '../commands');
        await this.loadCommandsFromDirectory(commandPath);
        this.registerSubcommandAliases();

        const categories = new Map<string, string[]>();

        for (const [name, command] of this.commands) {
            const category = command.category || 'Sin categoría';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(name);
        }

        logger.module('CommandManager', this.commands.size);

        for (const [, commandNames] of categories) {
            for (const cmdName of commandNames) {
                const command = this.commands.get(cmdName)!;

                const aliases = (command.type !== 'slash-only' && 'aliases' in command && command.aliases)
                    ? ` (${command.aliases.join(', ')})`
                    : '';

                const typeIcon = {
                    'slash-only': '⚡',
                    'prefix-only': '💬',
                    'hybrid': '🔀',
                    'unified': '🔗'
                }[command.type];

                logger.debug('CommandManager', `${typeIcon} ${cmdName}${aliases}`);
            }
        }
    }

    /**
     * Registra aliases de subcomandos como comandos independientes.
     * Permite que los aliases de subcomandos funcionen como comandos de prefijo directos.
     *
     * @private
     */
    private registerSubcommandAliases(): void {
        const commandsWithSubcommands = Array.from(this.commands.values()).filter(
            (cmd): cmd is Extract<Command, { subcommands?: SubcommandInfo[] }> =>
                'subcommands' in cmd && Array.isArray(cmd.subcommands)
        );

        for (const command of commandsWithSubcommands) {
            if (!command.subcommands) continue;

            for (const subcommand of command.subcommands) {
                this.registerSubcommandAlias(command, subcommand.name);

                if (subcommand.aliases) {
                    for (const alias of subcommand.aliases) {
                        this.registerSubcommandAlias(command, alias);
                    }
                }
            }
        }
    }

    /**
     * Registra un alias de subcomando como un wrapper del comando padre.
     *
     * @private
     * @param {Command} parentCommand - Comando padre que contiene el subcomando
     * @param {string} alias - Alias a registrar
     */
    private registerSubcommandAlias(parentCommand: Command, alias: string): void {
        if (this.commands.has(alias)) {
            logger.warn('CommandManager', `Alias "${alias}" ya existe, saltando`);
            return;
        }

        if (parentCommand.type === 'slash-only') {
            return;
        }

        const subcommandWrapper: Command = {
            ...parentCommand,
            name: alias,
            aliases: [],
        };

        this.commands.set(alias, subcommandWrapper);
        logger.debug('CommandManager', `Registrado alias: ${alias}`);
    }

    /**
     * Carga comandos recursivamente desde un directorio y sus subdirectorios.
     *
     * @private
     * @async
     * @param {string} dir - Ruta del directorio a escanear
     * @returns {Promise<void>}
     * @throws {Error} Si hay un error al leer el directorio
     */
    private async loadCommandsFromDirectory(dir: string): Promise<void> {
        const files = readdirSync(dir);

        for (const file of files) {
            const filePath = join(dir, file);
            const stat = statSync(filePath);

            if (stat.isDirectory()) {
                await this.loadCommandsFromDirectory(filePath);
            } else if (file.endsWith('.ts') || file.endsWith('js')) {
                await this.loadCommandFile(filePath);
            }
        }
    }

    /**
     * Carga un archivo de comando individual.
     *
     * @private
     * @async
     * @param {string} filePath - Ruta completa al archivo del comando
     * @returns {Promise<void>}
     */
    private async loadCommandFile(filePath: string): Promise<void> {
        try {
            const fileURL = pathToFileURL(filePath).href;
            const commandModule = await import(fileURL);
            const command = Object.values(commandModule)[0] as Command;

            const isValid =
                command?.name &&
                command?.type &&
                command?.category &&
                (
                    (command.type === 'slash-only' && command.data) ||
                    (command.type === 'prefix-only') ||
                    (command.type === 'hybrid' && command.data) ||
                    (command.type === 'unified' && command.data)
                );

            if (isValid) {
                this.commands.set(command.name, command);
                this.originalCommandNames.add(command.name);
            } else {
                logger.warn('CommandManager', `Comando inválido: ${filePath}`);
            }
        } catch (error) {
            logger.error('CommandManager', `Error cargando comando desde ${filePath}:`, error);

            if (error instanceof Error) {
                logger.debug('CommandManager', `Detalles: ${error.message}`);
                logger.debug('CommandManager', `Stack: ${error.stack?.split('\n')[0]}`);
            }
        }
    }

    /**
     * Obtiene un comando por nombre o alias.
     * Busca primero por nombre exacto, luego por alias.
     *
     * @param {string} name - Nombre o alias del comando a buscar
     * @returns {Command | undefined} El comando encontrado o undefined
     *
     * @example
     * ```typescript
     * const command = manager.getCommand('ping');
     * const sameCommand = manager.getCommand('p');
     * ```
     */
    getCommand(name: string): Command | undefined {
        const command = this.commands.get(name);
        if (command) return command;

        return this.commands.find(cmd => {
            if (cmd.type === 'slash-only') return false;
            return 'aliases' in cmd && cmd.aliases?.includes(name);
        });
    }

    /**
     * Verifica si un comando es original (no es un wrapper de alias).
     *
     * @param {string} name - Nombre del comando a verificar
     * @returns {boolean} true si es un comando original, false si es un alias
     *
     * @example
     * ```typescript
     * manager.isOriginalCommand('ping'); // true
     * manager.isOriginalCommand('p');    // false (es alias)
     * ```
     */
    isOriginalCommand(name: string): boolean {
        return this.originalCommandNames.has(name);
    }

    /**
     * Registra todos los comandos slash en Discord a través de la API.
     * Solo registra comandos originales que soporten slash commands.
     *
     * @async
     * @param {string} token - Token del bot de Discord
     * @param {string} clientId - ID de la aplicación del bot
     * @returns {Promise<void>}
     * @throws {Error} Si hay un error al comunicarse con la API de Discord
     *
     * @example
     * ```typescript
     * await manager.deployCommands(config.token, config.clientId);
     * ```
     */
    async deployCommands(token: string, clientId: string): Promise<void> {
        const slashCommands = Array.from(this.commands.entries())
            .filter(([name, cmd]) =>
                this.originalCommandNames.has(name) &&
                cmd.type !== 'prefix-only' &&
                'data' in cmd
            )
            .map(([, cmd]) => cmd) as Exclude<Command, PrefixOnlyCommand>[];

        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());

        if (commandsData.length === 0) {
            logger.warn('CommandManager', 'No hay comandos slash para registrar');
            return;
        }

        logger.info('CommandManager', `Registrando ${commandsData.length} comandos slash...`);

        const rest = new REST().setToken(token);

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData }
        );

        logger.info('CommandManager', 'Comandos registrados en Discord');

        const prefixOnlyCount = Array.from(this.commands.values())
            .filter(cmd => cmd.type === 'prefix-only').length;

        if (prefixOnlyCount > 0) {
            logger.info('CommandManager', `${prefixOnlyCount} comandos solo con prefijo`);
        }
    }

    /**
     * Lista todos los comandos cargados organizados por categoría.
     *
     * @deprecated Usar getStats() para obtener datos estructurados
     */
    listCommands(): void {
        const categories = new Map<string, Command[]>();

        for (const command of this.commands.values()) {
            const category = command.category;

            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(command);
        }

        logger.info('CommandManager', '\nComandos disponibles:\n');

        for (const [category, cmds] of categories) {
            logger.info('CommandManager', `\n${category}:`);
            for (const cmd of cmds) {
                const aliasesStr = (cmd.type !== 'slash-only' && 'aliases' in cmd && cmd.aliases)
                    ? ` (${cmd.aliases.join(', ')})`
                    : '';

                const typeIndicator = cmd.type === 'slash-only' ? '/' :
                    cmd.type === 'prefix-only' ? '!' : '/!';

                logger.info('CommandManager', `  ${typeIndicator}${cmd.name}${aliasesStr}: ${cmd.description}`);
            }
        }
    }

    /**
     * Obtiene estadísticas sobre los comandos cargados.
     *
     * @returns {Object} Estadísticas de comandos
     *
     * @example
     * ```typescript
     * const stats = manager.getStats();
     * console.log(`Total: ${stats.total}`);
     * console.log(`Slash-only: ${stats.byType['slash-only']}`);
     * ```
     */
    getStats(): {
        total: number;
        byType: Record<Command['type'], number>;
        byCategory: Record<string, number>;
    } {
        const stats = {
            total: this.commands.size,
            byType: {
                'slash-only': 0,
                'prefix-only': 0,
                'hybrid': 0,
                'unified': 0
            } as Record<Command['type'], number>,
            byCategory: {} as Record<string, number>
        };

        for (const command of this.commands.values()) {
            stats.byType[command.type]++;

            if (!stats.byCategory[command.category]) {
                stats.byCategory[command.category] = 0;
            }
            stats.byCategory[command.category]++;
        }

        return stats;
    }
}

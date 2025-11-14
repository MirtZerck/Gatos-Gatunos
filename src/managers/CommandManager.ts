import { Collection, REST, Routes } from "discord.js";
import { Command, PrefixOnlyCommand, SubcommandInfo } from "../types/Command.js";
import { readdirSync, statSync } from "fs";
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from "url";
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CommandManager {
    public commands: Collection<string, Command>;
    private originalCommandNames: Set<string>;

    constructor() {
        this.commands = new Collection();
        this.originalCommandNames = new Set();
    }

    /*  Carga todos los comandos desde las subcarpetas  */

    async loadCommands(): Promise<void> {
        logger.info('CommandManager', '📦 Cargando comandos...')

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

        for (const [category, commandNames] of categories) {

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

                logger.debug('CommandManager', `${typeIcon} ${cmdName} ${aliases}`);
            }
        }
    }

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

    private registerSubcommandAlias(parentCommand: Command, alias: string): void {      
        if (this.commands.has(alias)) {
            logger.warn('CommandManager', `Alias "${alias}" ya existe, saltando`);
            return;
        }
    
        // Los aliases de subcomandos solo tienen sentido para comandos de prefijo
        if (parentCommand.type === 'slash-only') {
            return;
        }
    
        const subcommandWrapper: Command = {
            ...parentCommand,
            name: alias,
            aliases: [], 
        };
    
        this.commands.set(alias, subcommandWrapper);
        logger.debug('CommandManager', `  ↳ Registrado alias: ${alias}`);
    }

    /*  Carga comandos recursivamente desde un directorio */

    private async loadCommandsFromDirectory(dir: string): Promise<void> {
        const files = readdirSync(dir);

        for (const file of files) {
            const filePath = join(dir, file);
            const stat = statSync(filePath);

            if (stat.isDirectory()) {
                // Si es carpeta, cargar recursivamente
                await this.loadCommandsFromDirectory(filePath);
            } else if (file.endsWith('.ts') || file.endsWith('js')) {
                // Si es archivo .ts/.js, cargar como comando
                await this.loadCommandFile(filePath);
            }
        }
    }

    /*  Carga un archivo de comando individual */

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
            logger.error('CommandManager', `Error cargando ${filePath}:`, error);
        }
    }

    /* Obtiene un comando por nombre o alias */

    getCommand(name: string): Command | undefined {
        // Buscar por nombre exacto
        const command = this.commands.get(name);
        if (command) return command;

        // Buscar por alias (solo en comandos que soporten prefijo)
        return this.commands.find(cmd => {
            if (cmd.type === 'slash-only') return false;
            return 'aliases' in cmd && cmd.aliases?.includes(name);
        });
    }

    /* Verifica si un comando es original (no un wrapper de alias) */
    isOriginalCommand(name: string): boolean {
        return this.originalCommandNames.has(name);
    }

    /* Registra todos los comandos slash en Discord */
    async deployCommands(token: string, clientId: string): Promise<void> {
        // Filtrar solo comandos originales con data (excluir prefix-only y wrappers de aliases)
        const slashCommands = Array.from(this.commands.entries())
            .filter(([name, cmd]) => 
                this.originalCommandNames.has(name) &&
                cmd.type !== 'prefix-only' && 
                'data' in cmd
            )
            .map(([, cmd]) => cmd) as Exclude<Command, PrefixOnlyCommand>[];

        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());

        if (commandsData.length === 0) {
            logger.warn('CommandManager', '⚠️ No hay comandos slash para registrar');
            return;
        }

        logger.info('CommandManager', `🚀 Registrando ${commandsData.length} comandos slash`);

        const rest = new REST().setToken(token)

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData }
        );

        logger.info('CommandManager', '✅ Comandos registrados en Discord');

        const prefixOnlyCount = Array.from(this.commands.values())
            .filter(cmd => cmd.type === 'prefix-only').length;

        if (prefixOnlyCount > 0) {
            logger.info('CommandManager', `ℹ️ ${prefixOnlyCount} comandos solo con prefijo`);
        }
    }

    /* Lista todos los comandos por categoría */

    listCommands(): void {
        const categories = new Map<string, Command[]>();

        /* Agrupar comandos por categoría */

        for (const command of this.commands.values()) {
            const category = command.category;

            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(command);
        }
        logger.info('CommandManager', '\n📋 Comandos disponibles:\n');

        for (const [category, cmds] of categories) {
            logger.info('CommandManager', `\n📁 ${category}:`);
            for (const cmd of cmds) {
                const aliasesStr = (cmd.type !== 'slash-only' && 'aliases' in cmd && cmd.aliases)
                    ? ` (${cmd.aliases.join(', ')})`
                    : '';

                const typeIndicator = cmd.type === 'slash-only' ? '/' :
                    cmd.type === 'prefix-only' ? '!' : '/!';

                logger.info('CommandManager', `  ├─ ${typeIndicator}${cmd.name}${aliasesStr}: ${cmd.description}`);

            }
        }
    }

    /* Obtiene estadísticas de los comandos cargados */
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

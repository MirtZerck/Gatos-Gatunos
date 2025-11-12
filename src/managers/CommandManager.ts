import { Collection, REST, Routes } from "discord.js";
import { Command, PrefixOnlyCommand } from "../types/Command.js";
import { readdirSync, statSync } from "fs";
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CommandManager {
    public commands: Collection<string, Command>;

    constructor() {
        this.commands = new Collection();
    }

    /*  Carga todos los comandos desde las subcarpetas  */

    async loadCommands(): Promise<void> {
        const commandPath = join(__dirname, '../commands');

        await this.loadCommandsFromDirectory(commandPath);

        const categories = new Map<string, string[]>();

        for (const [name, command] of this.commands) {
            const category = command.category || 'Sin categoría';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(name);
        }

        console.log(`${this.commands.size} comandos cargados.`);

        for (const [category, commandNames] of categories) {
            console.log(`📁 ${category}:`);

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

                console.log(`  ├─ ${typeIcon} ${cmdName}${aliases}`);

            }

        }

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
            } else {
                console.log(`  ├─ ⚠️ ${filePath}: Comando inválido`);
            }
        } catch (error) {
            console.error(`  ├─ ❌ Error cargando ${filePath}:`, error);
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

    /* Registra todos los comandos slash en Discord */
    async deployCommands(token: string, clientId: string): Promise<void> {
        // Filtrar solo comandos con data (excluir prefix-only)
        const slashCommands = Array.from(this.commands.values()).filter(
            (cmd): cmd is Exclude<Command, PrefixOnlyCommand> =>
                cmd.type !== 'prefix-only' && 'data' in cmd
        );

        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());

        if (commandsData.length === 0) {
            console.log('⚠️ No hay comandos slash para registrar');
            return;
        }

        console.log(`\n🚀 Registrando ${commandsData.length} comandos slash en Discord...`);

        const rest = new REST().setToken(token)

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData }
        );

        console.log('✅ Comandos slash registrados exitosamente.');

        const prefixOnlyCount = Array.from(this.commands.values())
            .filter(cmd => cmd.type == 'prefix-only').length;

        if (prefixOnlyCount > 0) {
            console.log(`ℹ️ ${prefixOnlyCount} comandos solo con prefijo no se registran en Discord`);

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
        console.log('\n📋 Comandos disponibles:\n');

        for (const [category, cmds] of categories) {
            console.log(`\n📁 ${category}:`);
            for (const cmd of cmds) {
                const aliasesStr = (cmd.type !== 'slash-only' && 'aliases' in cmd && cmd.aliases)
                    ? ` (${cmd.aliases.join(', ')})`
                    : '';

                const typeIndicator = cmd.type === 'slash-only' ? '/' :
                    cmd.type === 'prefix-only' ? '!' : '/!';

                console.log(`  ├─ ${typeIndicator}${cmd.name}${aliasesStr}: ${cmd.description}`);

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

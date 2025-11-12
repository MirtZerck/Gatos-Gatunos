import { Collection, REST, Routes } from "discord.js";
import { Command } from "../types/Command.js";
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

        for (const [category, commands] of categories) {
            console.log(`📁 ${category}:`);
            for (const cmd of commands) {
                const command = this.commands.get(cmd)!;
                console.log(`  ├─ ${cmd}${command.aliases ? ` (${command.aliases.join(', ')})` : ''}`);

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
                await this.loadCommandsFromDirectory(filePath);
            } else if (file.endsWith('.ts') || file.endsWith('js')) {
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

            if (command?.name && (command.execute || command.executeSlash || command.executePrefix)) {
                this.commands.set(command.name, command);
                console.log(`  ├─ ${command.name}${command.aliases ? `(${command.aliases.join(', ')})` : ''}`);
            }
        } catch (error) {
            console.log(`  ├─ ❌ Error cargando ${filePath}:`, error);

        }
    }

    /* Obtiene un comando por nombre o alias */

    getCommand(name: string): Command | undefined {
        return this.commands.get(name) ||
            this.commands.find(cmd => cmd.aliases?.includes(name));
    }
    async deployCommands(token: string, clientId: string): Promise<void> {
        const commandsData = Array.from(this.commands.values())
            .filter(cmd => cmd.data)
            .map(cmd => cmd.data!.toJSON());

        console.log(`Se han registrado ${commandsData.length} comandos en Discord...`);

        const rest = new REST().setToken(token)

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsData }
        );

        console.log('Comandos registrados exitosamente.');
    }

    /* Lista todos los comandos por categoría */

    listCommands(): void {
        const categories = new Map<string, Command[]>();

        /* Agrupar comandos por categoría (primera parte del nombre del archivo) */

        for (const command of this.commands.values()) {
            const category = this.getCategoryFromCommand(command);
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(command);
        }
        console.log('\n Comandos disponibles: ');
        for (const [category, cmds] of categories) {
            console.log(`\n${category}:`);
            for (const cmd of cmds) {
                const aliasesStr = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
                console.log(`  - /${cmd.name}${aliasesStr}: ${cmd.description}`);

            }
        }
    }

    /* Obtiene la categoría de un comando (para organización) */

    private getCategoryFromCommand(command: Command): string {
        /* Se personaliza según la estructura */
        /* Pendiente */

        return 'General';
    }
}

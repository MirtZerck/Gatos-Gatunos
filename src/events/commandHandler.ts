import { Client, Message, CommandInteraction, Events, ChannelType } from "discord.js";
import { CommandHandler, PrefixCommand, DMCommand } from "../types/command.js";
import { prefijo } from "../constants/prefix.js";

export class CommandManager implements CommandHandler {
    prefixCommands: Map<string, PrefixCommand>;
    dmCommands: Map<string, DMCommand>;

    constructor() {
        this.prefixCommands = new Map();
        this.dmCommands = new Map();
    }

    async initialize(client: Client): Promise<void> {
        // Manejar comandos por prefijo
        client.on(Events.MessageCreate, async (message: Message) => {
            if (message.author.bot) return;

            // Manejar mensajes directos
            if (message.channel.type === ChannelType.DM) {
                await this.handleDMCommand(message);
                return;
            }

            // Manejar comandos por prefijo
            if (message.content.startsWith(prefijo)) {
                await this.handlePrefixCommand(message);
            }
        });
    }

    private async handlePrefixCommand(message: Message): Promise<void> {
        const args = message.content.slice(prefijo.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = this.prefixCommands.get(commandName) || 
                       Array.from(this.prefixCommands.values()).find(cmd => 
                           cmd.alias && cmd.alias.includes(commandName)
                       );

        if (!command) return;

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(`Error executing prefix command ${commandName}:`, error);
            await message.reply("Hubo un error al ejecutar el comando.").catch(console.error);
        }
    }

    private async handleDMCommand(message: Message): Promise<void> {
        const command = this.dmCommands.get("dm");
        if (!command) return;

        try {
            await command.execute(message);
        } catch (error) {
            console.error("Error executing DM command:", error);
            await message.reply("Hubo un error al procesar tu mensaje.").catch(console.error);
        }
    }

    registerPrefixCommand(command: PrefixCommand): void {
        this.prefixCommands.set(command.name, command);
    }

    registerDMCommand(command: DMCommand): void {
        this.dmCommands.set(command.name, command);
    }
} 
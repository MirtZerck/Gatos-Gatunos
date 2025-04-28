import { Client, Message, CommandInteraction, Events, ChannelType } from "discord.js";
import { CommandHandler, PrefixCommand, SlashCommand, DMCommand } from "../types/command.js";
import { prefijo } from "../constants/prefix.js";

export class CommandManager implements CommandHandler {
    prefixCommands: Map<string, PrefixCommand>;
    slashCommands: Map<string, SlashCommand>;
    dmCommands: Map<string, DMCommand>;

    constructor() {
        this.prefixCommands = new Map();
        this.slashCommands = new Map();
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

        // Manejar comandos slash
        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isCommand()) return;
            await this.handleSlashCommand(interaction);
        });
    }

    private async handlePrefixCommand(message: Message): Promise<void> {
        const args = message.content.slice(prefijo.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = this.prefixCommands.get(commandName) || 
                       Array.from(this.prefixCommands.values()).find(cmd => 
                           cmd.alias?.includes(commandName)
                       );

        if (!command) return;

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(`Error executing prefix command ${commandName}:`, error);
            await message.reply("Hubo un error al ejecutar el comando.");
        }
    }

    private async handleSlashCommand(interaction: CommandInteraction): Promise<void> {
        const command = this.slashCommands.get(interaction.commandName);

        if (!command) {
            await interaction.reply({ content: "Comando no encontrado", ephemeral: true });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing slash command ${interaction.commandName}:`, error);
            await interaction.reply({ 
                content: "Hubo un error al ejecutar el comando.", 
                ephemeral: true 
            });
        }
    }

    private async handleDMCommand(message: Message): Promise<void> {
        const args = message.content.trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = this.dmCommands.get(commandName);

        if (!command) return;

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(`Error executing DM command ${commandName}:`, error);
            await message.reply("Hubo un error al ejecutar el comando.");
        }
    }

    registerPrefixCommand(command: PrefixCommand): void {
        this.prefixCommands.set(command.name, command);
    }

    registerSlashCommand(command: SlashCommand): void {
        this.slashCommands.set(command.name, command);
    }

    registerDMCommand(command: DMCommand): void {
        this.dmCommands.set(command.name, command);
    }
} 
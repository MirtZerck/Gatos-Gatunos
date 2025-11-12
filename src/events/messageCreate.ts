import { Events, Message } from "discord.js";
import { Event } from "../types/Events.js";
import { config } from "../config.js";

export default {
    name: Events.MessageCreate,

    async execute(client, message: Message) {

        if (message.author.bot) return;

        if (!message.content.startsWith(config.prefix)) return;

        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => {
                if (cmd.type === 'slash-only') return false;
                return 'aliases' in cmd && cmd.aliases?.includes(commandName)
            });

        if (!command) return;

        if (command.type === 'slash-only') {
            await message.reply('❌ Este comando solo funciona como slash command (`/`).')
            return
        }

        try {
            console.log(` ${message.author.displayName} usó ${config.prefix}${commandName}`);

            if (command.type === 'prefix-only') {
                await command.execute(message, args)
            } else if (command.type === 'unified') {
                await command.execute(message, args);
            } else if (command.type === 'hybrid') {
                await command.executePrefix(message, args);
            }
        } catch (error) {
            console.error(`Error ejecutando ${commandName}:`, error);
            await message.reply('Hubo un error al ejecutar este comando.')

        }
    }
} as Event
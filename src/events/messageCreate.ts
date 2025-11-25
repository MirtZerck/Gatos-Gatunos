import { Events, Message } from "discord.js";
import { Event } from "../types/Events.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { BotClient } from "../types/BotClient.js";
import { AnsiFormatter } from "../utils/ansiFormatter.js";

const devFormatMessages = new WeakMap<Message, boolean>();

export function isDevFormatMessage(message: Message): boolean {
    return devFormatMessages.get(message) === true;
}

/**
 * Handler del evento MessageCreate.
 * Procesa comandos con prefijo, verifica cooldowns y ejecuta el comando correspondiente.
 */
export default {
    name: Events.MessageCreate,

    async execute(client: BotClient, message: Message) {
        if (message.author.bot) return;

        let commandContent = message.content;
        let isDevFormat = false;

        const codeBlock = AnsiFormatter.parseCodeBlock(message.content);
        if (codeBlock && codeBlock.language === 'ansi') {
            commandContent = codeBlock.content;
            isDevFormat = true;
            devFormatMessages.set(message, true);

            if (!commandContent.startsWith(config.prefix)) {
                commandContent = config.prefix + commandContent;
            }
        }

        if (!commandContent.startsWith(config.prefix)) return;

        const args = commandContent.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => {
                if (cmd.type === 'slash-only') return false;
                return 'aliases' in cmd && cmd.aliases?.includes(commandName);
            });

        if (!command) return;

        if (command.type === 'slash-only') {
            await message.reply('❌ Este comando solo funciona como slash command (`/`).');
            return;
        }

        if (client.cooldownManager) {
            const cooldownRemaining = client.cooldownManager.getRemainingCooldown(
                command.name,
                message.author.id
            );

            if (cooldownRemaining > 0) {
                const seconds = Math.ceil(cooldownRemaining / 1000);
                const reply = await message.reply(
                    `⏱️ Debes esperar **${seconds}** segundo${seconds !== 1 ? 's' : ''} antes de usar este comando nuevamente.`
                );

                setTimeout(() => {
                    reply.delete().catch(() => { });
                }, 5000);

                return;
            }
        }

        try {
            logger.command(
                'prefix',
                message.author.tag,
                commandName,
                message.guild?.name
            );

            let finalArgs = args;

            if (command.type === 'hybrid' && 'subcommands' in command && command.subcommands) {
                const isSubcommand = command.subcommands.some(sub =>
                    sub.name === commandName || sub.aliases?.includes(commandName)
                );

                if (!isSubcommand && client.commandManager?.isOriginalCommand(command.name)) {
                    const firstArg = args[0]?.toLowerCase();
                    const isFirstArgSubcommand = command.subcommands.some(sub =>
                        sub.name === firstArg || sub.aliases?.includes(firstArg)
                    );

                    if (isFirstArgSubcommand) {
                        return;
                    }
                }

                if (isSubcommand) {
                    const subcommandInfo = command.subcommands.find(sub =>
                        sub.name === commandName || sub.aliases?.includes(commandName)
                    );

                    if (subcommandInfo) {
                        finalArgs = [subcommandInfo.name, ...args];
                    }
                }
            }

            if (command.type === 'prefix-only') {
                await command.execute(message, finalArgs);
            } else if (command.type === 'unified') {
                await command.execute(message, finalArgs);
            } else if (command.type === 'hybrid') {
                await command.executePrefix(message, finalArgs);
            }

            if (client.cooldownManager) {
                client.cooldownManager.setCooldown(
                    command.name,
                    message.author.id
                );
            }
        } catch (error) {
            logger.error('MessageCreate', `Error ejecutando ${commandName}`, error);
            await message.reply('Hubo un error al ejecutar este comando.');
        }
    }
} as Event;

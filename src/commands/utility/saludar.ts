import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from '../../types/Command.js';
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from "../../utils/constants.js";
import { handleCommandError } from "../../utils/errorHandler.js";

export const saludar: Command = {
    type: 'unified',
    name: 'saludar',
    description: 'El bot de saluda.',
    category: CATEGORIES.UTILITY,
    aliases: ['saludo', 'hola'],

    data: new SlashCommandBuilder()
        .setName('saludar')
        .setDescription('El bot te saluda.')
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async execute(context) {
        try {
            const isInteraction = context instanceof ChatInputCommandInteraction;

            const user = isInteraction ? context.user : context.author;
            const saludo = `Hola **${user.displayName}**!`;

            if (isInteraction) {
                await context.reply(saludo);
            } else {
                await context.reply(saludo);
            }
        } catch (error) {
            await handleCommandError(error, context, 'saludad');
        }
    },
};
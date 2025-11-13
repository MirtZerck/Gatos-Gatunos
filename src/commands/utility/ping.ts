import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { UnifiedCommand } from '../../types/Command.js'
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from "../../utils/constants.js";
import { handleCommandError } from "../../utils/errorHandler.js";

export const ping: UnifiedCommand = {
    type: 'unified',
    name: 'ping',
    description: 'Responde con un Pong!',
    category: CATEGORIES.UTILITY,
    aliases: ['p', 'pong'],

    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde con un Pong!')
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async execute(context) {
        try {
            const isInteraction = context instanceof ChatInputCommandInteraction;

            if (isInteraction) {
                await context.reply('🏓 Pong!');
            } else {
                await context.reply('🏓 Pong!');
            }
        } catch (error) {
            const isInteraction = context instanceof ChatInputCommandInteraction;
            await handleCommandError(error, context, 'ping');
        }
    },
};
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from '../../types/Command.js'
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from "../../utils/constants.js";

export const ping: Command = {
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
        const isInteraction = context instanceof ChatInputCommandInteraction;

        if (isInteraction) {
            await context.reply('🏓 Pong!');
        } else {
            await context.reply('🏓 Pong!');
        }
    },
};
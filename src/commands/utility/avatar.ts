import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import { Command } from '../../types/Command.js';
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';

export const avatar: Command = {
    name: 'avatar',
    description: 'Muestra el avatar de un usuario',
    category: CATEGORIES.UTILITY,
    aliases: ['av', 'pfp'],

    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Muestra el avatar de un usuario')
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL)
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario del que quieres ver el avatar')
                .setRequired(false)
        ),

    async executeSlash(interaction: ChatInputCommandInteraction) {

        const user = interaction.options.getUser('usuario') || interaction.user;

        const avatarURL = user.displayAvatarURL({ size: 1024, extension: 'png' });

        await interaction.reply({
            content: `Avatar de **${user.displayName}**:`,
            files: [avatarURL]
        });
    },

    async executePrefix(message: Message, args: string[]) {
        const user = message.mentions.users.first() || message.author;
        const avatarURL = user.displayAvatarURL({ size: 1024, extension: 'png' });

        await message.reply({
            content: `Avatar de *${user.displayName}*`,
            files: [avatarURL]
        });
    }
};

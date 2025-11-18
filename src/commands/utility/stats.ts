import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    MessageFlags,
    User
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { config } from '../../config.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';
import { Validators } from '../../utils/validators.js';

export const stats: HybridCommand = {
    type: 'hybrid',
    name: 'stats',
    description: 'Ver estadísticas de interacciones entre usuarios',
    category: CATEGORIES.UTILITY,
    aliases: ['estadisticas', 'interacciones'],

    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Ver estadísticas de interacciones entre usuarios')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario con quien ver estadísticas (opcional)')
                .setRequired(false)
        )
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();

            const statsManager = (interaction.client as BotClient).interactionStatsManager;

            if (!statsManager) {
                await interaction.editReply({
                    content: '❌ El sistema de estadísticas no está disponible.'
                });
                return;
            }

            const targetUser = interaction.options.getUser('usuario') || null;
            const author = interaction.user;

            if (targetUser) {
                // Estadísticas con un usuario específico
                if (targetUser.id === author.id) {
                    await interaction.editReply({
                        content: '❌ No puedes ver estadísticas contigo mismo.'
                    });
                    return;
                }

                if (targetUser.bot) {
                    await interaction.editReply({
                        content: '❌ No hay estadísticas con bots.'
                    });
                    return;
                }

                await showPairStats(interaction, author, targetUser, statsManager);
            } else {
                // Mostrar información general
                await showGeneralInfo(interaction, statsManager);
            }

        } catch (error) {
            await handleCommandError(error, interaction, 'stats');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const statsManager = (message.client as BotClient).interactionStatsManager;

            if (!statsManager) {
                await message.reply('❌ El sistema de estadísticas no está disponible.');
                return;
            }

            const author = message.author;

            let targetUser: User | null = null;

            if (args.length > 0) {
                // Prioridad 1: Usuario mencionado
                targetUser = message.mentions.users.first() || null;

                // Prioridad 2: Búsqueda manual por ID/nombre
                if (!targetUser) {
                    const foundUser = await UserSearchHelper.findUser(
                        message.guild!,
                        args[0]
                    );

                    if (!foundUser) {
                        await message.reply(
                            `❌ No se encontró al usuario: **${args[0]}**\n\n` +
                            `**Puedes usar:**\n` +
                            `• Mención: \`@User\`\n` +
                            `• Tag: \`User#1234\`\n` +
                            `• ID: \`123456789012345678\`\n` +
                            `• Nombre: \`User\``
                        );
                        return;
                    }

                    targetUser = foundUser;
                }
            }

            if (targetUser) {
                // Validaciones
                try {
                    Validators.validateNotSelf(author, targetUser);
                    Validators.validateNotBot(targetUser);
                } catch (error: any) {
                    await message.reply(error.userMessage || '❌ Validación fallida.');
                    return;
                }

                await showPairStatsPrefix(message, author, targetUser, statsManager);
            } else {
                await showGeneralInfoPrefix(message, statsManager);
            }

        } catch (error) {
            await handleCommandError(error, message, 'stats');
        }
    },
};

// ==================== FUNCIONES AUXILIARES ====================

async function showPairStats(
    interaction: ChatInputCommandInteraction,
    user1: any,
    user2: any,
    statsManager: any
): Promise<void> {
    const description = await statsManager.getStatsDescription(
        user1.id,
        user2.id,
        user1.displayName,
        user2.displayName
    );

    if (!description) {
        await interaction.editReply({
            content: `📊 Aún no hay interacciones entre **${user1.displayName}** y **${user2.displayName}**.`
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('📊 Estadísticas de Interacciones')
        .setDescription(description)
        .setColor(COLORS.INFO)
        .setThumbnail(user2.displayAvatarURL())
        .setFooter({
            text: `Consultado por ${user1.tag}`,
            iconURL: user1.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showPairStatsPrefix(
    message: Message,
    user1: any,
    user2: any,
    statsManager: any
): Promise<void> {
    const description = await statsManager.getStatsDescription(
        user1.id,
        user2.id,
        user1.displayName,
        user2.displayName
    );

    if (!description) {
        await message.reply(
            `📊 Aún no hay interacciones entre **${user1.displayName}** y **${user2.displayName}**.`
        );
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('📊 Estadísticas de Interacciones')
        .setDescription(description)
        .setColor(COLORS.INFO)
        .setThumbnail(user2.displayAvatarURL())
        .setFooter({
            text: `Consultado por ${user1.tag}`,
            iconURL: user1.displayAvatarURL()
        })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function showGeneralInfo(
    interaction: ChatInputCommandInteraction,
    statsManager: any
): Promise<void> {
    const trackedInteractions = statsManager.getTrackedInteractionsList();

    const description =
        '**Estadísticas de Interacciones**\n\n' +
        'Este sistema rastrea interacciones positivas entre usuarios:\n\n' +
        '**Interacciones rastreadas:**\n' +
        trackedInteractions.map((i: any) => `${i.emoji} **${i.name}**`).join(' • ') +
        '\n\n' +
        '💡 **Uso:**\n' +
        '`/stats @usuario` - Ver tus estadísticas con alguien\n' +
        '`/stats` - Ver esta información';

    const embed = new EmbedBuilder()
        .setTitle('📊 Sistema de Estadísticas')
        .setDescription(description)
        .setColor(COLORS.INFO)
        .setFooter({ text: 'Las estadísticas se guardan permanentemente' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showGeneralInfoPrefix(
    message: Message,
    statsManager: any
): Promise<void> {
    const trackedInteractions = statsManager.getTrackedInteractionsList();

    const description =
        '**Estadísticas de Interacciones**\n\n' +
        'Este sistema rastrea interacciones positivas entre usuarios:\n\n' +
        '**Interacciones rastreadas:**\n' +
        trackedInteractions.map((i: any) => `${i.emoji} **${i.name}**`).join(' • ') +
        '\n\n' +
        '💡 **Uso:**\n' +
        `\`${config.prefix}stats @usuario\` - Ver tus estadísticas con alguien\n` +
        `\`${config.prefix}stats\` - Ver esta información`;

    const embed = new EmbedBuilder()
        .setTitle('📊 Sistema de Estadísticas')
        .setDescription(description)
        .setColor(COLORS.INFO)
        .setFooter({ text: 'Las estadísticas se guardan permanentemente' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
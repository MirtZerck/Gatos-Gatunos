import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    User
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { BotClient } from '../../types/BotClient.js';
import { BlockManager } from '../../managers/BlockManager.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';
import { sendMessage, createErrorEmbed, createSuccessEmbed, createInfoEmbed } from '../../utils/messageUtils.js';

export const block: HybridCommand = {
    type: 'hybrid',
    name: 'block',
    description: 'Gestiona bloqueos de interacciones',
    category: CATEGORIES.UTILITY,
    subcommands: [
        { name: 'add', aliases: ['bloquear', 'block', 'addblock'], description: 'Bloquea a un usuario' },
        { name: 'unblock', aliases: ['desbloquear', 'removeblock'], description: 'Desbloquea a un usuario' },
        { name: 'list', aliases: ['bloqueados', 'listblock'], description: 'Lista usuarios bloqueados' },
    ],

    data: new SlashCommandBuilder()
        .setName('block')
        .setDescription('Gestiona bloqueos de interacciones')
        .addSubcommand(sub => sub
            .setName('block')
            .setDescription('Bloquea a un usuario para prevenir interacciones')
            .addUserOption(opt => opt
                .setName('usuario')
                .setDescription('Usuario a bloquear')
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('unblock')
            .setDescription('Desbloquea a un usuario previamente bloqueado')
            .addUserOption(opt => opt
                .setName('usuario')
                .setDescription('Usuario a desbloquear')
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Muestra tu lista de usuarios bloqueados'))
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const blockManager = (interaction.client as BotClient).blockManager;

            if (!blockManager) {
                await interaction.reply({
                    content: '❌ El sistema de bloqueos no está disponible. Firebase no está configurado.',
                    ephemeral: true
                });
                return;
            }

            switch (subcommand) {
                case 'add':
                    await handleBlockSlash(interaction, blockManager);
                    break;
                case 'unblock':
                    await handleUnblockSlash(interaction, blockManager);
                    break;
                case 'list':
                    await handleListSlash(interaction, blockManager);
                    break;
            }

        } catch (error) {
            await handleCommandError(error, interaction, 'block');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase();
            const blockManager = (message.client as BotClient).blockManager;

            if (!blockManager) {
                const embed = createErrorEmbed(
                    '⚙️ Sistema No Disponible',
                    'El sistema de bloqueos no está disponible. Firebase no está configurado.'
                );
                await sendMessage(message, { embed });
                return;
            }

            if (!subcommand) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🚫 Sistema de Bloqueos')
                    .setDescription(
                        `Usa: \`${config.prefix}block <acción> [@usuario]\`\n\n` +
                        `**Acciones disponibles:**`
                    )
                    .addFields(
                        {
                            name: '🚫 block [@usuario]',
                            value: 'Bloquea a un usuario para prevenir interacciones',
                            inline: false
                        },
                        {
                            name: '✅ unblock [@usuario]',
                            value: 'Desbloquea a un usuario previamente bloqueado',
                            inline: false
                        },
                        {
                            name: '📋 list',
                            value: 'Muestra tu lista de usuarios bloqueados',
                            inline: false
                        }
                    )
                    .setColor(COLORS.INFO)
                    .setFooter({ text: 'Los bloqueos previenen que otros usuarios interactúen contigo' });

                await message.reply({ embeds: [helpEmbed] });
                return;
            }

            switch (subcommand) {
                case 'add':
                case 'block':
                case 'bloquear':
                case 'addblock':
                    await handleBlockPrefix(message, args, blockManager);
                    break;
                case 'unblock':
                case 'desbloquear':
                case 'removeblock':
                    await handleUnblockPrefix(message, args, blockManager);
                    break;
                case 'list':
                case 'listblock':
                case 'bloqueados':
                    await handleListPrefix(message, blockManager);
                    break;
                default:
                    await message.reply(`❌ Subcomando no válido: **${subcommand}**`);
            }

        } catch (error) {
            await handleCommandError(error, message, 'block');
        }
    },
};

async function handleBlockSlash(
    interaction: ChatInputCommandInteraction,
    blockManager: BlockManager
): Promise<void> {
    const target = interaction.options.getUser('usuario', true);
    const author = interaction.user;

    try {
        Validators.validateNotSelf(author, target);
        Validators.validateNotBot(target);
    } catch (error) {
        if (error instanceof CommandError) {
            await interaction.reply({
                content: error.userMessage || '❌ Validación fallida',
                ephemeral: true
            });
            return;
        }
        throw error;
    }

    // Verificar si ya está bloqueado
    const alreadyBlocked = await blockManager.isBlocked(author.id, target.id);

    if (alreadyBlocked) {
        await interaction.reply({
            content: `⚠️ Ya has bloqueado a **${target.displayName}**.`,
            ephemeral: true
        });
        return;
    }

    // Bloquear usuario
    const success = await blockManager.blockUser(author.id, target.id);

    if (success) {
        const embed = new EmbedBuilder()
            .setDescription(
                `🚫 Has bloqueado a **${target.displayName}**.\n\n` +
                `Este usuario no podrá interactuar contigo hasta que lo desbloquees.`
            )
            .setColor(COLORS.DANGER)
            .setFooter({ text: `Usa /block unblock @${target.tag} para desbloquear` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        await interaction.reply({
            content: '❌ Hubo un error al bloquear al usuario. Intenta de nuevo.',
            ephemeral: true
        });
    }
}

async function handleUnblockSlash(
    interaction: ChatInputCommandInteraction,
    blockManager: BlockManager
): Promise<void> {
    const target = interaction.options.getUser('usuario', true);
    const author = interaction.user;

    try {
        Validators.validateNotSelf(author, target);
        Validators.validateNotBot(target);
    } catch (error) {
        if (error instanceof CommandError) {
            await interaction.reply({
                content: error.userMessage || '❌ Validación fallida',
                ephemeral: true
            });
            return;
        }
        throw error;
    }

    // Desbloquear usuario
    const success = await blockManager.unblockUser(author.id, target.id);

    if (success) {
        const embed = new EmbedBuilder()
            .setDescription(
                `✅ Has desbloqueado a **${target.displayName}**.\n\n` +
                `Este usuario ahora puede interactuar contigo nuevamente.`
            )
            .setColor(COLORS.SUCCESS)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        await interaction.reply({
            content: `⚠️ **${target.displayName}** no estaba en tu lista de bloqueados.`,
            ephemeral: true
        });
    }
}

async function handleListSlash(
    interaction: ChatInputCommandInteraction,
    blockManager: BlockManager
): Promise<void> {
    const author = interaction.user;
    const blockedUsers = await blockManager.getBlockedUsers(author.id);

    if (blockedUsers.length === 0) {
        await interaction.reply({
            content: '📋 No has bloqueado a ningún usuario.',
            ephemeral: true
        });
        return;
    }

    // Obtener información de usuarios bloqueados
    const userPromises = blockedUsers.map(async (userId: string) => {
        try {
            const user = await interaction.client.users.fetch(userId);
            return `• **${user.tag}** (${user.id})`;
        } catch {
            return `• Usuario desconocido (${userId})`;
        }
    });

    const userList = await Promise.all(userPromises);

    const embed = new EmbedBuilder()
        .setTitle('🚫 Usuarios Bloqueados')
        .setDescription(
            `Has bloqueado a **${blockedUsers.length}** usuario${blockedUsers.length !== 1 ? 's' : ''}:\n\n` +
            userList.join('\n')
        )
        .setColor(COLORS.INFO)
        .setFooter({ text: `Usa /block unblock @usuario para desbloquear` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBlockPrefix(
    message: Message,
    args: string[],
    blockManager: BlockManager
): Promise<void> {
    const query = args[1] || message.mentions.users.first()?.id;

    if (!query) {
        const embed = createErrorEmbed(
            '❌ Usuario Requerido',
            'Menciona a un usuario o usa su ID.'
        );
        await sendMessage(message, { embed });
        return;
    }

    let target: User;

    if (message.guild) {
        const targetMember = await UserSearchHelper.findMember(message.guild, query);
        if (!targetMember) {
            const embed = createErrorEmbed(
                '🔍 Usuario No Encontrado',
                `No se encontró al usuario: **${query}**`
            );
            await sendMessage(message, { embed });
            return;
        }
        target = targetMember.user;
    } else {
        try {
            target = await message.client.users.fetch(query);
        } catch {
            const embed = createErrorEmbed(
                '🔍 Usuario No Encontrado',
                `No se encontró al usuario: **${query}**`
            );
            await sendMessage(message, { embed });
            return;
        }
    }

    try {
        Validators.validateNotSelf(message.author, target);
        Validators.validateNotBot(target);
    } catch (error) {
        if (error instanceof CommandError) {
            const embed = createErrorEmbed(
                '⚠️ Validación Fallida',
                error.userMessage || 'Validación fallida'
            );
            await sendMessage(message, { embed });
            return;
        }
        throw error;
    }

    const alreadyBlocked = await blockManager.isBlocked(message.author.id, target.id);

    if (alreadyBlocked) {
        const embed = createInfoEmbed(
            '⚠️ Ya Bloqueado',
            `Ya has bloqueado a **${target.displayName}**.`
        );
        await sendMessage(message, { embed });
        return;
    }

    const success = await blockManager.blockUser(message.author.id, target.id);

    if (success) {
        const embed = new EmbedBuilder()
            .setDescription(
                `🚫 Has bloqueado a **${target.displayName}**.\n\n` +
                `Este usuario no podrá interactuar contigo hasta que lo desbloquees.`
            )
            .setColor(COLORS.DANGER)
            .setFooter({ text: `Usa ${config.prefix}block unblock @${target.tag} para desbloquear` })
            .setTimestamp();

        await sendMessage(message, { embed });
    } else {
        const embed = createErrorEmbed(
            '❌ Error',
            'Hubo un error al bloquear al usuario. Intenta de nuevo.'
        );
        await sendMessage(message, { embed });
    }
}

async function handleUnblockPrefix(
    message: Message,
    args: string[],
    blockManager: BlockManager
): Promise<void> {
    const query = args[1] || message.mentions.users.first()?.id;

    if (!query) {
        const embed = createErrorEmbed(
            '❌ Usuario Requerido',
            'Menciona a un usuario o usa su ID.'
        );
        await sendMessage(message, { embed });
        return;
    }

    let target: User;

    if (message.guild) {
        const targetMember = await UserSearchHelper.findMember(message.guild, query);
        if (!targetMember) {
            const embed = createErrorEmbed(
                '🔍 Usuario No Encontrado',
                `No se encontró al usuario: **${query}**`
            );
            await sendMessage(message, { embed });
            return;
        }
        target = targetMember.user;
    } else {
        try {
            target = await message.client.users.fetch(query);
        } catch {
            const embed = createErrorEmbed(
                '🔍 Usuario No Encontrado',
                `No se encontró al usuario: **${query}**`
            );
            await sendMessage(message, { embed });
            return;
        }
    }

    try {
        Validators.validateNotSelf(message.author, target);
        Validators.validateNotBot(target);
    } catch (error) {
        if (error instanceof CommandError) {
            const embed = createErrorEmbed(
                '⚠️ Validación Fallida',
                error.userMessage || 'Validación fallida'
            );
            await sendMessage(message, { embed });
            return;
        }
        throw error;
    }

    const success = await blockManager.unblockUser(message.author.id, target.id);

    if (success) {
        const embed = new EmbedBuilder()
            .setDescription(
                `✅ Has desbloqueado a **${target.displayName}**.\n\n` +
                `Este usuario ahora puede interactuar contigo nuevamente.`
            )
            .setColor(COLORS.SUCCESS)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    } else {
        await message.reply(`⚠️ **${target.displayName}** no estaba en tu lista de bloqueados.`);
    }
}

async function handleListPrefix(
    message: Message,
    blockManager: BlockManager
): Promise<void> {
    const author = message.author;
    const blockedUsers = await blockManager.getBlockedUsers(author.id);

    if (blockedUsers.length === 0) {
        await message.reply('📋 No has bloqueado a ningún usuario.');
        return;
    }

    const userPromises = blockedUsers.map(async (userId: string) => {
        try {
            const user = await message.client.users.fetch(userId);
            return `• **${user.tag}** (${user.id})`;
        } catch {
            return `• Usuario desconocido (${userId})`;
        }
    });

    const userList = await Promise.all(userPromises);

    const embed = new EmbedBuilder()
        .setTitle('🚫 Usuarios Bloqueados')
        .setDescription(
            `Has bloqueado a **${blockedUsers.length}** usuario${blockedUsers.length !== 1 ? 's' : ''}:\n\n` +
            userList.join('\n')
        )
        .setColor(COLORS.INFO)
        .setFooter({ text: `Usa ${config.prefix}block unblock @usuario para desbloquear` })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

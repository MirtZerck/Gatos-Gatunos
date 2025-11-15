import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { config } from '../../config.js';
import { Validators } from '../../utils/validators.js';

export const utility: HybridCommand = {
    type: 'hybrid',
    name: 'utility',
    description: 'Comandos de utilidad del bot',
    category: CATEGORIES.UTILITY,
    subcommands: [
        { name: 'ping', aliases: ['p', 'pong'], description: 'Responde con Pong!' },
        { name: 'avatar', aliases: ['av', 'pfp'], description: 'Muestra el avatar de un usuario' },
        { name: 'saludar', aliases: ['saludo', 'hola'], description: 'El bot te saluda' },
        { name: 'cooldown', aliases: [], description: 'Gestiona cooldowns (solo admins)' },
    ],

    data: new SlashCommandBuilder()
        .setName('utility')
        .setDescription('Comandos de utilidad del bot')

        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Responde con un Pong!')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Muestra el avatar de un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('El usuario del que quieres ver el avatar')
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('saludar')
                .setDescription('El bot te saluda')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown-stats')
                .setDescription('Muestra estadísticas del sistema de cooldowns (admin)')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown-clear')
                .setDescription('Limpia cooldowns (admin)')
                .addStringOption(option =>
                    option
                        .setName('comando')
                        .setDescription('Comando específico a limpiar (vacío = todos)')
                        .setRequired(false)
                )
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario específico a limpiar')
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown-check')
                .setDescription('Verifica el cooldown de un usuario (admin)')
                .addStringOption(option =>
                    option
                        .setName('comando')
                        .setDescription('Nombre del comando')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a verificar')
                        .setRequired(true)
                )
        )

        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'ping':
                    await handlePing(interaction);
                    break;
                case 'avatar':
                    await handleAvatar(interaction);
                    break;
                case 'saludar':
                    await handleSaludar(interaction);
                    break;
                case 'cooldown-stats':
                    await handleCooldownStats(interaction);
                    break;
                case 'cooldown-clear':
                    await handleCooldownClear(interaction);
                    break;
                case 'cooldown-check':
                    await handleCooldownCheck(interaction);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'utility');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase();

            if (!subcommand) {
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}utility <subcomando>\` o usa los aliases directamente\n\n` +
                    `**Subcomandos disponibles:**\n` +
                    `• \`ping\` (\`p\`, \`pong\`) - Responde con Pong!\n` +
                    `• \`avatar\` (\`av\`, \`pfp\`) [@usuario] - Muestra avatar\n` +
                    `• \`saludar\` (\`saludo\`, \`hola\`) - El bot te saluda\n` +
                    `• \`cooldown\` - Gestiona cooldowns (admin)`
                );
                return;
            }

            switch (subcommand) {
                case 'ping':
                    await handlePingPrefix(message);
                    break;
                case 'avatar':
                    await handleAvatarPrefix(message, args.slice(1));
                    break;
                case 'saludar':
                    await handleSaludarPrefix(message);
                    break;
                case 'cooldown':
                    await handleCooldownPrefix(message, args.slice(1));
                    break;
                default:
                    await message.reply(`❌ Subcomando no válido: **${subcommand}**`);
            }
        } catch (error) {
            await handleCommandError(error, message, 'utility');
        }
    },
};

async function handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('🏓 Pong!');
}

async function handleAvatar(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const avatarURL = user.displayAvatarURL({ size: 1024, extension: 'png' });

    await interaction.reply({
        content: `Avatar de **${user.displayName}**:`,
        files: [avatarURL]
    });
}

async function handleSaludar(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.user;
    await interaction.reply(`¡Hola **${user.displayName}**!`);
}

async function handleCooldownStats(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.memberPermissions && !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Necesitas permisos de **Administrador** para usar este comando.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const cooldownManager = (interaction.client as BotClient).cooldownManager;
    if (!cooldownManager) {
        await interaction.reply({
            content: '❌ El sistema de cooldowns no está disponible.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const stats = cooldownManager.getStats();

    const embed = new EmbedBuilder()
        .setTitle('📊 Estadísticas de Cooldowns')
        .setColor(COLORS.INFO)
        .addFields(
            {
                name: '⏱️ Cooldowns Activos',
                value: stats.totalCooldowns.toString(),
                inline: true
            },
            {
                name: '📝 Comandos con Cooldown',
                value: stats.commandsWithCooldowns.toString(),
                inline: true
            },
            {
                name: '⚙️ Comandos Configurados',
                value: stats.configuredCommands.toString(),
                inline: true
            }
        )
        .setFooter({ text: 'Los cooldowns se limpian automáticamente cada minuto' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleCooldownClear(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.memberPermissions && !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Necesitas permisos de **Administrador** para usar este comando.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const cooldownManager = (interaction.client as BotClient).cooldownManager;
    if (!cooldownManager) {
        await interaction.reply({
            content: '❌ El sistema de cooldowns no está disponible.',
            ephemeral: true
        });
        return;
    }

    const commandName = interaction.options.getString('comando');
    const user = interaction.options.getUser('usuario');

    if (user) {
        Validators.validateNotBot(user);
    }

    let clearedCount = 0;
    let message = '';

    if (commandName && user) {
        const cleared = cooldownManager.clearCooldown(commandName, user.id);
        clearedCount = cleared ? 1 : 0;
        message = cleared
            ? `✅ Cooldown de **${commandName}** limpiado para ${user.tag}`
            : `ℹ️ ${user.tag} no tenía cooldown activo para **${commandName}**`;
    } else if (commandName) {
        clearedCount = cooldownManager.clearCommandCooldowns(commandName);
        message = `✅ ${clearedCount} cooldown${clearedCount !== 1 ? 's' : ''} limpiado${clearedCount !== 1 ? 's' : ''} para **${commandName}**`;
    } else if (user) {
        const allCommands = (interaction.client as BotClient).commands.keys();
        for (const cmd of allCommands) {
            if (cooldownManager.clearCooldown(cmd, user.id)) {
                clearedCount++;
            }
        }
        message = `✅ ${clearedCount} cooldown${clearedCount !== 1 ? 's' : ''} limpiado${clearedCount !== 1 ? 's' : ''} para ${user.tag}`;
    } else {
        clearedCount = cooldownManager.clearAllCooldowns();
        message = `✅ Todos los cooldowns limpiados (${clearedCount} en total)`;
    }

    const embed = new EmbedBuilder()
        .setTitle('🧹 Cooldowns Limpiados')
        .setDescription(message)
        .setColor(COLORS.SUCCESS)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCooldownCheck(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.memberPermissions && !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Necesitas permisos de **Administrador** para usar este comando.',
            ephemeral: true
        });
        return;
    }

    const cooldownManager = (interaction.client as BotClient).cooldownManager;
    if (!cooldownManager) {
        await interaction.reply({
            content: '❌ El sistema de cooldowns no está disponible.',
            ephemeral: true
        });
        return;
    }

    const commandName = interaction.options.getString('comando', true);
    const user = interaction.options.getUser('usuario', true);

    Validators.validateNotBot(user);

    const remaining = cooldownManager.getRemainingCooldown(commandName, user.id);

    const embed = new EmbedBuilder()
        .setTitle('🔍 Verificación de Cooldown')
        .setColor(remaining > 0 ? COLORS.WARNING : COLORS.SUCCESS)
        .addFields(
            {
                name: '👤 Usuario',
                value: user.tag,
                inline: true
            },
            {
                name: '📝 Comando',
                value: commandName,
                inline: true
            },
            {
                name: '⏱️ Estado',
                value: remaining > 0
                    ? `En cooldown (${Math.ceil(remaining / 1000)}s restantes)`
                    : 'Puede usar el comando',
                inline: false
            }
        )
        .setTimestamp();

    const info = cooldownManager.getCooldownInfo(commandName, user.id);
    if (info) {
        embed.addFields({
            name: '⏰ Expira',
            value: `<t:${Math.floor(info.expiresAt / 1000)}:R>`,
            inline: true
        });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}


async function handlePingPrefix(message: Message): Promise<void> {
    await message.reply('🏓 Pong!');
}

async function handleAvatarPrefix(message: Message, args: string[]): Promise<void> {
    const user = message.mentions.users.first() || message.author;
    const avatarURL = user.displayAvatarURL({ size: 1024, extension: 'png' });

    await message.reply({
        content: `Avatar de **${user.displayName}**:`,
        files: [avatarURL]
    });
}

async function handleSaludarPrefix(message: Message): Promise<void> {
    await message.reply(`¡Hola **${message.author.displayName}**!`);
}

async function handleCooldownPrefix(message: Message, args: string[]): Promise<void> {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ Necesitas permisos de **Administrador** para usar este comando.');
        return;
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}cooldown <stats|clear|check>\`\n\n` +
            `**Subcomandos:**\n` +
            `• \`stats\` - Ver estadísticas\n` +
            `• \`clear [comando] [@usuario]\` - Limpiar cooldowns\n` +
            `• \`check <comando> @usuario\` - Verificar cooldown`
        );
        return;
    }

    if (subcommand === 'stats') {
        const cooldownManager = (message.client as BotClient).cooldownManager;
        if (!cooldownManager) {
            await message.reply('❌ El sistema de cooldowns no está disponible.');
            return;
        }

        const stats = cooldownManager.getStats();
        await message.reply(
            `📊 **Estadísticas de Cooldowns**\n\n` +
            `⏱️ Cooldowns Activos: **${stats.totalCooldowns}**\n` +
            `📝 Comandos con Cooldown: **${stats.commandsWithCooldowns}**\n` +
            `⚙️ Comandos Configurados: **${stats.configuredCommands}**`
        );
    } else {
        await message.reply('ℹ️ Para funciones avanzadas de cooldown, usa el comando slash: `/utility cooldown-*`');
    }
}
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags,
    User
} from 'discord.js';
import moment from 'moment-timezone';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError, CommandError } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { config } from '../../config.js';
import { Validators } from '../../utils/validators.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';
import { InteractionStatsManager } from '../../managers/InteractionStatsManager.js';

export const utility: HybridCommand = {
    type: 'hybrid',
    name: 'utility',
    description: 'Comandos de utilidad del bot',
    category: CATEGORIES.UTILITY,
    subcommands: [
        { name: 'ping', aliases: ['pong'], description: 'Responde con Pong!' },
        { name: 'stats', aliases: ['estadisticas', 'interacciones'], description: 'Ver estadísticas de interacciones' },
        { name: 'cooldown', aliases: [], description: 'Gestiona cooldowns (solo admins)' },
        { name: 'hora', aliases: ['time', 'tiempo'], description: 'Muestra la hora actual' },
        { name: 'horaserver', aliases: ['hs', 'hour'], description: 'Muestra la hora del servidor' },
        { name: 'sethour', aliases: ['sh', 'sethora'], description: 'Establece la hora del servidor (solo admins)' },
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
                .setName('stats')
                .setDescription('Ver estadísticas de interacciones entre usuarios')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario con quien ver estadísticas (opcional)')
                        .setRequired(false)
                )
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

        .addSubcommand(subcommand =>
            subcommand
                .setName('hora')
                .setDescription('Muestra la hora actual')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('horaserver')
                .setDescription('Muestra la hora del servidor configurada')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('sethour')
                .setDescription('Establece la zona horaria del servidor (solo admins)')
                .addStringOption(option =>
                    option
                        .setName('timezone')
                        .setDescription('Zona horaria (ej: America/Bogota, Europe/Madrid)')
                        .setRequired(true)
                )
        )

        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'stats') {
                await interaction.deferReply();
            }

            switch (subcommand) {
                case 'ping':
                    await handlePing(interaction);
                    break;
                case 'stats':
                    await handleStatsSlash(interaction);
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
                case 'hora':
                    await handleHora(interaction);
                    break;
                case 'horaserver':
                    await handleHoraServer(interaction);
                    break;
                case 'sethour':
                    await handleSetHour(interaction);
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
                    `• \`stats\` (\`estadisticas\`, \`interacciones\`) [@usuario] - Ver estadísticas\n` +
                    `• \`cooldown\` - Gestiona cooldowns (admin)\n` +
                    `• \`hora\` (\`time\`, \`tiempo\`) - Muestra la hora actual\n` +
                    `• \`horaserver\` (\`hs\`, \`hour\`) - Muestra la hora del servidor\n` +
                    `• \`sethour\` (\`sh\`, \`sethora\`) <timezone> - Establece zona horaria (admin)`
                );
                return;
            }

            switch (subcommand) {
                case 'ping':
                    await handlePingPrefix(message);
                    break;
                case 'stats':
                    await handleStatsPrefix(message, args.slice(1));
                    break;
                case 'cooldown':
                    await handleCooldownPrefix(message, args.slice(1));
                    break;
                case 'hora':
                    await handleHoraPrefix(message);
                    break;
                case 'horaserver':
                    await handleHoraServerPrefix(message);
                    break;
                case 'sethour':
                    await handleSetHourPrefix(message, args.slice(1));
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
    const sent = await interaction.reply({ content: '🏓 Calculando latencia...', fetchReply: true });

    const wsLatency = interaction.client.ws.ping;
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

    const getLatencyColor = (latency: number): number => {
        if (latency < 100) return COLORS.SUCCESS;
        if (latency < 200) return COLORS.WARNING;
        return COLORS.DANGER;
    };

    const getLatencyEmoji = (latency: number): string => {
        if (latency < 100) return '🟢';
        if (latency < 200) return '🟡';
        return '🔴';
    };

    const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(getLatencyColor(Math.max(wsLatency, apiLatency)))
        .addFields(
            {
                name: '📡 Latencia del WebSocket',
                value: `${getLatencyEmoji(wsLatency)} \`${wsLatency}ms\``,
                inline: true
            },
            {
                name: '⚡ Latencia de la API',
                value: `${getLatencyEmoji(apiLatency)} \`${apiLatency}ms\``,
                inline: true
            }
        )
        .setFooter({ text: '🟢 Excelente (<100ms) | 🟡 Buena (<200ms) | 🔴 Alta (>200ms)' })
        .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
}

async function handlePingPrefix(message: Message): Promise<void> {
    const sent = await message.reply('🏓 Calculando latencia...');

    const wsLatency = message.client.ws.ping;
    const apiLatency = sent.createdTimestamp - message.createdTimestamp;

    const getLatencyColor = (latency: number): number => {
        if (latency < 100) return COLORS.SUCCESS;
        if (latency < 200) return COLORS.WARNING;
        return COLORS.DANGER;
    };

    const getLatencyEmoji = (latency: number): string => {
        if (latency < 100) return '🟢';
        if (latency < 200) return '🟡';
        return '🔴';
    };

    const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(getLatencyColor(Math.max(wsLatency, apiLatency)))
        .addFields(
            {
                name: '📡 Latencia del WebSocket',
                value: `${getLatencyEmoji(wsLatency)} \`${wsLatency}ms\``,
                inline: true
            },
            {
                name: '⚡ Latencia de la API',
                value: `${getLatencyEmoji(apiLatency)} \`${apiLatency}ms\``,
                inline: true
            }
        )
        .setFooter({ text: '🟢 Excelente (<100ms) | 🟡 Buena (<200ms) | 🔴 Alta (>200ms)' })
        .setTimestamp();

    await sent.edit({ content: '', embeds: [embed] });
}

async function handleStatsSlash(interaction: ChatInputCommandInteraction): Promise<void> {
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
        await showGeneralInfo(interaction, statsManager);
    }
}

async function handleStatsPrefix(message: Message, args: string[]): Promise<void> {
    const statsManager = (message.client as BotClient).interactionStatsManager;

    if (!statsManager) {
        await message.reply('❌ El sistema de estadísticas no está disponible.');
        return;
    }

    const author = message.author;
    let targetUser: User | null = null;

    if (args.length > 0) {
        targetUser = message.mentions.users.first() || null;

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
        try {
            Validators.validateNotSelf(author, targetUser);
            Validators.validateNotBot(targetUser);
        } catch (error) {
            const errorMessage = error instanceof CommandError ? (error.userMessage ?? '❌ Validación fallida.') : '❌ Validación fallida.';
            await message.reply(errorMessage);
            return;
        }

        await showPairStatsPrefix(message, author, targetUser, statsManager);
    } else {
        await showGeneralInfoPrefix(message, statsManager);
    }
}

async function showPairStats(
    interaction: ChatInputCommandInteraction,
    user1: User,
    user2: User,
    statsManager: InteractionStatsManager
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
    user1: User,
    user2: User,
    statsManager: InteractionStatsManager
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

interface TrackedInteraction {
    type: string;
    emoji: string;
    name: string;
}

async function showGeneralInfo(
    interaction: ChatInputCommandInteraction,
    statsManager: InteractionStatsManager
): Promise<void> {
    const trackedInteractions = statsManager.getTrackedInteractionsList();

    const description =
        '**Estadísticas de Interacciones**\n\n' +
        'Este sistema rastrea interacciones positivas entre usuarios:\n\n' +
        '**Interacciones rastreadas:**\n' +
        trackedInteractions.map((i: TrackedInteraction) => `${i.emoji} **${i.name}**`).join(' • ') +
        '\n\n' +
        '💡 **Uso:**\n' +
        '`/utility stats @usuario` - Ver tus estadísticas con alguien\n' +
        '`/utility stats` - Ver esta información';

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
    statsManager: InteractionStatsManager
): Promise<void> {
    const trackedInteractions = statsManager.getTrackedInteractionsList();

    const description =
        '**Estadísticas de Interacciones**\n\n' +
        'Este sistema rastrea interacciones positivas entre usuarios:\n\n' +
        '**Interacciones rastreadas:**\n' +
        trackedInteractions.map((i: TrackedInteraction) => `${i.emoji} **${i.name}**`).join(' • ') +
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
            flags: MessageFlags.Ephemeral
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

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleCooldownCheck(interaction: ChatInputCommandInteraction): Promise<void> {
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

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

async function getServerTimezone(client: BotClient, guildId: string): Promise<string | null> {
    try {
        const firebaseManager = client.firebaseAdminManager;
        if (!firebaseManager) {
            return null;
        }

        const ref = firebaseManager.getRef(`servers/${guildId}/timezone`);
        const snapshot = await ref.get();

        if (snapshot.exists()) {
            return snapshot.val() as string;
        }

        return null;
    } catch (error) {
        console.error('Error obteniendo timezone del servidor:', error);
        return null;
    }
}

async function setServerTimezone(client: BotClient, guildId: string, timezone: string): Promise<boolean> {
    try {
        const firebaseManager = client.firebaseAdminManager;
        if (!firebaseManager) {
            return false;
        }

        const ref = firebaseManager.getRef(`servers/${guildId}/timezone`);
        await ref.set(timezone);

        return true;
    } catch (error) {
        console.error('Error guardando timezone del servidor:', error);
        return false;
    }
}

async function handleHora(interaction: ChatInputCommandInteraction): Promise<void> {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const embed = new EmbedBuilder()
        .setTitle('🕐 Hora Actual')
        .setDescription(`**${timeString}**\n${dateString.charAt(0).toUpperCase() + dateString.slice(1)}`)
        .setColor(COLORS.INFO)
        .addFields({
            name: '📅 Timestamp',
            value: `<t:${Math.floor(now.getTime() / 1000)}:F>`,
            inline: false
        })
        .setFooter({ text: 'Hora del sistema del bot' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleHoraPrefix(message: Message): Promise<void> {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const embed = new EmbedBuilder()
        .setTitle('🕐 Hora Actual')
        .setDescription(`**${timeString}**\n${dateString.charAt(0).toUpperCase() + dateString.slice(1)}`)
        .setColor(COLORS.INFO)
        .addFields({
            name: '📅 Timestamp',
            value: `<t:${Math.floor(now.getTime() / 1000)}:F>`,
            inline: false
        })
        .setFooter({ text: 'Hora del sistema del bot' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleHoraServer(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
        await interaction.reply({
            content: '❌ Este comando solo puede usarse en un servidor.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const timezone = await getServerTimezone(interaction.client as BotClient, interaction.guildId);

    if (!timezone) {
        await interaction.reply({
            content: '❌ Un moderador debe establecer la zona horaria del servidor con el comando `/utility sethour`.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const now = moment().tz(timezone);
    const timeString = now.format('HH:mm:ss');
    const dateString = now.format('dddd, D [de] MMMM [de] YYYY');

    const embed = new EmbedBuilder()
        .setTitle('🌍 Hora del Servidor')
        .setDescription(`**${timeString}**\n${dateString.charAt(0).toUpperCase() + dateString.slice(1)}`)
        .setColor(COLORS.INFO)
        .addFields(
            {
                name: '🌐 Zona Horaria',
                value: `\`${timezone}\``,
                inline: true
            },
            {
                name: '📅 Timestamp',
                value: `<t:${now.unix()}:F>`,
                inline: false
            }
        )
        .setFooter({ text: `Zona horaria configurada del servidor` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleHoraServerPrefix(message: Message): Promise<void> {
    if (!message.guildId) {
        await message.reply('❌ Este comando solo puede usarse en un servidor.');
        return;
    }

    const timezone = await getServerTimezone(message.client as BotClient, message.guildId);

    if (!timezone) {
        await message.reply(
            `❌ Un moderador debe establecer la zona horaria del servidor con el comando \`${config.prefix}sethour <timezone>\`.`
        );
        return;
    }

    const now = moment().tz(timezone);
    const timeString = now.format('HH:mm:ss');
    const dateString = now.format('dddd, D [de] MMMM [de] YYYY');

    const embed = new EmbedBuilder()
        .setTitle('🌍 Hora del Servidor')
        .setDescription(`**${timeString}**\n${dateString.charAt(0).toUpperCase() + dateString.slice(1)}`)
        .setColor(COLORS.INFO)
        .addFields(
            {
                name: '🌐 Zona Horaria',
                value: `\`${timezone}\``,
                inline: true
            },
            {
                name: '📅 Timestamp',
                value: `<t:${now.unix()}:F>`,
                inline: false
            }
        )
        .setFooter({ text: `Zona horaria configurada del servidor` })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleSetHour(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
        await interaction.reply({
            content: '❌ Este comando solo puede usarse en un servidor.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (interaction.memberPermissions && !interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({
            content: '❌ Necesitas permisos de **Gestionar Mensajes** para usar este comando.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const timezone = interaction.options.getString('timezone', true);

    if (!moment.tz.zone(timezone)) {
        await interaction.reply({
            content: `❌ La zona horaria **${timezone}** no es válida.\n\n` +
                `**Ejemplos válidos:**\n` +
                `• \`America/Bogota\`\n` +
                `• \`Europe/Madrid\`\n` +
                `• \`America/Mexico_City\`\n` +
                `• \`Asia/Tokyo\`\n\n` +
                `Ver lista completa: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const success = await setServerTimezone(interaction.client as BotClient, interaction.guildId, timezone);

    if (success) {
        const now = moment().tz(timezone);
        const timeString = now.format('HH:mm:ss');
        const dateString = now.format('dddd, D [de] MMMM [de] YYYY');

        const embed = new EmbedBuilder()
            .setTitle('✅ Zona Horaria Configurada')
            .setDescription(`Se ha establecido la zona horaria del servidor correctamente.`)
            .setColor(COLORS.SUCCESS)
            .addFields(
                {
                    name: '🌐 Zona Horaria',
                    value: `\`${timezone}\``,
                    inline: true
                },
                {
                    name: '🕐 Hora Actual',
                    value: `**${timeString}**`,
                    inline: true
                },
                {
                    name: '📅 Fecha',
                    value: dateString.charAt(0).toUpperCase() + dateString.slice(1),
                    inline: false
                }
            )
            .setFooter({ text: `Ahora puedes usar /utility horaserver para ver la hora` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({
            content: '❌ Ocurrió un error al guardar la configuración. Verifica que Firebase esté configurado correctamente.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleSetHourPrefix(message: Message, args: string[]): Promise<void> {
    if (!message.guildId) {
        await message.reply('❌ Este comando solo puede usarse en un servidor.');
        return;
    }

    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply('❌ Necesitas permisos de **Gestionar Mensajes** para usar este comando.');
        return;
    }

    if (args.length !== 1) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}sethour <timezone>\`\n\n` +
            `**Ejemplos:**\n` +
            `• \`${config.prefix}sethour America/Bogota\`\n` +
            `• \`${config.prefix}sethour Europe/Madrid\`\n\n` +
            `Ver lista completa: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`
        );
        return;
    }

    const timezone = args[0];

    if (!moment.tz.zone(timezone)) {
        await message.reply(
            `❌ La zona horaria **${timezone}** no es válida.\n\n` +
            `**Ejemplos válidos:**\n` +
            `• \`America/Bogota\`\n` +
            `• \`Europe/Madrid\`\n` +
            `• \`America/Mexico_City\`\n` +
            `• \`Asia/Tokyo\`\n\n` +
            `Ver lista completa: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`
        );
        return;
    }

    const success = await setServerTimezone(message.client as BotClient, message.guildId, timezone);

    if (success) {
        const now = moment().tz(timezone);
        const timeString = now.format('HH:mm:ss');
        const dateString = now.format('dddd, D [de] MMMM [de] YYYY');

        const embed = new EmbedBuilder()
            .setTitle('✅ Zona Horaria Configurada')
            .setDescription(`Se ha establecido la zona horaria del servidor correctamente.`)
            .setColor(COLORS.SUCCESS)
            .addFields(
                {
                    name: '🌐 Zona Horaria',
                    value: `\`${timezone}\``,
                    inline: true
                },
                {
                    name: '🕐 Hora Actual',
                    value: `**${timeString}**`,
                    inline: true
                },
                {
                    name: '📅 Fecha',
                    value: dateString.charAt(0).toUpperCase() + dateString.slice(1),
                    inline: false
                }
            )
            .setFooter({ text: `Ahora puedes usar ${config.prefix}horaserver para ver la hora` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    } else {
        await message.reply('❌ Ocurrió un error al guardar la configuración. Verifica que Firebase esté configurado correctamente.');
    }
}

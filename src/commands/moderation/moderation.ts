// src/commands/moderation/moderation.ts
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    GuildMember,
    Message
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CONTEXTS, INTEGRATION_TYPES, CATEGORIES, COLORS, EMOJIS } from '../../utils/constants.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';
import { config } from '../../config.js';

export const moderation: HybridCommand = {
    type: 'hybrid',
    name: 'moderation',
    description: 'Comandos de moderación del servidor',
    category: CATEGORIES.MODERATION,
    subcommands: [
        { name: 'kick', aliases: ['expulsar'], description: 'Expulsa un usuario' },
        { name: 'ban', aliases: ['banear'], description: 'Banea un usuario' },
        { name: 'timeout', aliases: ['silenciar', 'mute'], description: 'Silencia temporalmente' },
    ],

    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Comandos de moderación del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Expulsa a un usuario del servidor')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a expulsar')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón de la expulsión')
                        .setRequired(false)
                        .setMaxLength(512)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Banea a un usuario del servidor')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a banear')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón del baneo')
                        .setRequired(false)
                        .setMaxLength(512)
                )
                .addIntegerOption(option =>
                    option
                        .setName('borrar_mensajes')
                        .setDescription('Días de mensajes a borrar (0-7)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(7)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Silencia temporalmente a un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a silenciar')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duracion')
                        .setDescription('Duración en minutos')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón del timeout')
                        .setRequired(false)
                        .setMaxLength(512)
                )
        )
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            // ✅ PASO 1: Verificación SÍNCRONA de servidor
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Este comando solo funciona en servidores.',
                    ephemeral: true
                });
                return;
            }

            // ✅ PASO 2: Obtener datos (SÍNCRONO)
            const subcommand = interaction.options.getSubcommand();

            // ✅ PASO 3: DEFER INMEDIATO (antes de validaciones asíncronas)
            await interaction.deferReply();

            // ✅ PASO 4: Ejecutar comando correspondiente (ya tenemos 15 minutos)
            switch (subcommand) {
                case 'kick':
                    await handleKickSlash(interaction);
                    break;
                case 'ban':
                    await handleBanSlash(interaction);
                    break;
                case 'timeout':
                    await handleTimeoutSlash(interaction);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'moderation');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            Validators.validateInGuild(message);
            const subcommand = args[0]?.toLowerCase();
            const validSubcommands = ['kick', 'ban', 'timeout', 'expulsar', 'banear', 'silenciar', 'mute'];

            if (!subcommand || !validSubcommands.includes(subcommand)) {
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}moderation <acción> <usuario> [opciones]\`\n\n` +
                    `**Acciones disponibles:**\n` +
                    `• \`kick\` (\`expulsar\`) <usuario> [razón] - Expulsar usuario\n` +
                    `• \`ban\` (\`banear\`) <usuario> [días] [razón] - Banear usuario\n` +
                    `• \`timeout\` (\`silenciar\`, \`mute\`) <usuario> <minutos> [razón] - Silenciar temporalmente\n\n` +
                    `**Ejemplos:**\n` +
                    `\`${config.prefix}kick @User spam\`\n` +
                    `\`${config.prefix}ban User#1234 7 toxicidad\`\n` +
                    `\`${config.prefix}timeout 123456789 30 flood\``
                );
                return;
            }

            // Mapear aliases
            const commandMap: Record<string, string> = {
                'expulsar': 'kick',
                'banear': 'ban',
                'silenciar': 'timeout',
                'mute': 'timeout'
            };

            const normalizedCommand = commandMap[subcommand] || subcommand;

            switch (normalizedCommand) {
                case 'kick':
                    await handleKickPrefix(message, args.slice(1));
                    break;
                case 'ban':
                    await handleBanPrefix(message, args.slice(1));
                    break;
                case 'timeout':
                    await handleTimeoutPrefix(message, args.slice(1));
                    break;
            }
        } catch (error) {
            await handleCommandError(error, message, 'moderation');
        }
    },
};

// ==================== HANDLERS PARA SLASH COMMANDS ====================

async function handleKickSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    await executeKick(interaction, target, reason);
}

async function handleBanSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const deleteMessageDays = interaction.options.getInteger('borrar_mensajes') || 0;
    await executeBan(interaction, target, reason, deleteMessageDays);
}

async function handleTimeoutSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const duration = interaction.options.getInteger('duracion', true);
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    await executeTimeout(interaction, target, duration, reason);
}

// ==================== HANDLERS PARA PREFIX COMMANDS ====================

async function handleKickPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}kick <usuario> [razón]\`\n\n` +
            `**Ejemplos:**\n` +
            `\`${config.prefix}kick @User spam\`\n` +
            `\`${config.prefix}kick User#1234 comportamiento inapropiado\`\n` +
            `\`${config.prefix}kick 123456789012345678 flood\``
        );
        return;
    }

    // ✅ Buscar miembro con UserSearchHelper
    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
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

    // Determinar índice de inicio de razón
    const reasonStartIndex = message.mentions.members?.first() ? 1 : 1;
    const reason = args.slice(reasonStartIndex).join(' ') || 'Sin razón especificada';

    await executeKick(message, target, reason);
}

async function handleBanPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}ban <usuario> [días] [razón]\`\n\n` +
            `**Ejemplos:**\n` +
            `\`${config.prefix}ban @User 7 toxicidad\`\n` +
            `\`${config.prefix}ban User#1234 comportamiento grave\`\n` +
            `\`${config.prefix}ban 123456789012345678 0 spam\``
        );
        return;
    }

    // ✅ Buscar miembro con UserSearchHelper
    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
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

    let deleteMessageDays = 0;
    let reasonStartIndex = message.mentions.members?.first() ? 1 : 1;

    // Verificar si el siguiente arg es un número (días)
    if (args[reasonStartIndex] && !isNaN(parseInt(args[reasonStartIndex]))) {
        deleteMessageDays = Math.min(Math.max(parseInt(args[reasonStartIndex]), 0), 7);
        reasonStartIndex++;
    }

    const reason = args.slice(reasonStartIndex).join(' ') || 'Sin razón especificada';
    await executeBan(message, target, reason, deleteMessageDays);
}

async function handleTimeoutPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length < 2) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}timeout <usuario> <minutos> [razón]\`\n\n` +
            `**Ejemplos:**\n` +
            `\`${config.prefix}timeout @User 30 flood\`\n` +
            `\`${config.prefix}timeout User#1234 60 spam\`\n` +
            `\`${config.prefix}timeout 123456789012345678 15 lenguaje inapropiado\``
        );
        return;
    }

    // ✅ Buscar miembro con UserSearchHelper
    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
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

    // Índice de duración
    const durationIndex = message.mentions.members?.first() ? 1 : 1;
    const duration = parseInt(args[durationIndex]);

    if (isNaN(duration) || duration < 1 || duration > 40320) {
        await message.reply('❌ Duración inválida. Debe ser entre **1** y **40320** minutos (28 días).');
        return;
    }

    const reason = args.slice(durationIndex + 1).join(' ') || 'Sin razón especificada';
    await executeTimeout(message, target, duration, reason);
}

// ==================== FUNCIONES DE EJECUCIÓN ====================

async function executeKick(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    reason: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;

    // ✅ VALIDACIONES (ya tenemos defer si es interacción)
    Validators.validateMemberProvided(target);
    Validators.validateNotSelf(author, target.user);
    Validators.validateNotBot(target.user);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.KickMembers], ['Expulsar Miembros']);
    Validators.validateBotPermissions(context.guild!, [PermissionFlagsBits.KickMembers], ['Expulsar Miembros']);
    Validators.validateRoleHierarchy(member, target, 'expulsar');
    Validators.validateBotRoleHierarchy(context.guild!, target, 'expulsar');

    if (!target.kickable) {
        throw new CommandError(ErrorType.PERMISSION_ERROR, 'El objetivo no es kickable', '❌ No puedo expulsar a este usuario.');
    }

    // ✅ Operaciones asíncronas (enviar DM, kick)
    try {
        // Intentar notificar al usuario (puede fallar si tiene DMs cerrados)
        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${EMOJIS.KICK} Has sido expulsado`)
                        .setDescription(`**Servidor:** ${context.guild!.name}\n**Razón:** ${reason}`)
                        .setColor(COLORS.DANGER)
                        .setTimestamp()
                ]
            });
        } catch {
            // Ignorar si no se puede enviar DM
        }

        // ✅ Ejecutar la acción de moderación
        await target.kick(reason);

        // ✅ Responder con el resultado
        const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.SUCCESS} Usuario expulsado`)
            .setDescription(
                `**Usuario:** ${target.user.tag}\n` +
                `**Moderador:** ${author.tag}\n` +
                `**Razón:** ${reason}`
            )
            .setColor(COLORS.SUCCESS)
            .setTimestamp();

        if (isInteraction) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    } catch (error) {
        throw new CommandError(ErrorType.UNKNOWN, 'Fallo al expulsar usuario', '❌ No se pudo expulsar al usuario. Verifica los permisos.');
    }
}

async function executeBan(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    reason: string,
    deleteMessageDays: number
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;

    // ✅ VALIDACIONES
    Validators.validateMemberProvided(target);
    Validators.validateNotSelf(author, target.user);
    Validators.validateNotBot(target.user);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.BanMembers], ['Banear Miembros']);
    Validators.validateBotPermissions(context.guild!, [PermissionFlagsBits.BanMembers], ['Banear Miembros']);
    Validators.validateRoleHierarchy(member, target, 'banear');
    Validators.validateBotRoleHierarchy(context.guild!, target, 'banear');

    if (!target.bannable) {
        throw new CommandError(ErrorType.PERMISSION_ERROR, 'El objetivo no es baneable', '❌ No puedo banear a este usuario.');
    }

    // ✅ Operaciones asíncronas
    try {
        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${EMOJIS.BAN} Has sido baneado`)
                        .setDescription(`**Servidor:** ${context.guild!.name}\n**Razón:** ${reason}`)
                        .setColor(COLORS.DANGER)
                        .setTimestamp()
                ]
            });
        } catch {
            // Ignorar
        }

        await target.ban({ reason, deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60 });

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.SUCCESS} Usuario baneado`)
            .setDescription(
                `**Usuario:** ${target.user.tag}\n` +
                `**Moderador:** ${author.tag}\n` +
                `**Razón:** ${reason}\n` +
                `**Mensajes borrados:** ${deleteMessageDays} días`
            )
            .setColor(COLORS.SUCCESS)
            .setTimestamp();

        if (isInteraction) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    } catch (error) {
        throw new CommandError(ErrorType.UNKNOWN, 'Fallo al banear usuario', '❌ No se pudo banear al usuario. Verifica los permisos.');
    }
}

async function executeTimeout(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    duration: number,
    reason: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;

    // ✅ VALIDACIONES
    Validators.validateMemberProvided(target);
    Validators.validateNotSelf(author, target.user);
    Validators.validateNotBot(target.user);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);
    Validators.validateBotPermissions(context.guild!, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);
    Validators.validateRoleHierarchy(member, target, 'silenciar');
    Validators.validateBotRoleHierarchy(context.guild!, target, 'silenciar');

    if (!target.moderatable) {
        throw new CommandError(ErrorType.PERMISSION_ERROR, 'El objetivo no es silenciable', '❌ No puedo silenciar a este usuario.');
    }

    // ✅ Operaciones asíncronas
    try {
        const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);
        await target.timeout(duration * 60 * 1000, reason);

        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${EMOJIS.MUTE} Has sido silenciado`)
                        .setDescription(
                            `**Servidor:** ${context.guild!.name}\n` +
                            `**Duración:** ${duration} minutos\n` +
                            `**Razón:** ${reason}\n` +
                            `**Expira:** <t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`
                        )
                        .setColor(COLORS.WARNING)
                        .setTimestamp()
                ]
            });
        } catch {
            // Ignorar
        }

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.SUCCESS} Usuario silenciado`)
            .setDescription(
                `**Usuario:** ${target.user.tag}\n` +
                `**Moderador:** ${author.tag}\n` +
                `**Duración:** ${duration} minutos\n` +
                `**Razón:** ${reason}\n` +
                `**Expira:** <t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`
            )
            .setColor(COLORS.SUCCESS)
            .setTimestamp();

        if (isInteraction) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    } catch (error) {
        throw new CommandError(ErrorType.UNKNOWN, 'Fallo al silenciar usuario', '❌ No se pudo silenciar al usuario. Verifica los permisos.');
    }
}
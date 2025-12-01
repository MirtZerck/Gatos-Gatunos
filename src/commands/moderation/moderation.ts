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
import { BotClient } from '../../types/BotClient.js';
import { WarnAction } from '../../types/Warn.js';

export const moderation: HybridCommand = {
    type: 'hybrid',
    name: 'moderation',
    description: 'Comandos de moderación del servidor',
    category: CATEGORIES.MODERATION,
    subcommands: [
        { name: 'kick', aliases: ['expulsar'], description: 'Expulsa un usuario' },
        { name: 'ban', aliases: ['banear'], description: 'Banea un usuario' },
        { name: 'timeout', aliases: ['silenciar', 'mute'], description: 'Silencia temporalmente' },
        { name: 'untimeout', aliases: ['unmute', 'desmutear'], description: 'Quita el silencio a un usuario' },
        { name: 'warn', aliases: ['advertir'], description: 'Advierte a un usuario' },
        { name: 'warns', aliases: ['advertencias'], description: 'Ver advertencias de un usuario' },
        { name: 'warn-remove', aliases: ['unwarn'], description: 'Elimina una advertencia' },
        { name: 'warn-clear', aliases: [], description: 'Limpia todas las advertencias' },
    ],

    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Comandos de moderación del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)        
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('untimeout')
                .setDescription('Quita el silencio a un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a desmutear')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón del desmuteo')
                        .setRequired(false)
                        .setMaxLength(512)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Advierte a un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a advertir')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón de la advertencia')
                        .setRequired(true)
                        .setMaxLength(512)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warns')
                .setDescription('Ver advertencias de un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a consultar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn-remove')
                .setDescription('Elimina una advertencia específica')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario objetivo')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID de la advertencia a eliminar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn-clear')
                .setDescription('Limpia todas las advertencias de un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a limpiar advertencias')
                        .setRequired(true)
                )
        )
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Este comando solo funciona en servidores.',
                    flags: [1 << 6]
                });
                return;
            }

            const subcommand = interaction.options.getSubcommand();
            await interaction.deferReply();

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
                case 'untimeout':
                    await handleUntimeoutSlash(interaction);
                    break;
                case 'warn':
                    await handleWarnSlash(interaction);
                    break;
                case 'warns':
                    await handleWarnsSlash(interaction);
                    break;
                case 'warn-remove':
                    await handleWarnRemoveSlash(interaction);
                    break;
                case 'warn-clear':
                    await handleWarnClearSlash(interaction);
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
            const validSubcommands = [
                'kick', 'ban', 'timeout', 'expulsar', 'banear', 'silenciar', 'mute',
                'untimeout', 'unmute', 'desmutear',
                'warn', 'advertir', 'warns', 'advertencias', 'warn-remove', 'unwarn', 'warn-clear'
            ];

            if (!subcommand || !validSubcommands.includes(subcommand)) {
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}moderation <acción> <usuario> [opciones]\`\n\n` +
                    `**Acciones disponibles:**\n` +
                    `• \`kick\` (\`expulsar\`) <usuario> [razón]\n` +
                    `• \`ban\` (\`banear\`) <usuario> [días] [razón]\n` +
                    `• \`timeout\` (\`silenciar\`) <usuario> <minutos> [razón]\n` +
                    `• \`untimeout\` (\`unmute\`) <usuario> [razón]\n` +
                    `• \`warn\` (\`advertir\`) <usuario> <razón>\n` +
                    `• \`warns\` (\`advertencias\`) <usuario>\n` +
                    `• \`warn-remove\` (\`unwarn\`) <usuario> <id>\n` +
                    `• \`warn-clear\` <usuario>`
                );
                return;
            }

            const commandMap: Record<string, string> = {
                'expulsar': 'kick',
                'banear': 'ban',
                'silenciar': 'timeout',
                'mute': 'timeout',
                'unmute': 'untimeout',
                'desmutear': 'untimeout',
                'advertir': 'warn',
                'advertencias': 'warns',
                'unwarn': 'warn-remove'
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
                case 'untimeout':
                    await handleUntimeoutPrefix(message, args.slice(1));
                    break;
                case 'warn':
                    await handleWarnPrefix(message, args.slice(1));
                    break;
                case 'warns':
                    await handleWarnsPrefix(message, args.slice(1));
                    break;
                case 'warn-remove':
                    await handleWarnRemovePrefix(message, args.slice(1));
                    break;
                case 'warn-clear':
                    await handleWarnClearPrefix(message, args.slice(1));
                    break;
            }
        } catch (error) {
            await handleCommandError(error, message, 'moderation');
        }
    },
};

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

async function handleUntimeoutSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    await executeUntimeout(interaction, target, reason);
}

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

    const durationIndex = message.mentions.members?.first() ? 1 : 1;
    const duration = parseInt(args[durationIndex]);

    if (isNaN(duration) || duration < 1 || duration > 40320) {
        await message.reply('❌ Duración inválida. Debe ser entre **1** y **40320** minutos (28 días).');
        return;
    }

    const reason = args.slice(durationIndex + 1).join(' ') || 'Sin razón especificada';
    await executeTimeout(message, target, duration, reason);
}

async function handleUntimeoutPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(`❌ **Uso:** \`${config.prefix}untimeout <usuario> [razón]\``);
        return;
    }

    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
        await message.reply(`❌ No se encontró al usuario: **${args[0]}**`);
        return;
    }

    const reason = args.slice(1).join(' ') || 'Sin razón especificada';
    await executeUntimeout(message, target, reason);
}

async function executeKick(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    reason: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;

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

    try {
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
        } catch { }

        await target.kick(reason);

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
        } catch { }

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
        } catch { }

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

async function executeUntimeout(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    reason: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;

    Validators.validateMemberProvided(target);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);
    Validators.validateBotPermissions(context.guild!, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);

    if (!target.isCommunicationDisabled()) {
        throw new CommandError(ErrorType.VALIDATION_ERROR, 'Usuario no silenciado', '❌ Este usuario no está silenciado.');
    }

    try {
        await target.timeout(null, reason);

        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${EMOJIS.SUCCESS} Tu silencio ha sido removido`)
                        .setDescription(
                            `**Servidor:** ${context.guild!.name}\n` +
                            `**Razón:** ${reason}`
                        )
                        .setColor(COLORS.SUCCESS)
                        .setTimestamp()
                ]
            });
        } catch { }

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.SUCCESS} Usuario desmuteado`)
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
        if (error instanceof CommandError) throw error;
        throw new CommandError(ErrorType.UNKNOWN, 'Fallo al desmutear', '❌ No se pudo quitar el silencio. Verifica los permisos.');
    }
}

async function handleWarnSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const reason = interaction.options.getString('razon', true);
    await executeWarn(interaction, target, reason);
}

async function handleWarnsSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    await executeWarns(interaction, target);
}

async function handleWarnRemoveSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const warningId = interaction.options.getString('id', true);
    await executeWarnRemove(interaction, target, warningId);
}

async function handleWarnClearSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    await executeWarnClear(interaction, target);
}

async function handleWarnPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length < 2) {
        await message.reply(`❌ **Uso:** \`${config.prefix}warn <usuario> <razón>\``);
        return;
    }

    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
        await message.reply(`❌ No se encontró al usuario: **${args[0]}**`);
        return;
    }

    const reason = args.slice(1).join(' ');
    await executeWarn(message, target, reason);
}

async function handleWarnsPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(`❌ **Uso:** \`${config.prefix}warns <usuario>\``);
        return;
    }

    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
        await message.reply(`❌ No se encontró al usuario: **${args[0]}**`);
        return;
    }

    await executeWarns(message, target);
}

async function handleWarnRemovePrefix(message: Message, args: string[]): Promise<void> {
    if (args.length < 2) {
        await message.reply(`❌ **Uso:** \`${config.prefix}warn-remove <usuario> <id>\``);
        return;
    }

    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
        await message.reply(`❌ No se encontró al usuario: **${args[0]}**`);
        return;
    }

    await executeWarnRemove(message, target, args[1]);
}

async function handleWarnClearPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(`❌ **Uso:** \`${config.prefix}warn-clear <usuario>\``);
        return;
    }

    const target = await UserSearchHelper.findMemberFromMentionOrQuery(
        message.guild!,
        message.mentions.members?.first(),
        args[0]
    );

    if (!target) {
        await message.reply(`❌ No se encontró al usuario: **${args[0]}**`);
        return;
    }

    await executeWarnClear(message, target);
}

async function executeWarn(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    reason: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;
    const client = context.client as BotClient;

    Validators.validateMemberProvided(target);
    Validators.validateNotSelf(author, target.user);
    Validators.validateNotBot(target.user);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);

    if (!client.warnManager) {
        throw new CommandError(ErrorType.UNKNOWN, 'WarnManager no disponible', '❌ El sistema de advertencias no está disponible.');
    }

    const result = await client.warnManager.addWarning(
        context.guild!.id,
        target.id,
        author.id,
        author.tag,
        reason
    );

    let actionMessage = '';
    if (result.actionTaken === WarnAction.TIMEOUT) {
        const duration = client.warnManager.getTimeoutDuration();
        try {
            await target.timeout(duration * 60 * 1000, `Acumulación de ${result.totalWarnings} advertencias`);
            actionMessage = `\n\n⚠️ **Acción automática:** Timeout de ${duration} minutos aplicado`;
        } catch {
            actionMessage = '\n\n⚠️ No se pudo aplicar el timeout automático';
        }
    } else if (result.actionTaken === WarnAction.KICK) {
        try {
            await target.kick(`Acumulación de ${result.totalWarnings} advertencias`);
            actionMessage = '\n\n🚪 **Acción automática:** Usuario expulsado';
        } catch {
            actionMessage = '\n\n⚠️ No se pudo aplicar el kick automático';
        }
    } else if (result.actionTaken === WarnAction.BAN) {
        try {
            await target.ban({ reason: `Acumulación de ${result.totalWarnings} advertencias` });
            actionMessage = '\n\n🔨 **Acción automática:** Usuario baneado';
        } catch {
            actionMessage = '\n\n⚠️ No se pudo aplicar el ban automático';
        }
    }

    try {
        await target.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚠️ Has recibido una advertencia')
                    .setDescription(
                        `**Servidor:** ${context.guild!.name}\n` +
                        `**Razón:** ${reason}\n` +
                        `**Advertencias totales:** ${result.totalWarnings}`
                    )
                    .setColor(COLORS.WARNING)
                    .setTimestamp()
            ]
        });
    } catch { }

    const embed = new EmbedBuilder()
        .setTitle('⚠️ Usuario advertido')
        .setDescription(
            `**Usuario:** ${target.user.tag}\n` +
            `**Moderador:** ${author.tag}\n` +
            `**Razón:** ${reason}\n` +
            `**Advertencias totales:** ${result.totalWarnings}/7` +
            actionMessage
        )
        .setColor(COLORS.WARNING)
        .setFooter({ text: `ID: ${result.warning.id.slice(0, 8)}` })
        .setTimestamp();

    if (isInteraction) {
        await context.editReply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function executeWarns(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;
    const client = context.client as BotClient;

    Validators.validateMemberProvided(target);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);

    if (!client.warnManager) {
        throw new CommandError(ErrorType.UNKNOWN, 'WarnManager no disponible', '❌ El sistema de advertencias no está disponible.');
    }

    const warnings = await client.warnManager.getWarnings(context.guild!.id, target.id);

    if (warnings.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle(`📋 Advertencias de ${target.user.tag}`)
            .setDescription('Este usuario no tiene advertencias.')
            .setColor(COLORS.SUCCESS)
            .setThumbnail(target.user.displayAvatarURL());

        if (isInteraction) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
        return;
    }

    const warningList = warnings
        .slice(-10)
        .map((w, i) => {
            const date = new Date(w.timestamp);
            return `**${i + 1}.** ${w.reason}\n` +
                   `   └ Por: ${w.moderatorTag} | <t:${Math.floor(w.timestamp / 1000)}:R>\n` +
                   `   └ ID: \`${w.id.slice(0, 8)}\``;
        })
        .join('\n\n');

    const embed = new EmbedBuilder()
        .setTitle(`📋 Advertencias de ${target.user.tag}`)
        .setDescription(warningList)
        .setColor(COLORS.WARNING)
        .setThumbnail(target.user.displayAvatarURL())
        .setFooter({ text: `Total: ${warnings.length}/7 advertencias` });

    if (isInteraction) {
        await context.editReply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function executeWarnRemove(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined,
    warningId: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;
    const client = context.client as BotClient;

    Validators.validateMemberProvided(target);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.ModerateMembers], ['Moderar Miembros']);

    if (!client.warnManager) {
        throw new CommandError(ErrorType.UNKNOWN, 'WarnManager no disponible', '❌ El sistema de advertencias no está disponible.');
    }

    const warnings = await client.warnManager.getWarnings(context.guild!.id, target.id);
    const warning = warnings.find(w => w.id.startsWith(warningId));

    if (!warning) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Advertencia no encontrada', '❌ No se encontró una advertencia con ese ID.');
    }

    const removed = await client.warnManager.removeWarning(context.guild!.id, target.id, warning.id);

    if (!removed) {
        throw new CommandError(ErrorType.UNKNOWN, 'Error eliminando', '❌ No se pudo eliminar la advertencia.');
    }

    const remainingCount = await client.warnManager.getWarningCount(context.guild!.id, target.id);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Advertencia eliminada')
        .setDescription(
            `**Usuario:** ${target.user.tag}\n` +
            `**Razón eliminada:** ${warning.reason}\n` +
            `**Eliminada por:** ${author.tag}\n` +
            `**Advertencias restantes:** ${remainingCount}`
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp();

    if (isInteraction) {
        await context.editReply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function executeWarnClear(
    context: ChatInputCommandInteraction | Message,
    target: GuildMember | null | undefined
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const author = isInteraction ? context.user : context.author;
    const member = isInteraction ? context.member as GuildMember : context.member as GuildMember;
    const client = context.client as BotClient;

    Validators.validateMemberProvided(target);
    Validators.validateUserPermissions(member, [PermissionFlagsBits.Administrator], ['Administrador']);

    if (!client.warnManager) {
        throw new CommandError(ErrorType.UNKNOWN, 'WarnManager no disponible', '❌ El sistema de advertencias no está disponible.');
    }

    const count = await client.warnManager.clearWarnings(context.guild!.id, target.id);

    const embed = new EmbedBuilder()
        .setTitle('🧹 Advertencias limpiadas')
        .setDescription(
            `**Usuario:** ${target.user.tag}\n` +
            `**Advertencias eliminadas:** ${count}\n` +
            `**Limpiado por:** ${author.tag}`
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp();

    if (isInteraction) {
        await context.editReply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}
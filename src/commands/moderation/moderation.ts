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
import { logger } from '../../utils/logger.js';
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
                        .setMaxValue(40320) // 28 días
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
            Validators.validateInGuild(interaction);

            const subcommand = interaction.options.getSubcommand();

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
            const validSubcommands = ['kick', 'ban', 'timeout'];

            if (!subcommand || !validSubcommands.includes(subcommand)) {
                await message.reply(
                    `❌ **Uso:** \`!moderation <acción> @usuario [opciones]\`\n\n` +
                    `**Acciones disponibles:**\n` +
                    `• \`kick @usuario [razón]\` - Expulsar usuario\n` +
                    `• \`ban @usuario [días] [razón]\` - Banear usuario\n` +
                    `• \`timeout @usuario <minutos> [razón]\` - Silenciar temporalmente`
                );
                return
            }

            switch (subcommand) {
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

async function handleKickSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';

    await executeKick(interaction, target, reason);
}

async function handleBanSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const reason = interaction.options.getString('razon') || 'Sin  razón especificada';
    const deleteMessageDays = interaction.options.getInteger('borrar_mensajes') || 0;

    await executeBan(interaction, target, reason, deleteMessageDays);
}

async function handleTimeoutSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getMember('usuario') as GuildMember | null;
    const duration = interaction.options.getInteger('duracion', true);
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';

    await executeTimeout(interaction, target, duration, reason);
}

async function handleKickPrefix(message: Message, args: string[]): Promise<void> {
    const target = message.mentions.members?.first();
    const reason = args.slice(1).join(' ') || 'Sin razón especificada';

    if (!target) {
        await message.reply(`❌ Debes mencionar a un usuario. Ejemplo: \`${config.prefix}moderation kick @usuario spam\``);
        return;
    }

    await executeKick(message, target, reason);
}

async function handleBanPrefix(message: Message, args: string[]): Promise<void> {
    const target = message.mentions.members?.first();

    if (!target) {
        await message.reply(`❌ Debes mencionar a un usuario. Ejemplo: \`${config.prefix}moderation ban @usuario 7 toxicidad\``);
        return;
    }

    let deleteMessageDays = 0;
    let reasonStartIndex = 1;

    if (args[1] && !isNaN(parseInt(args[1]))) {
        deleteMessageDays = Math.min(Math.max(parseInt(args[1]), 0), 7);
        reasonStartIndex = 2;
    }

    const reason = args.slice(reasonStartIndex).join(' ') || 'Sin razón especificada';

    await executeBan(message, target, reason, deleteMessageDays);
}

async function handleTimeoutPrefix(message: Message, args: string[]): Promise<void> {
    const target = message.mentions.members?.first();

    if (!target) {
        await message.reply(`❌ Debes mencionar a un usuario. Ejemplo: \`${config.prefix}moderation timeout @usuario 30 flood\``);
        return;
    }

    const duration = parseInt(args[1]);

    if (isNaN(duration) || duration < 1 || duration > 40320) {
        await message.reply('❌ Debes especificar una duración válida (1-40320 minutos).');
        return;
    }

    const reason = args.slice(2).join(' ') || 'Sin razón especificada';

    await executeTimeout(message, target, duration, reason);
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

    Validators.validateUserPermissions(
        member,
        [PermissionFlagsBits.KickMembers],
        ['Expulsar Miembros']
    );

    Validators.validateBotPermissions(
        context.guild!,
        [PermissionFlagsBits.KickMembers],
        ['Expulsar Miembros']
    );

    Validators.validateRoleHierarchy(member, target, 'expulsar');
    Validators.validateBotRoleHierarchy(context.guild!, target, 'expulsar');

    if (!target.kickable) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'El objetivo no es kickable',
            '❌ No puedo expulsar a este usuario.'
        )
    }

    if (isInteraction) {
        await context.deferReply();
    }
    try {
        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${EMOJIS.BAN} Has sido expulsado`)
                        .setDescription(`**Servidor:** ${context.guild!.name}\n**Razón:** ${reason}`)
                        .setColor(COLORS.DANGER)
                        .setTimestamp()
                ]
            });
        } catch (dmError) {
            logger.debug(
                'Moderation',
                `No se pudo enviar DM a ${target.user.tag}: DMs cerrados o bot bloqueado`
            );
        }

        await target.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJIS.SUCCESS} Usuario expulsado`)
            .setDescription(
                `**Usuario:** ${target.user.displayName}\n` +
                `**Moderador:** ${author.displayName}\n` +
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
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Fallo al expulsar usuario',
            '❌ No se pudo expulsar al usuario. Verifica los permisos.'
        );
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

    Validators.validateUserPermissions(
        member,
        [PermissionFlagsBits.BanMembers],
        ['Banear Miembros']
    );

    Validators.validateBotPermissions(
        context.guild!,
        [PermissionFlagsBits.BanMembers],
        ['Banear Miembros']
    );

    Validators.validateRoleHierarchy(member, target, 'banear');
    Validators.validateBotRoleHierarchy(context.guild!, target, 'banear');

    if (!target.bannable) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'El objetivo no es baneable',
            '❌ No puedo banear a este usuario.'
        );
    }

    if (isInteraction) {
        await context.deferReply();
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
        } catch (dmError) {
            logger.debug(
                'Moderation',
                `No se pudo enviar DM a ${target.user.tag}: DMs cerrados o bot bloqueado`
            );
        }

        await target.ban({
            reason,
            deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
        });

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
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Fallo al banear usuario',
            '❌ No se pudo banear al usuario. Verifica los permisos.'
        );
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

    Validators.validateUserPermissions(
        member,
        [PermissionFlagsBits.ModerateMembers],
        ['Moderar Miembros']
    );

    Validators.validateBotPermissions(
        context.guild!,
        [PermissionFlagsBits.ModerateMembers],
        ['Moderar Miembros']
    );

    Validators.validateRoleHierarchy(member, target, 'silenciar');
    Validators.validateBotRoleHierarchy(context.guild!, target, 'silenciar');

    if (!target.moderatable) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'El objetivo no es silenciable',
            '❌ No puedo silenciar a este usuario.'
        );
    }

    if (isInteraction) {
        await context.deferReply();
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
        } catch (dmError) {
            logger.debug(
                'Moderation',
                `No se pudo enviar DM a ${target.user.tag}: DMs cerrados o bot bloqueado`
            );
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
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Fallo al silenciar usuario',
            '❌ No se pudo silenciar al usuario. Verifica los permisos.'
        );
    }
}
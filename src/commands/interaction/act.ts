import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    User
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getInteractionGif } from '../../utils/gifProvider.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { BotClient } from '../../types/BotClient.js';
import { logger } from '../../utils/logger.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';

const ACTION_QUERIES = {
    dance: 'anime dance',
    sing: 'anime sing',
    highfive: 'anime high five',
    wave: 'anime wave',
    bow: 'anime bow',
    clap: 'anime clap',
    cheer: 'anime cheer',
    salute: 'anime salute',
    nod: 'anime nod',
    cookie: 'anime cookie',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

const REQUIRE_REQUEST_WITH_TARGET: ActionType[] = ['dance', 'sing', 'highfive', 'cookie'];
const NO_REQUEST: ActionType[] = ['wave', 'bow', 'clap', 'cheer', 'salute', 'nod'];

const ACTION_CONFIG: Record<ActionType, {
    emoji: string;
    name: string;
    color: number;
    requestTitle?: string;
    requestMessage?: (author: string, target: string) => string;
    withTarget: (author: string, target: string) => string;
    solo: (author: string) => string;
    footer: string;
}> = {
    dance: {
        emoji: '💃',
        name: 'baile',
        color: 0xFF1493, // Rosa profundo
        requestTitle: '¡Invitación a Bailar!',
        requestMessage: (a, t) => `**${a}** te invita a bailar, **${t}**\n\n¿Te gustaría unirte a la pista de baile?`,
        withTarget: (a, t) => `**${a}** baila animadamente con **${t}**`,
        solo: (a) => `**${a}** está bailando como si nadie estuviera mirando`,
        footer: '🎶 ¡A mover el esqueleto!'
    },
    sing: {
        emoji: '🎤',
        name: 'canto',
        color: 0x9370DB, // Púrpura medio
        requestTitle: '¡Invitación a Cantar!',
        requestMessage: (a, t) => `**${a}** quiere hacer un dueto contigo, **${t}**\n\n¿Te animas a cantar juntos?`,
        withTarget: (a, t) => `**${a}** canta a dúo con **${t}**`,
        solo: (a) => `**${a}** está cantando a todo pulmón`,
        footer: '🎵 ¡La música une corazones!'
    },
    highfive: {
        emoji: '✋',
        name: 'choque de manos',
        color: 0xFFA500, // Naranja
        requestTitle: '¡Choca esos cinco!',
        requestMessage: (a, t) => `**${a}** levanta la mano esperando tu choque, **${t}**\n\n¿Le devuelves el gesto?`,
        withTarget: (a, t) => `**${a}** choca los cinco energéticamente con **${t}**`,
        solo: (a) => `**${a}** levanta la mano esperando un choque de manos`,
        footer: '👏 ¡Excelente trabajo en equipo!'
    },
    wave: {
        emoji: '👋',
        name: 'saludo',
        color: 0x87CEEB, // Azul cielo
        requestTitle: '',
        requestMessage: undefined,
        withTarget: (a, t) => `**${a}** saluda amistosamente a **${t}**`,
        solo: (a) => `**${a}** saluda con entusiasmo`,
        footer: '👋 ¡Hola! ¿Cómo estás?'
    },
    bow: {
        emoji: '🙇',
        name: 'reverencia',
        color: 0x4B0082, // Índigo
        requestTitle: '',
        requestMessage: undefined,
        withTarget: (a, t) => `**${a}** hace una elegante reverencia ante **${t}**`,
        solo: (a) => `**${a}** hace una reverencia respetuosa`,
        footer: '🎩 Con respeto y admiración'
    },
    clap: {
        emoji: '👏',
        name: 'aplauso',
        color: 0xFFD700, // Dorado
        requestTitle: '',
        requestMessage: undefined,
        withTarget: (a, t) => `**${a}** aplaude entusiastamente a **${t}**`,
        solo: (a) => `**${a}** está aplaudiendo con ganas`,
        footer: '👏 ¡Bravo! ¡Impresionante!'
    },
    cheer: {
        emoji: '🎉',
        name: 'ánimo',
        color: 0xFF6347, // Tomate
        requestTitle: '',
        requestMessage: undefined,
        withTarget: (a, t) => `**${a}** anima con entusiasmo a **${t}**`,
        solo: (a) => `**${a}** está celebrando y animando`,
        footer: '🎊 ¡Tú puedes! ¡Vamos!'
    },
    salute: {
        emoji: '🫡',
        name: 'saludo militar',
        color: 0x556B2F, // Verde oliva oscuro
        requestTitle: '',
        requestMessage: undefined,
        withTarget: (a, t) => `**${a}** hace un saludo militar a **${t}**`,
        solo: (a) => `**${a}** hace un saludo militar`,
        footer: '🎖️ Con honor y disciplina'
    },
    nod: {
        emoji: '👍',
        name: 'asentimiento',
        color: 0x32CD32, // Verde lima
        requestTitle: '',
        requestMessage: undefined,
        withTarget: (a, t) => `**${a}** asiente aprobadoramente ante **${t}**`,
        solo: (a) => `**${a}** asiente con la cabeza`,
        footer: '✅ De acuerdo, entendido'
    },
    cookie: {
        emoji: '🍪',
        name: 'galleta',
        color: 0xD2691E, // Chocolate
        requestTitle: '¡Ofrenda de Galleta!',
        requestMessage: (a, t) => `**${a}** te ofrece una deliciosa galleta, **${t}**\n\n¿Aceptas este dulce regalo?`,
        withTarget: (a, t) => `**${a}** le da una galleta a **${t}**`,
        solo: (a) => `**${a}** está disfrutando de una galleta`,
        footer: '🍪 ¡Las galletas siempre alegran el día!'
    }
};

export const act: HybridCommand = {
    type: 'hybrid',
    name: 'act',
    description: 'Acciones y actuaciones expresivas',
    category: CATEGORIES.INTERACTION,
    subcommands: [
        { name: 'dance', aliases: ['bailar'], description: 'Baila (solo o con alguien)' },
        { name: 'sing', aliases: ['cantar'], description: 'Canta (solo o con alguien)' },
        { name: 'highfive', aliases: ['chocalos'], description: 'Choca los cinco' },
        { name: 'wave', aliases: ['saludar', 'saludo', 'hi', 'hola'], description: 'Saluda' },
        { name: 'bow', aliases: ['reverencia'], description: 'Haz una reverencia' },
        { name: 'clap', aliases: ['aplaudir'], description: 'Aplaude' },
        { name: 'cheer', aliases: ['animar'], description: 'Anima' },
        { name: 'salute', aliases: [], description: 'Saludo militar' },
        { name: 'nod', aliases: ['asentir'], description: 'Asiente' },
        { name: 'cookie', aliases: ['galleta'], description: 'Ofrece o disfruta una galleta' },
    ],

    data: new SlashCommandBuilder()
        .setName('act')
        .setDescription('Acciones y actuaciones expresivas')
        .addSubcommand(sub => sub.setName('dance').setDescription('Baila (solo o con alguien)')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién bailar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('sing').setDescription('Canta (solo o con alguien)')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién cantar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('highfive').setDescription('Choca los cinco')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién chocar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('wave').setDescription('Saluda')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién saludar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('bow').setDescription('Haz una reverencia')
            .addUserOption(opt => opt.setName('usuario').setDescription('Ante quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('clap').setDescription('Aplaude')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién aplaudir (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('cheer').setDescription('Anima')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién animar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('salute').setDescription('Saludo militar')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién saludar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('nod').setDescription('Asiente')
            .addUserOption(opt => opt.setName('usuario').setDescription('Ante quién asentir (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('cookie').setDescription('Ofrece o disfruta una galleta')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién ofrecer la galleta (opcional)').setRequired(false)))
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario');
            const author = interaction.user;

            if (target) {
                try {
                    Validators.validateNotSelf(author, target);
                    Validators.validateNotBot(target);
                    await Validators.validateNotBlocked(
                        author,
                        target,
                        (interaction.client as BotClient).blockManager
                    );
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
            }

            await interaction.deferReply();

            if (target && REQUIRE_REQUEST_WITH_TARGET.includes(subcommand)) {
                await handleRequestAction(interaction, subcommand, author, target);
            } else {
                await handleDirectAction(interaction, subcommand, author, target);
            }

        } catch (error) {
            await handleCommandError(error, interaction, 'act');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase() as ActionType;
            const validSubcommands = Object.keys(ACTION_QUERIES);

            if (!subcommand) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🎭 Comandos de Actuación')
                    .setDescription(
                        `Usa: \`${config.prefix}act <acción> [@usuario]\`\n\n` +
                        `El usuario es opcional para la mayoría de acciones.`
                    )
                    .addFields(
                        {
                            name: '🎪 Con Solicitud (si hay @usuario)',
                            value: REQUIRE_REQUEST_WITH_TARGET.map(cmd =>
                                `${ACTION_CONFIG[cmd].emoji} \`${cmd}\` - ${ACTION_CONFIG[cmd].name}`
                            ).join('\n'),
                            inline: false
                        },
                        {
                            name: '⚡ Acciones Directas',
                            value: NO_REQUEST.map(cmd =>
                                `${ACTION_CONFIG[cmd].emoji} \`${cmd}\` - ${ACTION_CONFIG[cmd].name}`
                            ).join('\n'),
                            inline: false
                        }
                    )
                    .setColor(COLORS.INTERACTION)
                    .setFooter({ text: '¡Expresa tus acciones!' });

                await message.reply({ embeds: [helpEmbed] });
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(`❌ Acción no válida: **${subcommand}**`);
                return;
            }

            let target = undefined;
            const query = args[1] || message.mentions.users.first()?.id;

            if (query) {
                const targetMember = await UserSearchHelper.findMember(message.guild!, query);
                if (targetMember) {
                    target = targetMember.user;
                    Validators.validateNotSelf(message.author, target);
                    Validators.validateNotBot(target);
                    await Validators.validateNotBlocked(
                        message.author,
                        target,
                        (message.client as BotClient).blockManager
                    );
                }
            }

            if (target && REQUIRE_REQUEST_WITH_TARGET.includes(subcommand)) {
                await handleRequestActionPrefix(message, subcommand, message.author, target);
            } else {
                await handleDirectActionPrefix(message, subcommand, message.author, target);
            }

        } catch (error) {
            await handleCommandError(error, message, 'act');
        }
    },
};

async function handleDirectAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: User,
    target: User | null
): Promise<void> {
    try {
        const actionConfig = ACTION_CONFIG[action];
        const gifURL = await getInteractionGif(ACTION_QUERIES[action]);

        const message = target
            ? actionConfig.withTarget(author.displayName, target.displayName)
            : actionConfig.solo(author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(`${actionConfig.emoji} ${message}`)
            .setImage(gifURL)
            .setColor(actionConfig.color)
            .setFooter({ text: actionConfig.footer })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

async function handleDirectActionPrefix(
    message: Message,
    action: ActionType,
    author: User,
    target: User | undefined
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando...');

    try {
        const actionConfig = ACTION_CONFIG[action];
        const gifUrl = await getInteractionGif(ACTION_QUERIES[action]);

        const messageText = target
            ? actionConfig.withTarget(author.displayName, target.displayName)
            : actionConfig.solo(author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(`${actionConfig.emoji} ${messageText}`)
            .setImage(gifUrl)
            .setColor(actionConfig.color)
            .setFooter({ text: actionConfig.footer })
            .setTimestamp();

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

async function handleRequestAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: User,
    target: User
): Promise<void> {
    const requestManager = (interaction.client as BotClient).requestManager;

    if (requestManager && requestManager.hasPendingRequestWith(author.id, target.id)) {
        const remainingTime = requestManager.getRemainingTimeWith(author.id, target.id);
        const minutes = Math.ceil(remainingTime / 60000);

        const cooldownEmbed = new EmbedBuilder()
            .setDescription(
                `⏱️ Ya tienes una solicitud pendiente con **${target.displayName}**.\n\n` +
                `Expira en **${minutes} minuto${minutes !== 1 ? 's' : ''}**.`
            )
            .setColor(COLORS.WARNING)
            .setFooter({ text: '¡Paciencia! Espera la respuesta' });

        await interaction.editReply({ embeds: [cooldownEmbed] });
        return;
    }

    const actionConfig = ACTION_CONFIG[action];
    const expiresAt = Date.now() + 600000;
    const expiresTimestamp = Math.floor(expiresAt / 1000);

    const requestEmbed = new EmbedBuilder()
        .setTitle(`${actionConfig.emoji} ${actionConfig.requestTitle}`)
        .setDescription(
            `${actionConfig.requestMessage!(author.displayName, target.displayName)}\n\n` +
            `⏰ Expira: <t:${expiresTimestamp}:R>`
        )
        .setColor(actionConfig.color)
        .setThumbnail(author.displayAvatarURL({ size: 128 }))
        .setFooter({
            text: `Solicitado por ${author.tag} • Responde con los botones`,
            iconURL: author.displayAvatarURL()
        })
        .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`interact_accept_${action}`)
                .setLabel('Aceptar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`interact_reject_${action}`)
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

    const message = await interaction.editReply({
        embeds: [requestEmbed],
        components: [buttons]
    });

    if (requestManager) {
        try {
            requestManager.createRequest(
                author.id,
                target.id,
                action,
                message.id,
                interaction.id,
                600000
            );
        } catch (error) {
            logger.error('act', 'Error creando solicitud', error);
        }
    }

    setTimeout(async () => {
        try {
            const currentMessage = await interaction.fetchReply();
            if (currentMessage.components.length > 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Solicitud Expirada')
                    .setDescription(
                        `**${target.displayName}** no respondió a tiempo.\n\n` +
                        `La solicitud de **${actionConfig.name}** ha expirado.`
                    )
                    .setColor(COLORS.WARNING)
                    .setFooter({ text: '¡Inténtalo de nuevo cuando quieras!' })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });

                if (requestManager) {
                    requestManager.resolveRequestWith(author.id, target.id);
                }
            }
        } catch { }
    }, 600000);
}

async function handleRequestActionPrefix(
    message: Message,
    action: ActionType,
    author: User,
    target: User
): Promise<void> {
    const requestManager = (message.client as BotClient).requestManager;

    if (requestManager && requestManager.hasPendingRequestWith(author.id, target.id)) {
        const remainingTime = requestManager.getRemainingTimeWith(author.id, target.id);
        const minutes = Math.ceil(remainingTime / 60000);

        const cooldownEmbed = new EmbedBuilder()
            .setDescription(
                `⏱️ Ya tienes una solicitud pendiente con **${target.displayName}**.\n\n` +
                `Expira en **${minutes} minuto${minutes !== 1 ? 's' : ''}**.`
            )
            .setColor(COLORS.WARNING)
            .setFooter({ text: '¡Paciencia! Espera la respuesta' });

        await message.reply({ embeds: [cooldownEmbed] });
        return;
    }

    const actionConfig = ACTION_CONFIG[action];
    const expiresAt = Date.now() + 600000;
    const expiresTimestamp = Math.floor(expiresAt / 1000);

    const requestEmbed = new EmbedBuilder()
        .setTitle(`${actionConfig.emoji} ${actionConfig.requestTitle}`)
        .setDescription(
            `${actionConfig.requestMessage!(author.displayName, target.displayName)}\n\n` +
            `⏰ Expira: <t:${expiresTimestamp}:R>`
        )
        .setColor(actionConfig.color)
        .setThumbnail(author.displayAvatarURL({ size: 128 }))
        .setFooter({
            text: `Solicitado por ${author.tag} • Responde con los botones`,
            iconURL: author.displayAvatarURL()
        })
        .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`interact_accept_${action}`)
                .setLabel('Aceptar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`interact_reject_${action}`)
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

    const requestMessage = await message.reply({
        embeds: [requestEmbed],
        components: [buttons]
    });

    if (requestManager) {
        try {
            requestManager.createRequest(
                author.id,
                target.id,
                action,
                requestMessage.id,
                message.id,
                600000
            );
        } catch (error) {
            logger.error('act', 'Error creando solicitud', error);
        }
    }

    setTimeout(async () => {
        try {
            const currentMessage = await message.channel.messages.fetch(requestMessage.id);
            if (currentMessage.components.length > 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Solicitud Expirada')
                    .setDescription(
                        `**${target.displayName}** no respondió a tiempo.\n\n` +
                        `La solicitud de **${actionConfig.name}** ha expirado.`
                    )
                    .setColor(COLORS.WARNING)
                    .setFooter({ text: '¡Inténtalo de nuevo cuando quieras!' })
                    .setTimestamp();

                await requestMessage.edit({
                    embeds: [timeoutEmbed],
                    components: []
                });

                if (requestManager) {
                    requestManager.resolveRequestWith(author.id, target.id);
                }
            }
        } catch { }
    }, 600000);
}
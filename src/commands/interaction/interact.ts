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
import { logger } from '../../utils/logger.js';
import { BotClient } from '../../types/BotClient.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';

const ACTION_QUERIES = {
    hug: 'anime hug',
    kiss: 'anime kiss',
    pat: 'anime head pat',
    cuddle: 'anime cuddle',
    slap: 'anime slap',
    poke: 'anime poke',
    bite: 'anime bite',
    tickle: 'anime tickle',
    bonk: 'anime bonk',
    boop: 'anime boop',
    spank: 'anime spank',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

const REQUIRE_REQUEST: ActionType[] = ['hug', 'kiss', 'cuddle'];
const DIRECT_ACTIONS: ActionType[] = ['slap', 'poke', 'pat','bite', 'tickle', 'bonk', 'boop', 'spank'];

const ACTION_CONFIG: Record<ActionType, {
    emoji: string;
    name: string;
    color: number;
    requestTitle: string;
    requestMessage: (author: string, target: string) => string;
    successMessage: (author: string, target: string) => string;
    footer: string;
}> = {
    hug: {
        emoji: '🤗',
        name: 'abrazo',
        color: 0xFFB6C1, // Rosa claro
        requestTitle: '¡Solicitud de Abrazo!',
        requestMessage: (a, t) => `**${a}** quiere darte un cálido abrazo, **${t}**\n\n¿Aceptas este gesto de cariño?`,
        successMessage: (a, t) => `**${a}** abraza cálidamente a **${t}**`,
        footer: '💝 Los abrazos son gratis pero invaluables'
    },
    kiss: {
        emoji: '😘',
        name: 'beso',
        color: 0xFF69B4, // Rosa fuerte
        requestTitle: '¡Solicitud de Beso!',
        requestMessage: (a, t) => `**${a}** quiere darte un beso, **${t}**\n\n¿Aceptas este gesto romántico?`,
        successMessage: (a, t) => `**${a}** le da un tierno beso a **${t}**`,
        footer: '💋 Con amor y cariño'
    },
    pat: {
        emoji: '😊',
        name: 'caricia',
        color: 0xFFA500, // Naranja
        requestTitle: '¡Solicitud de Caricia!',
        requestMessage: (a, t) => `**${a}** quiere acariciar tu cabeza, **${t}**\n\n¿Te gustaría recibir esta muestra de afecto?`,
        successMessage: (a, t) => `**${a}** acaricia suavemente la cabeza de **${t}**`,
        footer: '✨ Mimitos que alegran el día'
    },
    cuddle: {
        emoji: '🥰',
        name: 'acurrucada',
        color: 0xFFB6E1, // Rosa pastel
        requestTitle: '¡Solicitud de Acurrucarse!',
        requestMessage: (a, t) => `**${a}** quiere acurrucarse contigo, **${t}**\n\n¿Aceptas compartir este momento acogedor?`,
        successMessage: (a, t) => `**${a}** se acurruca cómodamente con **${t}**`,
        footer: '🛋️ Momentos cálidos y acogedores'
    },
    slap: {
        emoji: '🖐️',
        name: 'bofetada',
        color: 0xFF4444, // Rojo
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** le da una bofetada a **${t}**`,
        footer: '💢 ¡Eso dolió!'
    },
    poke: {
        emoji: '👉',
        name: 'molestia',
        color: 0xFFD700, // Dorado
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** molesta juguetonamente a **${t}**`,
        footer: '😏 ¡Ey, ey, ey!'
    },
    bite: {
        emoji: '😬',
        name: 'mordida',
        color: 0xFF6347, // Tomate
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** le da un mordisco travieso a **${t}**`,
        footer: '🦷 ¡Auch! Eso fue inesperado'
    },
    tickle: {
        emoji: '🤭',
        name: 'cosquillas',
        color: 0x87CEEB, // Azul cielo
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** le hace cosquillas a **${t}**`,
        footer: '😂 ¡Jajaja, para, para!'
    },
    bonk: {
        emoji: '🔨',
        name: 'golpe juguetón',
        color: 0x8B4513, // Marrón
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** le da un golpecito juguetón en la cabeza a **${t}**`,
        footer: '*bonk* ¡Ve a la cárcel de hornys!'
    },
    boop: {
        emoji: '👆',
        name: 'toque de nariz',
        color: 0xFFC0CB, // Rosa
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** toca suavemente la nariz de **${t}**`,
        footer: '*boop* 👃 ¡Qué adorable!'
    },
    spank: {
        emoji: '🍑',
        name: 'nalgada',
        color: 0xFF1493, // Rosa profundo
        requestTitle: '',
        requestMessage: (a, t) => '',
        successMessage: (a, t) => `**${a}** le da una nalgada a **${t}**`,
        footer: '💥 ¡Eso fue atrevido!'
    }
};

export const interact: HybridCommand = {
    type: 'hybrid',
    name: 'interact',
    description: 'Interacciones directas con otros usuarios',
    category: CATEGORIES.INTERACTION,
    subcommands: [
        { name: 'hug', aliases: ['abrazo', 'abrazar'], description: 'Abraza a alguien' },
        { name: 'kiss', aliases: ['beso', 'besar'], description: 'Besa a alguien' },
        { name: 'pat', aliases: ['acariciar'], description: 'Acaricia la cabeza' },
        { name: 'cuddle', aliases: ['acurrucar'], description: 'Acurrúcate' },
        { name: 'slap', aliases: ['cachetada', 'bofetada'], description: 'Abofetea' },
        { name: 'poke', aliases: ['molestar'], description: 'Molesta' },
        { name: 'bite', aliases: ['morder'], description: 'Muerde' },
        { name: 'tickle', aliases: ['cosquillas'], description: 'Cosquillas' },
        { name: 'bonk', aliases: ['golpear'], description: 'Golpe juguetón' },
        { name: 'boop', aliases: [], description: 'Toca la nariz' },
        { name: 'spank', aliases: ['nalgada'], description: 'Da una nalgada' },
    ],

    data: new SlashCommandBuilder()
        .setName('interact')
        .setDescription('Interacciones directas con otros usuarios')
        .addSubcommand(sub => sub.setName('hug').setDescription('Abraza a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a abrazar').setRequired(true)))
        .addSubcommand(sub => sub.setName('kiss').setDescription('Besa a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a besar').setRequired(true)))
        .addSubcommand(sub => sub.setName('pat').setDescription('Acaricia la cabeza de alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a acariciar').setRequired(true)))
        .addSubcommand(sub => sub.setName('cuddle').setDescription('Acurrúcate con alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario con quien acurrucarse').setRequired(true)))
        .addSubcommand(sub => sub.setName('slap').setDescription('Abofetea a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a abofetear').setRequired(true)))
        .addSubcommand(sub => sub.setName('poke').setDescription('Molesta a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a molestar').setRequired(true)))
        .addSubcommand(sub => sub.setName('bite').setDescription('Muerde a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a morder').setRequired(true)))
        .addSubcommand(sub => sub.setName('tickle').setDescription('Haz cosquillas a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a hacerle cosquillas').setRequired(true)))
        .addSubcommand(sub => sub.setName('bonk').setDescription('Dale un golpe juguetón')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a golpear juguetonamente').setRequired(true)))
        .addSubcommand(sub => sub.setName('boop').setDescription('Toca la nariz de alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a tocar la nariz').setRequired(true)))
        .addSubcommand(sub => sub.setName('spank').setDescription('Dale una nalgada a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a darle nalgada').setRequired(true)))
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario', true);
            const author = interaction.user;

            Validators.validateNotSelf(author, target);
            Validators.validateNotBot(target);
            await Validators.validateNotBlocked(
                author,
                target,
                (interaction.client as BotClient).blockManager
            );

            await interaction.deferReply();

            if (REQUIRE_REQUEST.includes(subcommand)) {
                await handleRequestAction(interaction, subcommand, author, target);
            } else {
                await handleDirectAction(interaction, subcommand, author, target);
            }

        } catch (error) {
            await handleCommandError(error, interaction, 'interact');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase() as ActionType;
            const validSubcommands = Object.keys(ACTION_QUERIES);

            if (!subcommand) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('💫 Comandos de Interacción')
                    .setDescription(
                        `Usa: \`${config.prefix}interact <acción> @usuario\`\n\n` +
                        `**Con solicitud (requieren aceptación):**\n` +
                        REQUIRE_REQUEST.map(cmd => `${ACTION_CONFIG[cmd].emoji} \`${cmd}\` - ${ACTION_CONFIG[cmd].name}`).join('\n') +
                        `\n\n**Directas (sin solicitud):**\n` +
                        DIRECT_ACTIONS.map(cmd => `${ACTION_CONFIG[cmd].emoji} \`${cmd}\` - ${ACTION_CONFIG[cmd].name}`).join('\n')
                    )
                    .setColor(COLORS.INTERACTION)
                    .setFooter({ text: '¡Interactúa con tus amigos!' });

                await message.reply({ embeds: [helpEmbed] });
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(`❌ Acción no válida: **${subcommand}**`);
                return;
            }

            const query = args[1] || message.mentions.users.first()?.id;
            if (!query) {
                await message.reply('❌ Menciona a un usuario o usa su ID.');
                return;
            }

            const targetMember = await UserSearchHelper.findMember(message.guild!, query);
            if (!targetMember) {
                await message.reply(`❌ No se encontró al usuario: **${query}**`);
                return;
            }

            const target = targetMember.user;

            Validators.validateNotSelf(message.author, target);
            Validators.validateNotBot(target);
            await Validators.validateNotBlocked(
                message.author,
                target,
                (message.client as BotClient).blockManager
            );

            if (REQUIRE_REQUEST.includes(subcommand)) {
                await handleRequestActionPrefix(message, subcommand, message.author, target);
            } else {
                await handleDirectActionPrefix(message, subcommand, message.author, target);
            }

        } catch (error) {
            await handleCommandError(error, message, 'interact');
        }
    },
};

async function handleDirectAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: User,
    target: User
): Promise<void> {
    try {
        const config = ACTION_CONFIG[action];
        const gifURL = await getInteractionGif(ACTION_QUERIES[action]);

        const embed = new EmbedBuilder()
            .setDescription(`${config.emoji} ${config.successMessage(author.displayName, target.displayName)}`)
            .setImage(gifURL)
            .setColor(config.color)
            .setFooter({ text: config.footer })
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
    target: User
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando...');

    try {
        const actionConfig = ACTION_CONFIG[action];
        const gifUrl = await getInteractionGif(ACTION_QUERIES[action]);

        const embed = new EmbedBuilder()
            .setDescription(`${actionConfig.emoji} ${actionConfig.successMessage(author.displayName, target.displayName)}`)
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
            `${actionConfig.requestMessage(author.displayName, target.displayName)}\n\n` +
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
            logger.error('interact', 'Error creando solicitud', error);
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
            `${actionConfig.requestMessage(author.displayName, target.displayName)}\n\n` +
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
            logger.error('interact', 'Error creando solicitud', error);
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
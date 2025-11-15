import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getRandomGif } from '../../utils/tenor.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { config } from '../../config.js';

/**
 * Queries de búsqueda para Tenor API
 */
const ACTION_QUERIES = {
    // Interacciones con solicitud (requieren objetivo)
    hug: 'anime hug',
    kiss: 'anime kiss',
    pat: 'anime head pat',
    cuddle: 'anime cuddle',

    // Interacciones directas (requieren objetivo)
    slap: 'anime slap',
    poke: 'anime poke',
    bite: 'anime bite',
    tickle: 'anime tickle',
    bonk: 'anime bonk',
    boop: 'anime boop',

    // Interacciones autodirigidas (objetivo opcional)
    wave: 'anime wave',
    pout: 'anime pout',
    cry: 'anime cry',
    dance: 'anime dance',
    happy: 'anime happy',
    laugh: 'anime laugh',
    shrug: 'anime shrug',
    sleep: 'anime sleep',
    yawn: 'anime yawn',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

/**
 * Interacciones que requieren solicitud y aceptación (siempre necesitan objetivo)
 */
const REQUIRE_REQUEST: ActionType[] = ['hug', 'kiss', 'pat', 'cuddle'];

/**
 * Interacciones que se ejecutan directamente sin solicitud (siempre necesitan objetivo)
 */
const DIRECT_ACTIONS: ActionType[] = ['slap', 'poke', 'bite', 'tickle', 'bonk', 'boop'];

/**
 * Interacciones que pueden ser autodirigidas (objetivo opcional)
 */
const SELF_ALLOWED_ACTIONS: ActionType[] = ['wave', 'pout', 'cry', 'dance', 'happy', 'laugh', 'shrug', 'sleep', 'yawn'];

/**
 * Mensajes para solicitudes (requieren aceptación)
 */
const REQUEST_MESSAGES: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    hug: (author, target) => `**${author}** quiere abrazar a **${target}** 🤗`,
    kiss: (author, target) => `**${author}** quiere besar a **${target}** 😘`,
    pat: (author, target) => `**${author}** quiere acariciar la cabeza de **${target}** 😊`,
    cuddle: (author, target) => `**${author}** quiere acurrucarse con **${target}** 🥰`,
};

/**
 * Mensajes para acciones directas (sin solicitud, requieren objetivo)
 */
const DIRECT_MESSAGES: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    slap: (author, target) => `**${author}** abofetea a **${target}** 🖐️`,
    poke: (author, target) => `**${author}** molesta a **${target}** 👉`,
    bite: (author, target) => `**${author}** muerde a **${target}** 😬`,
    tickle: (author, target) => `**${author}** le hace cosquillas a **${target}** 🤭`,
    bonk: (author, target) => `**${author}** le da un golpe juguetón a **${target}** 🔨`,
    boop: (author, target) => `**${author}** toca la nariz de **${target}** 👆`,
};

/**
 * Mensajes para acciones autodirigidas CON objetivo
 */
const SELF_MESSAGES_WITH_TARGET: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    wave: (author, target) => `**${author}** saluda a **${target}** 👋`,
    pout: (author, target) => `**${author}** le hace pucheros a **${target}** 🥺`,
    cry: (author, target) => `**${author}** llora por **${target}** 😢`,
    dance: (author, target) => `**${author}** baila con **${target}** 💃`,
    happy: (author, target) => `**${author}** está feliz con **${target}** 😊`,
    laugh: (author, target) => `**${author}** se ríe con **${target}** 😂`,
    shrug: (author, target) => `**${author}** se encoge de hombros ante **${target}** 🤷`,
    sleep: (author, target) => `**${author}** se duerme junto a **${target}** 😴`,
    yawn: (author, target) => `**${author}** bosteza frente a **${target}** 🥱`,
};

/**
 * Mensajes para acciones autodirigidas SIN objetivo
 */
const SELF_MESSAGES_SOLO: Partial<Record<ActionType, (author: string) => string>> = {
    wave: (author) => `**${author}** saluda 👋`,
    pout: (author) => `**${author}** hace pucheros 🥺`,
    cry: (author) => `**${author}** está llorando 😢`,
    dance: (author) => `**${author}** está bailando 💃`,
    happy: (author) => `**${author}** está feliz 😊`,
    laugh: (author) => `**${author}** se está riendo 😂`,
    shrug: (author) => `**${author}** se encoge de hombros 🤷`,
    sleep: (author) => `**${author}** se fue a dormir 😴`,
    yawn: (author) => `**${author}** está bostezando 🥱`,
};

const ACTION_EMOJIS: Record<ActionType, string> = {
    hug: '🤗', kiss: '😘', pat: '😊', cuddle: '🥰',
    slap: '🖐️', poke: '👉', bite: '😬', tickle: '🤭', bonk: '🔨', boop: '👆',
    wave: '👋', pout: '🥺', cry: '😢', dance: '💃', happy: '😊', laugh: '😂',
    shrug: '🤷', sleep: '😴', yawn: '🥱',
};

export const interact: HybridCommand = {
    type: 'hybrid',
    name: 'interact',
    description: 'Comandos de interacción con otros usuarios',
    category: CATEGORIES.INTERACTION,
    subcommands: [
        // Con solicitud (requieren objetivo)
        { name: 'hug', aliases: ['abrazo', 'abrazar'], description: 'Abraza a alguien (requiere aceptación)' },
        { name: 'kiss', aliases: ['beso', 'besar'], description: 'Besa a alguien (requiere aceptación)' },
        { name: 'pat', aliases: ['acariciar'], description: 'Acaricia la cabeza (requiere aceptación)' },
        { name: 'cuddle', aliases: ['acurrucar'], description: 'Acurrúcate (requiere aceptación)' },

        // Directas (requieren objetivo)
        { name: 'slap', aliases: ['cachetada', 'bofetada'], description: 'Abofetea a alguien' },
        { name: 'poke', aliases: ['molestar'], description: 'Molesta a alguien' },
        { name: 'bite', aliases: ['morder'], description: 'Muerde a alguien' },
        { name: 'tickle', aliases: ['cosquillas'], description: 'Haz cosquillas' },
        { name: 'bonk', aliases: ['golpear'], description: 'Golpe juguetón' },
        { name: 'boop', aliases: [], description: 'Toca la nariz' },

        // Autodirigidas (objetivo opcional)
        { name: 'wave', aliases: ['saludar', 'saludo'], description: 'Saluda' },
        { name: 'pout', aliases: ['puchero'], description: 'Haz pucheros' },
        { name: 'cry', aliases: ['llorar'], description: 'Llora' },
        { name: 'dance', aliases: ['bailar'], description: 'Baila' },
        { name: 'happy', aliases: ['feliz'], description: 'Muestra felicidad' },
        { name: 'laugh', aliases: ['reir'], description: 'Ríe' },
        { name: 'shrug', aliases: [], description: 'Encógete de hombros' },
        { name: 'sleep', aliases: ['dormir'], description: 'Duerme' },
        { name: 'yawn', aliases: ['bostezar'], description: 'Bosteza' },
    ],

    data: new SlashCommandBuilder()
        .setName('interact')
        .setDescription('Comandos de interacción con otros usuarios')
        // Con solicitud
        .addSubcommand(sub => sub.setName('hug').setDescription('Abraza a alguien (requiere aceptación)')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a abrazar').setRequired(true)))
        .addSubcommand(sub => sub.setName('kiss').setDescription('Besa a alguien (requiere aceptación)')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a besar').setRequired(true)))
        .addSubcommand(sub => sub.setName('pat').setDescription('Acaricia la cabeza (requiere aceptación)')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a acariciar').setRequired(true)))
        .addSubcommand(sub => sub.setName('cuddle').setDescription('Acurrúcate (requiere aceptación)')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario con quien acurrucarse').setRequired(true)))
        // Directas
        .addSubcommand(sub => sub.setName('slap').setDescription('Abofetea a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a abofetear').setRequired(true)))
        .addSubcommand(sub => sub.setName('poke').setDescription('Molesta a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a molestar').setRequired(true)))
        .addSubcommand(sub => sub.setName('bite').setDescription('Muerde a alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a morder').setRequired(true)))
        .addSubcommand(sub => sub.setName('tickle').setDescription('Haz cosquillas')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a hacerle cosquillas').setRequired(true)))
        .addSubcommand(sub => sub.setName('bonk').setDescription('Dale un golpe juguetón')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a golpear juguetonamente').setRequired(true)))
        .addSubcommand(sub => sub.setName('boop').setDescription('Toca la nariz de alguien')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a tocar la nariz').setRequired(true)))
        // Autodirigidas (usuario opcional)
        .addSubcommand(sub => sub.setName('wave').setDescription('Saluda')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a saludar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('pout').setDescription('Haz pucheros')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién hacer pucheros (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('cry').setDescription('Llora')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién llorar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('dance').setDescription('Baila')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién bailar (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('happy').setDescription('Muestra felicidad')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién estar feliz (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('laugh').setDescription('Ríe')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién reír (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('shrug').setDescription('Encógete de hombros')
            .addUserOption(opt => opt.setName('usuario').setDescription('Ante quién encogerse (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('sleep').setDescription('Duerme')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién dormir (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('yawn').setDescription('Bosteza')
            .addUserOption(opt => opt.setName('usuario').setDescription('Frente a quién bostezar (opcional)').setRequired(false)))
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario');
            const author = interaction.user;

            // Validaciones básicas si hay objetivo
            if (target) {
                Validators.validateNotSelf(author, target);
                Validators.validateNotBot(target);
            }

            // Determinar tipo de acción
            if (SELF_ALLOWED_ACTIONS.includes(subcommand)) {
                // Acción autodirigida (con o sin objetivo)
                await handleSelfAction(interaction, subcommand, author, target);
            } else if (DIRECT_ACTIONS.includes(subcommand)) {
                // Acción directa (requiere objetivo)
                if (!target) {
                    await interaction.reply({
                        content: `❌ Esta acción requiere mencionar a un usuario.`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
                await handleDirectAction(interaction, subcommand, author, target);
            } else if (REQUIRE_REQUEST.includes(subcommand)) {
                // Acción con solicitud (requiere objetivo)
                if (!target) {
                    await interaction.reply({
                        content: `❌ Esta acción requiere mencionar a un usuario.`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
                await handleRequestAction(interaction, subcommand, author, target);
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
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}interact <acción> [@usuario]\`\n\n` +
                    `**Con solicitud:**\n${REQUIRE_REQUEST.map(cmd => `• \`${cmd}\` (requiere @usuario)`).join('\n')}\n\n` +
                    `**Directas:**\n${DIRECT_ACTIONS.map(cmd => `• \`${cmd}\` (requiere @usuario)`).join('\n')}\n\n` +
                    `**Expresiones:**\n${SELF_ALLOWED_ACTIONS.map(cmd => `• \`${cmd}\` (@usuario opcional)`).join('\n')}`
                );
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(
                    `❌ Acción no válida: **${subcommand}**\n\n` +
                    `**Acciones disponibles:**\n${validSubcommands.map(cmd => `• \`${cmd}\``).join('\n')}`
                );
                return;
            }

            const target = message.mentions.users.first();

            // Validaciones si hay objetivo
            if (target) {
                Validators.validateNotSelf(message.author, target);
                Validators.validateNotBot(target);
            }

            // Determinar tipo de acción
            if (SELF_ALLOWED_ACTIONS.includes(subcommand)) {
                await handleSelfActionPrefix(message, subcommand, message.author, target);
            } else if (DIRECT_ACTIONS.includes(subcommand)) {
                if (!target) {
                    await message.reply(`❌ Esta acción requiere mencionar a un usuario: \`${config.prefix}${subcommand} @usuario\``);
                    return;
                }
                await handleDirectActionPrefix(message, subcommand, message.author, target);
            } else if (REQUIRE_REQUEST.includes(subcommand)) {
                if (!target) {
                    await message.reply(`❌ Esta acción requiere mencionar a un usuario: \`${config.prefix}${subcommand} @usuario\``);
                    return;
                }
                Validators.validateUserProvided(target);
                await handleRequestActionPrefix(message, subcommand, message.author, target);
            }

        } catch (error) {
            await handleCommandError(error, message, 'interact');
        }
    },
};

// ==================== HANDLERS ====================

async function handleSelfAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any | null
): Promise<void> {
    await interaction.deferReply();

    try {
        const gifURL = await getRandomGif(ACTION_QUERIES[action]);
        const message = target
            ? SELF_MESSAGES_WITH_TARGET[action]!(author.displayName, target.displayName)
            : SELF_MESSAGES_SOLO[action]!(author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifURL)
            .setColor(COLORS.INTERACTION);

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Error obteniendo GIF de Tenor',
            '❌ No se pudo obtener el GIF. Intenta de nuevo.'
        );
    }
}

async function handleSelfActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any | undefined
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando GIF...');

    try {
        const gifUrl = await getRandomGif(ACTION_QUERIES[action]);
        const messageText = target
            ? SELF_MESSAGES_WITH_TARGET[action]!(author.displayName, target.displayName)
            : SELF_MESSAGES_SOLO[action]!(author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(messageText)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Error obteniendo GIF de Tenor',
            '❌ No se pudo obtener el GIF. Intenta de nuevo.'
        );
    }
}

async function handleDirectAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    await interaction.deferReply();

    try {
        const gifURL = await getRandomGif(ACTION_QUERIES[action]);
        const message = DIRECT_MESSAGES[action]!(author.displayName, target.displayName);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifURL)
            .setColor(COLORS.INTERACTION);

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Error obteniendo GIF de Tenor',
            '❌ No se pudo obtener el GIF. Intenta de nuevo.'
        );
    }
}

async function handleDirectActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando GIF...');

    try {
        const gifUrl = await getRandomGif(ACTION_QUERIES[action]);
        const messageText = DIRECT_MESSAGES[action]!(author.displayName, target.displayName);

        const embed = new EmbedBuilder()
            .setDescription(messageText)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Error obteniendo GIF de Tenor',
            '❌ No se pudo obtener el GIF. Intenta de nuevo.'
        );
    }
}

async function handleRequestAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestManager = (interaction.client as BotClient).requestManager;
    if (!requestManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'RequestManager no disponible',
            '❌ El sistema de solicitudes no está disponible.'
        );
    }

    if (requestManager.hasPendingRequest(author.id)) {
        const pendingRequest = requestManager.getPendingRequest(author.id);
        const remainingMs = requestManager.getRemainingTime(author.id);
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        await interaction.reply({
            content: `⏱️ Ya tienes una solicitud pendiente con <@${pendingRequest?.targetId}>.\n` +
                `Espera a que responda o espera ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''} para que expire.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const requestEmbed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(REQUEST_MESSAGES[action]!(author.displayName, target.displayName))
        .addFields({
            name: '⏰ Tiempo de espera',
            value: 'Esta solicitud expira en **10 minutos**',
            inline: false
        })
        .setColor(COLORS.INTERACTION)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
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

    const response = await interaction.reply({
        content: `<@${target.id}>`,
        embeds: [requestEmbed],
        components: [row]
    });

    const message = await response.fetch();
    requestManager.createRequest(author.id, target.id, action, message.id, interaction.id);
}

async function handleRequestActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestManager = (message.client as BotClient).requestManager;
    if (!requestManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'RequestManager no disponible',
            '❌ El sistema de solicitudes no está disponible.'
        );
    }

    if (requestManager.hasPendingRequest(author.id)) {
        const pendingRequest = requestManager.getPendingRequest(author.id);
        const remainingMs = requestManager.getRemainingTime(author.id);
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        await message.reply(
            `⏱️ Ya tienes una solicitud pendiente con <@${pendingRequest?.targetId}>.\n` +
            `Espera a que responda o espera ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''} para que expire.`
        );
        return;
    }

    const requestEmbed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(REQUEST_MESSAGES[action]!(author.displayName, target.displayName))
        .addFields({
            name: '⏰ Tiempo de espera',
            value: 'Esta solicitud expira en **10 minutos**',
            inline: false
        })
        .setColor(COLORS.INTERACTION)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
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

    const sentMessage = await message.reply({
        content: `<@${target.id}>`,
        embeds: [requestEmbed],
        components: [row]
    });

    requestManager.createRequest(author.id, target.id, action, sentMessage.id, `prefix_${message.id}`);
}
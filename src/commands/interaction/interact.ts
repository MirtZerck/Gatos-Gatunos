import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getRandomGif } from '../../utils/tenor.js';
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
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

// Acciones que requieren solicitud con botones
const REQUIRE_REQUEST: ActionType[] = ['hug', 'kiss', 'pat', 'cuddle'];
// Acciones directas sin solicitud
const DIRECT_ACTIONS: ActionType[] = ['slap', 'poke', 'bite', 'tickle', 'bonk', 'boop'];

const REQUEST_MESSAGES: Record<ActionType, (author: string, target: string) => string> = {
    hug: (author, target) => `**${author}** quiere abrazar a **${target}** 🤗`,
    kiss: (author, target) => `**${author}** quiere besar a **${target}** 😘`,
    pat: (author, target) => `**${author}** quiere acariciar la cabeza de **${target}** 😊`,
    cuddle: (author, target) => `**${author}** quiere acurrucarse con **${target}** 🥰`,
    slap: (author, target) => `**${author}** abofetea a **${target}** 🖐️`,
    poke: (author, target) => `**${author}** molesta a **${target}** 👉`,
    bite: (author, target) => `**${author}** muerde a **${target}** 😬`,
    tickle: (author, target) => `**${author}** le hace cosquillas a **${target}** 🤭`,
    bonk: (author, target) => `**${author}** le da un golpe juguetón a **${target}** 🔨`,
    boop: (author, target) => `**${author}** toca la nariz de **${target}** 👆`,
};

const ACTION_EMOJIS: Record<ActionType, string> = {
    hug: '🤗', kiss: '😘', pat: '😊', cuddle: '🥰',
    slap: '🖐️', poke: '👉', bite: '😬', tickle: '🤭', bonk: '🔨', boop: '👆',
};

const ACTION_NAMES: Record<ActionType, string> = {
    hug: 'abrazo',
    kiss: 'beso',
    pat: 'caricia',
    cuddle: 'acurrucada',
    slap: 'bofetada',
    poke: 'molestia',
    bite: 'mordida',
    tickle: 'cosquillas',
    bonk: 'golpe juguetón',
    boop: 'toque de nariz',
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
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario', true);
            const author = interaction.user;

            // ✅ PASO 1: Validaciones rápidas
            Validators.validateNotSelf(author, target);
            Validators.validateNotBot(target);

            // ✅ PASO 2: DEFER INMEDIATO
            await interaction.deferReply();

            // ✅ PASO 3: Decidir flujo según tipo de acción
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
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}interact <acción> @usuario\`\n\n` +
                    `**Con solicitud:** ${REQUIRE_REQUEST.join(', ')}\n` +
                    `**Directas:** ${DIRECT_ACTIONS.join(', ')}`
                );
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(`❌ Acción no válida: **${subcommand}**`);
                return;
            }

            // 🆕 Búsqueda avanzada de usuario
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

// ==================== HANDLERS PARA ACCIONES DIRECTAS ====================

async function handleDirectAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    try {
        const gifURL = await getRandomGif(ACTION_QUERIES[action]);
        const message = REQUEST_MESSAGES[action](author.displayName, target.displayName);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifURL)
            .setColor(COLORS.INTERACTION);

        // Ya hicimos defer, usar editReply
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
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
        const messageText = REQUEST_MESSAGES[action](author.displayName, target.displayName);

        const embed = new EmbedBuilder()
            .setDescription(messageText)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

// ==================== HANDLERS PARA SOLICITUDES CON BOTONES ====================

async function handleRequestAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestManager = (interaction.client as BotClient).requestManager;

    // ✅ Verificar solicitud pendiente
    if (requestManager && requestManager.hasPendingRequestWith(author.id, target.id)) {
        const remainingTime = requestManager.getRemainingTimeWith(author.id, target.id);
        const minutes = Math.ceil(remainingTime / 60000);

        await interaction.editReply({
            content: `⏱️ Ya tienes una solicitud pendiente de **${action}** con **${target.displayName}**.\n` +
                `Expira en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`
        });
        return;
    }

    // ✅ Calcular timestamp de expiración (10 minutos desde ahora)
    const expiresAt = Date.now() + 600000; // 10 minutos en ms
    const expiresTimestamp = Math.floor(expiresAt / 1000);

    // ✅ Crear embed de solicitud con tiempo de expiración visible
    const requestEmbed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(
            `${target}, **${author.displayName}** quiere darte un **${ACTION_NAMES[action]}**.\n\n` +
            `¿Aceptas?\n\n` +
            `⏰ Expira: <t:${expiresTimestamp}:R>`
        )
        .setColor(COLORS.INFO)
        .setFooter({
            text: `De: ${author.tag} | Responde antes de que expire`,
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

    // ✅ Registrar en RequestManager
    if (requestManager) {
        try {
            requestManager.createRequest(
                author.id,
                target.id,
                action,
                message.id,
                interaction.id,
                600000 // 10 minutos
            );
        } catch (error) {
            logger.error('interact', 'Error creando solicitud', error);
        }
    }

    // ✅ Timeout de 10 minutos
    setTimeout(async () => {
        try {
            const currentMessage = await interaction.fetchReply();
            if (currentMessage.components.length > 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setDescription(
                        `⏰ ${target.displayName} no respondió a tiempo.\n\n` +
                        `La solicitud de **${ACTION_NAMES[action]}** ha expirado.`
                    )
                    .setColor(COLORS.WARNING)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });

                if (requestManager) {
                    requestManager.resolveRequestWith(author.id, target.id);
                }
            }
        } catch {
            // Mensaje eliminado o error
        }
    }, 600000);
}

// ✅ Versión para prefix con mismo formato
async function handleRequestActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestManager = (message.client as BotClient).requestManager;

    if (requestManager && requestManager.hasPendingRequestWith(author.id, target.id)) {
        const remainingTime = requestManager.getRemainingTimeWith(author.id, target.id);
        const minutes = Math.ceil(remainingTime / 60000);

        await message.reply(
            `⏱️ Ya tienes una solicitud pendiente de **${action}** con **${target.displayName}**.\n` +
            `Expira en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`
        );
        return;
    }

    const expiresAt = Date.now() + 600000;
    const expiresTimestamp = Math.floor(expiresAt / 1000);

    const requestEmbed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(
            `${target}, **${author.displayName}** quiere darte un **${ACTION_NAMES[action]}**.\n\n` +
            `¿Aceptas?\n\n` +
            `⏰ Expira: <t:${expiresTimestamp}:R>`
        )
        .setColor(COLORS.INFO)
        .setFooter({
            text: `De: ${author.tag} | Responde antes de que expire`,
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
                    .setDescription(
                        `⏰ ${target.displayName} no respondió a tiempo.\n\n` +
                        `La solicitud de **${ACTION_NAMES[action]}** ha expirado.`
                    )
                    .setColor(COLORS.WARNING)
                    .setTimestamp();

                await requestMessage.edit({
                    embeds: [timeoutEmbed],
                    components: []
                });

                if (requestManager) {
                    requestManager.resolveRequestWith(author.id, target.id);
                }
            }
        } catch {
            // Ignorar
        }
    }, 600000);
}
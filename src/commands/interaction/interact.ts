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

const ACTION_QUERIES = {
    // Con solicitud (íntimas/románticas)
    hug: 'anime hug',
    kiss: 'anime kiss',
    pat: 'anime head pat',
    cuddle: 'anime cuddle',

    // Sin solicitud (juguetonas/agresivas)
    slap: 'anime slap',
    poke: 'anime poke',
    bite: 'anime bite',
    tickle: 'anime tickle',
    bonk: 'anime bonk',
    boop: 'anime boop',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

const REQUIRE_REQUEST: ActionType[] = ['hug', 'kiss', 'pat', 'cuddle'];
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

            // Diferir la respuesta inmediatamente para evitar que expire la interacción
            await interaction.deferReply();

            // Validar después de deferReply (si fallan, editaremos la respuesta)
            try {
                Validators.validateNotSelf(author, target);
                Validators.validateNotBot(target);
            } catch (validationError) {
                const errorMessage = validationError instanceof CommandError 
                    ? validationError.userMessage 
                    : '❌ Error de validación.';
                await interaction.editReply({ content: errorMessage });
                return;
            }

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

            const target = message.mentions.users.first();
            Validators.validateUserProvided(target);
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

async function handleDirectAction(interaction: ChatInputCommandInteraction, action: ActionType, author: any, target: any): Promise<void> {
    // Nota: deferReply ya se hizo en executeSlash, así que no lo hacemos aquí
    try {
        const gifURL = await getRandomGif(ACTION_QUERIES[action]);
        const embed = new EmbedBuilder()
            .setDescription(REQUEST_MESSAGES[action](author.displayName, target.displayName))
            .setImage(gifURL)
            .setColor(COLORS.INTERACTION);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

async function handleDirectActionPrefix(message: Message, action: ActionType, author: any, target: any): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando GIF...');
    try {
        const gifUrl = await getRandomGif(ACTION_QUERIES[action]);
        const embed = new EmbedBuilder()
            .setDescription(REQUEST_MESSAGES[action](author.displayName, target.displayName))
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);
        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

async function handleRequestAction(interaction: ChatInputCommandInteraction, action: ActionType, author: any, target: any): Promise<void> {
    const requestManager = (interaction.client as BotClient).requestManager;
    if (!requestManager) {
        await interaction.editReply({
            content: '❌ Sistema no disponible.'
        });
        return;
    }

    if (requestManager.hasPendingRequest(author.id)) {
        const pending = requestManager.getPendingRequest(author.id);
        const remaining = Math.ceil(requestManager.getRemainingTime(author.id) / 60000);
        await interaction.editReply({
            content: `⏱️ Ya tienes una solicitud pendiente con <@${pending?.targetId}>. Espera ${remaining} min.`
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(REQUEST_MESSAGES[action](author.displayName, target.displayName))
        .addFields({ name: '⏰ Tiempo', value: 'Expira en **10 minutos**' })
        .setColor(COLORS.INTERACTION)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`interact_accept_${action}`).setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId(`interact_reject_${action}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    // Usar editReply en lugar de reply ya que ya hicimos deferReply
    const message = await interaction.editReply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
    requestManager.createRequest(author.id, target.id, action, message.id, interaction.id);
}

async function handleRequestActionPrefix(message: Message, action: ActionType, author: any, target: any): Promise<void> {
    const requestManager = (message.client as BotClient).requestManager;
    if (!requestManager) {
        throw new CommandError(ErrorType.UNKNOWN, 'RequestManager no disponible', '❌ Sistema no disponible.');
    }

    if (requestManager.hasPendingRequest(author.id)) {
        const pending = requestManager.getPendingRequest(author.id);
        const remaining = Math.ceil(requestManager.getRemainingTime(author.id) / 60000);
        await message.reply(`⏱️ Ya tienes una solicitud pendiente con <@${pending?.targetId}>. Espera ${remaining} min.`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(REQUEST_MESSAGES[action](author.displayName, target.displayName))
        .addFields({ name: '⏰ Tiempo', value: 'Expira en **10 minutos**' })
        .setColor(COLORS.INTERACTION)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`interact_accept_${action}`).setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId(`interact_reject_${action}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    const sentMessage = await message.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
    requestManager.createRequest(author.id, target.id, action, sentMessage.id, `prefix_${message.id}`);
}
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getRandomGif } from '../../utils/tenor.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';

const ACTION_QUERIES = {
    smile: 'anime smile',
    laugh: 'anime laugh',
    cry: 'anime cry',
    blush: 'anime blush',
    pout: 'anime pout',
    angry: 'anime angry',
    confused: 'anime confused',
    shocked: 'anime shocked',
    happy: 'anime happy',
    sad: 'anime sad',
    sleep: 'anime sleep',
    yawn: 'anime yawn',
    shrug: 'anime shrug',
    think: 'anime think',
    stare: 'anime stare',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

// Mensajes CON objetivo (causado por alguien)
const MESSAGES_WITH_TARGET: Record<ActionType, (author: string, target: string) => string> = {
    smile: (author, target) => `**${author}** sonríe gracias a **${target}** 😊`,
    laugh: (author, target) => `**${author}** se ríe por **${target}** 😂`,
    cry: (author, target) => `**${author}** llora por **${target}** 😢`,
    blush: (author, target) => `**${author}** se sonroja por **${target}** 😳`,
    pout: (author, target) => `**${author}** le hace pucheros a **${target}** 🥺`,
    angry: (author, target) => `**${author}** está enojado con **${target}** 😠`,
    confused: (author, target) => `**${author}** está confundido por **${target}** 😕`,
    shocked: (author, target) => `**${author}** está sorprendido por **${target}** 😱`,
    happy: (author, target) => `**${author}** está feliz con **${target}** 😄`,
    sad: (author, target) => `**${author}** está triste por **${target}** 😔`,
    sleep: (author, target) => `**${author}** se duerme pensando en **${target}** 😴`,
    yawn: (author, target) => `**${author}** bosteza frente a **${target}** 🥱`,
    shrug: (author, target) => `**${author}** se encoge de hombros ante **${target}** 🤷`,
    think: (author, target) => `**${author}** piensa en **${target}** 🤔`,
    stare: (author, target) => `**${author}** mira fijamente a **${target}** 👀`,
};

// Mensajes SIN objetivo (solo)
const MESSAGES_SOLO: Record<ActionType, (author: string) => string> = {
    smile: (author) => `**${author}** está sonriendo 😊`,
    laugh: (author) => `**${author}** se está riendo 😂`,
    cry: (author) => `**${author}** está llorando 😢`,
    blush: (author) => `**${author}** se está sonrojando 😳`,
    pout: (author) => `**${author}** está haciendo pucheros 🥺`,
    angry: (author) => `**${author}** está enojado 😠`,
    confused: (author) => `**${author}** está confundido 😕`,
    shocked: (author) => `**${author}** está sorprendido 😱`,
    happy: (author) => `**${author}** está feliz 😄`,
    sad: (author) => `**${author}** está triste 😔`,
    sleep: (author) => `**${author}** se fue a dormir 😴`,
    yawn: (author) => `**${author}** está bostezando 🥱`,
    shrug: (author) => `**${author}** se encoge de hombros 🤷`,
    think: (author) => `**${author}** está pensando 🤔`,
    stare: (author) => `**${author}** está mirando fijamente 👀`,
};

export const react: HybridCommand = {
    type: 'hybrid',
    name: 'react',
    description: 'Reacciones y expresiones emocionales',
    category: CATEGORIES.INTERACTION,
    subcommands: [
        { name: 'smile', aliases: ['sonreir'], description: 'Sonríe' },
        { name: 'laugh', aliases: ['reir'], description: 'Ríe' },
        { name: 'cry', aliases: ['llorar'], description: 'Llora' },
        { name: 'blush', aliases: ['sonrojar'], description: 'Sonrójate' },
        { name: 'pout', aliases: ['puchero'], description: 'Haz pucheros' },
        { name: 'angry', aliases: ['enojado'], description: 'Enójate' },
        { name: 'confused', aliases: ['confundido'], description: 'Confúndete' },
        { name: 'shocked', aliases: ['sorprendido'], description: 'Sorpréndete' },
        { name: 'happy', aliases: ['feliz'], description: 'Sé feliz' },
        { name: 'sad', aliases: ['triste'], description: 'Entristécete' },
        { name: 'sleep', aliases: ['dormir'], description: 'Duerme' },
        { name: 'yawn', aliases: ['bostezar'], description: 'Bosteza' },
        { name: 'shrug', aliases: [], description: 'Encógete de hombros' },
        { name: 'think', aliases: ['pensar'], description: 'Piensa' },
        { name: 'stare', aliases: ['mirar'], description: 'Mira fijamente' },
    ],

    data: new SlashCommandBuilder()
        .setName('react')
        .setDescription('Reacciones y expresiones emocionales')
        .addSubcommand(sub => sub.setName('smile').setDescription('Sonríe')
            .addUserOption(opt => opt.setName('usuario').setDescription('Gracias a quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('laugh').setDescription('Ríe')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('cry').setDescription('Llora')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('blush').setDescription('Sonrójate')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('pout').setDescription('Haz pucheros')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('angry').setDescription('Enójate')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('confused').setDescription('Confúndete')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('shocked').setDescription('Sorpréndete')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('happy').setDescription('Sé feliz')
            .addUserOption(opt => opt.setName('usuario').setDescription('Con quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('sad').setDescription('Entristécete')
            .addUserOption(opt => opt.setName('usuario').setDescription('Por quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('sleep').setDescription('Duerme')
            .addUserOption(opt => opt.setName('usuario').setDescription('Pensando en quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('yawn').setDescription('Bosteza')
            .addUserOption(opt => opt.setName('usuario').setDescription('Frente a quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('shrug').setDescription('Encógete de hombros')
            .addUserOption(opt => opt.setName('usuario').setDescription('Ante quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('think').setDescription('Piensa')
            .addUserOption(opt => opt.setName('usuario').setDescription('En quién (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('stare').setDescription('Mira fijamente')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién (opcional)').setRequired(false)))
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario');
            const author = interaction.user;

            // Diferir la respuesta inmediatamente para evitar que expire la interacción
            await interaction.deferReply();

            // Validar después de deferReply (si fallan, editaremos la respuesta)
            if (target) {
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
            }

            await handleReaction(interaction, subcommand, author, target);

        } catch (error) {
            await handleCommandError(error, interaction, 'react');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase() as ActionType;
            const validSubcommands = Object.keys(ACTION_QUERIES);

            if (!subcommand) {
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}react <reacción> [@usuario]\`\n\n` +
                    `**Reacciones disponibles:**\n${validSubcommands.map(cmd => `• \`${cmd}\``).join(', ')}`
                );
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(`❌ Reacción no válida: **${subcommand}**`);
                return;
            }

            const target = message.mentions.users.first();

            if (target) {
                Validators.validateNotSelf(message.author, target);
                Validators.validateNotBot(target);
            }

            await handleReactionPrefix(message, subcommand, message.author, target);

        } catch (error) {
            await handleCommandError(error, message, 'react');
        }
    },
};

// ==================== HANDLERS ====================

async function handleReaction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any | null
): Promise<void> {
    // Nota: deferReply ya se hizo en executeSlash, así que no lo hacemos aquí
    try {
        const gifURL = await getRandomGif(ACTION_QUERIES[action]);

        const message = target
            ? MESSAGES_WITH_TARGET[action](author.displayName, target.displayName)
            : MESSAGES_SOLO[action](author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifURL)
            .setColor(COLORS.INTERACTION);

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

async function handleReactionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any | undefined
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando GIF...');

    try {
        const gifUrl = await getRandomGif(ACTION_QUERIES[action]);

        const messageText = target
            ? MESSAGES_WITH_TARGET[action](author.displayName, target.displayName)
            : MESSAGES_SOLO[action](author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(messageText)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}
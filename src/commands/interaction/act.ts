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
    // Con solicitud si hay objetivo
    dance: 'anime dance',
    sing: 'anime sing',
    highfive: 'anime high five',

    // Sin solicitud (objetivo opcional)
    wave: 'anime wave',
    bow: 'anime bow',
    clap: 'anime clap',
    cheer: 'anime cheer',
    salute: 'anime salute',
    nod: 'anime nod',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

// Acciones que requieren solicitud SI hay objetivo
const REQUIRE_REQUEST_WITH_TARGET: ActionType[] = ['dance', 'sing', 'highfive'];

// Acciones que NO requieren solicitud (objetivo opcional)
const NO_REQUEST: ActionType[] = ['wave', 'bow', 'clap', 'cheer', 'salute', 'nod'];

// Mensajes cuando requieren solicitud (con objetivo)
const REQUEST_MESSAGES: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    dance: (author, target) => `**${author}** quiere bailar con **${target}** 💃`,
    sing: (author, target) => `**${author}** quiere cantar con **${target}** 🎤`,
    highfive: (author, target) => `**${author}** quiere chocar los cinco con **${target}** ✋`,
};

// Mensajes para acciones CON objetivo (sin solicitud)
const MESSAGES_WITH_TARGET: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    wave: (author, target) => `**${author}** saluda a **${target}** 👋`,
    bow: (author, target) => `**${author}** hace una reverencia ante **${target}** 🙇`,
    clap: (author, target) => `**${author}** aplaude a **${target}** 👏`,
    cheer: (author, target) => `**${author}** anima a **${target}** 🎉`,
    salute: (author, target) => `**${author}** saluda militarmente a **${target}** 🫡`,
    nod: (author, target) => `**${author}** asiente ante **${target}** 👍`,
};

// Mensajes para acciones SIN objetivo (solo)
const MESSAGES_SOLO: Partial<Record<ActionType, (author: string) => string>> = {
    dance: (author) => `**${author}** está bailando 💃`,
    sing: (author) => `**${author}** está cantando 🎤`,
    wave: (author) => `**${author}** saluda 👋`,
    bow: (author) => `**${author}** hace una reverencia 🙇`,
    clap: (author) => `**${author}** está aplaudiendo 👏`,
    cheer: (author) => `**${author}** está animando 🎉`,
    salute: (author) => `**${author}** hace un saludo militar 🫡`,
    nod: (author) => `**${author}** asiente 👍`,
    highfive: (author) => `**${author}** espera un choque de manos ✋`,
};

const ACTION_EMOJIS: Record<ActionType, string> = {
    dance: '💃', sing: '🎤', highfive: '✋',
    wave: '👋', bow: '🙇', clap: '👏', cheer: '🎉', salute: '🫡', nod: '👍',
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
        { name: 'wave', aliases: ['saludar', 'saludo'], description: 'Saluda' },
        { name: 'bow', aliases: ['reverencia'], description: 'Haz una reverencia' },
        { name: 'clap', aliases: ['aplaudir'], description: 'Aplaude' },
        { name: 'cheer', aliases: ['animar'], description: 'Anima' },
        { name: 'salute', aliases: [], description: 'Saludo militar' },
        { name: 'nod', aliases: ['asentir'], description: 'Asiente' },
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

            // Si tiene objetivo Y requiere solicitud
            if (target && REQUIRE_REQUEST_WITH_TARGET.includes(subcommand)) {
                await handleRequestAction(interaction, subcommand, author, target);
            } else {
                // Sin solicitud (con o sin objetivo)
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
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}act <acción> [@usuario]\`\n\n` +
                    `**Con solicitud (si hay @usuario):** ${REQUIRE_REQUEST_WITH_TARGET.join(', ')}\n` +
                    `**Sin solicitud:** ${NO_REQUEST.join(', ')}`
                );
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(`❌ Acción no válida: **${subcommand}**`);
                return;
            }

            const target = message.mentions.users.first();

            if (target) {
                Validators.validateNotSelf(message.author, target);
                Validators.validateNotBot(target);
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

// ==================== HANDLERS ====================

async function handleDirectAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any | null
): Promise<void> {
    // Nota: deferReply ya se hizo en executeSlash, así que no lo hacemos aquí
    try {
        const gifURL = await getRandomGif(ACTION_QUERIES[action]);

        let message: string;
        if (target) {
            message = MESSAGES_WITH_TARGET[action]!(author.displayName, target.displayName);
        } else {
            message = MESSAGES_SOLO[action]!(author.displayName);
        }

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifURL)
            .setColor(COLORS.INTERACTION);

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
    }
}

async function handleDirectActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any | undefined
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando GIF...');

    try {
        const gifUrl = await getRandomGif(ACTION_QUERIES[action]);

        let messageText: string;
        if (target) {
            messageText = MESSAGES_WITH_TARGET[action]!(author.displayName, target.displayName);
        } else {
            messageText = MESSAGES_SOLO[action]!(author.displayName);
        }

        const embed = new EmbedBuilder()
            .setDescription(messageText)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(ErrorType.API_ERROR, 'Error obteniendo GIF', '❌ No se pudo obtener el GIF.');
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
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Acción`)
        .setDescription(REQUEST_MESSAGES[action]!(author.displayName, target.displayName))
        .addFields({ name: '⏰ Tiempo', value: 'Expira en **10 minutos**' })
        .setColor(COLORS.INTERACTION)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`act_accept_${action}`).setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId(`act_reject_${action}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    // Usar editReply en lugar de reply ya que ya hicimos deferReply
    const message = await interaction.editReply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
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
        throw new CommandError(ErrorType.UNKNOWN, 'RequestManager no disponible', '❌ Sistema no disponible.');
    }

    if (requestManager.hasPendingRequest(author.id)) {
        const pending = requestManager.getPendingRequest(author.id);
        const remaining = Math.ceil(requestManager.getRemainingTime(author.id) / 60000);
        await message.reply(`⏱️ Ya tienes una solicitud pendiente con <@${pending?.targetId}>. Espera ${remaining} min.`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Acción`)
        .setDescription(REQUEST_MESSAGES[action]!(author.displayName, target.displayName))
        .addFields({ name: '⏰ Tiempo', value: 'Expira en **10 minutos**' })
        .setColor(COLORS.INTERACTION)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`act_accept_${action}`).setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId(`act_reject_${action}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    const sentMessage = await message.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
    requestManager.createRequest(author.id, target.id, action, sentMessage.id, `prefix_${message.id}`);
}
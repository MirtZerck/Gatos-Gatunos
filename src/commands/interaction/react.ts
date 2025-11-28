import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    User
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getInteractionGif } from '../../utils/gifProvider.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { BotClient } from '../../types/BotClient.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';

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
    horny: 'anime horny',
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

const REACTION_CONFIG: Record<ActionType, {
    emoji: string;
    name: string;
    color: number;
    withTarget: (author: string, target: string) => string;
    solo: (author: string) => string;
    footer: string;
}> = {
    smile: {
        emoji: '😊',
        name: 'sonrisa',
        color: 0xFFD700, // Dorado
        withTarget: (a, t) => `**${a}** sonríe felizmente gracias a **${t}**`,
        solo: (a) => `**${a}** está sonriendo radiante`,
        footer: '☀️ Una sonrisa puede alegrar el día de alguien'
    },
    laugh: {
        emoji: '😂',
        name: 'risa',
        color: 0xFF6B35, // Naranja vibrante
        withTarget: (a, t) => `**${a}** se ríe a carcajadas por **${t}**`,
        solo: (a) => `**${a}** está riéndose sin parar`,
        footer: '🎭 La risa es el mejor medicamento'
    },
    cry: {
        emoji: '😢',
        name: 'llanto',
        color: 0x4682B4, // Azul acero
        withTarget: (a, t) => `**${a}** llora desconsoladamente por **${t}**`,
        solo: (a) => `**${a}** está llorando`,
        footer: '💧 Está bien mostrar tus emociones'
    },
    blush: {
        emoji: '😳',
        name: 'sonrojo',
        color: 0xFF69B4, // Rosa intenso
        withTarget: (a, t) => `**${a}** se sonroja completamente por **${t}**`,
        solo: (a) => `**${a}** está sonrojado`,
        footer: '🌸 ¡Qué tierno!'
    },
    pout: {
        emoji: '🥺',
        name: 'puchero',
        color: 0xFFB6C1, // Rosa claro
        withTarget: (a, t) => `**${a}** le hace unos pucheros adorables a **${t}**`,
        solo: (a) => `**${a}** está haciendo pucheros`,
        footer: '🥺 ¡Casi imposible de resistir!'
    },
    angry: {
        emoji: '😠',
        name: 'enojo',
        color: 0xFF4444, // Rojo
        withTarget: (a, t) => `**${a}** está muy enojado con **${t}**`,
        solo: (a) => `**${a}** está furioso`,
        footer: '💢 Respira hondo, todo estará bien'
    },
    confused: {
        emoji: '😕',
        name: 'confusión',
        color: 0x9370DB, // Púrpura medio
        withTarget: (a, t) => `**${a}** está completamente confundido por **${t}**`,
        solo: (a) => `**${a}** está confundido`,
        footer: '❓ ¿Qué está pasando aquí?'
    },
    shocked: {
        emoji: '😱',
        name: 'sorpresa',
        color: 0xFFA500, // Naranja
        withTarget: (a, t) => `**${a}** está totalmente sorprendido por **${t}**`,
        solo: (a) => `**${a}** está en shock`,
        footer: '⚡ ¡No lo puedo creer!'
    },
    happy: {
        emoji: '😄',
        name: 'felicidad',
        color: 0xFFFF00, // Amarillo brillante
        withTarget: (a, t) => `**${a}** está súper feliz con **${t}**`,
        solo: (a) => `**${a}** está radiante de felicidad`,
        footer: '🌟 ¡La felicidad es contagiosa!'
    },
    sad: {
        emoji: '😔',
        name: 'tristeza',
        color: 0x708090, // Gris pizarra
        withTarget: (a, t) => `**${a}** está triste por **${t}**`,
        solo: (a) => `**${a}** está triste`,
        footer: '🌧️ Mañana será un mejor día'
    },
    sleep: {
        emoji: '😴',
        name: 'sueño',
        color: 0x191970, // Azul medianoche
        withTarget: (a, t) => `**${a}** se queda dormido pensando en **${t}**`,
        solo: (a) => `**${a}** se quedó profundamente dormido`,
        footer: '🌙 Dulces sueños'
    },
    yawn: {
        emoji: '🥱',
        name: 'bostezo',
        color: 0xB0C4DE, // Azul claro
        withTarget: (a, t) => `**${a}** bosteza largo y tendido frente a **${t}**`,
        solo: (a) => `**${a}** está bostezando sin parar`,
        footer: '😴 El sueño es contagioso'
    },
    shrug: {
        emoji: '🤷',
        name: 'encogimiento',
        color: 0xC0C0C0, // Plata
        withTarget: (a, t) => `**${a}** se encoge de hombros ante **${t}**`,
        solo: (a) => `**${a}** se encoge de hombros`,
        footer: '¯\\_(ツ)_/¯ ¿Quién sabe?'
    },
    think: {
        emoji: '🤔',
        name: 'pensamiento',
        color: 0x8A2BE2, // Violeta azul
        withTarget: (a, t) => `**${a}** piensa profundamente en **${t}**`,
        solo: (a) => `**${a}** está pensando intensamente`,
        footer: '💭 Procesando información...'
    },
    stare: {
        emoji: '👀',
        name: 'mirada',
        color: 0x00CED1, // Turquesa oscuro
        withTarget: (a, t) => `**${a}** mira fijamente e intensamente a **${t}**`,
        solo: (a) => `**${a}** está mirando fijamente`,
        footer: '👁️ La mirada que lo dice todo'
    },
    horny: {
        emoji: '😈',
        name: 'calentura',
        color: 0xFF1493, // Rosa profundo
        withTarget: (a, t) => `**${a}** está caliente gracias a **${t}**`,
        solo: (a) => `**${a}** está sintiéndose travieso`,
        footer: '🔥 ¡Bonk! Ve a la cárcel horny'
    }
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
        { name: 'horny', aliases: ['cachondo'], description: 'Siéntete travieso' },
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
        .addSubcommand(sub => sub.setName('horny').setDescription('Siéntete travieso')
            .addUserOption(opt => opt.setName('usuario').setDescription('Gracias a quién (opcional)').setRequired(false)))
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
                const helpEmbed = new EmbedBuilder()
                    .setTitle('💭 Comandos de Reacción')
                    .setDescription(
                        `Usa: \`${config.prefix}react <reacción> [@usuario]\`\n\n` +
                        `El usuario es opcional. Si no lo especificas, mostrarás la reacción en solitario.\n\n` +
                        `**Reacciones disponibles:**`
                    )
                    .addFields(
                        {
                            name: '😊 Emociones Positivas',
                            value: ['smile', 'laugh', 'happy', 'blush'].map(cmd =>
                                `${REACTION_CONFIG[cmd as ActionType].emoji} \`${cmd}\``
                            ).join(' • '),
                            inline: false
                        },
                        {
                            name: '😢 Emociones Negativas',
                            value: ['cry', 'sad', 'angry', 'pout'].map(cmd =>
                                `${REACTION_CONFIG[cmd as ActionType].emoji} \`${cmd}\``
                            ).join(' • '),
                            inline: false
                        },
                        {
                            name: '🤔 Otras Reacciones',
                            value: ['confused', 'shocked', 'sleep', 'yawn', 'shrug', 'think', 'stare'].map(cmd =>
                                `${REACTION_CONFIG[cmd as ActionType].emoji} \`${cmd}\``
                            ).join(' • '),
                            inline: false
                        }
                    )
                    .setColor(COLORS.INTERACTION)
                    .setFooter({ text: '¡Expresa tus emociones!' });

                await message.reply({ embeds: [helpEmbed] });
                return;
            }

            if (!validSubcommands.includes(subcommand)) {
                await message.reply(`❌ Reacción no válida: **${subcommand}**`);
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

            await handleReactionPrefix(message, subcommand, message.author, target);

        } catch (error) {
            await handleCommandError(error, message, 'react');
        }
    },
};

async function handleReaction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: User,
    target: User | null
): Promise<void> {
    try {
        const reactionConfig = REACTION_CONFIG[action];
        const gifURL = await getInteractionGif(ACTION_QUERIES[action]);

        const message = target
            ? reactionConfig.withTarget(author.displayName, target.displayName)
            : reactionConfig.solo(author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(`${reactionConfig.emoji} ${message}`)
            .setImage(gifURL)
            .setColor(reactionConfig.color)
            .setFooter({ text: reactionConfig.footer })
            .setTimestamp();


        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Error obteniendo GIF de Tenor',
            '❌ No se pudo obtener el GIF. Intenta de nuevo.'
        );
    }
}

async function handleReactionPrefix(
    message: Message,
    action: ActionType,
    author: User,
    target: User | undefined
): Promise<void> {
    const loadingMsg = await message.reply('🔄 Cargando...');

    try {
        const reactionConfig = REACTION_CONFIG[action];
        const gifUrl = await getInteractionGif(ACTION_QUERIES[action]);

        const messageText = target
            ? reactionConfig.withTarget(author.displayName, target.displayName)
            : reactionConfig.solo(author.displayName);

        const embed = new EmbedBuilder()
            .setDescription(`${reactionConfig.emoji} ${messageText}`)
            .setImage(gifUrl)
            .setColor(reactionConfig.color)
            .setFooter({ text: reactionConfig.footer })
            .setTimestamp();

        await loadingMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Error obteniendo GIF de Tenor',
            '❌ No se pudo obtener el GIF. Intenta de nuevo.'
        );
    }
}
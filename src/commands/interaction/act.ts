import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getRandomGif } from '../../utils/tenor.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';

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
} as const;

type ActionType = keyof typeof ACTION_QUERIES;

// Acciones que requieren solicitud cuando hay usuario objetivo
const REQUIRE_REQUEST_WITH_TARGET: ActionType[] = ['dance', 'sing', 'highfive'];
// Acciones que siempre son directas
const NO_REQUEST: ActionType[] = ['wave', 'bow', 'clap', 'cheer', 'salute', 'nod'];

const REQUEST_MESSAGES: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    dance: (author, target) => `**${author}** quiere bailar con **${target}** 💃`,
    sing: (author, target) => `**${author}** quiere cantar con **${target}** 🎤`,
    highfive: (author, target) => `**${author}** quiere chocar los cinco con **${target}** ✋`,
};

const MESSAGES_WITH_TARGET: Partial<Record<ActionType, (author: string, target: string) => string>> = {
    dance: (author, target) => `**${author}** baila con **${target}** 💃`,
    sing: (author, target) => `**${author}** canta con **${target}** 🎤`,
    highfive: (author, target) => `**${author}** choca los cinco con **${target}** ✋`,
    wave: (author, target) => `**${author}** saluda a **${target}** 👋`,
    bow: (author, target) => `**${author}** hace una reverencia ante **${target}** 🙇`,
    clap: (author, target) => `**${author}** aplaude a **${target}** 👏`,
    cheer: (author, target) => `**${author}** anima a **${target}** 🎉`,
    salute: (author, target) => `**${author}** saluda militarmente a **${target}** 🫡`,
    nod: (author, target) => `**${author}** asiente ante **${target}** 👍`,
};

const MESSAGES_SOLO: Partial<Record<ActionType, (author: string) => string>> = {
    dance: (author) => `**${author}** está bailando 💃`,
    sing: (author) => `**${author}** está cantando 🎤`,
    highfive: (author) => `**${author}** espera un choque de manos ✋`,
    wave: (author) => `**${author}** saluda 👋`,
    bow: (author) => `**${author}** hace una reverencia 🙇`,
    clap: (author) => `**${author}** está aplaudiendo 👏`,
    cheer: (author) => `**${author}** está animando 🎉`,
    salute: (author) => `**${author}** hace un saludo militar 🫡`,
    nod: (author) => `**${author}** asiente 👍`,
};

const ACTION_EMOJIS: Record<ActionType, string> = {
    dance: '💃', sing: '🎤', highfive: '✋',
    wave: '👋', bow: '🙇', clap: '👏', cheer: '🎉', salute: '🫡', nod: '👍',
};

const ACTION_NAMES: Record<ActionType, string> = {
    dance: 'baile',
    sing: 'canto',
    highfive: 'choque de manos',
    wave: 'saludo',
    bow: 'reverencia',
    clap: 'aplauso',
    cheer: 'ánimo',
    salute: 'saludo militar',
    nod: 'asentimiento',
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

            // Validaciones rápidas
            if (target) {
                Validators.validateNotSelf(author, target);
                Validators.validateNotBot(target);
            }

            // ✅ CRÍTICO: Defer INMEDIATAMENTE
            await interaction.deferReply();

            // Decidir si es solicitud o acción directa
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

// ==================== HANDLERS PARA ACCIONES DIRECTAS ====================

async function handleDirectAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any | null
): Promise<void> {
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

// ==================== HANDLERS PARA SOLICITUDES CON BOTONES ====================

async function handleRequestAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    // Crear embed de solicitud
    const requestEmbed = new EmbedBuilder()
        .setDescription(
            `${target}, **${author.displayName}** quiere ${ACTION_NAMES[action]} contigo.\n\n¿Aceptas?`
        )
        .setColor(COLORS.INFO)
        .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('Aceptar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('reject')
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

    // Mostrar mensaje con botones (ya hicimos defer, usar editReply)
    const message = await interaction.editReply({
        embeds: [requestEmbed],
        components: [buttons]
    });

    // Crear collector para respuestas
    try {
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000, // 30 segundos
            filter: (i) => i.user.id === target.id
        });

        collector.on('collect', async (buttonInteraction) => {
            // Responder al botón inmediatamente
            await buttonInteraction.deferUpdate();

            if (buttonInteraction.customId === 'accept') {
                // Usuario aceptó - obtener GIF y mostrar
                try {
                    const gifURL = await getRandomGif(ACTION_QUERIES[action]);
                    const successMessage = MESSAGES_WITH_TARGET[action]!(author.displayName, target.displayName);

                    const resultEmbed = new EmbedBuilder()
                        .setDescription(successMessage)
                        .setImage(gifURL)
                        .setColor(COLORS.INTERACTION)
                        .setTimestamp();

                    await interaction.editReply({
                        embeds: [resultEmbed],
                        components: []
                    });
                } catch (error) {
                    throw new CommandError(
                        ErrorType.API_ERROR,
                        'Error obteniendo GIF de Tenor',
                        '❌ No se pudo obtener el GIF.'
                    );
                }
            } else {
                // Usuario rechazó
                const rejectEmbed = new EmbedBuilder()
                    .setDescription(
                        `${target.displayName} rechazó la solicitud de **${ACTION_NAMES[action]}** de ${author.displayName}. 💔`
                    )
                    .setColor(COLORS.DANGER)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [rejectEmbed],
                    components: []
                });
            }

            collector.stop();
        });

        collector.on('end', async (collected) => {
            // Si no hubo respuesta (timeout)
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setDescription(`${target.displayName} no respondió a tiempo. ⏰`)
                    .setColor(COLORS.WARNING)
                    .setTimestamp();

                try {
                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                } catch {
                    // Ignorar errores de edición
                }
            }
        });

    } catch (collectorError) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Error en el collector de botones',
            '❌ Hubo un error procesando la respuesta.'
        );
    }
}

async function handleRequestActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestEmbed = new EmbedBuilder()
        .setDescription(
            `${target}, **${author.displayName}** quiere ${ACTION_NAMES[action]} contigo.\n\n¿Aceptas?`
        )
        .setColor(COLORS.INFO)
        .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('Aceptar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('reject')
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

    const requestMessage = await message.reply({
        embeds: [requestEmbed],
        components: [buttons]
    });

    const collector = requestMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        filter: (i) => i.user.id === target.id
    });

    collector.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId === 'accept') {
            try {
                const gifURL = await getRandomGif(ACTION_QUERIES[action]);
                const successMessage = MESSAGES_WITH_TARGET[action]!(author.displayName, target.displayName);

                const resultEmbed = new EmbedBuilder()
                    .setDescription(successMessage)
                    .setImage(gifURL)
                    .setColor(COLORS.INTERACTION)
                    .setTimestamp();

                await requestMessage.edit({
                    embeds: [resultEmbed],
                    components: []
                });
            } catch (error) {
                throw new CommandError(
                    ErrorType.API_ERROR,
                    'Error obteniendo GIF de Tenor',
                    '❌ No se pudo obtener el GIF.'
                );
            }
        } else {
            const rejectEmbed = new EmbedBuilder()
                .setDescription(
                    `${target.displayName} rechazó la solicitud de **${ACTION_NAMES[action]}** de ${author.displayName}. 💔`
                )
                .setColor(COLORS.DANGER)
                .setTimestamp();

            await requestMessage.edit({
                embeds: [rejectEmbed],
                components: []
            });
        }

        collector.stop();
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setDescription(`${target.displayName} no respondió a tiempo. ⏰`)
                .setColor(COLORS.WARNING)
                .setTimestamp();

            try {
                await requestMessage.edit({
                    embeds: [timeoutEmbed],
                    components: []
                });
            } catch {
                // Ignorar
            }
        }
    });
}
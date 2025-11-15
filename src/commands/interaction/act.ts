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
import { BotClient } from '../../types/BotClient.js';
import { logger } from '../../utils/logger.js';

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

const REQUIRE_REQUEST_WITH_TARGET: ActionType[] = ['dance', 'sing', 'highfive'];
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
            // ✅ PASO 1: Obtener datos (SÍNCRONO)
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario');
            const author = interaction.user;

            // ✅ PASO 2: Validaciones SÍNCRONAS (solo si hay target)
            if (target) {
                try {
                    Validators.validateNotSelf(author, target);
                    Validators.validateNotBot(target);
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

            // ✅ PASO 3: DEFER INMEDIATO
            await interaction.deferReply();

            // ✅ PASO 4: Decidir flujo (ya tenemos 15 minutos)
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

// ==================== ACCIONES DIRECTAS ====================

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

// ==================== SOLICITUDES CON BOTONES ====================

async function handleRequestAction(
    interaction: ChatInputCommandInteraction,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestManager = (interaction.client as BotClient).requestManager;
    
    // ✅ Verificar si ya tiene una solicitud pendiente CON ESTE USUARIO ESPECÍFICO
    if (requestManager && requestManager.hasPendingRequestWith(author.id, target.id)) {
        const remainingTime = requestManager.getRemainingTimeWith(author.id, target.id);
        const minutes = Math.ceil(remainingTime / 60000);
        
        await interaction.editReply({
            content: `⏱️ Ya tienes una solicitud pendiente de **${action}** con **${target.displayName}**.\n` +
                    `Expira en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`
        });
        return;
    }

    // ✅ Mostrar lista de solicitudes activas si tiene otras (opcional - para informar al usuario)
    if (requestManager && requestManager.hasPendingRequest(author.id)) {
        const allRequests = requestManager.getAllPendingRequestsByAuthor(author.id);
        const otherRequests = allRequests.filter(r => r.targetId !== target.id);
        
        if (otherRequests.length > 0) {
            // Mostrar aviso informativo pero permitir continuar
            logger.debug(
                'interact',
                `${author.tag} tiene ${otherRequests.length} solicitud(es) adicional(es) activa(s)`
            );
        }
    }

    // ✅ Crear embed de solicitud
    const requestEmbed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(
            `${target}, **${author.displayName}** quiere darte un **${ACTION_NAMES[action]}**.\n\n¿Aceptas?`
        )
        .setColor(COLORS.INFO)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
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

    // ✅ Enviar mensaje (ya tenemos defer, usamos editReply)
    const message = await interaction.editReply({
        embeds: [requestEmbed],
        components: [buttons]
    });

    // ✅ Registrar en RequestManager (10 minutos = 600000ms)
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
            logger.error('interact', 'Error creando solicitud en RequestManager', error);
        }
    }

    // ✅ Timeout manual de 10 minutos
    setTimeout(async () => {
        try {
            // Verificar si el mensaje todavía tiene componentes (no fue respondido)
            const currentMessage = await interaction.fetchReply();
            if (currentMessage.components.length > 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setDescription(`${target.displayName} no respondió a tiempo. ⏰`)
                    .setColor(COLORS.WARNING)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });

                // Limpiar del RequestManager
                if (requestManager) {
                    requestManager.resolveRequestWith(author.id, target.id);
                }
            }
        } catch {
            // Ignorar errores (el mensaje pudo haber sido eliminado)
        }
    }, 600000); // 10 minutos
}

async function handleRequestActionPrefix(
    message: Message,
    action: ActionType,
    author: any,
    target: any
): Promise<void> {
    const requestManager = (message.client as BotClient).requestManager;
    
    // ✅ Verificar solicitud pendiente CON ESTE USUARIO ESPECÍFICO
    if (requestManager && requestManager.hasPendingRequestWith(author.id, target.id)) {
        const remainingTime = requestManager.getRemainingTimeWith(author.id, target.id);
        const minutes = Math.ceil(remainingTime / 60000);
        
        await message.reply(
            `⏱️ Ya tienes una solicitud pendiente de **${action}** con **${target.displayName}**.\n` +
            `Expira en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`
        );
        return;
    }

    // ✅ Aviso informativo de otras solicitudes activas (opcional)
    if (requestManager && requestManager.hasPendingRequest(author.id)) {
        const allRequests = requestManager.getAllPendingRequestsByAuthor(author.id);
        const otherRequests = allRequests.filter(r => r.targetId !== target.id);
        
        if (otherRequests.length > 0) {
            logger.debug(
                'interact',
                `${author.tag} tiene ${otherRequests.length} solicitud(es) adicional(es) activa(s)`
            );
        }
    }

    const requestEmbed = new EmbedBuilder()
        .setTitle(`${ACTION_EMOJIS[action]} Solicitud de Interacción`)
        .setDescription(
            `${target}, **${author.displayName}** quiere darte un **${ACTION_NAMES[action]}**.\n\n¿Aceptas?`
        )
        .setColor(COLORS.INFO)
        .setFooter({ text: `De: ${author.tag}`, iconURL: author.displayAvatarURL() })
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

    // ✅ Registrar en RequestManager (10 minutos)
    if (requestManager) {
        try {
            requestManager.createRequest(
                author.id,
                target.id,
                action,
                requestMessage.id,
                message.id,
                600000 // 10 minutos
            );
        } catch (error) {
            logger.error('interact', 'Error creando solicitud en RequestManager', error);
        }
    }

    // ✅ Timeout manual de 10 minutos
    setTimeout(async () => {
        try {
            const currentMessage = await message.channel.messages.fetch(requestMessage.id);
            if (currentMessage.components.length > 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setDescription(`${target.displayName} no respondió a tiempo. ⏰`)
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
    }, 600000); // 10 minutos
}
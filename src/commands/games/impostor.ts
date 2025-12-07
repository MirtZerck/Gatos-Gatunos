import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    User,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
    ComponentType,
    Message,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SlashOnlyCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { sendMessage, createInfoEmbed, createSuccessEmbed } from '../../utils/messageUtils.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';

interface GameRoom {
    hostId: string;
    players: Set<string>;
    channelId: string;
    guildId: string;
    started: boolean;
    currentWord?: string;
    skipVotes: Set<string>;
    impostorId?: string;
    useAI: boolean;
    useCustomThemes: boolean;
    proposedWords: Map<string, string>;
    lobbyMessage?: Message;
    gameMessage?: Message;
    turnOrder?: string[];
    alivePlayers: Set<string>;
    votingInProgress: boolean;
    votes: Map<string, string>;
    votingMessage?: Message;
}

const activeRooms = new Map<string, GameRoom>();

const THEMED_WORDS = [
    'funeral', 'boda', 'circo', 'hospital', 'escuela', 'cárcel', 'museo', 'biblioteca',
    'aeropuerto', 'estación de tren', 'zoológico', 'acuario', 'parque de diversiones',
    'casino', 'restaurante', 'hotel', 'spa', 'gimnasio', 'teatro', 'concierto',
    'planetario', 'observatorio', 'laboratorio', 'fábrica', 'granja', 'mercado',
    'supermercado', 'farmacia', 'peluquería', 'salón de belleza', 'oficina',
    'construcción', 'demolición', 'incendio', 'inundación', 'terremoto', 'huracán',
    'eclipse', 'aurora boreal', 'erupción volcánica', 'avalancha', 'tsunami',
    'desfile', 'carnaval', 'festival', 'feria', 'exposición', 'convención',
    'graduación', 'cumpleaños', 'aniversario', 'baby shower', 'despedida de soltero',
    'entrevista de trabajo', 'examen', 'vacaciones', 'safari', 'crucero',
    'campamento', 'excursión', 'expedición', 'competencia deportiva', 'olimpiadas',
    'maratón', 'juegos olímpicos', 'campeonato mundial', 'final de copa',
    'concierto de rock', 'ópera', 'ballet', 'musical', 'stand-up comedy',
    'casting', 'audición', 'filmación', 'sesión de fotos', 'entrevista',
    'conferencia de prensa', 'debate', 'juicio', 'elecciones', 'manifestación'
];

let genAI: GoogleGenerativeAI | null = null;

try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    logger.info('Impostor', 'Gemini AI inicializado para generación de temas');
} catch (error) {
    logger.warn('Impostor', 'No se pudo inicializar Gemini AI, usando solo temas predefinidos');
}

function getRoomKey(guildId: string, channelId: string): string {
    return `${guildId}-${channelId}`;
}

function getRandomWord(): string {
    return THEMED_WORDS[Math.floor(Math.random() * THEMED_WORDS.length)];
}

async function generateThemeWithAI(): Promise<string> {
    if (!genAI) {
        return getRandomWord();
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = 'Genera UNA SOLA palabra o frase corta (máximo 3 palabras) que represente un lugar, evento o situación interesante para un juego de adivinanzas. Ejemplos: funeral, boda, circo, concierto de rock, estación espacial. Responde SOLO con la palabra/frase, nada más.';

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim().toLowerCase();

        if (text.length > 0 && text.length < 50) {
            logger.info('Impostor', `Tema generado por IA: ${text}`);
            return text;
        }

        return getRandomWord();
    } catch (error) {
        logger.error('Impostor', 'Error al generar tema con IA', error instanceof Error ? error : new Error(String(error)));
        return getRandomWord();
    }
}

function getRandomImpostor(players: string[]): string {
    return players[Math.floor(Math.random() * players.length)];
}

function generateTurnOrder(playerIds: string[], impostorId: string): string[] {
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    if (shuffled[0] === impostorId) {
        const impostorIndex = 0;
        const randomIndex = Math.floor(Math.random() * (shuffled.length - 1)) + 1;
        [shuffled[impostorIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[impostorIndex]];
    }

    return shuffled;
}

async function sendDM(user: User, embed: EmbedBuilder): Promise<boolean> {
    try {
        await user.send({ embeds: [embed] });
        return true;
    } catch {
        return false;
    }
}

function getRequiredVotes(totalPlayers: number): number {
    return Math.floor(totalPlayers / 2) + 1;
}

function selectWordFromProposals(proposedWords: Map<string, string>, impostorId: string): string {
    const availableWords: string[] = [];
    for (const [playerId, word] of proposedWords) {
        if (playerId !== impostorId) {
            availableWords.push(word);
        }
    }
    return availableWords[Math.floor(Math.random() * availableWords.length)];
}

function createLobbyButtons(useCustomThemes: boolean): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('impostor_join')
            .setLabel('Unirse')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('impostor_start')
            .setLabel('Empezar')
            .setEmoji('🎮')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('impostor_toggle_custom')
            .setLabel(useCustomThemes ? 'Desactivar Personalizado' : 'Activar Personalizado')
            .setEmoji('🎭')
            .setStyle(useCustomThemes ? ButtonStyle.Secondary : ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('impostor_leave')
            .setLabel('Salir')
            .setEmoji('🚪')
            .setStyle(ButtonStyle.Secondary)
    );
}

function createGameButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('impostor_skip')
            .setLabel('Votar Skip')
            .setEmoji('🗳️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('impostor_start_vote')
            .setLabel('Empezar Votación')
            .setEmoji('🗳️')
            .setStyle(ButtonStyle.Danger)
    );
}

async function handleButtonInteraction(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const customId = interaction.customId;

    switch (customId) {
        case 'impostor_join':
            await handleJoinButton(interaction, roomKey);
            break;
        case 'impostor_start':
            await handleStartButton(interaction, roomKey);
            break;
        case 'impostor_toggle_custom':
            await handleToggleCustomButton(interaction, roomKey);
            break;
        case 'impostor_leave':
            await handleLeaveButton(interaction, roomKey);
            break;
        case 'impostor_skip':
            await handleSkipButton(interaction, roomKey);
            break;
        case 'impostor_start_vote':
            await handleStartVoteButton(interaction, roomKey);
            break;
    }
}

export const impostor: SlashOnlyCommand = {
    type: 'slash-only',
    name: 'impostor',
    description: 'Minijuego de impostor - ¡Adivina la palabra secreta!',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName('impostor')
        .setDescription('Minijuego de impostor - ¡Adivina la palabra secreta!')
        .addSubcommand(sub =>
            sub
                .setName('crear')
                .setDescription('Crea una sala de juego')
                .addBooleanOption(opt =>
                    opt
                        .setName('tematica_personalizada')
                        .setDescription('¿Activar temáticas personalizadas? (cada jugador propone una palabra)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub
                .setName('unirse')
                .setDescription('Únete a la sala de juego activa'))
        .addSubcommand(sub =>
            sub
                .setName('proponer')
                .setDescription('Propone una palabra/temática para el juego')
                .addStringOption(opt =>
                    opt
                        .setName('palabra')
                        .setDescription('Tu palabra o temática propuesta (será secreta)')
                        .setRequired(true)
                        .setMaxLength(50)))
        .addSubcommand(sub =>
            sub
                .setName('empezar')
                .setDescription('Inicia el juego (solo el anfitrión)'))
        .addSubcommand(sub =>
            sub
                .setName('salir')
                .setDescription('Sal de la sala de juego'))
        .addSubcommand(sub =>
            sub
                .setName('jugadores')
                .setDescription('Muestra la lista de jugadores en la sala'))
        .addSubcommand(sub =>
            sub
                .setName('skip')
                .setDescription('Vota para saltar la palabra actual (requiere mayoría)'))
        .addSubcommand(sub =>
            sub
                .setName('expulsar')
                .setDescription('Expulsa a un jugador del juego (solo el anfitrión)')
                .addUserOption(opt =>
                    opt
                        .setName('jugador')
                        .setDescription('Jugador a expulsar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('terminar')
                .setDescription('Termina el juego actual (solo el anfitrión)'))
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guildId!;
            const channelId = interaction.channelId;
            const roomKey = getRoomKey(guildId, channelId);

            switch (subcommand) {
                case 'crear':
                    await handleCreate(interaction, roomKey, guildId, channelId);
                    break;
                case 'unirse':
                    await handleJoin(interaction, roomKey);
                    break;
                case 'proponer':
                    await handlePropose(interaction, roomKey);
                    break;
                case 'empezar':
                    await handleStart(interaction, roomKey);
                    break;
                case 'salir':
                    await handleLeave(interaction, roomKey);
                    break;
                case 'jugadores':
                    await handlePlayers(interaction, roomKey);
                    break;
                case 'skip':
                    await handleSkip(interaction, roomKey);
                    break;
                case 'expulsar':
                    await handleExpel(interaction, roomKey);
                    break;
                case 'terminar':
                    await handleEnd(interaction, roomKey);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'impostor');
        }
    }
};

async function handleCreate(
    interaction: ChatInputCommandInteraction,
    roomKey: string,
    guildId: string,
    channelId: string
): Promise<void> {
    if (activeRooms.has(roomKey)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Ya existe una sala activa en este canal',
            '❌ Ya hay una sala de juego activa en este canal. Usa el botón "Unirse" para unirte.'
        );
    }

    const useCustomThemes = interaction.options.getBoolean('tematica_personalizada') ?? false;
    const useAI = !useCustomThemes;

    let modeText = '';
    if (useCustomThemes) {
        modeText = '📝 **Temáticas personalizadas:** Cada jugador debe proponer una palabra\n' +
            '⚠️ Todos deben usar `/impostor proponer` antes de empezar\n';
    } else {
        modeText = '';
    }

    let howToPlayText = '';
    if (useCustomThemes) {
        howToPlayText =
            `🎯 **Cómo jugar (Temáticas Personalizadas):**\n\n` +
            `**1️⃣ Unirse:**\n` +
            `   • Haz clic en **"Unirse"** o usa \`/impostor unirse\`\n\n` +
            `**2️⃣ Proponer tu palabra (OBLIGATORIO):**\n` +
            `   • Escribe: \`/impostor proponer palabra:tu_palabra\`\n` +
            `   • Ejemplo: \`/impostor proponer palabra:funeral\`\n` +
            `   • Tu propuesta será **completamente secreta**\n` +
            `   • ✅ aparecerá junto a tu nombre cuando propongas\n\n` +
            `**3️⃣ Empezar:**\n` +
            `   • El anfitrión inicia cuando **todos** hayan propuesto\n` +
            `   • El sistema elegirá una palabra al azar (excepto la del impostor)\n\n` +
            `💡 **Cambiar modo:** El anfitrión puede usar el botón "Activar/Desactivar Personalizado"\n\n` +
            `⚠️ **Importante:** Sin propuestas de todos, no se puede empezar\n\n` +
            modeText +
            `👥 **Jugadores:** 1/10`;
    } else {
        howToPlayText =
            `🎯 **Cómo jugar:**\n` +
            `• Haz clic en **"Unirse"** para unirte\n` +
            `• Necesitas mínimo **3 jugadores** para empezar\n` +
            `• Cuando estén listos, el anfitrión hace clic en **"Empezar"**\n` +
            `• El impostor debe adivinar la palabra que tienen los demás\n` +
            `• Los demás deben dar pistas sin revelar la palabra\n\n` +
            `💡 **Cambiar modo:** El anfitrión puede activar temáticas personalizadas con el botón 🎭\n\n` +
            modeText +
            `👥 **Jugadores:** 1/10`;
    }

    const embed = createSuccessEmbed('🎮 Sala Creada',
        `**${interaction.user.displayName}** ha creado una sala de juego!\n\n${howToPlayText}`
    );

    const buttons = createLobbyButtons(useCustomThemes);
    await interaction.reply({
        embeds: [embed],
        components: [buttons]
    });
    const response = await interaction.fetchReply();

    const room: GameRoom = {
        hostId: interaction.user.id,
        players: new Set([interaction.user.id]),
        channelId,
        guildId,
        started: false,
        skipVotes: new Set(),
        useAI,
        useCustomThemes,
        proposedWords: new Map(),
        lobbyMessage: response,
        alivePlayers: new Set(),
        votingInProgress: false,
        votes: new Map()
    };

    activeRooms.set(roomKey, room);

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 3600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        try {
            await handleButtonInteraction(buttonInteraction, roomKey);
        } catch (error) {
            logger.error('Impostor', 'Error en botón del lobby', error instanceof Error ? error : new Error(String(error)));
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu acción.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on('end', () => {
        if (activeRooms.has(roomKey) && !activeRooms.get(roomKey)!.started) {
            activeRooms.delete(roomKey);
            logger.info('Impostor', `Sala ${roomKey} eliminada por inactividad`);
        }
    });
}

async function handleJoin(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal. Crea una con `/impostor crear`.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ El juego ya ha comenzado. Espera a que termine para unirte a la siguiente partida.'
        );
    }

    if (room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario ya está en la sala',
            '❌ Ya estás en la sala de juego.'
        );
    }

    if (room.players.size >= 10) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Sala llena',
            '❌ La sala está llena (máximo 10 jugadores).'
        );
    }

    room.players.add(interaction.user.id);

    const embed = createSuccessEmbed(
        '✅ Te has unido',
        `**${interaction.user.displayName}** se ha unido a la partida!\n\n` +
        `👥 **Jugadores:** ${room.players.size}/10`
    );

    await sendMessage(interaction, { embed });

    await updateLobbyMessage(room);
}

async function handlePropose(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (!room.useCustomThemes) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Temáticas personalizadas no activadas',
            '❌ Esta sala no tiene temáticas personalizadas activadas.'
        );
    }

    if (!room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en la sala',
            '❌ Debes unirte a la sala primero para proponer una palabra.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ El juego ya ha comenzado, no puedes proponer palabras ahora.'
        );
    }

    const palabra = interaction.options.getString('palabra', true).trim().toLowerCase();

    if (palabra.length < 3) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Palabra muy corta',
            '❌ La palabra debe tener al menos 3 caracteres.'
        );
    }

    room.proposedWords.set(interaction.user.id, palabra);

    const embed = createSuccessEmbed(
        '✅ Palabra Propuesta',
        `Has propuesto tu palabra secreta!\n\n` +
        `🔒 **Tu propuesta:** ||${palabra}||\n\n` +
        `📊 **Progreso:** ${room.proposedWords.size}/${room.players.size} jugadores han propuesto`
    );

    await sendMessage(interaction, { embed, ephemeral: true });

    await updateLobbyMessage(room);
}

async function handleStart(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (room.hostId !== interaction.user.id) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'Usuario no es el host',
            '❌ Solo el anfitrión puede iniciar el juego.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ El juego ya ha comenzado.'
        );
    }

    if (room.players.size < 3) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'No hay suficientes jugadores',
            `❌ Se necesitan mínimo 3 jugadores para empezar. Actualmente hay ${room.players.size}.`
        );
    }

    if (room.useCustomThemes && room.proposedWords.size < room.players.size) {
        const playersWithoutProposal: string[] = [];
        for (const playerId of room.players) {
            if (!room.proposedWords.has(playerId)) {
                const player = await interaction.client.users.fetch(playerId);
                playersWithoutProposal.push(player.displayName);
            }
        }

        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Faltan propuestas',
            `❌ Todos los jugadores deben proponer una palabra antes de empezar.\n\n` +
            `**Falta(n):** ${playersWithoutProposal.join(', ')}\n` +
            `Usa \`/impostor proponer <palabra>\` para proponer.`
        );
    }

    await interaction.deferReply();

    const playerIds = Array.from(room.players);
    const impostorId = getRandomImpostor(playerIds);

    let word: string;
    let proposedWordsText: string = '';

    if (room.useCustomThemes) {
        word = selectWordFromProposals(room.proposedWords, impostorId);
        const allProposals = Array.from(room.proposedWords.values());
        proposedWordsText = `\n**🎯 Palabras propuestas:**\n${allProposals.map(w => `• ${w}`).join('\n')}\n` +
            `La palabra elegida es una de estas.\n`;
    } else {
        word = room.useAI ? await generateThemeWithAI() : getRandomWord();
    }

    const turnOrder = generateTurnOrder(playerIds, impostorId);

    room.started = true;
    room.currentWord = word;
    room.impostorId = impostorId;
    room.turnOrder = turnOrder;
    room.skipVotes.clear();
    room.alivePlayers = new Set(playerIds);
    room.votingInProgress = false;
    room.votes.clear();

    const turnOrderText: string[] = [];
    for (let i = 0; i < turnOrder.length; i++) {
        const player = await interaction.client.users.fetch(turnOrder[i]);
        turnOrderText.push(`${i + 1}. ${player.displayName}`);
    }

    const failedDMs: string[] = [];

    for (const playerId of playerIds) {
        const player = await interaction.client.users.fetch(playerId);
        const isImpostor = playerId === impostorId;

        const embed = new EmbedBuilder()
            .setColor(isImpostor ? COLORS.DANGER : COLORS.SUCCESS)
            .setTimestamp();

        if (isImpostor) {
            embed
                .setTitle('🕵️ ¡ERES EL IMPOSTOR!')
                .setDescription(
                    '**Tu objetivo:** Descubrir cuál es la palabra secreta\n\n' +
                    `🎭 **Tu rol:** Impostor\n` +
                    `❓ **Palabra secreta:** ???\n\n` +
                    `**Consejos:**\n` +
                    `• Escucha atentamente las pistas de los demás\n` +
                    `• Trata de participar sin revelar que no sabes la palabra\n` +
                    `• Adivina la palabra cuando estés seguro\n\n` +
                    `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
                    `¡Buena suerte! 🎲`
                );
        } else {
            embed
                .setTitle('✅ Eres un jugador normal')
                .setDescription(
                    '**Tu objetivo:** Da pistas sin revelar la palabra al impostor\n\n' +
                    `👤 **Tu rol:** Jugador\n` +
                    `🔑 **Palabra secreta:** ||${word}||\n\n` +
                    `**Consejos:**\n` +
                    `• Da pistas relacionadas con la palabra\n` +
                    `• No seas demasiado obvio\n` +
                    `• Intenta identificar quién es el impostor\n` +
                    `• Si no te gusta el tema, usa \`/impostor skip\` para votar\n\n` +
                    `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
                    `¡Buena suerte! 🎲`
                );
        }

        const success = await sendDM(player, embed);
        if (!success) {
            failedDMs.push(player.displayName);
        }
    }

    let modeInfo = '';
    if (room.useCustomThemes) {
        modeInfo = `**📝 Modo:** Temáticas Personalizadas\n` +
            `**💡 Info:** La palabra fue seleccionada aleatoriamente entre las propuestas de los jugadores\n\n`;
    }

    let resultMessage = `🎮 **¡El juego ha comenzado!**\n\n` +
        `Se han enviado los roles por mensaje privado a todos los jugadores.\n` +
        `👥 **Jugadores:** ${playerIds.length}\n\n` +
        modeInfo +
        `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
        `**Reglas:**\n` +
        `• Un jugador es el impostor y NO sabe cuál palabra fue elegida\n` +
        `• Los demás jugadores tienen la misma palabra secreta\n` +
        `• Turnense para dar pistas sobre la palabra\n` +
        `• El impostor debe intentar adivinar la palabra\n` +
        `• Cuando crean saber quién es el impostor, inicien votación con el botón\n` +
        `• Si no les gusta el tema, pueden votar con \`/impostor skip\`\n\n` +
        `**Botones disponibles:**\n` +
        `• 🗳️ **Votar Skip** - Cambiar de palabra (requiere mayoría)\n` +
        `• 🗳️ **Empezar Votación** - Votar para expulsar a un jugador\n\n` +
        `¡Que comience el juego! 🎲`;

    if (failedDMs.length > 0) {
        resultMessage += `\n\n⚠️ **Advertencia:** No se pudo enviar DM a: ${failedDMs.join(', ')}`;
    }

    const gameEmbed = createInfoEmbed('🎮 Juego Iniciado', resultMessage);

    await interaction.editReply({ embeds: [gameEmbed] });

    setTimeout(() => {
        if (activeRooms.has(roomKey)) {
            activeRooms.delete(roomKey);
            logger.info('Impostor', `Sala ${roomKey} eliminada por timeout`);
        }
    }, 7200000);
}

async function handleSkip(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (!room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego no ha empezado',
            '❌ El juego aún no ha comenzado. Solo se puede votar skip durante una partida.'
        );
    }

    if (!room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en la sala',
            '❌ No estás participando en este juego.'
        );
    }

    if (room.skipVotes.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario ya votó',
            '❌ Ya has votado para saltar esta palabra.'
        );
    }

    room.skipVotes.add(interaction.user.id);

    const requiredVotes = getRequiredVotes(room.players.size);
    const currentVotes = room.skipVotes.size;

    if (currentVotes >= requiredVotes) {
        await interaction.deferReply();

        const oldWord = room.currentWord;
        const newWord = await generateThemeWithAI();
        const playerIds = Array.from(room.players);

        room.currentWord = newWord;
        room.skipVotes.clear();

        const failedDMs: string[] = [];

        for (const playerId of playerIds) {
            if (playerId === room.impostorId) continue;

            const player = await interaction.client.users.fetch(playerId);

            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('🔄 Nueva Palabra')
                .setDescription(
                    `La palabra ha sido cambiada por votación!\n\n` +
                    `🔑 **Nueva palabra:** ||${newWord}||\n\n` +
                    `Continúa dando pistas para la nueva palabra.`
                )
                .setTimestamp();

            const success = await sendDM(player, embed);
            if (!success) {
                failedDMs.push(player.displayName);
            }
        }

        let skipMessage = `🔄 **¡Palabra cambiada!**\n\n` +
            `La votación para skip ha sido exitosa.\n` +
            `Se ha generado una nueva palabra y enviado a todos los jugadores.\n\n` +
            `📊 **Votos:** ${currentVotes}/${requiredVotes}`;

        if (failedDMs.length > 0) {
            skipMessage += `\n\n⚠️ **Advertencia:** No se pudo enviar DM a: ${failedDMs.join(', ')}`;
        }

        const skipEmbed = createInfoEmbed('🔄 Palabra Cambiada', skipMessage);
        await interaction.editReply({ embeds: [skipEmbed] });

        logger.info('Impostor', `Palabra cambiada de "${oldWord}" a "${newWord}" en sala ${roomKey}`);
    } else {
        const embed = createInfoEmbed(
            '🗳️ Voto Registrado',
            `**${interaction.user.displayName}** ha votado para cambiar la palabra.\n\n` +
            `📊 **Votos:** ${currentVotes}/${requiredVotes}\n` +
            `⏳ Faltan ${requiredVotes - currentVotes} voto(s) más para cambiar la palabra.`
        );

        await sendMessage(interaction, { embed });
    }
}


async function handleLeave(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (!room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en la sala',
            '❌ No estás en la sala de juego.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ No puedes salir mientras el juego está en curso. El anfitrión puede usar `/impostor terminar`.'
        );
    }

    room.players.delete(interaction.user.id);

    if (room.players.size === 0) {
        activeRooms.delete(roomKey);
        const embed = createInfoEmbed(
            '🚪 Sala Cerrada',
            'La sala se ha cerrado porque no quedan jugadores.'
        );
        await sendMessage(interaction, { embed });
        return;
    }

    if (room.hostId === interaction.user.id) {
        const newHostId = Array.from(room.players)[0];
        room.hostId = newHostId;
        const newHost = await interaction.client.users.fetch(newHostId);

        const embed = createInfoEmbed(
            '🚪 Jugador salió',
            `**${interaction.user.displayName}** ha salido de la sala.\n` +
            `👑 **Nuevo anfitrión:** ${newHost.displayName}\n` +
            `👥 **Jugadores:** ${room.players.size}/10`
        );
        await sendMessage(interaction, { embed });
        return;
    }

    const embed = createInfoEmbed(
        '🚪 Has salido',
        `Has salido de la sala.\n👥 **Jugadores restantes:** ${room.players.size}/10`
    );
    await sendMessage(interaction, { embed });
}

async function handlePlayers(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    const playerNames: string[] = [];
    for (const playerId of room.players) {
        const player = await interaction.client.users.fetch(playerId);
        const isHost = playerId === room.hostId;
        const isAlive = room.started ? room.alivePlayers.has(playerId) : true;
        const status = room.started ? (isAlive ? '✅' : '💀') : '';
        playerNames.push(`${status} ${isHost ? '👑 ' : ''}**${player.displayName}**`);
    }

    const embed = createInfoEmbed(
        '👥 Jugadores en la sala',
        `**Total:** ${room.players.size}/10\n` +
        `${room.started ? `**Vivos:** ${room.alivePlayers.size}\n` : ''}` +
        `**Estado:** ${room.started ? '🎮 En juego' : '⏳ Esperando'}\n\n` +
        playerNames.join('\n')
    );

    await sendMessage(interaction, { embed, ephemeral: true });
}

async function handleExpel(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (room.hostId !== interaction.user.id) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'Usuario no es el host',
            '❌ Solo el anfitrión puede expulsar jugadores.'
        );
    }

    if (!room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego no ha empezado',
            '❌ El juego aún no ha comenzado.'
        );
    }

    const target = interaction.options.getUser('jugador', true);

    if (!room.alivePlayers.has(target.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Jugador no está vivo',
            '❌ Este jugador no está en el juego o ya fue expulsado.'
        );
    }

    const wasImpostor = target.id === room.impostorId;
    const votingWasActive = room.votingInProgress;

    room.alivePlayers.delete(target.id);

    if (room.votes.has(target.id)) {
        room.votes.delete(target.id);
    }

    if (votingWasActive && room.votingMessage) {
        try {
            await room.votingMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'Error al deshabilitar menú de votación tras expulsión', error instanceof Error ? error : new Error(String(error)));
        }
        room.votingInProgress = false;
        room.votes.clear();
    }

    const resultEmbed = new EmbedBuilder()
        .setColor(wasImpostor ? COLORS.SUCCESS : COLORS.WARNING)
        .setTitle('👮 Expulsión Manual')
        .setDescription(
            `**${target.displayName}** ha sido expulsado por el anfitrión.\n\n` +
            `${wasImpostor
                ? `🎉 **¡${target.displayName} ERA EL IMPOSTOR!**\n\n**Los jugadores normales ganan!**`
                : `⚠️ **${target.displayName} NO era el impostor.**\n\nEl juego continúa...`
            }` +
            `${votingWasActive ? '\n\n⚠️ La votación ha sido cancelada y se reiniciará automáticamente.' : ''}`
        )
        .setTimestamp();

    await sendMessage(interaction, { embed: resultEmbed });

    if (wasImpostor) {
        await endGame(interaction.client, roomKey, false);
        return;
    }

    const victoryCheck = await checkVictoryConditions(roomKey);
    if (victoryCheck) {
        await endGame(interaction.client, roomKey, true);
        return;
    }

    if (votingWasActive && room.alivePlayers.size >= 2) {
        await startVoting(interaction.client, roomKey, interaction.channelId);
    }
}

async function handleEnd(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (room.hostId !== interaction.user.id) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'Usuario no es el host',
            '❌ Solo el anfitrión puede terminar el juego.'
        );
    }

    if (!room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego no ha empezado',
            '❌ El juego aún no ha comenzado. Usa el botón "Salir" para abandonar la sala.'
        );
    }

    const word = room.currentWord!;
    const impostor = await interaction.client.users.fetch(room.impostorId!);

    const embed = createInfoEmbed(
        '🏁 Juego Terminado',
        `El anfitrión ha terminado el juego.\n\n` +
        `🔑 **La palabra era:** ||${word}||\n` +
        `🕵️ **El impostor era:** ${impostor.displayName}\n\n` +
        `¡Gracias por jugar!`
    );

    await sendMessage(interaction, { embed });

    if (room.gameMessage) {
        try {
            await room.gameMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del juego', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.votingMessage) {
        try {
            await room.votingMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones de votación', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.lobbyMessage) {
        try {
            await room.lobbyMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del lobby', error instanceof Error ? error : new Error(String(error)));
        }
    }

    activeRooms.delete(roomKey);
    logger.info('Impostor', `Juego terminado en sala ${roomKey} por el host`);
}

async function updateLobbyMessage(room: GameRoom, interactionMessage?: Message): Promise<void> {
    const messageToEdit = interactionMessage || room.lobbyMessage;
    if (!messageToEdit) return;

    // Verificar si el bot tiene permisos necesarios en el canal
    if (messageToEdit.channel.isDMBased()) return;

    const botMember = await messageToEdit.guild?.members.fetchMe();
    if (!botMember) return;

    const permissions = messageToEdit.channel.permissionsFor(botMember);

    if (!permissions) {
        logger.warn('Impostor', 'No se pudieron obtener permisos del bot en el canal');
        return;
    }

    // Verificar permisos específicos necesarios
    const requiredPerms = ['ViewChannel', 'SendMessages', 'EmbedLinks'] as const;
    const missingPerms = requiredPerms.filter(perm => !permissions.has(perm));

    if (missingPerms.length > 0) {
        logger.error('Impostor', `Faltan permisos en el canal: ${missingPerms.join(', ')}`);
        return;
    }

    const playerNames: string[] = [];
    for (const playerId of room.players) {
        const player = await messageToEdit.client.users.fetch(playerId);
        const isHost = playerId === room.hostId;
        const hasProposed = room.proposedWords.has(playerId);
        playerNames.push(`${isHost ? '👑 ' : ''}${player.displayName}${room.useCustomThemes ? (hasProposed ? ' ✅' : ' ⏳') : ''}`);
    }

    let modeText = '';
    if (room.useCustomThemes) {
        modeText = `📝 **Temáticas personalizadas**\n` +
            `📊 **Propuestas:** ${room.proposedWords.size}/${room.players.size}\n`;
        if (room.proposedWords.size < room.players.size) {
            modeText += `⚠️ Faltan jugadores por proponer su palabra\n`;
        }
    }

    const embed = createSuccessEmbed(
        '🎮 Sala de Juego',
        `👥 **Jugadores (${room.players.size}/10):**\n${playerNames.join(', ')}\n\n` +
        `🎯 **Estado:** ${room.started ? '🎮 En juego' : '⏳ Esperando jugadores'}\n\n` +
        modeText +
        `${room.players.size < 3 ? '\n⚠️ Se necesitan mínimo 3 jugadores para empezar' : ''}`
    );

    const buttons = createLobbyButtons(room.useCustomThemes);

    try {
        // Intentar obtener el mensaje actualizado antes de editarlo
        await messageToEdit.fetch().catch(() => null);
        await messageToEdit.edit({ embeds: [embed], components: [buttons] });
        logger.info('Impostor', 'Mensaje del lobby actualizado correctamente');
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const allPerms = permissions.toArray();
        logger.error('Impostor',
            `Error al actualizar mensaje del lobby.\n` +
            `Canal: ${messageToEdit.channel.id}\n` +
            `Mensaje: ${messageToEdit.id}\n` +
            `Permisos del bot: ${allPerms.join(', ')}\n` +
            `ViewChannel: ${permissions.has('ViewChannel')}\n` +
            `SendMessages: ${permissions.has('SendMessages')}\n` +
            `EmbedLinks: ${permissions.has('EmbedLinks')}\n` +
            `ReadMessageHistory: ${permissions.has('ReadMessageHistory')}\n` +
            `ManageMessages: ${permissions.has('ManageMessages')}`,
            err);

        // Intentar enviar un mensaje de advertencia en el canal si es posible
        if (permissions.has('SendMessages') && permissions.has('ViewChannel')) {
            try {
                await messageToEdit.channel.send(
                    '⚠️ **Advertencia:** No puedo actualizar el mensaje del lobby. ' +
                    'Verifica que el bot tenga los permisos de **Ver Canal**, **Enviar Mensajes**, ' +
                    '**Insertar Enlaces** y **Leer Historial de Mensajes** en este canal específico.'
                ).catch(() => {});
            } catch {}
        }
    }
}

async function handleJoinButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ El juego ya ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.players.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ Ya estás en la sala.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.players.size >= 10) {
        await interaction.reply({
            content: '❌ La sala está llena (máximo 10 jugadores).',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.players.add(interaction.user.id);

    await interaction.reply({
        content: `✅ **${interaction.user.displayName}** se ha unido a la partida!`,
        flags: MessageFlags.Ephemeral
    });

    await updateLobbyMessage(room, interaction.message);
}

async function handleToggleCustomButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ No puedes cambiar el modo mientras el juego está en curso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (interaction.user.id !== room.hostId) {
        await interaction.reply({
            content: '❌ Solo el anfitrión puede cambiar el modo de juego.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.useCustomThemes = !room.useCustomThemes;

    if (!room.useCustomThemes) {
        room.proposedWords.clear();
    }

    await interaction.reply({
        content: room.useCustomThemes
            ? '🎭 **Modo temáticas personalizadas activado**\nCada jugador debe proponer su palabra con `/impostor proponer`'
            : '✅ **Modo temáticas personalizadas desactivado**\nSe usarán temas aleatorios',
        flags: MessageFlags.Ephemeral
    });

    await updateLobbyMessage(room, interaction.message);
}

async function handleStartButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.hostId !== interaction.user.id) {
        await interaction.reply({
            content: '❌ Solo el anfitrión puede iniciar el juego.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ El juego ya ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.players.size < 3) {
        await interaction.reply({
            content: `❌ Se necesitan mínimo 3 jugadores para empezar. Actualmente hay ${room.players.size}.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.useCustomThemes && room.proposedWords.size < room.players.size) {
        const playersWithoutProposal: string[] = [];
        for (const playerId of room.players) {
            if (!room.proposedWords.has(playerId)) {
                const player = await interaction.client.users.fetch(playerId);
                playersWithoutProposal.push(player.displayName);
            }
        }

        await interaction.reply({
            content: `❌ Todos los jugadores deben proponer una palabra antes de empezar.\n\n` +
                `**Falta(n):** ${playersWithoutProposal.join(', ')}\n` +
                `Usa \`/impostor proponer <palabra>\` para proponer.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.deferReply();

    const playerIds = Array.from(room.players);
    const impostorId = getRandomImpostor(playerIds);

    let word: string;
    let proposedWordsText: string = '';

    if (room.useCustomThemes) {
        word = selectWordFromProposals(room.proposedWords, impostorId);
        const allProposals = Array.from(room.proposedWords.values());
        proposedWordsText = `\n**🎯 Palabras propuestas:**\n${allProposals.map(w => `• ${w}`).join('\n')}\n` +
            `La palabra elegida es una de estas.\n`;
    } else {
        word = room.useAI ? await generateThemeWithAI() : getRandomWord();
    }

    const turnOrder = generateTurnOrder(playerIds, impostorId);

    room.started = true;
    room.currentWord = word;
    room.impostorId = impostorId;
    room.turnOrder = turnOrder;
    room.skipVotes.clear();
    room.alivePlayers = new Set(playerIds);
    room.votingInProgress = false;
    room.votes.clear();

    const turnOrderText: string[] = [];
    for (let i = 0; i < turnOrder.length; i++) {
        const player = await interaction.client.users.fetch(turnOrder[i]);
        turnOrderText.push(`${i + 1}. ${player.displayName}`);
    }

    const failedDMs: string[] = [];

    for (const playerId of playerIds) {
        const player = await interaction.client.users.fetch(playerId);
        const isImpostor = playerId === impostorId;

        const embed = new EmbedBuilder()
            .setColor(isImpostor ? COLORS.DANGER : COLORS.SUCCESS)
            .setTimestamp();

        if (isImpostor) {
            embed
                .setTitle('🕵️ ¡ERES EL IMPOSTOR!')
                .setDescription(
                    '**Tu objetivo:** Descubrir cuál es la palabra secreta\n\n' +
                    `🎭 **Tu rol:** Impostor\n` +
                    `❓ **Palabra secreta:** ???\n\n` +
                    `**Consejos:**\n` +
                    `• Escucha atentamente las pistas de los demás\n` +
                    `• Trata de participar sin revelar que no sabes la palabra\n` +
                    `• Adivina la palabra cuando estés seguro\n\n` +
                    `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
                    `¡Buena suerte! 🎲`
                );
        } else {
            embed
                .setTitle('✅ Eres un jugador normal')
                .setDescription(
                    '**Tu objetivo:** Da pistas sin revelar la palabra al impostor\n\n' +
                    `👤 **Tu rol:** Jugador\n` +
                    `🔑 **Palabra secreta:** ||${word}||\n\n` +
                    `**Consejos:**\n` +
                    `• Da pistas relacionadas con la palabra\n` +
                    `• No seas demasiado obvio\n` +
                    `• Intenta identificar quién es el impostor\n` +
                    `• Si no te gusta el tema, usa el botón "Votar Skip"\n\n` +
                    `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
                    `¡Buena suerte! 🎲`
                );
        }

        const success = await sendDM(player, embed);
        if (!success) {
            failedDMs.push(player.displayName);
        }
    }

    let modeInfoButton = '';
    if (room.useCustomThemes) {
        modeInfoButton = `**📝 Modo:** Temáticas Personalizadas\n` +
            `**💡 Info:** La palabra fue seleccionada aleatoriamente entre las propuestas de los jugadores\n\n`;
    }

    let resultMessage = `🎮 **¡El juego ha comenzado!**\n\n` +
        `Se han enviado los roles por mensaje privado a todos los jugadores.\n` +
        `👥 **Jugadores:** ${playerIds.length}\n\n` +
        modeInfoButton +
        `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
        `**Usa los botones para:**\n` +
        `• 🗳️ **Votar Skip** - Cambiar de palabra (requiere mayoría)\n` +
        `• 🗳️ **Empezar Votación** - Votar para expulsar a un jugador\n\n` +
        `¡Que comience el juego! 🎲`;

    if (failedDMs.length > 0) {
        resultMessage += `\n\n⚠️ **Advertencia:** No se pudo enviar DM a: ${failedDMs.join(', ')}`;
    }

    const gameEmbed = createInfoEmbed('🎮 Juego Iniciado', resultMessage);
    const gameButtons = createGameButtons();

    const gameMessage = await interaction.editReply({
        embeds: [gameEmbed],
        components: [gameButtons]
    });

    room.gameMessage = gameMessage as Message;

    if (interaction.message) {
        try {
            await interaction.message.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del lobby - verifica permisos del bot', error instanceof Error ? error : new Error(String(error)));
        }
    }

    await updateLobbyMessage(room, interaction.message);

    const gameCollector = gameMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7200000
    });

    gameCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        try {
            await handleButtonInteraction(buttonInteraction, roomKey);
        } catch (error) {
            logger.error('Impostor', 'Error en botón del juego', error instanceof Error ? error : new Error(String(error)));
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu acción.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    gameCollector.on('end', () => {
        if (activeRooms.has(roomKey)) {
            activeRooms.delete(roomKey);
            logger.info('Impostor', `Sala ${roomKey} eliminada por timeout del juego`);
        }
    });
}

async function handleLeaveButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.players.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ No estás en la sala.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ No puedes salir mientras el juego está en curso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.players.delete(interaction.user.id);

    if (room.players.size === 0) {
        activeRooms.delete(roomKey);
        await interaction.reply({
            content: '🚪 La sala se ha cerrado porque no quedan jugadores.',
            });

        if (room.lobbyMessage) {
            try {
                await room.lobbyMessage.edit({ components: [] });
            } catch (error) {
                logger.error('Impostor', 'No se pudo deshabilitar botones del lobby cerrado - verifica permisos del bot', error instanceof Error ? error : new Error(String(error)));
            }
        }
        return;
    }

    if (room.hostId === interaction.user.id) {
        const newHostId = Array.from(room.players)[0];
        room.hostId = newHostId;
        const newHost = await interaction.client.users.fetch(newHostId);

        await interaction.reply({
            content: `🚪 **${interaction.user.displayName}** ha salido de la sala.\n👑 **Nuevo anfitrión:** ${newHost.displayName}`,
            flags: MessageFlags.Ephemeral
            });
    } else {
        await interaction.reply({
            content: `🚪 **${interaction.user.displayName}** ha salido de la sala.`,
            flags: MessageFlags.Ephemeral
            });
    }

    await updateLobbyMessage(room, interaction.message);
}

async function handleSkipButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.started) {
        await interaction.reply({
            content: '❌ El juego aún no ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.players.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ No estás participando en este juego.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.skipVotes.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ Ya has votado para saltar esta palabra.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.skipVotes.add(interaction.user.id);

    const requiredVotes = getRequiredVotes(room.players.size);
    const currentVotes = room.skipVotes.size;

    if (currentVotes >= requiredVotes) {
        await interaction.deferReply();

        const newWord = room.useAI ? await generateThemeWithAI() : getRandomWord();
        const playerIds = Array.from(room.players);

        room.currentWord = newWord;
        room.skipVotes.clear();

        const failedDMs: string[] = [];

        for (const playerId of playerIds) {
            if (playerId === room.impostorId) continue;

            const player = await interaction.client.users.fetch(playerId);

            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('🔄 Nueva Palabra')
                .setDescription(
                    `La palabra ha sido cambiada por votación!\n\n` +
                    `🔑 **Nueva palabra:** ||${newWord}||\n\n` +
                    `Continúa dando pistas para la nueva palabra.`
                )
                .setTimestamp();

            const success = await sendDM(player, embed);
            if (!success) {
                failedDMs.push(player.displayName);
            }
        }

        let skipMessage = `🔄 **¡Palabra cambiada!**\n\n` +
            `La votación para skip ha sido exitosa.\n` +
            `Se ha generado una nueva palabra y enviado a todos los jugadores.\n\n` +
            `📊 **Votos:** ${currentVotes}/${requiredVotes}`;

        if (failedDMs.length > 0) {
            skipMessage += `\n\n⚠️ No se pudo enviar DM a: ${failedDMs.join(', ')}`;
        }

        await interaction.editReply({ content: skipMessage });
    } else {
        await interaction.reply({
            content: `🗳️ **${interaction.user.displayName}** ha votado para cambiar la palabra.\n📊 **Votos:** ${currentVotes}/${requiredVotes}`,
            });
    }
}

async function createVoteSelectMenu(room: GameRoom, client: ChatInputCommandInteraction['client'] | ButtonInteraction['client']): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const options: StringSelectMenuOptionBuilder[] = [];

    for (const playerId of room.alivePlayers) {
        const player = await client.users.fetch(playerId);
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(player.displayName)
                .setValue(playerId)
        );
    }

    options.push(
        new StringSelectMenuOptionBuilder()
            .setLabel('Saltar voto (no expulsar a nadie)')
            .setValue('skip')
            .setDescription('Votar para no expulsar a nadie esta ronda')
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('impostor_vote_select')
        .setPlaceholder('Selecciona a quién expulsar')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

async function startVoting(
    client: ButtonInteraction['client'],
    roomKey: string,
    channelId: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room || !room.started || room.votingInProgress) {
        return;
    }

    room.votingInProgress = true;
    room.votes.clear();

    const alivePlayersList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const player = await client.users.fetch(playerId);
        alivePlayersList.push(`• ${player.displayName}`);
    }

    const embed = createInfoEmbed(
        '🗳️ Votación Iniciada',
        `Es hora de votar para expulsar a un jugador.\n\n` +
        `**Jugadores vivos (${room.alivePlayers.size}):**\n${alivePlayersList.join('\n')}\n\n` +
        `Todos los jugadores vivos deben votar usando el menú de abajo.\n` +
        `**Votos:** ${room.votes.size}/${room.alivePlayers.size}`
    );

    const selectMenuRow = await createVoteSelectMenu(room, client);

    const channel = client.channels.cache.get(channelId);
    if (!channel || !('send' in channel)) return;

    const voteMessage = await channel.send({
        embeds: [embed],
        components: [selectMenuRow]
    });

    room.votingMessage = voteMessage;

    const collector = voteMessage.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 300000
    });

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
        try {
            if (selectInteraction.customId === 'impostor_vote_select') {
                await handleVoteSelect(selectInteraction, roomKey);
            }
        } catch (error) {
            logger.error('Impostor', 'Error en votación', error instanceof Error ? error : new Error(String(error)));
            if (!selectInteraction.replied && !selectInteraction.deferred) {
                await selectInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu voto.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on('end', async () => {
        if (activeRooms.has(roomKey)) {
            const currentRoom = activeRooms.get(roomKey)!;
            if (currentRoom.votingInProgress) {
                currentRoom.votingInProgress = false;
            }
        }
    });
}

async function handleStartVoteButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.started) {
        await interaction.reply({
            content: '❌ El juego aún no ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.votingInProgress) {
        await interaction.reply({
            content: '❌ Ya hay una votación en progreso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.deferReply();

    await startVoting(interaction.client, roomKey, interaction.channelId);

    try {
        await interaction.deleteReply();
    } catch (error) {
        logger.error('Impostor', 'Error al eliminar respuesta diferida', error instanceof Error ? error : new Error(String(error)));
    }
}

async function handleVoteSelect(
    interaction: StringSelectMenuInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.votingInProgress) {
        await interaction.reply({
            content: '❌ No hay votación en progreso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.alivePlayers.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ No puedes votar porque no estás en el juego o ya fuiste expulsado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.votes.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ Ya has votado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const votedFor = interaction.values[0];
    room.votes.set(interaction.user.id, votedFor);

    await interaction.reply({
        content: `✅ Tu voto ha sido registrado.\n📊 **Votos:** ${room.votes.size}/${room.alivePlayers.size}`,
        flags: MessageFlags.Ephemeral
    });

    if (room.votingMessage) {
        const alivePlayersList: string[] = [];
        for (const playerId of room.alivePlayers) {
            const player = await interaction.client.users.fetch(playerId);
            const hasVoted = room.votes.has(playerId);
            alivePlayersList.push(`${hasVoted ? '✅' : '⏳'} ${player.displayName}`);
        }

        const updatedEmbed = createInfoEmbed(
            '🗳️ Votación en Progreso',
            `Es hora de votar para expulsar a un jugador.\n\n` +
            `**Jugadores vivos (${room.alivePlayers.size}):**\n${alivePlayersList.join('\n')}\n\n` +
            `**Votos:** ${room.votes.size}/${room.alivePlayers.size}`
        );

        try {
            await room.votingMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
            logger.error('Impostor', 'Error al actualizar mensaje de votación', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.votes.size === room.alivePlayers.size) {
        await processVotingResults(interaction, roomKey, interaction.client);
    }
}

async function processVotingResults(
    interaction: StringSelectMenuInteraction,
    roomKey: string,
    client: StringSelectMenuInteraction['client']
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) return;

    room.votingInProgress = false;

    const voteCounts = new Map<string, number>();

    for (const [, votedFor] of room.votes) {
        voteCounts.set(votedFor, (voteCounts.get(votedFor) || 0) + 1);
    }

    let maxVotes = 0;
    const playersWithMaxVotes: string[] = [];

    for (const [playerId, count] of voteCounts) {
        if (playerId === 'skip') continue;

        if (count > maxVotes) {
            maxVotes = count;
            playersWithMaxVotes.length = 0;
            playersWithMaxVotes.push(playerId);
        } else if (count === maxVotes) {
            playersWithMaxVotes.push(playerId);
        }
    }

    const skipVotes = voteCounts.get('skip') || 0;

    if (room.votingMessage) {
        try {
            await room.votingMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'Error al deshabilitar menú de votación', error instanceof Error ? error : new Error(String(error)));
        }
    }

    const channel = client.channels.cache.get(room.channelId);
    if (!channel || !('send' in channel)) return;

    if (playersWithMaxVotes.length === 0 || playersWithMaxVotes.length > 1 || skipVotes >= maxVotes) {
        const tieMessage = playersWithMaxVotes.length > 1
            ? `Hubo un empate entre ${playersWithMaxVotes.length} jugadores.`
            : `La mayoría votó por no expulsar a nadie.`;

        const aliveCount = room.alivePlayers.size;
        const aliveList: string[] = [];
        for (const playerId of room.alivePlayers) {
            const player = await client.users.fetch(playerId);
            aliveList.push(`• ${player.displayName}`);
        }

        const embed = createInfoEmbed(
            '🗳️ Resultados de Votación',
            `${tieMessage}\n\n**Nadie fue expulsado.**\n\n` +
            `👥 **Jugadores vivos (${aliveCount}):**\n${aliveList.join('\n')}\n\n` +
            `El juego continúa... Presiona "Siguiente Ronda" cuando estén listos.`
        );

        const nextRoundButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('impostor_next_round')
                .setLabel('Siguiente Ronda')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Success)
        );

        const resultMessage = await channel.send({
            embeds: [embed],
            components: [nextRoundButton]
        });

        const collector = resultMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            if (buttonInteraction.customId === 'impostor_next_round') {
                await handleNextRoundButton(buttonInteraction, roomKey);
                collector.stop();
            }
        });

        room.votes.clear();
        return;
    }

    const expelledId = playersWithMaxVotes[0];
    const expelled = await client.users.fetch(expelledId);
    const wasImpostor = expelledId === room.impostorId;

    room.alivePlayers.delete(expelledId);

    room.votes.clear();

    if (wasImpostor) {
        const resultEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🗳️ Resultados de Votación')
            .setDescription(
                `**${expelled.displayName}** ha sido expulsado con **${maxVotes}** voto(s).\n\n` +
                `🎉 **¡${expelled.displayName} ERA EL IMPOSTOR!**\n\n**Los jugadores normales ganan!**`
            )
            .setTimestamp();

        await channel.send({ embeds: [resultEmbed] });
        await endGame(client, roomKey, false);
        return;
    }

    const victoryCheck = await checkVictoryConditions(roomKey);
    if (victoryCheck) {
        const resultEmbed = new EmbedBuilder()
            .setColor(COLORS.DANGER)
            .setTitle('🗳️ Resultados de Votación')
            .setDescription(
                `**${expelled.displayName}** ha sido expulsado con **${maxVotes}** voto(s).\n\n` +
                `❌ **${expelled.displayName} NO era el impostor...**\n\n` +
                `🕵️ **¡El impostor gana!** Solo quedan 2 jugadores.`
            )
            .setTimestamp();

        await channel.send({ embeds: [resultEmbed] });
        await endGame(client, roomKey, true);
        return;
    }

    const aliveCount = room.alivePlayers.size;
    const aliveList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const player = await client.users.fetch(playerId);
        aliveList.push(`• ${player.displayName}`);
    }

    const resultEmbed = new EmbedBuilder()
        .setColor(COLORS.DANGER)
        .setTitle('🗳️ Resultados de Votación')
        .setDescription(
            `**${expelled.displayName}** ha sido expulsado con **${maxVotes}** voto(s).\n\n` +
            `❌ **${expelled.displayName} NO era el impostor...**\n\n` +
            `👥 **Jugadores vivos (${aliveCount}):**\n${aliveList.join('\n')}\n\n` +
            `El impostor sigue entre ustedes. Presiona "Siguiente Ronda" cuando estén listos.`
        )
        .setTimestamp();

    const nextRoundButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('impostor_next_round')
            .setLabel('Siguiente Ronda')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Success)
    );

    const resultMessage = await channel.send({
        embeds: [resultEmbed],
        components: [nextRoundButton]
    });

    const collector = resultMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === 'impostor_next_round') {
            await handleNextRoundButton(buttonInteraction, roomKey);
            collector.stop();
        }
    });
}

async function handleNextRoundButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.started) {
        await interaction.reply({
            content: '❌ El juego no está en curso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        await interaction.message.edit({ components: [] });
    } catch (error) {
        logger.error('Impostor', 'Error al deshabilitar botón de siguiente ronda', error instanceof Error ? error : new Error(String(error)));
    }

    room.skipVotes.clear();

    const aliveCount = room.alivePlayers.size;
    const aliveList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const player = await interaction.client.users.fetch(playerId);
        aliveList.push(`• ${player.displayName}`);
    }

    const roundEmbed = createInfoEmbed(
        '▶️ Nueva Ronda',
        `🎮 **El juego continúa**\n\n` +
        `👥 **Jugadores vivos (${aliveCount}):**\n${aliveList.join('\n')}\n\n` +
        `🔑 **Palabra:** ||${room.currentWord}||\n\n` +
        `**Continúen dando pistas y discutiendo.**\n` +
        `Cuando estén listos para votar de nuevo, usen el botón "Empezar Votación".`
    );

    const gameButtons = createGameButtons();

    const newGameMessage = await interaction.reply({
        embeds: [roundEmbed],
        components: [gameButtons],
        fetchReply: true
    });

    if (room.gameMessage) {
        try {
            await room.gameMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'Error al deshabilitar botones del mensaje anterior', error instanceof Error ? error : new Error(String(error)));
        }
    }

    room.gameMessage = newGameMessage as Message;

    const collector = newGameMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7200000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        try {
            await handleButtonInteraction(buttonInteraction, roomKey);
        } catch (error) {
            logger.error('Impostor', 'Error en botón de la ronda', error instanceof Error ? error : new Error(String(error)));
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu acción.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on('end', () => {
        if (activeRooms.has(roomKey)) {
            const currentRoom = activeRooms.get(roomKey);
            if (currentRoom && !currentRoom.votingInProgress) {
                logger.info('Impostor', `Collector de ronda terminado para sala ${roomKey}`);
            }
        }
    });
}

async function checkVictoryConditions(
    roomKey: string
): Promise<boolean> {
    const room = activeRooms.get(roomKey);

    if (!room) return false;

    if (room.alivePlayers.size <= 2) {
        return true;
    }

    return false;
}

async function endGame(
    client: StringSelectMenuInteraction['client'],
    roomKey: string,
    impostorWins: boolean
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) return;

    const impostor = await client.users.fetch(room.impostorId!);
    const word = room.currentWord!;

    const embed = new EmbedBuilder()
        .setColor(impostorWins ? COLORS.DANGER : COLORS.SUCCESS)
        .setTitle(impostorWins ? '🕵️ ¡El Impostor Gana!' : '✅ ¡Los Jugadores Ganan!')
        .setDescription(
            impostorWins
                ? `**${impostor.displayName}** (el impostor) ha ganado!\n\nQuedan muy pocos jugadores para votarlo.\n\n🔑 **La palabra era:** ||${word}||`
                : `**${impostor.displayName}** era el impostor y ha sido descubierto!\n\n🔑 **La palabra era:** ||${word}||\n\n¡Gracias por jugar!`
        )
        .setTimestamp();

    const channel = client.channels.cache.get(room.channelId);
    if (channel && 'send' in channel) {
        await channel.send({ embeds: [embed] });
    }

    if (room.gameMessage) {
        try {
            await room.gameMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del juego', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.lobbyMessage) {
        try {
            await room.lobbyMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del lobby', error instanceof Error ? error : new Error(String(error)));
        }
    }

    activeRooms.delete(roomKey);
    logger.info('Impostor', `Juego terminado en sala ${roomKey} - ${impostorWins ? 'Impostor gana' : 'Jugadores ganan'}`);
}

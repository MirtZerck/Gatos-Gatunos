import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
    ComponentType,
    Message,
    User,
    GuildMember,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction,
    InteractionCollector,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from 'discord.js';
import { SlashOnlyCommand } from '../../types/Command.js';
import { BotClient } from '../../types/BotClient.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { sendMessage, createInfoEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/messageUtils.js';
import { logger } from '../../utils/logger.js';
import { triviaService } from '../../services/TriviaService.js';
import { MillionaireGameRoom, TriviaQuestion, GameEndData } from '../../types/millionaire.js';
import {
    PRIZE_LADDER,
    getPrizeForLevel,
    getDifficultyForLevel,
    getLastSafeHaven,
    formatPrize
} from '../../config/millionairePrizes.js';

const activeRooms = new Map<string, MillionaireGameRoom>();

// Host message templates for different moments
const HOST_MESSAGES = {
    questionIntros: [
        'Veamos la siguiente pregunta...',
        'Muy bien, ahora viene una pregunta de {category}...',
        'Atención, pregunta por ${amount}...',
        'Siguiente pregunta. Escucha con atención...',
        'Vamos con la pregunta número {level}...',
        'Interesante. La próxima pregunta es...'
    ],

    afterSelection: [
        'Has elegido {option}...',
        'Interesante elección, {option}...',
        '{option}... veamos...',
        'Elegiste {option}. Muy bien...',
        'Opción {option}. Interesante...',
        '{option} es tu respuesta...'
    ],

    askingFinal: [
        '¿Es tu respuesta final?',
        '¿Estás seguro de {option}?',
        '¿Definitivamente {option}?',
        '¿{option} es tu respuesta final?',
        '¿Vas con {option}?',
        '¿Te quedas con {option}?'
    ],

    correctReveal: [
        '¡Correcto! Has ganado ${amount}!',
        '¡Excelente! La respuesta correcta era {answer}',
        '¡Así se hace! ${amount} son tuyos',
        '¡Muy bien! Has acertado. ${amount}',
        '¡Correcto! La respuesta era {answer}. Has ganado ${amount}',
        '¡Fantástico! ${amount} para ti'
    ],

    incorrectReveal: [
        'Lo siento, la respuesta correcta era {answer}...',
        'Incorrecto. Te llevas ${amount}',
        'No es correcta. La respuesta era {answer}',
        'Lo lamento. La correcta era {answer}. Te vas con ${amount}',
        'No... la respuesta correcta era {answer}',
        'Desafortunadamente no. Era {answer}. Te llevas ${amount}'
    ]
};

function getHostMessage(
    type: 'questionIntros' | 'afterSelection' | 'askingFinal' | 'correctReveal' | 'incorrectReveal',
    replacements?: { [key: string]: string }
): string {
    const messages = HOST_MESSAGES[type];
    let message = messages[Math.floor(Math.random() * messages.length)];

    if (replacements) {
        for (const [key, value] of Object.entries(replacements)) {
            message = message.replace(`{${key}}`, value);
        }
    }

    return message;
}

function getRoomKey(guildId: string, channelId: string): string {
    return `${guildId}-${channelId}`;
}

function getMemberDisplayName(member: GuildMember | null | undefined, user: User): string {
    if (member && typeof member === 'object' && 'displayName' in member) {
        return member.displayName;
    }
    return user.displayName;
}

async function createRoom(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Comando solo disponible en servidores',
            '❌ Este comando solo puede usarse en un servidor.'
        );
    }

    const roomKey = getRoomKey(interaction.guildId, interaction.channelId);

    if (activeRooms.has(roomKey)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Ya existe una sala activa',
            '❌ Ya hay un juego activo en este canal. Espera a que termine o usa `/millionaire abandonar`.'
        );
    }

    const room: MillionaireGameRoom = {
        hostId: '',
        playerId: '',
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        started: false,
        hasHost: true,
        currentQuestionIndex: 0,
        currentPrize: 0,
        safeHavenReached: 0,
        usedQuestionIds: new Set(),
        lifelines: {
            fiftyFifty: true,
            askAudience: true,
            callFriend: true,
            changeQuestion: true
        }
    };

    activeRooms.set(roomKey, room);

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    const message = await interaction.reply({
        embeds: [embed],
        components: [buttons],
        fetchReply: true
    });

    room.lobbyMessage = message;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        try {
            if (i.customId === 'millionaire_join') {
                await handleJoin(i, room);
            } else if (i.customId === 'millionaire_volunteer_host') {
                await handleVolunteerHost(i, room);
            } else if (i.customId === 'millionaire_start') {
                await handleStart(i, room);
            } else if (i.customId === 'millionaire_leave') {
                await handleLeaveRoom(i, room);
            } else if (i.customId === 'millionaire_cancel') {
                await handleCancel(i, room, roomKey);
            }
        } catch (error) {
            logger.error('Millionaire', 'Error en lobby collector', error instanceof Error ? error : new Error(String(error)));
            const embed = createErrorEmbed('❌ Error', 'Ocurrió un error. Por favor, intenta nuevamente.');
            await i.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }
    });

    collector.on('end', () => {
        if (!room.started && activeRooms.has(roomKey)) {
            activeRooms.delete(roomKey);
            logger.info('Millionaire', `Lobby timeout en ${roomKey}`);
        }
    });

    logger.info('Millionaire', `Sala creada en ${roomKey} (anfitrión opcional)`);
}

function createLobbyEmbed(room: MillionaireGameRoom, creator: User): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('💰 ¿Quién Quiere Ser Millonario? 💰')
        .setDescription('¡Responde 15 preguntas de trivia y gana hasta **$1,000,000**!')
        .addFields(
            {
                name: '🎯 Concursante',
                value: room.playerId ? `<@${room.playerId}>` : 'Esperando...',
                inline: true
            },
            {
                name: '🎬 Anfitrión',
                value: room.hostId ? `<@${room.hostId}>` : 'Ninguno (Opcional)',
                inline: true
            }
        )
        .addFields(
            {
                name: '📋 Reglas',
                value: '• 15 preguntas de dificultad progresiva\n• 4 comodines disponibles\n• Puntos seguros en $1,000 y $32,000\n• Puedes retirarte en cualquier momento'
            }
        )
        .setFooter({ text: `Creado por ${creator.displayName}` })
        .setTimestamp();

    return embed;
}

function createLobbyButtons(room: MillionaireGameRoom): ActionRowBuilder<ButtonBuilder> {
    const joinButton = new ButtonBuilder()
        .setCustomId('millionaire_join')
        .setLabel('Unirse como Concursante')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎯')
        .setDisabled(!!room.playerId);

    const volunteerButton = new ButtonBuilder()
        .setCustomId('millionaire_volunteer_host')
        .setLabel('Ser Anfitrión')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎬')
        .setDisabled(!!room.hostId);

    const startButton = new ButtonBuilder()
        .setCustomId('millionaire_start')
        .setLabel('Iniciar Juego')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️')
        .setDisabled(!canStartGame(room));

    const leaveButton = new ButtonBuilder()
        .setCustomId('millionaire_leave')
        .setLabel('Abandonar Sala')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚪');

    const cancelButton = new ButtonBuilder()
        .setCustomId('millionaire_cancel')
        .setLabel('Cancelar Juego')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        joinButton,
        volunteerButton,
        startButton,
        leaveButton,
        cancelButton
    );
}

function canStartGame(room: MillionaireGameRoom): boolean {
    return !!room.playerId;
}

async function handleJoin(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (room.playerId) {
        await interaction.reply({
            content: '❌ Ya hay un concursante en la sala.',
            ephemeral: true
        });
        return;
    }

    if (room.hostId === interaction.user.id) {
        await interaction.reply({
            content: '❌ No puedes ser concursante y anfitrión al mismo tiempo.',
            ephemeral: true
        });
        return;
    }

    room.playerId = interaction.user.id;

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });

    logger.info('Millionaire', `${interaction.user.tag} se unió como concursante`);
}

async function handleVolunteerHost(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (room.hostId) {
        await interaction.reply({
            content: '❌ Ya hay un anfitrión en la sala.',
            ephemeral: true
        });
        return;
    }

    if (room.playerId === interaction.user.id) {
        await interaction.reply({
            content: '❌ No puedes ser anfitrión y concursante al mismo tiempo.',
            ephemeral: true
        });
        return;
    }

    room.hostId = interaction.user.id;

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });

    logger.info('Millionaire', `${interaction.user.tag} se unió como anfitrión`);
}

async function handleLeaveRoom(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const userId = interaction.user.id;
    let wasInRoom = false;
    let role = '';

    if (room.playerId === userId) {
        room.playerId = '';
        wasInRoom = true;
        role = 'concursante';
    }

    if (room.hostId === userId) {
        room.hostId = '';
        wasInRoom = true;
        role = role ? 'concursante y anfitrión' : 'anfitrión';
    }

    if (!wasInRoom) {
        await interaction.reply({
            content: '❌ No estás en la sala.',
            ephemeral: true
        });
        return;
    }

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });

    logger.info('Millionaire', `${interaction.user.tag} abandonó la sala (${role})`);
}

async function handleStart(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!canStartGame(room)) {
        await interaction.reply({
            content: '❌ No se puede iniciar el juego. Asegúrate de que haya un concursante.',
            ephemeral: true
        });
        return;
    }

    const isCreatorOrParticipant =
        interaction.user.id === room.playerId ||
        interaction.user.id === room.hostId;

    if (!isCreatorOrParticipant) {
        await interaction.reply({
            content: '❌ Solo los participantes del juego pueden iniciarlo.',
            ephemeral: true
        });
        return;
    }

    room.started = true;

    await interaction.update({
        embeds: [createInfoEmbed('🎮 Iniciando Juego', 'Preparando la primera pregunta...')],
        components: []
    });

    try {
        room.sessionToken = await triviaService.getSessionToken();
        await startGame(interaction, room);
    } catch (error) {
        logger.error('Millionaire', 'Error al iniciar juego', error instanceof Error ? error : new Error(String(error)));
        const embed = createErrorEmbed('❌ Error', 'No se pudo iniciar el juego. Intenta nuevamente.');
        await interaction.followUp({ embeds: [embed], ephemeral: true });
        const roomKey = getRoomKey(room.guildId, room.channelId);
        activeRooms.delete(roomKey);
    }
}

async function handleCancel(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    roomKey: string
): Promise<void> {
    activeRooms.delete(roomKey);

    await interaction.update({
        embeds: [createInfoEmbed('❌ Juego Cancelado', 'El juego ha sido cancelado.')],
        components: []
    });

    logger.info('Millionaire', `Juego cancelado en ${roomKey}`);
}

async function startGame(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    room.currentQuestionIndex = 1;

    if (room.hasHost && room.hostId) {
        const host = await interaction.client.users.fetch(room.hostId);
        try {
            await host.send({
                embeds: [createInfoEmbed(
                    '🎬 Panel de Anfitrión',
                    'El juego ha comenzado. Recibirás las preguntas y respuestas aquí para que puedas dirigir el juego.'
                )]
            });
        } catch (error) {
            logger.warn('Millionaire', 'No se pudo enviar DM al anfitrión');
        }
    }

    await displayQuestion(interaction, room);
}

async function displayQuestion(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom
): Promise<void> {
    const difficulty = getDifficultyForLevel(room.currentQuestionIndex);
    const prize = getPrizeForLevel(room.currentQuestionIndex);

    if (!prize) {
        await endGame(interaction, room, true);
        return;
    }

    try {
        let question = await triviaService.getQuestion(
            difficulty,
            room.usedQuestionIds,
            room.sessionToken
        );

        question = await triviaService.enhanceQuestionWithImage(question);

        room.currentQuestion = question;
        room.usedQuestionIds.add(question.id);
        room.eliminatedAnswers = [];

        if (room.hasHost && room.hostId) {
            await displayQuestionWithHost(interaction, room, question, prize.amount);
        } else {
            await displayQuestionAutomatic(interaction, room, question, prize.amount);
        }

    } catch (error) {
        logger.error('Millionaire', 'Error obteniendo pregunta', error instanceof Error ? error : new Error(String(error)));
        await endGame(interaction, room, false, 'Error obteniendo pregunta');
    }
}

async function displayQuestionAutomatic(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.questionStartTime = Date.now();

    const embed = createQuestionEmbed(room, question, prizeAmount);
    const buttons = createQuestionButtons(room);

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const message = await channel.send({
        embeds: [embed],
        components: buttons
    });

    room.gameMessage = message;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000
    });

    room.currentCollector = collector as InteractionCollector<ButtonInteraction>;

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.playerId) {
            await i.reply({
                content: '❌ Solo el concursante puede responder.',
                ephemeral: true
            });
            return;
        }

        try {
            if (i.customId.startsWith('millionaire_answer_')) {
                await handleAnswer(i, room);
                collector.stop();
            } else if (i.customId === 'millionaire_cashout') {
                await handleCashout(i, room);
                collector.stop();
            } else if (i.customId === 'millionaire_quit') {
                await handleQuit(i, room);
                collector.stop();
            } else if (i.customId.startsWith('millionaire_lifeline_')) {
                await handleLifeline(i, room);
            }
        } catch (error) {
            logger.error('Millionaire', 'Error en game collector', error instanceof Error ? error : new Error(String(error)));
            const embed = createErrorEmbed('❌ Error', 'Ocurrió un error procesando tu acción.');
            await i.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
            collector.stop();
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            await handleTimeout(interaction, room);
        }
    });
}

async function displayQuestionWithHost(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.hostPanelState = 'WAITING_QUESTION_READ';
    room.questionRevealed = false;
    room.optionsRevealed = 0;

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const waitingEmbed = createInfoEmbed(
        `💰 PREGUNTA ${room.currentQuestionIndex} - ${formatPrize(prizeAmount)} 💰`,
        '🎬 El anfitrión está preparando la pregunta...\n\nEsperando...'
    );

    const message = await channel.send({
        embeds: [waitingEmbed]
    });

    room.gameMessage = message;

    await initializeHostPanelForQuestion(interaction, room, question, prizeAmount);
}

function createQuestionEmbed(
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): EmbedBuilder {
    const safeHaven = getLastSafeHaven(room.currentQuestionIndex);
    const difficultyEmojis = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴'
    };

    const answers = question.allAnswers || [];
    const letters = ['A', 'B', 'C', 'D'];

    let answersText = '';
    for (let i = 0; i < answers.length; i++) {
        const isEliminated = room.eliminatedAnswers?.includes(answers[i]);
        if (!isEliminated) {
            answersText += `**${letters[i]})** ${answers[i]}\n`;
        }
    }

    const endTime = room.questionStartTime ? Math.floor((room.questionStartTime + 180000) / 1000) : Math.floor((Date.now() + 180000) / 1000);

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`💰 PREGUNTA ${room.currentQuestionIndex} - ${formatPrize(prizeAmount)} 💰`)
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
            {
                name: `${difficultyEmojis[question.difficulty]} ${question.category}`,
                value: `**${question.question}**\n\n${answersText}`
            },
            {
                name: '⏱️ Tiempo restante',
                value: `<t:${endTime}:R>`,
                inline: true
            },
            {
                name: '🏦 Punto seguro',
                value: formatPrize(safeHaven),
                inline: true
            }
        );

    if (question.imageUrl) {
        embed.setImage(question.imageUrl);
    }

    return embed;
}

function createQuestionButtons(room: MillionaireGameRoom): ActionRowBuilder<ButtonBuilder>[] {
    const answers = room.currentQuestion?.allAnswers || [];
    const letters = ['A', 'B', 'C', 'D'];

    const answerButtons: ButtonBuilder[] = [];

    for (let i = 0; i < answers.length; i++) {
        const isEliminated = room.eliminatedAnswers?.includes(answers[i]);
        if (!isEliminated) {
            answerButtons.push(
                new ButtonBuilder()
                    .setCustomId(`millionaire_answer_${letters[i]}`)
                    .setLabel(letters[i])
                    .setStyle(ButtonStyle.Primary)
            );
        }
    }

    const lifelineRow = new ButtonBuilder()
        .setCustomId('millionaire_lifeline_5050')
        .setLabel('50:50')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!room.lifelines.fiftyFifty);

    const audienceButton = new ButtonBuilder()
        .setCustomId('millionaire_lifeline_audience')
        .setLabel('📊 Público')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!room.lifelines.askAudience);

    const friendButton = new ButtonBuilder()
        .setCustomId('millionaire_lifeline_friend')
        .setLabel('📞 Amigo')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!room.lifelines.callFriend);

    const changeButton = new ButtonBuilder()
        .setCustomId('millionaire_lifeline_change')
        .setLabel('🔄 Cambiar')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!room.lifelines.changeQuestion);

    const cashoutButton = new ButtonBuilder()
        .setCustomId('millionaire_cashout')
        .setLabel(`💰 Retirarse (${formatPrize(room.currentPrize)})`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(room.currentPrize === 0);

    const quitButton = new ButtonBuilder()
        .setCustomId('millionaire_quit')
        .setLabel('❌ Abandonar')
        .setStyle(ButtonStyle.Danger);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    const answerRow1 = new ActionRowBuilder<ButtonBuilder>();
    const answerRow2 = new ActionRowBuilder<ButtonBuilder>();

    if (answerButtons.length <= 2) {
        answerRow1.addComponents(...answerButtons);
        rows.push(answerRow1);
    } else {
        answerRow1.addComponents(answerButtons[0], answerButtons[1]);
        answerRow2.addComponents(answerButtons[2]);
        if (answerButtons[3]) answerRow2.addComponents(answerButtons[3]);
        rows.push(answerRow1, answerRow2);
    }

    const lifelineRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        lifelineRow,
        audienceButton,
        friendButton,
        changeButton
    );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        cashoutButton,
        quitButton
    );

    rows.push(lifelineRow1, actionRow);

    return rows;
}

async function initializeHostPanelForQuestion(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    if (!room.hostId) return;

    try {
        const host = await interaction.client.users.fetch(room.hostId);

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('🎬 PANEL DE ANFITRIÓN')
            .setDescription(
                `**Pregunta ${room.currentQuestionIndex}** de 15 - ${formatPrize(prizeAmount)}\n\n` +
                `**Pregunta:** ${question.question}\n\n` +
                `**✅ Respuesta Correcta:** ${question.correctAnswer}\n` +
                `**Categoría:** ${question.category}\n\n` +
                `¿Deseas leer la pregunta dramáticamente o revelar todo de una vez?`
            );

        const readButton = new ButtonBuilder()
            .setCustomId('millionaire_host_read_question')
            .setLabel('📖 Leer Pregunta')
            .setStyle(ButtonStyle.Primary);

        const skipButton = new ButtonBuilder()
            .setCustomId('millionaire_host_skip_intro')
            .setLabel('⏭️ Revelar Todo')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(readButton, skipButton);

        if (room.hostPanelMessage) {
            await room.hostPanelMessage.edit({
                embeds: [embed],
                components: [row]
            });
        } else {
            room.hostPanelMessage = await host.send({
                embeds: [embed],
                components: [row]
            });
        }

        const collector = room.hostPanelMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000
        });

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== room.hostId) {
                await i.reply({
                    content: '❌ Solo el anfitrión puede usar estos controles.',
                    ephemeral: true
                });
                return;
            }

            if (i.customId === 'millionaire_host_read_question') {
                await handleHostReadQuestion(i, room, question, prizeAmount);
            } else if (i.customId === 'millionaire_host_skip_intro') {
                await handleHostSkipIntro(i, room, question, prizeAmount);
            }

            collector.stop();
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await handleHostSkipIntro(interaction, room, question, prizeAmount);
            }
        });

    } catch (error) {
        logger.warn('Millionaire', 'No se pudo inicializar panel del anfitrión');
        await displayQuestionAutomatic(interaction, room, question, prizeAmount);
    }
}

async function handleHostReadQuestion(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.hostPanelState = 'QUESTION_READ';

    await interaction.update({
        content: '📖 Leyendo pregunta...',
        components: []
    });

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const readingEmbed = createInfoEmbed(
        `💰 PREGUNTA ${room.currentQuestionIndex} - ${formatPrize(prizeAmount)} 💰`,
        '🎬 **Anfitrión está leyendo la pregunta...**\n\n' +
        '_Preparando revelación..._'
    );

    if (room.gameMessage) {
        await room.gameMessage.edit({ embeds: [readingEmbed] });
    }

    await showHostRevealQuestionPanel(interaction, room, question, prizeAmount);
}

async function showHostRevealQuestionPanel(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    if (!room.hostId || !room.hostPanelMessage) return;

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎬 REVELAR PREGUNTA')
        .setDescription(
            `¿Listo para revelar la pregunta a los espectadores?`
        );

    const revealButton = new ButtonBuilder()
        .setCustomId('millionaire_host_reveal_question')
        .setLabel('📢 Revelar Pregunta')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(revealButton);

    await room.hostPanelMessage.edit({
        embeds: [embed],
        components: [row]
    });

    const collector = room.hostPanelMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.hostId) {
            await i.reply({
                content: '❌ Solo el anfitrión puede usar estos controles.',
                ephemeral: true
            });
            return;
        }

        if (i.customId === 'millionaire_host_reveal_question') {
            await handleHostRevealQuestion(i, room, question, prizeAmount);
        }

        collector.stop();
    });
}

async function handleHostRevealQuestion(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.hostPanelState = 'QUESTION_REVEALED';
    room.questionRevealed = true;

    await interaction.update({
        content: '📢 Revelando pregunta...',
        components: []
    });

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const difficultyEmojis = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴'
    };

    const questionEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`💰 PREGUNTA ${room.currentQuestionIndex} - ${formatPrize(prizeAmount)} 💰`)
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields({
            name: `${difficultyEmojis[question.difficulty]} ${question.category}`,
            value: `**${question.question}**\n\n🎬 _Anfitrión revelará las opciones..._`
        });

    if (question.imageUrl) {
        questionEmbed.setImage(question.imageUrl);
    }

    if (room.gameMessage) {
        await room.gameMessage.edit({ embeds: [questionEmbed] });
    }

    await showHostRevealOptionsPanel(interaction, room, question, prizeAmount);
}

async function showHostRevealOptionsPanel(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    if (!room.hostId || !room.hostPanelMessage) return;

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎬 REVELAR OPCIONES')
        .setDescription(
            `¿Cómo deseas revelar las opciones?`
        );

    const autoButton = new ButtonBuilder()
        .setCustomId('millionaire_host_reveal_auto')
        .setLabel('🎬 Auto (una cada 2s)')
        .setStyle(ButtonStyle.Primary);

    const manualButton = new ButtonBuilder()
        .setCustomId('millionaire_host_reveal_manual')
        .setLabel('🎯 Manual (Control Total)')
        .setStyle(ButtonStyle.Success);

    const allButton = new ButtonBuilder()
        .setCustomId('millionaire_host_reveal_all')
        .setLabel('⏭️ Mostrar Todas')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(autoButton, manualButton, allButton);

    await room.hostPanelMessage.edit({
        embeds: [embed],
        components: [row]
    });

    const collector = room.hostPanelMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.hostId) {
            await i.reply({
                content: '❌ Solo el anfitrión puede usar estos controles.',
                ephemeral: true
            });
            return;
        }

        if (i.customId === 'millionaire_host_reveal_auto') {
            await handleHostRevealOptionsAuto(i, room, question, prizeAmount);
        } else if (i.customId === 'millionaire_host_reveal_manual') {
            await handleHostRevealOptionsManual(i, room, question, prizeAmount);
        } else if (i.customId === 'millionaire_host_reveal_all') {
            await handleHostRevealOptionsAll(i, room, question, prizeAmount);
        }

        collector.stop();
    });
}

async function handleHostRevealOptionsAuto(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.hostPanelState = 'OPTIONS_REVEALING';

    await interaction.update({
        content: '🎬 Revelando opciones automáticamente...',
        components: []
    });

    await revealOptionsProgressively(room, question, prizeAmount);
    await finalizeQuestionReveal(interaction, room, question, prizeAmount);
}

async function handleHostRevealOptionsAll(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.optionsRevealed = 4;

    await interaction.update({
        content: '⏭️ Mostrando todas las opciones...',
        components: []
    });

    await revealOptionsProgressively(room, question, prizeAmount, true);
    await finalizeQuestionReveal(interaction, room, question, prizeAmount);
}

async function handleHostRevealOptionsManual(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.hostPanelState = 'OPTIONS_REVEALING_MANUAL';
    room.revealMode = 'manual';

    // Initialize time control if needed
    if (!room.timeControl) {
        room.timeControl = {
            pausedTotal: 0,
            maxPauseDuration: 60000, // 1 minuto máximo
            pausesRemaining: 2,
            isPaused: false
        };
    }

    await showManualRevealPanel(interaction, room, question, prizeAmount);
}

async function showManualRevealPanel(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    if (!room.hostPanelMessage || !question.allAnswers) return;

    const letters = ['A', 'B', 'C', 'D'];
    const revealed = room.optionsRevealed || 0;

    // Create status text
    let statusText = '**Opciones:**\n';
    for (let i = 0; i < 4; i++) {
        if (i < revealed) {
            statusText += `✅ ${letters[i]}) ${question.allAnswers[i]}\n`;
        } else {
            statusText += `⏸️ ${letters[i]}) ???\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎯 MODO CONTROL TOTAL')
        .setDescription(
            `Presiona los botones para revelar cada opción:\n\n${statusText}\n` +
            `**Reveladas:** ${revealed}/4`
        );

    const buttons: ButtonBuilder[] = [];

    // Create button for each unrevealed option
    for (let i = revealed; i < 4; i++) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`millionaire_host_reveal_option_${letters[i]}`)
                .setLabel(`Revelar ${letters[i]}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(i !== revealed) // Only enable the next option
        );
    }

    // Add "Reveal All Now" button if not all revealed
    if (revealed < 4) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('millionaire_host_reveal_all_now')
                .setLabel('⏭️ Revelar Todas Ya')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    await interaction.update({
        embeds: [embed],
        components: [row]
    });

    // Set up collector for manual reveals
    if (room.hostPanelCollector) {
        room.hostPanelCollector.stop();
    }

    const collector = room.hostPanelMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes for manual mode
    });

    room.hostPanelCollector = collector as InteractionCollector<ButtonInteraction>;

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.hostId) {
            await i.reply({
                content: '❌ Solo el anfitrión puede usar estos controles.',
                ephemeral: true
            });
            return;
        }

        if (i.customId === 'millionaire_host_reveal_all_now') {
            collector.stop();
            await handleHostRevealAllNow(i, room, question, prizeAmount);
        } else if (i.customId.startsWith('millionaire_host_reveal_option_')) {
            const letter = i.customId.split('_').pop() as string;
            await handleHostRevealSingleOption(i, room, question, prizeAmount, letter);
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && room.optionsRevealed !== 4) {
            // Emergency mode: reveal all if host times out
            room.emergencyMode = true;
            handleEmergencyReveal(room, question, prizeAmount);
        }
    });
}

async function handleHostRevealSingleOption(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number,
    letter: string
): Promise<void> {
    if (!question.allAnswers) return;

    const currentRevealed = room.optionsRevealed || 0;
    room.optionsRevealed = currentRevealed + 1;

    // Update game message with new option
    await updateGameMessageWithOptions(room, question, prizeAmount);

    // If all options revealed, finalize
    if (room.optionsRevealed === 4) {
        if (room.hostPanelCollector) {
            room.hostPanelCollector.stop();
        }

        await interaction.update({
            content: '✅ Todas las opciones reveladas. El jugador ya puede responder.',
            components: []
        });

        await finalizeQuestionReveal(interaction, room, question, prizeAmount);
    } else {
        // Show panel again with next option available
        await showManualRevealPanel(interaction, room, question, prizeAmount);
    }
}

async function handleHostRevealAllNow(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.optionsRevealed = 4;

    await interaction.update({
        content: '⏭️ Revelando todas las opciones restantes...',
        components: []
    });

    await updateGameMessageWithOptions(room, question, prizeAmount);
    await finalizeQuestionReveal(interaction, room, question, prizeAmount);
}

async function updateGameMessageWithOptions(
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    if (!room.gameMessage || !question.allAnswers) return;

    const letters = ['A', 'B', 'C', 'D'];
    const revealed = room.optionsRevealed || 0;
    const difficultyEmojis = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴'
    };

    let answersText = '';
    for (let i = 0; i < revealed; i++) {
        answersText += `**${letters[i]})** ${question.allAnswers[i]}\n`;
    }

    if (revealed < 4) {
        answersText += '\n🎬 _Esperando que el anfitrión revele más opciones..._';
    }

    const questionEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`💰 PREGUNTA ${room.currentQuestionIndex + 1} - $${prizeAmount.toLocaleString()} 💰`)
        .addFields(
            {
                name: `${difficultyEmojis[question.difficulty]} Categoría`,
                value: question.category,
                inline: true
            }
        )
        .setDescription(`**${question.question}**\n\n${answersText}`);

    await room.gameMessage.edit({ embeds: [questionEmbed] });
}

async function handleEmergencyReveal(
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    console.log(`[Millionaire] Emergency mode activated for room ${room.channelId}`);

    room.optionsRevealed = 4;
    await updateGameMessageWithOptions(room, question, prizeAmount);

    // Continue with automatic mode - send message to channel
    const channel = room.gameMessage?.channel;
    if (channel && 'send' in channel) {
        await channel.send({
            content: '⚠️ El anfitrión no respondió a tiempo. Continuando en modo automático.',
            embeds: []
        });

        // Start the question timer and enable buttons
        room.questionStartTime = Date.now();

        const buttons = createQuestionButtons(room);

        if (room.gameMessage) {
            await room.gameMessage.edit({ components: buttons });
        }

        // Set up collector for emergency mode
        const collector = room.gameMessage!.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000
        });

        room.currentCollector = collector as InteractionCollector<ButtonInteraction>;

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== room.playerId) {
                await i.reply({
                    content: '❌ Solo el concursante puede responder.',
                    ephemeral: true
                });
                return;
            }

            try {
                if (i.customId.startsWith('millionaire_answer_')) {
                    await handleAnswer(i, room);
                    collector.stop();
                } else if (i.customId === 'millionaire_cashout') {
                    await handleCashout(i, room);
                    collector.stop();
                } else if (i.customId === 'millionaire_quit') {
                    await handleQuit(i, room);
                    collector.stop();
                } else if (i.customId.startsWith('millionaire_lifeline_')) {
                    await handleLifeline(i, room);
                }
            } catch (error) {
                logger.error('Millionaire', 'Error en emergency collector', error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
}

async function handleHostSkipIntro(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.questionRevealed = true;
    room.optionsRevealed = 4;

    await interaction.update({
        content: '⏭️ Revelando todo...',
        components: []
    });

    await displayQuestionAutomatic(interaction, room, question, prizeAmount);
}

async function revealOptionsProgressively(
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number,
    instant: boolean = false
): Promise<void> {
    const channel = await room.gameMessage?.channel;
    if (!channel || !('send' in channel)) return;

    const letters = ['A', 'B', 'C', 'D'];
    const difficultyEmojis = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴'
    };

    const safeHaven = getLastSafeHaven(room.currentQuestionIndex);

    for (let i = room.optionsRevealed || 0; i < 4; i++) {
        if (!instant && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        room.optionsRevealed = i + 1;

        let answersText = '';
        for (let j = 0; j <= i; j++) {
            answersText += `**${letters[j]})** ${question.allAnswers?.[j]}\n`;
        }

        if (i < 3) {
            answersText += '\n🎬 _Revelando más opciones..._';
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle(`💰 PREGUNTA ${room.currentQuestionIndex} - ${formatPrize(prizeAmount)} 💰`)
            .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            .addFields({
                name: `${difficultyEmojis[question.difficulty]} ${question.category}`,
                value: `**${question.question}**\n\n${answersText}`
            });

        if (i === 3) {
            const endTime = Math.floor((Date.now() + 180000) / 1000);
            embed.addFields(
                {
                    name: '⏱️ Tiempo restante',
                    value: `<t:${endTime}:R>`,
                    inline: true
                },
                {
                    name: '🏦 Punto seguro',
                    value: formatPrize(safeHaven),
                    inline: true
                }
            );
        }

        if (question.imageUrl) {
            embed.setImage(question.imageUrl);
        }

        if (room.gameMessage) {
            await room.gameMessage.edit({ embeds: [embed] });
        }
    }
}

async function finalizeQuestionReveal(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    room.hostPanelState = 'WAITING_PLAYER';
    room.questionStartTime = Date.now();

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const buttons = createQuestionButtons(room);

    if (room.gameMessage) {
        await room.gameMessage.edit({ components: buttons });
    }

    if (room.hostPanelMessage && room.hostId) {
        // Initialize time control if not already done
        if (!room.timeControl) {
            room.timeControl = {
                startedAt: Date.now(),
                pausedTotal: 0,
                maxPauseDuration: 60000,
                pausesRemaining: 2,
                isPaused: false
            };
        } else {
            room.timeControl.startedAt = Date.now();
        }

        await updateHostPanelWithTimeControls(room);
    }

    const collector = room.gameMessage!.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000
    });

    room.currentCollector = collector as InteractionCollector<ButtonInteraction>;

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.playerId) {
            await i.reply({
                content: '❌ Solo el concursante puede responder.',
                ephemeral: true
            });
            return;
        }

        try {
            if (i.customId.startsWith('millionaire_answer_')) {
                await handleAnswer(i, room);
                collector.stop();
            } else if (i.customId === 'millionaire_cashout') {
                await handleCashout(i, room);
                collector.stop();
            } else if (i.customId === 'millionaire_quit') {
                await handleQuit(i, room);
                collector.stop();
            } else if (i.customId.startsWith('millionaire_lifeline_')) {
                await handleLifeline(i, room);
            }
        } catch (error) {
            logger.error('Millionaire', 'Error en game collector', error instanceof Error ? error : new Error(String(error)));
            const embed = createErrorEmbed('❌ Error', 'Ocurrió un error procesando tu acción.');
            await i.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
            collector.stop();
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            await handleTimeout(interaction, room);
        }
    });
}

async function updateHostPanelWithTimeControls(room: MillionaireGameRoom): Promise<void> {
    if (!room.hostPanelMessage || !room.timeControl) return;

    const timeControl = room.timeControl;
    const pauseTimeUsed = timeControl.pausedTotal;
    const pauseTimeRemaining = timeControl.maxPauseDuration - pauseTimeUsed;
    const pauseMinutesRemaining = Math.floor(pauseTimeRemaining / 1000 / 60);
    const pauseSecondsRemaining = Math.floor((pauseTimeRemaining / 1000) % 60);

    const embed = new EmbedBuilder()
        .setColor(timeControl.isPaused ? COLORS.WARNING : COLORS.SUCCESS)
        .setTitle(timeControl.isPaused ? '⏸️ TIEMPO EN PAUSA' : '✅ Pregunta Revelada')
        .setDescription(
            `Todas las opciones han sido reveladas.\n\n` +
            `${timeControl.isPaused ? '⏸️ **TIEMPO PAUSADO**' : '⏱️ El tiempo está corriendo...'}\n` +
            `Esperando que el jugador seleccione una respuesta.\n\n` +
            `**Control de Tiempo:**\n` +
            `⏱️ Pausas restantes: ${timeControl.pausesRemaining}\n` +
            `⏱️ Tiempo de pausa disponible: ${pauseMinutesRemaining}m ${pauseSecondsRemaining}s`
        );

    const buttons: ButtonBuilder[] = [];

    if (timeControl.isPaused) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('millionaire_host_resume_time')
                .setLabel('▶️ Reanudar Tiempo')
                .setStyle(ButtonStyle.Success)
        );
    } else if (timeControl.pausesRemaining > 0 && pauseTimeRemaining > 0) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('millionaire_host_pause_time')
                .setLabel('⏸️ Pausar Tiempo')
                .setStyle(ButtonStyle.Primary)
        );
    }

    // Emergency button to switch to automatic mode
    buttons.push(
        new ButtonBuilder()
            .setCustomId('millionaire_host_emergency_auto')
            .setLabel('⚠️ Modo Automático')
            .setStyle(ButtonStyle.Danger)
    );

    const rows = buttons.length > 0 ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)] : [];

    await room.hostPanelMessage.edit({
        embeds: [embed],
        components: rows
    });

    // Set up collector for time control buttons
    if (room.hostPanelCollector) {
        room.hostPanelCollector.stop();
    }

    if (buttons.length > 0) {
        const collector = room.hostPanelMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000
        });

        room.hostPanelCollector = collector as InteractionCollector<ButtonInteraction>;

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== room.hostId) {
                await i.reply({
                    content: '❌ Solo el anfitrión puede usar estos controles.',
                    ephemeral: true
                });
                return;
            }

            if (i.customId === 'millionaire_host_pause_time') {
                await handleHostPauseTime(i, room);
            } else if (i.customId === 'millionaire_host_resume_time') {
                await handleHostResumeTime(i, room);
            } else if (i.customId === 'millionaire_host_emergency_auto') {
                await handleHostEmergencyAuto(i, room);
            }
        });
    }
}

async function handleHostPauseTime(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom
): Promise<void> {
    if (!room.timeControl || room.timeControl.isPaused) return;

    const timeControl = room.timeControl;

    // Check if can pause
    if (timeControl.pausesRemaining <= 0) {
        await interaction.reply({
            content: '❌ Ya no tienes pausas disponibles.',
            ephemeral: true
        });
        return;
    }

    const pauseTimeRemaining = timeControl.maxPauseDuration - timeControl.pausedTotal;
    if (pauseTimeRemaining <= 0) {
        await interaction.reply({
            content: '❌ Ya has usado todo el tiempo de pausa disponible.',
            ephemeral: true
        });
        return;
    }

    // Pause the time
    timeControl.isPaused = true;
    timeControl.pausedAt = Date.now();
    timeControl.pausesRemaining--;

    await interaction.deferUpdate();
    await updateHostPanelWithTimeControls(room);

    // Notify channel
    const channel = room.gameMessage?.channel;
    if (channel && 'send' in channel) {
        await channel.send({
            content: '⏸️ El anfitrión ha pausado el tiempo. El jugador puede seguir pensando sin presión temporal.',
            embeds: []
        });
    }
}

async function handleHostResumeTime(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom
): Promise<void> {
    if (!room.timeControl || !room.timeControl.isPaused || !room.timeControl.pausedAt) return;

    const timeControl = room.timeControl;

    // Calculate pause duration (pausedAt is checked above)
    const pauseDuration = Date.now() - timeControl.pausedAt!;
    timeControl.pausedTotal += pauseDuration;

    // Check if exceeded max pause time
    if (timeControl.pausedTotal > timeControl.maxPauseDuration) {
        timeControl.pausedTotal = timeControl.maxPauseDuration;
    }

    // Resume
    timeControl.isPaused = false;
    timeControl.pausedAt = undefined;

    // Adjust questionStartTime to account for the pause
    if (room.questionStartTime) {
        room.questionStartTime += pauseDuration;
    }

    await interaction.deferUpdate();
    await updateHostPanelWithTimeControls(room);

    // Notify channel
    const channel = room.gameMessage?.channel;
    if (channel && 'send' in channel) {
        const remainingPauseTime = timeControl.maxPauseDuration - timeControl.pausedTotal;
        const minutes = Math.floor(remainingPauseTime / 1000 / 60);
        const seconds = Math.floor((remainingPauseTime / 1000) % 60);

        await channel.send({
            content: `▶️ El anfitrión ha reanudado el tiempo.\n` +
                     `⏱️ Tiempo de pausa restante: ${minutes}m ${seconds}s | Pausas restantes: ${timeControl.pausesRemaining}`,
            embeds: []
        });
    }
}

async function handleHostEmergencyAuto(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom
): Promise<void> {
    room.emergencyMode = true;

    await interaction.update({
        content: '⚠️ Modo automático activado. El anfitrión ha dejado el control del juego.',
        components: []
    });

    // Stop all host collectors
    if (room.hostPanelCollector) {
        room.hostPanelCollector.stop();
    }

    // Notify channel
    const channel = room.gameMessage?.channel;
    if (channel && 'send' in channel) {
        await channel.send({
            content: '⚠️ El anfitrión ha activado el modo automático. El juego continúa sin intervención del anfitrión.',
            embeds: []
        });
    }
}

async function sendHostPanel(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    if (!room.hostId) return;

    try {
        const host = await interaction.client.users.fetch(room.hostId);

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('🎬 PANEL DE ANFITRIÓN 🎬')
            .setDescription(`Pregunta ${room.currentQuestionIndex} de 15 - ${formatPrize(prizeAmount)}`)
            .addFields(
                {
                    name: '❓ Pregunta',
                    value: question.question
                },
                {
                    name: '✅ Respuesta Correcta',
                    value: question.correctAnswer,
                    inline: true
                },
                {
                    name: '📚 Categoría',
                    value: question.category,
                    inline: true
                }
            );

        await host.send({ embeds: [embed] });
    } catch (error) {
        logger.warn('Millionaire', 'No se pudo enviar panel al anfitrión');
    }
}

async function handleAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const selectedLetter = interaction.customId.split('_')[2];
    const letters = ['A', 'B', 'C', 'D'];
    const index = letters.indexOf(selectedLetter);

    if (!room.currentQuestion || !room.currentQuestion.allAnswers) {
        throw new Error('No hay pregunta activa');
    }

    const selectedAnswer = room.currentQuestion.allAnswers[index];

    if (room.hasHost && room.hostId) {
        await handleAnswerWithHost(interaction, room, selectedLetter, selectedAnswer);
    } else {
        const isCorrect = selectedAnswer === room.currentQuestion.correctAnswer;
        if (isCorrect) {
            await handleCorrectAnswer(interaction, room);
        } else {
            await handleIncorrectAnswer(interaction, room, selectedAnswer);
        }
    }
}

async function handleAnswerWithHost(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    selectedLetter: string,
    selectedAnswer: string
): Promise<void> {
    room.playerSelectedAnswer = selectedLetter;
    room.awaitingFinalAnswer = true;

    const isCorrect = selectedAnswer === room.currentQuestion?.correctAnswer;

    const selectionEmbed = createInfoEmbed(
        '🤔 Respuesta Seleccionada',
        `**${interaction.user.displayName}** ha seleccionado la opción **${selectedLetter}**\n\n` +
        `🎬 Esperando confirmación del anfitrión...`
    );

    await interaction.update({
        embeds: [selectionEmbed],
        components: []
    });

    await updateHostPanelWithSelection(interaction, room, selectedLetter, selectedAnswer, isCorrect);
}

async function updateHostPanelWithSelection(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    selectedLetter: string,
    selectedAnswer: string,
    isCorrect: boolean
): Promise<void> {
    if (!room.hostId) return;

    try {
        const host = await interaction.client.users.fetch(room.hostId);

        const statusEmoji = isCorrect ? '✅' : '❌';
        const prize = getPrizeForLevel(room.currentQuestionIndex);

        const embed = new EmbedBuilder()
            .setColor(isCorrect ? COLORS.SUCCESS : COLORS.DANGER)
            .setTitle('⚠️ JUGADOR SELECCIONÓ RESPUESTA')
            .setDescription(
                `**Pregunta ${room.currentQuestionIndex}** - ${formatPrize(prize?.amount || 0)}\n\n` +
                `**Pregunta:** ${room.currentQuestion?.question}\n\n` +
                `**Opción seleccionada:** ${selectedLetter}) ${selectedAnswer} ${statusEmoji}\n` +
                `**Respuesta correcta:** ${room.currentQuestion?.correctAnswer}\n\n` +
                `¿Qué deseas hacer?`
            );

        const askFinalButton = new ButtonBuilder()
            .setCustomId('millionaire_host_ask_final')
            .setLabel('❓ "¿Respuesta Final?"')
            .setStyle(ButtonStyle.Primary);

        const validateButton = new ButtonBuilder()
            .setCustomId('millionaire_host_validate')
            .setLabel('✅ Validar Directamente')
            .setStyle(ButtonStyle.Success);

        const allowChangeButton = new ButtonBuilder()
            .setCustomId('millionaire_host_allow_change')
            .setLabel('🔄 Permitir Cambiar')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            askFinalButton,
            validateButton,
            allowChangeButton
        );

        if (room.hostPanelMessage) {
            await room.hostPanelMessage.edit({
                embeds: [embed],
                components: [row]
            });
        } else {
            room.hostPanelMessage = await host.send({
                embeds: [embed],
                components: [row]
            });
        }

        const collector = room.hostPanelMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000
        });

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== room.hostId) {
                await i.reply({
                    content: '❌ Solo el anfitrión puede usar estos controles.',
                    ephemeral: true
                });
                return;
            }

            if (i.customId === 'millionaire_host_ask_final') {
                await handleHostAskFinal(i, room);
                collector.stop();
            } else if (i.customId === 'millionaire_host_validate') {
                await handleHostValidate(i, room);
                collector.stop();
            } else if (i.customId === 'millionaire_host_allow_change') {
                await handleHostAllowChange(i, room);
                collector.stop();
            }
        });

    } catch (error) {
        logger.warn('Millionaire', 'No se pudo actualizar panel del anfitrión');
    }
}

async function handleHostAskFinal(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    await interaction.update({
        content: '📨 Preguntando al jugador si es su respuesta final...',
        components: []
    });

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const confirmEmbed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('❓ Confirmación de Respuesta')
        .setDescription(
            `🎬 **Anfitrión:** <@${room.playerId}>, has elegido la opción **${room.playerSelectedAnswer}**...\n\n` +
            `**¿Es tu respuesta final?**`
        );

    const yesButton = new ButtonBuilder()
        .setCustomId('millionaire_final_yes')
        .setLabel('✅ Sí, respuesta final')
        .setStyle(ButtonStyle.Success);

    const noButton = new ButtonBuilder()
        .setCustomId('millionaire_final_no')
        .setLabel('🔄 No, quiero cambiar')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

    const confirmMessage = await channel.send({
        embeds: [confirmEmbed],
        components: [row]
    });

    const collector = confirmMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.playerId) {
            await i.reply({
                content: '❌ Solo el concursante puede responder.',
                ephemeral: true
            });
            return;
        }

        if (i.customId === 'millionaire_final_yes') {
            await handleFinalAnswerConfirmed(i, room);
        } else if (i.customId === 'millionaire_final_no') {
            await handleFinalAnswerRejected(i, room);
        }

        collector.stop();
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            await confirmMessage.edit({
                content: '⏱️ Tiempo agotado. Se asume respuesta final.',
                components: []
            });
            await handleFinalAnswerConfirmed(interaction, room);
        }
    });
}

async function handleHostValidate(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    await interaction.update({
        content: '⚡ Validando respuesta directamente...',
        components: []
    });

    await handleFinalAnswerConfirmed(interaction, room);
}

async function handleHostAllowChange(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    await interaction.update({
        content: '🔄 Permitiendo cambio de respuesta...',
        components: []
    });

    room.playerSelectedAnswer = undefined;
    room.awaitingFinalAnswer = false;

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    await channel.send({
        content: `🎬 **Anfitrión:** <@${room.playerId}>, puedes cambiar tu respuesta.`
    });

    if (room.gameMessage && room.currentQuestion) {
        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, room.currentQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        await room.gameMessage.edit({
            embeds: [embed],
            components: buttons
        });
    }
}

async function handleFinalAnswerConfirmed(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    room.awaitingFinalAnswer = false;

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    if (room.hasHost && room.hostId) {
        await updateHostPanelForReveal(interaction, room);
    } else {
        await revealAnswer(interaction, room);
    }
}

async function handleFinalAnswerRejected(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    room.playerSelectedAnswer = undefined;
    room.awaitingFinalAnswer = false;

    await interaction.update({
        content: '🔄 Puedes cambiar tu respuesta.',
        components: []
    });

    if (room.gameMessage && room.currentQuestion) {
        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, room.currentQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        await room.gameMessage.edit({
            embeds: [embed],
            components: buttons
        });
    }
}

async function updateHostPanelForReveal(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!room.hostId) return;

    try {
        const host = await interaction.client.users.fetch(room.hostId);

        const letters = ['A', 'B', 'C', 'D'];
        const index = letters.indexOf(room.playerSelectedAnswer || '');
        const selectedAnswer = room.currentQuestion?.allAnswers?.[index];
        const isCorrect = selectedAnswer === room.currentQuestion?.correctAnswer;

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('🎭 Listo para Revelar')
            .setDescription(
                `El jugador ha confirmado su respuesta: **${room.playerSelectedAnswer}**\n\n` +
                `Resultado: **${isCorrect ? '✅ CORRECTA' : '❌ INCORRECTA'}**\n\n` +
                `¿Cómo deseas revelar el resultado?`
            );

        const revealButton = new ButtonBuilder()
            .setCustomId('millionaire_host_reveal')
            .setLabel('📢 Revelar Ahora')
            .setStyle(ButtonStyle.Primary);

        const suspenseButton = new ButtonBuilder()
            .setCustomId('millionaire_host_suspense')
            .setLabel('⏱️ Crear Suspenso (5s)')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(revealButton, suspenseButton);

        if (room.hostPanelMessage) {
            await room.hostPanelMessage.edit({
                embeds: [embed],
                components: [row]
            });
        } else {
            room.hostPanelMessage = await host.send({
                embeds: [embed],
                components: [row]
            });
        }

        const collector = room.hostPanelMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== room.hostId) {
                await i.reply({
                    content: '❌ Solo el anfitrión puede usar estos controles.',
                    ephemeral: true
                });
                return;
            }

            if (i.customId === 'millionaire_host_reveal') {
                await i.update({
                    content: '📢 Revelando resultado...',
                    components: []
                });
                await revealAnswer(i, room);
            } else if (i.customId === 'millionaire_host_suspense') {
                await i.update({
                    content: '⏱️ Creando suspenso...',
                    components: []
                });
                await createSuspenseAndReveal(i, room);
            }

            collector.stop();
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await revealAnswer(interaction, room);
            }
        });

    } catch (error) {
        logger.warn('Millionaire', 'No se pudo actualizar panel del anfitrión');
        await revealAnswer(interaction, room);
    }
}

async function createSuspenseAndReveal(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const suspenseEmbed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setDescription('🎬 **Anfitrión:** Veamos si es correcta...\n\n⏱️ ...');

    await channel.send({ embeds: [suspenseEmbed] });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await revealAnswer(interaction, room);
}

async function revealAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const letters = ['A', 'B', 'C', 'D'];
    const index = letters.indexOf(room.playerSelectedAnswer || '');
    const selectedAnswer = room.currentQuestion?.allAnswers?.[index];
    const isCorrect = selectedAnswer === room.currentQuestion?.correctAnswer;

    if (isCorrect) {
        await handleCorrectAnswer(interaction, room);
    } else {
        await handleIncorrectAnswer(interaction, room, selectedAnswer || '');
    }
}

async function handleCorrectAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const prize = getPrizeForLevel(room.currentQuestionIndex);
    if (!prize) return;

    room.currentPrize = prize.amount;

    if (prize.isSafeHaven) {
        room.safeHavenReached = prize.amount;
    }

    const embed = createSuccessEmbed(
        '✅ ¡Respuesta Correcta!',
        `Has ganado **${formatPrize(prize.amount)}**!`
    );

    await interaction.update({
        embeds: [embed],
        components: []
    });

    if (room.currentQuestionIndex >= 15) {
        await endGame(interaction, room, true);
        return;
    }

    const continueButton = new ButtonBuilder()
        .setCustomId('millionaire_continue')
        .setLabel('Continuar')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️');

    const cashoutButton = new ButtonBuilder()
        .setCustomId('millionaire_cashout')
        .setLabel(`Retirarse con ${formatPrize(prize.amount)}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💰');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(continueButton, cashoutButton);

    const message = await interaction.followUp({
        content: '¿Qué deseas hacer?',
        components: [row]
    });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== room.playerId) {
            await i.reply({
                content: '❌ Solo el concursante puede decidir.',
                ephemeral: true
            });
            return;
        }

        if (i.customId === 'millionaire_continue') {
            room.currentQuestionIndex++;
            await i.update({ components: [] });
            await displayQuestion(i, room);
        } else if (i.customId === 'millionaire_cashout') {
            await handleCashout(i, room);
        }

        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            room.currentQuestionIndex++;
            await displayQuestion(interaction, room);
        }
    });
}

async function handleIncorrectAnswer(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    selectedAnswer: string
): Promise<void> {
    const finalWinnings = room.safeHavenReached;

    const embed = createErrorEmbed(
        '❌ Respuesta Incorrecta',
        `La respuesta correcta era: **${room.currentQuestion?.correctAnswer}**\n\n` +
        `Te llevas: **${formatPrize(finalWinnings)}**`
    );

    await interaction.update({
        embeds: [embed],
        components: []
    });

    await endGame(interaction, room, false, undefined, finalWinnings, true);
}

async function handleCashout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const embed = createSuccessEmbed(
        '💰 Retiro Exitoso',
        `¡Felicidades! Te llevas **${formatPrize(room.currentPrize)}**`
    );

    await interaction.update({
        embeds: [embed],
        components: []
    });

    await endGame(interaction, room, false, undefined, room.currentPrize, true);
}

async function handleQuit(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const finalWinnings = room.safeHavenReached;

    const embed = createInfoEmbed(
        '🚪 Juego Abandonado',
        `Has abandonado el juego. Te llevas: **${formatPrize(finalWinnings)}**`
    );

    await interaction.update({
        embeds: [embed],
        components: []
    });

    await endGame(interaction, room, false, undefined, finalWinnings, true);
}

async function handleTimeout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const finalWinnings = room.safeHavenReached;

    const embed = createErrorEmbed(
        '⏱️ Tiempo Agotado',
        `Se acabó el tiempo. Te llevas: **${formatPrize(finalWinnings)}**`
    );

    if (room.gameMessage) {
        await room.gameMessage.edit({
            embeds: [embed],
            components: []
        });
    }

    await endGame(interaction, room, false, undefined, finalWinnings, true);
}

async function handleLifeline(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const lifelineType = interaction.customId.split('_')[2];

    switch (lifelineType) {
        case '5050':
            await handleFiftyFifty(interaction, room);
            break;
        case 'audience':
            await handleAskAudience(interaction, room);
            break;
        case 'friend':
            await handleCallFriend(interaction, room);
            break;
        case 'change':
            await handleChangeQuestion(interaction, room);
            break;
    }
}

async function handleFiftyFifty(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!room.lifelines.fiftyFifty) {
        await interaction.reply({
            content: '❌ Ya usaste este comodín.',
            ephemeral: true
        });
        return;
    }

    room.lifelines.fiftyFifty = false;

    if (!room.currentQuestion || !room.currentQuestion.allAnswers) {
        await interaction.reply({
            content: '❌ Error al usar comodín.',
            ephemeral: true
        });
        return;
    }

    const incorrectAnswers = room.currentQuestion.allAnswers.filter(
        answer => answer !== room.currentQuestion?.correctAnswer
    );

    const toEliminate = incorrectAnswers.sort(() => Math.random() - 0.5).slice(0, 2);
    room.eliminatedAnswers = toEliminate;

    const prize = getPrizeForLevel(room.currentQuestionIndex);
    const embed = createQuestionEmbed(room, room.currentQuestion, prize?.amount || 0);
    const buttons = createQuestionButtons(room);

    await interaction.update({
        embeds: [embed],
        components: buttons
    });

    logger.info('Millionaire', '50:50 usado');
}

async function handleAskAudience(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!room.lifelines.askAudience) {
        await interaction.reply({
            content: '❌ Ya usaste este comodín.',
            ephemeral: true
        });
        return;
    }

    room.lifelines.askAudience = false;

    if (!room.currentQuestion || !room.currentQuestion.allAnswers) {
        await interaction.reply({
            content: '❌ Error al usar comodín.',
            ephemeral: true
        });
        room.lifelines.askAudience = true;
        return;
    }

    const answers = room.currentQuestion.allAnswers.filter(
        answer => !room.eliminatedAnswers?.includes(answer)
    );

    const letters = ['A', 'B', 'C', 'D'];
    const availableLetters: string[] = [];

    for (let i = 0; i < room.currentQuestion.allAnswers.length; i++) {
        if (!room.eliminatedAnswers?.includes(room.currentQuestion.allAnswers[i])) {
            availableLetters.push(letters[i]);
        }
    }

    const voteButtons: ButtonBuilder[] = [];
    for (const letter of availableLetters) {
        voteButtons.push(
            new ButtonBuilder()
                .setCustomId(`millionaire_vote_${letter}`)
                .setLabel(`Votar ${letter}`)
                .setStyle(ButtonStyle.Primary)
        );
    }

    const voteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(voteButtons);

    const endTime = Math.floor((Date.now() + 30000) / 1000);
    const voteEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('📊 PREGUNTA AL PÚBLICO 📊')
        .setDescription(
            `¡La audiencia está votando!\n\n` +
            `**Pregunta:** ${room.currentQuestion.question}\n\n` +
            `**Opciones:**\n` +
            availableLetters.map((letter, idx) => {
                const answerIndex = letters.indexOf(letter);
                return `${letter}) ${room.currentQuestion?.allAnswers?.[answerIndex]}`;
            }).join('\n') +
            `\n\n⏱️ Votación termina: <t:${endTime}:R>`
        )
        .setFooter({ text: 'Solo espectadores pueden votar' });

    const voteMessage = await interaction.reply({
        embeds: [voteEmbed],
        components: [voteRow],
        fetchReply: true
    });

    const votes = new Map<string, number>();
    availableLetters.forEach(letter => votes.set(letter, 0));

    const voters = new Set<string>();

    const voteCollector = voteMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    voteCollector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id === room.playerId) {
            await i.reply({
                content: '❌ El concursante no puede votar.',
                ephemeral: true
            });
            return;
        }

        if (room.hostId && i.user.id === room.hostId) {
            await i.reply({
                content: '❌ El anfitrión no puede votar.',
                ephemeral: true
            });
            return;
        }

        if (voters.has(i.user.id)) {
            await i.reply({
                content: '❌ Ya has votado.',
                ephemeral: true
            });
            return;
        }

        const votedLetter = i.customId.split('_')[2];
        const currentVotes = votes.get(votedLetter) || 0;
        votes.set(votedLetter, currentVotes + 1);
        voters.add(i.user.id);

        await i.reply({
            content: `✅ Has votado por la opción **${votedLetter}**`,
            ephemeral: true
        });
    });

    voteCollector.on('end', async () => {
        const totalVotes = Array.from(votes.values()).reduce((a, b) => a + b, 0);

        let resultsText = '📊 **RESULTADOS DE LA VOTACIÓN** 📊\n\n';

        if (totalVotes === 0) {
            resultsText += 'No hubo votos de la audiencia.';
        } else {
            resultsText += `Total de votos: **${totalVotes}**\n\n`;

            for (const letter of availableLetters) {
                const answerIndex = letters.indexOf(letter);
                const answer = room.currentQuestion?.allAnswers?.[answerIndex];
                const voteCount = votes.get(letter) || 0;
                const percentage = Math.round((voteCount / totalVotes) * 100);
                const barLength = Math.round(percentage / 5);
                const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
                resultsText += `${letter}) ${answer}:\n${bar} ${percentage}% (${voteCount} votos)\n\n`;
            }
        }

        const resultsEmbed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setDescription(resultsText);

        await voteMessage.edit({
            embeds: [resultsEmbed],
            components: []
        });
    });

    logger.info('Millionaire', 'Pregunta al público usado');
}

async function handleCallFriend(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!room.lifelines.callFriend) {
        await interaction.reply({
            content: '❌ Ya usaste este comodín.',
            ephemeral: true
        });
        return;
    }

    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Este comodín solo funciona en servidores.',
            ephemeral: true
        });
        return;
    }

    try {
        const members = await interaction.guild.members.fetch();
        const eligibleMembers = members.filter(
            member => !member.user.bot &&
                     member.id !== room.playerId &&
                     member.id !== room.hostId
        );

        if (eligibleMembers.size === 0) {
            await interaction.reply({
                content: '❌ No hay miembros disponibles para llamar.',
                ephemeral: true
            });
            return;
        }

        const memberOptions = eligibleMembers
            .first(25)
            .map(member => ({
                label: member.displayName,
                description: `@${member.user.username}`,
                value: member.id
            }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('millionaire_select_friend')
            .setPlaceholder('Selecciona un amigo para llamar')
            .addOptions(memberOptions);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        const cancelButton = new ButtonBuilder()
            .setCustomId('millionaire_cancel_friend')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger);

        const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);

        const selectMessage = await interaction.reply({
            content: '📞 **Llamar a un Amigo**\nSelecciona a quién quieres llamar:',
            components: [row, buttonRow],
            ephemeral: true,
            fetchReply: true
        });

        const collector = selectMessage.createMessageComponentCollector({
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({
                    content: '❌ Solo el concursante puede seleccionar.',
                    ephemeral: true
                });
                return;
            }

            if (i.customId === 'millionaire_cancel_friend') {
                await i.update({
                    content: '❌ Llamada cancelada. El comodín sigue disponible.',
                    components: []
                });
                collector.stop();
                return;
            }

            if (i.isStringSelectMenu() && i.customId === 'millionaire_select_friend') {
                const friendId = i.values[0];
                collector.stop();
                await processFriendCall(i, room, friendId);
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await selectMessage.edit({
                    content: '⏱️ Tiempo agotado. El comodín sigue disponible.',
                    components: []
                });
            }
        });

    } catch (error) {
        logger.error('Millionaire', 'Error en handleCallFriend', error instanceof Error ? error : new Error(String(error)));
        await interaction.reply({
            content: '❌ Error al procesar el comodín. Intenta nuevamente.',
            ephemeral: true
        });
    }
}

async function processFriendCall(
    interaction: StringSelectMenuInteraction,
    room: MillionaireGameRoom,
    friendId: string
): Promise<void> {
    try {
        const friend = await interaction.client.users.fetch(friendId);

        if (friend.bot) {
            await interaction.update({
                content: '❌ No puedes llamar a un bot. El comodín sigue disponible.',
                components: []
            });
            return;
        }

        const letters = ['A', 'B', 'C', 'D'];
        const availableAnswers: string[] = [];

        for (let i = 0; i < (room.currentQuestion?.allAnswers?.length || 0); i++) {
            if (!room.eliminatedAnswers?.includes(room.currentQuestion?.allAnswers?.[i] || '')) {
                availableAnswers.push(`${letters[i]}) ${room.currentQuestion?.allAnswers?.[i]}`);
            }
        }

        const questionEmbed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('📞 Llamada de un Amigo')
            .setDescription(
                `**${interaction.user.displayName}** te está llamando para pedirte ayuda.\n\n` +
                `**Pregunta:** ${room.currentQuestion?.question}\n\n` +
                `**Respuestas:**\n${availableAnswers.join('\n')}\n\n` +
                `Responde con la letra que creas correcta. Tienes 45 segundos.`
            )
            .setFooter({ text: 'Responde solo con la letra (A, B, C o D)' });

        const friendMessage = await friend.send({ embeds: [questionEmbed] });

        room.lifelines.callFriend = false;

        await interaction.update({
            content: `📞 Llamando a **${friend.displayName}**... Esperando respuesta (45s)`,
            components: []
        });

        const channel = await interaction.client.channels.fetch(room.channelId);
        if (!channel?.isTextBased() || !('send' in channel)) return;

        await channel.send({
            content: `📞 **${interaction.user.displayName}** está llamando a **${friend.displayName}**...`
        });

        if (!('createMessageCollector' in friendMessage.channel)) {
            await channel.send({
                content: '❌ No se pudo establecer comunicación con el amigo.'
            });
            return;
        }

        const dmCollector = friendMessage.channel.createMessageCollector({
            filter: (m) => m.author.id === friend.id,
            time: 45000,
            max: 1
        });

        dmCollector.on('collect', async (message) => {
            const response = message.content.toUpperCase().trim();
            const validAnswers = ['A', 'B', 'C', 'D'];

            if (validAnswers.includes(response)) {
                await channel.send({
                    content: `📞 **${friend.displayName}** dice: "Creo que es la **${response}**"`
                });
            } else {
                await channel.send({
                    content: `📞 **${friend.displayName}**: "${message.content}"`
                });
            }
        });

        dmCollector.on('end', async (collected) => {
            if (collected.size === 0) {
                await channel.send({
                    content: `📞 ${friend.displayName} no respondió a tiempo.`
                });
            }
        });

    } catch (error) {
        logger.error('Millionaire', 'Error procesando llamada', error instanceof Error ? error : new Error(String(error)));
        await interaction.update({
            content: '❌ No se pudo contactar a ese usuario. Puede que tenga los DMs cerrados. El comodín sigue disponible.',
            components: []
        });
        room.lifelines.callFriend = true;
    }

    logger.info('Millionaire', 'Llamar a un amigo usado');
}

async function handleChangeQuestion(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!room.lifelines.changeQuestion) {
        await interaction.reply({
            content: '❌ Ya usaste este comodín.',
            ephemeral: true
        });
        return;
    }

    room.lifelines.changeQuestion = false;

    if (room.currentCollector) {
        room.currentCollector.stop('lifeline_used');
    }

    if (room.gameMessage) {
        await room.gameMessage.edit({
            components: []
        });
    }

    await interaction.reply({
        content: '🔄 Cambiando pregunta...',
        ephemeral: false
    });

    const difficulty = getDifficultyForLevel(room.currentQuestionIndex);

    try {
        let newQuestion = await triviaService.getQuestion(
            difficulty,
            room.usedQuestionIds,
            room.sessionToken
        );

        newQuestion = await triviaService.enhanceQuestionWithImage(newQuestion);

        room.currentQuestion = newQuestion;
        room.usedQuestionIds.add(newQuestion.id);
        room.eliminatedAnswers = [];
        room.questionStartTime = Date.now();

        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, newQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        const channel = await interaction.client.channels.fetch(room.channelId);
        if (!channel?.isTextBased() || !('send' in channel)) {
            throw new Error('Canal no válido');
        }

        const newMessage = await channel.send({
            content: '🔄 **Nueva Pregunta:**',
            embeds: [embed],
            components: buttons
        });

        room.gameMessage = newMessage;

        if (room.hasHost && room.hostId) {
            await sendHostPanel(interaction, room, newQuestion, prize?.amount || 0);
        }

        const collector = newMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000
        });

        room.currentCollector = collector as InteractionCollector<ButtonInteraction>;

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.user.id !== room.playerId) {
                await i.reply({
                    content: '❌ Solo el concursante puede responder.',
                    ephemeral: true
                });
                return;
            }

            try {
                if (i.customId.startsWith('millionaire_answer_')) {
                    await handleAnswer(i, room);
                    collector.stop();
                } else if (i.customId === 'millionaire_cashout') {
                    await handleCashout(i, room);
                    collector.stop();
                } else if (i.customId === 'millionaire_quit') {
                    await handleQuit(i, room);
                    collector.stop();
                } else if (i.customId.startsWith('millionaire_lifeline_')) {
                    await handleLifeline(i, room);
                }
            } catch (error) {
                logger.error('Millionaire', 'Error en game collector', error instanceof Error ? error : new Error(String(error)));
                const errorEmbed = createErrorEmbed('❌ Error', 'Ocurrió un error procesando tu acción.');
                await i.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await handleTimeout(interaction, room);
            }
        });

        logger.info('Millionaire', 'Cambiar pregunta usado');
    } catch (error) {
        logger.error('Millionaire', 'Error cambiando pregunta', error instanceof Error ? error : new Error(String(error)));
        await interaction.followUp({
            content: '❌ Error al cambiar la pregunta.',
            ephemeral: true
        });
        room.lifelines.changeQuestion = true;
    }
}

async function endGame(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    isWinner: boolean,
    errorMessage?: string,
    customWinnings?: number,
    skipFinalMessage?: boolean
): Promise<void> {
    const roomKey = getRoomKey(room.guildId, room.channelId);

    const finalWinnings = customWinnings !== undefined
        ? customWinnings
        : (isWinner ? room.currentPrize : room.safeHavenReached);

    if (!skipFinalMessage) {
        let embed: EmbedBuilder;

        if (errorMessage) {
            embed = createErrorEmbed('❌ Fin del Juego', errorMessage);
        } else if (isWinner) {
            embed = createSuccessEmbed(
                '🎉 ¡GANADOR MILLONARIO! 🎉',
                `¡Felicidades <@${room.playerId}>! Has ganado **${formatPrize(finalWinnings)}**`
            );
        } else {
            embed = createInfoEmbed(
                '🎮 Fin del Juego',
                `Gracias por jugar, <@${room.playerId}>. Total ganado: **${formatPrize(finalWinnings)}**`
            );
        }

        const channel = await interaction.client.channels.fetch(room.channelId);
        if (channel?.isTextBased() && 'send' in channel) {
            await channel.send({ embeds: [embed] });
        }
    }

    if (room.playerId && !errorMessage) {
        const client = interaction.client as BotClient;
        const firebase = client.firebaseAdminManager;

        if (firebase) {
            const totalQuestions = room.currentQuestionIndex;
            const correctAnswers = isWinner ? totalQuestions : totalQuestions - 1;

            const gameData: GameEndData = {
                userId: room.playerId,
                level: room.currentQuestionIndex,
                winnings: finalWinnings,
                questionsAnswered: totalQuestions,
                correctAnswers: correctAnswers,
                lifelinesUsed: {
                    fiftyFifty: !room.lifelines.fiftyFifty,
                    askAudience: !room.lifelines.askAudience,
                    callFriend: !room.lifelines.callFriend,
                    changeQuestion: !room.lifelines.changeQuestion
                }
            };

            try {
                await firebase.updateMillionaireStats(room.playerId, gameData);
                logger.info('Millionaire', `Estadísticas guardadas para ${room.playerId}`);
            } catch (error) {
                logger.error('Millionaire', 'Error guardando estadísticas', error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    activeRooms.delete(roomKey);
    logger.info('Millionaire', `Juego terminado en ${roomKey}. Ganancia: ${formatPrize(finalWinnings)}`);
}

export const millionaire: SlashOnlyCommand = {
    type: 'slash-only',
    name: 'millionaire',
    description: 'Juega ¿Quién Quiere Ser Millonario?',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName('millionaire')
        .setDescription('Juega ¿Quién Quiere Ser Millonario?')
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY)
        .addSubcommand(subcommand =>
            subcommand
                .setName('crear')
                .setDescription('Crea una nueva sala de juego')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('abandonar')
                .setDescription('Abandona el juego actual en este canal')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reglas')
                .setDescription('Muestra las reglas del juego')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clasificacion')
                .setDescription('Muestra el top 10 de jugadores')
                .addStringOption(option =>
                    option
                        .setName('ordenar_por')
                        .setDescription('Ordenar por')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Total Ganado', value: 'totalWinnings' },
                            { name: 'Nivel Más Alto', value: 'highestLevel' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('estadisticas')
                .setDescription('Muestra las estadísticas de un jugador')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a consultar (deja vacío para ver las tuyas)')
                        .setRequired(false)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'crear':
                    await createRoom(interaction);
                    break;
                case 'abandonar':
                    await abandonGame(interaction);
                    break;
                case 'reglas':
                    await showRules(interaction);
                    break;
                case 'clasificacion':
                    await showLeaderboard(interaction);
                    break;
                case 'estadisticas':
                    await showStats(interaction);
                    break;
                default:
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        'Subcomando no reconocido',
                        '❌ Subcomando no válido.'
                    );
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'millionaire');
        }
    }
};

async function abandonGame(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Comando solo disponible en servidores',
            '❌ Este comando solo puede usarse en un servidor.'
        );
    }

    const roomKey = getRoomKey(interaction.guildId, interaction.channelId);
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay juego activo',
            '❌ No hay un juego activo en este canal.'
        );
    }

    activeRooms.delete(roomKey);

    const embed = createInfoEmbed(
        '🚪 Juego Abandonado',
        'El juego ha sido abandonado por un administrador.'
    );

    await sendMessage(interaction, { embed, ephemeral: false });

    logger.info('Millionaire', `Juego abandonado en ${roomKey}`);
}

async function showRules(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('📋 Reglas de ¿Quién Quiere Ser Millonario?')
        .setDescription(
            '¡Responde 15 preguntas de trivia y gana hasta **$1,000,000**!'
        )
        .addFields(
            {
                name: '🎯 Objetivo',
                value: 'Responder correctamente 15 preguntas de dificultad progresiva para ganar el premio mayor.'
            },
            {
                name: '💰 Premios',
                value: `• Pregunta 1-5: $100 - $1,000 (Fácil)\n` +
                    `• Pregunta 6-10: $2,000 - $32,000 (Medio)\n` +
                    `• Pregunta 11-15: $64,000 - $1,000,000 (Difícil)\n\n` +
                    `**Puntos Seguros:** $1,000 (Q5) y $32,000 (Q10)`
            },
            {
                name: '🎁 Comodines',
                value: `**50:50** - Elimina 2 respuestas incorrectas\n` +
                    `**📊 Pregunta al Público** - Consulta a la audiencia\n` +
                    `**📞 Llamar a un Amigo** - Pide ayuda a otro usuario\n` +
                    `**🔄 Cambiar Pregunta** - Reemplaza la pregunta actual`
            },
            {
                name: '⏱️ Tiempo',
                value: 'Tienes 3 minutos para responder cada pregunta.'
            },
            {
                name: '🎬 Anfitrión (Opcional)',
                value: 'Opcionalmente, otro jugador puede unirse como anfitrión para dirigir el juego al estilo del programa de TV.'
            },
            {
                name: '🚪 Retirarse',
                value: 'Puedes retirarte en cualquier momento y llevarte tus ganancias actuales.'
            }
        )
        .setFooter({ text: '¡Buena suerte!' });

    await sendMessage(interaction, { embed, ephemeral: true });
}

async function showLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as BotClient;
    const firebase = client.firebaseAdminManager;

    if (!firebase) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Firebase no disponible',
            '❌ El sistema de estadísticas no está disponible en este momento.'
        );
    }

    await interaction.deferReply();

    const sortBy = (interaction.options.getString('ordenar_por') as 'totalWinnings' | 'highestLevel') || 'totalWinnings';
    const leaderboard = await firebase.getMillionaireLeaderboard(sortBy, 10);

    if (leaderboard.length === 0) {
        const embed = createInfoEmbed(
            '📊 Clasificación',
            'Aún no hay jugadores en la clasificación. ¡Sé el primero!'
        );
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const sortTitle = sortBy === 'totalWinnings' ? 'Total Ganado' : 'Nivel Más Alto';
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`🏆 Top 10 - ${sortTitle}`)
        .setDescription('Los mejores jugadores de ¿Quién Quiere Ser Millonario?')
        .setTimestamp();

    let description = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        const username = user ? user.displayName : 'Usuario Desconocido';

        if (sortBy === 'totalWinnings') {
            description += `${medal} **${username}** - ${formatPrize(entry.totalWinnings)}\n`;
        } else {
            description += `${medal} **${username}** - Nivel ${entry.highestLevel} (${formatPrize(entry.highestWinning)})\n`;
        }
    }

    embed.setDescription(description);

    await interaction.editReply({ embeds: [embed] });
}

async function showStats(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as BotClient;
    const firebase = client.firebaseAdminManager;

    if (!firebase) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Firebase no disponible',
            '❌ El sistema de estadísticas no está disponible en este momento.'
        );
    }

    const targetUser = interaction.options.getUser('usuario') || interaction.user;

    await interaction.deferReply();

    const stats = await firebase.getPlayerMillionaireStats(targetUser.id);

    if (!stats) {
        const embed = createInfoEmbed(
            '📊 Estadísticas',
            targetUser.id === interaction.user.id
                ? 'Aún no has jugado ninguna partida.'
                : `${targetUser.displayName} aún no ha jugado ninguna partida.`
        );
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const winRate = stats.questionsAnswered > 0
        ? ((stats.correctAnswers / stats.questionsAnswered) * 100).toFixed(1)
        : '0.0';

    const avgWinnings = stats.gamesPlayed > 0
        ? Math.floor(stats.totalWinnings / stats.gamesPlayed)
        : 0;

    const totalLifelinesUsed = stats.lifelinesUsed.fiftyFifty +
        stats.lifelinesUsed.askAudience +
        stats.lifelinesUsed.callFriend +
        stats.lifelinesUsed.changeQuestion;

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`📊 Estadísticas de ${targetUser.displayName}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            {
                name: '🎮 Partidas Jugadas',
                value: stats.gamesPlayed.toString(),
                inline: true
            },
            {
                name: '💰 Total Ganado',
                value: formatPrize(stats.totalWinnings),
                inline: true
            },
            {
                name: '🏆 Mayor Premio',
                value: formatPrize(stats.highestWinning),
                inline: true
            },
            {
                name: '📈 Nivel Más Alto',
                value: `Pregunta ${stats.highestLevel}`,
                inline: true
            },
            {
                name: '💵 Promedio por Juego',
                value: formatPrize(avgWinnings),
                inline: true
            },
            {
                name: '✅ Tasa de Aciertos',
                value: `${winRate}%`,
                inline: true
            },
            {
                name: '❓ Preguntas Respondidas',
                value: stats.questionsAnswered.toString(),
                inline: true
            },
            {
                name: '✓ Respuestas Correctas',
                value: stats.correctAnswers.toString(),
                inline: true
            },
            {
                name: '🎁 Comodines Usados',
                value: totalLifelinesUsed.toString(),
                inline: true
            }
        )
        .addFields({
            name: '📋 Detalles de Comodines',
            value: `• 50:50: ${stats.lifelinesUsed.fiftyFifty}\n` +
                `• 📊 Público: ${stats.lifelinesUsed.askAudience}\n` +
                `• 📞 Amigo: ${stats.lifelinesUsed.callFriend}\n` +
                `• 🔄 Cambiar: ${stats.lifelinesUsed.changeQuestion}`
        })
        .setFooter({ text: 'Última partida' })
        .setTimestamp(stats.lastPlayed);

    await interaction.editReply({ embeds: [embed] });
}

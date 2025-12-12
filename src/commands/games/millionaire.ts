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
    ModalSubmitInteraction
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

function getRoomKey(guildId: string, channelId: string): string {
    return `${guildId}-${channelId}`;
}

function getMemberDisplayName(member: GuildMember | any, user: User): string {
    if (member && typeof member === 'object' && 'displayName' in member) {
        return (member as GuildMember).displayName;
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

    const withHost = interaction.options.getBoolean('con_anfitrion') ?? false;

    const room: MillionaireGameRoom = {
        hostId: withHost ? '' : interaction.user.id,
        playerId: '',
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        started: false,
        hasHost: withHost,
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

    logger.info('Millionaire', `Sala creada en ${roomKey} (${withHost ? 'con' : 'sin'} anfitrión)`);
}

function createLobbyEmbed(room: MillionaireGameRoom, creator: User): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('💰 ¿Quién Quiere Ser Millonario? 💰')
        .setDescription('¡Responde 15 preguntas de trivia y gana hasta **$1,000,000**!')
        .addFields(
            {
                name: '🎮 Modo',
                value: room.hasHost ? 'Con Anfitrión' : 'Automático',
                inline: true
            },
            {
                name: '🎯 Concursante',
                value: room.playerId ? `<@${room.playerId}>` : 'Esperando...',
                inline: true
            },
            {
                name: '🎬 Anfitrión',
                value: room.hasHost
                    ? (room.hostId ? `<@${room.hostId}>` : 'Esperando...')
                    : 'N/A',
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
        .setDisabled(!room.hasHost || !!room.hostId);

    const startButton = new ButtonBuilder()
        .setCustomId('millionaire_start')
        .setLabel('Iniciar Juego')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️')
        .setDisabled(!canStartGame(room));

    const cancelButton = new ButtonBuilder()
        .setCustomId('millionaire_cancel')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        joinButton,
        volunteerButton,
        startButton,
        cancelButton
    );
}

function canStartGame(room: MillionaireGameRoom): boolean {
    if (!room.playerId) return false;
    if (room.hasHost && !room.hostId) return false;
    return true;
}

async function handleJoin(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (room.playerId) {
        await interaction.reply({
            content: '❌ Ya hay un concursante en la sala.',
            ephemeral: true
        });
        return;
    }

    if (room.hasHost && room.hostId === interaction.user.id) {
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
    if (!room.hasHost) {
        await interaction.reply({
            content: '❌ Esta sala no requiere anfitrión.',
            ephemeral: true
        });
        return;
    }

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

async function handleStart(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!canStartGame(room)) {
        await interaction.reply({
            content: '❌ No se puede iniciar el juego. Asegúrate de que haya un concursante' +
                (room.hasHost ? ' y un anfitrión.' : '.'),
            ephemeral: true
        });
        return;
    }

    const isCreatorOrParticipant =
        interaction.user.id === room.playerId ||
        interaction.user.id === room.hostId ||
        (!room.hasHost && interaction.user.id === room.hostId);

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

        const embed = createQuestionEmbed(room, question, prize.amount);
        const buttons = createQuestionButtons(room);

        const channel = await interaction.client.channels.fetch(room.channelId);
        if (!channel?.isTextBased() || !('send' in channel)) return;

        const message = await channel.send({
            embeds: [embed],
            components: buttons
        });

        room.gameMessage = message;

        if (room.hasHost && room.hostId) {
            await sendHostPanel(interaction, room, question, prize.amount);
        }

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000
        });

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

    } catch (error) {
        logger.error('Millionaire', 'Error obteniendo pregunta', error instanceof Error ? error : new Error(String(error)));
        await endGame(interaction, room, false, 'Error obteniendo pregunta');
    }
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
                value: '2:00',
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
    const isCorrect = selectedAnswer === room.currentQuestion.correctAnswer;

    if (isCorrect) {
        await handleCorrectAnswer(interaction, room);
    } else {
        await handleIncorrectAnswer(interaction, room, selectedAnswer);
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

    collector.on('end', async (collected: any, reason: string) => {
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

    await endGame(interaction, room, false);
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

    await endGame(interaction, room, false);
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

    await endGame(interaction, room, false);
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

    await endGame(interaction, room, false);
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
        return;
    }

    const answers = room.currentQuestion.allAnswers.filter(
        answer => !room.eliminatedAnswers?.includes(answer)
    );

    const percentages = generateAudiencePercentages(
        answers,
        room.currentQuestion.correctAnswer
    );

    let resultsText = '📊 **RESULTADOS DE LA AUDIENCIA** 📊\n\n';
    const letters = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < answers.length; i++) {
        const percentage = percentages.get(answers[i]) || 0;
        const barLength = Math.round(percentage / 5);
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        resultsText += `${letters[i]}) ${answers[i]}:\n${bar} ${percentage}%\n\n`;
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setDescription(resultsText);

    await interaction.reply({
        embeds: [embed],
        ephemeral: false
    });

    logger.info('Millionaire', 'Pregunta al público usado');
}

function generateAudiencePercentages(
    answers: string[],
    correctAnswer: string
): Map<string, number> {
    const percentages = new Map<string, number>();
    const correctPercentage = 60 + Math.floor(Math.random() * 16);

    percentages.set(correctAnswer, correctPercentage);

    let remaining = 100 - correctPercentage;
    const otherAnswers = answers.filter(a => a !== correctAnswer);

    for (let i = 0; i < otherAnswers.length; i++) {
        if (i === otherAnswers.length - 1) {
            percentages.set(otherAnswers[i], remaining);
        } else {
            const percentage = Math.floor(Math.random() * (remaining - (otherAnswers.length - i - 1)));
            percentages.set(otherAnswers[i], percentage);
            remaining -= percentage;
        }
    }

    return percentages;
}

async function handleCallFriend(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!room.lifelines.callFriend) {
        await interaction.reply({
            content: '❌ Ya usaste este comodín.',
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('millionaire_friend_modal')
        .setTitle('Llamar a un Amigo');

    const friendInput = new TextInputBuilder()
        .setCustomId('friend_mention')
        .setLabel('Menciona a tu amigo (@usuario)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('@amigo')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(friendInput)
    );

    await interaction.showModal(modal);

    try {
        const modalSubmit = await interaction.awaitModalSubmit({
            time: 60000,
            filter: i => i.customId === 'millionaire_friend_modal' && i.user.id === interaction.user.id
        });

        await handleFriendModalSubmit(modalSubmit, room);
    } catch (error) {
        logger.warn('Millionaire', 'Timeout esperando modal de amigo');
    }
}

async function handleFriendModalSubmit(
    interaction: ModalSubmitInteraction,
    room: MillionaireGameRoom
): Promise<void> {
    room.lifelines.callFriend = false;

    const friendMention = interaction.fields.getTextInputValue('friend_mention');
    const userId = friendMention.match(/\d+/)?.[0];

    if (!userId) {
        await interaction.reply({
            content: '❌ Mención inválida. Usa el formato @usuario',
            ephemeral: true
        });
        return;
    }

    try {
        const friend = await interaction.client.users.fetch(userId);

        if (friend.bot) {
            await interaction.reply({
                content: '❌ No puedes llamar a un bot.',
                ephemeral: true
            });
            return;
        }

        const questionEmbed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('📞 Llamada de un Amigo')
            .setDescription(
                `**${interaction.user.displayName}** te está llamando para pedirte ayuda.\n\n` +
                `**Pregunta:** ${room.currentQuestion?.question}\n\n` +
                `**Respuestas:**\n` +
                `A) ${room.currentQuestion?.allAnswers?.[0]}\n` +
                `B) ${room.currentQuestion?.allAnswers?.[1]}\n` +
                `C) ${room.currentQuestion?.allAnswers?.[2]}\n` +
                `D) ${room.currentQuestion?.allAnswers?.[3]}\n\n` +
                `Responde con la letra que creas correcta (A, B, C, o D). Tienes 30 segundos.`
            );

        const friendMessage = await friend.send({ embeds: [questionEmbed] });

        await interaction.reply({
            content: `📞 Llamando a ${friend.displayName}... Esperando respuesta (30s)`,
            ephemeral: false
        });

        if (!('createMessageCollector' in friendMessage.channel)) {
            await interaction.reply({
                content: '❌ No se pudo establecer comunicación con el amigo.',
                ephemeral: true
            });
            room.lifelines.callFriend = true;
            return;
        }

        const dmCollector = friendMessage.channel.createMessageCollector({
            filter: (m: any) => m.author.id === friend.id,
            time: 30000,
            max: 1
        });

        dmCollector.on('collect', async (message: any) => {
            const response = message.content.toUpperCase().trim();
            const validAnswers = ['A', 'B', 'C', 'D'];

            if (validAnswers.includes(response)) {
                await interaction.followUp({
                    content: `📞 **${friend.displayName}** dice: "Creo que es la **${response}**"`
                });
            } else {
                await interaction.followUp({
                    content: `📞 **${friend.displayName}**: "${message.content}"`
                });
            }
        });

        dmCollector.on('end', async (collected: any) => {
            if (collected.size === 0) {
                await interaction.followUp({
                    content: `📞 ${friend.displayName} no respondió a tiempo.`
                });
            }
        });

    } catch (error) {
        await interaction.reply({
            content: '❌ No se pudo contactar a ese usuario. Puede que tenga los DMs cerrados.',
            ephemeral: true
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

        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, newQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        if (room.gameMessage) {
            await room.gameMessage.edit({
                embeds: [embed],
                components: buttons
            });
        }

        logger.info('Millionaire', 'Cambiar pregunta usado');
    } catch (error) {
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
    errorMessage?: string
): Promise<void> {
    const roomKey = getRoomKey(room.guildId, room.channelId);

    const finalWinnings = isWinner ? room.currentPrize : room.safeHavenReached;

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
                .addBooleanOption(option =>
                    option
                        .setName('con_anfitrion')
                        .setDescription('¿Requiere un anfitrión para dirigir el juego?')
                        .setRequired(false)
                )
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
                value: 'Tienes 2 minutos para responder cada pregunta.'
            },
            {
                name: '🎮 Modos de Juego',
                value: '**Automático:** El bot maneja todo automáticamente\n' +
                    '**Con Anfitrión:** Un jugador dirige el juego al estilo del programa de TV'
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

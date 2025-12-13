import {
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    InteractionCollector
} from 'discord.js';
import { MillionaireGameRoom, TriviaQuestion } from '../../../types/millionaire.js';
import { COLORS } from '../../../utils/constants.js';
import { createInfoEmbed, createErrorEmbed } from '../../../utils/messageUtils.js';
import { logger } from '../../../utils/logger.js';
import { triviaService } from '../../../services/TriviaService.js';
import { getPrizeForLevel, getDifficultyForLevel, formatPrize, getLastSafeHaven } from '../../../config/millionairePrizes.js';
import { activeRooms } from './state.js';
import { createQuestionEmbed } from './embeds.js';
import { createQuestionButtons } from './buttons.js';
import { getHostMessage } from './constants.js';
import { initializeHostPanelForQuestion, updateHostPanelWithTimeControls } from './host.js';

// Import handler functions that are called from game functions
// These will need to be imported from the main millionaire.ts file or extracted to separate modules
declare function handleAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleCashout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleQuit(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleLifeline(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleTimeout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function endGame(interaction: ButtonInteraction, room: MillionaireGameRoom, won: boolean, reason?: string): Promise<void>;

/**
 * Inicia el juego de Millionaire
 */
export async function startGame(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

/**
 * Muestra una pregunta al jugador
 */
export async function displayQuestion(
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

/**
 * Muestra una pregunta en modo automático (sin anfitrión)
 */
export async function displayQuestionAutomatic(
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

/**
 * Muestra una pregunta en modo con anfitrión
 */
export async function displayQuestionWithHost(
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

// Host functions moved to host.ts

/**
 * Actualiza el mensaje del juego con las opciones reveladas
 */
export async function updateGameMessageWithOptions(
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

    // Add image if available
    if (question.imageUrl) {
        questionEmbed.setImage(question.imageUrl);
    }

    await room.gameMessage.edit({ embeds: [questionEmbed] });
}

// handleEmergencyReveal and handleHostSkipIntro moved to host.ts

/**
 * Revela las opciones progresivamente
 */
export async function revealOptionsProgressively(
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

        // Update host panel with the current options
        if (room.hostPanelMessage && room.hostId) {
            const hostEmbed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle('🎬 REVELACIÓN EN PROGRESO')
                .setDescription(
                    `**Pregunta:** ${question.question}\n` +
                    `**Respuesta Correcta:** ${question.correctAnswer}\n\n` +
                    `**Opciones Reveladas (${i + 1}/4):**\n${answersText}`
                );

            await room.hostPanelMessage.edit({ embeds: [hostEmbed], components: [] });
        }
    }

    // Give host time to read all options (5 seconds)
    if (room.hostPanelMessage && room.hostId) {
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

/**
 * Finaliza la revelación de la pregunta y habilita las respuestas
 */
export async function finalizeQuestionReveal(
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

// updateHostPanelWithTimeControls moved to host.ts

import {
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import { MillionaireGameRoom, TriviaQuestion, GameEndData } from '../../../types/millionaire.js';
import { COLORS } from '../../../utils/constants.js';
import { createInfoEmbed, createSuccessEmbed, createErrorEmbed } from '../../../utils/messageUtils.js';
import { logger } from '../../../utils/logger.js';
import { getPrizeForLevel, formatPrize } from '../../../config/millionairePrizes.js';
import { BotClient } from '../../../types/BotClient.js';
import { activeRooms } from './state.js';
import { createQuestionEmbed } from './embeds.js';
import { createQuestionButtons } from './buttons.js';
import { displayQuestion } from './game.js';
import { getRoomKey } from './utils.js';
import {
    updateHostPanelWithSelection,
    updateHostPanelForReveal,
    updateHostPanelForRevealNoInteraction
} from './host.js';

// sendHostPanel moved to host.ts

export async function handleAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function handleAnswerWithHost(
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

// updateHostPanelWithSelection, handleHostAskFinal, handleHostValidate, handleHostAllowChange moved to host.ts

export async function handleFinalAnswerConfirmed(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    room.awaitingFinalAnswer = false;

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    // Respond to player's interaction to prevent "Interaction Failed"
    const confirmEmbed = createInfoEmbed(
        '✅ Respuesta Confirmada',
        `Has confirmado tu respuesta: **${room.playerSelectedAnswer}**\n\n` +
        `🎬 El anfitrión revelará el resultado...`
    );

    await interaction.update({
        embeds: [confirmEmbed],
        components: []
    });

    if (room.hasHost && room.hostId) {
        await updateHostPanelForReveal(interaction, room);
    } else {
        await revealAnswer(interaction, room);
    }
}

export async function handleFinalAnswerRejected(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    // Save previous selection BEFORE clearing it
    const previousSelection = room.playerSelectedAnswer;

    room.playerSelectedAnswer = undefined;
    room.awaitingFinalAnswer = false;

    await interaction.update({
        content: '🔄 Cambio de respuesta solicitado.',
        components: []
    });

    // Notify host if present
    if (room.hasHost && room.hostId) {
        try {
            const host = await interaction.client.users.fetch(room.hostId);

            const hostNotifyEmbed = createInfoEmbed(
                '🔄 Jugador Cambió de Opinión',
                `**<@${room.playerId}>** decidió cambiar su respuesta.\n\n` +
                `**Pregunta:** ${room.currentQuestion?.question}\n` +
                `**Respuesta correcta:** ${room.currentQuestion?.correctAnswer}\n` +
                `**Selección anterior:** ${previousSelection || 'Ninguna'}`
            );

            if (room.hostPanelMessage) {
                await room.hostPanelMessage.edit({
                    embeds: [hostNotifyEmbed],
                    components: []
                });
            } else {
                await host.send({ embeds: [hostNotifyEmbed] });
            }
        } catch (error) {
            logger.warn('Millionaire', 'No se pudo notificar al anfitrión del cambio');
        }
    }

    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    if (room.currentQuestion) {
        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, room.currentQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        // Send a NEW message instead of editing to make it visible
        const changeEmbed = createInfoEmbed(
            '🔄 Cambio de Respuesta',
            `**<@${room.playerId}>** ha decidido cambiar su respuesta.\n\n` +
            `Aquí está la pregunta nuevamente:`
        );

        await channel.send({ embeds: [changeEmbed] });

        const newMessage = await channel.send({
            embeds: [embed],
            components: buttons
        });

        // Update game message reference
        room.gameMessage = newMessage;

        // Recreate collector for the new message
        const { recreateCollectorForQuestion } = await import('./game.js');
        await recreateCollectorForQuestion(room);
    }
}

// updateHostPanelForReveal and updateHostPanelForRevealNoInteraction moved to host.ts

export async function createSuspenseAndReveal(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const channel = await interaction.client.channels.fetch(room.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const suspenseEmbed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setDescription('🎬 **Anfitrión:** Veamos si es correcta...\n\n⏱️ ...');

    await channel.send({ embeds: [suspenseEmbed] });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await revealAnswer(interaction, room);
}

export async function revealAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function revealAnswerNoInteraction(room: MillionaireGameRoom): Promise<void> {
    const letters = ['A', 'B', 'C', 'D'];
    const index = letters.indexOf(room.playerSelectedAnswer || '');
    const selectedAnswer = room.currentQuestion?.allAnswers?.[index];
    const isCorrect = selectedAnswer === room.currentQuestion?.correctAnswer;

    if (isCorrect) {
        await handleCorrectAnswerNoInteraction(room);
    } else {
        await handleIncorrectAnswerNoInteraction(room, selectedAnswer || '');
    }
}

export async function handleCorrectAnswer(interaction: ButtonInteraction | null, room: MillionaireGameRoom): Promise<void> {
    const prize = getPrizeForLevel(room.currentQuestionIndex);
    if (!prize) return;

    room.currentPrize = prize.amount;

    if (prize.isSafeHaven) {
        room.safeHavenReached = prize.amount;
    }

    const embed = createSuccessEmbed(
        '✅ ¡Respuesta Correcta!',
        `**<@${room.playerId}>** ha respondido correctamente!\n\n` +
        `**Ganancia:** ${formatPrize(prize.amount)}` +
        (prize.isSafeHaven ? '\n\n🏦 **¡PUNTO SEGURO ALCANZADO!**' : '')
    );

    // Get the channel to send a NEW visible message
    const channel = room.gameMessage?.channel || (interaction ? await interaction.client.channels.fetch(room.channelId) : null);
    if (!channel || !('send' in channel)) return;

    // Send NEW message for better visibility instead of editing
    await channel.send({ embeds: [embed] });

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

    // Send follow-up message with options
    const message = interaction
        ? await interaction.followUp({
            content: '¿Qué deseas hacer?',
            components: [row]
        })
        : await channel.send({
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
            if (interaction) {
                await displayQuestion(interaction, room);
            } else {
                // Can't display next question without interaction - end game
                await endGame(null, room, true);
            }
        }
    });
}

export async function handleCorrectAnswerNoInteraction(room: MillionaireGameRoom): Promise<void> {
    await handleCorrectAnswer(null, room);
}

export async function handleIncorrectAnswer(
    interaction: ButtonInteraction | null,
    room: MillionaireGameRoom,
    selectedAnswer: string
): Promise<void> {
    const finalWinnings = room.safeHavenReached;

    const embed = createErrorEmbed(
        '❌ Respuesta Incorrecta',
        `**<@${room.playerId}>** ha respondido incorrectamente.\n\n` +
        `**Respuesta seleccionada:** ${selectedAnswer}\n` +
        `**Respuesta correcta:** ${room.currentQuestion?.correctAnswer}\n\n` +
        `**Ganancia final:** ${formatPrize(finalWinnings)}`
    );

    // Get the channel to send a NEW visible message
    const channel = room.gameMessage?.channel || (interaction ? await interaction.client.channels.fetch(room.channelId) : null);
    if (!channel || !('send' in channel)) return;

    // Send NEW message for better visibility instead of editing
    await channel.send({ embeds: [embed] });

    await endGame(interaction, room, false, undefined, finalWinnings, true);
}

export async function handleIncorrectAnswerNoInteraction(
    room: MillionaireGameRoom,
    selectedAnswer: string
): Promise<void> {
    await handleIncorrectAnswer(null, room, selectedAnswer);
}

export async function handleCashout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function handleQuit(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function handleTimeout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function endGame(
    interaction: ButtonInteraction | null,
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

    // Get client from interaction or from room.gameMessage
    const client = interaction?.client || room.gameMessage?.client;
    if (!client) {
        logger.error('Millionaire', 'No client available in endGame');
        return;
    }

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

        const channel = await client.channels.fetch(room.channelId);
        if (channel?.isTextBased() && 'send' in channel) {
            await channel.send({ embeds: [embed] });
        }
    }

    if (room.playerId && !errorMessage) {
        const botClient = client as BotClient;
        const firebase = botClient.firebaseAdminManager;

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

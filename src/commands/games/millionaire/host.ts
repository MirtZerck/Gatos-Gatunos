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
import { createInfoEmbed } from '../../../utils/messageUtils.js';
import { logger } from '../../../utils/logger.js';
import { getPrizeForLevel, formatPrize, getLastSafeHaven } from '../../../config/millionairePrizes.js';
import { activeRooms } from './state.js';
import { createQuestionButtons } from './buttons.js';
import { displayQuestionAutomatic, updateGameMessageWithOptions, revealOptionsProgressively, finalizeQuestionReveal } from './game.js';
import {
    handleFinalAnswerConfirmed,
    handleFinalAnswerRejected,
    revealAnswer,
    createSuspenseAndReveal,
    revealAnswerNoInteraction
} from './answers.js';

// Import handler functions that will be called from host functions
declare function handleAnswer(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleCashout(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleQuit(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;
declare function handleLifeline(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void>;

/**
 * Función auxiliar para enviar panel al anfitrión
 */
export async function sendHostPanel(
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

/**
 * Inicializa el panel del anfitrión para una pregunta
 */
export async function initializeHostPanelForQuestion(
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

/**
 * Maneja cuando el anfitrión decide leer la pregunta dramáticamente
 */
export async function handleHostReadQuestion(
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

/**
 * Muestra el panel para que el anfitrión revele la pregunta
 */
export async function showHostRevealQuestionPanel(
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
            `¿Listo para revelar la pregunta a los espectadores?\n\n` +
            `**Pregunta:** ${question.question}\n` +
            `**Respuesta Correcta:** ${question.correctAnswer}\n` +
            `**Categoría:** ${question.category}`
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

/**
 * Maneja cuando el anfitrión revela la pregunta
 */
export async function handleHostRevealQuestion(
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

/**
 * Muestra el panel para que el anfitrión elija cómo revelar las opciones
 */
export async function showHostRevealOptionsPanel(
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

/**
 * Maneja la revelación automática de opciones
 */
export async function handleHostRevealOptionsAuto(
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

/**
 * Maneja la revelación de todas las opciones a la vez
 */
export async function handleHostRevealOptionsAll(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    await interaction.update({
        content: '⏭️ Mostrando todas las opciones...',
        components: []
    });

    // Don't set room.optionsRevealed before calling revealOptionsProgressively
    // Let the function handle the incremental reveal
    await revealOptionsProgressively(room, question, prizeAmount, true);
    await finalizeQuestionReveal(interaction, room, question, prizeAmount);
}

/**
 * Maneja el modo de revelación manual de opciones
 */
export async function handleHostRevealOptionsManual(
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

/**
 * Muestra el panel de revelación manual
 */
export async function showManualRevealPanel(
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
            `**Pregunta:** ${question.question}\n` +
            `**Respuesta Correcta:** ${question.correctAnswer}\n\n` +
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

/**
 * Maneja la revelación de una sola opción
 */
export async function handleHostRevealSingleOption(
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

/**
 * Maneja la revelación de todas las opciones restantes
 */
export async function handleHostRevealAllNow(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    question: TriviaQuestion,
    prizeAmount: number
): Promise<void> {
    await interaction.update({
        content: '⏭️ Revelando todas las opciones restantes...',
        components: []
    });

    // Use revealOptionsProgressively to show all remaining options with animation
    await revealOptionsProgressively(room, question, prizeAmount, true);
    await finalizeQuestionReveal(interaction, room, question, prizeAmount);
}

/**
 * Maneja el modo de emergencia cuando el anfitrión no responde
 */
export async function handleEmergencyReveal(
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

/**
 * Maneja cuando el anfitrión decide omitir la intro y revelar todo
 */
export async function handleHostSkipIntro(
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

/**
 * Actualiza el panel del anfitrión con controles de tiempo
 */
export async function updateHostPanelWithTimeControls(room: MillionaireGameRoom): Promise<void> {
    if (!room.hostPanelMessage || !room.hostId) return;

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎬 PANEL DE ANFITRIÓN - ESPERANDO RESPUESTA')
        .setDescription(
            `**El jugador está pensando...**\n\n` +
            `**Pregunta:** ${room.currentQuestion?.question}\n` +
            `**Respuesta Correcta:** ${room.currentQuestion?.correctAnswer}\n\n` +
            `Tiempo restante: <t:${Math.floor((room.questionStartTime! + 180000) / 1000)}:R>`
        );

    await room.hostPanelMessage.edit({
        embeds: [embed],
        components: []
    });
}

/**
 * Maneja cuando el anfitrión pausa el tiempo (funcionalidad futura)
 */
export async function handleHostPauseTime(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    // Implementación futura
    await interaction.reply({
        content: '⏸️ Funcionalidad de pausa no implementada aún.',
        ephemeral: true
    });
}

/**
 * Maneja cuando el anfitrión reanuda el tiempo (funcionalidad futura)
 */
export async function handleHostResumeTime(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    // Implementación futura
    await interaction.reply({
        content: '▶️ Funcionalidad de reanudación no implementada aún.',
        ephemeral: true
    });
}

/**
 * Maneja modo automático de emergencia (funcionalidad futura)
 */
export async function handleHostEmergencyAuto(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    // Implementación futura
    await interaction.reply({
        content: '⚠️ Funcionalidad de modo automático de emergencia no implementada aún.',
        ephemeral: true
    });
}

/**
 * Actualiza el panel del anfitrión con la selección del jugador
 */
export async function updateHostPanelWithSelection(
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

/**
 * Maneja cuando el anfitrión pregunta "¿Respuesta Final?"
 */
export async function handleHostAskFinal(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

            room.awaitingFinalAnswer = false;

            const channel = await interaction.client.channels.fetch(room.channelId);
            if (!channel?.isTextBased() || !('send' in channel)) return;

            if (room.hasHost && room.hostId) {
                await updateHostPanelForRevealNoInteraction(room);
            } else {
                await revealAnswerNoInteraction(room);
            }
        }
    });
}

/**
 * Maneja cuando el anfitrión valida la respuesta directamente
 */
export async function handleHostValidate(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    await interaction.update({
        content: '⚡ Validando respuesta directamente...',
        components: []
    });

    await handleFinalAnswerConfirmed(interaction, room);
}

/**
 * Maneja cuando el anfitrión permite cambiar la respuesta
 */
export async function handleHostAllowChange(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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
        // Import createQuestionEmbed dynamically to avoid circular dependency
        const { createQuestionEmbed } = await import('./embeds.js');
        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, room.currentQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        await room.gameMessage.edit({
            embeds: [embed],
            components: buttons
        });
    }
}

/**
 * Actualiza el panel del anfitrión para revelar el resultado
 */
export async function updateHostPanelForReveal(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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
            .setLabel('⏭️ Crear Suspenso (5s)')
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
                await revealAnswerNoInteraction(room);
            }
        });

    } catch (error) {
        logger.warn('Millionaire', 'No se pudo actualizar panel del anfitrión');
        await revealAnswerNoInteraction(room);
    }
}

/**
 * Actualiza el panel del anfitrión para revelar sin interacción
 */
export async function updateHostPanelForRevealNoInteraction(room: MillionaireGameRoom): Promise<void> {
    if (!room.hostId || !room.gameMessage) return;

    try {
        const host = await room.gameMessage.client.users.fetch(room.hostId);

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
                await revealAnswerNoInteraction(room);
            }
        });

    } catch (error) {
        logger.warn('Millionaire', 'No se pudo actualizar panel del anfitrión');
        await revealAnswerNoInteraction(room);
    }
}

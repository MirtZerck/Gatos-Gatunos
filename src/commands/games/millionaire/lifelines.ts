import {
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    InteractionCollector
} from 'discord.js';
import { logger } from '../../../utils/logger.js';
import { COLORS } from '../../../utils/constants.js';
import { createErrorEmbed } from '../../../utils/messageUtils.js';
import { triviaService } from '../../../services/TriviaService.js';
import { MillionaireGameRoom, TriviaQuestion } from '../../../types/millionaire.js';
import { activeRooms } from './state.js';
import { createQuestionEmbed } from './embeds.js';
import { createQuestionButtons } from './buttons.js';
import { handleAnswer, handleCashout, handleQuit, handleTimeout } from './answers.js';
import { getPrizeForLevel, getDifficultyForLevel, formatPrize } from '../../../config/millionairePrizes.js';
import { notifyHostLifelineUsed } from './host.js';

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

export async function handleLifeline(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function handleFiftyFifty(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

    // Notify host if present
    if (room.hasHost && room.hostId) {
        const letters = ['A', 'B', 'C', 'D'];
        const eliminatedLetters = toEliminate.map(ans => {
            const index = room.currentQuestion?.allAnswers?.indexOf(ans);
            return index !== undefined && index !== -1 ? letters[index] : '?';
        });

        const result = `**Opciones eliminadas:**\n${eliminatedLetters.map((letter, i) => `${letter}) ${toEliminate[i]}`).join('\n')}`;
        await notifyHostLifelineUsed(room, '50:50', result);
    }

    logger.info('Millionaire', '50:50 usado');
}

export async function handleAskAudience(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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
        let hostResultText = '';

        if (totalVotes === 0) {
            resultsText += 'No hubo votos de la audiencia.';
            hostResultText = 'No hubo votos de la audiencia.';
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
                hostResultText += `${letter}) ${answer}: ${percentage}% (${voteCount} votos)\n`;
            }
        }

        const resultsEmbed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setDescription(resultsText);

        await voteMessage.edit({
            embeds: [resultsEmbed],
            components: []
        });

        // Notify host if present
        if (room.hasHost && room.hostId) {
            const result = `**Total de votos:** ${totalVotes}\n\n${hostResultText}`;
            await notifyHostLifelineUsed(room, 'Preguntar al Público', result);
        }
    });

    logger.info('Millionaire', 'Pregunta al público usado');
}

export async function handleCallFriend(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

export async function processFriendCall(
    interaction: StringSelectMenuInteraction,
    room: MillionaireGameRoom,
    friendId: string
): Promise<void> {
    // Defer immediately to prevent "Unknown interaction" error
    await interaction.deferUpdate();

    try {
        const friend = await interaction.client.users.fetch(friendId);

        if (friend.bot) {
            await interaction.editReply({
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

        await interaction.editReply({
            content: `📞 Llamando a **${friend.displayName}**... Esperando respuesta (45s)`,
            components: []
        });

        const channel = await interaction.client.channels.fetch(room.channelId);
        if (!channel?.isTextBased() || !('send' in channel)) return;

        await channel.send({
            content: `📞 **${interaction.user.displayName}** está llamando a **${friend.displayName}**...`
        });

        // Notify host when lifeline is USED, not when it finishes
        if (room.hasHost && room.hostId) {
            try {
                const host = await interaction.client.users.fetch(room.hostId);
                const initialEmbed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('📞 COMODÍN: Llamar a un Amigo')
                    .setDescription(
                        `**Amigo llamado:** ${friend.displayName}\n` +
                        `**Estado:** ⏳ Esperando respuesta (45 segundos)...`
                    );

                // Save the message reference to update it later
                room.hostPanelMessage = await host.send({ embeds: [initialEmbed] });
            } catch (error) {
                logger.warn('Millionaire', 'No se pudo notificar al anfitrión');
            }
        }

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

                // Update host panel with the result
                if (room.hasHost && room.hostId && room.hostPanelMessage) {
                    try {
                        const resultEmbed = new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle('📞 COMODÍN: Llamar a un Amigo')
                            .setDescription(
                                `**Amigo llamado:** ${friend.displayName}\n` +
                                `**Resultado:** ✅ Respondió con **${response}**`
                            );
                        await room.hostPanelMessage.edit({ embeds: [resultEmbed] });
                    } catch (error) {
                        logger.warn('Millionaire', 'No se pudo actualizar resultado al anfitrión');
                    }
                }
            } else {
                await channel.send({
                    content: `📞 **${friend.displayName}**: "${message.content}"`
                });

                // Update host panel with the result
                if (room.hasHost && room.hostId && room.hostPanelMessage) {
                    try {
                        const resultEmbed = new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle('📞 COMODÍN: Llamar a un Amigo')
                            .setDescription(
                                `**Amigo llamado:** ${friend.displayName}\n` +
                                `**Resultado:** 💬 "${message.content}"`
                            );
                        await room.hostPanelMessage.edit({ embeds: [resultEmbed] });
                    } catch (error) {
                        logger.warn('Millionaire', 'No se pudo actualizar resultado al anfitrión');
                    }
                }
            }
        });

        dmCollector.on('end', async (collected) => {
            if (collected.size === 0) {
                await channel.send({
                    content: `📞 ${friend.displayName} no respondió a tiempo.`
                });

                // Update host panel with timeout result
                if (room.hasHost && room.hostId && room.hostPanelMessage) {
                    try {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(COLORS.DANGER)
                            .setTitle('📞 COMODÍN: Llamar a un Amigo')
                            .setDescription(
                                `**Amigo llamado:** ${friend.displayName}\n` +
                                `**Resultado:** ⏱️ No respondió a tiempo (45 segundos agotados)`
                            );
                        await room.hostPanelMessage.edit({ embeds: [timeoutEmbed] });
                    } catch (error) {
                        logger.warn('Millionaire', 'No se pudo actualizar timeout al anfitrión');
                    }
                }
            }
        });

    } catch (error) {
        logger.error('Millionaire', 'Error procesando llamada', error instanceof Error ? error : new Error(String(error)));
        await interaction.editReply({
            content: '❌ No se pudo contactar a ese usuario. Puede que tenga los DMs cerrados. El comodín sigue disponible.',
            components: []
        });
        room.lifelines.callFriend = true;
    }

    logger.info('Millionaire', 'Llamar a un amigo usado');
}

export async function handleChangeQuestion(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
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

    // Responder a la interacción de forma efímera
    await interaction.reply({
        content: '🔄 Cambiando pregunta...',
        ephemeral: true
    });

    const difficulty = getDifficultyForLevel(room.currentQuestionIndex);

    try {
        let newQuestion = await triviaService.getQuestion(
            difficulty,
            room.usedQuestionIds,
            room.sessionToken
        );

        newQuestion = await triviaService.enhanceQuestionWithImage(newQuestion);

        // Save old question BEFORE overwriting it
        const oldQuestion = room.currentQuestion;

        // Reset all game states related to answers
        room.currentQuestion = newQuestion;
        room.usedQuestionIds.add(newQuestion.id);
        room.eliminatedAnswers = [];
        room.questionStartTime = Date.now();
        room.playerSelectedAnswer = undefined;
        room.awaitingFinalAnswer = false;
        room.hostPanelState = 'WAITING_PLAYER';

        const prize = getPrizeForLevel(room.currentQuestionIndex);
        const embed = createQuestionEmbed(room, newQuestion, prize?.amount || 0);
        const buttons = createQuestionButtons(room);

        const channel = await interaction.client.channels.fetch(room.channelId);
        if (!channel?.isTextBased() || !('send' in channel)) {
            throw new Error('Canal no válido');
        }

        // Editar el mensaje existente en lugar de crear uno nuevo
        if (room.gameMessage) {
            await room.gameMessage.edit({
                embeds: [embed],
                components: buttons
            });
        } else {
            // Fallback si no hay mensaje previo
            const newMessage = await channel.send({
                embeds: [embed],
                components: buttons
            });
            room.gameMessage = newMessage;
        }

        if (room.hasHost && room.hostId) {
            // Send a single combined message to host with lifeline info + new question panel
            try {
                const host = await interaction.client.users.fetch(room.hostId);

                const letters = ['A', 'B', 'C', 'D'];
                let optionsText = '';
                if (newQuestion.allAnswers) {
                    for (let i = 0; i < newQuestion.allAnswers.length; i++) {
                        const isCorrect = newQuestion.allAnswers[i] === newQuestion.correctAnswer;
                        const correctMark = isCorrect ? ' ✅' : '';
                        optionsText += `${letters[i]}) ${newQuestion.allAnswers[i]}${correctMark}\n`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('🔄 COMODÍN: CAMBIAR PREGUNTA')
                    .setDescription(
                        `**Pregunta anterior (descartada):**\n${oldQuestion?.question || 'N/A'}\n` +
                        `**Categoría anterior:** ${oldQuestion?.category || 'N/A'}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `**NUEVA PREGUNTA ${room.currentQuestionIndex} - ${formatPrize(prize?.amount || 0)}**\n\n` +
                        `**Pregunta:** ${newQuestion.question}\n` +
                        `**Categoría:** ${newQuestion.category}\n` +
                        `**Dificultad:** ${newQuestion.difficulty}\n\n` +
                        `**Opciones:**\n${optionsText}`
                    );

                await host.send({ embeds: [embed] });
            } catch (error) {
                logger.warn('Millionaire', 'No se pudo enviar panel al anfitrión');
            }
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

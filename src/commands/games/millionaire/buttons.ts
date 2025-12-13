import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MillionaireGameRoom } from '../../../types/millionaire.js';
import { formatPrize } from '../../../config/millionairePrizes.js';
import { canStartGame } from './utils.js';

/**
 * Crea los botones del lobby de espera
 */
export function createLobbyButtons(room: MillionaireGameRoom): ActionRowBuilder<ButtonBuilder> {
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

/**
 * Crea los botones de respuesta y acciones durante el juego
 */
export function createQuestionButtons(room: MillionaireGameRoom): ActionRowBuilder<ButtonBuilder>[] {
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

import { EmbedBuilder, User } from 'discord.js';
import { MillionaireGameRoom, TriviaQuestion } from '../../../types/millionaire.js';
import { COLORS } from '../../../utils/constants.js';
import { formatPrize, getLastSafeHaven } from '../../../config/millionairePrizes.js';

/**
 * Crea el embed del lobby de espera
 */
export function createLobbyEmbed(room: MillionaireGameRoom, creator: User): EmbedBuilder {
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

/**
 * Crea el embed de una pregunta del juego
 */
export function createQuestionEmbed(
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

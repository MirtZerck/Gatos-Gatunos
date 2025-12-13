/**
 * Plantillas de mensajes del host para diferentes momentos del juego
 */
export const HOST_MESSAGES = {
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

/**
 * Obtiene un mensaje aleatorio del host y reemplaza variables
 */
export function getHostMessage(
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

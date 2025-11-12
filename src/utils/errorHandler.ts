import {
    ChatInputCommandInteraction,
    Message
} from 'discord.js';

export enum ErrorType {
    API_ERROR = 'API_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT = 'RATE_LIMIT',
    NOT_FOUND = 'NOT_FOUND',
    UNKNOWN = 'UNKNOWN'
}

export class CommandError extends Error {
    constructor(
        public type: ErrorType,
        message: string,
        public userMessage?: string
    ) {
        super(message);
        this.name = 'CommandError';

        Error.captureStackTrace(this, this.constructor);
    }
}

export async function handleCommandError(
    error: unknown,
    context: ChatInputCommandInteraction | Message,
    commandName: string
): Promise<void> {
    console.error(`[${commandName}] Error:`, error);

    let userMessage = '❌ Ocurrió un error inesperado. Por favor, intenta de nuevo.'
    let shouldLog = true;

    if (error instanceof CommandError) {
        userMessage = error.userMessage || userMessage;

        switch (error.type) {
            case ErrorType.API_ERROR:
                console.error(`[${commandName}] API Error:`, error.message);
                shouldLog = false;
                break;

            case ErrorType.VALIDATION_ERROR:
                console.warn(`[${commandName}] Permiso denegado:`, error.message);
                shouldLog = false;
                break

            case ErrorType.RATE_LIMIT:
                console.warn(`[${commandName}] Rate limit alcanzado`);
                userMessage = `⏱️ Estás usando los comandos muy rápido. Espera un momento.`
                break;

            case ErrorType.NOT_FOUND:
                console.warn(`${commandName} No encontrado:`, error.message);

            case ErrorType.UNKNOWN:
                console.error(`[${commandName}] Error desconocido:`, error.message);
                break
        }
    } else if (error instanceof Error) {
        console.error(`[${commandName}] Error no manejado:`, error.message);
        console.error(error.stack);
    }

    try {
        if (context instanceof ChatInputCommandInteraction) {

            if (context.replied || context.deferred) {
                await context.editReply({ content: userMessage, embeds: [] });
            } else {
                await context.reply({ content: userMessage, ephemeral: true });
            }
        } else {
            await context.reply(userMessage);

        }
    } catch (replyError) {
        console.error(`[${commandName}] No se pudo responder al usuario:`, replyError);

    }
}

export async function safeExecute<T>(
    fn: () => Promise<T>,
    errorMensaje: string = 'Error en la operación'
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        console.error(errorMensaje, error);
        return null;
    }
}
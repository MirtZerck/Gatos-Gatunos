import {
    ChatInputCommandInteraction,
    Message
} from 'discord.js';
import { logger } from './logger.js';

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
    logger.error(commandName, 'Error en comando', error)

    let userMessage = '❌ Ocurrió un error inesperado. Por favor, intenta de nuevo.'
    let shouldLog = true;

    if (error instanceof CommandError) {
        userMessage = error.userMessage || userMessage;

        switch (error.type) {
            case ErrorType.API_ERROR:
                logger.error(commandName, `API ERROR: ${error.message}`);
                shouldLog = false;
                break;

            case ErrorType.VALIDATION_ERROR:
                logger.warn(commandName, `Validación fallida: ${error.message}`);
                shouldLog = false;
                break

            case ErrorType.PERMISSION_ERROR:
                logger.warn(commandName, `Permiso denegado: ${error.message}`);
                shouldLog = false;
                break;

            case ErrorType.RATE_LIMIT:
                logger.warn(commandName, 'Rate limit alcanzado')
                userMessage = `⏱️ Estás usando los comandos muy rápido. Espera un momento.`
                break;

            case ErrorType.NOT_FOUND:
                logger.warn(commandName, 'No encontrado')

            case ErrorType.UNKNOWN:
                logger.error(commandName, `Error desconocido: ${error.message}`)
                break
        }
    } else if (error instanceof Error) {
        logger.error(commandName, 'Error no manejado', error)
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
        logger.error(commandName, 'No se pudo responder al usuario', replyError)

    }
}

export async function safeExecute<T>(
    fn: () => Promise<T>,
    errorMensaje: string = 'Error en la operación'
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        logger.error('SafeExecute', errorMensaje, error);
        return null;
    }
}
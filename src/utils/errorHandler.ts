import {
    ChatInputCommandInteraction,
    Message,
    MessageFlags,
    EmbedBuilder
} from 'discord.js';
import { logger } from './logger.js';
import { sendMessage, createErrorEmbed, createWarningEmbed } from './messageUtils.js';

/**
 * *Tipos de errores manejados por el sistema.
 * *Cada tipo determina el nivel de logging y el mensaje al usuario.
 * 
 * @enum {string}
 */

export enum ErrorType {
    /* Error relacionado con APIs externas (Discord, Tenor, etc.) */
    API_ERROR = 'API_ERROR',
    /* Error de permisos insuficientes */
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    /* Error de validación de datos de entrada */
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    /* Error por límite de tasa excedido */
    RATE_LIMIT = 'RATE_LIMIT',
    /* Recurso no encontrado */
    NOT_FOUND = 'NOT_FOUND',
    /* Error no categorizado */
    UNKNOWN = 'UNKNOWN'
}

/**
 * *Error personalizado con tipo y mensaje para el usuario.
 * *Extiende la clase Error nativa con información adicional para el manejo contextual.
 * 
 * @class CommandError
 * @extends Error
 * 
 * @example
 * ```typescript
 * throw new CommandError(
 *   ErrorType.PERMISSION_ERROR,
 *   'Usuario sin permisos',
 *   '❌ No tienes permiso para usar este comando.'
 * );
 * ```
 */
export class CommandError extends Error {
    /**
     * *Crea un nuevo CommandError.
     * 
     * @param {ErrorType} type - Tipo de error
     * @param {string} message - Mensaje técnico para logs
     * @param {string} [userMessage] - Mensaje amigable para mostrar al usuario
     */

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

/**
 * *Maneja errores de comandos de forma centralizada.
 * *Registra el error, determina el mensaje apropiado y responde al usuario.
 * 
 * @async
 * @param {unknown} error - Error capturado
 * @param {ChatInputCommandInteraction | Message} context - Contexto de ejecución del comando
 * @param {string} commandName - Nombre del comando que generó el error
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * try {
 *   await executeCommand();
 * } catch (error) {
 *   await handleCommandError(error, interaction, 'ping');
 * }
 * ```
 */

export async function handleCommandError(
    error: unknown,
    context: ChatInputCommandInteraction | Message,
    commandName: string
): Promise<void> {
    logger.error(commandName, 'Error en comando', error)

    let errorTitle = '❌ Error';
    let errorDescription = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    let errorColor = 0xFF0000;
    let shouldLog = true;

    if (error instanceof CommandError) {
        errorDescription = error.userMessage || errorDescription;

        switch (error.type) {
            case ErrorType.API_ERROR:
                logger.error(commandName, `API ERROR: ${error.message}`);
                errorTitle = '🔌 Error de API';
                errorColor = 0xFF4444;
                shouldLog = false;
                break;

            case ErrorType.VALIDATION_ERROR:
                logger.warn(commandName, `Validación fallida: ${error.message}`);
                errorTitle = '⚠️ Datos Inválidos';
                errorColor = 0xFFA500;
                shouldLog = false;
                break

            case ErrorType.PERMISSION_ERROR:
                logger.warn(commandName, `Permiso denegado: ${error.message}`);
                errorTitle = '🔒 Permiso Denegado';
                errorColor = 0xFF6B6B;
                shouldLog = false;
                break;

            case ErrorType.RATE_LIMIT:
                logger.warn(commandName, 'Rate limit alcanzado')
                errorTitle = '⏱️ Demasiado Rápido';
                errorDescription = 'Estás usando los comandos muy rápido. Espera un momento.';
                errorColor = 0xFFAA00;
                break;

            case ErrorType.NOT_FOUND:
                logger.warn(commandName, `Recurso no encontrado: ${error.message}`);
                errorTitle = '🔍 No Encontrado';
                errorColor = 0xFF9800;
                shouldLog = false;
                break;

            case ErrorType.UNKNOWN:
                logger.error(commandName, `Error desconocido: ${error.message}`);
                errorTitle = '❓ Error Desconocido';
                break;
        }
    } else if (error instanceof Error) {
        logger.error(commandName, 'Error no manejado', error)
    }

    try {
        const errorEmbed = new EmbedBuilder()
            .setTitle(errorTitle)
            .setDescription(errorDescription)
            .setColor(errorColor)
            .setFooter({ text: `Comando: ${commandName}` })
            .setTimestamp();

        await sendMessage(context, {
            embed: errorEmbed,
            ephemeral: true
        });
    } catch (replyError) {
        logger.error(commandName, 'No se pudo responder al usuario', replyError)
    }
}

/**
 * *Ejecuta una función de forma segura, capturando cualquier error.
 * *Útil para operaciones que no deben interrumpir el flujo principal.
 * 
 * @async
 * @template T - Tipo de retorno de la función
 * @param {() => Promise<T>} fn - Función asíncrona a ejecutar
 * @param {string} [errorMensaje='Error en la operación'] - Mensaje de error para logging
 * @returns {Promise<T | null>} Resultado de la función o null si falla
 * 
 * @example
 * ```typescript
 * const data = await safeExecute(
 *   async () => await fetchData(),
 *   'Error obteniendo datos'
 * );
 * 
 * if (data) {
 *   /// usar data
 * }
 * ```
 */

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
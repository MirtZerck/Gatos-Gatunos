import { Collection } from "discord.js";
import { logger } from "../utils/logger.js";

/**
 * *Información de una solicitud de interacción pendiente.
 */

export interface PendingRequest {
    /* ID del usuario que envió la solicitud */
    authorId: string;
    /* ID del usuario objetivo */
    targetId: string;
    /* Tipo de acción (hug, kiss, pat, etc.) */
    action: string;
    /* Timestamp de cuándo expira la solicitud */
    expiresAt: number;
    /* ID del mensaje de la solicitud */
    messageId: string;
    /* ID de la interacción original */
    interactionId: string;
}

/**
 * *Gestor de solicitudes de interacción entre usuarios.
 * *Maneja solicitudes pendientes, previene spam y gestiona timeouts.
 * 
 * @class RequestManager
 * @example
 * ```typescript
 * const requestManager = new RequestManager();
 * 
 * /// Verificar si un usuario tiene solicitud pendiente
 * if (requestManager.hasPendingRequest(userId)) {
 *   await interaction.reply('Ya tienes una solicitud pendiente');
 *   return;
 * }
 * 
 * /// Crear solicitud
 * requestManager.createRequest(authorId, targetId, 'hug', messageId, interactionId);
 * ```
 */

export class RequestManager {
    /**
     * *Mapa de solicitudes pendientes.
     * *Estructura: authorId -> PendingRequest
     */

    private pendingRequests: Collection<string, PendingRequest>;

    /* Intervalo para limpiar solicitudes expiradas. */

    private cleanupInterval: NodeJS.Timeout;

    /* Duración por defecto de una solicitud (10 minutos en ms). */

    private readonly DEFAULT_REQUEST_DURATION = 10 * 60 * 1000; // 10 minutos

    /* Intervalo de limpieza en milisegundos (1 minuto). */

    private readonly CLEANUP_INTERVAL = 60000;

    /**
     * *Crea una nueva instancia del gestor de solicitudes.
     * *Inicia automáticamente la limpieza periódica de solicitudes expiradas.
     */

    constructor() {
        this.pendingRequests = new Collection();

        // Iniciar limpieza automática cada minuto

        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.CLEANUP_INTERVAL);

        logger.debug('RequestManager', 'Inicializado con limpieza automática');
    }

    /**
     * *Crea una nueva solicitud de interacción.
     * 
     * @param {string} authorId - ID del usuario que envía la solicitud
     * @param {string} targetId - ID del usuario objetivo
     * @param {string} action - Tipo de acción (hug, kiss, pat, etc.)
     * @param {string} messageId - ID del mensaje de la solicitud
     * @param {string} interactionId - ID de la interacción original
     * @param {number} [duration] - Duración personalizada en ms (default: 10 min)
     * @returns {PendingRequest} La solicitud creada
     * 
     * @example
     * ```typescript
     * const request = requestManager.createRequest(
     *   interaction.user.id,
     *   target.id,
     *   'hug',
     *   message.id,
     *   interaction.id
     * );
     * ```
     */

    createRequest(
        authorId: string,
        targetId: string,
        action: string,
        messageId: string,
        interactionId: string,
        duration?: number
    ): PendingRequest {
        const now = Date.now();
        const requestDuration = duration || this.DEFAULT_REQUEST_DURATION;
        const expiresAt = now + requestDuration;

        const request: PendingRequest = {
            authorId,
            targetId,
            action,
            expiresAt,
            messageId,
            interactionId
        };

        this.pendingRequests.set(authorId, request);

        logger.debug(
            'RequestManager',
            `Solicitud creada: ${authorId} → ${targetId} (${action}) - expira en ${requestDuration}ms`
        );

        return request;
    }

    /**
     * *Verifica si un usuario tiene una solicitud pendiente.
     * 
     * @param {string} authorId - ID del usuario a verificar
     * @returns {boolean} true si tiene solicitud pendiente
     * 
     * @example
     * ```typescript
     * if (requestManager.hasPendingRequest(interaction.user.id)) {
     *   await interaction.reply('Ya tienes una solicitud pendiente');
     *   return;
     * }
     * ```
     */

    hasPendingRequest(authorId: string): boolean {
        const request = this.pendingRequests.get(authorId);
        if (!request) return false;

        const now = Date.now();
        if (request.expiresAt <= now) {
            // La solicitud expiró, eliminarla
            this.pendingRequests.delete(authorId);
            return false;
        }

        return true;
    }

    /**
     * *Obtiene una solicitud pendiente de un usuario.
     * 
     * @param {string} authorId - ID del usuario
     * @returns {PendingRequest | null} La solicitud o null si no existe
     * 
     * @example
     * ```typescript
     * const request = requestManager.getPendingRequest(userId);
     * if (request) {
     *   console.log(`Solicitud pendiente: ${request.action}`);
     * }
     * ```
     */

    getPendingRequest(authorId: string): PendingRequest | null {
        const request = this.pendingRequests.get(authorId);
        if (!request) return null;

        const now = Date.now();
        if (request.expiresAt <= now) {
            this.pendingRequests.delete(authorId);
            return null;
        }

        return request;
    }

    /**
     * *Busca una solicitud por el ID del mensaje.
     * *Útil para manejar respuestas de botones.
     * 
     * @param {string} messageId - ID del mensaje de la solicitud
     * @returns {PendingRequest | null} La solicitud o null si no existe
     * 
     * @example
     * ```typescript
     * const request = requestManager.findRequestByMessage(buttonInteraction.message.id);
     * if (request) {
     *   // Procesar respuesta
     * }
     * ```
     */

    findRequestByMessage(messageId: string): PendingRequest | null {
        for (const [, request] of this.pendingRequests) {
            if (request.messageId === messageId) {
                const now = Date.now();
                if (request.expiresAt <= now) {
                    this.pendingRequests.delete(request.authorId);
                    return null;
                }
                return request;
            }
        }
        return null;
    }

    /**
     * *Resuelve (elimina) una solicitud pendiente.
     * *Se debe llamar cuando se acepta o rechaza una solicitud.
     * 
     * @param {string} authorId - ID del usuario autor de la solicitud
     * @returns {boolean} true si se eliminó, false si no existía
     * 
     * @example
     * ```typescript
     * /// Al aceptar o rechazar
     * requestManager.resolveRequest(request.authorId);
     * ```
     */

    resolveRequest(authorId: string): boolean {
        const deleted = this.pendingRequests.delete(authorId);
        if (deleted) {
            logger.debug('RequestManager', `Solicitud resuelta: ${authorId}`);
        }
        return deleted;
    }

    /**
     * *Obtiene el tiempo restante de una solicitud en milisegundos.
     * 
     * @param {string} authorId - ID del usuario
     * @returns {number} Milisegundos restantes (0 si no existe o expiró)
     * 
     * @example
     * ```typescript
     * const remaining = requestManager.getRemainingTime(userId);
     * const minutes = Math.ceil(remaining / 60000);
     * console.log(`Expira en ${minutes} minutos`);
     * ```
     */

    getRemainingTime(authorId: string): number {
        const request = this.pendingRequests.get(authorId);
        if (!request) return 0;

        const now = Date.now();
        const remaining = request.expiresAt - now;

        if (remaining <= 0) {
            this.pendingRequests.delete(authorId);
            return 0;
        }

        return remaining;
    }

    /**
     * *Limpia solicitudes expiradas automáticamente.
     * *Este método se ejecuta periódicamente por el intervalo de limpieza.
     * 
     * @private
     * @returns {number} Cantidad de solicitudes eliminadas
     */

    private cleanup(): number {
        const now = Date.now();
        let cleanedCount = 0;

        const expiredKeys: string[] = [];

        for (const [authorId, request] of this.pendingRequests) {
            if (request.expiresAt <= now) {
                expiredKeys.push(authorId);
            }
        }

        for (const key of expiredKeys) {
            this.pendingRequests.delete(key);
            cleanedCount++;
        }

        if (cleanedCount > 0) {
            logger.debug(
                'RequestManager',
                `Limpieza automática: ${cleanedCount} solicitudes expiradas eliminadas`
            );
        }

        return cleanedCount;
    }

    /**
     * *Limpia todas las solicitudes del sistema.
     * 
     * @returns {number} Cantidad de solicitudes eliminadas
     * 
     * @example
     * ```typescript
     * const cleared = requestManager.clearAllRequests();
     * console.log(`${cleared} solicitudes limpiadas`);
     * ```
     */

    clearAllRequests(): number {
        const count = this.pendingRequests.size;
        this.pendingRequests.clear();

        logger.info('RequestManager', `Todas las solicitudes limpiadas: ${count}`);
        return count;
    }

    /**
     * *Obtiene estadísticas del sistema de solicitudes.
     * 
     * @returns {{
     *   totalRequests: number,
     *   byAction: Record<string, number>
     * }} Estadísticas de solicitudes
     * 
     * @example
     * ```typescript
     * const stats = requestManager.getStats();
     * console.log(`Solicitudes activas: ${stats.totalRequests}`);
     * ```
     */

    getStats(): {
        totalRequests: number;
        byAction: Record<string, number>;
    } {
        const byAction: Record<string, number> = {};

        for (const [, request] of this.pendingRequests) {
            if (!byAction[request.action]) {
                byAction[request.action] = 0;
            }
            byAction[request.action]++;
        }

        return {
            totalRequests: this.pendingRequests.size,
            byAction
        };
    }

    /**
     * *Detiene el intervalo de limpieza automática.
     * *Debe llamarse al cerrar el bot para evitar memory leaks.
     * 
     * @example
     * ```typescript
     * process.on('SIGINT', () => {
     *   requestManager.destroy();
     *   process.exit(0);
     * });
     * ```
     */

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.clearAllRequests();
        logger.info('RequestManager', 'Destruido y solicitudes limpiadas');
    }
}
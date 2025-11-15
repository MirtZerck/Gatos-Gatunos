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
 * *Permite múltiples solicitudes por autor siempre que sean con objetivos diferentes.
 * 
 * @class RequestManager
 * @example
 * ```typescript
 * const requestManager = new RequestManager();
 * 
 * // ✅ Crear solicitud con Michi
 * requestManager.createRequest(userId, 'michi123', 'hug', msgId, intId);
 * 
 * // ✅ Crear otra solicitud con Carlos (permitido)
 * requestManager.createRequest(userId, 'carlos456', 'kiss', msgId2, intId2);
 * 
 * // ❌ Crear otra con Michi (rechazado - ya existe)
 * if (requestManager.hasPendingRequestWith(userId, 'michi123')) {
 *   await interaction.editReply('Ya tienes una solicitud pendiente con Michi');
 * }
 * ```
 */
export class RequestManager {
    /**
     * *Mapa de solicitudes pendientes.
     * *Estructura: authorId -> Map<targetId, PendingRequest>
     * *Esto permite múltiples solicitudes por autor con diferentes objetivos
     */
    private pendingRequests: Collection<string, Map<string, PendingRequest>>;

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
     * *Permite múltiples solicitudes por autor siempre que sean con objetivos diferentes.
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

        // ✅ Obtener o crear el mapa de solicitudes del autor
        if (!this.pendingRequests.has(authorId)) {
            this.pendingRequests.set(authorId, new Map());
        }

        // ✅ Agregar la solicitud indexada por targetId
        this.pendingRequests.get(authorId)!.set(targetId, request);

        logger.debug(
            'RequestManager',
            `Solicitud creada: ${authorId} → ${targetId} (${action}) - expira en ${requestDuration}ms`
        );

        return request;
    }

    /**
     * *Verifica si un autor tiene UNA solicitud pendiente específica con un objetivo.
     * 
     * @param {string} authorId - ID del usuario autor
     * @param {string} targetId - ID del usuario objetivo
     * @returns {boolean} true si tiene solicitud pendiente con ese objetivo específico
     * 
     * @example
     * ```typescript
     * // Verificar si ya hay solicitud con Michi
     * if (requestManager.hasPendingRequestWith(userId, michiId)) {
     *   await interaction.editReply('Ya tienes una solicitud pendiente con Michi');
     *   return;
     * }
     * 
     * // ✅ Si no tiene, crear nueva solicitud
     * requestManager.createRequest(userId, michiId, 'hug', msgId, intId);
     * ```
     */
    hasPendingRequestWith(authorId: string, targetId: string): boolean {
        const authorRequests = this.pendingRequests.get(authorId);
        if (!authorRequests) return false;

        const request = authorRequests.get(targetId);
        if (!request) return false;

        const now = Date.now();
        if (request.expiresAt <= now) {
            // La solicitud expiró, eliminarla
            authorRequests.delete(targetId);
            if (authorRequests.size === 0) {
                this.pendingRequests.delete(authorId);
            }
            return false;
        }

        return true;
    }

    /**
     * *Verifica si un autor tiene ALGUNA solicitud pendiente (con cualquier objetivo).
     * *Útil para mostrar lista de solicitudes activas.
     * 
     * @param {string} authorId - ID del usuario autor
     * @returns {boolean} true si tiene al menos una solicitud pendiente
     * 
     * @example
     * ```typescript
     * if (requestManager.hasPendingRequest(userId)) {
     *   const requests = requestManager.getAllPendingRequestsByAuthor(userId);
     *   // Mostrar lista de solicitudes activas
     * }
     * ```
     */
    hasPendingRequest(authorId: string): boolean {
        const authorRequests = this.pendingRequests.get(authorId);
        if (!authorRequests || authorRequests.size === 0) return false;

        // Verificar que al menos una solicitud no haya expirado
        const now = Date.now();
        for (const [targetId, request] of authorRequests) {
            if (request.expiresAt > now) {
                return true;
            } else {
                // Limpiar expiradas mientras verificamos
                authorRequests.delete(targetId);
            }
        }

        // Si no quedan solicitudes válidas, limpiar
        if (authorRequests.size === 0) {
            this.pendingRequests.delete(authorId);
        }

        return false;
    }

    /**
     * *Obtiene una solicitud pendiente específica entre un autor y un objetivo.
     * 
     * @param {string} authorId - ID del usuario autor
     * @param {string} targetId - ID del usuario objetivo
     * @returns {PendingRequest | null} La solicitud o null si no existe
     * 
     * @example
     * ```typescript
     * const request = requestManager.getPendingRequestWith(userId, targetId);
     * if (request) {
     *   console.log(`Solicitud de ${request.action} - expira en ${request.expiresAt}`);
     * }
     * ```
     */
    getPendingRequestWith(authorId: string, targetId: string): PendingRequest | null {
        const authorRequests = this.pendingRequests.get(authorId);
        if (!authorRequests) return null;

        const request = authorRequests.get(targetId);
        if (!request) return null;

        const now = Date.now();
        if (request.expiresAt <= now) {
            authorRequests.delete(targetId);
            if (authorRequests.size === 0) {
                this.pendingRequests.delete(authorId);
            }
            return null;
        }

        return request;
    }

    /**
     * *Obtiene TODAS las solicitudes pendientes de un autor.
     * 
     * @param {string} authorId - ID del usuario autor
     * @returns {PendingRequest[]} Array de solicitudes pendientes (puede estar vacío)
     * 
     * @example
     * ```typescript
     * const requests = requestManager.getAllPendingRequestsByAuthor(userId);
     * if (requests.length > 0) {
     *   const list = requests.map(r => `• ${r.action} con <@${r.targetId}>`).join('\n');
     *   await interaction.editReply(`Tienes ${requests.length} solicitudes pendientes:\n${list}`);
     * }
     * ```
     */
    getAllPendingRequestsByAuthor(authorId: string): PendingRequest[] {
        const authorRequests = this.pendingRequests.get(authorId);
        if (!authorRequests) return [];

        const now = Date.now();
        const validRequests: PendingRequest[] = [];

        for (const [targetId, request] of authorRequests) {
            if (request.expiresAt > now) {
                validRequests.push(request);
            } else {
                // Limpiar expiradas
                authorRequests.delete(targetId);
            }
        }

        // Limpiar si no quedan solicitudes
        if (authorRequests.size === 0) {
            this.pendingRequests.delete(authorId);
        }

        return validRequests;
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
     *   // Procesar respuesta del botón
     * }
     * ```
     */
    findRequestByMessage(messageId: string): PendingRequest | null {
        const now = Date.now();

        for (const [authorId, authorRequests] of this.pendingRequests) {
            for (const [targetId, request] of authorRequests) {
                if (request.messageId === messageId) {
                    if (request.expiresAt <= now) {
                        // Expiró, limpiar
                        authorRequests.delete(targetId);
                        if (authorRequests.size === 0) {
                            this.pendingRequests.delete(authorId);
                        }
                        return null;
                    }
                    return request;
                }
            }
        }
        return null;
    }

    /**
     * *Resuelve (elimina) una solicitud pendiente específica.
     * *Se debe llamar cuando se acepta o rechaza una solicitud.
     * 
     * @param {string} authorId - ID del usuario autor de la solicitud
     * @param {string} targetId - ID del usuario objetivo
     * @returns {boolean} true si se eliminó, false si no existía
     * 
     * @example
     * ```typescript
     * // Al aceptar o rechazar
     * requestManager.resolveRequestWith(request.authorId, request.targetId);
     * ```
     */
    resolveRequestWith(authorId: string, targetId: string): boolean {
        const authorRequests = this.pendingRequests.get(authorId);
        if (!authorRequests) return false;

        const deleted = authorRequests.delete(targetId);

        if (deleted) {
            logger.debug('RequestManager', `Solicitud resuelta: ${authorId} → ${targetId}`);

            // Si no quedan solicitudes para este autor, limpiar
            if (authorRequests.size === 0) {
                this.pendingRequests.delete(authorId);
            }
        }

        return deleted;
    }

    /**
     * *Resuelve (elimina) TODAS las solicitudes de un autor.
     * *Útil para cuando un usuario se desconecta o quiere cancelar todo.
     * 
     * @param {string} authorId - ID del usuario autor
     * @returns {number} Cantidad de solicitudes eliminadas
     * 
     * @example
     * ```typescript
     * const cleared = requestManager.resolveAllRequestsByAuthor(userId);
     * console.log(`${cleared} solicitudes canceladas`);
     * ```
     */
    resolveAllRequestsByAuthor(authorId: string): number {
        const authorRequests = this.pendingRequests.get(authorId);
        if (!authorRequests) return 0;

        const count = authorRequests.size;
        this.pendingRequests.delete(authorId);

        logger.debug('RequestManager', `Todas las solicitudes de ${authorId} resueltas: ${count}`);
        return count;
    }

    /**
     * *Obtiene el tiempo restante de una solicitud específica en milisegundos.
     * 
     * @param {string} authorId - ID del usuario autor
     * @param {string} targetId - ID del usuario objetivo
     * @returns {number} Milisegundos restantes (0 si no existe o expiró)
     * 
     * @example
     * ```typescript
     * const remaining = requestManager.getRemainingTimeWith(userId, targetId);
     * const minutes = Math.ceil(remaining / 60000);
     * console.log(`Expira en ${minutes} minutos`);
     * ```
     */
    getRemainingTimeWith(authorId: string, targetId: string): number {
        const request = this.getPendingRequestWith(authorId, targetId);
        if (!request) return 0;

        const now = Date.now();
        const remaining = request.expiresAt - now;

        if (remaining <= 0) {
            const authorRequests = this.pendingRequests.get(authorId);
            if (authorRequests) {
                authorRequests.delete(targetId);
                if (authorRequests.size === 0) {
                    this.pendingRequests.delete(authorId);
                }
            }
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

        for (const [authorId, authorRequests] of this.pendingRequests) {
            const expiredTargets: string[] = [];

            for (const [targetId, request] of authorRequests) {
                if (request.expiresAt <= now) {
                    expiredTargets.push(targetId);
                }
            }

            for (const targetId of expiredTargets) {
                authorRequests.delete(targetId);
                cleanedCount++;
            }

            // Si no quedan solicitudes para este autor, limpiar
            if (authorRequests.size === 0) {
                this.pendingRequests.delete(authorId);
            }
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
        let count = 0;
        for (const [, authorRequests] of this.pendingRequests) {
            count += authorRequests.size;
        }

        this.pendingRequests.clear();

        logger.info('RequestManager', `Todas las solicitudes limpiadas: ${count}`);
        return count;
    }

    /**
     * *Obtiene estadísticas del sistema de solicitudes.
     * 
     * @returns {{
     *   totalRequests: number,
     *   totalAuthors: number,
     *   byAction: Record<string, number>,
     *   averageRequestsPerAuthor: number
     * }} Estadísticas de solicitudes
     * 
     * @example
     * ```typescript
     * const stats = requestManager.getStats();
     * console.log(`Solicitudes activas: ${stats.totalRequests}`);
     * console.log(`Usuarios con solicitudes: ${stats.totalAuthors}`);
     * console.log(`Promedio por usuario: ${stats.averageRequestsPerAuthor.toFixed(2)}`);
     * ```
     */
    getStats(): {
        totalRequests: number;
        totalAuthors: number;
        byAction: Record<string, number>;
        averageRequestsPerAuthor: number;
    } {
        let totalRequests = 0;
        const byAction: Record<string, number> = {};

        for (const [, authorRequests] of this.pendingRequests) {
            for (const [, request] of authorRequests) {
                totalRequests++;

                if (!byAction[request.action]) {
                    byAction[request.action] = 0;
                }
                byAction[request.action]++;
            }
        }

        const totalAuthors = this.pendingRequests.size;
        const averageRequestsPerAuthor = totalAuthors > 0 ? totalRequests / totalAuthors : 0;

        return {
            totalRequests,
            totalAuthors,
            byAction,
            averageRequestsPerAuthor
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
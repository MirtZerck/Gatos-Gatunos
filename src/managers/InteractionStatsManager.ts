import { FirebaseManager } from './FirebaseManager.js';
import { logger } from '../utils/logger.js';

/**
 * Tipos de interacciones que se rastrean
 */
export type TrackedInteractionType = 
    // Interact command - íntimas/afectivas
    | 'hug' | 'kiss' | 'pat' | 'cuddle'
    // Act command - colaborativas/positivas
    | 'dance' | 'sing' | 'highfive'
    // Act command - amistosas
    | 'wave' | 'bow' | 'cheer' | 'clap';

/**
 * Información de estadísticas formateadas para mostrar
 */
export interface FormattedStats {
    total: number;
    topInteractions: Array<{ emoji: string; name: string; count: number }>;
    lastInteraction: string;
    relationshipDays: number;
}

/**
 * Gestor de estadísticas de interacciones entre usuarios.
 * Decide qué interacciones contar y proporciona métodos para consultar stats.
 * 
 * @class InteractionStatsManager
 * 
 * @example
 * ```typescript
 * const statsManager = new InteractionStatsManager(firebaseManager);
 * 
 * // Verificar si se debe trackear
 * if (statsManager.shouldTrack('hug')) {
 *   await statsManager.recordInteraction(user1, user2, 'hug');
 * }
 * 
 * // Obtener estadísticas formateadas
 * const stats = await statsManager.getFormattedStats(user1, user2);
 * ```
 */
export class InteractionStatsManager {
    private firebaseManager: FirebaseManager;

    /**
     * Interacciones que se rastrean (positivas/significativas)
     */
    private readonly TRACKED_INTERACTIONS: Set<TrackedInteractionType> = new Set([
        // Interact - íntimas/afectivas (todas las que requieren solicitud)
        'hug', 'kiss', 'pat', 'cuddle',
        
        // Act - colaborativas/positivas (las que requieren solicitud con target)
        'dance', 'sing', 'highfive',
        
        // Act - amistosas (no requieren solicitud pero son positivas)
        'wave', 'bow', 'cheer', 'clap'
    ]);

    /**
     * Mapeo de tipos de interacción a emojis
     */
    private readonly INTERACTION_EMOJIS: Record<TrackedInteractionType, string> = {
        // Interact
        hug: '🤗',
        kiss: '😘',
        pat: '😊',
        cuddle: '🥰',
        // Act
        dance: '💃',
        sing: '🎤',
        highfive: '✋',
        wave: '👋',
        bow: '🙇',
        cheer: '🎉',
        clap: '👏'
    };

    /**
     * Mapeo de tipos de interacción a nombres legibles
     */
    private readonly INTERACTION_NAMES: Record<TrackedInteractionType, string> = {
        // Interact
        hug: 'abrazos',
        kiss: 'besos',
        pat: 'caricias',
        cuddle: 'acurrucadas',
        // Act
        dance: 'bailes',
        sing: 'cantos',
        highfive: 'choques de manos',
        wave: 'saludos',
        bow: 'reverencias',
        cheer: 'ánimos',
        clap: 'aplausos'
    };

    constructor(firebaseManager: FirebaseManager) {
        this.firebaseManager = firebaseManager;
    }

    /**
     * Verifica si un tipo de interacción debe ser rastreada.
     * 
     * @param {string} interactionType - Tipo de interacción
     * @returns {boolean} true si debe rastrearse
     * 
     * @example
     * ```typescript
     * statsManager.shouldTrack('hug')  // true
     * statsManager.shouldTrack('slap') // false
     * ```
     */
    shouldTrack(interactionType: string): interactionType is TrackedInteractionType {
        return this.TRACKED_INTERACTIONS.has(interactionType as TrackedInteractionType);
    }

    /**
     * Registra una interacción entre dos usuarios si debe ser rastreada.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @param {string} interactionType - Tipo de interacción
     * @returns {Promise<boolean>} true si se registró, false si no se debe trackear
     * 
     * @example
     * ```typescript
     * await statsManager.recordInteraction('user123', 'user456', 'hug');
     * ```
     */
    async recordInteraction(
        userId1: string,
        userId2: string,
        interactionType: string
    ): Promise<boolean> {
        if (!this.shouldTrack(interactionType)) {
            logger.debug(
                'InteractionStats',
                `No se trackea la interacción: ${interactionType}`
            );
            return false;
        }

        try {
            await this.firebaseManager.recordInteraction(userId1, userId2, interactionType);
            logger.debug(
                'InteractionStats',
                `✅ Interacción registrada: ${userId1} ↔ ${userId2} (${interactionType})`
            );
            return true;
        } catch (error) {
            logger.error(
                'InteractionStats',
                `Error registrando interacción ${interactionType}`,
                error
            );
            return false;
        }
    }

    /**
     * Obtiene estadísticas formateadas entre dos usuarios.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {Promise<FormattedStats | null>} Estadísticas formateadas o null
     * 
     * @example
     * ```typescript
     * const stats = await statsManager.getFormattedStats('user123', 'user456');
     * if (stats) {
     *   console.log(`Total: ${stats.total} interacciones`);
     * }
     * ```
     */
    async getFormattedStats(
        userId1: string,
        userId2: string
    ): Promise<FormattedStats | null> {
        try {
            const rawStats = await this.firebaseManager.getInteractionStats(userId1, userId2);

            if (!rawStats) {
                return null;
            }

            const topInteractions = await this.firebaseManager.getTopInteractions(
                userId1,
                userId2,
                5
            );

            // Formatear top interacciones con emojis y nombres
            const formattedTop = topInteractions.map(({ type, count }) => ({
                emoji: this.INTERACTION_EMOJIS[type as TrackedInteractionType] || '❓',
                name: this.INTERACTION_NAMES[type as TrackedInteractionType] || type,
                count
            }));

            // Calcular días desde la primera interacción
            const daysSinceFirst = Math.floor(
                (Date.now() - rawStats.firstInteraction) / (1000 * 60 * 60 * 24)
            );

            // Formatear timestamp de última interacción
            const lastInteractionDate = new Date(rawStats.lastInteraction);
            const lastInteractionStr = `<t:${Math.floor(rawStats.lastInteraction / 1000)}:R>`;

            return {
                total: rawStats.total,
                topInteractions: formattedTop,
                lastInteraction: lastInteractionStr,
                relationshipDays: daysSinceFirst
            };
        } catch (error) {
            logger.error('InteractionStats', 'Error obteniendo estadísticas', error);
            return null;
        }
    }

    /**
     * Genera una descripción textual de las estadísticas.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @param {string} user1Name - Nombre del primer usuario
     * @param {string} user2Name - Nombre del segundo usuario
     * @returns {Promise<string | null>} Descripción formateada o null
     * 
     * @example
     * ```typescript
     * const description = await statsManager.getStatsDescription(
     *   'user123', 'user456', 'Alice', 'Bob'
     * );
     * ```
     */
    async getStatsDescription(
        userId1: string,
        userId2: string,
        user1Name: string,
        user2Name: string
    ): Promise<string | null> {
        const stats = await this.getFormattedStats(userId1, userId2);

        if (!stats) {
            return null;
        }

        let description = `**${user1Name}** y **${user2Name}** han interactuado **${stats.total}** ${
            stats.total === 1 ? 'vez' : 'veces'
        }`;

        if (stats.relationshipDays > 0) {
            description += ` en los últimos **${stats.relationshipDays}** ${
                stats.relationshipDays === 1 ? 'día' : 'días'
            }`;
        }

        description += '.\n\n';

        // Top interacciones
        if (stats.topInteractions.length > 0) {
            description += '**Top interacciones:**\n';
            stats.topInteractions.forEach(({ emoji, name, count }) => {
                description += `${emoji} ${name}: **${count}**\n`;
            });
        }

        description += `\n*Última interacción: ${stats.lastInteraction}*`;

        return description;
    }

    /**
     * Genera una línea de estadísticas breve para mostrar en respuestas.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {Promise<string | null>} Línea breve o null
     * 
     * @example
     * ```typescript
     * const brief = await statsManager.getBriefStats('user123', 'user456');
     * // Retorna: "Total interacciones: 42 🎉"
     * ```
     */
    async getBriefStats(userId1: string, userId2: string): Promise<string | null> {
        const stats = await this.getFormattedStats(userId1, userId2);

        if (!stats) {
            return null;
        }

        let brief = `Total interacciones: **${stats.total}**`;

        if (stats.topInteractions.length > 0) {
            const topEmoji = stats.topInteractions[0].emoji;
            brief += ` ${topEmoji}`;
        }

        return brief;
    }

    /**
     * Limpia las estadísticas entre dos usuarios.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {Promise<boolean>} true si se eliminó
     */
    async clearStats(userId1: string, userId2: string): Promise<boolean> {
        return await this.firebaseManager.clearInteractionStats(userId1, userId2);
    }

    /**
     * Obtiene una lista de todas las interacciones rastreadas.
     * Útil para documentación o comandos de ayuda.
     * 
     * @returns {Array<{type: string, emoji: string, name: string}>}
     */
    getTrackedInteractionsList(): Array<{
        type: string;
        emoji: string;
        name: string;
    }> {
        return Array.from(this.TRACKED_INTERACTIONS).map(type => ({
            type,
            emoji: this.INTERACTION_EMOJIS[type],
            name: this.INTERACTION_NAMES[type]
        }));
    }
}
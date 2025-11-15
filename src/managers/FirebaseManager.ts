import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getDatabase, Database, ref, get, set, update, increment } from 'firebase/database';
import { logger } from '../utils/logger.js';

/**
 * Configuración de Firebase desde variables de entorno
 */
interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

/**
 * Estadísticas de interacciones entre dos usuarios
 */
export interface InteractionStats {
    /** Total de todas las interacciones */
    total: number;
    /** Desglose por tipo de interacción */
    byType: Record<string, number>;
    /** Timestamp de la última interacción */
    lastInteraction: number;
    /** Timestamp de la primera interacción */
    firstInteraction: number;
}

/**
 * Gestor de conexión y operaciones con Firebase Realtime Database.
 * Maneja estadísticas de interacciones entre usuarios.
 * 
 * @class FirebaseManager
 * 
 * @example
 * ```typescript
 * const firebaseManager = new FirebaseManager(config);
 * await firebaseManager.initialize();
 * 
 * // Registrar interacción
 * await firebaseManager.recordInteraction('user1', 'user2', 'hug');
 * 
 * // Obtener estadísticas
 * const stats = await firebaseManager.getInteractionStats('user1', 'user2');
 * console.log(`Total interacciones: ${stats.total}`);
 * ```
 */
export class FirebaseManager {
    private app: FirebaseApp | null = null;
    private database: Database | null = null;
    private config: FirebaseConfig;
    private isInitialized: boolean = false;

    /**
     * Crea una nueva instancia del gestor de Firebase.
     * 
     * @param {FirebaseConfig} config - Configuración de Firebase
     */
    constructor(config: FirebaseConfig) {
        this.config = config;
    }

    /**
     * Inicializa la conexión con Firebase.
     * Debe llamarse antes de usar cualquier otra función.
     * 
     * @async
     * @throws {Error} Si la configuración es inválida o la conexión falla
     * @returns {Promise<void>}
     */
    async initialize(): Promise<void> {
        try {
            // Verificar si ya hay una app inicializada
            if (getApps().length > 0) {
                this.app = getApps()[0];
                logger.debug('FirebaseManager', 'Usando app de Firebase existente');
            } else {
                this.app = initializeApp(this.config);
                logger.info('FirebaseManager', 'Firebase app inicializada');
            }

            this.database = getDatabase(this.app);
            this.isInitialized = true;

            logger.info('FirebaseManager', '✅ Conexión con Firebase establecida');
        } catch (error) {
            logger.error('FirebaseManager', 'Error inicializando Firebase', error);
            throw new Error('No se pudo conectar con Firebase Realtime Database');
        }
    }

    /**
     * Verifica que Firebase esté inicializado.
     * 
     * @private
     * @throws {Error} Si Firebase no está inicializado
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.database) {
            throw new Error('FirebaseManager no está inicializado. Llama a initialize() primero.');
        }
    }

    /**
     * Genera una clave única y consistente para un par de usuarios.
     * Siempre retorna la misma clave sin importar el orden de los IDs.
     * 
     * @private
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {string} Clave única para el par de usuarios
     * 
     * @example
     * ```typescript
     * generatePairKey('123', '456') === generatePairKey('456', '123') // true
     * // Retorna: '123_456'
     * ```
     */
    private generatePairKey(userId1: string, userId2: string): string {
        // Ordenar IDs alfabéticamente para consistencia
        const [user1, user2] = [userId1, userId2].sort();
        return `${user1}_${user2}`;
    }

    /**
     * Registra una interacción entre dos usuarios.
     * Incrementa contadores y actualiza timestamps.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @param {string} interactionType - Tipo de interacción (hug, kiss, etc.)
     * @returns {Promise<void>}
     * 
     * @example
     * ```typescript
     * await firebaseManager.recordInteraction('user123', 'user456', 'hug');
     * ```
     */
    async recordInteraction(
        userId1: string,
        userId2: string,
        interactionType: string
    ): Promise<void> {
        this.ensureInitialized();

        try {
            const pairKey = this.generatePairKey(userId1, userId2);
            const pairRef = ref(this.database!, `interactions/${pairKey}`);

            // Verificar si ya existe el registro
            const snapshot = await get(pairRef);
            const now = Date.now();

            if (snapshot.exists()) {
                // Actualizar registro existente
                await update(pairRef, {
                    total: increment(1),
                    [`byType/${interactionType}`]: increment(1),
                    lastInteraction: now
                });
            } else {
                // Crear nuevo registro
                const newStats: InteractionStats = {
                    total: 1,
                    byType: { [interactionType]: 1 },
                    lastInteraction: now,
                    firstInteraction: now
                };
                await set(pairRef, newStats);
            }

            logger.debug(
                'FirebaseManager',
                `Interacción registrada: ${userId1} ↔ ${userId2} (${interactionType})`
            );
        } catch (error) {
            logger.error('FirebaseManager', 'Error registrando interacción', error);
            throw error;
        }
    }

    /**
     * Obtiene las estadísticas de interacciones entre dos usuarios.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {Promise<InteractionStats | null>} Estadísticas o null si no hay registro
     * 
     * @example
     * ```typescript
     * const stats = await firebaseManager.getInteractionStats('user123', 'user456');
     * if (stats) {
     *   console.log(`Total: ${stats.total}`);
     *   console.log(`Hugs: ${stats.byType.hug || 0}`);
     * }
     * ```
     */
    async getInteractionStats(
        userId1: string,
        userId2: string
    ): Promise<InteractionStats | null> {
        this.ensureInitialized();

        try {
            const pairKey = this.generatePairKey(userId1, userId2);
            const pairRef = ref(this.database!, `interactions/${pairKey}`);
            const snapshot = await get(pairRef);

            if (snapshot.exists()) {
                return snapshot.val() as InteractionStats;
            }

            return null;
        } catch (error) {
            logger.error('FirebaseManager', 'Error obteniendo estadísticas', error);
            return null;
        }
    }

    /**
     * Obtiene el top de interacciones más frecuentes entre dos usuarios.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @param {number} [limit=5] - Cantidad máxima de resultados
     * @returns {Promise<Array<{type: string, count: number}>>} Top de interacciones
     * 
     * @example
     * ```typescript
     * const top = await firebaseManager.getTopInteractions('user123', 'user456', 3);
     * // Retorna: [{ type: 'hug', count: 25 }, { type: 'kiss', count: 10 }, ...]
     * ```
     */
    async getTopInteractions(
        userId1: string,
        userId2: string,
        limit: number = 5
    ): Promise<Array<{ type: string; count: number }>> {
        const stats = await this.getInteractionStats(userId1, userId2);

        if (!stats || !stats.byType) {
            return [];
        }

        // Convertir a array y ordenar por cantidad
        const sorted = Object.entries(stats.byType)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return sorted;
    }

    /**
     * Elimina las estadísticas entre dos usuarios.
     * Útil para comandos de administración o reseteos.
     * 
     * @async
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {Promise<boolean>} true si se eliminó, false si no existía
     * 
     * @example
     * ```typescript
     * const deleted = await firebaseManager.clearInteractionStats('user123', 'user456');
     * ```
     */
    async clearInteractionStats(userId1: string, userId2: string): Promise<boolean> {
        this.ensureInitialized();

        try {
            const pairKey = this.generatePairKey(userId1, userId2);
            const pairRef = ref(this.database!, `interactions/${pairKey}`);
            const snapshot = await get(pairRef);

            if (snapshot.exists()) {
                await set(pairRef, null);
                logger.info(
                    'FirebaseManager',
                    `Estadísticas eliminadas: ${userId1} ↔ ${userId2}`
                );
                return true;
            }

            return false;
        } catch (error) {
            logger.error('FirebaseManager', 'Error eliminando estadísticas', error);
            return false;
        }
    }

    /**
     * Cierra la conexión con Firebase.
     * Debe llamarse al cerrar el bot.
     * 
     * @example
     * ```typescript
     * process.on('SIGINT', () => {
     *   firebaseManager.destroy();
     *   process.exit(0);
     * });
     * ```
     */
    destroy(): void {
        if (this.isInitialized) {
            // Firebase se cierra automáticamente al terminar el proceso
            this.isInitialized = false;
            logger.info('FirebaseManager', 'Conexión cerrada');
        }
    }
}
import admin from 'firebase-admin';
import { logger } from '../utils/logger.js';

/**
 * Configuración de Firebase Admin SDK
 */
interface FirebaseAdminConfig {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
}

/**
 * Estadísticas de interacciones entre dos usuarios
 */
export interface InteractionStats {
    total: number;
    byType: Record<string, number>;
    lastInteraction: number;
    firstInteraction: number;
}

/**
 * Gestor de conexión con Firebase usando Admin SDK.
 * Proporciona acceso completo sin restricciones de seguridad.
 * 
 * @class FirebaseAdminManager
 * 
 * @example
 * ```typescript
 * const adminConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK!);
 * const firebaseManager = new FirebaseAdminManager(adminConfig);
 * await firebaseManager.initialize();
 * ```
 */
export class FirebaseAdminManager {
    private app: admin.app.App | null = null;
    private database: admin.database.Database | null = null;
    private config: FirebaseAdminConfig;
    private isInitialized: boolean = false;

    constructor(config: FirebaseAdminConfig | string) {
        // Si recibe un string JSON, parsearlo
        if (typeof config === 'string') {
            this.config = JSON.parse(config);
        } else {
            this.config = config;
        }
    }

    /**
     * Inicializa la conexión con Firebase Admin SDK
     */
    async initialize(): Promise<void> {
        try {
            // Verificar si ya hay una app inicializada
            const apps = admin.apps || [];

            if (apps.length > 0) {
                this.app = apps[0] as admin.app.App;
                logger.debug('FirebaseAdminManager', 'Usando app Admin SDK existente');
            } else {
                this.app = admin.initializeApp({
                    credential: admin.credential.cert(this.config as admin.ServiceAccount),
                    databaseURL: `https://${this.config.project_id}-default-rtdb.firebaseio.com`
                });
                logger.info('FirebaseAdminManager', 'Firebase Admin SDK inicializado');
            }

            this.database = admin.database();
            this.isInitialized = true;

            logger.info('FirebaseAdminManager', '✅ Conexión con Firebase Admin establecida');
        } catch (error) {
            logger.error('FirebaseAdminManager', 'Error inicializando Firebase Admin', error);
            throw new Error('No se pudo conectar con Firebase Admin SDK');
        }
    }

    /**
     * Verifica que Firebase esté inicializado
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.database) {
            throw new Error('FirebaseAdminManager no está inicializado. Llama a initialize() primero.');
        }
    }

    /**
     * Genera una clave única para un par de usuarios
     */
    private generatePairKey(userId1: string, userId2: string): string {
        const [user1, user2] = [userId1, userId2].sort();
        return `${user1}_${user2}`;
    }

    /**
     * Registra una interacción entre dos usuarios
     */
    async recordInteraction(
        userId1: string,
        userId2: string,
        interactionType: string
    ): Promise<void> {
        this.ensureInitialized();

        try {
            const pairKey = this.generatePairKey(userId1, userId2);
            const pairRef = this.database!.ref(`interactions/${pairKey}`);

            const snapshot = await pairRef.get();
            const now = Date.now();

            if (snapshot.exists()) {
                const current = snapshot.val() as InteractionStats;
                await pairRef.update({
                    total: (current.total || 0) + 1,
                    [`byType/${interactionType}`]: ((current.byType?.[interactionType] || 0) + 1),
                    lastInteraction: now
                });
            } else {
                const newStats: InteractionStats = {
                    total: 1,
                    byType: { [interactionType]: 1 },
                    lastInteraction: now,
                    firstInteraction: now
                };
                await pairRef.set(newStats);
            }

            logger.debug(
                'FirebaseAdminManager',
                `Interacción registrada: ${userId1} ↔ ${userId2} (${interactionType})`
            );
        } catch (error) {
            logger.error('FirebaseAdminManager', 'Error registrando interacción', error);
            throw error;
        }
    }

    /**
     * Obtiene las estadísticas de interacciones entre dos usuarios
     */
    async getInteractionStats(
        userId1: string,
        userId2: string
    ): Promise<InteractionStats | null> {
        this.ensureInitialized();

        try {
            const pairKey = this.generatePairKey(userId1, userId2);
            const pairRef = this.database!.ref(`interactions/${pairKey}`);
            const snapshot = await pairRef.get();

            if (snapshot.exists()) {
                return snapshot.val() as InteractionStats;
            }

            return null;
        } catch (error) {
            logger.error('FirebaseAdminManager', 'Error obteniendo estadísticas', error);
            return null;
        }
    }

    /**
     * Obtiene el top de interacciones más frecuentes
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

        const sorted = Object.entries(stats.byType)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return sorted;
    }

    /**
     * Elimina las estadísticas entre dos usuarios
     */
    async clearInteractionStats(userId1: string, userId2: string): Promise<boolean> {
        this.ensureInitialized();

        try {
            const pairKey = this.generatePairKey(userId1, userId2);
            const pairRef = this.database!.ref(`interactions/${pairKey}`);
            const snapshot = await pairRef.get();

            if (snapshot.exists()) {
                await pairRef.remove();
                logger.info(
                    'FirebaseAdminManager',
                    `Estadísticas eliminadas: ${userId1} ↔ ${userId2}`
                );
                return true;
            }

            return false;
        } catch (error) {
            logger.error('FirebaseAdminManager', 'Error eliminando estadísticas', error);
            return false;
        }
    }

    /**
     * Obtiene una referencia a una ruta específica en la base de datos.
     * Método público para acceso controlado a Firebase Realtime Database.
     *
     * @param {string} path - Ruta en la base de datos
     * @returns {admin.database.Reference} Referencia a la ruta especificada
     * @throws {Error} Si Firebase no está inicializado
     *
     * @example
     * ```typescript
     * const ref = firebaseManager.getRef('servers/guild123/commands');
     * const snapshot = await ref.get();
     * ```
     */
    getRef(path: string): admin.database.Reference {
        this.ensureInitialized();
        return this.database!.ref(path);
    }

    /**
     * Cierra la conexión con Firebase.
     */
    destroy(): void {
        if (this.isInitialized) {
            this.isInitialized = false;
            logger.info('FirebaseAdminManager', 'Conexión cerrada');
        }
    }
}
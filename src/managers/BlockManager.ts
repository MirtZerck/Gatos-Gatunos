import { FirebaseAdminManager } from './FirebaseAdminManager.js';
import { logger } from '../utils/logger.js';

/**
 * Gestor de bloqueos de interacciones entre usuarios.
 * Permite a los usuarios bloquear a otros para prevenir interacciones no deseadas.
 *
 * @class BlockManager
 * @example
 * ```typescript
 * const blockManager = new BlockManager(firebaseManager);
 *
 * // Bloquear un usuario
 * await blockManager.blockUser('user123', 'user456');
 *
 * // Verificar si está bloqueado
 * const isBlocked = await blockManager.isBlocked('user123', 'user456');
 *
 * // Desbloquear
 * await blockManager.unblockUser('user123', 'user456');
 * ```
 */
export class BlockManager {
    private firebaseManager: FirebaseAdminManager;
    private readonly BLOCKS_PATH = 'blocks';

    /**
     * Crea una nueva instancia del gestor de bloqueos.
     *
     * @param {FirebaseAdminManager} firebaseManager - Instancia del gestor de Firebase
     */
    constructor(firebaseManager: FirebaseAdminManager) {
        this.firebaseManager = firebaseManager;
        logger.debug('BlockManager', 'Inicializado');
    }

    /**
     * Bloquea a un usuario para que no pueda interactuar.
     *
     * @param {string} userId - ID del usuario que bloquea
     * @param {string} blockedUserId - ID del usuario a bloquear
     * @returns {Promise<boolean>} true si se bloqueó exitosamente
     *
     * @example
     * ```typescript
     * const success = await blockManager.blockUser('123', '456');
     * if (success) {
     *   console.log('Usuario bloqueado');
     * }
     * ```
     */
    async blockUser(userId: string, blockedUserId: string): Promise<boolean> {
        try {
            const blockRef = this.firebaseManager.getRef(
                `${this.BLOCKS_PATH}/${userId}/${blockedUserId}`
            );

            await blockRef.set({
                blockedAt: Date.now(),
                blockedBy: userId
            });

            logger.info(
                'BlockManager',
                `Usuario ${userId} bloqueó a ${blockedUserId}`
            );

            return true;
        } catch (error) {
            logger.error('BlockManager', 'Error bloqueando usuario', error);
            return false;
        }
    }

    /**
     * Desbloquea a un usuario previamente bloqueado.
     *
     * @param {string} userId - ID del usuario que desbloquea
     * @param {string} blockedUserId - ID del usuario a desbloquear
     * @returns {Promise<boolean>} true si se desbloqueó exitosamente
     *
     * @example
     * ```typescript
     * const success = await blockManager.unblockUser('123', '456');
     * if (success) {
     *   console.log('Usuario desbloqueado');
     * }
     * ```
     */
    async unblockUser(userId: string, blockedUserId: string): Promise<boolean> {
        try {
            const blockRef = this.firebaseManager.getRef(
                `${this.BLOCKS_PATH}/${userId}/${blockedUserId}`
            );

            const snapshot = await blockRef.get();

            if (!snapshot.exists()) {
                logger.debug(
                    'BlockManager',
                    `Usuario ${blockedUserId} no estaba bloqueado por ${userId}`
                );
                return false;
            }

            await blockRef.remove();

            logger.info(
                'BlockManager',
                `Usuario ${userId} desbloqueó a ${blockedUserId}`
            );

            return true;
        } catch (error) {
            logger.error('BlockManager', 'Error desbloqueando usuario', error);
            return false;
        }
    }

    /**
     * Verifica si un usuario ha bloqueado a otro.
     *
     * @param {string} userId - ID del usuario que bloqueó
     * @param {string} blockedUserId - ID del usuario potencialmente bloqueado
     * @returns {Promise<boolean>} true si está bloqueado
     *
     * @example
     * ```typescript
     * const blocked = await blockManager.isBlocked('123', '456');
     * if (blocked) {
     *   await interaction.reply('No puedes interactuar con este usuario');
     * }
     * ```
     */
    async isBlocked(userId: string, blockedUserId: string): Promise<boolean> {
        try {
            const blockRef = this.firebaseManager.getRef(
                `${this.BLOCKS_PATH}/${userId}/${blockedUserId}`
            );

            const snapshot = await blockRef.get();
            return snapshot.exists();
        } catch (error) {
            logger.error('BlockManager', 'Error verificando bloqueo', error);
            return false;
        }
    }

    /**
     * Verifica si hay bloqueo mutuo entre dos usuarios (cualquier dirección).
     * Retorna true si A bloqueó a B O si B bloqueó a A.
     *
     * @param {string} userId1 - ID del primer usuario
     * @param {string} userId2 - ID del segundo usuario
     * @returns {Promise<boolean>} true si hay bloqueo en cualquier dirección
     *
     * @example
     * ```typescript
     * const blocked = await blockManager.isBlockedMutual('123', '456');
     * if (blocked) {
     *   await interaction.reply('No pueden interactuar debido a un bloqueo');
     * }
     * ```
     */
    async isBlockedMutual(userId1: string, userId2: string): Promise<boolean> {
        try {
            const [user1BlockedUser2, user2BlockedUser1] = await Promise.all([
                this.isBlocked(userId1, userId2),
                this.isBlocked(userId2, userId1)
            ]);

            return user1BlockedUser2 || user2BlockedUser1;
        } catch (error) {
            logger.error('BlockManager', 'Error verificando bloqueo mutuo', error);
            return false;
        }
    }

    /**
     * Obtiene la lista de usuarios bloqueados por un usuario.
     *
     * @param {string} userId - ID del usuario
     * @returns {Promise<string[]>} Array de IDs de usuarios bloqueados
     *
     * @example
     * ```typescript
     * const blockedUsers = await blockManager.getBlockedUsers('123');
     * console.log(`Has bloqueado a ${blockedUsers.length} usuarios`);
     * ```
     */
    async getBlockedUsers(userId: string): Promise<string[]> {
        try {
            const blocksRef = this.firebaseManager.getRef(
                `${this.BLOCKS_PATH}/${userId}`
            );

            const snapshot = await blocksRef.get();

            if (!snapshot.exists()) {
                return [];
            }

            const blockedUsers = Object.keys(snapshot.val());
            return blockedUsers;
        } catch (error) {
            logger.error('BlockManager', 'Error obteniendo usuarios bloqueados', error);
            return [];
        }
    }

    /**
     * Obtiene la cantidad de usuarios bloqueados por un usuario.
     *
     * @param {string} userId - ID del usuario
     * @returns {Promise<number>} Cantidad de usuarios bloqueados
     *
     * @example
     * ```typescript
     * const count = await blockManager.getBlockedCount('123');
     * console.log(`Has bloqueado a ${count} usuarios`);
     * ```
     */
    async getBlockedCount(userId: string): Promise<number> {
        const blockedUsers = await this.getBlockedUsers(userId);
        return blockedUsers.length;
    }

    /**
     * Elimina todos los bloqueos de un usuario.
     *
     * @param {string} userId - ID del usuario
     * @returns {Promise<number>} Cantidad de bloqueos eliminados
     *
     * @example
     * ```typescript
     * const cleared = await blockManager.clearAllBlocks('123');
     * console.log(`${cleared} bloqueos eliminados`);
     * ```
     */
    async clearAllBlocks(userId: string): Promise<number> {
        try {
            const blockedUsers = await this.getBlockedUsers(userId);
            const count = blockedUsers.length;

            if (count === 0) {
                return 0;
            }

            const blocksRef = this.firebaseManager.getRef(
                `${this.BLOCKS_PATH}/${userId}`
            );

            await blocksRef.remove();

            logger.info(
                'BlockManager',
                `Todos los bloqueos de ${userId} eliminados: ${count}`
            );

            return count;
        } catch (error) {
            logger.error('BlockManager', 'Error limpiando bloqueos', error);
            return 0;
        }
    }
}

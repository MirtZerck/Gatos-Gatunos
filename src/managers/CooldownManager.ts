import { Collection } from "discord.js";
import { logger } from "../utils/logger.js";

/**
 * *Configuración de cooldown para un comando específico.
 */

interface CooldownConfig {
    /* Duración del cooldown en milisegundos */
    duration: number;
    /* Si true, el cooldown es global; si false, es por usuario */
    global?: boolean;
}

/**
 * *Información de un cooldown activo.
 */
interface CooldownInfo {
    /* Timestamp de cuándo expira el cooldown */
    expiresAt: number;
    /* ID del usuario o 'global' */
    userId: string;
    /* Nombre del comando */
    commandName: string;
}

/**
 * *Gestor de cooldowns para comandos del bot.
 * *Previene spam y abuso de comandos mediante límites de tiempo.
 * 
 * @class CooldownManager
 * @example
 * ```typescript
 * const cooldownManager = new CooldownManager();
 * 
 * /// Verificar si un usuario puede usar un comando
 * const remaining = cooldownManager.getRemainingCooldown('ping', 'user123');
 * if (remaining > 0) {
 *   await interaction.reply(`Espera ${remaining}ms`);
 *   return;
 * }
 * 
 * /// Aplicar cooldown después de usar el comando
 * cooldownManager.setCooldown('ping', 'user123', 3000);
 * ```
 */

export class CooldownManager {
    /**
     * *Mapa de cooldowns activos.
     * *Estructura: commandName -> userId -> timestamp de expiración
     */

    private cooldowns: Collection<string, Collection<string, number>>;

    /**
     * *Configuración de cooldowns por comando.
     * *Define la duración del cooldown para cada comando.
     */

    private cooldownConfigs: Map<string, CooldownConfig>;

    /* Intervalo para limpiar cooldowns expirados. */

    private cleanupInterval: NodeJS.Timeout;

    /* Cooldown por defecto en milisegundos (3 segundos). */
    private readonly DEFAULT_COOLDOWN = 3000;

    /* Intervalo de limpieza en milisegundos (1 minuto). */
    private readonly CLEANUP_INTERVAL = 60000;

    /**
     * *Crea una nueva instancia del gestor de cooldowns.
     * *Inicia automáticamente la limpieza periódica de cooldowns expirados.
     */

    constructor() {
        this.cooldowns = new Collection();
        this.cooldownConfigs = new Map();

        // Iniciar limpieza automática cada minuto
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.CLEANUP_INTERVAL);

        logger.debug('CooldownManager', 'Inicializado con limpieza automática');
    }

    /**
     * *Configura el cooldown para un comando específico.
     * 
     * @param {string} commandName - Nombre del comando
     * @param {number} duration - Duración del cooldown en milisegundos
     * @param {boolean} [global=false] - Si true, el cooldown es global para todos los usuarios
     * 
     * @example
     * ```typescript
     * /// Cooldown de 5 segundos por usuario
     * cooldownManager.setCooldownConfig('ping', 5000);
     * 
     * /// Cooldown global de 10 segundos
     * cooldownManager.setCooldownConfig('announce', 10000, true);
     * ```
     */

    setCooldownConfig(commandName: string, duration: number, global: boolean = false): void {
        this.cooldownConfigs.set(commandName, { duration, global });
        logger.debug('CooldownManager', `Configurado cooldown para ${commandName}: ${duration}ms ${global ? '(global)' : ''}`);
    }

    /**
     * *Obtiene la configuración de cooldown de un comando.
     * *Si no existe configuración, retorna el cooldown por defecto.
     * 
     * @private
     * @param {string} commandName - Nombre del comando
     * @returns {CooldownConfig} Configuración de cooldown
     */
    private getCooldownConfig(commandName: string): CooldownConfig {
        return this.cooldownConfigs.get(commandName) || {
            duration: this.DEFAULT_COOLDOWN,
            global: false
        };
    }

    /**
     * *Aplica un cooldown a un usuario para un comando específico.
     * 
     * @param {string} commandName - Nombre del comando
     * @param {string} userId - ID del usuario (o 'global' para cooldowns globales)
     * @param {number} [duration] - Duración personalizada (usa la configuración si no se proporciona)
     * 
     * @example
     * ```typescript
     * /// Usar cooldown configurado
     * cooldownManager.setCooldown('ping', interaction.user.id);
     * 
     * /// Usar duración personalizada
     * cooldownManager.setCooldown('ping', interaction.user.id, 5000);
     * ```
     */

    setCooldown(commandName: string, userId: string, duration?: number): void {
        const config = this.getCooldownConfig(commandName);
        const cooldownDuration = duration || config.duration;
        const key = config.global ? 'global' : userId;

        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const expiresAt = now + cooldownDuration;

        this.cooldowns.get(commandName)!.set(key, expiresAt);

        logger.debug(
            'CooldownManager',
            `Cooldown aplicado: ${commandName} para ${key} (expira en ${cooldownDuration}ms)`
        );
    }

    /**
     * *Obtiene el tiempo restante de cooldown en milisegundos.
     * 
     * @param {string} commandName - Nombre del comando
     * @param {string} userId - ID del usuario
     * @returns {number} Milisegundos restantes (0 si no hay cooldown activo)
     * 
     * @example
     * ```typescript
     * const remaining = cooldownManager.getRemainingCooldown('ping', userId);
     * if (remaining > 0) {
     *   const seconds = Math.ceil(remaining / 1000);
     *   await interaction.reply(`Espera ${seconds} segundos`);
     *   return;
     * }
     * ```
     */

    getRemainingCooldown(commandName: string, userId: string): number {
        const config = this.getCooldownConfig(commandName);
        const key = config.global ? 'global' : userId;

        const commandCooldowns = this.cooldowns.get(commandName);
        if (!commandCooldowns) return 0;

        const expiresAt = commandCooldowns.get(key);
        if (!expiresAt) return 0;

        const now = Date.now();
        const remaining = expiresAt - now;

        // Si el cooldown ya expiró, eliminarlo y retornar 0
        if (remaining <= 0) {
            commandCooldowns.delete(key);
            if (commandCooldowns.size === 0) {
                this.cooldowns.delete(commandName);
            }
            return 0;
        }

        return remaining;
    }

    /**
     * *Verifica si un usuario puede usar un comando (no tiene cooldown activo).
     * 
     * @param {string} commandName - Nombre del comando
     * @param {string} userId - ID del usuario
     * @returns {boolean} true si puede usar el comando, false si está en cooldown
     * 
     * @example
     * ```typescript
     * if (!cooldownManager.canUseCommand('ping', userId)) {
     *   await interaction.reply('¡Espera un poco!');
     *   return;
     * }
     * ```
     */

    canUseCommand(commandName: string, userId: string): boolean {
        return this.getRemainingCooldown(commandName, userId) === 0;
    }

    /**
     * *Limpia manualmente el cooldown de un usuario para un comando.
     * *Útil para comandos de admin o situaciones especiales.
     * 
     * @param {string} commandName - Nombre del comando
     * @param {string} userId - ID del usuario
     * @returns {boolean} true si se eliminó un cooldown, false si no existía
     * 
     * @example
     * ```typescript
     * /// Limpiar cooldown de un usuario específico
     * cooldownManager.clearCooldown('ping', userId);
     * ```
     */

    clearCooldown(commandName: string, userId: string): boolean {
        const config = this.getCooldownConfig(commandName);
        const key = config.global ? 'global' : userId;

        const commandCooldowns = this.cooldowns.get(commandName);
        if (!commandCooldowns) return false;

        const deleted = commandCooldowns.delete(key);

        if (commandCooldowns.size === 0) {
            this.cooldowns.delete(commandName);
        }

        if (deleted) {
            logger.debug('CooldownManager', `Cooldown limpiado: ${commandName} para ${key}`);
        }

        return deleted;
    }

    /**
     * *Limpia todos los cooldowns de un comando específico.
     * 
     * @param {string} commandName - Nombre del comando
     * @returns {number} Cantidad de cooldowns eliminados
     * 
     * @example
     * ```typescript
     * const cleared = cooldownManager.clearCommandCooldowns('ping');
     * console.log(`${cleared} cooldowns limpiados`);
     * ```
     */

    clearCommandCooldowns(commandName: string): number {
        const commandCooldowns = this.cooldowns.get(commandName);
        if (!commandCooldowns) return 0;

        const count = commandCooldowns.size;
        this.cooldowns.delete(commandName);

        logger.debug('CooldownManager', `Cooldowns limpiados para ${commandName}: ${count}`);
        return count;
    }

    /**
     * *Limpia todos los cooldowns del sistema.
     * 
     * @returns {number} Cantidad total de cooldowns eliminados
     * 
     * @example
     * ```typescript
     * cooldownManager.clearAllCooldowns();
     * ```
     */

    clearAllCooldowns(): number {
        let totalCount = 0;

        for (const [, commandCooldowns] of this.cooldowns) {
            totalCount += commandCooldowns.size;
        }

        this.cooldowns.clear();

        logger.info('CooldownManager', `Todos los cooldowns limpiados: ${totalCount}`);
        return totalCount;
    }

    /**
     * *Limpia cooldowns expirados automáticamente.
     * *Este método se ejecuta periódicamente por el intervalo de limpieza.
     * 
     * @private
     * @returns {number} Cantidad de cooldowns eliminados
     */
    private cleanup(): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [commandName, commandCooldowns] of this.cooldowns) {
            const expiredKeys: string[] = [];

            for (const [userId, expiresAt] of commandCooldowns) {
                if (expiresAt <= now) {
                    expiredKeys.push(userId);
                }
            }

            for (const key of expiredKeys) {
                commandCooldowns.delete(key);
                cleanedCount++;
            }

            // Si no quedan cooldowns para este comando, eliminar la entrada
            if (commandCooldowns.size === 0) {
                this.cooldowns.delete(commandName);
            }
        }

        if (cleanedCount > 0) {
            logger.debug('CooldownManager', `Limpieza automática: ${cleanedCount} cooldowns expirados eliminados`);
        }

        return cleanedCount;
    }

    /**
     * *Obtiene información detallada de un cooldown activo.
     * 
     * @param {string} commandName - Nombre del comando
     * @param {string} userId - ID del usuario
     * @returns {CooldownInfo | null} Información del cooldown o null si no existe
     * 
     * @example
     * ```typescript
     * const info = cooldownManager.getCooldownInfo('ping', userId);
     * if (info) {
     *   console.log(`Expira en: ${new Date(info.expiresAt)}`);
     * }
     * ```
     */

    getCooldownInfo(commandName: string, userId: string): CooldownInfo | null {
        const config = this.getCooldownConfig(commandName);
        const key = config.global ? 'global' : userId;

        const commandCooldowns = this.cooldowns.get(commandName);
        if (!commandCooldowns) return null;

        const expiresAt = commandCooldowns.get(key);
        if (!expiresAt) return null;

        return {
            expiresAt,
            userId: key,
            commandName
        };
    }

    /**
     * *Obtiene estadísticas del sistema de cooldowns.
     * 
     * @returns {{
     *   totalCooldowns: number,
     *   commandsWithCooldowns: number,
     *   configuredCommands: number
     * }} Estadísticas de cooldowns
     * 
     * @example
     * ```typescript
     * const stats = cooldownManager.getStats();
     * console.log(`Cooldowns activos: ${stats.totalCooldowns}`);
     * ```
     */

    getStats(): {
        totalCooldowns: number;
        commandsWithCooldowns: number;
        configuredCommands: number;
    } {
        let totalCooldowns = 0;

        for (const [, commandCooldowns] of this.cooldowns) {
            totalCooldowns += commandCooldowns.size;
        }

        return {
            totalCooldowns,
            commandsWithCooldowns: this.cooldowns.size,
            configuredCommands: this.cooldownConfigs.size
        };
    }

    /**
     * *Detiene el intervalo de limpieza automática.
     * *Debe llamarse al cerrar el bot para evitar memory leaks.
     * 
     * @example
     * ```typescript
     * process.on('SIGINT', () => {
     *   cooldownManager.destroy();
     *   process.exit(0);
     * });
     * ```
     */

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.clearAllCooldowns();
        logger.info('CooldownManager', 'Destruido y cooldowns limpiados');
    }
}
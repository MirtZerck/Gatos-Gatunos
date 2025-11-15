import { config } from '../config';

/**
 * *Niveles de logging disponibles.
 * *Cada nivel incluye todos los niveles superiores.
 * 
 * @enum {number}
 */

export enum LogLevel {
    /* Información detallada de debugging (más verboso) */
    DEBUG = 0,
    /* Información general del flujo de la aplicación */
    INFO = 1,
    /* Advertencias que no detienen la ejecución */
    WARN = 2,
    /* Errores que requieren atención */
    ERROR = 3
}

/* Mapeo de strings a niveles de logging */
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR
};

/* Colores ANSI para output de consola en modo desarrollo */
const LOG_COLORS = {
    DEBUG: '\x1b[36m', // Celeste
    INFO: '\x1b[32m', //  Verde
    WARN: '\x1b[33m', // Amarillo
    ERROR: '\x1b[31m', // Rojo
    RESET: '\x1b[0m'
};

/**
 * *Sistema de logging centralizado con niveles y formato configurable.
 * *Soporta modo desarrollo (con colores) y producción (formato estructurado).
 * 
 * @class Logger
 * 
 * @example
 * ```typescript
 * logger.info('Bot', 'Bot iniciado correctamente');
 * logger.error('Database', 'Error de conexión', error);
 * logger.command('slash', 'User#1234', 'ping', 'Mi Servidor');
 * ```
 */
class Logger {
    /* Nivel mínimo de logging configurado */
    private level: LogLevel;
    /* Indica si está en modo desarrollo (usa colores) */
    private isDevelopment: boolean;

    /**
     * *Inicializa el logger con la configuración del entorno.
     */

    constructor() {
        this.level = LOG_LEVEL_MAP[config.logLevel] || LogLevel.INFO;
        this.isDevelopment = config.environment === 'development';
    }

    /**
     * *Verifica si un mensaje debe ser logueado según el nivel configurado.
     * 
     * @private
     * @param {LogLevel} level - Nivel del mensaje
     * @returns {boolean} true si debe loguearse
     */

    private shouldLog(level: LogLevel): boolean {
        return level >= this.level;
    }

    /**
     * *Formatea un timestamp en formato ISO.
     * 
     * @private
     * @returns {string} Timestamp formateado
     */

    private formatTimestamp(): string {
        const now = new Date();
        return now.toISOString();
    }

    /**
     * *Formatea un mensaje de log con timestamp, nivel y categoría.
     * *En desarrollo usa colores ANSI, en producción usa formato plano.
     * 
     * @private
     * @param {string} level - Nivel del log
     * @param {string} category - Categoría/módulo que genera el log
     * @param {string} message - Mensaje a loguear
     * @returns {string} Mensaje formateado
     */

    private format(level: string, category: string, message: string): string {
        const timestamp = this.formatTimestamp();

        if (this.isDevelopment) {
            const color = LOG_COLORS[level as keyof typeof LOG_COLORS] || '';
            return `${color}[${timestamp}] [${level}] [${category}]${LOG_COLORS.RESET} ${message}`;

        } else {
            return `[${timestamp} [${level}] [${category}] [${message}]]`;
        }
    }

    /**
     * *Loguea un mensaje de nivel DEBUG.
     * *Para información detallada de debugging.
     * 
     * @param {string} category - Categoría del log
     * @param {string} message - Mensaje a loguear
     * @param {...any[]} args - Argumentos adicionales
     */

    debug(category: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.format('DEBUG', category, message), ...args);
        }
    }

    /**
     * *Loguea un mensaje de nivel INFO.
     * *Para información general del flujo de la aplicación.
     * 
     * @param {string} category - Categoría del log
     * @param {string} message - Mensaje a loguear
     * @param {...any[]} args - Argumentos adicionales
     */

    info(category: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.format('INFO', category, message), ...args);
        }
    }

    /**
     * *Loguea un mensaje de nivel WARN.
     * *Para advertencias que no detienen la ejecución.
     * 
     * @param {string} category - Categoría del log
     * @param {string} message - Mensaje a loguear
     * @param {...any[]} args - Argumentos adicionales
     */

    warn(category: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.error(this.format('WARN', category, message), ...args);

        }
    }

    /**
     * *Loguea un mensaje de nivel ERROR.
     * *Para errores que requieren atención inmediata.
     * *Incluye detalles del stack trace si está disponible.
     * 
     * @param {string} category - Categoría del log
     * @param {string} message - Mensaje a loguear
     * @param {unknown} [error] - Error capturado (opcional)
     */

    error(category: string, message: string, error?: unknown): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.format('ERROR', category, message));

            if (error) {
                if (error instanceof Error) {
                    console.error(` Stack: ${error.stack}`);
                } else {
                    console.error(' Details:', error);

                }
            }

        }
    }

    /**
     * *Loguea la ejecución de un comando.
     * *Formato especial para tracking de uso de comandos.
     * 
     * @param {'slash' | 'prefix'} type - Tipo de comando ejecutado
     * @param {string} user - Tag del usuario que ejecutó el comando
     * @param {string} command - Nombre del comando
     * @param {string} [guild] - Nombre del servidor (opcional para DMs)
     * 
     * @example
     * ```typescript
     * logger.command('slash', 'User#1234', 'ping', 'Mi Servidor');
     * logger.command('prefix', 'User#5678', 'help'); // DM
     * ```
     */

    command(type: 'slash' | 'prefix', user: string, command: string, guild?: string): void {
        const emoji = type === 'slash' ? '⚡' : '💬';
        const location = guild ? `en ${guild}` : 'en DM';
        this.info('Command', `${emoji} ${user} usó ${type === 'slash' ? '/' : '*'}${command} ${location}`);
    }

    /**
     * *Muestra un banner cuando el bot está listo.
     * *Incluye información del bot, servidores y usuarios.
     * 
     * @param {string} tag - Tag del bot (nombre#discriminator)
     * @param {number} guilds - Cantidad de servidores
     * @param {number} users - Cantidad de usuarios
     * 
     * @example
     * ```typescript
     * logger.ready('MiBot#1234', 50, 10000);
     * ```
     */

    ready(tag: string, guilds: number, users: number): void {
        console.log('\n' + '='.repeat(50));
        this.info('Bot', `✅ ${tag} está online`);
        this.info('Bot', `📊 Servidores: ${guilds}`);
        this.info('Bot', `👥 Usuarios: ${users}`);
        console.log('='.repeat(50) + '\n');
    }


    /**
     * *loguea la carga exitosa de módulos.
     * *Formato especial para inicialización de sistemas.
     * 
     * @param {string} name - Nombre del módulo/sistema
     * @param {number} count - Cantidad de elementos cargados
     * 
     * @example
     * ```typescript
     * logger.module('CommandManager', 25); // "✅ 25 elementos cargados."
     * ```
     */

    module(name: string, count: number): void {
        this.info(name, `✅ ${count} elementos cargados.`);
    }
}

/* Instancia singleton del logger para uso global */
export const logger = new Logger();
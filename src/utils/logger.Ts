import { config } from '../config';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR
};

const LOG_COLORS = {
    DEBUG: '\x1b[36m', // Celeste
    INFO: '\x1b[32m', //  Verde
    WARN: '\x1b[33m', // Amarillo
    ERROR: '\x1b[31m', // Rojo
    RESET: '\x1b[0m'
};

class Logger {
    private level: LogLevel;
    private isDevelopment: boolean;

    constructor() {
        this.level = LOG_LEVEL_MAP[config.logLevel] || LogLevel.INFO;
        this.isDevelopment = config.environment === 'development';
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.level;
    }

    private formatTimestamp(): string {
        const now = new Date();
        return now.toISOString();
    }

    private format(level: string, category: string, message: string): string {
        const timestamp = this.formatTimestamp();

        if (this.isDevelopment) {
            const color = LOG_COLORS[level as keyof typeof LOG_COLORS] || '';
            return `${color}[${timestamp}] [${level}] [${category}]${LOG_COLORS.RESET} ${message}`;

        } else {
            return `[${timestamp} [${level}] [${category}] [${message}]]`;
        }
    }

    debug(category: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.format('DEBUG', category, message), ...args);
        }
    }

    info(category: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.format('INFO', category, message), ...args);
        }
    }

    warn(category: string, message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.error(this.format('WARN', category, message), ...args);

        }
    }

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

    command(type: 'slash' | 'prefix', user: string, command: string, guild?: string): void {
        const emoji = type === 'slash' ? '⚡' : '💬';
        const location = guild ? `en ${guild}` : 'en DM';
        this.info('Command', `${emoji} ${user} usó ${type === 'slash' ? '/' : '*'}${command} ${location}`);
    }

    ready(tag: string, guilds: number, users: number): void {
        console.log('\n' + '='.repeat(50));
        this.info('Bot', `✅ ${tag} está online`);
        this.info('Bot', `📊 Servidores: ${guilds}`);
        this.info('Bot', `👥 Usuarios: ${users}`);
        console.log('='.repeat(50) + '\n');
    }

    module(name: string, count: number): void {
        this.info(name, `✅ ${count} elementos cargados.`);
    }
}

export const logger = new Logger();
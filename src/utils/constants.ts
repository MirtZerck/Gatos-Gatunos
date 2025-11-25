import { InteractionContextType, ApplicationIntegrationType } from "discord.js";

/**
 * Contextos de interacción donde los comandos pueden ejecutarse.
 */
export const CONTEXTS = {
    /** Todos los contextos disponibles */
    ALL: [
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
    ] as InteractionContextType[],
    /** Solo en servidores */
    GUILD_ONLY: [InteractionContextType.Guild] as InteractionContextType[],
    /** Solo en mensajes directos */
    DM_ONLY: [
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
    ] as InteractionContextType[]
};

/**
 * Tipos de integración para comandos de aplicación.
 */
export const INTEGRATION_TYPES = {
    /** Todos los tipos de integración */
    ALL: [
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
    ] as ApplicationIntegrationType[],
    /** Solo instalación en servidor */
    GUILD_ONLY: [ApplicationIntegrationType.GuildInstall] as ApplicationIntegrationType[],
    /** Solo instalación de usuario */
    USER_ONLY: [ApplicationIntegrationType.UserInstall] as ApplicationIntegrationType[]
};

/**
 * Categorías disponibles para organizar comandos.
 */
export const CATEGORIES = {
    INTERACTION: 'Interacción',
    MODERATION: 'Moderación',
    MUSIC: 'Música',
    UTILITY: 'Utilidad',
    FUN: 'Diversión',
    INFORMATION: 'Información',
    CONFIGURATION: 'Configuración',
    DEVELOPER: 'Desarrollador'
} as const;

/** Tipo de categoría de comando */
export type CommandCategory = typeof CATEGORIES[keyof typeof CATEGORIES];

/**
 * Paleta de colores para embeds.
 */
export const COLORS = {
    /** Azul de Discord - Color principal */
    PRIMARY: 0x5865F2,
    /** Verde - Operaciones exitosas */
    SUCCESS: 0x57F287,
    /** Amarillo - Advertencias */
    WARNING: 0xFEE75C,
    /** Rojo - Errores */
    DANGER: 0xED4245,
    /** Azul claro - Información */
    INFO: 0x3498DB,
    /** Rosa - Comandos de interacción */
    INTERACTION: 0xFF69B4,
    /** Púrpura - Sistema de música */
    MUSIC: 0x9B59B6,
    /** Rojo oscuro - Moderación */
    MODERATION: 0xE74C3C
} as const;

/**
 * Emojis utilizados en el bot.
 */
export const EMOJIS = {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    LOADING: '🔄',
    INFO: 'ℹ️',
    MUSIC: '🎵',
    VOLUME: '🔊',
    PLAY: '▶️',
    PAUSE: '⏸️',
    STOP: '⏹️',
    SKIP: '⏭️',
    SHUFFLE: '🔀',
    REPEAT: '🔁',
    HEART: '❤️',
    STAR: '⭐',
    BAN: '🔨',
    KICK: '👢',
    MUTE: '🔇',
    SEARCH: '🔍'
} as const;

/**
 * Límites de Discord para embeds y comandos.
 */
export const LIMITS = {
    /** Límites de embeds */
    MAX_EMBED_TITLE: 256,
    MAX_EMBED_DESCRIPTION: 4096,
    MAX_EMBED_FIELDS: 25,
    MAX_EMBED_FIELD_NAME: 256,
    MAX_EMBED_FIELD_VALUE: 1024,
    MAX_EMBED_FOOTER: 2048,
    MAX_EMBED_AUTHOR: 256,

    /** Límites de comandos */
    MAX_COMMAND_NAME: 32,
    MAX_COMMAND_DESCRIPTION: 100,
    MAX_COMMAND_OPTIONS: 25,
    MAX_COMMAND_CHOICES: 25,

    /** Límites de mensajes */
    MAX_MESSAGE_LENGTH: 2000,
    MAX_REASON_LENGTH: 512,

    /** Límites de usuarios */
    MAX_USERNAME_LENGTH: 32,
    MAX_NICKNAME_LENGTH: 32
} as const;

/**
 * Tiempos de espera en milisegundos.
 */
export const TIMEOUTS = {
    /** Tiempo para diferir interacción (3s) */
    INTERACTION_DEFER: 3000,
    /** Timeout de peticiones API (10s) */
    API_TIMEOUT: 10000,
    /** Delay entre reintentos de API (5s) */
    API_RETRY_DELAY: 5000,
    /** Cooldown por defecto de comandos (3s) */
    COMMAND_COOLDOWN: 3000,
    /** Delay para eliminar mensajes temporales (5s) */
    DELETE_MESSAGE_DELAY: 5000
} as const;

/**
 * URLs del proyecto.
 */
export const URLS = {
    SUPPORT_SERVER: '',
    DOCUMENTATION: '',
    INVITE_BOT: '',
    GITHUB: ''
} as const;

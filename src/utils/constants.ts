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
    PRIMARY: 0x5865F2,
    SUCCESS: 0x57F287,
    WARNING: 0xFEE75C,
    DANGER: 0xED4245,
    INFO: 0x3498DB,
    INTERACTION: 0xFF69B4,
    MUSIC: 0x9B59B6,
    MODERATION: 0xE74C3C,
    PREMIUM_BASIC: 0xF4D03F,
    PREMIUM_PRO: 0x9B59B6,
    PREMIUM_ULTRA: 0xFF6B6B
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
    SEARCH: '🔍',
    PREMIUM: '👑',
    PREMIUM_BASIC: '🥉',
    PREMIUM_PRO: '🥈',
    PREMIUM_ULTRA: '🥇',
    GIFT: '🎁',
    CLOCK: '⏰'
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
    INTERACTION_DEFER: 3000,
    API_TIMEOUT: 10000,
    API_RETRY_DELAY: 5000,
    COMMAND_COOLDOWN: 3000,
    DELETE_MESSAGE_DELAY: 5000
} as const;

export const PREMIUM = {
    VOTE_DURATION_HOURS: 12,
    COOLDOWN_REDUCTION: {
        BASIC: 0.25,
        PRO: 0.50,
        ULTRA: 0.75
    },
    DONATION_TIERS: {
        BASIC_MIN: 3,
        BASIC_MAX: 4.99,
        PRO_MIN: 5,
        PRO_MAX: 9.99,
        ULTRA_MIN: 10,
        ULTRA_MAX: 24.99,
        ULTRA_PERMANENT: 25
    },
    DURATION_DAYS: 30,
    CODE_ATTEMPTS_PER_HOUR: 5,
    EXPIRATION_CHECK_INTERVAL_MS: 3600000,
    NOTIFICATION_DAYS: {
        WARNING_3_DAYS: 3,
        WARNING_1_DAY: 1
    }
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

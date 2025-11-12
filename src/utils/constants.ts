import { InteractionContextType, ApplicationIntegrationType } from "discord.js";

export const CONTEXTS = {
    ALL: [
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
    ],
    GUILD_ONLY: [InteractionContextType.Guild],
    DM_ONLY: [
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
    ]

};

export const INTEGRATION_TYPES = {
    ALL: [
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
    ],
    GUILD_ONLY: [ApplicationIntegrationType.GuildInstall],
    USER_ONLY: [ApplicationIntegrationType.UserInstall

    ]

};

export const CATEGORIES = {
    INTERACTION: 'Interacción',
    MODERATION: 'Moderación',
    MUSIC: 'Música',
    UTILITY: 'Utilidad',
    FUN: 'Diversión',
    INFORMATION: 'Información',
    CONFIGURATION: 'Configuración'
} as const;

export type CommandCategory = typeof CATEGORIES[keyof typeof CATEGORIES];

export const COLORS = {
    PRIMARY: 0x5865F2,     // Azul de Discord
    SUCCESS: 0x57F287,     // Verde
    WARNING: 0xFEE75C,     // Amarillo
    DANGER: 0xED4245,      // Rojo
    INFO: 0x3498DB,        // Azul claro
    INTERACTION: 0xFF69B4, // Rosa (para comandos de interacción)
    MUSIC: 0x9B59B6,       // Púrpura
    MODERATION: 0xE74C3C, // Rojo oscuro
} as const

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
} as const;

export const LIMITS = {

    MAX_EMBED_TITLE: 256,
    MAX_EMBED_DESCRIPTION: 4096,
    MAX_EMBED_FIELDS: 25,
    MAX_EMBED_FIELD_NAME: 256,
    MAX_EMBED_FIELD_VALUE: 1024,
    MAX_EMBED_FOOTER: 2048,
    MAX_EMBED_AUTHOR: 256,


    MAX_COMMAND_NAME: 32,
    MAX_COMMAND_DESCRIPTION: 100,
    MAX_COMMAND_OPTIONS: 25,
    MAX_COMMAND_CHOICES: 25,


    MAX_MESSAGE_LENGTH: 2000,
    MAX_REASON_LENGTH: 512,


    MAX_USERNAME_LENGTH: 32,
    MAX_NICKNAME_LENGTH: 32,
} as const;


export const TIMEOUTS = {
    INTERACTION_DEFER: 3000,      // 3 segundos
    API_TIMEOUT: 10000,           // 10 segundos
    API_RETRY_DELAY: 5000,        // 5 segundos
    COMMAND_COOLDOWN: 3000,       // 3 segundos
    DELETE_MESSAGE_DELAY: 5000,   // 5 segundos
} as const;

export const URLS = {
    SUPPORT_SERVER: '',
    DOCUMENTATION: '',
    INVITE_BOT: '',
    GITHUB: '',
} as const;
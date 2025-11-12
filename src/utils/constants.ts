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
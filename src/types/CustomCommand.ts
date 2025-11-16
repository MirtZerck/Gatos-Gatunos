/**
 * Estado de una propuesta de comando personalizado
 */
export enum ProposalStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected'
}

/**
 * Propuesta de comando personalizado
 */
export interface CommandProposal {
    /** ID único de la propuesta (UUID) */
    id: string;
    /** Nombre del comando propuesto */
    commandName: string;
    /** URL de la imagen */
    imageUrl: string;
    /** ID del usuario que propuso */
    authorId: string;
    /** Tag del usuario (User#1234) */
    authorTag: string;
    /** Estado de la propuesta */
    status: ProposalStatus;
    /** Timestamp de creación */
    timestamp: number;
    /** ID del moderador que procesó (null si pendiente) */
    processedBy: string | null;
    /** Tag del moderador que procesó */
    processedByTag: string | null;
    /** Timestamp de procesamiento (null si pendiente) */
    processedAt: number | null;
    /** ID del servidor */
    guildId: string;
}

/**
 * Comando personalizado almacenado
 */
export interface CustomCommand {
    /** Nombre del comando */
    name: string;
    /** Valores del comando (índice → URL de imagen) */
    values: Record<string, string>;
    /** Total de valores */
    count: number;
}

/**
 * Información de un comando personalizado para mostrar
 */
export interface CustomCommandInfo {
    /** Nombre del comando */
    name: string;
    /** Cantidad de valores disponibles */
    count: number;
}

/**
 * Datos de notificación al usuario
 */
export interface NotificationData {
    /** Nombre del comando */
    commandName: string;
    /** URL de la imagen */
    imageUrl: string;
    /** Tag del usuario */
    userTag: string;
    /** Nombre del servidor */
    guildName: string;
    /** Tag del moderador que procesó */
    moderatorTag?: string;
    /** Si fue aceptada o rechazada */
    accepted: boolean;
    /** Si es un comando nuevo o se añadió a uno existente */
    isNewCommand: boolean;
}
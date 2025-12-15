/**
 * Enumeraciones y tipos para el sistema de premium
 */

/**
 * Niveles de premium disponibles
 */
export enum PremiumTier {
    BASIC = 'basic',
    PRO = 'pro',
    ULTRA = 'ultra'
}

/**
 * Tipo de premium (permanente o temporal)
 */
export enum PremiumType {
    PERMANENT = 'permanent',
    TEMPORARY = 'temporary'
}

/**
 * Fuente de activación del premium
 */
export enum PremiumSource {
    KOFI = 'kofi',
    TOPGG = 'topgg',
    DBL = 'dbl',
    CODE = 'code',
    MANUAL = 'manual'
}

/**
 * Tipos de transacciones de premium
 */
export enum TransactionType {
    ACTIVATION = 'activation',
    EXPIRATION = 'expiration',
    RENEWAL = 'renewal',
    REVOKE = 'revoke'
}

/**
 * Notificaciones enviadas al usuario
 */
export interface PremiumNotifications {
    threeDayWarning: boolean;
    oneDayWarning: boolean;
    expired: boolean;
}

/**
 * Datos de un usuario premium en Firebase
 */
export interface PremiumUser {
    tier: PremiumTier;
    type: PremiumType;
    activatedAt: number;
    expiresAt: number | null;
    source: PremiumSource;
    sourceId: string;
    notificationsSent: PremiumNotifications;
}

/**
 * Estructura de un código de canje
 */
export interface PremiumCode {
    code: string;
    tier: PremiumTier;
    type: PremiumType;
    duration: number | null;
    createdAt: number;
    createdBy: string;
    used: boolean;
    usedBy: string | null;
    usedAt: number | null;
    expiresAt: number | null;
    maxUses?: number | null;
    currentUses?: number;
    usedByUsers?: string[];
}

/**
 * Log de una transacción de premium
 */
export interface PremiumTransaction {
    userId: string;
    type: TransactionType;
    tier: PremiumTier;
    source: PremiumSource;
    timestamp: number;
    metadata: Record<string, unknown>;
}

/**
 * Estadísticas globales del sistema premium
 */
export interface PremiumStats {
    totalUsers: number;
    activeUsers: number;
    byTier: {
        basic: number;
        pro: number;
        ultra: number;
    };
    bySource: {
        kofi: number;
        topgg: number;
        dbl: number;
        code: number;
        manual: number;
    };
}

/**
 * Estado actual de premium de un usuario
 */
export interface PremiumStatus {
    hasPremium: boolean;
    tier?: PremiumTier;
    type?: PremiumType;
    activatedAt?: number;
    expiresAt?: number | null;
    source?: PremiumSource;
    daysRemaining?: number;
    systemDisabled?: boolean;
}

/**
 * Opciones para crear un código de canje
 */
export interface CreateCodeOptions {
    tier: PremiumTier;
    type: PremiumType;
    duration?: number;
    createdBy: string;
    customCode?: string;
    expiresAt?: number;
    maxUses?: number | null;
}

/**
 * Opciones para otorgar premium
 */
export interface GrantPremiumOptions {
    userId: string;
    tier: PremiumTier;
    type: PremiumType;
    duration?: number;
    source: PremiumSource;
    sourceId: string;
    grantedBy?: string;
}

/**
 * Resultado de validación de premium
 */
export interface PremiumValidationResult {
    hasAccess: boolean;
    currentTier?: PremiumTier;
    requiredTier?: PremiumTier;
    message?: string;
}

/**
 * Payload de webhook de Ko-fi
 */
export interface KofiWebhookPayload {
    verification_token: string;
    message_id: string;
    timestamp: string;
    type: string;
    is_public: boolean;
    from_name: string;
    message: string;
    amount: string;
    url: string;
    email: string;
    currency: string;
    is_subscription_payment: boolean;
    is_first_subscription_payment: boolean;
    kofi_transaction_id: string;
    shop_items: unknown[] | null;
    tier_name: string | null;
    shipping: unknown | null;
    discord_username?: string;
    discord_userid?: string;
}

/**
 * Payload de webhook de Top.gg
 */
export interface TopggWebhookPayload {
    bot: string;
    user: string;
    type: string;
    isWeekend: boolean;
    query?: string;
}

/**
 * Payload de webhook de Discord Bot List
 */
export interface DblWebhookPayload {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
}

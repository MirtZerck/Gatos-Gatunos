import { FirebaseAdminManager } from './FirebaseAdminManager.js';
import {
    PremiumUser,
    PremiumStatus,
    PremiumTier,
    PremiumType,
    PremiumSource,
    PremiumValidationResult,
    GrantPremiumOptions,
    PremiumStats,
    TransactionType
} from '../types/Premium.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { PREMIUM } from '../utils/constants.js';
import { Client } from 'discord.js';

export class PremiumManager {
    private firebaseManager: FirebaseAdminManager;
    private client: Client;
    private expirationInterval: NodeJS.Timeout | null = null;

    constructor(firebaseManager: FirebaseAdminManager, client: Client) {
        this.firebaseManager = firebaseManager;
        this.client = client;
    }

    private getUserRef(userId: string) {
        return this.firebaseManager.getRef(`premium/users/${userId}`);
    }

    private getStatsRef() {
        return this.firebaseManager.getRef('premium/stats');
    }

    private getTransactionsRef() {
        return this.firebaseManager.getRef('premium/transactions');
    }

    async hasPremium(userId: string): Promise<boolean> {
        if (!config.premium.enabled) return false;

        const globalTier = config.premium.globalTier;
        if (globalTier && globalTier !== 'none') {
            const now = Date.now();
            const expiresAt = config.premium.globalExpiresAt;
            if (!expiresAt || now < expiresAt) {
                return true;
            }
        }

        const userRef = this.getUserRef(userId);
        const snapshot = await userRef.get();

        if (!snapshot.exists()) return false;

        const userData = snapshot.val() as PremiumUser;
        const now = Date.now();

        if (userData.type === PremiumType.PERMANENT) return true;
        if (userData.expiresAt && now < userData.expiresAt) return true;

        return false;
    }

    async getPremiumStatus(userId: string): Promise<PremiumStatus> {
        const systemDisabled = !config.premium.enabled;

        const globalTier = config.premium.globalTier;
        if (globalTier && globalTier !== 'none') {
            const now = Date.now();
            const expiresAt = config.premium.globalExpiresAt;
            if (!expiresAt || now < expiresAt) {
                return {
                    hasPremium: !systemDisabled,
                    tier: globalTier as PremiumTier,
                    type: expiresAt ? PremiumType.TEMPORARY : PremiumType.PERMANENT,
                    activatedAt: 0,
                    expiresAt: expiresAt || null,
                    source: PremiumSource.MANUAL,
                    daysRemaining: expiresAt ? Math.ceil((expiresAt - now) / 86400000) : undefined,
                    systemDisabled
                };
            }
        }

        const userRef = this.getUserRef(userId);
        const snapshot = await userRef.get();

        if (!snapshot.exists()) {
            return { hasPremium: false, systemDisabled };
        }

        const userData = snapshot.val() as PremiumUser;
        const now = Date.now();

        const isActive = userData.type === PremiumType.PERMANENT ||
            (userData.expiresAt !== null && now < userData.expiresAt);

        if (!isActive) {
            return { hasPremium: false, systemDisabled };
        }

        const daysRemaining = userData.expiresAt
            ? Math.ceil((userData.expiresAt - now) / 86400000)
            : undefined;

        return {
            hasPremium: !systemDisabled,
            tier: userData.tier,
            type: userData.type,
            activatedAt: userData.activatedAt,
            expiresAt: userData.expiresAt,
            source: userData.source,
            daysRemaining,
            systemDisabled,
            queuedPremium: userData.queuedPremium || null
        };
    }

    async canUseCommand(userId: string, requiredTier: PremiumTier): Promise<PremiumValidationResult> {
        const status = await this.getPremiumStatus(userId);

        if (!status.hasPremium) {
            return {
                hasAccess: false,
                requiredTier,
                message: 'No tienes premium activo'
            };
        }

        const tierHierarchy = {
            [PremiumTier.BASIC]: 1,
            [PremiumTier.PRO]: 2,
            [PremiumTier.ULTRA]: 3
        };

        const userLevel = tierHierarchy[status.tier!];
        const requiredLevel = tierHierarchy[requiredTier];

        if (userLevel >= requiredLevel) {
            return {
                hasAccess: true,
                currentTier: status.tier
            };
        }

        return {
            hasAccess: false,
            currentTier: status.tier,
            requiredTier,
            message: `Requiere ${requiredTier}, tienes ${status.tier}`
        };
    }

    private getTierValue(tier: PremiumTier): number {
        const tierValues = {
            [PremiumTier.BASIC]: 1,
            [PremiumTier.PRO]: 2,
            [PremiumTier.ULTRA]: 3
        };
        return tierValues[tier];
    }

    async grantPremium(options: GrantPremiumOptions & { smartGrant?: boolean }): Promise<boolean> {
        try {
            const { userId, tier, type, duration, source, sourceId, smartGrant = false } = options;
            const now = Date.now();

            if (smartGrant) {
                const currentStatus = await this.getPremiumStatus(userId);

                if (currentStatus.hasPremium && currentStatus.tier && currentStatus.type) {
                    if (currentStatus.type === PremiumType.PERMANENT) {
                        logger.info('PremiumManager', `Usuario ${userId} tiene premium permanente, otorgamiento rechazado`);
                        return false;
                    }

                    if (type === PremiumType.PERMANENT) {
                        const currentValue = this.getTierValue(currentStatus.tier);
                        const newValue = this.getTierValue(tier);

                        if (newValue < currentValue) {
                            const userRef = this.getUserRef(userId);
                            await userRef.update({
                                queuedPremium: {
                                    tier,
                                    type,
                                    duration: null,
                                    source,
                                    sourceId,
                                    queuedAt: now
                                }
                            });

                            logger.info('PremiumManager', `Premium permanente ${tier} guardado en cola para ${userId} (activo: ${currentStatus.tier} temporal)`);
                            return true;
                        } else {
                            logger.info('PremiumManager', `Usuario ${userId} con temporal, upgrade a permanente ${tier}`);
                        }
                    } else {
                        const currentValue = this.getTierValue(currentStatus.tier);
                        const newValue = this.getTierValue(tier);

                        if (newValue < currentValue) {
                            const conversionRatio = newValue / currentValue;
                            const newDuration = duration || PREMIUM.DURATION_DAYS * 86400000;
                            const convertedDuration = Math.floor(newDuration * conversionRatio);

                            await this.extendPremium(userId, convertedDuration / 3600000);

                            logger.info('PremiumManager', `Premium convertido para ${userId}: ${tier} (${newDuration}ms) → ${currentStatus.tier} (${convertedDuration}ms)`);
                            return true;
                        } else if (newValue === currentValue) {
                            const extensionHours = (duration || PREMIUM.DURATION_DAYS * 86400000) / 3600000;
                            await this.extendPremium(userId, extensionHours);

                            logger.info('PremiumManager', `Premium extendido para ${userId}: ${tier} (+${extensionHours}h)`);
                            return true;
                        }
                    }
                }
            }

            const expiresAt = type === PremiumType.PERMANENT
                ? null
                : now + (duration || PREMIUM.DURATION_DAYS * 86400000);

            const premiumData: PremiumUser = {
                tier,
                type,
                activatedAt: now,
                expiresAt,
                source,
                sourceId,
                notificationsSent: {
                    threeDayWarning: false,
                    oneDayWarning: false,
                    expired: false
                }
            };

            const userRef = this.getUserRef(userId);
            await userRef.set(premiumData);

            const transactionMetadata: Record<string, unknown> = {
                type,
                duration,
                expiresAt
            };

            if (options.grantedBy !== undefined) {
                transactionMetadata.grantedBy = options.grantedBy;
            }

            await this.logTransaction(userId, TransactionType.ACTIVATION, tier, source, transactionMetadata);

            await this.updateStats();

            logger.info('PremiumManager', `Premium ${tier} otorgado a ${userId} (${source})`);
            return true;
        } catch (error) {
            logger.error('PremiumManager', 'Error otorgando premium', error);
            return false;
        }
    }

    async revokePremium(userId: string, adminId: string, reason?: string): Promise<boolean> {
        try {
            const userRef = this.getUserRef(userId);
            const snapshot = await userRef.get();

            if (!snapshot.exists()) return false;

            const userData = snapshot.val() as PremiumUser;
            await userRef.remove();

            await this.logTransaction(userId, TransactionType.REVOKE, userData.tier, userData.source, {
                revokedBy: adminId,
                reason
            });

            await this.updateStats();

            logger.info('PremiumManager', `Premium revocado de ${userId} por ${adminId}`);
            return true;
        } catch (error) {
            logger.error('PremiumManager', 'Error revocando premium', error);
            return false;
        }
    }

    async extendPremium(userId: string, hours: number): Promise<boolean> {
        try {
            const userRef = this.getUserRef(userId);
            const snapshot = await userRef.get();

            if (!snapshot.exists()) return false;

            const userData = snapshot.val() as PremiumUser;
            const additionalMs = hours * 3600000;

            if (userData.type === PremiumType.TEMPORARY && userData.expiresAt) {
                const newExpiresAt = userData.expiresAt + additionalMs;
                await userRef.update({ expiresAt: newExpiresAt });

                logger.info('PremiumManager', `Premium extendido ${hours}h para ${userId}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('PremiumManager', 'Error extendiendo premium', error);
            return false;
        }
    }

    async checkExpiredUsers(): Promise<string[]> {
        try {
            if (!config.premium.enabled) {
                return [];
            }

            const usersRef = this.firebaseManager.getRef('premium/users');
            const snapshot = await usersRef.get();

            if (!snapshot.exists()) return [];

            const users = snapshot.val() as Record<string, PremiumUser>;
            const now = Date.now();
            const expiredIds: string[] = [];

            for (const [userId, userData] of Object.entries(users)) {
                if (userData.type === PremiumType.TEMPORARY && userData.expiresAt && now >= userData.expiresAt) {
                    expiredIds.push(userId);
                    await this.handleExpiration(userId, userData);
                }
            }

            if (expiredIds.length > 0) {
                await this.updateStats();
            }

            return expiredIds;
        } catch (error) {
            logger.error('PremiumManager', 'Error verificando usuarios expirados', error);
            return [];
        }
    }

    private async handleExpiration(userId: string, userData: PremiumUser): Promise<void> {
        try {
            const userRef = this.getUserRef(userId);

            if (userData.queuedPremium) {
                const queuedPremium = userData.queuedPremium;
                const now = Date.now();

                const newPremiumData: PremiumUser = {
                    tier: queuedPremium.tier,
                    type: queuedPremium.type,
                    activatedAt: now,
                    expiresAt: queuedPremium.type === PremiumType.PERMANENT ? null : now + (queuedPremium.duration || 0),
                    source: queuedPremium.source,
                    sourceId: queuedPremium.sourceId,
                    notificationsSent: {
                        threeDayWarning: false,
                        oneDayWarning: false,
                        expired: false
                    },
                    queuedPremium: null
                };

                await userRef.set(newPremiumData);

                await this.logTransaction(userId, TransactionType.EXPIRATION, userData.tier, userData.source, {
                    activatedAt: userData.activatedAt,
                    expiredAt: now,
                    queuedActivated: true
                });

                await this.logTransaction(userId, TransactionType.ACTIVATION, queuedPremium.tier, queuedPremium.source, {
                    type: queuedPremium.type,
                    activatedFromQueue: true
                });

                await this.sendQueuedPremiumActivationNotification(userId, userData.tier, queuedPremium.tier);

                const botClient = this.client as import('../types/BotClient.js').BotClient;
                if (botClient.premiumLogger) {
                    await botClient.premiumLogger.logPremiumExpiration(userId, userData.tier);
                }

                logger.info('PremiumManager', `Premium ${userData.tier} expirado para ${userId}, activado premium en cola: ${queuedPremium.tier}`);
            } else {
                await userRef.remove();

                await this.logTransaction(userId, TransactionType.EXPIRATION, userData.tier, userData.source, {
                    activatedAt: userData.activatedAt,
                    expiredAt: Date.now()
                });

                if (!userData.notificationsSent.expired) {
                    await this.sendExpirationNotification(userId, userData.tier);
                }

                const botClient = this.client as import('../types/BotClient.js').BotClient;
                if (botClient.premiumLogger) {
                    await botClient.premiumLogger.logPremiumExpiration(userId, userData.tier);
                }

                logger.info('PremiumManager', `Premium expirado para ${userId}`);
            }
        } catch (error) {
            logger.error('PremiumManager', 'Error manejando expiración', error);
        }
    }

    async checkUpcomingExpirations(): Promise<void> {
        try {
            if (!config.premium.enabled) {
                return;
            }

            const usersRef = this.firebaseManager.getRef('premium/users');
            const snapshot = await usersRef.get();

            if (!snapshot.exists()) return;

            const users = snapshot.val() as Record<string, PremiumUser>;
            const now = Date.now();

            for (const [userId, userData] of Object.entries(users)) {
                if (userData.type === PremiumType.PERMANENT || !userData.expiresAt) continue;

                const timeRemaining = userData.expiresAt - now;
                const daysRemaining = timeRemaining / 86400000;

                if (daysRemaining <= 3 && daysRemaining > 1 && !userData.notificationsSent.threeDayWarning) {
                    await this.sendExpirationWarning(userId, userData.tier, userData.expiresAt, 3);
                    await this.getUserRef(userId).update({ 'notificationsSent/threeDayWarning': true });
                } else if (daysRemaining <= 1 && daysRemaining > 0 && !userData.notificationsSent.oneDayWarning) {
                    await this.sendExpirationWarning(userId, userData.tier, userData.expiresAt, 1);
                    await this.getUserRef(userId).update({ 'notificationsSent/oneDayWarning': true });
                }
            }
        } catch (error) {
            logger.error('PremiumManager', 'Error verificando expiraciones próximas', error);
        }
    }

    private async sendExpirationWarning(userId: string, tier: PremiumTier, expiresAt: number, days: number): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);
            if (!user) return;

            const message = days === 3
                ? `Tu premium ${tier} expira en 3 días`
                : `Tu premium ${tier} expira mañana`;

            await user.send(message).catch(() => {
                logger.warn('PremiumManager', `No se pudo enviar notificación a ${userId}`);
            });
        } catch (error) {
            logger.error('PremiumManager', 'Error enviando advertencia de expiración', error);
        }
    }

    private async sendExpirationNotification(userId: string, tier: PremiumTier): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);
            if (!user) return;

            await user.send(`Tu premium ${tier} ha expirado`).catch(() => {
                logger.warn('PremiumManager', `No se pudo enviar notificación a ${userId}`);
            });
        } catch (error) {
            logger.error('PremiumManager', 'Error enviando notificación de expiración', error);
        }
    }

    private async sendQueuedPremiumActivationNotification(userId: string, expiredTier: PremiumTier, newTier: PremiumTier): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);
            if (!user) return;

            const message = `Tu premium ${expiredTier} ha expirado.\n\n✅ Se ha activado automáticamente tu premium ${newTier} permanente que tenías guardado.`;

            await user.send(message).catch(() => {
                logger.warn('PremiumManager', `No se pudo enviar notificación a ${userId}`);
            });
        } catch (error) {
            logger.error('PremiumManager', 'Error enviando notificación de activación de premium en cola', error);
        }
    }

    async startExpirationChecker(): Promise<void> {
        if (this.expirationInterval) return;

        this.expirationInterval = setInterval(async () => {
            await this.checkExpiredUsers();
            await this.checkUpcomingExpirations();
        }, PREMIUM.EXPIRATION_CHECK_INTERVAL_MS);

        logger.info('PremiumManager', 'Checker de expiraciones iniciado');
    }

    stopExpirationChecker(): void {
        if (this.expirationInterval) {
            clearInterval(this.expirationInterval);
            this.expirationInterval = null;
            logger.info('PremiumManager', 'Checker de expiraciones detenido');
        }
    }

    private async logTransaction(
        userId: string,
        type: TransactionType,
        tier: PremiumTier,
        source: PremiumSource,
        metadata: Record<string, unknown>
    ): Promise<void> {
        try {
            const transactionRef = this.getTransactionsRef().push();
            await transactionRef.set({
                userId,
                type,
                tier,
                source,
                timestamp: Date.now(),
                metadata
            });
        } catch (error) {
            logger.error('PremiumManager', 'Error registrando transacción', error);
        }
    }

    async getStats(): Promise<PremiumStats> {
        try {
            const usersRef = this.firebaseManager.getRef('premium/users');
            const snapshot = await usersRef.get();

            const stats: PremiumStats = {
                totalUsers: 0,
                activeUsers: 0,
                byTier: { basic: 0, pro: 0, ultra: 0 },
                bySource: { kofi: 0, topgg: 0, dbl: 0, code: 0, manual: 0 }
            };

            if (!snapshot.exists()) return stats;

            const users = snapshot.val() as Record<string, PremiumUser>;
            const now = Date.now();

            for (const userData of Object.values(users)) {
                stats.totalUsers++;

                const isActive = userData.type === PremiumType.PERMANENT ||
                    (userData.expiresAt !== null && now < userData.expiresAt);

                if (isActive) {
                    stats.activeUsers++;
                    stats.byTier[userData.tier]++;
                    stats.bySource[userData.source]++;
                }
            }

            return stats;
        } catch (error) {
            logger.error('PremiumManager', 'Error obteniendo estadísticas', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                byTier: { basic: 0, pro: 0, ultra: 0 },
                bySource: { kofi: 0, topgg: 0, dbl: 0, code: 0, manual: 0 }
            };
        }
    }

    private async updateStats(): Promise<void> {
        try {
            const stats = await this.getStats();
            await this.getStatsRef().set(stats);
        } catch (error) {
            logger.error('PremiumManager', 'Error actualizando estadísticas', error);
        }
    }

    getCooldownReduction(tier: PremiumTier): number {
        switch (tier) {
            case PremiumTier.BASIC:
                return PREMIUM.COOLDOWN_REDUCTION.BASIC;
            case PremiumTier.PRO:
                return PREMIUM.COOLDOWN_REDUCTION.PRO;
            case PremiumTier.ULTRA:
                return PREMIUM.COOLDOWN_REDUCTION.ULTRA;
            default:
                return 0;
        }
    }
}

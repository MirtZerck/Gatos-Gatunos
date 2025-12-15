import type { FirebaseAdminManager } from './FirebaseAdminManager.js';
import type { BotClient } from '../types/BotClient.js';
import type { KofiWebhookPayload } from '../types/Premium.js';
import { PremiumTier, PremiumType, PremiumSource } from '../types/Premium.js';
import { logger } from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../utils/constants.js';
import { getTierEmoji, getTierName } from '../utils/premiumHelpers.js';

export class DonationManager {
    private firebaseAdminManager: FirebaseAdminManager;
    private client: BotClient;

    constructor(firebaseAdminManager: FirebaseAdminManager, client: BotClient) {
        this.firebaseAdminManager = firebaseAdminManager;
        this.client = client;
    }

    async processKofiWebhook(payload: KofiWebhookPayload): Promise<boolean> {
        try {
            const amount = parseFloat(payload.amount);
            const email = payload.email;
            const fromName = payload.from_name;
            const messageFromSupporter = payload.message;

            logger.info('DonationManager', `Donación recibida: $${amount} de ${fromName} (${email})`);

            // Priorizar discord_userid si está disponible
            let userId = payload.discord_userid || null;

            // Si no hay discord_userid, buscar por email como fallback
            if (!userId) {
                userId = await this.findUserByEmail(email);
            } else {
                logger.info('DonationManager', `Usuario identificado por Discord ID: ${userId}`);
            }

            const { tier, duration } = this.mapAmountToTier(amount);

            if (!userId) {
                logger.warn('DonationManager', `No se encontró usuario con email ${email} ni discord_userid`);
                await this.notifyDonationNoUser(amount, fromName, email, messageFromSupporter);
                if (this.client.premiumLogger) {
                    await this.client.premiumLogger.logDonation(null, amount, tier, duration, fromName, email, messageFromSupporter);
                }
                return false;
            }

            if (!this.client.premiumManager) {
                logger.error('DonationManager', 'PremiumManager no disponible');
                return false;
            }

            const currentStatus = await this.client.premiumManager.getPremiumStatus(userId);

            const grantSuccess = await this.client.premiumManager.grantPremium({
                userId,
                tier,
                type: PremiumType.TEMPORARY,
                duration,
                source: PremiumSource.KOFI,
                sourceId: payload.kofi_transaction_id || 'unknown',
                smartGrant: true
            });

            if (!grantSuccess) {
                logger.warn('DonationManager', `No se pudo otorgar premium a ${userId} (tiene premium permanente)`);
                await this.notifyDonationRejected(userId, tier, amount);
                return false;
            }

            const newStatus = await this.client.premiumManager.getPremiumStatus(userId);

            await this.notifyDonation(userId, tier, duration, amount, currentStatus, newStatus);

            if (this.client.premiumLogger) {
                await this.client.premiumLogger.logDonation(userId, amount, tier, duration, fromName, email, messageFromSupporter);
            }

            logger.info('DonationManager', `Premium ${tier} otorgado a ${userId} por donación de $${amount}`);

            return true;
        } catch (error) {
            logger.error('DonationManager', 'Error procesando webhook de Ko-fi', error);
            return false;
        }
    }

    mapAmountToTier(amount: number): { tier: PremiumTier; duration: number } {
        if (amount >= 30) {
            return {
                tier: PremiumTier.ULTRA,
                duration: 180 * 86400000
            };
        } else if (amount >= 20) {
            return {
                tier: PremiumTier.ULTRA,
                duration: 120 * 86400000
            };
        } else if (amount >= 10) {
            return {
                tier: PremiumTier.ULTRA,
                duration: 60 * 86400000
            };
        } else if (amount >= 5) {
            return {
                tier: PremiumTier.PRO,
                duration: 30 * 86400000
            };
        } else if (amount >= 3) {
            return {
                tier: PremiumTier.BASIC,
                duration: 30 * 86400000
            };
        } else {
            return {
                tier: PremiumTier.BASIC,
                duration: 7 * 86400000
            };
        }
    }

    async findUserByEmail(email: string): Promise<string | null> {
        const usersRef = this.firebaseAdminManager.getRef('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

        if (!snapshot.exists()) {
            return null;
        }

        const userId = Object.keys(snapshot.val())[0];
        return userId;
    }

    async notifyDonation(userId: string, tier: PremiumTier, duration: number, amount: number, currentStatus?: any, newStatus?: any): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);

            const tierEmoji = getTierEmoji(tier);
            const tierName = getTierName(tier);

            const hadPremium = currentStatus?.hasPremium && currentStatus.tier;
            const isUpgrade = hadPremium && newStatus?.tier && this.getTierValue(newStatus.tier) > this.getTierValue(currentStatus.tier);
            const isSameTier = hadPremium && currentStatus.tier === tier;
            const isConversion = hadPremium && newStatus?.tier && this.getTierValue(tier) < this.getTierValue(currentStatus.tier);

            const finalTierEmoji = newStatus?.tier ? getTierEmoji(newStatus.tier) : tierEmoji;
            const finalTierName = newStatus?.tier ? getTierName(newStatus.tier) : tierName;

            let description = `${EMOJIS.GIFT} Gracias por tu donación de **$${amount}**\n\n`;

            if (isUpgrade) {
                description += `${EMOJIS.STAR} Tu premium ha sido actualizado a **${finalTierName}** ${finalTierEmoji}\n\n`;
            } else if (isSameTier) {
                const addedDays = newStatus && currentStatus.expiresAt && newStatus.expiresAt
                    ? Math.ceil((newStatus.expiresAt - currentStatus.expiresAt) / 86400000)
                    : Math.ceil(duration / 86400000);
                description += `Se añadieron **${addedDays} días** a tu **Premium ${finalTierName}** ${finalTierEmoji}\n\n`;
            } else if (isConversion) {
                const addedDays = newStatus && currentStatus.expiresAt && newStatus.expiresAt
                    ? Math.ceil((newStatus.expiresAt - currentStatus.expiresAt) / 86400000)
                    : 0;
                description += `Tu donación fue convertida a **${addedDays} días** de **Premium ${finalTierName}** ${finalTierEmoji}\n\n`;
            } else {
                const days = Math.ceil(duration / 86400000);
                description += `Has recibido **${days} días** de **Premium ${finalTierName}** ${finalTierEmoji}\n\n`;
            }

            if (newStatus?.expiresAt) {
                const totalDays = Math.ceil((newStatus.expiresAt - Date.now()) / 86400000);
                description += `• Tiempo total: **${totalDays} días**\n`;
            }

            description += `\nUsa \`/premium status\` para ver todos tus beneficios`;

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.GIFT} Premium Activado`)
                .setDescription(description)
                .setColor(COLORS.SUCCESS)
                .setTimestamp();

            await user.send({ embeds: [embed] });

            logger.info('DonationManager', `Notificación enviada a ${userId}`);
        } catch (error) {
            logger.error('DonationManager', `Error enviando notificación a ${userId}`, error);
        }
    }

    async notifyDonationRejected(userId: string, tier: PremiumTier, amount: number): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);

            const description =
                `${EMOJIS.GIFT} Gracias por tu donación de **$${amount}**\n\n` +
                `${EMOJIS.INFO} Ya tienes un premium permanente activo, por lo que tu donación no pudo ser procesada como premium.\n\n` +
                `Tu apoyo es muy apreciado. Por favor contacta con el desarrollador para resolver esto.`;

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.WARNING} Donación Recibida`)
                .setDescription(description)
                .setColor(COLORS.WARNING)
                .setTimestamp();

            await user.send({ embeds: [embed] });

            logger.info('DonationManager', `Notificación de rechazo enviada a ${userId}`);
        } catch (error) {
            logger.error('DonationManager', `Error enviando notificación de rechazo a ${userId}`, error);
        }
    }

    private getTierValue(tier: PremiumTier): number {
        const tierValues = {
            [PremiumTier.BASIC]: 1,
            [PremiumTier.PRO]: 2,
            [PremiumTier.ULTRA]: 3
        };
        return tierValues[tier];
    }

    async notifyDonationNoUser(amount: number, fromName: string, email: string, message?: string): Promise<void> {
        try {
            const logChannelId = process.env.PREMIUM_LOG_CHANNEL_ID;

            if (!logChannelId) {
                logger.warn('DonationManager', 'Canal de logs no configurado');
                return;
            }

            const logChannel = await this.client.channels.fetch(logChannelId);

            if (!logChannel || !logChannel.isTextBased() || !('send' in logChannel)) {
                logger.warn('DonationManager', 'Canal de logs inválido');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Donación Sin Usuario')
                .setDescription(
                    `Se recibió una donación pero no se encontró el usuario.\n\n` +
                    `**Monto:** $${amount}\n` +
                    `**De:** ${fromName}\n` +
                    `**Email:** ${email}\n` +
                    (message ? `**Mensaje:** ${message}\n` : '')
                )
                .setColor(COLORS.WARNING)
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('DonationManager', 'Error notificando donación sin usuario', error);
        }
    }
}

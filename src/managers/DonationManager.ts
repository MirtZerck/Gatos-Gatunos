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

            await this.client.premiumManager.grantPremium({
                userId,
                tier,
                type: duration === null ? PremiumType.PERMANENT : PremiumType.TEMPORARY,
                duration: duration === null ? undefined : duration,
                source: PremiumSource.KOFI,
                sourceId: payload.kofi_transaction_id || 'unknown'
            });

            await this.notifyDonation(userId, tier, duration, amount);

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

    mapAmountToTier(amount: number): { tier: PremiumTier; duration: number | null } {
        if (amount >= 25) {
            return {
                tier: PremiumTier.ULTRA,
                duration: null
            };
        } else if (amount >= 10) {
            return {
                tier: PremiumTier.ULTRA,
                duration: 30 * 86400000
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

    async notifyDonation(userId: string, tier: PremiumTier, duration: number | null, amount: number): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);

            const tierEmoji = getTierEmoji(tier);
            const tierName = getTierName(tier);

            let description = `${EMOJIS.GIFT} Gracias por tu donación de **$${amount}**\n\n`;
            description += `Has recibido **Premium ${tierName}** ${tierEmoji}\n\n`;

            if (duration === null) {
                description += `• Tipo: **Permanente**\n`;
                description += `• No expira nunca\n`;
            } else {
                const days = Math.ceil(duration / 86400000);
                description += `• Duración: **${days} días**\n`;
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

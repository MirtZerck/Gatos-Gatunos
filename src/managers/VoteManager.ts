import type { FirebaseAdminManager } from './FirebaseAdminManager.js';
import type { BotClient } from '../types/BotClient.js';
import type { TopggWebhookPayload, DblWebhookPayload } from '../types/Premium.js';
import { PremiumTier, PremiumType, PremiumSource } from '../types/Premium.js';
import { logger } from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../utils/constants.js';

export class VoteManager {
    private firebaseAdminManager: FirebaseAdminManager;
    private client: BotClient;

    constructor(firebaseAdminManager: FirebaseAdminManager, client: BotClient) {
        this.firebaseAdminManager = firebaseAdminManager;
        this.client = client;
    }

    async processTopggVote(payload: TopggWebhookPayload): Promise<boolean> {
        try {
            const userId = payload.user;
            const isWeekend = payload.isWeekend || false;

            logger.info('VoteManager', `Voto recibido de Top.gg: ${userId}${isWeekend ? ' (fin de semana)' : ''}`);

            const hours = isWeekend ? 24 : 12;
            const success = await this.grantVotePremium(userId, 'Top.gg', hours);

            if (success) {
                await this.notifyVote(userId, 'Top.gg', hours);
            }

            return success;
        } catch (error) {
            logger.error('VoteManager', 'Error procesando voto de Top.gg', error);
            return false;
        }
    }

    async processDBLVote(payload: DblWebhookPayload): Promise<boolean> {
        try {
            const userId = payload.id;

            logger.info('VoteManager', `Voto recibido de DBL: ${userId}`);

            const success = await this.grantVotePremium(userId, 'Discord Bot List', 12);

            if (success) {
                await this.notifyVote(userId, 'Discord Bot List', 12);
            }

            return success;
        } catch (error) {
            logger.error('VoteManager', 'Error procesando voto de DBL', error);
            return false;
        }
    }

    async grantVotePremium(userId: string, platform: string, hours: number): Promise<boolean> {
        if (!this.client.premiumManager) {
            logger.error('VoteManager', 'PremiumManager no disponible');
            return false;
        }

        const status = await this.client.premiumManager.getPremiumStatus(userId);

        if (status.hasPremium && status.type === PremiumType.TEMPORARY && status.expiresAt) {
            const success = await this.extendExistingPremium(userId, hours);
            if (success) {
                logger.info('VoteManager', `Premium extendido para ${userId} por ${hours}h (${platform})`);
            }
            return success;
        }

        const duration = hours * 3600000;

        await this.client.premiumManager.grantPremium({
            userId,
            tier: PremiumTier.BASIC,
            type: PremiumType.TEMPORARY,
            duration,
            source: platform === 'Top.gg' ? PremiumSource.TOPGG : PremiumSource.DBL,
            sourceId: `vote_${Date.now()}`
        });

        logger.info('VoteManager', `Premium básico otorgado a ${userId} por ${hours}h (${platform})`);

        return true;
    }

    async extendExistingPremium(userId: string, hours: number): Promise<boolean> {
        if (!this.client.premiumManager) {
            return false;
        }

        const status = await this.client.premiumManager.getPremiumStatus(userId);

        if (!status.hasPremium || !status.expiresAt || status.type === PremiumType.PERMANENT) {
            return false;
        }

        const additionalTime = hours * 3600000;
        const newExpiresAt = status.expiresAt + additionalTime;

        const userRef = this.firebaseAdminManager.getRef(`premium/users/${userId}`);
        await userRef.update({
            expiresAt: newExpiresAt
        });

        const transactionsRef = this.firebaseAdminManager.getRef('premium/transactions');
        await transactionsRef.push({
            userId,
            type: 'renewal',
            tier: status.tier!,
            source: 'vote',
            timestamp: Date.now(),
            metadata: {
                hours,
                newExpiresAt
            }
        });

        return true;
    }

    async notifyVote(userId: string, platform: string, hours: number): Promise<void> {
        try {
            const user = await this.client.users.fetch(userId);

            const description =
                `${EMOJIS.SUCCESS} Gracias por votar en **${platform}**\n\n` +
                `Has recibido **${hours} horas** de Premium Básico ${EMOJIS.PREMIUM_BASIC}\n\n` +
                `Usa \`/premium status\` para ver tu estado premium`;

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.STAR} Voto Registrado`)
                .setDescription(description)
                .setColor(COLORS.SUCCESS)
                .setTimestamp();

            await user.send({ embeds: [embed] });

            logger.info('VoteManager', `Notificación de voto enviada a ${userId}`);
        } catch (error) {
            logger.error('VoteManager', `Error enviando notificación a ${userId}`, error);
        }
    }
}

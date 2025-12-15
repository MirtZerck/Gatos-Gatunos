import { EmbedBuilder, TextBasedChannel, Client } from 'discord.js';
import { COLORS, EMOJIS } from './constants.js';
import { PremiumTier, PremiumSource } from '../types/Premium.js';
import { getTierEmoji, getTierName } from './premiumHelpers.js';
import { logger } from './logger.js';
import { config } from '../config.js';

export class PremiumLogger {
    private client: Client;
    private logChannelId: string | undefined;

    constructor(client: Client) {
        this.client = client;
        this.logChannelId = config.premium.logChannelId;
    }

    private async getLogChannel(): Promise<TextBasedChannel | null> {
        if (!this.logChannelId) {
            logger.warn('PremiumLogger', 'Canal de logs no configurado');
            return null;
        }

        try {
            const channel = await this.client.channels.fetch(this.logChannelId);
            if (!channel || !channel.isTextBased() || !('send' in channel)) {
                logger.warn('PremiumLogger', 'Canal de logs inválido');
                return null;
            }
            return channel as TextBasedChannel;
        } catch (error) {
            logger.error('PremiumLogger', 'Error obteniendo canal de logs', error);
            return null;
        }
    }

    async logVote(userId: string, platform: string, hours: number, isExtension: boolean = false): Promise<void> {
        const channel = await this.getLogChannel();
        if (!channel) return;

        try {
            const user = await this.client.users.fetch(userId).catch(() => null);
            const userTag = user ? `${user.tag} (${user.id})` : userId;

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.STAR} Voto Registrado - ${platform}`)
                .setColor(COLORS.SUCCESS)
                .addFields(
                    { name: 'Usuario', value: userTag, inline: true },
                    { name: 'Plataforma', value: platform, inline: true },
                    { name: 'Duración', value: `${hours} horas`, inline: true },
                    { name: 'Acción', value: isExtension ? 'Premium Extendido' : 'Premium Otorgado', inline: true },
                    { name: 'Tier', value: `${EMOJIS.PREMIUM_BASIC} Básico`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema de Votaciones' });

            if (user?.displayAvatarURL()) {
                embed.setThumbnail(user.displayAvatarURL());
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('PremiumLogger', 'Error enviando log de voto', error);
        }
    }

    async logDonation(
        userId: string | null,
        amount: number,
        tier: PremiumTier,
        duration: number | null,
        fromName: string,
        email: string,
        message?: string
    ): Promise<void> {
        const channel = await this.getLogChannel();
        if (!channel) return;

        try {
            const tierEmoji = getTierEmoji(tier);
            const tierName = getTierName(tier);

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.GIFT} Donación Recibida - Ko-fi`)
                .setColor(userId ? COLORS.SUCCESS : COLORS.WARNING)
                .addFields(
                    { name: 'Donante', value: fromName, inline: true },
                    { name: 'Email', value: email, inline: true },
                    { name: 'Monto', value: `$${amount}`, inline: true },
                    { name: 'Premium Tier', value: `${tierEmoji} ${tierName}`, inline: true },
                    {
                        name: 'Duración',
                        value: duration === null ? 'Permanente' : `${Math.ceil(duration / 86400000)} días`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema de Donaciones' });

            if (userId) {
                const user = await this.client.users.fetch(userId).catch(() => null);
                const userTag = user ? `${user.tag} (${user.id})` : userId;
                embed.addFields({ name: 'Usuario de Discord', value: userTag, inline: false });
                if (user?.displayAvatarURL()) {
                    embed.setThumbnail(user.displayAvatarURL());
                }
            } else {
                embed.setDescription('⚠️ **No se encontró usuario de Discord asociado al email**');
            }

            if (message) {
                embed.addFields({ name: 'Mensaje', value: message, inline: false });
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('PremiumLogger', 'Error enviando log de donación', error);
        }
    }

    async logPremiumGrant(
        userId: string,
        tier: PremiumTier,
        type: 'permanent' | 'temporary',
        duration: number | null,
        source: PremiumSource,
        grantedBy?: string
    ): Promise<void> {
        const channel = await this.getLogChannel();
        if (!channel) return;

        try {
            const user = await this.client.users.fetch(userId).catch(() => null);
            const userTag = user ? `${user.tag} (${user.id})` : userId;
            const tierEmoji = getTierEmoji(tier);
            const tierName = getTierName(tier);

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.SUCCESS} Premium Otorgado`)
                .setColor(COLORS.SUCCESS)
                .addFields(
                    { name: 'Usuario', value: userTag, inline: true },
                    { name: 'Tier', value: `${tierEmoji} ${tierName}`, inline: true },
                    { name: 'Tipo', value: type === 'permanent' ? 'Permanente' : 'Temporal', inline: true },
                    { name: 'Fuente', value: source, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema Premium' });

            if (duration !== null) {
                const days = Math.ceil(duration / 86400000);
                embed.addFields({ name: 'Duración', value: `${days} días`, inline: true });
            }

            if (grantedBy) {
                const granter = await this.client.users.fetch(grantedBy).catch(() => null);
                const granterTag = granter ? `${granter.tag} (${granter.id})` : grantedBy;
                embed.addFields({ name: 'Otorgado Por', value: granterTag, inline: true });
            }

            if (user?.displayAvatarURL()) {
                embed.setThumbnail(user.displayAvatarURL());
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('PremiumLogger', 'Error enviando log de otorgamiento', error);
        }
    }

    async logPremiumRevoke(userId: string, tier: PremiumTier, revokedBy: string, reason?: string): Promise<void> {
        const channel = await this.getLogChannel();
        if (!channel) return;

        try {
            const user = await this.client.users.fetch(userId).catch(() => null);
            const userTag = user ? `${user.tag} (${user.id})` : userId;
            const admin = await this.client.users.fetch(revokedBy).catch(() => null);
            const adminTag = admin ? `${admin.tag} (${admin.id})` : revokedBy;
            const tierEmoji = getTierEmoji(tier);
            const tierName = getTierName(tier);

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.ERROR} Premium Revocado`)
                .setColor(COLORS.DANGER)
                .addFields(
                    { name: 'Usuario', value: userTag, inline: true },
                    { name: 'Tier', value: `${tierEmoji} ${tierName}`, inline: true },
                    { name: 'Revocado Por', value: adminTag, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema Premium' });

            if (reason) {
                embed.addFields({ name: 'Razón', value: reason, inline: false });
            }

            if (user?.displayAvatarURL()) {
                embed.setThumbnail(user.displayAvatarURL());
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('PremiumLogger', 'Error enviando log de revocación', error);
        }
    }

    async logPremiumExpiration(userId: string, tier: PremiumTier): Promise<void> {
        const channel = await this.getLogChannel();
        if (!channel) return;

        try {
            const user = await this.client.users.fetch(userId).catch(() => null);
            const userTag = user ? `${user.tag} (${user.id})` : userId;
            const tierEmoji = getTierEmoji(tier);
            const tierName = getTierName(tier);

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.WARNING} Premium Expirado`)
                .setColor(COLORS.WARNING)
                .addFields(
                    { name: 'Usuario', value: userTag, inline: true },
                    { name: 'Tier', value: `${tierEmoji} ${tierName}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema Premium' });

            if (user?.displayAvatarURL()) {
                embed.setThumbnail(user.displayAvatarURL());
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('PremiumLogger', 'Error enviando log de expiración', error);
        }
    }

    async logWebhookError(platform: string, error: string, details?: Record<string, unknown>): Promise<void> {
        const channel = await this.getLogChannel();
        if (!channel) return;

        try {
            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.ERROR} Error en Webhook - ${platform}`)
                .setColor(COLORS.DANGER)
                .addFields(
                    { name: 'Plataforma', value: platform, inline: true },
                    { name: 'Error', value: error, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema de Webhooks' });

            if (details) {
                const detailsText = Object.entries(details)
                    .map(([key, value]) => `**${key}:** ${value}`)
                    .join('\n');
                embed.addFields({ name: 'Detalles', value: detailsText, inline: false });
            }

            await channel.send({ embeds: [embed] });
        } catch (err) {
            logger.error('PremiumLogger', 'Error enviando log de error de webhook', err);
        }
    }
}

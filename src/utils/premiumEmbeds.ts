import { EmbedBuilder } from 'discord.js';
import { PremiumTier, PremiumStatus, PremiumType } from '../types/Premium.js';
import {
    getTierEmoji,
    getTierColor,
    getTierName,
    formatTimeRemaining,
    getCooldownPercentageText,
    getTierBenefits
} from './premiumHelpers.js';
import { EMOJIS } from './constants.js';

export function createPremiumRequiredEmbed(requiredTier: PremiumTier, currentTier?: PremiumTier): EmbedBuilder {
    const tierEmoji = getTierEmoji(requiredTier);
    const tierName = getTierName(requiredTier);
    const tierColor = getTierColor(requiredTier);

    let description = `${EMOJIS.ERROR} Este comando requiere **Premium ${tierName}** ${tierEmoji}`;

    if (currentTier) {
        description += `\n\nTienes **Premium ${getTierName(currentTier)}** ${getTierEmoji(currentTier)}`;
        description += `\nNecesitas actualizar a **${tierName}** o superior`;
    } else {
        description += '\n\nActualmente no tienes premium activo';
    }

    description += '\n\n**Cómo obtener premium:**';
    description += '\n• Usa `/premium info` para ver los métodos disponibles';
    description += '\n• Vota en Top.gg o Discord Bot List (12h gratis)';
    description += '\n• Dona en Ko-fi para acceso completo';
    description += '\n• Canjea un código con `/premium redeem`';

    return new EmbedBuilder()
        .setTitle(`${tierEmoji} Premium Requerido`)
        .setDescription(description)
        .setColor(tierColor)
        .setTimestamp();
}

export function createPremiumStatusEmbed(status: PremiumStatus): EmbedBuilder {
    if (!status.hasPremium && !status.tier) {
        const description = status.systemDisabled
            ? `No tienes premium activo\n\n` +
              `${EMOJIS.WARNING} **Sistema Premium Deshabilitado**\n` +
              `El sistema premium está temporalmente deshabilitado\n\n` +
              `Usa \`/premium info\` para ver cómo obtenerlo`
            : `No tienes premium activo\n\n` +
              `Usa \`/premium info\` para ver cómo obtenerlo`;

        return new EmbedBuilder()
            .setTitle(`${EMOJIS.INFO} Estado Premium`)
            .setDescription(description)
            .setColor(0x808080)
            .setTimestamp();
    }

    const tierEmoji = getTierEmoji(status.tier!);
    const tierName = getTierName(status.tier!);
    const tierColor = getTierColor(status.tier!);

    const title = status.systemDisabled
        ? `${tierEmoji} Premium ${tierName} (Sistema Deshabilitado)`
        : `${tierEmoji} Premium ${tierName}`;

    let description = '';

    if (status.systemDisabled) {
        description += `${EMOJIS.WARNING} **Sistema Premium Temporalmente Deshabilitado**\n`;
        description += `Tu premium está guardado y será restaurado cuando el sistema se reactive\n\n`;
    }

    description += status.systemDisabled
        ? `Tienes **Premium ${tierName}** guardado\n\n`
        : `${EMOJIS.SUCCESS} Tienes **Premium ${tierName}** activo\n\n`;

    const benefits = getTierBenefits(status.tier!);
    description += `**Beneficios:**\n`;
    benefits.forEach(benefit => {
        description += `• ${benefit}\n`;
    });

    description += `\n**Detalles:**\n`;
    description += `• Tipo: ${status.type === PremiumType.PERMANENT ? 'Permanente' : 'Temporal'}\n`;
    description += `• Fuente: ${status.source}\n`;

    if (status.type === PremiumType.TEMPORARY && status.expiresAt) {
        description += `• Expira en: ${formatTimeRemaining(status.expiresAt)}\n`;
        description += `• Días restantes: ${status.daysRemaining || 0}\n`;
    }

    if (status.queuedPremium) {
        const queuedTierName = getTierName(status.queuedPremium.tier);
        const queuedTierEmoji = getTierEmoji(status.queuedPremium.tier);
        description += `\n📦 **Premium Guardado:**\n`;
        description += `• ${queuedTierEmoji} **${queuedTierName} Permanente**\n`;
        description += `• Se activará automáticamente cuando expire tu premium actual\n`;
    }

    if (status.systemDisabled) {
        description += `\n${EMOJIS.INFO} El tiempo de tu premium no está corriendo mientras el sistema está deshabilitado`;
    }

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(tierColor)
        .setTimestamp();
}

export function createPremiumInfoEmbed(): EmbedBuilder {
    const description =
        `${EMOJIS.PREMIUM} **Sistema Premium**\n\n` +
        `Obtén acceso a funciones exclusivas y beneficios especiales\n\n` +
        `**${EMOJIS.PREMIUM_BASIC} Premium Básico**\n` +
        `• ${getCooldownPercentageText(PremiumTier.BASIC)} de cooldown\n` +
        `• Comandos premium básicos\n` +
        `• Insignia de premium\n\n` +
        `**${EMOJIS.PREMIUM_PRO} Premium Pro**\n` +
        `• ${getCooldownPercentageText(PremiumTier.PRO)} de cooldown\n` +
        `• Comandos premium pro\n` +
        `• Funciones exclusivas de IA\n` +
        `• Insignia premium pro\n\n` +
        `**${EMOJIS.PREMIUM_ULTRA} Premium Ultra**\n` +
        `• ${getCooldownPercentageText(PremiumTier.ULTRA)} de cooldown\n` +
        `• Todos los comandos premium\n` +
        `• Sin límites en comandos personalizados\n` +
        `• Prioridad en soporte\n` +
        `• Insignia premium ultra\n\n` +
        `**Cómo obtener premium:**\n` +
        `${EMOJIS.STAR} **Votar** - 12h de Premium Básico gratis\n` +
        `${EMOJIS.GIFT} **Donar en Ko-fi** - Acceso completo por 30 días o permanente\n` +
        `${EMOJIS.SEARCH} **Canjear código** - Usa \`/premium redeem\``;

    return new EmbedBuilder()
        .setTitle(`${EMOJIS.PREMIUM} Sistema Premium`)
        .setDescription(description)
        .setColor(0xFFD700)
        .setTimestamp();
}

export function createCodeRedeemedEmbed(tier: PremiumTier, duration: number | null, currentStatus?: PremiumStatus, newStatus?: PremiumStatus): EmbedBuilder {
    const tierEmoji = getTierEmoji(tier);
    const tierName = getTierName(tier);

    const hadPremium = currentStatus?.hasPremium && currentStatus.tier;
    const isQueued = hadPremium && newStatus?.queuedPremium && newStatus.queuedPremium.tier === tier;
    const isUpgrade = hadPremium && newStatus?.tier && !isQueued && getTierValue(newStatus.tier) > getTierValue(currentStatus.tier!);
    const isSameTier = hadPremium && currentStatus.tier === tier && !isQueued;
    const isConversion = hadPremium && newStatus?.tier && !isQueued && getTierValue(tier) < getTierValue(currentStatus.tier!);

    const finalTierEmoji = newStatus?.tier ? getTierEmoji(newStatus.tier) : tierEmoji;
    const finalTierName = newStatus?.tier ? getTierName(newStatus.tier) : tierName;
    const finalTierColor = newStatus?.tier ? getTierColor(newStatus.tier) : getTierColor(tier);

    let description = `${EMOJIS.SUCCESS} Código canjeado exitosamente\n\n`;

    if (isQueued) {
        description += `📦 **Premium guardado en cola**\n`;
        description += `Tu código **${tierName} Permanente** ${tierEmoji} ha sido guardado\n\n`;
        description += `Actualmente estás usando **${finalTierName}** ${finalTierEmoji}\n`;
        description += `Cuando expire, se activará automáticamente tu **${tierName} Permanente** ${tierEmoji}\n\n`;
        description += `_¡Así podrás disfrutar de ${finalTierName} sin perder tu premium permanente!_\n`;
    } else if (isUpgrade) {
        description += `${EMOJIS.STAR} **Mejora aplicada**\n`;
        description += `Tu premium ha sido actualizado de **${getTierName(currentStatus.tier!)}** ${getTierEmoji(currentStatus.tier!)} a **${finalTierName}** ${finalTierEmoji}\n\n`;
    } else if (isSameTier) {
        const addedDays = newStatus && currentStatus.expiresAt && newStatus.expiresAt
            ? Math.ceil((newStatus.expiresAt - currentStatus.expiresAt) / 86400000)
            : Math.ceil((duration || 0) / 86400000);
        description += `**Tiempo extendido**\n`;
        description += `Se añadieron **${addedDays} días** a tu **Premium ${finalTierName}** ${finalTierEmoji}\n\n`;
    } else if (isConversion) {
        const addedDays = newStatus && currentStatus.expiresAt && newStatus.expiresAt
            ? Math.ceil((newStatus.expiresAt - currentStatus.expiresAt) / 86400000)
            : 0;
        description += `**Tiempo convertido**\n`;
        description += `El código **${tierName}** fue convertido a **${addedDays} días** de tu **Premium ${finalTierName}** ${finalTierEmoji}\n`;
        description += `_Los códigos de menor nivel otorgan menos tiempo a planes superiores_\n\n`;
    } else {
        description += `Has recibido **Premium ${finalTierName}** ${finalTierEmoji}\n\n`;
    }

    if (!isQueued) {
        if (newStatus?.expiresAt) {
            const totalDays = Math.ceil((newStatus.expiresAt - Date.now()) / 86400000);
            description += `• Tiempo total restante: **${totalDays} días**\n`;
            description += `• Expira: ${formatTimeRemaining(newStatus.expiresAt)}\n`;
        } else if (duration === null && !hadPremium) {
            description += `• Tipo: **Permanente**\n`;
            description += `• No expira nunca\n`;
        }
    }

    description += `\nUsa \`/premium status\` para ver todos tus beneficios`;

    return new EmbedBuilder()
        .setTitle(`${EMOJIS.GIFT} Premium Activado`)
        .setDescription(description)
        .setColor(finalTierColor)
        .setTimestamp();
}

function getTierValue(tier: PremiumTier): number {
    const tierValues = {
        [PremiumTier.BASIC]: 1,
        [PremiumTier.PRO]: 2,
        [PremiumTier.ULTRA]: 3
    };
    return tierValues[tier];
}

export function createPremiumActivatedEmbed(tier: PremiumTier, source: string): EmbedBuilder {
    const tierEmoji = getTierEmoji(tier);
    const tierName = getTierName(tier);
    const tierColor = getTierColor(tier);

    const description =
        `${EMOJIS.SUCCESS} Premium activado correctamente\n\n` +
        `Tier: **${tierName}** ${tierEmoji}\n` +
        `Fuente: **${source}**\n\n` +
        `Usa \`/premium status\` para ver todos tus beneficios`;

    return new EmbedBuilder()
        .setTitle(`${tierEmoji} Premium Activado`)
        .setDescription(description)
        .setColor(tierColor)
        .setTimestamp();
}

export function createPremiumExpiringEmbed(expiresAt: number, tier: PremiumTier): EmbedBuilder {
    const tierEmoji = getTierEmoji(tier);
    const tierName = getTierName(tier);
    const tierColor = getTierColor(tier);

    const description =
        `${EMOJIS.WARNING} Tu premium está por expirar\n\n` +
        `Tier: **${tierName}** ${tierEmoji}\n` +
        `Tiempo restante: **${formatTimeRemaining(expiresAt)}**\n\n` +
        `**Renueva tu premium:**\n` +
        `• Vota nuevamente en Top.gg o DBL\n` +
        `• Dona en Ko-fi para más tiempo\n` +
        `• Canjea un nuevo código`;

    return new EmbedBuilder()
        .setTitle(`${EMOJIS.CLOCK} Premium Expirando`)
        .setDescription(description)
        .setColor(tierColor)
        .setTimestamp();
}

export function createPremiumExpiredEmbed(tier: PremiumTier): EmbedBuilder {
    const tierEmoji = getTierEmoji(tier);
    const tierName = getTierName(tier);

    const description =
        `${EMOJIS.INFO} Tu premium ha expirado\n\n` +
        `Tu **Premium ${tierName}** ${tierEmoji} ha llegado a su fin\n\n` +
        `Gracias por tu apoyo. Puedes renovar en cualquier momento:\n` +
        `• Vota en Top.gg o Discord Bot List\n` +
        `• Dona en Ko-fi\n` +
        `• Usa \`/premium info\` para más detalles`;

    return new EmbedBuilder()
        .setTitle(`${EMOJIS.CLOCK} Premium Expirado`)
        .setDescription(description)
        .setColor(0x808080)
        .setTimestamp();
}

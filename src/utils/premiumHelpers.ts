import { PremiumTier, PremiumValidationResult } from '../types/Premium.js';
import { BotClient } from '../types/BotClient.js';
import { EMOJIS, COLORS, PREMIUM } from './constants.js';
import { Command, HybridCommand, SubcommandInfo } from '../types/Command.js';
import { ChatInputCommandInteraction } from 'discord.js';

export async function checkPremiumAccess(
    userId: string,
    requiredTier: PremiumTier,
    client: BotClient
): Promise<PremiumValidationResult> {
    if (!client.premiumManager) {
        return {
            hasAccess: false,
            requiredTier,
            message: 'Sistema premium no disponible'
        };
    }

    return await client.premiumManager.canUseCommand(userId, requiredTier);
}

export function compareTiers(tier1: PremiumTier, tier2: PremiumTier): number {
    const hierarchy = {
        [PremiumTier.BASIC]: 1,
        [PremiumTier.PRO]: 2,
        [PremiumTier.ULTRA]: 3
    };

    return hierarchy[tier1] - hierarchy[tier2];
}

export function hasSufficientTier(userTier: PremiumTier, requiredTier: PremiumTier): boolean {
    return compareTiers(userTier, requiredTier) >= 0;
}

export function getTierEmoji(tier: PremiumTier): string {
    switch (tier) {
        case PremiumTier.BASIC:
            return EMOJIS.PREMIUM_BASIC;
        case PremiumTier.PRO:
            return EMOJIS.PREMIUM_PRO;
        case PremiumTier.ULTRA:
            return EMOJIS.PREMIUM_ULTRA;
        default:
            return EMOJIS.PREMIUM;
    }
}

export function getTierColor(tier: PremiumTier): number {
    switch (tier) {
        case PremiumTier.BASIC:
            return COLORS.PREMIUM_BASIC;
        case PremiumTier.PRO:
            return COLORS.PREMIUM_PRO;
        case PremiumTier.ULTRA:
            return COLORS.PREMIUM_ULTRA;
        default:
            return COLORS.INFO;
    }
}

export function getTierName(tier: PremiumTier): string {
    switch (tier) {
        case PremiumTier.BASIC:
            return 'Básico';
        case PremiumTier.PRO:
            return 'Pro';
        case PremiumTier.ULTRA:
            return 'Ultra';
        default:
            return 'Desconocido';
    }
}

export function formatTimeRemaining(expiresAt: number): string {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) return 'Expirado';

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (days > 0) {
        return `${days} día${days !== 1 ? 's' : ''} ${hours}h`;
    } else if (hours > 0) {
        return `${hours} hora${hours !== 1 ? 's' : ''} ${minutes}m`;
    } else {
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
}

export function calculateCooldownReduction(tier: PremiumTier): number {
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

export function getCooldownPercentageText(tier: PremiumTier): string {
    const reduction = calculateCooldownReduction(tier);
    const percentage = Math.round(reduction * 100);
    return `-${percentage}%`;
}

export function getTierBenefits(tier: PremiumTier): string[] {
    const basicBenefits = [
        `${getCooldownPercentageText(PremiumTier.BASIC)} de cooldown en comandos`,
        'Acceso a comandos premium básicos',
        'Insignia de premium en perfil'
    ];

    const proBenefits = [
        `${getCooldownPercentageText(PremiumTier.PRO)} de cooldown en comandos`,
        'Acceso a comandos premium pro',
        'Funciones exclusivas de IA',
        'Insignia de premium pro'
    ];

    const ultraBenefits = [
        `${getCooldownPercentageText(PremiumTier.ULTRA)} de cooldown en comandos`,
        'Acceso a todos los comandos premium',
        'Sin límites en comandos personalizados',
        'Prioridad en soporte',
        'Insignia de premium ultra'
    ];

    switch (tier) {
        case PremiumTier.BASIC:
            return basicBenefits;
        case PremiumTier.PRO:
            return proBenefits;
        case PremiumTier.ULTRA:
            return ultraBenefits;
        default:
            return [];
    }
}

export function getSubcommandFromInteraction(
    interaction: ChatInputCommandInteraction,
    command: Command
): SubcommandInfo | null {
    if (command.type !== 'hybrid') return null;

    const subcommandName = interaction.options.getSubcommand(false);
    if (!subcommandName) return null;

    const hybridCommand = command as HybridCommand;
    if (!hybridCommand.subcommands) return null;

    return hybridCommand.subcommands.find(sub => sub.name === subcommandName) || null;
}

export function getSubcommandFromPrefix(
    commandName: string,
    args: string[],
    command: Command
): SubcommandInfo | null {
    if (command.type !== 'hybrid') return null;

    const hybridCommand = command as HybridCommand;
    if (!hybridCommand.subcommands) return null;

    const potentialSubcommand = commandName !== command.name ? commandName : args[0]?.toLowerCase();
    if (!potentialSubcommand) return null;

    return hybridCommand.subcommands.find(sub =>
        sub.name === potentialSubcommand || sub.aliases?.includes(potentialSubcommand)
    ) || null;
}

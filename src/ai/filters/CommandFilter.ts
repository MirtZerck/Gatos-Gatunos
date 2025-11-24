import { Message } from 'discord.js';
import { FilterResult, FilterLevel, FilterDecision, CooldownInfo, AIConfig, TokenBudget } from '../core/types.js';
import { RATE_LIMITS, FILTER_REASONS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

export class CommandFilter {
    private cooldowns: Map<string, CooldownInfo>;
    private messageCounters: Map<string, { count: number; resetAt: Date }>;
    private config: AIConfig;
    private tokenBudget: TokenBudget;

    constructor(config: AIConfig, initialTokenBudget: TokenBudget) {
        this.cooldowns = new Map();
        this.messageCounters = new Map();
        this.config = config;
        this.tokenBudget = initialTokenBudget;

        this.startCleanupInterval();
    }

    async filter(message: Message): Promise<FilterDecision> {
        const userId = message.author.id;
        const guildId = message.guildId || undefined;

        const tokenCheck = this.checkTokenBudget();
        if (tokenCheck.result === FilterResult.BLOCK) {
            return tokenCheck;
        }

        const cooldownCheck = this.checkCooldown(userId, guildId);
        if (cooldownCheck.result === FilterResult.BLOCK) {
            return cooldownCheck;
        }

        const rateLimitCheck = this.checkRateLimit(userId);
        if (rateLimitCheck.result === FilterResult.BLOCK) {
            return rateLimitCheck;
        }

        this.updateCooldown(userId, guildId);
        this.incrementMessageCounter(userId);

        return {
            result: FilterResult.ALLOW,
            reason: FILTER_REASONS.ALLOWED,
            level: FilterLevel.ADVANCED
        };
    }

    private checkTokenBudget(): FilterDecision {
        if (this.tokenBudget.remaining <= 0) {
            const resetIn = Math.ceil((this.tokenBudget.resetAt.getTime() - Date.now()) / 1000 / 60);
            return {
                result: FilterResult.BLOCK,
                reason: `${FILTER_REASONS.TOKEN_BUDGET_EXCEEDED} (se resetea en ${resetIn} minutos)`,
                level: FilterLevel.ADVANCED
            };
        }

        if (this.tokenBudget.remaining < 500) {
            logger.warn('CommandFilter', `Presupuesto de tokens bajo: ${this.tokenBudget.remaining} restantes`);
        }

        return {
            result: FilterResult.ALLOW,
            reason: 'Presupuesto de tokens disponible',
            level: FilterLevel.ADVANCED
        };
    }

    private checkCooldown(userId: string, guildId?: string): FilterDecision {
        const key = this.getCooldownKey(userId, guildId);
        const cooldown = this.cooldowns.get(key);

        if (!cooldown) {
            return {
                result: FilterResult.ALLOW,
                reason: 'Sin cooldown activo',
                level: FilterLevel.ADVANCED
            };
        }

        const now = Date.now();
        const timeSinceLastInteraction = now - cooldown.lastInteraction.getTime();
        const cooldownMs = this.config.cooldownSeconds * 1000;

        if (timeSinceLastInteraction < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastInteraction) / 1000);
            return {
                result: FilterResult.BLOCK,
                reason: `${FILTER_REASONS.COOLDOWN_ACTIVE} (${remainingSeconds}s restantes)`,
                level: FilterLevel.ADVANCED
            };
        }

        return {
            result: FilterResult.ALLOW,
            reason: 'Cooldown expirado',
            level: FilterLevel.ADVANCED
        };
    }

    private checkRateLimit(userId: string): FilterDecision {
        const counter = this.messageCounters.get(userId);

        if (!counter) {
            return {
                result: FilterResult.ALLOW,
                reason: 'Sin límite de tasa activo',
                level: FilterLevel.ADVANCED
            };
        }

        const now = new Date();

        if (now > counter.resetAt) {
            this.messageCounters.delete(userId);
            return {
                result: FilterResult.ALLOW,
                reason: 'Límite de tasa reseteado',
                level: FilterLevel.ADVANCED
            };
        }

        if (counter.count >= this.config.maxMessagesPerMinute) {
            const remainingSeconds = Math.ceil((counter.resetAt.getTime() - now.getTime()) / 1000);
            return {
                result: FilterResult.BLOCK,
                reason: `${FILTER_REASONS.RATE_LIMIT_EXCEEDED} (${remainingSeconds}s restantes)`,
                level: FilterLevel.ADVANCED
            };
        }

        return {
            result: FilterResult.ALLOW,
            reason: 'Límite de tasa dentro del rango',
            level: FilterLevel.ADVANCED
        };
    }

    private updateCooldown(userId: string, guildId?: string): void {
        const key = this.getCooldownKey(userId, guildId);
        const now = new Date();

        this.cooldowns.set(key, {
            userId,
            guildId,
            lastInteraction: now,
            messageCount: (this.cooldowns.get(key)?.messageCount || 0) + 1,
            resetAt: new Date(now.getTime() + this.config.cooldownSeconds * 1000)
        });
    }

    private incrementMessageCounter(userId: string): void {
        const counter = this.messageCounters.get(userId);
        const now = new Date();

        if (!counter || now > counter.resetAt) {
            this.messageCounters.set(userId, {
                count: 1,
                resetAt: new Date(now.getTime() + 60 * 1000)
            });
        } else {
            counter.count++;
        }
    }

    private getCooldownKey(userId: string, guildId?: string): string {
        return guildId ? `${guildId}:${userId}` : userId;
    }

    private startCleanupInterval(): void {
        setInterval(() => {
            this.cleanupExpiredCooldowns();
            this.cleanupExpiredCounters();
        }, 60 * 1000);
    }

    private cleanupExpiredCooldowns(): void {
        const now = Date.now();
        const expired: string[] = [];

        for (const [key, cooldown] of this.cooldowns.entries()) {
            if (now > cooldown.resetAt.getTime()) {
                expired.push(key);
            }
        }

        for (const key of expired) {
            this.cooldowns.delete(key);
        }

        if (expired.length > 0) {
            logger.debug('CommandFilter', `Limpiados ${expired.length} cooldowns expirados`);
        }
    }

    private cleanupExpiredCounters(): void {
        const now = new Date();
        const expired: string[] = [];

        for (const [userId, counter] of this.messageCounters.entries()) {
            if (now > counter.resetAt) {
                expired.push(userId);
            }
        }

        for (const userId of expired) {
            this.messageCounters.delete(userId);
        }

        if (expired.length > 0) {
            logger.debug('CommandFilter', `Limpiados ${expired.length} contadores expirados`);
        }
    }

    public updateTokenBudget(budget: TokenBudget): void {
        this.tokenBudget = budget;
    }

    public consumeTokens(amount: number): void {
        this.tokenBudget.used += amount;
        this.tokenBudget.remaining = Math.max(0, this.tokenBudget.daily - this.tokenBudget.used);

        logger.debug('CommandFilter', `Tokens consumidos: ${amount}, restantes: ${this.tokenBudget.remaining}`);
    }

    public getTokenBudget(): TokenBudget {
        return { ...this.tokenBudget };
    }

    public resetTokenBudget(): void {
        this.tokenBudget.used = 0;
        this.tokenBudget.remaining = this.tokenBudget.daily;
        this.tokenBudget.resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        logger.info('CommandFilter', 'Presupuesto de tokens reseteado');
    }

    public getStats(): {
        activeCooldowns: number;
        activeCounters: number;
        tokenBudget: TokenBudget;
    } {
        return {
            activeCooldowns: this.cooldowns.size,
            activeCounters: this.messageCounters.size,
            tokenBudget: this.getTokenBudget()
        };
    }
}

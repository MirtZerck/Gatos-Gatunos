import {
    Guild,
    AutoModerationRule,
    AutoModerationRuleTriggerType,
    AutoModerationActionType,
    AutoModerationRuleKeywordPresetType,
    DiscordAPIError
} from 'discord.js';
import { DiscordAutomodRuleConfig } from '../types/DiscordAutomod.js';
import { logger } from '../utils/logger.js';
import { CommandError, ErrorType } from '../utils/errorHandler.js';

export class DiscordAutomodManager {
    async createKeywordRule(
        guild: Guild,
        name: string,
        keywords: string[],
        actionType: 'block' | 'alert' | 'timeout',
        options?: {
            allowList?: string[];
            exemptRoles?: string[];
            exemptChannels?: string[];
            alertChannelId?: string;
            timeoutDuration?: number;
        }
    ): Promise<AutoModerationRule> {
        const actions: DiscordAutomodRuleConfig['actions'] = [];

        if (actionType === 'block' || actionType === 'timeout') {
            actions.push({
                type: AutoModerationActionType.BlockMessage,
                metadata: {
                    customMessage: 'Este mensaje fue bloqueado por contener palabras prohibidas.'
                }
            });
        }

        if (actionType === 'timeout' && options?.timeoutDuration) {
            actions.push({
                type: AutoModerationActionType.Timeout,
                metadata: {
                    durationSeconds: options.timeoutDuration
                }
            });
        }

        if (actionType === 'alert' && options?.alertChannelId) {
            actions.push({
                type: AutoModerationActionType.SendAlertMessage,
                metadata: {
                    channelId: options.alertChannelId
                }
            });
        }

        try {
            const rule = await guild.autoModerationRules.create({
                name,
                eventType: 1,
                triggerType: AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: {
                    keywordFilter: keywords,
                    allowList: options?.allowList || []
                },
                actions,
                enabled: true,
                exemptRoles: options?.exemptRoles || [],
                exemptChannels: options?.exemptChannels || []
            });

            logger.info('DiscordAutomod', `Regla de keywords creada: ${name}`);
            return rule;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 50035) {
                const message = error.message;
                if (message.includes('AUTO_MODERATION_MAX_RULES_OF_TYPE_EXCEEDED')) {
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        'Límite de reglas excedido',
                        '❌ Ya tienes el máximo de reglas de este tipo.\n\n' +
                        '**Solución:** Usa `/automod list` para ver tus reglas y `/automod delete` para eliminar alguna.'
                    );
                }
            }
            throw error;
        }
    }

    async createPresetRule(
        guild: Guild,
        name: string,
        presets: AutoModerationRuleKeywordPresetType[],
        actionType: 'block' | 'alert' | 'timeout',
        options?: {
            allowList?: string[];
            exemptRoles?: string[];
            exemptChannels?: string[];
            alertChannelId?: string;
            timeoutDuration?: number;
        }
    ): Promise<AutoModerationRule> {
        const actions: DiscordAutomodRuleConfig['actions'] = [];

        if (actionType === 'block' || actionType === 'timeout') {
            actions.push({
                type: AutoModerationActionType.BlockMessage,
                metadata: {
                    customMessage: 'Este mensaje fue bloqueado por el sistema de moderación automática.'
                }
            });
        }

        if (actionType === 'timeout' && options?.timeoutDuration) {
            actions.push({
                type: AutoModerationActionType.Timeout,
                metadata: {
                    durationSeconds: options.timeoutDuration
                }
            });
        }

        if (actionType === 'alert' && options?.alertChannelId) {
            actions.push({
                type: AutoModerationActionType.SendAlertMessage,
                metadata: {
                    channelId: options.alertChannelId
                }
            });
        }

        try {
            const rule = await guild.autoModerationRules.create({
                name,
                eventType: 1,
                triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                triggerMetadata: {
                    presets,
                    allowList: options?.allowList || []
                },
                actions,
                enabled: true,
                exemptRoles: options?.exemptRoles || [],
                exemptChannels: options?.exemptChannels || []
            });

            logger.info('DiscordAutomod', `Regla de preset creada: ${name}`);
            return rule;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 50035) {
                const message = error.message;
                if (message.includes('AUTO_MODERATION_MAX_RULES_OF_TYPE_EXCEEDED')) {
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        'Límite de reglas excedido',
                        '❌ Ya tienes el máximo de reglas de filtros predefinidos.\n\n' +
                        '**Solución:** Usa `/automod list` para ver tus reglas y `/automod delete` para eliminar alguna.'
                    );
                }
            }
            throw error;
        }
    }

    async createSpamRule(
        guild: Guild,
        name: string,
        actionType: 'block' | 'alert' | 'timeout',
        options?: {
            exemptRoles?: string[];
            exemptChannels?: string[];
            alertChannelId?: string;
            timeoutDuration?: number;
        }
    ): Promise<AutoModerationRule> {
        const actions: DiscordAutomodRuleConfig['actions'] = [];

        if (actionType === 'block' || actionType === 'timeout') {
            actions.push({
                type: AutoModerationActionType.BlockMessage,
                metadata: {
                    customMessage: 'Este mensaje fue bloqueado por spam.'
                }
            });
        }

        if (actionType === 'timeout' && options?.timeoutDuration) {
            actions.push({
                type: AutoModerationActionType.Timeout,
                metadata: {
                    durationSeconds: options.timeoutDuration
                }
            });
        }

        if (actionType === 'alert' && options?.alertChannelId) {
            actions.push({
                type: AutoModerationActionType.SendAlertMessage,
                metadata: {
                    channelId: options.alertChannelId
                }
            });
        }

        try {
            const rule = await guild.autoModerationRules.create({
                name,
                eventType: 1,
                triggerType: AutoModerationRuleTriggerType.Spam,
                actions,
                enabled: true,
                exemptRoles: options?.exemptRoles || [],
                exemptChannels: options?.exemptChannels || []
            });

            logger.info('DiscordAutomod', `Regla de spam creada: ${name}`);
            return rule;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 50035) {
                const message = error.message;
                if (message.includes('AUTO_MODERATION_MAX_RULES_OF_TYPE_EXCEEDED')) {
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        'Límite de reglas excedido',
                        '❌ Discord solo permite **1 regla anti-spam** por servidor.\n\n' +
                        '**Solución:**\n' +
                        '1. Usa `/automod list` para ver tu regla actual\n' +
                        '2. Usa `/automod delete id:REGLA_ID` para eliminarla\n' +
                        '3. Crea la nueva regla'
                    );
                }
            }
            throw error;
        }
    }

    async createMentionSpamRule(
        guild: Guild,
        name: string,
        mentionLimit: number,
        actionType: 'block' | 'alert' | 'timeout',
        options?: {
            exemptRoles?: string[];
            exemptChannels?: string[];
            alertChannelId?: string;
            timeoutDuration?: number;
            raidProtection?: boolean;
        }
    ): Promise<AutoModerationRule> {
        const actions: DiscordAutomodRuleConfig['actions'] = [];

        if (actionType === 'block' || actionType === 'timeout') {
            actions.push({
                type: AutoModerationActionType.BlockMessage,
                metadata: {
                    customMessage: 'Este mensaje fue bloqueado por menciones excesivas.'
                }
            });
        }

        if (actionType === 'timeout' && options?.timeoutDuration) {
            actions.push({
                type: AutoModerationActionType.Timeout,
                metadata: {
                    durationSeconds: options.timeoutDuration
                }
            });
        }

        if (actionType === 'alert' && options?.alertChannelId) {
            actions.push({
                type: AutoModerationActionType.SendAlertMessage,
                metadata: {
                    channelId: options.alertChannelId
                }
            });
        }

        try {
            const rule = await guild.autoModerationRules.create({
                name,
                eventType: 1,
                triggerType: AutoModerationRuleTriggerType.MentionSpam,
                triggerMetadata: {
                    mentionTotalLimit: mentionLimit,
                    mentionRaidProtectionEnabled: options?.raidProtection ?? false
                },
                actions,
                enabled: true,
                exemptRoles: options?.exemptRoles || [],
                exemptChannels: options?.exemptChannels || []
            });

            logger.info('DiscordAutomod', `Regla de mention spam creada: ${name}`);
            return rule;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 50035) {
                const message = error.message;
                if (message.includes('AUTO_MODERATION_MAX_RULES_OF_TYPE_EXCEEDED')) {
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        'Límite de reglas excedido',
                        '❌ Discord solo permite **1 regla de menciones** por servidor.\n\n' +
                        '**Solución:**\n' +
                        '1. Usa `/automod list` para ver tu regla actual\n' +
                        '2. Usa `/automod delete id:REGLA_ID` para eliminarla\n' +
                        '3. Crea la nueva regla'
                    );
                }
            }
            throw error;
        }
    }

    async listRules(guild: Guild): Promise<AutoModerationRule[]> {
        const rules = await guild.autoModerationRules.fetch();
        return Array.from(rules.values());
    }

    async getRule(guild: Guild, ruleId: string): Promise<AutoModerationRule | null> {
        try {
            return await guild.autoModerationRules.fetch(ruleId);
        } catch {
            return null;
        }
    }

    async deleteRule(guild: Guild, ruleId: string): Promise<boolean> {
        try {
            const rule = await this.getRule(guild, ruleId);
            if (!rule) {
                throw new CommandError(
                    ErrorType.NOT_FOUND,
                    'Regla no encontrada',
                    `❌ No se encontró una regla con el ID \`${ruleId}\`.\n\n` +
                    '**Verifica:**\n' +
                    '• Usa `/automod list` para ver los IDs correctos\n' +
                    '• Copia el ID completo sin espacios\n' +
                    '• La regla podría haber sido eliminada desde Discord'
                );
            }

            await guild.autoModerationRules.delete(ruleId);
            logger.info('DiscordAutomod', `Regla eliminada: ${ruleId}`);
            return true;
        } catch (error) {
            if (error instanceof CommandError) {
                throw error;
            }
            if (error instanceof DiscordAPIError) {
                if (error.code === 200006) {
                    throw new CommandError(
                        ErrorType.VALIDATION_ERROR,
                        'Regla protegida por Discord',
                        '🔒 **Esta regla no se puede eliminar**\n\n' +
                        'Discord crea automáticamente una regla de **Mention Spam** en servidores comunitarios que **no puede ser eliminada**. ' +
                        'Es una protección obligatoria para prevenir raids de menciones.\n\n' +
                        '**Alternativas:**\n' +
                        '• Puedes desactivarla temporalmente con `/automod toggle`\n' +
                        '• Puedes modificar sus configuraciones desde Discord (Server Settings > Safety Setup > AutoMod)'
                    );
                }
                if (error.code === 10066) {
                    throw new CommandError(
                        ErrorType.NOT_FOUND,
                        'Regla no encontrada',
                        `❌ No se encontró una regla con el ID \`${ruleId}\`.\n\n` +
                        '**Verifica:**\n' +
                        '• Usa `/automod list` para ver los IDs correctos\n' +
                        '• Copia el ID completo sin espacios\n' +
                        '• La regla podría haber sido eliminada desde Discord'
                    );
                }
            }
            logger.error('DiscordAutomod', 'Error eliminando regla:', error);
            throw error;
        }
    }

    async toggleRule(guild: Guild, ruleId: string, enabled: boolean): Promise<boolean> {
        try {
            const rule = await this.getRule(guild, ruleId);
            if (!rule) {
                throw new CommandError(
                    ErrorType.NOT_FOUND,
                    'Regla no encontrada',
                    `❌ No se encontró una regla con el ID \`${ruleId}\`.\n\n` +
                    '**Usa** `/automod list` para ver los IDs correctos.'
                );
            }

            await rule.edit({ enabled });
            logger.info('DiscordAutomod', `Regla ${enabled ? 'activada' : 'desactivada'}: ${ruleId}`);
            return true;
        } catch (error) {
            if (error instanceof CommandError) {
                throw error;
            }
            logger.error('DiscordAutomod', 'Error modificando regla:', error);
            throw error;
        }
    }

    async updateRuleExemptions(
        guild: Guild,
        ruleId: string,
        exemptRoles?: string[],
        exemptChannels?: string[]
    ): Promise<boolean> {
        try {
            const rule = await guild.autoModerationRules.fetch(ruleId);
            await rule.edit({
                exemptRoles: exemptRoles ?? rule.exemptRoles.map(r => r.id),
                exemptChannels: exemptChannels ?? rule.exemptChannels.map(c => c.id)
            });
            logger.info('DiscordAutomod', `Exenciones actualizadas para regla: ${ruleId}`);
            return true;
        } catch (error) {
            logger.error('DiscordAutomod', 'Error actualizando exenciones:', error);
            return false;
        }
    }
}

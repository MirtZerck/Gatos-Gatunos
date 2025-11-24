import { Message, GuildMember } from 'discord.js';
import { FilterResult, FilterLevel, FilterDecision, AIConfig } from '../core/types.js';
import { FILTER_REASONS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

export class ContextFilter {
    private config: AIConfig;

    constructor(config: AIConfig) {
        this.config = config;
    }

    async filter(message: Message): Promise<FilterDecision> {
        const contentCheck = this.checkContent(message);
        if (contentCheck.result === FilterResult.BLOCK) {
            return contentCheck;
        }

        const channelCheck = this.checkChannel(message);
        if (channelCheck.result === FilterResult.BLOCK) {
            return channelCheck;
        }

        const roleCheck = await this.checkRoles(message);
        if (roleCheck.result === FilterResult.BLOCK) {
            return roleCheck;
        }

        return {
            result: FilterResult.ALLOW,
            reason: FILTER_REASONS.ALLOWED,
            level: FilterLevel.ADVANCED
        };
    }

    private checkContent(message: Message): FilterDecision {
        const content = message.content.trim();

        if (!content || content.length === 0) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.INVALID_CONTENT,
                level: FilterLevel.ADVANCED
            };
        }

        const cleanContent = this.extractCleanContent(message);

        if (!cleanContent || cleanContent.length === 0) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.INVALID_CONTENT,
                level: FilterLevel.ADVANCED
            };
        }

        if (cleanContent.length < 2) {
            return {
                result: FilterResult.BLOCK,
                reason: 'Contenido demasiado corto',
                level: FilterLevel.ADVANCED
            };
        }

        if (cleanContent.length > 2000) {
            return {
                result: FilterResult.BLOCK,
                reason: 'Contenido demasiado largo',
                level: FilterLevel.ADVANCED
            };
        }

        return {
            result: FilterResult.ALLOW,
            reason: 'Contenido válido',
            level: FilterLevel.ADVANCED
        };
    }

    private checkChannel(message: Message): FilterDecision {
        const channelId = message.channelId;

        if (this.config.blockedChannels && this.config.blockedChannels.includes(channelId)) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.CHANNEL_BLOCKED,
                level: FilterLevel.ADVANCED
            };
        }

        if (this.config.allowedChannels && this.config.allowedChannels.length > 0) {
            if (!this.config.allowedChannels.includes(channelId)) {
                return {
                    result: FilterResult.BLOCK,
                    reason: FILTER_REASONS.CHANNEL_NOT_ALLOWED,
                    level: FilterLevel.ADVANCED
                };
            }
        }

        return {
            result: FilterResult.ALLOW,
            reason: 'Canal permitido',
            level: FilterLevel.ADVANCED
        };
    }

    private async checkRoles(message: Message): Promise<FilterDecision> {
        if (!this.config.allowedRoles || this.config.allowedRoles.length === 0) {
            return {
                result: FilterResult.ALLOW,
                reason: 'Sin restricción de roles',
                level: FilterLevel.ADVANCED
            };
        }

        if (!message.guild) {
            return {
                result: FilterResult.ALLOW,
                reason: 'Mensaje en DM, sin verificación de roles',
                level: FilterLevel.ADVANCED
            };
        }

        try {
            const member = await message.guild.members.fetch(message.author.id);

            if (!member) {
                return {
                    result: FilterResult.BLOCK,
                    reason: 'No se pudo obtener información del miembro',
                    level: FilterLevel.ADVANCED
                };
            }

            const hasAllowedRole = this.config.allowedRoles.some(roleId =>
                member.roles.cache.has(roleId)
            );

            if (!hasAllowedRole) {
                return {
                    result: FilterResult.BLOCK,
                    reason: 'Usuario no tiene roles permitidos',
                    level: FilterLevel.ADVANCED
                };
            }

            return {
                result: FilterResult.ALLOW,
                reason: 'Usuario tiene rol permitido',
                level: FilterLevel.ADVANCED
            };
        } catch (error) {
            logger.warn('ContextFilter', 'Error al verificar roles:', error);
            return {
                result: FilterResult.ALLOW,
                reason: 'Error al verificar roles, permitiendo por defecto',
                level: FilterLevel.ADVANCED
            };
        }
    }

    public extractCleanContent(message: Message): string {
        let content = message.content;

        const botMentionPattern = new RegExp(`<@!?${message.client.user?.id}>`, 'g');
        content = content.replace(botMentionPattern, '').trim();

        content = content.replace(/<@!?\d+>/g, '@usuario');
        content = content.replace(/<@&\d+>/g, '@rol');
        content = content.replace(/<#\d+>/g, '#canal');

        content = content.replace(/https?:\/\/\S+/g, '[enlace]');

        content = content.replace(/\s+/g, ' ').trim();

        return content;
    }

    public updateConfig(config: AIConfig): void {
        this.config = config;
        logger.debug('ContextFilter', 'Configuración actualizada');
    }

    public getConfig(): AIConfig {
        return { ...this.config };
    }
}

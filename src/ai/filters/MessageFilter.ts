import { Message } from 'discord.js';
import { FilterResult, FilterLevel, FilterDecision, MessageContext } from '../core/types.js';
import { COMMAND_PREFIXES, FILTER_REASONS, INTERACTION_COMMAND_PATTERNS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

export class MessageFilter {
    private botId: string;
    private aiMessageIds: Set<string>;

    constructor(botId: string, aiMessageIds: Set<string>) {
        this.botId = botId;
        this.aiMessageIds = aiMessageIds;
    }

    async filter(message: Message): Promise<FilterDecision> {
        const context = this.buildContext(message);

        logger.debug('MessageFilter', `Contexto: bot=${context.isBotMention}, reply=${context.isReplyToBot}, cmd=${context.isCommand}, interaction=${context.isInteractionCommand}`);

        const level1 = this.applyLevel1Filters(context);
        logger.debug('MessageFilter', `L1 resultado: ${level1.result} - ${level1.reason}`);

        if (level1.result !== FilterResult.ANALYZE) {
            return level1;
        }

        const level2 = await this.applyLevel2Filters(context);
        logger.debug('MessageFilter', `L2 resultado: ${level2.result} - ${level2.reason}`);

        if (level2.result !== FilterResult.ANALYZE) {
            return level2;
        }

        logger.debug('MessageFilter', 'Mensaje aprobado para análisis nivel 3');
        return {
            result: FilterResult.ANALYZE,
            reason: FILTER_REASONS.ALLOWED,
            level: FilterLevel.CONTEXT
        };
    }

    private buildContext(message: Message): MessageContext {
        const hasBotMentionInContent = message.mentions.users.has(this.botId);
        const isReplyToBot = message.reference?.messageId !== undefined;
        const isDM = message.channel.isDMBased();
        const isBotMention = (hasBotMentionInContent && !isReplyToBot) || isDM;
        const isCommand = this.isCommandMessage(message);
        const isInteractionCommand = this.isInteractionCommand(message);

        return {
            message,
            isCommand,
            isBotMention,
            isReplyToBot,
            isInteractionCommand,
            timestamp: message.createdAt
        };
    }

    private applyLevel1Filters(context: MessageContext): FilterDecision {
        const { message, isCommand, isBotMention, isReplyToBot } = context;

        if (message.author.bot) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.BOT_MESSAGE,
                level: FilterLevel.BASIC
            };
        }

        if (this.startsWithPrefix(message.content)) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.COMMAND_PREFIX,
                level: FilterLevel.BASIC
            };
        }

        if (isCommand) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.SLASH_COMMAND,
                level: FilterLevel.BASIC
            };
        }

        if (!isBotMention && !isReplyToBot) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.NO_BOT_MENTION,
                level: FilterLevel.BASIC
            };
        }

        return {
            result: FilterResult.ANALYZE,
            reason: 'Nivel 1 superado',
            level: FilterLevel.BASIC
        };
    }

    private async applyLevel2Filters(context: MessageContext): Promise<FilterDecision> {
        const { message, isReplyToBot, isInteractionCommand } = context;

        if (isInteractionCommand) {
            return {
                result: FilterResult.BLOCK,
                reason: FILTER_REASONS.INTERACTION_COMMAND,
                level: FilterLevel.CONTEXT
            };
        }

        if (isReplyToBot) {
            return await this.analyzeReplyContext(message);
        }

        return {
            result: FilterResult.ANALYZE,
            reason: 'Nivel 2 superado',
            level: FilterLevel.CONTEXT
        };
    }

    private async analyzeReplyContext(message: Message): Promise<FilterDecision> {
        try {
            if (!message.reference?.messageId) {
                return {
                    result: FilterResult.ANALYZE,
                    reason: 'No hay referencia al mensaje',
                    level: FilterLevel.CONTEXT
                };
            }

            const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

            if (referencedMessage.author.id !== this.botId) {
                return {
                    result: FilterResult.BLOCK,
                    reason: 'Respuesta a mensaje de otro usuario (no del bot)',
                    level: FilterLevel.CONTEXT
                };
            }

            if (this.aiMessageIds.has(referencedMessage.id)) {
                return {
                    result: FilterResult.ALLOW,
                    reason: 'Respuesta válida a conversación del bot (IA)',
                    level: FilterLevel.CONTEXT
                };
            }

            const isCommandResponse = this.isCommandResponse(referencedMessage);

            if (isCommandResponse) {
                return {
                    result: FilterResult.BLOCK,
                    reason: FILTER_REASONS.COMMAND_RESPONSE,
                    level: FilterLevel.CONTEXT
                };
            }

            if (referencedMessage.embeds.length > 0 || referencedMessage.components.length > 0) {
                return {
                    result: FilterResult.BLOCK,
                    reason: 'Mensaje del bot con embeds/componentes (probablemente comando)',
                    level: FilterLevel.CONTEXT
                };
            }

            return {
                result: FilterResult.BLOCK,
                reason: 'Mensaje del bot no identificado como conversación de IA',
                level: FilterLevel.CONTEXT
            };
        } catch (error) {
            logger.warn('MessageFilter', 'Error al analizar contexto de respuesta:', error);
            return {
                result: FilterResult.ANALYZE,
                reason: 'Error al verificar referencia',
                level: FilterLevel.CONTEXT
            };
        }
    }

    private isCommandMessage(message: Message): boolean {
        return message.interaction !== null;
    }

    private startsWithPrefix(content: string): boolean {
        const trimmed = content.trim();

        if (trimmed.startsWith(`<@${this.botId}>`) || trimmed.startsWith(`<@!${this.botId}>`)) {
            return false;
        }

        return COMMAND_PREFIXES.some(prefix => trimmed.startsWith(prefix));
    }

    private isInteractionCommand(message: Message): boolean {
        return INTERACTION_COMMAND_PATTERNS.some(pattern => pattern.test(message.content));
    }

    private isCommandResponse(message: Message): boolean {
        if (!message.embeds.length && !message.components.length) {
            return false;
        }

        if (message.embeds.length > 0) {
            const embed = message.embeds[0];
            const hasCommandFooter = embed.footer?.text?.includes('Solicitado por') || false;
            const hasCommandFields = embed.data.fields?.some(field =>
                field.name?.includes('Comando') ||
                field.name?.includes('Uso') ||
                field.name?.includes('Opciones')
            ) || false;

            return hasCommandFooter || hasCommandFields;
        }

        if (message.components.length > 0) {
            return true;
        }

        return false;
    }

    public getStats(): { processed: number; blocked: number; allowed: number } {
        return {
            processed: 0,
            blocked: 0,
            allowed: 0
        };
    }
}

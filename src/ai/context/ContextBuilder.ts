import { Message, TextChannel, DMChannel, Collection } from 'discord.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { PromptBuilder } from './PromptBuilder.js';
import { AIContext, SessionData, ConversationMessage } from '../core/types.js';
import { CHANNEL_CONTEXT_LIMITS, COMMAND_PREFIXES, INTERACTION_COMMAND_PATTERNS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

export class ContextBuilder {
    private promptBuilder: PromptBuilder;
    private memoryManager: MemoryManager;

    constructor(memoryManager: MemoryManager) {
        this.memoryManager = memoryManager;
        this.promptBuilder = new PromptBuilder();
    }

    async buildContext(message: Message): Promise<AIContext> {
        const userId = message.author.id;
        const guildId = message.guildId || undefined;

        const memoryData = await this.memoryManager.getUserMemory(userId);
        const sessionData = await this.memoryManager.getSessionData(userId, guildId);

        const promptContext = this.promptBuilder.buildContextMessage(message);
        const systemPrompt = this.promptBuilder.buildSystemPrompt(promptContext, memoryData || undefined);

        const conversationHistory = this.buildConversationHistory(
            sessionData,
            promptContext.isDM,
            promptContext.isMentioned
        );

        const channelContext = await this.getChannelContext(message, promptContext.isDM, promptContext.isMentioned);
        const fullHistory = [...channelContext, ...conversationHistory];

        const tokenCount = this.estimateTokenCount(systemPrompt, fullHistory);

        logger.debug('ContextBuilder', `Contexto construido: ${channelContext.length} ctx canal + ${conversationHistory.length} historial, ~${tokenCount} tokens`);

        return {
            shortTermMemory: [],
            relevantHistory: [],
            conversationHistory: fullHistory,
            systemPrompt,
            tokenCount
        };
    }

    private buildConversationHistory(
        sessionData: SessionData | null,
        isDM: boolean,
        isMentioned: boolean
    ): ConversationMessage[] {
        if (!sessionData || sessionData.messages.length === 0) {
            return [];
        }

        const maxMessages = this.getMaxHistoryMessages(isDM, isMentioned);
        const recentMessages = sessionData.messages.slice(-maxMessages);

        return recentMessages.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(part => ({
                text: this.promptBuilder.compressMessage(part.text)
            })),
            timestamp: msg.timestamp
        }));
    }

    private getMaxHistoryMessages(isDM: boolean, isMentioned: boolean): number {
        if (isDM) {
            return 10;
        } else if (isMentioned) {
            return 5;
        } else {
            return 3;
        }
    }

    private async getChannelContext(
        message: Message,
        isDM: boolean,
        isMentioned: boolean
    ): Promise<ConversationMessage[]> {
        const shouldFetchContext =
            (isDM && CHANNEL_CONTEXT_LIMITS.ENABLE_IN_DM) ||
            (isMentioned && CHANNEL_CONTEXT_LIMITS.ENABLE_IN_MENTIONS) ||
            (!isDM && !isMentioned && CHANNEL_CONTEXT_LIMITS.ENABLE_IN_CASUAL);

        if (!shouldFetchContext) {
            return [];
        }

        try {
            const channel = message.channel;
            if (!channel || (!channel.isTextBased())) {
                return [];
            }

            const fetchedMessages = await channel.messages.fetch({
                limit: CHANNEL_CONTEXT_LIMITS.MAX_MESSAGES + 5,
                before: message.id
            });

            const cutoffTime = Date.now() - (CHANNEL_CONTEXT_LIMITS.MAX_AGE_MINUTES * 60 * 1000);

            const relevantMessages = fetchedMessages
                .filter(msg => {
                    if (msg.createdTimestamp < cutoffTime) return false;
                    if (this.isIrrelevantMessage(msg)) return false;
                    return true;
                })
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .first(CHANNEL_CONTEXT_LIMITS.MAX_MESSAGES);

            const contextMessages: ConversationMessage[] = relevantMessages.map(msg => ({
                role: 'user' as const,
                parts: [{
                    text: this.formatChannelMessage(msg)
                }],
                timestamp: msg.createdAt
            }));

            logger.debug('ContextBuilder', `Obtenidos ${contextMessages.length} mensajes de contexto del canal`);
            return contextMessages;

        } catch (error) {
            logger.error('ContextBuilder', 'Error obteniendo contexto del canal', error);
            return [];
        }
    }

    private isIrrelevantMessage(msg: Message): boolean {
        if (msg.author.bot) return true;
        if (!msg.content || msg.content.trim().length === 0) return true;

        const content = msg.content.trim();

        for (const prefix of COMMAND_PREFIXES) {
            if (content.startsWith(prefix)) return true;
        }

        for (const pattern of INTERACTION_COMMAND_PATTERNS) {
            if (pattern.test(content)) return true;
        }

        return false;
    }

    private formatChannelMessage(msg: Message): string {
        const author = msg.author.displayName || msg.author.username;
        let content = msg.content;

        if (content.length > CHANNEL_CONTEXT_LIMITS.MAX_MESSAGE_LENGTH) {
            content = content.substring(0, CHANNEL_CONTEXT_LIMITS.MAX_MESSAGE_LENGTH - 3) + '...';
        }

        return `[${author}]: ${content}`;
    }

    private estimateTokenCount(systemPrompt: string, history: ConversationMessage[]): number {
        const systemTokens = Math.ceil(systemPrompt.length / 4);

        const historyTokens = history.reduce((sum, msg) => {
            const messageText = msg.parts.map((p: { text: string }) => p.text).join(' ');
            return sum + Math.ceil(messageText.length / 4);
        }, 0);

        return systemTokens + historyTokens;
    }

    async saveInteraction(
        message: Message,
        response: string,
        tokenUsage: number
    ): Promise<void> {
        const userId = message.author.id;
        const guildId = message.guildId || undefined;

        await this.memoryManager.addUserMessage(userId, message.content, guildId);
        await this.memoryManager.addModelMessage(userId, response, guildId);

        await this.memoryManager.updateStats(userId, 1, tokenUsage, guildId);

        logger.debug('ContextBuilder', `Interacción guardada para usuario ${userId}`);
    }
}

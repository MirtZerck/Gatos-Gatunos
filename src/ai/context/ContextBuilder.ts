import { Message } from 'discord.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { PromptBuilder } from './PromptBuilder.js';
import { AIContext, SessionData, ConversationMessage } from '../core/types.js';
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

        const tokenCount = this.estimateTokenCount(systemPrompt, conversationHistory);

        logger.debug('ContextBuilder', `Contexto construido: ${conversationHistory.length} mensajes, ~${tokenCount} tokens`);

        return {
            shortTermMemory: [],
            relevantHistory: [],
            conversationHistory,
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

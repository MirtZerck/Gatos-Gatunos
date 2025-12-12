import type { BotClient } from '../../types/BotClient.js';
import { ShortTermMemory } from './ShortTermMemory.js';
import { SessionMemory } from './SessionMemory.js';
import { LongTermMemory } from './LongTermMemory.js';
import {
    ConversationMessage,
    SessionData,
    UserMemoryData,
    AIContext
} from '../core/types.js';
import { logger } from '../../utils/logger.js';

export class MemoryManager {
    private client: BotClient;
    private shortTerm: ShortTermMemory;
    private session: SessionMemory;
    private longTerm: LongTermMemory;

    constructor(client: BotClient) {
        this.client = client;
        this.shortTerm = new ShortTermMemory();
        this.session = new SessionMemory(client);
        this.longTerm = new LongTermMemory(client);

        logger.info('MemoryManager', 'Sistema de memoria inicializado');
    }

    async addUserMessage(userId: string, content: string, guildId?: string): Promise<void> {
        const message: ConversationMessage = {
            role: 'user',
            parts: [{ text: content }],
            timestamp: new Date()
        };

        this.shortTerm.add(userId, message);
        await this.session.addMessage(userId, message, guildId);

        logger.debug('MemoryManager', `Mensaje de usuario guardado para ${userId}`);
    }

    async addModelMessage(userId: string, content: string, guildId?: string): Promise<void> {
        const message: ConversationMessage = {
            role: 'model',
            parts: [{ text: content }],
            timestamp: new Date()
        };

        this.shortTerm.add(userId, message);
        await this.session.addMessage(userId, message, guildId);

        logger.debug('MemoryManager', `Respuesta del modelo guardada para ${userId}`);
    }

    async buildContext(userId: string, guildId?: string): Promise<AIContext> {
        const shortTermMessages = this.shortTerm.get(userId);
        const sessionData = await this.session.getSession(userId, guildId);
        const longTermData = await this.longTerm.getUserMemory(userId);

        const conversationHistory = this.mergeHistory(shortTermMessages, sessionData);
        const systemPrompt = this.buildSystemPrompt(longTermData);

        return {
            shortTermMemory: [],
            relevantHistory: [],
            conversationHistory,
            systemPrompt,
            tokenCount: 0
        };
    }

    async addFact(userId: string, fact: string): Promise<void> {
        await this.longTerm.addFact(userId, fact);
    }

    async addPreference(userId: string, type: 'like' | 'dislike', item: string): Promise<void> {
        await this.longTerm.addPreference(userId, type, item);
    }

    async addRelationship(userId: string, targetUserId: string, name: string, relationship: string): Promise<void> {
        await this.longTerm.addRelationship(userId, targetUserId, name, relationship);
    }

    async updateStats(userId: string, messageCount: number, tokenUsage: number, guildId?: string): Promise<void> {
        await this.longTerm.updateStats(userId, messageCount, tokenUsage, guildId);
    }

    async getUserMemory(userId: string): Promise<UserMemoryData | null> {
        return await this.longTerm.getUserMemory(userId);
    }

    async getSession(userId: string, guildId?: string): Promise<SessionData | null> {
        return await this.session.getSession(userId, guildId);
    }

    async getSessionData(userId: string, guildId?: string): Promise<SessionData | null> {
        return await this.session.getSession(userId, guildId);
    }

    clearShortTerm(userId: string): void {
        this.shortTerm.clear(userId);
    }

    async endSession(userId: string, guildId?: string): Promise<void> {
        await this.session.endSession(userId, guildId);
    }

    async clearUserMemory(userId: string, guildId?: string, includeLongTerm: boolean = false): Promise<void> {
        this.shortTerm.clear(userId);
        await this.session.clearUserSession(userId, guildId);

        if (includeLongTerm) {
            await this.longTerm.clearUserMemory(userId);
            logger.info('MemoryManager', `Memoria completa (corto, mediano y largo plazo) limpiada para ${userId}`);
        } else {
            logger.info('MemoryManager', `Memoria de corto y mediano plazo limpiada para ${userId}`);
        }
    }

    async clearAllMemory(includeLongTerm: boolean = false): Promise<void> {
        this.shortTerm.clearAll();
        await this.session.clearAllSessions();

        if (includeLongTerm) {
            await this.longTerm.clearAllMemory();
            logger.info('MemoryManager', 'Toda la memoria (corto, mediano y largo plazo) ha sido limpiada');
        } else {
            logger.info('MemoryManager', 'Toda la memoria de corto y mediano plazo ha sido limpiada');
        }
    }

    private mergeHistory(
        shortTerm: ConversationMessage[],
        sessionData: SessionData | null
    ): ConversationMessage[] {
        const history: ConversationMessage[] = [];

        if (sessionData && sessionData.messages.length > 0) {
            history.push(...sessionData.messages);
        }

        if (shortTerm.length > 0) {
            for (const msg of shortTerm) {
                const isDuplicate = history.some(
                    h => h.timestamp?.getTime() === msg.timestamp?.getTime() &&
                         h.role === msg.role &&
                         h.parts[0]?.text === msg.parts[0]?.text
                );

                if (!isDuplicate) {
                    history.push(msg);
                }
            }
        }

        history.sort((a, b) => {
            const timeA = a.timestamp?.getTime() || 0;
            const timeB = b.timestamp?.getTime() || 0;
            return timeA - timeB;
        });

        return history;
    }

    private buildSystemPrompt(userData: UserMemoryData | null): string {
        let prompt = 'Eres Hitori Gotoh, una asistente virtual amigable y servicial.';

        if (userData) {
            const name = userData.profile.preferredNickname || userData.profile.displayName;
            prompt += `\n\nEstás conversando con ${name}.`;

            const facts = Array.from(userData.longTerm.facts.values())
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 3);

            if (facts.length > 0) {
                prompt += '\n\nInformación relevante del usuario:';
                for (const fact of facts) {
                    prompt += `\n- ${fact.fact}`;
                }
            }

            const preferences = Array.from(userData.longTerm.preferences.values())
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 3);

            if (preferences.length > 0) {
                prompt += '\n\nPreferencias:';
                for (const pref of preferences) {
                    const verb = pref.type === 'like' ? 'Le gusta' : 'No le gusta';
                    prompt += `\n- ${verb}: ${pref.item}`;
                }
            }
        }

        return prompt;
    }

    getStats() {
        return {
            shortTerm: this.shortTerm.getStats(),
            session: this.session.getStats(),
            longTerm: this.longTerm.getStats()
        };
    }

    async destroy(): Promise<void> {
        this.shortTerm.destroy();
        await this.session.destroy();
        await this.longTerm.destroy();

        logger.info('MemoryManager', 'Sistema de memoria detenido');
    }
}

import type { BotClient } from '../../types/BotClient.js';
import {
    UserProfile,
    UserFact,
    UserPreference,
    UserRelationship,
    UserMemoryData,
    LongTermMemoryData,
    UserStats
} from '../core/types.js';
import { RELEVANCE_WEIGHTS, CLEANUP_INTERVALS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

interface SerializedProfile {
    userId: string;
    displayName: string;
    preferredNickname?: string;
    firstSeen: string;
    lastInteraction: string;
}

interface SerializedFact {
    id: string;
    fact: string;
    relevance: number;
    confirmedCount: number;
    lastUsed: string;
    createdAt: string;
}

interface SerializedPreference {
    id: string;
    type: 'like' | 'dislike';
    item: string;
    relevance: number;
    lastUsed: string;
    createdAt: string;
}

interface SerializedRelationship {
    userId: string;
    name: string;
    relationship: string;
    relevance: number;
    lastUsed: string;
    createdAt: string;
}

interface SerializedServerStats {
    messageCount: number;
    lastSeen: string;
}

interface SerializedMemory {
    profile: SerializedProfile;
    facts: SerializedFact[];
    preferences: SerializedPreference[];
    relationships: SerializedRelationship[];
    stats: {
        totalMessages: number;
        lastInteraction: string;
        tokenUsage: number;
        servers: Record<string, SerializedServerStats>;
    };
}

const MAX_FACTS = 15;
const MAX_PREFERENCES = 10;
const MAX_RELATIONSHIPS = 5;
const MIN_RELEVANCE_THRESHOLD = 40;
const ARCHIVE_DAYS = 30;

export class LongTermMemory {
    private client: BotClient;
    private cache: Map<string, UserMemoryData>;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(client: BotClient) {
        this.client = client;
        this.cache = new Map();
        this.startCleanupTimer();
        logger.debug('LongTermMemory', 'Inicializado');
    }

    async getUserMemory(userId: string): Promise<UserMemoryData | null> {
        if (this.cache.has(userId)) {
            return this.cache.get(userId)!;
        }

        return await this.loadUserMemory(userId);
    }

    async addFact(userId: string, fact: string): Promise<void> {
        const memory = await this.ensureUserMemory(userId);
        const id = this.generateId();

        const userFact: UserFact = {
            id,
            fact,
            relevance: 50,
            confirmedCount: 1,
            lastUsed: new Date(),
            createdAt: new Date()
        };

        memory.longTerm.facts.set(id, userFact);

        await this.pruneCollection(memory.longTerm.facts, MAX_FACTS);
        await this.saveUserMemory(userId, memory);

        logger.debug('LongTermMemory', `Fact agregado para ${userId}`);
    }

    async addPreference(userId: string, type: 'like' | 'dislike', item: string): Promise<void> {
        const memory = await this.ensureUserMemory(userId);
        const id = this.generateId();

        const preference: UserPreference = {
            id,
            type,
            item,
            relevance: 50,
            lastUsed: new Date(),
            createdAt: new Date()
        };

        memory.longTerm.preferences.set(id, preference);

        await this.pruneCollection(memory.longTerm.preferences, MAX_PREFERENCES);
        await this.saveUserMemory(userId, memory);

        logger.debug('LongTermMemory', `Preferencia agregada para ${userId}`);
    }

    async addRelationship(userId: string, targetUserId: string, name: string, relationship: string): Promise<void> {
        const memory = await this.ensureUserMemory(userId);

        const rel: UserRelationship = {
            userId: targetUserId,
            name,
            relationship,
            relevance: 50,
            lastUsed: new Date(),
            createdAt: new Date()
        };

        memory.longTerm.relationships.set(targetUserId, rel);

        await this.pruneCollection(memory.longTerm.relationships, MAX_RELATIONSHIPS);
        await this.saveUserMemory(userId, memory);

        logger.debug('LongTermMemory', `Relación agregada para ${userId}`);
    }

    async updateStats(userId: string, messageCount: number, tokenUsage: number, guildId?: string): Promise<void> {
        const memory = await this.ensureUserMemory(userId);

        memory.stats.totalMessages += messageCount;
        memory.stats.lastInteraction = new Date();
        memory.stats.tokenUsage += tokenUsage;

        if (guildId) {
            const serverStats = memory.stats.servers.get(guildId) || { messageCount: 0, lastSeen: new Date() };
            serverStats.messageCount += messageCount;
            serverStats.lastSeen = new Date();
            memory.stats.servers.set(guildId, serverStats);
        }

        memory.profile.lastInteraction = new Date();

        await this.saveUserMemory(userId, memory);
    }

    async incrementFactRelevance(userId: string, factId: string): Promise<void> {
        const memory = await this.getUserMemory(userId);
        if (!memory) return;

        const fact = memory.longTerm.facts.get(factId);
        if (!fact) return;

        fact.relevance = Math.min(100, fact.relevance + 10);
        fact.confirmedCount++;
        fact.lastUsed = new Date();

        await this.saveUserMemory(userId, memory);
    }

    private async ensureUserMemory(userId: string): Promise<UserMemoryData> {
        let memory = await this.getUserMemory(userId);

        if (!memory) {
            memory = this.createUserMemory(userId);
            this.cache.set(userId, memory);
        }

        return memory;
    }

    private createUserMemory(userId: string): UserMemoryData {
        return {
            profile: {
                userId,
                displayName: userId,
                firstSeen: new Date(),
                lastInteraction: new Date()
            },
            longTerm: {
                facts: new Map(),
                preferences: new Map(),
                relationships: new Map()
            },
            stats: {
                totalMessages: 0,
                lastInteraction: new Date(),
                tokenUsage: 0,
                servers: new Map()
            }
        };
    }

    private async loadUserMemory(userId: string): Promise<UserMemoryData | null> {
        if (!this.client.firebaseAdminManager) {
            logger.warn('LongTermMemory', 'FirebaseAdminManager no disponible');
            return null;
        }

        try {
            const ref = this.client.firebaseAdminManager.getRef(`ai/memory/${userId}/longTerm`);
            const snapshot = await ref.get();

            if (!snapshot.exists()) {
                return null;
            }

            const data = snapshot.val();
            const memory = this.deserializeMemory(userId, data);
            this.cache.set(userId, memory);

            return memory;
        } catch (error) {
            logger.error('LongTermMemory', 'Error cargando memoria', error);
            return null;
        }
    }

    private async saveUserMemory(userId: string, memory: UserMemoryData): Promise<void> {
        if (!this.client.firebaseAdminManager) {
            return;
        }

        try {
            const ref = this.client.firebaseAdminManager.getRef(`ai/memory/${userId}/longTerm`);
            const serialized = this.serializeMemory(memory);
            await ref.set(serialized);

            this.cache.set(userId, memory);
        } catch (error) {
            logger.error('LongTermMemory', 'Error guardando memoria', error);
        }
    }

    private serializeMemory(memory: UserMemoryData): SerializedMemory {
        const profile: SerializedProfile = {
            userId: memory.profile.userId,
            displayName: memory.profile.displayName,
            firstSeen: memory.profile.firstSeen.toISOString(),
            lastInteraction: memory.profile.lastInteraction.toISOString()
        };

        if (memory.profile.preferredNickname) {
            profile.preferredNickname = memory.profile.preferredNickname;
        }

        return {
            profile,
            facts: Array.from(memory.longTerm.facts.values()).map(fact => ({
                id: fact.id,
                fact: fact.fact,
                relevance: fact.relevance,
                confirmedCount: fact.confirmedCount,
                lastUsed: fact.lastUsed.toISOString(),
                createdAt: fact.createdAt.toISOString()
            })),
            preferences: Array.from(memory.longTerm.preferences.values()).map(pref => ({
                id: pref.id,
                type: pref.type,
                item: pref.item,
                relevance: pref.relevance,
                lastUsed: pref.lastUsed.toISOString(),
                createdAt: pref.createdAt.toISOString()
            })),
            relationships: Array.from(memory.longTerm.relationships.values()).map(rel => ({
                userId: rel.userId,
                name: rel.name,
                relationship: rel.relationship,
                relevance: rel.relevance,
                lastUsed: rel.lastUsed.toISOString(),
                createdAt: rel.createdAt.toISOString()
            })),
            stats: {
                totalMessages: memory.stats.totalMessages,
                lastInteraction: memory.stats.lastInteraction.toISOString(),
                tokenUsage: memory.stats.tokenUsage,
                servers: Object.fromEntries(
                    Array.from(memory.stats.servers.entries()).map(([id, stats]) => [
                        id,
                        {
                            messageCount: stats.messageCount,
                            lastSeen: stats.lastSeen.toISOString()
                        }
                    ])
                )
            }
        };
    }

    private deserializeMemory(userId: string, data: SerializedMemory): UserMemoryData {
        const memory: UserMemoryData = {
            profile: {
                userId: data.profile?.userId || userId,
                displayName: data.profile?.displayName || userId,
                preferredNickname: data.profile?.preferredNickname,
                firstSeen: data.profile?.firstSeen ? new Date(data.profile.firstSeen) : new Date(),
                lastInteraction: data.profile?.lastInteraction ? new Date(data.profile.lastInteraction) : new Date()
            },
            longTerm: {
                facts: new Map(),
                preferences: new Map(),
                relationships: new Map()
            },
            stats: {
                totalMessages: data.stats?.totalMessages || 0,
                lastInteraction: data.stats?.lastInteraction ? new Date(data.stats.lastInteraction) : new Date(),
                tokenUsage: data.stats?.tokenUsage || 0,
                servers: new Map()
            }
        };

        if (data.facts) {
            for (const fact of data.facts) {
                memory.longTerm.facts.set(fact.id, {
                    id: fact.id,
                    fact: fact.fact,
                    relevance: fact.relevance,
                    confirmedCount: fact.confirmedCount,
                    lastUsed: new Date(fact.lastUsed),
                    createdAt: new Date(fact.createdAt)
                });
            }
        }

        if (data.preferences) {
            for (const pref of data.preferences) {
                memory.longTerm.preferences.set(pref.id, {
                    id: pref.id,
                    type: pref.type,
                    item: pref.item,
                    relevance: pref.relevance,
                    lastUsed: new Date(pref.lastUsed),
                    createdAt: new Date(pref.createdAt)
                });
            }
        }

        if (data.relationships) {
            for (const rel of data.relationships) {
                memory.longTerm.relationships.set(rel.userId, {
                    userId: rel.userId,
                    name: rel.name,
                    relationship: rel.relationship,
                    relevance: rel.relevance,
                    lastUsed: new Date(rel.lastUsed),
                    createdAt: new Date(rel.createdAt)
                });
            }
        }

        if (data.stats?.servers) {
            for (const [serverId, stats] of Object.entries(data.stats.servers)) {
                memory.stats.servers.set(serverId, {
                    messageCount: stats.messageCount,
                    lastSeen: new Date(stats.lastSeen)
                });
            }
        }

        return memory;
    }

    private async pruneCollection<T extends { relevance: number; lastUsed: Date; createdAt: Date }>(
        collection: Map<string, T>,
        maxSize: number
    ): Promise<void> {
        if (collection.size <= maxSize) {
            return;
        }

        const entries = Array.from(collection.entries());
        const scored = entries.map(([id, item]) => ({
            id,
            score: this.calculateRelevanceScore(item)
        }));

        scored.sort((a, b) => b.score - a.score);

        const toRemove = scored.slice(maxSize);
        for (const { id } of toRemove) {
            collection.delete(id);
        }
    }

    private calculateRelevanceScore(item: { relevance: number; lastUsed: Date; createdAt: Date }): number {
        const now = Date.now();
        const daysSinceUsed = (now - item.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceCreated = (now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);

        const recencyScore = Math.max(0, 100 - daysSinceUsed * 2);
        const baseRelevance = item.relevance;
        const ageScore = Math.max(0, 100 - daysSinceCreated);

        return (
            recencyScore * RELEVANCE_WEIGHTS.RECENCY +
            baseRelevance * RELEVANCE_WEIGHTS.IMPORTANCE +
            ageScore * RELEVANCE_WEIGHTS.ACCESS_FREQUENCY
        );
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private startCleanupTimer(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, CLEANUP_INTERVALS.LONG_TERM_MS);
    }

    private async cleanup(): Promise<void> {
        const threshold = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000;

        for (const [userId, memory] of this.cache.entries()) {
            let modified = false;

            const cleanCollection = <T extends { relevance: number; lastUsed: Date }>(
                collection: Map<string, T>
            ): number => {
                let removed = 0;
                for (const [id, item] of collection.entries()) {
                    if (item.lastUsed.getTime() < threshold && item.relevance < MIN_RELEVANCE_THRESHOLD) {
                        collection.delete(id);
                        removed++;
                    }
                }
                return removed;
            };

            const factsRemoved = cleanCollection(memory.longTerm.facts);
            const prefsRemoved = cleanCollection(memory.longTerm.preferences);
            const relsRemoved = cleanCollection(memory.longTerm.relationships);

            if (factsRemoved > 0 || prefsRemoved > 0 || relsRemoved > 0) {
                await this.saveUserMemory(userId, memory);
                logger.debug(
                    'LongTermMemory',
                    `Limpieza para ${userId}: ${factsRemoved} facts, ${prefsRemoved} prefs, ${relsRemoved} rels`
                );
            }
        }
    }

    getStats() {
        return {
            cachedUsers: this.cache.size,
            users: Array.from(this.cache.entries()).map(([userId, memory]) => ({
                userId,
                facts: memory.longTerm.facts.size,
                preferences: memory.longTerm.preferences.size,
                relationships: memory.longTerm.relationships.size,
                totalMessages: memory.stats.totalMessages
            }))
        };
    }

    async destroy(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        this.cache.clear();
        logger.debug('LongTermMemory', 'Destruido');
    }
}

import { Message, User } from 'discord.js';

export enum FilterResult {
    ALLOW = 'ALLOW',
    BLOCK = 'BLOCK',
    ANALYZE = 'ANALYZE'
}

export enum FilterLevel {
    BASIC = 1,
    CONTEXT = 2,
    ADVANCED = 3
}

export interface FilterDecision {
    result: FilterResult;
    reason: string;
    level: FilterLevel;
}

export interface MessageContext {
    message: Message;
    isCommand: boolean;
    isBotMention: boolean;
    isReplyToBot: boolean;
    isInteractionCommand: boolean;
    timestamp: Date;
}

export enum MemoryType {
    SHORT_TERM = 'SHORT_TERM',
    MEDIUM_TERM = 'MEDIUM_TERM',
    LONG_TERM = 'LONG_TERM'
}

export interface MemoryEntry {
    id: string;
    userId: string;
    guildId?: string;
    content: string;
    timestamp: Date;
    type: MemoryType;
    relevanceScore: number;
    accessCount: number;
    lastAccessed: Date;
    metadata?: {
        emotion?: string;
        topic?: string;
        importance?: number;
    };
}

export interface ConversationMessage {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
    timestamp?: Date;
}

export interface ConversationSession {
    userId: string;
    guildId?: string;
    messages: ConversationMessage[];
    startedAt: Date;
    lastInteraction: Date;
    messageCount: number;
}

export interface AIContext {
    shortTermMemory: MemoryEntry[];
    relevantHistory: MemoryEntry[];
    conversationHistory: ConversationMessage[];
    systemPrompt: string;
    tokenCount: number;
}

export interface AIResponse {
    content: string;
    tokenUsage: {
        prompt: number;
        completion: number;
        total: number;
    };
    processingTime: number;
    cached: boolean;
}

export interface CooldownInfo {
    userId: string;
    guildId?: string;
    lastInteraction: Date;
    messageCount: number;
    resetAt: Date;
}

export interface AIConfig {
    enabled: boolean;
    maxTokensPerDay: number;
    maxTokensPerRequest: number;
    cooldownSeconds: number;
    maxMessagesPerMinute: number;
    allowedChannels?: string[];
    blockedChannels?: string[];
    allowedRoles?: string[];
}

export interface ProviderConfig {
    apiKey: string;
    model: string;
    temperature: number;
    maxOutputTokens: number;
    topP: number;
    topK: number;
}

export interface TokenBudget {
    daily: number;
    used: number;
    remaining: number;
    resetAt: Date;
}

export interface MessageMetrics {
    totalProcessed: number;
    totalBlocked: number;
    totalResponded: number;
    averageResponseTime: number;
    tokenUsage: TokenBudget;
}

export interface UserProfile {
    userId: string;
    displayName: string;
    preferredNickname?: string;
    firstSeen: Date;
    lastInteraction: Date;
}

export interface UserFact {
    id: string;
    fact: string;
    relevance: number;
    confirmedCount: number;
    lastUsed: Date;
    createdAt: Date;
}

export interface UserPreference {
    id: string;
    type: 'like' | 'dislike';
    item: string;
    relevance: number;
    lastUsed: Date;
    createdAt: Date;
}

export interface UserRelationship {
    userId: string;
    name: string;
    relationship: string;
    relevance: number;
    lastUsed: Date;
    createdAt: Date;
}

export interface SessionData {
    userId: string;
    guildId?: string;
    messages: ConversationMessage[];
    startTime: Date;
    lastInteraction: Date;
    summary?: string;
    messageCount: number;
}

export interface SessionHistory {
    date: string;
    summary: string;
    messageCount: number;
}

export interface LongTermMemoryData {
    facts: Map<string, UserFact>;
    preferences: Map<string, UserPreference>;
    relationships: Map<string, UserRelationship>;
}

export interface UserMemoryData {
    profile: UserProfile;
    longTerm: LongTermMemoryData;
    stats: UserStats;
}

export interface UserStats {
    totalMessages: number;
    lastInteraction: Date;
    tokenUsage: number;
    servers: Map<string, ServerStats>;
}

export interface ServerStats {
    messageCount: number;
    lastSeen: Date;
}

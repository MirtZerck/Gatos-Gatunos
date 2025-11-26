import type { BotClient } from '../../types/BotClient.js';
import { SessionData, SessionHistory, ConversationMessage } from '../core/types.js';
import { MEMORY_LIMITS, CLEANUP_INTERVALS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

interface SerializedMessage {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
    timestamp?: string;
}

interface SerializedSessionData {
    userId: string;
    guildId?: string;
    messages: SerializedMessage[];
    startTime: string;
    lastInteraction: string;
    summary?: string;
    messageCount: number;
}

export class SessionMemory {
    private client: BotClient;
    private activeSessions: Map<string, SessionData>;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(client: BotClient) {
        this.client = client;
        this.activeSessions = new Map();
        this.startCleanupTimer();
        logger.debug('SessionMemory', 'Inicializado');
    }

    async getSession(userId: string, guildId?: string): Promise<SessionData | null> {
        const sessionKey = this.getSessionKey(userId, guildId);

        if (this.activeSessions.has(sessionKey)) {
            const session = this.activeSessions.get(sessionKey)!;

            if (this.isSessionExpired(session)) {
                await this.archiveSession(session);
                this.activeSessions.delete(sessionKey);
                return null;
            }

            return session;
        }

        return await this.loadSession(userId, guildId);
    }

    async addMessage(userId: string, message: ConversationMessage, guildId?: string): Promise<void> {
        const sessionKey = this.getSessionKey(userId, guildId);
        let session = this.activeSessions.get(sessionKey);

        if (!session) {
            session = await this.createSession(userId, guildId);
        }

        session.messages.push(message);
        session.lastInteraction = new Date();
        session.messageCount++;

        if (session.messages.length > MEMORY_LIMITS.MEDIUM_TERM.MAX_ENTRIES) {
            session.messages.shift();
        }

        this.activeSessions.set(sessionKey, session);
        await this.saveSession(session);

        logger.debug('SessionMemory', `Mensaje agregado a sesión de ${userId}`);
    }

    async endSession(userId: string, guildId?: string): Promise<void> {
        const sessionKey = this.getSessionKey(userId, guildId);
        const session = this.activeSessions.get(sessionKey);

        if (session) {
            await this.archiveSession(session);
            this.activeSessions.delete(sessionKey);
            logger.debug('SessionMemory', `Sesión finalizada para ${userId}`);
        }
    }

    async clearUserSession(userId: string, guildId?: string): Promise<void> {
        if (!this.client.firebaseAdminManager) {
            return;
        }

        try {
            const sessionKey = this.getSessionKey(userId, guildId);
            this.activeSessions.delete(sessionKey);

            const currentRef = this.client.firebaseAdminManager.getRef(`ai/memory/${userId}/sessions/current`);
            await currentRef.remove();

            logger.info('SessionMemory', `Sesión limpiada para ${userId}`);
        } catch (error) {
            logger.error('SessionMemory', 'Error limpiando sesión', error);
        }
    }

    async clearAllSessions(): Promise<void> {
        if (!this.client.firebaseAdminManager) {
            return;
        }

        try {
            this.activeSessions.clear();
            logger.info('SessionMemory', 'Todas las sesiones activas han sido limpiadas');
        } catch (error) {
            logger.error('SessionMemory', 'Error limpiando todas las sesiones', error);
        }
    }

    private async createSession(userId: string, guildId?: string): Promise<SessionData> {
        return {
            userId,
            guildId,
            messages: [],
            startTime: new Date(),
            lastInteraction: new Date(),
            messageCount: 0
        };
    }

    private async loadSession(userId: string, guildId?: string): Promise<SessionData | null> {
        if (!this.client.firebaseAdminManager) {
            logger.warn('SessionMemory', 'FirebaseAdminManager no disponible');
            return null;
        }

        try {
            const ref = this.client.firebaseAdminManager.getRef(`ai/memory/${userId}/sessions/current`);
            const snapshot = await ref.get();

            if (!snapshot.exists()) {
                return null;
            }

            const data = snapshot.val() as SerializedSessionData;
            const session: SessionData = {
                userId: data.userId,
                guildId: data.guildId,
                messages: (data.messages || []).map((msg: SerializedMessage) => ({
                    role: msg.role,
                    parts: msg.parts,
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined
                })),
                startTime: new Date(data.startTime),
                lastInteraction: new Date(data.lastInteraction),
                summary: data.summary,
                messageCount: data.messageCount || 0
            };

            if (this.isSessionExpired(session)) {
                await this.archiveSession(session);
                return null;
            }

            this.activeSessions.set(this.getSessionKey(userId, guildId), session);
            return session;
        } catch (error) {
            logger.error('SessionMemory', 'Error cargando sesión', error);
            return null;
        }
    }

    private async saveSession(session: SessionData): Promise<void> {
        if (!this.client.firebaseAdminManager) {
            return;
        }

        try {
            const ref = this.client.firebaseAdminManager.getRef(
                `ai/memory/${session.userId}/sessions/current`
            );

            const data: Partial<SerializedSessionData> = {
                userId: session.userId,
                messages: session.messages.map(msg => ({
                    role: msg.role,
                    parts: msg.parts,
                    timestamp: msg.timestamp?.toISOString()
                })),
                startTime: session.startTime.toISOString(),
                lastInteraction: session.lastInteraction.toISOString(),
                messageCount: session.messageCount
            };

            if (session.guildId) {
                data.guildId = session.guildId;
            }

            if (session.summary) {
                data.summary = session.summary;
            }

            await ref.set(data);
        } catch (error) {
            logger.error('SessionMemory', 'Error guardando sesión', error);
        }
    }

    private async archiveSession(session: SessionData): Promise<void> {
        if (!this.client.firebaseAdminManager || session.messageCount === 0) {
            return;
        }

        try {
            const dateKey = session.startTime.toISOString().split('T')[0];
            const ref = this.client.firebaseAdminManager.getRef(
                `ai/memory/${session.userId}/sessions/history/${dateKey}`
            );

            const history: SessionHistory = {
                date: dateKey,
                summary: session.summary || `${session.messageCount} mensajes`,
                messageCount: session.messageCount
            };

            await ref.set(history);

            const currentRef = this.client.firebaseAdminManager.getRef(
                `ai/memory/${session.userId}/sessions/current`
            );
            await currentRef.remove();

            logger.debug('SessionMemory', `Sesión archivada para ${session.userId}`);
        } catch (error) {
            logger.error('SessionMemory', 'Error archivando sesión', error);
        }
    }

    private isSessionExpired(session: SessionData): boolean {
        const age = Date.now() - session.lastInteraction.getTime();
        const maxAge = MEMORY_LIMITS.MEDIUM_TERM.MAX_AGE_HOURS * 60 * 60 * 1000;
        return age > maxAge;
    }

    private getSessionKey(userId: string, guildId?: string): string {
        return guildId ? `${userId}:${guildId}` : userId;
    }

    private startCleanupTimer(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, CLEANUP_INTERVALS.MEDIUM_TERM_MS);
    }

    private async cleanup(): Promise<void> {
        let cleaned = 0;

        for (const [key, session] of this.activeSessions.entries()) {
            if (this.isSessionExpired(session)) {
                await this.archiveSession(session);
                this.activeSessions.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('SessionMemory', `Limpieza automática: ${cleaned} sesiones archivadas`);
        }
    }

    getStats() {
        return {
            activeSessions: this.activeSessions.size,
            sessions: Array.from(this.activeSessions.values()).map(session => ({
                userId: session.userId,
                messageCount: session.messageCount,
                age: Date.now() - session.startTime.getTime(),
                lastInteraction: session.lastInteraction
            }))
        };
    }

    async destroy(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        for (const session of this.activeSessions.values()) {
            await this.archiveSession(session);
        }

        this.activeSessions.clear();
        logger.debug('SessionMemory', 'Destruido');
    }
}

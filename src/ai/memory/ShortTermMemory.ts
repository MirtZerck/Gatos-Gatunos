import { ConversationMessage } from '../core/types.js';
import { MEMORY_LIMITS, CLEANUP_INTERVALS } from '../core/constants.js';
import { logger } from '../../utils/logger.js';

interface CacheEntry {
    messages: ConversationMessage[];
    timestamp: Date;
    accessCount: number;
}

export class ShortTermMemory {
    private cache: Map<string, CacheEntry>;
    private cleanupInterval?: NodeJS.Timeout;

    constructor() {
        this.cache = new Map();
        this.startCleanupTimer();
        logger.debug('ShortTermMemory', 'Inicializado');
    }

    add(userId: string, message: ConversationMessage): void {
        const entry = this.cache.get(userId);

        if (entry) {
            entry.messages.push(message);
            entry.timestamp = new Date();
            entry.accessCount++;

            if (entry.messages.length > MEMORY_LIMITS.SHORT_TERM.MAX_ENTRIES) {
                entry.messages.shift();
            }
        } else {
            this.cache.set(userId, {
                messages: [message],
                timestamp: new Date(),
                accessCount: 1
            });
        }

        logger.debug('ShortTermMemory', `Mensaje agregado para usuario ${userId}`);
    }

    get(userId: string): ConversationMessage[] {
        const entry = this.cache.get(userId);

        if (!entry) {
            return [];
        }

        const age = Date.now() - entry.timestamp.getTime();
        const maxAge = MEMORY_LIMITS.SHORT_TERM.MAX_AGE_MINUTES * 60 * 1000;

        if (age > maxAge) {
            this.cache.delete(userId);
            logger.debug('ShortTermMemory', `Cache expirado para usuario ${userId}`);
            return [];
        }

        entry.accessCount++;
        entry.timestamp = new Date();

        return [...entry.messages];
    }

    clear(userId: string): void {
        const deleted = this.cache.delete(userId);
        if (deleted) {
            logger.debug('ShortTermMemory', `Cache limpiado para usuario ${userId}`);
        }
    }

    clearAll(): void {
        const size = this.cache.size;
        this.cache.clear();
        logger.debug('ShortTermMemory', `Cache completo limpiado (${size} entradas)`);
    }

    has(userId: string): boolean {
        return this.cache.has(userId);
    }

    getStats() {
        return {
            totalEntries: this.cache.size,
            entries: Array.from(this.cache.entries()).map(([userId, entry]) => ({
                userId,
                messageCount: entry.messages.length,
                age: Date.now() - entry.timestamp.getTime(),
                accessCount: entry.accessCount
            }))
        };
    }

    private startCleanupTimer(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, CLEANUP_INTERVALS.SHORT_TERM_MS);
    }

    private cleanup(): void {
        const maxAge = MEMORY_LIMITS.SHORT_TERM.MAX_AGE_MINUTES * 60 * 1000;
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, entry] of this.cache.entries()) {
            const age = now - entry.timestamp.getTime();

            if (age > maxAge) {
                this.cache.delete(userId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('ShortTermMemory', `Limpieza automática: ${cleaned} entradas eliminadas`);
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.cache.clear();
        logger.debug('ShortTermMemory', 'Destruido');
    }
}

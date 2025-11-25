import { Message } from 'discord.js';
import { MessageFilter } from '../filters/MessageFilter.js';
import { CommandFilter } from '../filters/CommandFilter.js';
import { ContextFilter } from '../filters/ContextFilter.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { FilterResult, TokenBudget } from './types.js';
import { DEFAULT_AI_CONFIG, TOKEN_LIMITS } from './constants.js';
import { logger } from '../../utils/logger.js';
import type { BotClient } from '../../types/BotClient.js';

export class AIManager {
    private messageFilter: MessageFilter;
    private commandFilter: CommandFilter;
    private contextFilter: ContextFilter;
    private memoryManager: MemoryManager;
    private client: BotClient;

    constructor(client: BotClient) {
        this.client = client;

        if (!client.user) {
            throw new Error('Client user is required for AIManager initialization');
        }

        this.messageFilter = new MessageFilter(client.user.id);

        const initialTokenBudget: TokenBudget = {
            daily: TOKEN_LIMITS.CHAT_DAILY,
            used: 0,
            remaining: TOKEN_LIMITS.CHAT_DAILY,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        this.commandFilter = new CommandFilter(DEFAULT_AI_CONFIG, initialTokenBudget);
        this.contextFilter = new ContextFilter(DEFAULT_AI_CONFIG);
        this.memoryManager = new MemoryManager(client);

        logger.info('AIManager', 'Sistema de IA inicializado');
    }

    async processMessage(message: Message): Promise<void> {
        try {
            const level1Result = await this.messageFilter.filter(message);
            logger.debug('AI', `📊 Resultado filtro: ${level1Result.result} (L${level1Result.level})`);

            if (level1Result.result === FilterResult.BLOCK) {
                logger.debug('AI', `❌ Bloqueado L${level1Result.level}: ${level1Result.reason}`);
                return;
            }

            if (level1Result.result === FilterResult.ALLOW) {
                logger.debug('AI', `✅ Mensaje de ${message.author.tag} aprobado directamente (L${level1Result.level})`);
                logger.debug('AI', `📝 Razón: ${level1Result.reason}`);
                return;
            }

            if (level1Result.result === FilterResult.ANALYZE) {
                const level3CommandResult = await this.commandFilter.filter(message);

                if (level3CommandResult.result === FilterResult.BLOCK) {
                    logger.debug('AI', `❌ Bloqueado L3-Command: ${level3CommandResult.reason}`);
                    return;
                }

                const level3ContextResult = await this.contextFilter.filter(message);

                if (level3ContextResult.result === FilterResult.BLOCK) {
                    logger.debug('AI', `❌ Bloqueado L3-Context: ${level3ContextResult.reason}`);
                    return;
                }

                const cleanContent = this.contextFilter.extractCleanContent(message);
                logger.debug('AI', `✅ Mensaje de ${message.author.tag} aprobado para procesamiento`);
                logger.debug('AI', `📝 Contenido limpio: "${cleanContent}"`);

                const guildId = message.guildId || undefined;
                await this.memoryManager.addUserMessage(message.author.id, cleanContent, guildId);
                await this.memoryManager.updateStats(message.author.id, 1, 0, guildId);

                logger.info('AI', `💾 Mensaje guardado en memoria para ${message.author.tag}`);
            }
        } catch (error) {
            logger.error('AIManager', 'Error procesando mensaje', error);
        }
    }

    async buildContext(userId: string, guildId?: string) {
        return await this.memoryManager.buildContext(userId, guildId);
    }

    async saveUserMessage(userId: string, content: string, guildId?: string): Promise<void> {
        await this.memoryManager.addUserMessage(userId, content, guildId);
    }

    async saveModelMessage(userId: string, content: string, guildId?: string): Promise<void> {
        await this.memoryManager.addModelMessage(userId, content, guildId);
    }

    getMemoryManager(): MemoryManager {
        return this.memoryManager;
    }

    getStats() {
        return {
            filters: {
                message: this.messageFilter.getStats(),
                command: this.commandFilter.getStats()
            },
            memory: this.memoryManager.getStats()
        };
    }

    async destroy(): Promise<void> {
        await this.memoryManager.destroy();
        logger.info('AIManager', 'Sistema de IA detenido');
    }
}

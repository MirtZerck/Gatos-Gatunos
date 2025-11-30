import { Message } from 'discord.js';
import { MessageFilter } from '../filters/MessageFilter.js';
import { CommandFilter } from '../filters/CommandFilter.js';
import { ContextFilter } from '../filters/ContextFilter.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { GeminiProvider } from '../providers/GeminiProvider.js';
import { ContextBuilder } from '../context/ContextBuilder.js';
import { FilterResult, TokenBudget } from './types.js';
import { DEFAULT_AI_CONFIG, TOKEN_LIMITS } from './constants.js';
import { logger } from '../../utils/logger.js';
import type { BotClient } from '../../types/BotClient.js';
import { sendMessage, createErrorEmbed, createWarningEmbed } from '../../utils/messageUtils.js';

export class AIManager {
    private messageFilter: MessageFilter;
    private commandFilter: CommandFilter;
    private contextFilter: ContextFilter;
    private memoryManager: MemoryManager;
    private geminiProvider: GeminiProvider;
    private contextBuilder: ContextBuilder;
    private client: BotClient;

    private aiMessageIds: Set<string>;

    constructor(client: BotClient) {
        this.client = client;

        if (!client.user) {
            throw new Error('Client user is required for AIManager initialization');
        }

        this.aiMessageIds = new Set();
        this.messageFilter = new MessageFilter(client.user.id, this.aiMessageIds);

        const initialTokenBudget: TokenBudget = {
            daily: TOKEN_LIMITS.CHAT_DAILY,
            used: 0,
            remaining: TOKEN_LIMITS.CHAT_DAILY,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        this.commandFilter = new CommandFilter(DEFAULT_AI_CONFIG, initialTokenBudget);
        this.contextFilter = new ContextFilter(DEFAULT_AI_CONFIG);
        this.memoryManager = new MemoryManager(client);
        this.geminiProvider = new GeminiProvider();
        this.contextBuilder = new ContextBuilder(this.memoryManager);

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
                const cleanContent = this.contextFilter.extractCleanContent(message);
                await this.generateAndSendResponse(message, cleanContent);
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

                await this.generateAndSendResponse(message, cleanContent);
            }
        } catch (error) {
            logger.error('AIManager', 'Error procesando mensaje', error instanceof Error ? error : new Error(String(error)));
        }
    }

    private async generateAndSendResponse(message: Message, cleanContent: string): Promise<void> {
        try {
            if ('sendTyping' in message.channel) {
                await message.channel.sendTyping();
            }

            const context = await this.contextBuilder.buildContext(message);

            logger.debug('AI', `🧠 Generando respuesta con ${context.conversationHistory.length} mensajes de historial`);

            const aiResponse = await this.geminiProvider.generateResponse(
                context.systemPrompt,
                context.conversationHistory,
                cleanContent
            );

            if (aiResponse.content && aiResponse.content.trim().length > 0) {
                const sentMessage = await message.reply(aiResponse.content);

                const isSlashCommand = message.interaction !== null;
                const startsWithPrefix = message.content.trim().startsWith('*') ||
                    message.content.trim().startsWith('/');
                const isFromCommand = isSlashCommand || startsWithPrefix;

                if (!isFromCommand) {
                    this.aiMessageIds.add(sentMessage.id);

                    if (this.aiMessageIds.size > 1000) {
                        const idsArray = Array.from(this.aiMessageIds);
                        const toRemove = idsArray.slice(0, 500);
                        toRemove.forEach(id => this.aiMessageIds.delete(id));
                    }
                }

                await this.contextBuilder.saveInteraction(
                    message,
                    aiResponse.content,
                    aiResponse.tokenUsage.total
                );

                this.commandFilter.consumeTokens(aiResponse.tokenUsage.total);

                logger.info('AI', `✅ Respuesta enviada a ${message.author.tag} (${aiResponse.tokenUsage.total} tokens, ${aiResponse.processingTime}ms)`);
            } else {
                logger.warn('AI', 'Respuesta vacía recibida de Gemini');
            }
        } catch (error) {
            logger.error('AI', 'Error generando respuesta', error instanceof Error ? error : new Error(String(error)));

            if (error instanceof Error && error.message.includes('quota')) {
                const embed = createWarningEmbed(
                    '⏱️ Límite Alcanzado',
                    'Lo siento, he alcanzado mi límite de conversaciones por hoy.\n\n' +
                    '💡 Vuelve mañana para continuar charlando!'
                );
                await sendMessage(message, { embed });
            } else {
                const embed = createErrorEmbed(
                    '❌ Error de IA',
                    'Lo siento, hubo un problema al generar mi respuesta.\n\n' +
                    'Por favor, intenta de nuevo en un momento.'
                );
                await sendMessage(message, { embed });
            }
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

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../../utils/logger.js';
import { AIResponse, ConversationMessage, ProviderConfig } from '../core/types.js';
import { GEMINI_CONFIG } from '../core/constants.js';

export class GeminiProvider {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private config: ProviderConfig;

    constructor() {
        this.config = GEMINI_CONFIG;

        this.genAI = new GoogleGenerativeAI(this.config.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: this.config.model,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
                topP: this.config.topP,
                topK: this.config.topK
            }
        });

        logger.info('GeminiProvider', 'Provider inicializado correctamente');
    }

    async generateResponse(
        systemPrompt: string,
        conversationHistory: ConversationMessage[],
        userMessage: string
    ): Promise<AIResponse> {
        const startTime = Date.now();

        try {
            const cleanHistory = conversationHistory.map(msg => ({
                role: msg.role,
                parts: msg.parts
            }));

            const chat = this.model.startChat({
                history: [
                    {
                        role: 'user',
                        parts: [{ text: systemPrompt }]
                    },
                    {
                        role: 'model',
                        parts: [{ text: 'Entendido. Responderé como Hikari Koizumi, manteniendo mi personalidad alegre y natural.' }]
                    },
                    ...cleanHistory
                ],
                generationConfig: {
                    temperature: this.config.temperature,
                    maxOutputTokens: this.config.maxOutputTokens,
                    topP: this.config.topP,
                    topK: this.config.topK
                }
            });

            const result = await chat.sendMessage(userMessage);
            const response = result.response;
            const text = response.text();

            const processingTime = Date.now() - startTime;

            const tokenUsage = {
                prompt: response.usageMetadata?.promptTokenCount || 0,
                completion: response.usageMetadata?.candidatesTokenCount || 0,
                total: response.usageMetadata?.totalTokenCount || 0
            };

            logger.debug('GeminiProvider', `Respuesta generada en ${processingTime}ms, tokens: ${tokenUsage.total}`);

            return {
                content: text,
                tokenUsage,
                processingTime,
                cached: false
            };
        } catch (error) {
            const processingTime = Date.now() - startTime;
            logger.error('GeminiProvider', 'Error al generar respuesta', error instanceof Error ? error : new Error(String(error)));

            return {
                content: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?',
                tokenUsage: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                processingTime,
                cached: false
            };
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const result = await this.model.generateContent('Responde solo con: OK');
            const text = result.response.text();
            logger.info('GeminiProvider', 'Conexión verificada correctamente');
            return text.includes('OK');
        } catch (error) {
            logger.error('GeminiProvider', 'Error al verificar conexión', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }
}

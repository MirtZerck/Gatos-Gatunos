import { AIConfig, ProviderConfig } from './types.js';
import { config } from '../../config.js';

export const TOKEN_LIMITS = {
    DAILY_BUDGET: 33000,
    BUFFER_PERCENTAGE: 0.15,
    MAX_PER_REQUEST: config.ai.maxTokensPerRequest,
    CHAT_ALLOCATION: 0.85,
    get CHAT_DAILY() {
        return Math.floor(config.ai.maxTokensPerDay * this.CHAT_ALLOCATION);
    },
    get BUFFER_DAILY() {
        return Math.floor(this.DAILY_BUDGET * this.BUFFER_PERCENTAGE);
    }
} as const;

export const RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 15,
    REQUESTS_PER_DAY: 1500,
    COOLDOWN_SECONDS: config.ai.cooldownSeconds,
    MAX_MESSAGES_PER_MINUTE: config.ai.maxMessagesPerMinute
} as const;

export const MEMORY_LIMITS = {
    SHORT_TERM: {
        MAX_ENTRIES: 5,
        MAX_AGE_MINUTES: 15,
        MAX_TOKENS: 500
    },
    MEDIUM_TERM: {
        MAX_ENTRIES: 20,
        MAX_AGE_HOURS: 24,
        MAX_TOKENS: 1000
    },
    LONG_TERM: {
        MAX_ENTRIES: 50,
        MIN_RELEVANCE_SCORE: 0.7,
        MAX_TOKENS: 1500
    }
} as const;

export const CONTEXT_LIMITS = {
    MAX_HISTORY_MESSAGES: 10,
    MAX_CONTEXT_TOKENS: 4000,
    COMPRESSION_THRESHOLD: 3500,
    MIN_RELEVANCE_SCORE: 0.5
} as const;

export const CHANNEL_CONTEXT_LIMITS = {
    MAX_MESSAGES: 8,
    MAX_AGE_MINUTES: 5,
    MAX_MESSAGE_LENGTH: 150,
    ENABLE_IN_DM: true,
    ENABLE_IN_MENTIONS: true,
    ENABLE_IN_CASUAL: false
} as const;

export const INTERACTION_COMMAND_PATTERNS = [
    /^\*\w+\s+<@!?\d+>/i,
    /^\*hug\s+/i,
    /^\*kiss\s+/i,
    /^\*pat\s+/i,
    /^\*slap\s+/i,
    /^\*poke\s+/i,
    /^\*cuddle\s+/i,
    /^\*highfive\s+/i,
    /^\*wave\s+/i
] as const;

export const COMMAND_PREFIXES = ['!', '/', '.', '?', '-', '+', '>', '<'] as const;

export const DEFAULT_AI_CONFIG: AIConfig = {
    enabled: config.ai.enabled,
    maxTokensPerDay: TOKEN_LIMITS.CHAT_DAILY,
    maxTokensPerRequest: TOKEN_LIMITS.MAX_PER_REQUEST,
    cooldownSeconds: RATE_LIMITS.COOLDOWN_SECONDS,
    maxMessagesPerMinute: RATE_LIMITS.MAX_MESSAGES_PER_MINUTE,
    allowedChannels: config.ai.allowedChannels,
    blockedChannels: config.ai.blockedChannels,
    allowedRoles: config.ai.allowedRoles
};

export const GEMINI_CONFIG: ProviderConfig = {
    apiKey: config.geminiApiKey,
    model: 'gemini-2.0-flash',
    temperature: 0.9,
    maxOutputTokens: 500,
    topP: 0.95,
    topK: 40
};

export const PERSONALITY_PROMPT = `Eres Hikari Koizumi, una asistente virtual amigable y servicial en Discord.

Características:
- Eres amable, empática y conversacional
- Respondes de forma natural y cercana
- Usas emojis ocasionalmente para expresividad
- Eres útil pero no demasiado formal
- Mantienes conversaciones coherentes recordando el contexto previo

Restricciones:
- NO respondas a comandos del bot
- NO respondas cuando te mencionen en comandos de interacción (*hug, *kiss, etc.)
- Mantén las respuestas concisas pero completas
- Si no sabes algo, admítelo honestamente
- Respeta las reglas del servidor

Responde siempre en el idioma del usuario.`;

export const FILTER_REASONS = {
    BOT_MESSAGE: 'Mensaje enviado por un bot',
    COMMAND_PREFIX: 'Mensaje comienza con prefijo de comando',
    SLASH_COMMAND: 'Comando slash detectado',
    INTERACTION_COMMAND: 'Comando de interacción detectado',
    COOLDOWN_ACTIVE: 'Usuario en período de espera',
    RATE_LIMIT_EXCEEDED: 'Límite de mensajes excedido',
    CHANNEL_NOT_ALLOWED: 'Canal no permitido para IA',
    CHANNEL_BLOCKED: 'Canal bloqueado para IA',
    NO_BOT_MENTION: 'Bot no mencionado en el mensaje',
    INVALID_CONTENT: 'Contenido vacío o inválido',
    TOKEN_BUDGET_EXCEEDED: 'Presupuesto de tokens excedido',
    COMMAND_RESPONSE: 'Respuesta a comando del bot',
    ALLOWED: 'Mensaje permitido para procesamiento'
} as const;

export const RELEVANCE_WEIGHTS = {
    RECENCY: 0.3,
    ACCESS_FREQUENCY: 0.2,
    IMPORTANCE: 0.25,
    TOPIC_SIMILARITY: 0.25
} as const;

export const CLEANUP_INTERVALS = {
    SHORT_TERM_MS: 5 * 60 * 1000,
    MEDIUM_TERM_MS: 30 * 60 * 1000,
    LONG_TERM_MS: 24 * 60 * 60 * 1000,
    TOKEN_BUDGET_RESET_MS: 24 * 60 * 60 * 1000
} as const;

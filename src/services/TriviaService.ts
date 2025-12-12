import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { getRandomGif } from '../utils/tenor.js';
import {
    TriviaQuestion,
    OpenTDBResponse,
    OpenTDBTokenResponse
} from '../types/millionaire.js';

class TriviaService {
    private cache: Map<string, TriviaQuestion[]>;
    private genAI: GoogleGenerativeAI | null;
    private readonly CACHE_SIZE = 50;
    private readonly API_BASE_URL = 'https://opentdb.com/api.php';
    private readonly TOKEN_URL = 'https://opentdb.com/api_token.php';
    private lastRequestTime: number = 0;
    private readonly RATE_LIMIT_MS = 5000;

    constructor() {
        this.cache = new Map();
        this.genAI = null;

        try {
            this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
            logger.info('TriviaService', 'Gemini AI inicializado para mejora de preguntas');
        } catch (error) {
            logger.warn('TriviaService', 'No se pudo inicializar Gemini AI');
        }

        this.initializeCache();
    }

    private async initializeCache(): Promise<void> {
        const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

        for (const difficulty of difficulties) {
            this.cache.set(difficulty, []);
            try {
                await this.fillCache(difficulty);
            } catch (error) {
                logger.warn('TriviaService', `Error al inicializar cache para ${difficulty}`);
            }
        }
    }

    private async fillCache(difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
        const cached = this.cache.get(difficulty) || [];
        const needed = this.CACHE_SIZE - cached.length;

        if (needed <= 0) return;

        try {
            const questions = await this.fetchQuestionsFromAPI(difficulty, needed);
            this.cache.set(difficulty, [...cached, ...questions]);
            logger.info('TriviaService', `Cache llenado para ${difficulty}: ${questions.length} preguntas`);
        } catch (error) {
            logger.error('TriviaService', `Error llenando cache para ${difficulty}`, error instanceof Error ? error : new Error(String(error)));
        }
    }

    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
            const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    async getSessionToken(): Promise<string> {
        try {
            await this.waitForRateLimit();
            const response = await fetch(`${this.TOKEN_URL}?command=request`);
            const data: OpenTDBTokenResponse = await response.json();

            if (data.response_code === 0 && data.token) {
                logger.info('TriviaService', 'Session token obtenido');
                return data.token;
            }

            throw new Error('Error obteniendo session token');
        } catch (error) {
            logger.error('TriviaService', 'Error obteniendo session token', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    async resetSessionToken(token: string): Promise<string> {
        try {
            await this.waitForRateLimit();
            await fetch(`${this.TOKEN_URL}?command=reset&token=${token}`);
            return await this.getSessionToken();
        } catch (error) {
            logger.error('TriviaService', 'Error reseteando session token', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    private decodeHtmlEntities(text: string): string {
        const entities: Record<string, string> = {
            '&quot;': '"',
            '&#039;': "'",
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&rsquo;': "'",
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&hellip;': '...',
            '&ndash;': '–',
            '&mdash;': '—'
        };

        let decoded = text;
        for (const [entity, char] of Object.entries(entities)) {
            decoded = decoded.replace(new RegExp(entity, 'g'), char);
        }

        return decoded;
    }

    private async translateToSpanish(question: TriviaQuestion): Promise<TriviaQuestion> {
        try {
            // Función auxiliar para traducir un texto usando MyMemory API
            const translateText = async (text: string): Promise<string> => {
                // Escapar el texto para URL
                const encodedText = encodeURIComponent(text);
                const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|es`;

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`MyMemory API error: ${response.status}`);
                }

                const data = await response.json();

                if (data.responseStatus !== 200) {
                    throw new Error(`Translation failed: ${data.responseStatus}`);
                }

                return data.responseData.translatedText;
            };

            // Traducir solo pregunta y categoría (NO las respuestas)
            const [translatedQuestion, translatedCategory] = await Promise.all([
                translateText(question.question),
                translateText(question.category)
            ]);

            logger.info('TriviaService', 'Pregunta traducida exitosamente con MyMemory API');

            return {
                ...question,
                question: translatedQuestion,
                category: translatedCategory
                // correctAnswer e incorrectAnswers se mantienen en inglés
            };
        } catch (error) {
            logger.warn('TriviaService', 'Error traduciendo pregunta, usando original', error instanceof Error ? error : new Error(String(error)));
            return question;
        }
    }

    private async fetchQuestionsFromAPI(
        difficulty: 'easy' | 'medium' | 'hard',
        amount: number,
        token?: string,
        translate: boolean = false
    ): Promise<TriviaQuestion[]> {
        try {
            await this.waitForRateLimit();

            let url = `${this.API_BASE_URL}?amount=${amount}&difficulty=${difficulty}&type=multiple`;
            if (token) {
                url += `&token=${token}`;
            }

            const response = await fetch(url);
            const data: OpenTDBResponse = await response.json();

            if (data.response_code === 4) {
                logger.warn('TriviaService', 'Token agotado, necesita reset');
                throw new Error('TOKEN_EXHAUSTED');
            }

            if (data.response_code !== 0 || !data.results) {
                throw new Error(`API Error: response_code ${data.response_code}`);
            }

            const questions: TriviaQuestion[] = data.results.map(q => ({
                id: `${q.category}-${q.question}`.substring(0, 50),
                question: this.decodeHtmlEntities(q.question),
                correctAnswer: this.decodeHtmlEntities(q.correct_answer),
                incorrectAnswers: q.incorrect_answers.map(a => this.decodeHtmlEntities(a)),
                difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
                category: this.decodeHtmlEntities(q.category)
            }));

            // Traducir preguntas al español solo si se solicita (durante el juego)
            if (translate) {
                const translatedQuestions = await Promise.all(
                    questions.map(q => this.translateToSpanish(q))
                );
                return translatedQuestions;
            }

            return questions;
        } catch (error) {
            logger.error('TriviaService', 'Error fetching from API', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    async getQuestion(
        difficulty: 'easy' | 'medium' | 'hard',
        usedQuestionIds: Set<string>,
        token?: string
    ): Promise<TriviaQuestion> {
        const cached = this.cache.get(difficulty) || [];
        const availableFromCache = cached.filter(q => !usedQuestionIds.has(q.id));

        if (availableFromCache.length > 0) {
            const question = availableFromCache[Math.floor(Math.random() * availableFromCache.length)];
            this.fillCache(difficulty);
            // Traducir la pregunta del caché antes de usarla
            const translatedQuestion = await this.translateToSpanish(question);
            return this.prepareQuestion(translatedQuestion);
        }

        try {
            // Activar traducción al obtener preguntas durante el juego
            const questions = await this.fetchQuestionsFromAPI(difficulty, 1, token, true);

            if (questions.length > 0) {
                return this.prepareQuestion(questions[0]);
            }

            throw new Error('No questions returned from API');
        } catch (error) {
            logger.warn('TriviaService', 'Cayendo back a generación con IA');
            return await this.generateQuestionWithAI(difficulty);
        }
    }

    private prepareQuestion(question: TriviaQuestion): TriviaQuestion {
        const allAnswers = [question.correctAnswer, ...question.incorrectAnswers];

        for (let i = allAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
        }

        return {
            ...question,
            allAnswers
        };
    }

    private async generateQuestionWithAI(difficulty: 'easy' | 'medium' | 'hard'): Promise<TriviaQuestion> {
        if (!this.genAI) {
            throw new Error('Gemini AI no disponible y API falló');
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            const difficultyDescriptions = {
                easy: 'fácil, conocimiento general básico',
                medium: 'medio, requiere conocimiento específico',
                hard: 'difícil, conocimiento avanzado o especializado'
            };

            const prompt = `Genera UNA pregunta de trivia de dificultad ${difficultyDescriptions[difficulty]} EN ESPAÑOL.

Formato JSON exacto:
{
  "question": "La pregunta aquí en español",
  "correctAnswer": "Respuesta correcta en español",
  "incorrectAnswers": ["Incorrecta 1 en español", "Incorrecta 2 en español", "Incorrecta 3 en español"],
  "category": "Categoría en español"
}

Reglas:
- IMPORTANTE: Todo el contenido debe estar en ESPAÑOL
- Exactamente 3 respuestas incorrectas
- Todas las respuestas deben ser plausibles
- La pregunta debe ser clara y directa
- Usa español neutro (no regionalizado)
- Responde SOLO con el JSON, sin texto adicional`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No se pudo extraer JSON de la respuesta');
            }

            const data = JSON.parse(jsonMatch[0]);

            return this.prepareQuestion({
                id: `ai-${Date.now()}`,
                question: data.question,
                correctAnswer: data.correctAnswer,
                incorrectAnswers: data.incorrectAnswers,
                difficulty,
                category: data.category
            });
        } catch (error) {
            logger.error('TriviaService', 'Error generando pregunta con IA', error instanceof Error ? error : new Error(String(error)));
            throw new Error('No se pudo obtener pregunta de ninguna fuente');
        }
    }

    async enhanceQuestionWithImage(question: TriviaQuestion): Promise<TriviaQuestion> {
        if (!this.genAI) {
            return question;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            const prompt = `For this trivia question: "${question.question}"
Category: ${question.category}

Generate a search query IN ENGLISH (maximum 5 words) to find a relevant image on Tenor.
The query must be in ENGLISH for better image search results.
Respond ONLY with the English query, without quotes or additional text.`;

            const result = await model.generateContent(prompt);
            const searchQuery = result.response.text().trim().replace(/['"]/g, '');

            if (searchQuery.length > 0 && searchQuery.length < 50) {
                const gifUrl = await getRandomGif(searchQuery);

                if (gifUrl && gifUrl !== 'https://media.tenor.com/images/error.gif') {
                    logger.info('TriviaService', `Imagen encontrada para: ${searchQuery}`);
                    return {
                        ...question,
                        imageUrl: gifUrl
                    };
                }
            }

            return question;
        } catch (error) {
            logger.warn('TriviaService', 'Error mejorando pregunta con imagen');
            return question;
        }
    }
}

export const triviaService = new TriviaService();

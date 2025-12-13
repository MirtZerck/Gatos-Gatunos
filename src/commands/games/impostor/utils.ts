import { GuildMember, User, EmbedBuilder } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import { THEMED_WORDS } from './constants.js';

let genAI: GoogleGenerativeAI | null = null;

try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    logger.info('Impostor', 'Gemini AI inicializado para generación de temas');
} catch (error) {
    logger.warn('Impostor', 'No se pudo inicializar Gemini AI, usando solo temas predefinidos');
}

export function getRoomKey(guildId: string, channelId: string): string {
    return `${guildId}-${channelId}`;
}

export function getMemberDisplayName(member: GuildMember | any, user: User): string {
    if (member && typeof member === 'object' && 'displayName' in member) {
        return (member as GuildMember).displayName;
    }
    return user.displayName;
}

export function getRandomWord(): string {
    return THEMED_WORDS[Math.floor(Math.random() * THEMED_WORDS.length)];
}

export async function generateThemeWithAI(): Promise<string> {
    if (!genAI) {
        return getRandomWord();
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const prompt = 'Genera UNA SOLA palabra o frase corta (máximo 3 palabras) que represente un lugar, evento o situación interesante para un juego de adivinanzas. Ejemplos: funeral, boda, circo, concierto de rock, estación espacial. Responde SOLO con la palabra/frase, nada más.';

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim().toLowerCase();

        if (text.length > 0 && text.length < 50) {
            logger.info('Impostor', `Tema generado por IA: ${text}`);
            return text;
        }

        return getRandomWord();
    } catch (error) {
        logger.error('Impostor', 'Error al generar tema con IA', error instanceof Error ? error : new Error(String(error)));
        return getRandomWord();
    }
}

export function getRandomImpostor(players: string[]): string {
    return players[Math.floor(Math.random() * players.length)];
}

export function generateTurnOrder(playerIds: string[], impostorId: string): string[] {
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    if (shuffled[0] === impostorId) {
        const impostorIndex = 0;
        const randomIndex = Math.floor(Math.random() * (shuffled.length - 1)) + 1;
        [shuffled[impostorIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[impostorIndex]];
    }

    return shuffled;
}

export async function sendDM(user: User, embed: EmbedBuilder): Promise<boolean> {
    try {
        await user.send({ embeds: [embed] });
        return true;
    } catch {
        return false;
    }
}

export function getRequiredVotes(totalPlayers: number): number {
    return Math.floor(totalPlayers / 2) + 1;
}

export function selectWordFromProposals(proposedWords: Map<string, string>, impostorId: string): string {
    const availableWords: string[] = [];
    for (const [playerId, word] of proposedWords) {
        if (playerId !== impostorId) {
            availableWords.push(word);
        }
    }
    return availableWords[Math.floor(Math.random() * availableWords.length)];
}

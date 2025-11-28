import { logger } from "./logger.js";

/* URL base de la API de Waifu.pics */
const WAIFU_PICS_API_URL = 'https://api.waifu.pics/sfw';

/**
 * Mapeo de acciones a endpoints de waifu.pics
 * Solo incluye las acciones que waifu.pics soporta nativamente
 */
export const WAIFU_PICS_ACTIONS: Record<string, string> = {
    // Comandos de interact
    'anime hug': 'hug',
    'anime kiss': 'kiss',
    'anime head pat': 'pat',
    'anime cuddle': 'cuddle',
    'anime slap': 'slap',
    'anime poke': 'poke',
    'anime bite': 'bite',
    'anime bonk': 'bonk',

    // Comandos de react
    'anime smile': 'smile',
    'anime blush': 'blush',
    'anime cry': 'cry',
    'anime happy': 'happy',

    // Comandos de act
    'anime dance': 'dance',
    'anime wave': 'wave',
    'anime high five': 'highfive',
};

/**
 * Verifica si una consulta tiene un endpoint disponible en waifu.pics
 *
 * @param {string} query - Término de búsqueda
 * @returns {boolean} true si waifu.pics soporta esta acción
 */
export function isWaifuPicsSupported(query: string): boolean {
    return query in WAIFU_PICS_ACTIONS;
}

/**
 * Obtiene un GIF aleatorio de waifu.pics basado en una acción
 * La API de waifu.pics devuelve un GIF aleatorio cada vez que se llama
 * Implementa reintentos para mejorar la probabilidad de obtener GIFs de calidad
 *
 * @async
 * @param {string} query - Término de búsqueda (debe estar en WAIFU_PICS_ACTIONS)
 * @param {number} [maxRetries=3] - Número máximo de intentos para obtener un GIF
 * @returns {Promise<string>} URL del GIF
 * @throws {Error} Si la acción no está soportada o la API falla
 *
 * @example
 * ```typescript
 * const gifUrl = await getWaifuPicsGif('anime hug');
 * // Retorna: 'https://cdn.waifu.pics/...'
 * ```
 */
export async function getWaifuPicsGif(query: string, maxRetries: number = 3): Promise<string> {
    try {
        // Verificar si la acción está soportada
        if (!isWaifuPicsSupported(query)) {
            throw new Error(`Acción no soportada por waifu.pics: ${query}`);
        }

        const action = WAIFU_PICS_ACTIONS[query];
        const url = `${WAIFU_PICS_API_URL}/${action}`;

        let lastError: Error | null = null;

        // Intentar múltiples veces para obtener un GIF
        // waifu.pics generalmente tiene buena calidad, pero múltiples intentos
        // aumentan la probabilidad de obtener un GIF óptimo
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Waifu.pics API error: ${response.status}`);
                }

                const data = await response.json();

                if (!data.url) {
                    throw new Error('No se recibió URL en la respuesta de waifu.pics');
                }

                logger.debug('WaifuPics', `GIF obtenido exitosamente en intento ${attempt}/${maxRetries}`);
                return data.url;
            } catch (error) {
                lastError = error as Error;
                if (attempt < maxRetries) {
                    logger.debug('WaifuPics', `Intento ${attempt} falló, reintentando...`);
                    // Pequeña pausa antes de reintentar
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }

        // Si llegamos aquí, todos los intentos fallaron
        throw lastError || new Error('Error desconocido obteniendo GIF de waifu.pics');
    } catch (error) {
        logger.error('WaifuPics', 'Error obteniendo GIF de waifu.pics', error);
        throw error;
    }
}

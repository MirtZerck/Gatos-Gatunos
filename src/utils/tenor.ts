import { config } from "../config.js";
import { logger } from "./logger_temp.js";

/* URL base de la API v2 de Tenor */
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

/**
 * *Obtiene un GIF aleatorio de Tenor basado en una consulta de búsqueda.
 * *Realiza una búsqueda y selecciona aleatoriamente uno de los resultados.
 * 
 * @async
 * @param {string} query - Término de búsqueda para el GIF
 * @param {number} [limit=20] - Cantidad máxima de resultados a obtener
 * @returns {Promise<string>} URL del GIF seleccionado aleatoriamente
 * @throws {Error} Si la API de Tenor falla o no hay resultados
 * 
 * @example
 * ```typescript
 * const gifUrl = await getRandomGif('anime hug');
 * /// Retorna: 'https://media.tenor.com/...'
 * ```
 */

export async function getRandomGif(query: string, limit: number = 20): Promise<string> {
    try {
        const url = new URL(`${TENOR_API_URL}/search`);
        url.searchParams.set('q', query);
        url.searchParams.set('key', config.tenorApiKey);
        url.searchParams.set('client_key', 'discord-bot');
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('media_filter', 'gif');
        url.searchParams.set('contentfilter', 'medium');

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`Tenor API error: ${response.status}`);
        }
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error('No se encontraron GIFs');
        }

        const randomIndex = Math.floor(Math.random() * data.results.length);
        const gif = data.results[randomIndex];

        return gif.media_formats.gif.url;
    } catch (error) {
        logger.error('Tenor', 'Error obteniendo GIF de Tenor', error);

        // Retornar GIF de error como fallback
        return 'https://media.tenor.com/images/error.gif'

    }
}

/**
 * *Obtiene un GIF aleatorio de los trending/destacados de Tenor.
 * *Opcionalmente filtra por categoría.
 * 
 * @async
 * @param {string} [category] - Categoría opcional para filtrar trending GIFs
 * @returns {Promise<string>} URL del GIF trending seleccionado aleatoriamente
 * @throws {Error} Si la API de Tenor falla o no hay resultados
 * 
 * @example
 * ```typescript
 * const trendingGif = await getTrendingGif();
 * const categoryGif = await getTrendingGif('anime');
 * ```
 */

export async function getTrendingGif(category?: string): Promise<string> {
    try {
        const url = new URL(`${TENOR_API_URL}/featured`);
        url.searchParams.set('key', config.tenorApiKey);
        url.searchParams.set('client_key', 'discord-bot');
        url.searchParams.set('limit', '20');

        if (category) {
            url.searchParams.set('searchfilter', category);
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error('No se encontraron GIFs trending');
        }

        const randomIndex = Math.floor(Math.random() * data.results.length);
        const gif = data.results[randomIndex];

        return gif.media_formats.gif.url;
    } catch (error) {
        logger.error('Tenor', 'Error obteniendo GIF trending', error);
        return 'https://media.tenor.com/images/error.gif';

    }

}
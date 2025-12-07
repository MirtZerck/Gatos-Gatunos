import { config } from "../config.js";
import { logger } from "./logger.js";
import { validateGifDimensions, type GifDimensions } from "./gifDimensions.js";

/* URL base de la API v2 de Tenor */
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

/** Formato de medio de Tenor (gif, mp4, etc.) */
interface TenorMediaFormat {
    url: string;
    dims: number[];
    duration?: number;
    size?: number;
}

/** Todos los formatos de medio disponibles para un GIF */
interface TenorMediaFormats {
    gif?: TenorMediaFormat;
    mediumgif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
    nanogif?: TenorMediaFormat;
    mp4?: TenorMediaFormat;
    loopedmp4?: TenorMediaFormat;
    tinymp4?: TenorMediaFormat;
    nanomp4?: TenorMediaFormat;
    webm?: TenorMediaFormat;
    tinywebm?: TenorMediaFormat;
    nanowebm?: TenorMediaFormat;
}

/** Objeto GIF de la respuesta de Tenor */
interface TenorGif {
    id: string;
    title?: string;
    media_formats: TenorMediaFormats;
    created: number;
    content_description?: string;
    itemurl?: string;
    url?: string;
    tags?: string[];
    flags?: string[];
    hasaudio?: boolean;
}

/** Respuesta de la API de Tenor */
interface TenorResponse {
    results: TenorGif[];
    next?: string;
}

/**
 * *Obtiene un GIF aleatorio de Tenor basado en una consulta de búsqueda.
 * *Realiza una búsqueda y selecciona aleatoriamente uno de los resultados.
 * *Filtra por dimensiones mínimas para garantizar calidad visual.
 *
 * @async
 * @param {string} query - Término de búsqueda para el GIF
 * @param {number} [limit=50] - Cantidad máxima de resultados a obtener
 * @returns {Promise<string>} URL del GIF seleccionado aleatoriamente
 * @throws {Error} Si la API de Tenor falla o no hay resultados
 *
 * @example
 * ```typescript
 * const gifUrl = await getRandomGif('anime hug');
 * /// Retorna: 'https://media.tenor.com/...'
 * ```
 */

export async function getRandomGif(query: string, limit: number = 50): Promise<string> {
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
        const data = await response.json() as TenorResponse;

        if (!data.results || data.results.length === 0) {
            throw new Error('No se encontraron GIFs');
        }

        // Filtrar GIFs por dimensiones aceptables
        const validGifs = data.results.filter((gif: TenorGif) => {
            const dims = gif.media_formats?.gif?.dims;
            // Rechazar GIFs sin información de dimensiones para garantizar calidad
            if (!dims || dims.length < 2) return false;

            const dimensions: GifDimensions = {
                width: dims[0],
                height: dims[1]
            };

            return validateGifDimensions(dimensions);
        });

        // Si no hay GIFs válidos después del filtrado, usar todos
        const gifsToUse = validGifs.length > 0 ? validGifs : data.results;

        if (validGifs.length === 0) {
            logger.warn('Tenor', `No se encontraron GIFs con buenas dimensiones para: ${query}, usando todos`);
        } else {
            logger.debug('Tenor', `Filtrados ${gifsToUse.length}/${data.results.length} GIFs con buenas dimensiones`);
        }

        const randomIndex = Math.floor(Math.random() * gifsToUse.length);
        const gif = gifsToUse[randomIndex];

        if (!gif.media_formats.gif?.url) {
            throw new Error('GIF no tiene formato válido');
        }

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
        url.searchParams.set('limit', '50');

        if (category) {
            url.searchParams.set('searchfilter', category);
        }

        const response = await fetch(url.toString());
        const data = await response.json() as TenorResponse;

        if (!data.results || data.results.length === 0) {
            throw new Error('No se encontraron GIFs trending');
        }

        // Filtrar GIFs por dimensiones aceptables
        const validGifs = data.results.filter((gif: TenorGif) => {
            const dims = gif.media_formats?.gif?.dims;
            // Rechazar GIFs sin información de dimensiones para garantizar calidad
            if (!dims || dims.length < 2) return false;

            const dimensions: GifDimensions = {
                width: dims[0],
                height: dims[1]
            };

            return validateGifDimensions(dimensions);
        });

        const gifsToUse = validGifs.length > 0 ? validGifs : data.results;

        const randomIndex = Math.floor(Math.random() * gifsToUse.length);
        const gif = gifsToUse[randomIndex];

        if (!gif.media_formats.gif?.url) {
            throw new Error('GIF no tiene formato válido');
        }

        return gif.media_formats.gif.url;
    } catch (error) {
        logger.error('Tenor', 'Error obteniendo GIF trending', error);
        return 'https://media.tenor.com/images/error.gif';

    }

}
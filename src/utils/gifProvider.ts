import { getWaifuPicsGif, isWaifuPicsSupported } from "./waifuPics.js";
import { getRandomGif as getTenorGif } from "./tenor.js";
import { logger } from "./logger.js";

/**
 * Obtiene un GIF usando un sistema híbrido:
 * 1. Intenta primero con waifu.pics (más preciso para anime)
 * 2. Si falla o no está soportado, usa Tenor como fallback con validación de calidad
 *
 * @async
 * @param {string} query - Término de búsqueda para el GIF
 * @param {number} [tenorLimit=50] - Límite de resultados para Tenor (solo si se usa fallback)
 * @returns {Promise<string>} URL del GIF obtenido
 *
 * @example
 * ```typescript
 * const gifUrl = await getInteractionGif('anime hug');
 * // Intenta waifu.pics primero, luego Tenor si falla
 * ```
 */
export async function getInteractionGif(query: string, tenorLimit: number = 50): Promise<string> {
    try {
        // Intentar primero con waifu.pics si está soportado
        if (isWaifuPicsSupported(query)) {
            logger.info('GifProvider', `Intentando obtener GIF de waifu.pics: ${query}`);
            try {
                const gifUrl = await getWaifuPicsGif(query);
                logger.info('GifProvider', 'GIF obtenido exitosamente de waifu.pics');
                return gifUrl;
            } catch (error) {
                logger.warn('GifProvider', 'waifu.pics falló, usando Tenor como fallback', error);
            }
        } else {
            logger.info('GifProvider', `Acción no soportada por waifu.pics, usando Tenor: ${query}`);
        }

        // Fallback a Tenor
        const gifUrl = await getTenorGif(query, tenorLimit);
        logger.info('GifProvider', 'GIF obtenido exitosamente de Tenor');
        return gifUrl;

    } catch (error) {
        logger.error('GifProvider', 'Error obteniendo GIF de todas las fuentes', error);
        // Retornar GIF de error como último recurso
        return 'https://media.tenor.com/images/error.gif';
    }
}

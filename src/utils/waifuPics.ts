import { logger } from "./logger.js";
import { getGifDimensions, validateGifDimensions } from "./gifDimensions.js";

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
 * Implementa validación de dimensiones paralela para máxima velocidad
 *
 * @async
 * @param {string} query - Término de búsqueda (debe estar en WAIFU_PICS_ACTIONS)
 * @param {number} [parallelAttempts=5] - Número de solicitudes paralelas a realizar
 * @returns {Promise<string>} URL del GIF
 * @throws {Error} Si la acción no está soportada o no se encuentra un GIF válido
 *
 * @example
 * ```typescript
 * const gifUrl = await getWaifuPicsGif('anime hug');
 * // Retorna: 'https://cdn.waifu.pics/...' (validado por dimensiones)
 * ```
 */
export async function getWaifuPicsGif(query: string, parallelAttempts: number = 5): Promise<string> {
    try {
        // Verificar si la acción está soportada
        if (!isWaifuPicsSupported(query)) {
            throw new Error(`Acción no soportada por waifu.pics: ${query}`);
        }

        const action = WAIFU_PICS_ACTIONS[query];
        const url = `${WAIFU_PICS_API_URL}/${action}`;

        // Función para obtener y validar un GIF
        const fetchAndValidateGif = async (attemptNum: number): Promise<string | null> => {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    logger.debug('WaifuPics', `Intento ${attemptNum}: API error ${response.status}`);
                    return null;
                }

                const data = await response.json();

                if (!data.url) {
                    logger.debug('WaifuPics', `Intento ${attemptNum}: No URL en respuesta`);
                    return null;
                }

                // Validar dimensiones del GIF
                const dimensions = await getGifDimensions(data.url);

                if (!dimensions) {
                    logger.debug('WaifuPics', `Intento ${attemptNum}: No se pudieron obtener dimensiones`);
                    return null;
                }

                if (!validateGifDimensions(dimensions)) {
                    logger.debug('WaifuPics', `Intento ${attemptNum}: GIF rechazado (${dimensions.width}x${dimensions.height})`);
                    return null;
                }

                logger.info('WaifuPics', `GIF válido encontrado en intento ${attemptNum} (${dimensions.width}x${dimensions.height})`);
                return data.url;
            } catch (error) {
                logger.debug('WaifuPics', `Intento ${attemptNum}: Error - ${error}`);
                return null;
            }
        };

        // Lanzar múltiples solicitudes en paralelo
        logger.debug('WaifuPics', `Lanzando ${parallelAttempts} solicitudes paralelas`);
        const promises = Array.from({ length: parallelAttempts }, (_, i) =>
            fetchAndValidateGif(i + 1)
        );

        // Esperar a que al menos una tenga éxito
        const results = await Promise.all(promises);

        // Tomar el primer GIF válido
        const validGif = results.find(result => result !== null);

        if (validGif) {
            return validGif;
        }

        // Si ninguno fue válido, lanzar error
        logger.warn('WaifuPics', `No se encontró un GIF válido después de ${parallelAttempts} intentos paralelos`);
        throw new Error('No se pudo obtener un GIF con dimensiones válidas de waifu.pics');
    } catch (error) {
        logger.error('WaifuPics', 'Error obteniendo GIF de waifu.pics', error);
        throw error;
    }
}

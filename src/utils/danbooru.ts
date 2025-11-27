import axios from "axios";
import { config } from "../config.js";
import { logger } from "./logger.js";

/* URL base de la API de Danbooru */
const DANBOORU_API_URL = 'https://danbooru.donmai.us';

/**
 * Interfaz para el post de Danbooru
 */
interface DanbooruPost {
    id: number;
    file_url?: string;
    large_file_url?: string;
    file_ext: string;
    rating: string;
    score: number;
    media_asset?: {
        variants: Array<{
            type: string;
            url: string;
        }>;
    };
}

/**
 * Resultado de la búsqueda de GIF
 */
interface GifResult {
    post: DanbooruPost;
    imageUrl: string;
}

/**
 * Resultado de la búsqueda de imagen
 */
interface ImageResult {
    post: DanbooruPost;
    imageUrl: string;
}

/**
 * *Obtiene un GIF aleatorio de Danbooru basado en tags.
 * *Realiza una búsqueda aleatoria y selecciona un resultado válido.
 * 
 * @async
 * @param {string} [tags='animated_gif'] - Tags de búsqueda para filtrar GIFs
 * @param {number} [maxAttempts=5] - Cantidad máxima de intentos para encontrar un GIF válido
 * @returns {Promise<GifResult>} Objeto con el post y la URL del GIF
 * @throws {Error} Si la API de Danbooru falla o no hay resultados después de todos los intentos
 * 
 * @example
 * ```typescript
 * const gif = await getRandomGif('animated_gif rating:s');
 * /// Retorna: { post: {...}, imageUrl: 'https://...' }
 * ```
 */
export async function getRandomGif(
    tags: string = 'animated_gif',
    maxAttempts: number = 5
): Promise<GifResult> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Configurar autenticación si está disponible
            const auth = config.danbooruUsername ? {
                username: config.danbooruUsername,
                password: config.danbooruApiKey
            } : undefined;

            const params = {
                limit: 1,
                random: 'true',
                tags: tags,
            };

            const headers = {
                'User-Agent': 'Discord-Bot/1.0'
            };

            const response = await axios.get(`${DANBOORU_API_URL}/posts.json`, {
                params,
                timeout: 15000,
                headers,
                auth
            });

            const data = response.data as DanbooruPost[];

            if (!data || data.length === 0) {
                if (attempt === maxAttempts) {
                    throw new Error('No se encontraron GIFs después de varios intentos');
                }
                logger.debug('Danbooru', `Intento ${attempt}: Sin resultados, reintentando...`);
                continue;
            }

            const post = data[0];

            // Verificar que sea un GIF válido
            if (post.file_ext !== 'gif') {
                if (attempt === maxAttempts) {
                    throw new Error('No se encontró un GIF válido después de varios intentos');
                }
                logger.debug('Danbooru', `Intento ${attempt}: Post no es GIF, reintentando...`, { postId: post.id });
                continue;
            }

            // Obtener URL de imagen con el orden de prioridad correcto
            const imageUrl = extractImageUrl(post);

            if (!imageUrl) {
                if (attempt === maxAttempts) {
                    throw new Error('No se pudo obtener URL de imagen válida');
                }
                logger.debug('Danbooru', `Intento ${attempt}: Post sin URL válida, reintentando...`, { postId: post.id });
                continue;
            }

            logger.debug('Danbooru', 'GIF encontrado exitosamente', {
                postId: post.id,
                url: imageUrl,
                rating: post.rating,
                attempt
            });

            return { post, imageUrl };

        } catch (error) {
            if (attempt === maxAttempts) {
                logger.error('Danbooru', 'Error obteniendo GIF de Danbooru', error);
                throw error;
            }
            logger.debug('Danbooru', `Intento ${attempt} falló, reintentando...`, error);
        }
    }

    throw new Error('No se pudo obtener un GIF después de todos los intentos');
}

/**
 * *Obtiene un GIF aleatorio de Danbooru con un rating específico.
 * 
 * @async
 * @param {'g' | 's' | 'q' | 'e'} rating - Rating del contenido (g=General, s=Sensitive, q=Questionable, e=Explicit)
 * @returns {Promise<GifResult>} Objeto con el post y la URL del GIF
 * @throws {Error} Si la API de Danbooru falla o no hay resultados
 * 
 * @example
 * ```typescript
 * const safeGif = await getRandomGifByRating('s');
 * const explicitGif = await getRandomGifByRating('e');
 * ```
 */
export async function getRandomGifByRating(
    rating: 'g' | 's' | 'q' | 'e'
): Promise<GifResult> {
    const tags = `animated_gif rating:${rating}`;
    return getRandomGif(tags);
}

/**
 * *Obtiene un GIF aleatorio de Danbooru con tags personalizados.
 * *Útil para búsquedas más específicas.
 * 
 * @async
 * @param {string[]} tags - Array de tags para buscar
 * @param {boolean} [includeAllRatings=true] - Si debe incluir todos los ratings
 * @returns {Promise<GifResult>} Objeto con el post y la URL del GIF
 * @throws {Error} Si la API de Danbooru falla o no hay resultados
 * 
 * @example
 * ```typescript
 * const gif = await searchGif(['animated_gif', 'cat', 'cute']);
 * const safeGif = await searchGif(['animated_gif', 'nature'], false); // Solo rating:g
 * ```
 */
export async function searchGif(
    tags: string[],
    includeAllRatings: boolean = true
): Promise<GifResult> {
    const baseTag = 'animated_gif';
    const ratingTag = includeAllRatings ? 'rating:g,s,q,e' : 'rating:g';

    // Combinar tags base con los proporcionados
    const searchTags = [baseTag, ...tags, ratingTag].join(' ');

    return getRandomGif(searchTags);
}

/**
 * *Obtiene una imagen aleatoria (estática) de Danbooru basada en tags.
 * *Realiza una búsqueda aleatoria y selecciona un resultado válido.
 * *Excluye GIFs animados para asegurar que sea una imagen estática con previsualización.
 *
 * @async
 * @param {string} [tags=''] - Tags de búsqueda para filtrar imágenes
 * @param {number} [maxAttempts=5] - Cantidad máxima de intentos para encontrar una imagen válida
 * @returns {Promise<ImageResult>} Objeto con el post y la URL de la imagen
 * @throws {Error} Si la API de Danbooru falla o no hay resultados después de todos los intentos
 *
 * @example
 * ```typescript
 * const image = await getRandomImage('rating:s');
 * /// Retorna: { post: {...}, imageUrl: 'https://...' }
 * ```
 */
export async function getRandomImage(
    tags: string = '',
    maxAttempts: number = 10
): Promise<ImageResult> {
    // Para evitar el error 422 de Danbooru (límite de tags), solo usamos rating
    // y filtramos imágenes animadas en el código en lugar de con tags negativos
    const searchTags = tags || 'rating:g,s,q,e';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Configurar autenticación si está disponible
            const auth = config.danbooruUsername ? {
                username: config.danbooruUsername,
                password: config.danbooruApiKey
            } : undefined;

            const params = {
                limit: 1,
                random: 'true',
                tags: searchTags,
            };

            const headers = {
                'User-Agent': 'Discord-Bot/1.0'
            };

            const response = await axios.get(`${DANBOORU_API_URL}/posts.json`, {
                params,
                timeout: 15000,
                headers,
                auth
            });

            const data = response.data as DanbooruPost[];

            if (!data || data.length === 0) {
                if (attempt === maxAttempts) {
                    throw new Error('No se encontraron imágenes después de varios intentos');
                }
                logger.debug('Danbooru', `Intento ${attempt}: Sin resultados, reintentando...`);
                continue;
            }

            const post = data[0];

            // Verificar que sea una imagen estática válida (jpg, png, etc.)
            // Excluir GIFs, videos y formatos animados
            const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            const invalidExtensions = ['gif', 'mp4', 'webm', 'zip', 'swf'];

            if (invalidExtensions.includes(post.file_ext.toLowerCase()) ||
                !validExtensions.includes(post.file_ext.toLowerCase())) {
                if (attempt === maxAttempts) {
                    throw new Error('No se encontró una imagen válida después de varios intentos');
                }
                logger.debug('Danbooru', `Intento ${attempt}: Post no es imagen estática, reintentando...`, {
                    postId: post.id,
                    ext: post.file_ext
                });
                continue;
            }

            // Obtener URL de imagen
            const imageUrl = extractImageUrl(post);

            if (!imageUrl) {
                if (attempt === maxAttempts) {
                    throw new Error('No se pudo obtener URL de imagen válida');
                }
                logger.debug('Danbooru', `Intento ${attempt}: Post sin URL válida, reintentando...`, { postId: post.id });
                continue;
            }

            logger.debug('Danbooru', 'Imagen encontrada exitosamente', {
                postId: post.id,
                url: imageUrl,
                rating: post.rating,
                extension: post.file_ext,
                attempt
            });

            return { post, imageUrl };

        } catch (error) {
            if (attempt === maxAttempts) {
                logger.error('Danbooru', 'Error obteniendo imagen de Danbooru', error);
                throw error;
            }
            logger.debug('Danbooru', `Intento ${attempt} falló, reintentando...`, error);
        }
    }

    throw new Error('No se pudo obtener una imagen después de todos los intentos');
}

/**
 * *Extrae la URL de imagen más apropiada de un post de Danbooru.
 * *Prioriza URLs directas que Discord pueda previsualizar.
 *
 * @private
 * @param {DanbooruPost} post - Post de Danbooru
 * @returns {string | null} URL de la imagen o null si no se encuentra
 */
function extractImageUrl(post: DanbooruPost): string | null {
    // Prioridad: file_url > large_file_url > media_asset.variants (original)
    let imageUrl = post.file_url || post.large_file_url;

    // Si no hay URL directa, intentar con media_asset (nuevo sistema de Danbooru)
    if (!imageUrl && post.media_asset?.variants) {
        const originalVariant = post.media_asset.variants.find(v => v.type === 'original');
        if (originalVariant) {
            imageUrl = originalVariant.url;
        }
    }

    if (!imageUrl) {
        return null;
    }

    // Asegurar que sea una URL absoluta
    if (!imageUrl.startsWith('http')) {
        imageUrl = `${DANBOORU_API_URL}${imageUrl}`;
    }

    // Limpiar parámetros de query para mejor previsualización en Discord
    const hasImageExtension = /\.(gif|jpg|jpeg|png|webp)$/i.test(imageUrl);
    if (imageUrl.includes('?') && !hasImageExtension) {
        imageUrl = imageUrl.split('?')[0];
    }

    return imageUrl;
}

/**
 * *Obtiene información del rating para mostrar al usuario.
 * 
 * @param {string} rating - Código del rating (g, s, q, e)
 * @returns {{ name: string; color: number; emoji: string }} Información del rating
 * 
 * @example
 * ```typescript
 * const info = getRatingInfo('s');
 * /// Retorna: { name: 'Sensitive', color: 0xffff00, emoji: '⚠️' }
 * ```
 */
export function getRatingInfo(rating: string): { name: string; color: number; emoji: string } {
    const ratingMap: Record<string, { name: string; color: number; emoji: string }> = {
        'g': { name: 'General', color: 0x00ff00, emoji: '✅' },
        's': { name: 'Sensitive', color: 0xffff00, emoji: '⚠️' },
        'q': { name: 'Questionable', color: 0xff9900, emoji: '🔶' },
        'e': { name: 'Explicit', color: 0xff0000, emoji: '🔞' }
    };

    return ratingMap[rating] || { name: rating.toUpperCase(), color: 0x00ffea, emoji: '❓' };
}
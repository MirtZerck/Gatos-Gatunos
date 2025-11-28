import { logger } from "./logger.js";

/**
 * Configuración de dimensiones aceptables para GIFs
 */
export const GIF_CONSTRAINTS = {
    MIN_WIDTH: 200,
    MIN_HEIGHT: 200,
    MIN_ASPECT_RATIO: 0.5,  // 1:2 (muy delgado)
    MAX_ASPECT_RATIO: 2.0,  // 2:1 (muy ancho)
} as const;

/**
 * Interfaz para dimensiones de GIF
 */
export interface GifDimensions {
    width: number;
    height: number;
}

/**
 * Valida si las dimensiones de un GIF cumplen con los requisitos mínimos
 *
 * @param {GifDimensions} dimensions - Dimensiones del GIF a validar
 * @returns {boolean} true si las dimensiones son aceptables
 *
 * @example
 * ```typescript
 * const isValid = validateGifDimensions({ width: 400, height: 300 });
 * // Retorna: true
 *
 * const isInvalid = validateGifDimensions({ width: 100, height: 500 });
 * // Retorna: false (muy delgado)
 * ```
 */
export function validateGifDimensions(dimensions: GifDimensions): boolean {
    const { width, height } = dimensions;

    // Validar dimensiones mínimas
    if (width < GIF_CONSTRAINTS.MIN_WIDTH || height < GIF_CONSTRAINTS.MIN_HEIGHT) {
        logger.debug('GifDimensions', `GIF rechazado por dimensiones muy pequeñas: ${width}x${height}`);
        return false;
    }

    // Calcular aspect ratio (ancho / alto)
    const aspectRatio = width / height;

    // Validar aspect ratio
    if (aspectRatio < GIF_CONSTRAINTS.MIN_ASPECT_RATIO || aspectRatio > GIF_CONSTRAINTS.MAX_ASPECT_RATIO) {
        logger.debug('GifDimensions', `GIF rechazado por aspect ratio: ${aspectRatio.toFixed(2)} (${width}x${height})`);
        return false;
    }

    return true;
}

/**
 * Obtiene las dimensiones de una imagen desde una URL
 * Nota: Esta función requiere descargar la imagen, úsala con moderación
 *
 * @param {string} url - URL de la imagen
 * @returns {Promise<GifDimensions | null>} Dimensiones de la imagen o null si falla
 */
export async function getImageDimensions(url: string): Promise<GifDimensions | null> {
    try {
        const response = await fetch(url, { method: 'HEAD' });

        // Intentar obtener dimensiones del header (algunos servidores las proveen)
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('image')) {
            return null;
        }

        // Si no están en los headers, necesitamos descargar la imagen
        // Por ahora retornamos null para evitar descargas innecesarias
        // waifu.pics no provee dimensiones en headers
        return null;
    } catch (error) {
        logger.error('GifDimensions', 'Error obteniendo dimensiones de imagen', error);
        return null;
    }
}

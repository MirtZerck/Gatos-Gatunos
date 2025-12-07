import { logger } from "./logger.js";

/**
 * Configuración de dimensiones aceptables para GIFs
 * Límites ajustados para garantizar buena calidad visual en Discord
 */
export const GIF_CONSTRAINTS = {
    MIN_WIDTH: 300,         // Mínimo aceptable para buena visualización
    MIN_HEIGHT: 300,        // Mínimo aceptable para buena visualización
    MIN_ASPECT_RATIO: 0.6,  // 3:5 (evita GIFs muy delgados)
    MAX_ASPECT_RATIO: 1.8,  // 9:5 (evita GIFs muy anchos)
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
 * Obtiene las dimensiones de un GIF leyendo su header
 * Solo descarga los primeros bytes necesarios para leer las dimensiones
 *
 * @param {string} url - URL del GIF
 * @returns {Promise<GifDimensions | null>} Dimensiones del GIF o null si falla
 */
export async function getGifDimensions(url: string): Promise<GifDimensions | null> {
    try {
        // Descargar solo los primeros 1KB (suficiente para leer el header GIF)
        const response = await fetch(url, {
            headers: {
                'Range': 'bytes=0-1023'
            }
        });

        if (!response.ok && response.status !== 206) {
            logger.debug('GifDimensions', `Error en respuesta: ${response.status}`);
            return null;
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Verificar que sea un GIF válido (GIF89a o GIF87a)
        const signature = String.fromCharCode(...bytes.slice(0, 3));
        if (signature !== 'GIF') {
            logger.debug('GifDimensions', 'No es un GIF válido');
            return null;
        }

        // Las dimensiones están en los bytes 6-9 (little-endian)
        // Bytes 6-7: ancho, Bytes 8-9: alto
        const width = bytes[6] | (bytes[7] << 8);
        const height = bytes[8] | (bytes[9] << 8);

        if (width === 0 || height === 0) {
            logger.debug('GifDimensions', 'Dimensiones inválidas');
            return null;
        }

        logger.debug('GifDimensions', `Dimensiones obtenidas: ${width}x${height}`);
        return { width, height };
    } catch (error) {
        logger.error('GifDimensions', 'Error obteniendo dimensiones de GIF', error);
        return null;
    }
}

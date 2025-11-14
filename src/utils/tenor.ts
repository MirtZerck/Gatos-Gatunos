import { config } from "../config.js";
import { logger } from "./logger.js";

const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

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

        return 'https://media.tenor.com/images/error.gif'

    }
}

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
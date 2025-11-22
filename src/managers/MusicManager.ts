import { Player, GuildQueue, Track } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { Client } from 'discord.js';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { logger } from '../utils/logger.js';

export class MusicManager {
    public player: Player;
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        // ✅ discord-player v7 no usa estas opciones en el constructor
        // Las opciones de desconexión se configuran por cola individual
        this.player = new Player(client);
    }

    async initialize(): Promise<void> {
        try {
            // ✅ Configuración avanzada para evitar errores de parsing
            await this.player.extractors.register(YoutubeiExtractor, {
                // Usar cliente de Android (más estable)
                streamOptions: {
                    useClient: 'ANDROID'
                },
                // Autenticación opcional (si tienes cookies de YouTube)
                // authentication: process.env.YOUTUBE_COOKIE,

                // Opciones para reducir warnings
                overrideDownloadOptions: {
                    quality: 'highestaudio'
                }
            });

            // Cargar otros extractores
            await this.player.extractors.loadMulti(DefaultExtractors);

            logger.info('MusicManager', '✅ Sistema de música inicializado');
            logger.info('MusicManager', `📦 Extractores cargados: ${this.player.extractors.size}`);

            this.setupPlayerEvents();

        } catch (error) {
            logger.error('MusicManager', 'Error inicializando sistema de música', error);
            throw error;
        }
    }

    private setupPlayerEvents(): void {
        this.player.events.on('playerStart', (queue: GuildQueue, track: Track) => {
            logger.info(
                'Music',
                `🎵 Reproduciendo: "${track.title}" en ${queue.guild.name}`
            );
        });

        this.player.events.on('playerFinish', (queue: GuildQueue, track: Track) => {
            logger.debug(
                'Music',
                `✅ Terminó: "${track.title}" en ${queue.guild.name}`
            );
        });

        this.player.events.on('emptyQueue', (queue: GuildQueue) => {
            logger.info('Music', `ℹ️ Cola vacía en ${queue.guild.name}`);
        });

        this.player.events.on('emptyChannel', (queue: GuildQueue) => {
            logger.info('Music', `👋 Canal vacío en ${queue.guild.name}, desconectando...`);
        });

        this.player.events.on('error', (queue: GuildQueue, error: Error) => {
            logger.error('Music', `Error en ${queue.guild.name}`, error);
        });

        this.player.events.on('playerError', (queue: GuildQueue, error: Error, track: Track) => {
            logger.error('Music', `Error reproduciendo "${track.title}"`, error);
        });

        // ✅ Filtrar warnings de YouTube.js para que no llenen los logs
        this.player.events.on('debug', (queue: GuildQueue, message: string) => {
            // Solo mostrar mensajes que no sean warnings de parsing
            if (!message.includes('InnertubeError') &&
                !message.includes('not found!') &&
                !message.includes('Unable to find matching run')) {
                logger.debug('Music', `[${queue.guild.name}] ${message}`);
            }
        });
    }

    getQueue(guildId: string): GuildQueue | null {
        return this.player.nodes.get(guildId) || null;
    }

    createQueue(guildId: string): GuildQueue {
        return this.player.nodes.create(guildId);
    }

    deleteQueue(guildId: string): boolean {
        return this.player.nodes.delete(guildId);
    }

    destroy(): void {
        this.player.destroy();
        logger.info('MusicManager', '🔴 Sistema de música destruido');
    }

    getStats(): {
        totalQueues: number;
        activeQueues: number;
        totalTracks: number;
        extractors: number;
    } {
        const queues = this.player.nodes.cache;
        const activeQueues = Array.from(queues.values()).filter(q => q.isPlaying()).length;
        const totalTracks = Array.from(queues.values()).reduce((acc, q) => acc + q.tracks.size, 0);

        return {
            totalQueues: queues.size,
            activeQueues,
            totalTracks,
            extractors: this.player.extractors.size
        };
    }
}
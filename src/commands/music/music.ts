import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
    Message
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { BotClient } from '../../types/BotClient.js';
import { CONTEXTS, INTEGRATION_TYPES, CATEGORIES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { getMusicManager } from './music/utils.js';
import { MIN_SEARCH_LENGTH, AUTOCOMPLETE_LIMIT } from './music/constants.js';
import {
    handlePlay,
    handlePause,
    handleResume,
    handleSkip,
    handleStop,
    handleQueue,
    handleNowPlaying,
    handleVolume,
    handleShuffle,
    handleLoop,
    handleAutoplay,
    handleJoin,
    handleLeave
} from './music/handlers/slash-handlers.js';
import {
    showHelp,
    handlePlayPrefix,
    handlePausePrefix,
    handleResumePrefix,
    handleSkipPrefix,
    handleStopPrefix,
    handleQueuePrefix,
    handleNowPlayingPrefix,
    handleVolumePrefix,
    handleShufflePrefix,
    handleLoopPrefix,
    handleAutoplayPrefix,
    handleJoinPrefix,
    handleLeavePrefix
} from './music/handlers/prefix-handlers.js';

export const music: HybridCommand = {
    type: 'hybrid',
    name: 'music',
    description: 'Sistema de musica del bot',
    category: CATEGORIES.MUSIC,
    subcommands: [
        { name: 'play', aliases: ['p', 'reproducir'], description: 'Reproduce una cancion' },
        { name: 'pause', aliases: ['pausar'], description: 'Pausa la reproduccion' },
        { name: 'resume', aliases: ['continuar', 'reanudar'], description: 'Reanuda la reproduccion' },
        { name: 'skip', aliases: ['s', 'saltar', 'next'], description: 'Salta la cancion actual' },
        { name: 'stop', aliases: ['detener', 'clear'], description: 'Detiene y limpia la cola' },
        { name: 'queue', aliases: ['q', 'cola'], description: 'Muestra la cola de reproduccion' },
        { name: 'nowplaying', aliases: ['np', 'actual'], description: 'Muestra la cancion actual' },
        { name: 'volume', aliases: ['vol', 'volumen'], description: 'Ajusta el volumen' },
        { name: 'shuffle', aliases: ['mezclar', 'aleatorio'], description: 'Mezcla la cola' },
        { name: 'loop', aliases: ['repetir', 'repeat'], description: 'Cambia el modo de repeticion' },
        { name: 'autoplay', aliases: ['auto', 'ap'], description: 'Activa/desactiva reproduccion automatica' },
        { name: 'join', aliases: ['conectar', 'entrar'], description: 'Conecta el bot al canal de voz' },
        { name: 'leave', aliases: ['disconnect', 'salir', 'dc'], description: 'Desconecta el bot del canal' },
    ],

    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Sistema de musica del bot')
        .addSubcommand(sub =>
            sub
                .setName('play')
                .setDescription('Reproduce una cancion')
                .addStringOption(opt =>
                    opt
                        .setName('query')
                        .setDescription('URL o nombre de la cancion')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('pause').setDescription('Pausa la reproduccion actual')
        )
        .addSubcommand(sub =>
            sub.setName('resume').setDescription('Reanuda la reproduccion pausada')
        )
        .addSubcommand(sub =>
            sub.setName('skip').setDescription('Salta la cancion actual')
        )
        .addSubcommand(sub =>
            sub.setName('stop').setDescription('Detiene la musica y limpia la cola')
        )
        .addSubcommand(sub =>
            sub.setName('join').setDescription('Conecta el bot a tu canal de voz')
        )
        .addSubcommand(sub =>
            sub.setName('leave').setDescription('Desconecta el bot del canal de voz')
        )
        .addSubcommand(sub =>
            sub
                .setName('queue')
                .setDescription('Muestra la cola de reproduccion')
                .addIntegerOption(opt =>
                    opt
                        .setName('page')
                        .setDescription('Pagina de la cola')
                        .setMinValue(1)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('nowplaying').setDescription('Muestra la cancion actual')
        )
        .addSubcommand(sub =>
            sub
                .setName('volume')
                .setDescription('Ajusta el volumen')
                .addIntegerOption(opt =>
                    opt
                        .setName('level')
                        .setDescription('Nivel de volumen (0-100)')
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('shuffle').setDescription('Mezcla la cola de reproduccion')
        )
        .addSubcommand(sub =>
            sub.setName('loop').setDescription('Cambia el modo de repeticion (Off -> Cancion -> Cola)')
        )
        .addSubcommand(sub =>
            sub.setName('autoplay').setDescription('Activa/desactiva la reproduccion automatica')
        )
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'play':
                    await handlePlay(interaction);
                    break;
                case 'pause':
                    await handlePause(interaction);
                    break;
                case 'resume':
                    await handleResume(interaction);
                    break;
                case 'skip':
                    await handleSkip(interaction);
                    break;
                case 'stop':
                    await handleStop(interaction);
                    break;
                case 'queue':
                    await handleQueue(interaction);
                    break;
                case 'nowplaying':
                    await handleNowPlaying(interaction);
                    break;
                case 'volume':
                    await handleVolume(interaction);
                    break;
                case 'shuffle':
                    await handleShuffle(interaction);
                    break;
                case 'loop':
                    await handleLoop(interaction);
                    break;
                case 'autoplay':
                    await handleAutoplay(interaction);
                    break;
                case 'join':
                    await handleJoin(interaction);
                    break;
                case 'leave':
                    await handleLeave(interaction);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'music');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase();

            if (!subcommand) {
                await showHelp(message);
                return;
            }

            const commandMap: Record<string, string> = {
                'p': 'play', 'reproducir': 'play',
                'pausar': 'pause',
                'continuar': 'resume', 'reanudar': 'resume',
                's': 'skip', 'saltar': 'skip', 'next': 'skip',
                'detener': 'stop', 'clear': 'stop',
                'q': 'queue', 'cola': 'queue',
                'np': 'nowplaying', 'actual': 'nowplaying',
                'vol': 'volume', 'volumen': 'volume',
                'mezclar': 'shuffle', 'aleatorio': 'shuffle',
                'repetir': 'loop', 'repeat': 'loop',
                'auto': 'autoplay', 'ap': 'autoplay',
                'conectar': 'join', 'entrar': 'join',
                'disconnect': 'leave', 'salir': 'leave', 'dc': 'leave'
            };

            const normalizedCommand = commandMap[subcommand] || subcommand;

            switch (normalizedCommand) {
                case 'play':
                    await handlePlayPrefix(message, args.slice(1));
                    break;
                case 'pause':
                    await handlePausePrefix(message);
                    break;
                case 'resume':
                    await handleResumePrefix(message);
                    break;
                case 'skip':
                    await handleSkipPrefix(message);
                    break;
                case 'stop':
                    await handleStopPrefix(message);
                    break;
                case 'queue':
                    await handleQueuePrefix(message, args.slice(1));
                    break;
                case 'nowplaying':
                    await handleNowPlayingPrefix(message);
                    break;
                case 'volume':
                    await handleVolumePrefix(message, args.slice(1));
                    break;
                case 'shuffle':
                    await handleShufflePrefix(message);
                    break;
                case 'loop':
                    await handleLoopPrefix(message);
                    break;
                case 'autoplay':
                    await handleAutoplayPrefix(message);
                    break;
                case 'join':
                    await handleJoinPrefix(message);
                    break;
                case 'leave':
                    await handleLeavePrefix(message);
                    break;
                default:
                    await showHelp(message);
            }
        } catch (error) {
            await handleCommandError(error, message, 'music');
        }
    },

    async autocomplete(interaction: AutocompleteInteraction) {
        try {
            const client = interaction.client as BotClient;
            const musicManager = getMusicManager(client);
            const focusedValue = interaction.options.getFocused();

            if (!focusedValue || focusedValue.length < MIN_SEARCH_LENGTH) {
                await interaction.respond([]);
                return;
            }

            const result = await musicManager.kazagumo.search(focusedValue, {
                requester: interaction.user
            });

            if (!result.tracks.length) {
                await interaction.respond([
                    { name: 'No se encontraron resultados', value: focusedValue }
                ]);
                return;
            }

            const choices = result.tracks.slice(0, AUTOCOMPLETE_LIMIT).map(track => {
                const duration = musicManager.formatTime(Math.floor((track.length || 0) / 1000));
                const name = `${track.title} - ${track.author} [${duration}]`.substring(0, 100);
                return {
                    name,
                    value: track.uri || track.title
                };
            });

            await interaction.respond(choices);
        } catch (error) {
            logger.error('MusicAutocomplete', 'Error en autocomplete', error);
            await interaction.respond([]);
        }
    }
};

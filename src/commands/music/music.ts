import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
    Message,
    EmbedBuilder,
    GuildMember,
    VoiceBasedChannel,
    TextChannel
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { BotClient } from '../../types/BotClient.js';
import { CONTEXTS, INTEGRATION_TYPES, CATEGORIES, COLORS, EMOJIS } from '../../utils/constants.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { LoopMode } from '../../managers/MusicManager.js';
import { logger } from '../../utils/logger.js';

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

            if (!focusedValue || focusedValue.length < 2) {
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

            const choices = result.tracks.slice(0, 25).map(track => {
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

function getVoiceChannel(member: GuildMember): VoiceBasedChannel {
    if (!member.voice.channel) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no esta en canal de voz',
            'Debes estar en un canal de voz para usar este comando.'
        );
    }
    return member.voice.channel;
}

function getMusicManager(client: BotClient) {
    if (!client.musicManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Sistema de música no disponible',
            'El sistema de música no está disponible en este momento.'
        );
    }
    return client.musicManager;
}

async function showHelp(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`${EMOJIS.MUSIC} Sistema de Musica`)
        .setDescription(
            `**Uso:** \`${config.prefix}music <comando> [opciones]\`\n\n` +
            `**Comandos disponibles:**\n` +
            `\`play\` (\`p\`) <busqueda/URL> - Reproduce musica\n` +
            `\`pause\` - Pausa la reproduccion\n` +
            `\`resume\` - Reanuda la reproduccion\n` +
            `\`skip\` (\`s\`) - Salta la cancion actual\n` +
            `\`stop\` - Detiene y limpia la cola\n` +
            `\`queue\` (\`q\`) [pagina] - Muestra la cola\n` +
            `\`nowplaying\` (\`np\`) - Cancion actual\n` +
            `\`volume\` (\`vol\`) <0-100> - Ajusta volumen\n` +
            `\`shuffle\` - Mezcla la cola\n` +
            `\`loop\` - Modo repeticion\n` +
            `\`join\` - Conecta el bot al canal\n` +
            `\`leave\` (\`dc\`) - Desconecta el bot\n\n` +
            `**Ejemplos:**\n` +
            `\`${config.prefix}music play never gonna give you up\`\n` +
            `\`${config.prefix}p https://youtube.com/watch?v=...\`\n` +
            `\`${config.prefix}music vol 50\``
        )
        .setFooter({ text: 'Soporta YouTube, Spotify, SoundCloud y mas' });

    await message.reply({ embeds: [embed] });
}

async function handlePlay(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const voiceChannel = getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);
    const query = interaction.options.getString('query', true);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x1DB954)
                .setDescription(`${EMOJIS.SEARCH} Buscando: **${query}**`)
        ]
    });

    try {
        const result = await musicManager.play(
            voiceChannel,
            interaction.channel as TextChannel,
            query,
            member,
            interaction
        );

        if (result.alreadyPlaying) {
            await interaction.deleteReply().catch(() => {});
        }
    } catch (error) {
        logger.error('MusicCommand', 'Error en play', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DANGER)
                    .setDescription(`${EMOJIS.ERROR} No se pudo reproducir. Intenta con otra búsqueda o URL.`)
            ]
        }).catch(() => {});
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Error reproduciendo',
            `No se pudo reproducir la canción. Intenta con otra búsqueda o URL.`
        );
    }
}

async function handlePause(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    if (player.paused) {
        throw new CommandError(ErrorType.VALIDATION_ERROR, 'Ya pausado', 'La musica ya esta pausada.');
    }

    await player.pause(true);
    await musicManager.refreshPlayerEmbed(player);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.PAUSE} Reproduccion pausada`)
        ]
    });
}

async function handleResume(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    if (!player.paused) {
        throw new CommandError(ErrorType.VALIDATION_ERROR, 'No pausado', 'La musica no esta pausada.');
    }

    await player.pause(false);
    await musicManager.refreshPlayerEmbed(player);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.PLAY} Reproduccion reanudada`)
        ]
    });
}

async function handleSkip(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    const currentTrack = player.queue.current;
    await player.skip();

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.SKIP} Saltando: **${currentTrack?.title || 'Cancion'}**`)
        ]
    });
}

async function handleStop(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await musicManager.stop(interaction.guildId!);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.STOP} Reproduccion detenida y cola limpiada`)
        ]
    });
}

async function handleQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);
    const page = interaction.options.getInteger('page') || 1;

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cola', 'No hay musica reproduciendose.');
    }

    const current = player.queue.current;
    const tracks = player.queue;
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(tracks.length / itemsPerPage));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, tracks.length);

    let description = `${EMOJIS.PLAY} **Ahora:** [${current.title}](${current.uri}) - \`${musicManager.formatTime(Math.floor((current.length || 0) / 1000))}\`\n\n`;

    if (tracks.length > 0) {
        description += '**Cola:**\n';
        for (let i = start; i < end; i++) {
            const track = tracks[i];
            description += `**${i + 1}.** [${track.title}](${track.uri}) - \`${musicManager.formatTime(Math.floor((track.length || 0) / 1000))}\`\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`${EMOJIS.MUSIC} Cola de reproduccion`)
        .setDescription(description)
        .setFooter({ text: `Pagina ${currentPage}/${totalPages} | ${tracks.length + 1} canciones` });

    await interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cancion', 'No hay ninguna cancion reproduciendose.');
    }

    const embed = musicManager.createPlayerEmbed(player, player.queue.current);
    await interaction.reply({ embeds: [embed] });
}

async function handleVolume(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);
    const level = interaction.options.getInteger('level', true);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await player.setVolume(level);
    await musicManager.refreshPlayerEmbed(player);

    const volumeEmoji = level === 0 ? EMOJIS.VOLUME : level < 50 ? EMOJIS.VOLUME : EMOJIS.VOLUME;

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${volumeEmoji} Volumen ajustado a **${level}%**`)
        ]
    });
}

async function handleShuffle(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    player.queue.shuffle();
    await musicManager.refreshPlayerEmbed(player);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.SHUFFLE} Cola mezclada aleatoriamente`)
        ]
    });
}

async function handleLoop(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    const nextMode = player.loop === LoopMode.NONE
        ? LoopMode.TRACK
        : player.loop === LoopMode.TRACK
            ? LoopMode.QUEUE
            : LoopMode.NONE;

    player.setLoop(nextMode);
    await musicManager.refreshPlayerEmbed(player);

    const modeText = nextMode === LoopMode.NONE
        ? 'Desactivado'
        : nextMode === LoopMode.TRACK
            ? 'Repetir cancion'
            : 'Repetir cola';

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.REPEAT} Modo de repeticion: **${modeText}**`)
        ]
    });
}

async function handleJoin(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const voiceChannel = getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    await musicManager.join(voiceChannel, interaction.channel as TextChannel);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.SUCCESS} Conectado a **${voiceChannel.name}**`)
        ]
    });
}

async function handleLeave(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin conexion', 'El bot no esta conectado a ningun canal.');
    }

    await musicManager.leave(interaction.guildId!);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.SUCCESS} Desconectado del canal de voz`)
        ]
    });
}

async function handlePlayPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(`Uso: \`${config.prefix}music play <URL o busqueda>\``);
        return;
    }

    const member = message.member as GuildMember;
    const voiceChannel = getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);
    const query = args.join(' ');

    const searchMsg = await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x1DB954)
                .setDescription(`${EMOJIS.SEARCH} Buscando: **${query}**`)
        ]
    });

    try {
        const result = await musicManager.play(
            voiceChannel,
            message.channel as TextChannel,
            query,
            member,
            searchMsg
        );

        if (result.alreadyPlaying) {
            await searchMsg.delete().catch(() => {});
        }
    } catch (error) {
        logger.error('MusicCommand', 'Error en play prefix', error);
        await searchMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DANGER)
                    .setDescription(`${EMOJIS.ERROR} No se pudo reproducir. Intenta con otra búsqueda o URL.`)
            ]
        }).catch(() => {});
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Error reproduciendo',
            `No se pudo reproducir la canción. Intenta con otra búsqueda o URL.`
        );
    }
}

async function handlePausePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    if (player.paused) {
        throw new CommandError(ErrorType.VALIDATION_ERROR, 'Ya pausado', 'La musica ya esta pausada.');
    }

    await player.pause(true);
    await musicManager.refreshPlayerEmbed(player);
    await message.react(EMOJIS.PAUSE);
}

async function handleResumePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    if (!player.paused) {
        throw new CommandError(ErrorType.VALIDATION_ERROR, 'No pausado', 'La musica no esta pausada.');
    }

    await player.pause(false);
    await musicManager.refreshPlayerEmbed(player);
    await message.react(EMOJIS.PLAY);
}

async function handleSkipPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await player.skip();
    await message.react(EMOJIS.SKIP);
}

async function handleStopPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await musicManager.stop(message.guildId!);
    await message.react(EMOJIS.STOP);
}

async function handleQueuePrefix(message: Message, args: string[]): Promise<void> {
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);
    const page = args[0] ? parseInt(args[0]) : 1;

    const player = musicManager.getPlayer(message.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cola', 'No hay musica reproduciendose.');
    }

    const current = player.queue.current;
    const tracks = player.queue;
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(tracks.length / itemsPerPage));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, tracks.length);

    let description = `${EMOJIS.PLAY} **Ahora:** [${current.title}](${current.uri}) - \`${musicManager.formatTime(Math.floor((current.length || 0) / 1000))}\`\n\n`;

    if (tracks.length > 0) {
        description += '**Cola:**\n';
        for (let i = start; i < end; i++) {
            const track = tracks[i];
            description += `**${i + 1}.** [${track.title}](${track.uri}) - \`${musicManager.formatTime(Math.floor((track.length || 0) / 1000))}\`\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`${EMOJIS.MUSIC} Cola de reproduccion`)
        .setDescription(description)
        .setFooter({ text: `Pagina ${currentPage}/${totalPages} | ${tracks.length + 1} canciones` });

    await message.reply({ embeds: [embed] });
}

async function handleNowPlayingPrefix(message: Message): Promise<void> {
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cancion', 'No hay ninguna cancion reproduciendose.');
    }

    const embed = musicManager.createPlayerEmbed(player, player.queue.current);
    await message.reply({ embeds: [embed] });
}

async function handleVolumePrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(`Uso: \`${config.prefix}music volume <0-100>\``);
        return;
    }

    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);
    const level = parseInt(args[0]);

    if (isNaN(level) || level < 0 || level > 100) {
        await message.reply('El volumen debe ser un numero entre 0 y 100.');
        return;
    }

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await player.setVolume(level);
    await musicManager.refreshPlayerEmbed(player);

    await message.reply(`${EMOJIS.VOLUME} Volumen: **${level}%**`);
}

async function handleShufflePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    player.queue.shuffle();
    await musicManager.refreshPlayerEmbed(player);
    await message.react(EMOJIS.SHUFFLE);
}

async function handleLoopPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    const nextMode = player.loop === LoopMode.NONE
        ? LoopMode.TRACK
        : player.loop === LoopMode.TRACK
            ? LoopMode.QUEUE
            : LoopMode.NONE;

    player.setLoop(nextMode);
    await musicManager.refreshPlayerEmbed(player);

    const modeText = nextMode === LoopMode.NONE
        ? 'Desactivado'
        : nextMode === LoopMode.TRACK
            ? 'Repetir cancion'
            : 'Repetir cola';

    await message.reply(`${EMOJIS.REPEAT} Modo de repeticion: **${modeText}**`);
}

async function handleJoinPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    const voiceChannel = getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    await musicManager.join(voiceChannel, message.channel as TextChannel);
    await message.react(EMOJIS.SUCCESS);
}

async function handleLeavePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin conexion', 'El bot no esta conectado a ningun canal.');
    }

    await musicManager.leave(message.guildId!);
    await message.react(EMOJIS.SUCCESS);
}

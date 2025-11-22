import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    GuildMember,
    MessageFlags
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CONTEXTS, INTEGRATION_TYPES, CATEGORIES, COLORS, EMOJIS } from '../../utils/constants.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { QueryType, Track } from 'discord-player';

export const music: HybridCommand = {
    type: 'hybrid',
    name: 'music',
    description: 'Sistema de reproducción de música',
    category: CATEGORIES.MUSIC,
    subcommands: [
        { name: 'play', aliases: ['p', 'reproducir'], description: 'Reproduce una canción' },
        { name: 'skip', aliases: ['s', 'saltar', 'next'], description: 'Salta la canción actual' },
        { name: 'stop', aliases: ['detener', 'leave'], description: 'Detiene la música y desconecta' },
        { name: 'pause', aliases: ['pausar'], description: 'Pausa la reproducción' },
        { name: 'resume', aliases: ['continuar', 'reanudar'], description: 'Reanuda la reproducción' },
        { name: 'queue', aliases: ['q', 'cola', 'list'], description: 'Muestra la cola de reproducción' },
        { name: 'nowplaying', aliases: ['np', 'actual', 'current'], description: 'Muestra la canción actual' },
        { name: 'shuffle', aliases: ['mezclar'], description: 'Mezcla la cola' },
        { name: 'clear', aliases: ['limpiar'], description: 'Limpia la cola' },
        { name: 'volume', aliases: ['vol', 'volumen'], description: 'Ajusta el volumen' },
    ],

    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Sistema de reproducción de música')
        .addSubcommand(sub =>
            sub
                .setName('play')
                .setDescription('Reproduce una canción o playlist')
                .addStringOption(opt =>
                    opt
                        .setName('query')
                        .setDescription('Nombre de la canción, URL de YouTube/Spotify o búsqueda')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('skip')
                .setDescription('Salta la canción actual')
        )
        .addSubcommand(sub =>
            sub
                .setName('stop')
                .setDescription('Detiene la música y desconecta el bot')
        )
        .addSubcommand(sub =>
            sub
                .setName('pause')
                .setDescription('Pausa la reproducción actual')
        )
        .addSubcommand(sub =>
            sub
                .setName('resume')
                .setDescription('Reanuda la reproducción pausada')
        )
        .addSubcommand(sub =>
            sub
                .setName('queue')
                .setDescription('Muestra la cola de reproducción')
                .addIntegerOption(opt =>
                    opt
                        .setName('page')
                        .setDescription('Página de la cola a mostrar')
                        .setMinValue(1)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('nowplaying')
                .setDescription('Muestra la canción que está sonando actualmente')
        )
        .addSubcommand(sub =>
            sub
                .setName('shuffle')
                .setDescription('Mezcla aleatoriamente la cola de reproducción')
        )
        .addSubcommand(sub =>
            sub
                .setName('clear')
                .setDescription('Limpia todas las canciones de la cola')
        )
        .addSubcommand(sub =>
            sub
                .setName('volume')
                .setDescription('Ajusta el volumen de reproducción')
                .addIntegerOption(opt =>
                    opt
                        .setName('level')
                        .setDescription('Nivel de volumen (0-200)')
                        .setMinValue(0)
                        .setMaxValue(200)
                        .setRequired(true)
                )
        )
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Este comando solo funciona en servidores.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const subcommand = interaction.options.getSubcommand();

            // Para 'play' hacemos defer inmediato porque puede tardar
            if (subcommand === 'play') {
                await interaction.deferReply();
            }

            switch (subcommand) {
                case 'play':
                    await handlePlaySlash(interaction);
                    break;
                case 'skip':
                    await handleSkip(interaction);
                    break;
                case 'stop':
                    await handleStop(interaction);
                    break;
                case 'pause':
                    await handlePause(interaction);
                    break;
                case 'resume':
                    await handleResume(interaction);
                    break;
                case 'queue':
                    await handleQueueSlash(interaction);
                    break;
                case 'nowplaying':
                    await handleNowPlaying(interaction);
                    break;
                case 'shuffle':
                    await handleShuffle(interaction);
                    break;
                case 'clear':
                    await handleClear(interaction);
                    break;
                case 'volume':
                    await handleVolumeSlash(interaction);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'music');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            Validators.validateInGuild(message);

            const subcommand = args[0]?.toLowerCase();
            const validSubcommands = [
                'play', 'p', 'reproducir',
                'skip', 's', 'saltar', 'next',
                'stop', 'detener', 'leave',
                'pause', 'pausar',
                'resume', 'continuar', 'reanudar',
                'queue', 'q', 'cola', 'list',
                'nowplaying', 'np', 'actual', 'current',
                'shuffle', 'mezclar',
                'clear', 'limpiar',
                'volume', 'vol', 'volumen'
            ];

            if (!subcommand || !validSubcommands.includes(subcommand)) {
                await message.reply(
                    `${EMOJIS.MUSIC} **Sistema de Música**\n\n` +
                    `**Uso:** \`${config.prefix}music <acción> [opciones]\`\n\n` +
                    `**Comandos disponibles:**\n` +
                    `• \`play\` (\`p\`) <búsqueda/URL> - Reproduce música\n` +
                    `• \`skip\` (\`s\`) - Salta la canción actual\n` +
                    `• \`stop\` - Detiene la música\n` +
                    `• \`pause\` - Pausa la reproducción\n` +
                    `• \`resume\` - Reanuda la reproducción\n` +
                    `• \`queue\` (\`q\`) [página] - Muestra la cola\n` +
                    `• \`nowplaying\` (\`np\`) - Canción actual\n` +
                    `• \`shuffle\` - Mezcla la cola\n` +
                    `• \`clear\` - Limpia la cola\n` +
                    `• \`volume\` (\`vol\`) <0-200> - Ajusta volumen\n\n` +
                    `**Ejemplos:**\n` +
                    `\`${config.prefix}play Never Gonna Give You Up\`\n` +
                    `\`${config.prefix}p https://youtube.com/watch?v=...\`\n` +
                    `\`${config.prefix}vol 80\``
                );
                return;
            }

            // Mapear aliases
            const commandMap: Record<string, string> = {
                'p': 'play', 'reproducir': 'play',
                's': 'skip', 'saltar': 'skip', 'next': 'skip',
                'detener': 'stop', 'leave': 'stop',
                'pausar': 'pause',
                'continuar': 'resume', 'reanudar': 'resume',
                'q': 'queue', 'cola': 'queue', 'list': 'queue',
                'np': 'nowplaying', 'actual': 'nowplaying', 'current': 'nowplaying',
                'mezclar': 'shuffle',
                'limpiar': 'clear',
                'vol': 'volume', 'volumen': 'volume'
            };

            const normalizedCommand = commandMap[subcommand] || subcommand;

            switch (normalizedCommand) {
                case 'play':
                    await handlePlayPrefix(message, args.slice(1));
                    break;
                case 'skip':
                    await handleSkip(message);
                    break;
                case 'stop':
                    await handleStop(message);
                    break;
                case 'pause':
                    await handlePause(message);
                    break;
                case 'resume':
                    await handleResume(message);
                    break;
                case 'queue':
                    await handleQueuePrefix(message, args.slice(1));
                    break;
                case 'nowplaying':
                    await handleNowPlaying(message);
                    break;
                case 'shuffle':
                    await handleShuffle(message);
                    break;
                case 'clear':
                    await handleClear(message);
                    break;
                case 'volume':
                    await handleVolumePrefix(message, args.slice(1));
                    break;
            }
        } catch (error) {
            await handleCommandError(error, message, 'music');
        }
    },
};

// ==================== FUNCIONES AUXILIARES ====================

function validateVoiceChannel(context: ChatInputCommandInteraction | Message): void {
    const member = context.member as GuildMember;

    if (!member.voice.channel) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en un canal de voz',
            '❌ Debes estar en un canal de voz para usar este comando.'
        );
    }

    const botMember = context.guild!.members.me;
    if (botMember?.voice.channel && botMember.voice.channel.id !== member.voice.channel.id) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario en diferente canal de voz',
            '❌ Debes estar en el mismo canal de voz que el bot.'
        );
    }
}

function getQueue(context: ChatInputCommandInteraction | Message) {
    const client = context.client as any;
    if (!client.musicManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'MusicManager no inicializado',
            '❌ El sistema de música no está disponible.'
        );
    }

    const queue = client.musicManager.getQueue(context.guild!.id);
    if (!queue) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay cola activa',
            '❌ No hay música reproduciéndose actualmente.'
        );
    }

    return queue;
}

// ==================== HANDLERS ====================

async function handlePlaySlash(interaction: ChatInputCommandInteraction): Promise<void> {
    validateVoiceChannel(interaction);

    const query = interaction.options.getString('query', true);
    await executePlay(interaction, query);
}

async function handlePlayPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}play <búsqueda/URL>\`\n\n` +
            `**Ejemplos:**\n` +
            `\`${config.prefix}play Rick Astley - Never Gonna Give You Up\`\n` +
            `\`${config.prefix}play https://youtube.com/watch?v=dQw4w9WgXcQ\`\n` +
            `\`${config.prefix}p https://open.spotify.com/track/...\``
        );
        return;
    }

    validateVoiceChannel(message);

    const query = args.join(' ');
    await executePlay(message, query);
}

async function executePlay(
    context: ChatInputCommandInteraction | Message,
    query: string
): Promise<void> {
    const isInteraction = context instanceof ChatInputCommandInteraction;
    const member = context.member as GuildMember;
    const client = context.client as any;

    if (!client.musicManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'MusicManager no inicializado',
            '❌ El sistema de música no está disponible.'
        );
    }

    try {
        const searchResult = await client.musicManager.player.search(query, {
            requestedBy: context instanceof ChatInputCommandInteraction ? context.user : context.author,
            searchEngine: QueryType.AUTO
        });

        if (!searchResult.hasTracks()) {
            const embed = new EmbedBuilder()
                .setDescription(`${EMOJIS.ERROR} No se encontraron resultados para: **${query}**`)
                .setColor(COLORS.DANGER);

            if (isInteraction) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.reply({ embeds: [embed] });
            }
            return;
        }

        // ✅ Usar los métodos del MusicManager (más limpio)
        let queue = client.musicManager.getQueue(context.guild!.id);

        if (!queue) {
            // ✅ Crear cola usando MusicManager.createQueue()
            queue = client.musicManager.createQueue(context.guild!, {
                metadata: {
                    channel: context.channel,
                    client: context.guild?.members.me,
                    requestedBy: context instanceof ChatInputCommandInteraction ? context.user : context.author
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 60000,
                leaveOnEnd: false,
                leaveOnStop: true,
            });
        }

        try {
            if (!queue.connection) {
                await queue.connect(member.voice.channel!);
            }
        } catch (error) {
            client.musicManager.deleteQueue(context.guild!.id);
            throw new CommandError(
                ErrorType.UNKNOWN,
                'Error conectando al canal de voz',
                '❌ No pude conectarme al canal de voz. Verifica mis permisos.'
            );
        }

        const wasEmpty = queue.tracks.size === 0 && !queue.currentTrack;

        if (searchResult.playlist) {
            queue.addTrack(searchResult.tracks);
            const embed = new EmbedBuilder()
                .setTitle(`${EMOJIS.SUCCESS} Playlist añadida`)
                .setDescription(
                    `**Playlist:** ${searchResult.playlist.title}\n` +
                    `**Canciones:** ${searchResult.tracks.length}\n` +
                    `**Solicitado por:** ${member.user.tag}`
                )
                .setThumbnail(searchResult.playlist.thumbnail)
                .setColor(COLORS.MUSIC);

            if (isInteraction) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.reply({ embeds: [embed] });
            }
        } else {
            const track = searchResult.tracks[0];
            queue.addTrack(track);

            const embed = new EmbedBuilder()
                .setTitle(wasEmpty ? `${EMOJIS.PLAY} Reproduciendo` : `${EMOJIS.SUCCESS} Añadido a la cola`)
                .setDescription(
                    `**[${track.title}](${track.url})**\n` +
                    `**Duración:** ${track.duration}\n` +
                    `**Solicitado por:** ${member.user.tag}`
                )
                .setThumbnail(track.thumbnail)
                .setColor(COLORS.MUSIC);

            if (!wasEmpty) {
                embed.addFields({
                    name: 'Posición en cola',
                    value: `#${queue.tracks.size}`,
                    inline: true
                });
            }

            if (isInteraction) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.reply({ embeds: [embed] });
            }
        }

        if (wasEmpty) {
            await queue.node.play();
        }

    } catch (error) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Error buscando/reproduciendo música',
            '❌ Hubo un error al buscar la música. Intenta de nuevo.'
        );
    }
}

async function handleSkip(context: ChatInputCommandInteraction | Message): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    if (!queue.currentTrack) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay canción actual',
            '❌ No hay ninguna canción reproduciéndose.'
        );
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();

    const embed = new EmbedBuilder()
        .setDescription(`${EMOJIS.SKIP} Saltando: **${currentTrack.title}**`)
        .setColor(COLORS.INFO);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleStop(context: ChatInputCommandInteraction | Message): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    queue.delete();

    const embed = new EmbedBuilder()
        .setDescription(`${EMOJIS.STOP} Música detenida y cola limpiada.`)
        .setColor(COLORS.INFO);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handlePause(context: ChatInputCommandInteraction | Message): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    if (queue.node.isPaused()) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Ya está pausado',
            '❌ La reproducción ya está pausada.'
        );
    }

    queue.node.pause();

    const embed = new EmbedBuilder()
        .setDescription(`${EMOJIS.PAUSE} Reproducción pausada.`)
        .setColor(COLORS.INFO);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleResume(context: ChatInputCommandInteraction | Message): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    if (!queue.node.isPaused()) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'No está pausado',
            '❌ La reproducción no está pausada.'
        );
    }

    queue.node.resume();

    const embed = new EmbedBuilder()
        .setDescription(`${EMOJIS.PLAY} Reproducción reanudada.`)
        .setColor(COLORS.INFO);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleQueueSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const page = interaction.options.getInteger('page') || 1;
    await executeQueue(interaction, page);
}

async function handleQueuePrefix(message: Message, args: string[]): Promise<void> {
    const page = args[0] ? parseInt(args[0]) : 1;
    if (isNaN(page) || page < 1) {
        await message.reply('❌ El número de página debe ser un número positivo.');
        return;
    }
    await executeQueue(message, page);
}

async function executeQueue(
    context: ChatInputCommandInteraction | Message,
    page: number
): Promise<void> {
    const queue = getQueue(context);

    const tracksPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.size / tracksPerPage);

    if (page > totalPages && totalPages > 0) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Página fuera de rango',
            `❌ Solo hay ${totalPages} página(s) en la cola.`
        );
    }

    const start = (page - 1) * tracksPerPage;
    const end = start + tracksPerPage;
    const tracks = queue.tracks.toArray().slice(start, end);

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.MUSIC} Cola de reproducción`)
        .setColor(COLORS.MUSIC);

    if (queue.currentTrack) {
        embed.addFields({
            name: '🎵 Reproduciendo ahora',
            value: `**[${queue.currentTrack.title}](${queue.currentTrack.url})**\n` +
                `Duración: ${queue.currentTrack.duration} | Solicitado por: ${queue.currentTrack.requestedBy?.tag}`
        });
    }

    if (tracks.length > 0) {

        const queueList = tracks.map((track: Track, i: number) => {
            const position = start + i + 1;
            return `**${position}.** [${track.title}](${track.url}) - \`${track.duration}\``;
        }).join('\n');

        embed.addFields({
            name: `📋 Próximas canciones (${queue.tracks.size} total)`,
            value: queueList
        });

        if (totalPages > 1) {
            embed.setFooter({ text: `Página ${page}/${totalPages}` });
        }
    } else if (!queue.currentTrack) {
        embed.setDescription('La cola está vacía.');
    }

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleNowPlaying(context: ChatInputCommandInteraction | Message): Promise<void> {
    const queue = getQueue(context);

    if (!queue.currentTrack) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay canción actual',
            '❌ No hay ninguna canción reproduciéndose.'
        );
    }

    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar();

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.MUSIC} Reproduciendo ahora`)
        .setDescription(`**[${track.title}](${track.url})**`)
        .addFields(
            { name: 'Duración', value: track.duration, inline: true },
            { name: 'Solicitado por', value: track.requestedBy?.tag || 'Desconocido', inline: true },
            { name: 'Progreso', value: progress || 'N/A' }
        )
        .setThumbnail(track.thumbnail)
        .setColor(COLORS.MUSIC);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleShuffle(context: ChatInputCommandInteraction | Message): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    if (queue.tracks.size === 0) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Cola vacía',
            '❌ No hay canciones en la cola para mezclar.'
        );
    }

    queue.tracks.shuffle();

    const embed = new EmbedBuilder()
        .setDescription(`${EMOJIS.SHUFFLE} Cola mezclada (${queue.tracks.size} canciones).`)
        .setColor(COLORS.INFO);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleClear(context: ChatInputCommandInteraction | Message): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    if (queue.tracks.size === 0) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Cola vacía',
            '❌ No hay canciones en la cola para limpiar.'
        );
    }

    const count = queue.tracks.size;
    queue.tracks.clear();

    const embed = new EmbedBuilder()
        .setDescription(`${EMOJIS.SUCCESS} Cola limpiada (${count} canciones eliminadas).`)
        .setColor(COLORS.SUCCESS);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function handleVolumeSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const level = interaction.options.getInteger('level', true);
    await executeVolume(interaction, level);
}

async function handleVolumePrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}volume <0-200>\`\n\n` +
            `**Ejemplo:** \`${config.prefix}vol 80\``
        );
        return;
    }

    const level = parseInt(args[0]);
    if (isNaN(level) || level < 0 || level > 200) {
        await message.reply('❌ El volumen debe ser un número entre 0 y 200.');
        return;
    }

    await executeVolume(message, level);
}

async function executeVolume(
    context: ChatInputCommandInteraction | Message,
    level: number
): Promise<void> {
    validateVoiceChannel(context);
    const queue = getQueue(context);

    queue.node.setVolume(level);

    const volumeEmoji = level === 0 ? '🔇' : level < 50 ? '🔉' : '🔊';

    const embed = new EmbedBuilder()
        .setDescription(`${volumeEmoji} Volumen ajustado a **${level}%**`)
        .setColor(COLORS.INFO);

    if (context instanceof ChatInputCommandInteraction) {
        await context.reply({ embeds: [embed] });
    } else {
        await context.reply({ embeds: [embed] });
    }
}
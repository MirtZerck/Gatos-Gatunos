import {
    Message,
    EmbedBuilder,
    GuildMember,
    TextChannel
} from 'discord.js';
import { BotClient } from '../../../../types/BotClient.js';
import { COLORS, EMOJIS } from '../../../../utils/constants.js';
import { CommandError, ErrorType } from '../../../../utils/errorHandler.js';
import { logger } from '../../../../utils/logger.js';
import { config } from '../../../../config.js';
import { LoopMode } from '../../../../managers/MusicManager.js';
import { getVoiceChannel, ensureSameVoiceChannel, getMusicManager } from '../utils.js';
import { SPOTIFY_GREEN, ITEMS_PER_PAGE, MIN_VOLUME, MAX_VOLUME } from '../constants.js';
import { createHelpEmbed } from '../embeds.js';

export async function showHelp(message: Message): Promise<void> {
    const embed = createHelpEmbed();
    await message.reply({ embeds: [embed] });
}

export async function handlePlayPrefix(message: Message, args: string[]): Promise<void> {
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
                .setColor(SPOTIFY_GREEN)
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

export async function handlePausePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
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

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.PAUSE} Reproduccion pausada`)
        ]
    });
}

export async function handleResumePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
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

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.PLAY} Reproduccion reanudada`)
        ]
    });
}

export async function handleSkipPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    const currentTrack = player.queue.current;
    await player.skip();

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.SKIP} Saltando: **${currentTrack?.title || 'Cancion'}**`)
        ]
    });
}

export async function handleStopPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await musicManager.stop(message.guildId!);

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.STOP} Reproduccion detenida y cola limpiada`)
        ]
    });
}

export async function handleQueuePrefix(message: Message, args: string[]): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);
    const page = args[0] ? parseInt(args[0]) : 1;

    const player = musicManager.getPlayer(message.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cola', 'No hay musica reproduciendose.');
    }

    const current = player.queue.current;
    const tracks = player.queue;
    const totalPages = Math.max(1, Math.ceil(tracks.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, tracks.length);

    let description = `${EMOJIS.PLAY} **Ahora:** [${current.title}](${current.uri}) - \`${musicManager.formatTime(Math.floor((current.length || 0) / 1000))}\`\n\n`;

    if (tracks.length > 0) {
        description += '**Cola:**\n';
        for (let i = start; i < end; i++) {
            const track = tracks[i];
            description += `**${i + 1}.** [${track.title}](${track.uri}) - \`${musicManager.formatTime(Math.floor((track.length || 0) / 1000))}\`\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(SPOTIFY_GREEN)
        .setTitle(`${EMOJIS.MUSIC} Cola de reproduccion`)
        .setDescription(description)
        .setFooter({ text: `Pagina ${currentPage}/${totalPages} | ${tracks.length + 1} canciones` });

    await message.reply({ embeds: [embed] });
}

export async function handleNowPlayingPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cancion', 'No hay ninguna cancion reproduciendose.');
    }

    const embed = musicManager.createPlayerEmbed(player, player.queue.current);
    await message.reply({ embeds: [embed] });
}

export async function handleVolumePrefix(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        await message.reply(`Uso: \`${config.prefix}music volume <0-100>\``);
        return;
    }

    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);
    const level = parseInt(args[0]);

    if (isNaN(level) || level < MIN_VOLUME || level > MAX_VOLUME) {
        await message.reply(`El volumen debe ser un numero entre ${MIN_VOLUME} y ${MAX_VOLUME}.`);
        return;
    }

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    await player.setVolume(level);
    await musicManager.refreshPlayerEmbed(player);

    const volumeEmoji = level === 0 ? EMOJIS.VOLUME : level < 50 ? EMOJIS.VOLUME : EMOJIS.VOLUME;

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${volumeEmoji} Volumen ajustado a **${level}%**`)
        ]
    });
}

export async function handleShufflePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    player.queue.shuffle();
    await musicManager.refreshPlayerEmbed(player);

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.SHUFFLE} Cola mezclada aleatoriamente`)
        ]
    });
}

export async function handleLoopPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
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

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.REPEAT} Modo de repeticion: **${modeText}**`)
        ]
    });
}

export async function handleAutoplayPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    const newState = musicManager.toggleAutoplay(message.guildId!);
    await musicManager.refreshPlayerEmbed(player);

    const statusText = newState ? 'Activado' : 'Desactivado';
    const emoji = newState ? EMOJIS.SUCCESS : EMOJIS.ERROR;

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(newState ? COLORS.SUCCESS : COLORS.INFO)
                .setDescription(`${emoji} Reproduccion automatica: **${statusText}**`)
        ]
    });
}

export async function handleJoinPrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    const voiceChannel = getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    await musicManager.join(voiceChannel, message.channel as TextChannel);

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(`${EMOJIS.SUCCESS} Conectado a **${voiceChannel.name}**`)
        ]
    });
}

export async function handleLeavePrefix(message: Message): Promise<void> {
    const member = message.member as GuildMember;
    getVoiceChannel(member);
    const client = message.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(message.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin conexion', 'El bot no esta conectado a ningun canal.');
    }

    await musicManager.leave(message.guildId!);

    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription(`${EMOJIS.SUCCESS} Desconectado del canal de voz`)
        ]
    });
}

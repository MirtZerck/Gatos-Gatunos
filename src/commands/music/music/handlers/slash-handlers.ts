import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    TextChannel
} from 'discord.js';
import { BotClient } from '../../../../types/BotClient.js';
import { COLORS, EMOJIS } from '../../../../utils/constants.js';
import { CommandError, ErrorType } from '../../../../utils/errorHandler.js';
import { logger } from '../../../../utils/logger.js';
import { LoopMode } from '../../../../managers/MusicManager.js';
import { getVoiceChannel, ensureSameVoiceChannel, getMusicManager } from '../utils.js';
import { SPOTIFY_GREEN, ITEMS_PER_PAGE } from '../constants.js';

export async function handlePlay(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const voiceChannel = getVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);
    const query = interaction.options.getString('query', true);

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(SPOTIFY_GREEN)
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

export async function handlePause(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleResume(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleSkip(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleStop(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);
    const page = interaction.options.getInteger('page') || 1;

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cola', 'No hay musica reproduciendose.');
    }

    const current = player.queue.current;
    const tracks = player.queue;
    const totalPages = Math.max(1, Math.ceil(tracks.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
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

    await interaction.reply({ embeds: [embed] });
}

export async function handleNowPlaying(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player || !player.queue.current) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin cancion', 'No hay ninguna cancion reproduciendose.');
    }

    const embed = musicManager.createPlayerEmbed(player, player.queue.current);
    await interaction.reply({ embeds: [embed] });
}

export async function handleVolume(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleShuffle(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleLoop(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
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

export async function handleAutoplay(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    ensureSameVoiceChannel(member);
    const client = interaction.client as BotClient;
    const musicManager = getMusicManager(client);

    const player = musicManager.getPlayer(interaction.guildId!);
    if (!player) {
        throw new CommandError(ErrorType.NOT_FOUND, 'Sin player', 'No hay musica reproduciendose.');
    }

    const newState = musicManager.toggleAutoplay(interaction.guildId!);
    await musicManager.refreshPlayerEmbed(player);

    const statusText = newState ? 'Activado' : 'Desactivado';
    const emoji = newState ? EMOJIS.SUCCESS : EMOJIS.ERROR;

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(newState ? COLORS.SUCCESS : COLORS.INFO)
                .setDescription(`${emoji} Reproduccion automatica: **${statusText}**`)
        ]
    });
}

export async function handleJoin(interaction: ChatInputCommandInteraction): Promise<void> {
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

export async function handleLeave(interaction: ChatInputCommandInteraction): Promise<void> {
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

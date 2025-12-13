import { GuildMember, VoiceBasedChannel } from 'discord.js';
import { BotClient } from '../../../types/BotClient.js';
import { CommandError, ErrorType } from '../../../utils/errorHandler.js';
import { MusicManager } from '../../../managers/MusicManager.js';

export function getVoiceChannel(member: GuildMember): VoiceBasedChannel {
    if (!member.voice.channel) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no esta en canal de voz',
            'Debes estar en un canal de voz para usar este comando.'
        );
    }
    return member.voice.channel;
}

export function getMusicManager(client: BotClient): MusicManager {
    if (!client.musicManager) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Sistema de música no disponible',
            'El sistema de música no está disponible en este momento.'
        );
    }
    return client.musicManager;
}

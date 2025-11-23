import { Events, VoiceState } from 'discord.js';
import { Event } from '../types/Events.js';
import { BotClient } from '../types/BotClient.js';

/**
 * Handler del evento VoiceStateUpdate.
 * Detecta cambios en canales de voz para gestionar desconexión por inactividad.
 */
export default {
    name: Events.VoiceStateUpdate,

    async execute(client: BotClient, oldState: VoiceState, newState: VoiceState) {
        const musicManager = client.musicManager;
        if (!musicManager) return;

        const guildId = oldState.guild.id;

        if (oldState.channelId) {
            await musicManager.handleVoiceStateUpdate(guildId, oldState.channelId);
        }

        if (newState.channelId) {
            await musicManager.handleVoiceStateUpdate(guildId, newState.channelId);
        }
    }
} as Event;

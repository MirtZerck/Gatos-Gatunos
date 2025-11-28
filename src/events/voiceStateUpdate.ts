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
        const player = musicManager.getPlayer(guildId);

        if (!player) return;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const botVoiceChannel = guild.members.me?.voice.channel;
        if (!botVoiceChannel) return;

        const botChannelId = botVoiceChannel.id;
        if (oldState.channelId === botChannelId || newState.channelId === botChannelId) {
            await musicManager.handleVoiceStateUpdate(guildId, botChannelId);
        }
    }
} as Event;

import { Events, VoiceState } from 'discord.js';
import { Event } from '../types/Events.js';
import { BotClient } from '../types/BotClient.js';

export default {
    name: Events.VoiceStateUpdate,

    async execute(client, oldState: VoiceState, newState: VoiceState) {
        const botClient = client as BotClient;
        const musicManager = botClient.musicManager;

        if (!musicManager) return;

        // Solo nos interesa cuando alguien sale de un canal
        const guildId = oldState.guild.id;

        // Verificar si el usuario salio del canal donde esta el bot
        if (oldState.channelId) {
            await musicManager.handleVoiceStateUpdate(guildId, oldState.channelId);
        }

        // Verificar si alguien se unio al canal donde esta el bot
        if (newState.channelId) {
            await musicManager.handleVoiceStateUpdate(guildId, newState.channelId);
        }
    }
} as Event;

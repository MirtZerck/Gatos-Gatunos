import { Message } from 'discord.js';

export interface GameRoom {
    hostId: string;
    players: Set<string>;
    channelId: string;
    guildId: string;
    started: boolean;
    currentWord?: string;
    skipVotes: Set<string>;
    impostorId?: string;
    useAI: boolean;
    useCustomThemes: boolean;
    proposedWords: Map<string, string>;
    lobbyMessage?: Message;
    gameMessage?: Message;
    turnOrder?: string[];
    alivePlayers: Set<string>;
    votingInProgress: boolean;
    votes: Map<string, string>;
    votingMessage?: Message;
}

export const activeRooms = new Map<string, GameRoom>();

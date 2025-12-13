import { GuildMember, User } from 'discord.js';
import { MillionaireGameRoom } from '../../../types/millionaire.js';

/**
 * Genera la clave única para una sala de juego
 */
export function getRoomKey(guildId: string, channelId: string): string {
    return `${guildId}-${channelId}`;
}

/**
 * Obtiene el nombre de visualización de un miembro
 */
export function getMemberDisplayName(member: GuildMember | null | undefined, user: User): string {
    if (member && typeof member === 'object' && 'displayName' in member) {
        return member.displayName;
    }
    return user.displayName;
}

/**
 * Verifica si el juego puede iniciarse (tiene al menos un jugador)
 */
export function canStartGame(room: MillionaireGameRoom): boolean {
    return !!room.playerId;
}

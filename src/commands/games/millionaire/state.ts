import { MillionaireGameRoom } from '../../../types/millionaire.js';

/**
 * Mapa global de salas activas del juego Millionaire
 * Key: guildId-channelId
 */
export const activeRooms = new Map<string, MillionaireGameRoom>();

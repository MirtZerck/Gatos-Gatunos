import { Message, EmbedBuilder, Guild, Client } from 'discord.js';
import { activeRooms, GameRoom } from './state.js';
import { getMemberDisplayName } from './utils.js';
import { createLobbyButtons } from './buttons.js';
import { createSuccessEmbed, createInfoEmbed } from '../../../utils/messageUtils.js';
import { createGameEndEmbed } from './embeds.js';
import { logger } from '../../../utils/logger.js';

export async function updateLobbyMessage(room: GameRoom, interactionMessage?: Message): Promise<void> {
    const messageToEdit = interactionMessage || room.lobbyMessage;
    if (!messageToEdit) return;

    if (messageToEdit.channel.isDMBased()) return;

    const botMember = await messageToEdit.guild?.members.fetchMe();
    if (!botMember) return;

    const permissions = messageToEdit.channel.permissionsFor(botMember);

    if (!permissions) {
        logger.warn('Impostor', 'No se pudieron obtener permisos del bot en el canal');
        return;
    }

    const requiredPerms = ['ViewChannel', 'SendMessages', 'EmbedLinks'] as const;
    const missingPerms = requiredPerms.filter(perm => !permissions.has(perm));

    if (missingPerms.length > 0) {
        logger.error('Impostor', `Faltan permisos en el canal: ${missingPerms.join(', ')}`);
        return;
    }

    const playerNames: string[] = [];
    for (const playerId of room.players) {
        const member = await messageToEdit.guild!.members.fetch(playerId);
        const isHost = playerId === room.hostId;
        const hasProposed = room.proposedWords.has(playerId);
        playerNames.push(`${isHost ? '👑 ' : ''}${member.displayName}${room.useCustomThemes ? (hasProposed ? ' ✅' : ' ⏳') : ''}`);
    }

    let modeText = '';
    if (room.useCustomThemes) {
        modeText = `📝 **Temáticas personalizadas**\n` +
            `📊 **Propuestas:** ${room.proposedWords.size}/${room.players.size}\n`;
        if (room.proposedWords.size < room.players.size) {
            modeText += `⚠️ Faltan jugadores por proponer su palabra\n`;
        }
    }

    const embed = createSuccessEmbed(
        '🎮 Sala de Juego',
        `👥 **Jugadores (${room.players.size}/10):**\n${playerNames.join(', ')}\n\n` +
        `🎯 **Estado:** ${room.started ? '🎮 En juego' : '⏳ Esperando jugadores'}\n\n` +
        modeText +
        `${room.players.size < 3 ? '\n⚠️ Se necesitan mínimo 3 jugadores para empezar' : ''}`
    );

    const buttons = createLobbyButtons(room.useCustomThemes);

    try {
        await messageToEdit.fetch().catch(() => null);
        await messageToEdit.edit({ embeds: [embed], components: [buttons] });
        logger.info('Impostor', 'Mensaje del lobby actualizado correctamente');
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const allPerms = permissions.toArray();
        logger.error('Impostor',
            `Error al actualizar mensaje del lobby.\n` +
            `Canal: ${messageToEdit.channel.id}\n` +
            `Mensaje: ${messageToEdit.id}\n` +
            `Permisos del bot: ${allPerms.join(', ')}\n` +
            `ViewChannel: ${permissions.has('ViewChannel')}\n` +
            `SendMessages: ${permissions.has('SendMessages')}\n` +
            `EmbedLinks: ${permissions.has('EmbedLinks')}\n` +
            `ReadMessageHistory: ${permissions.has('ReadMessageHistory')}\n` +
            `ManageMessages: ${permissions.has('ManageMessages')}`,
            err);

        if (permissions.has('SendMessages') && permissions.has('ViewChannel')) {
            try {
                await messageToEdit.channel.send(
                    '⚠️ **Advertencia:** No puedo actualizar el mensaje del lobby. ' +
                    'Verifica que el bot tenga los permisos de **Ver Canal**, **Enviar Mensajes**, ' +
                    '**Insertar Enlaces** y **Leer Historial de Mensajes** en este canal específico.'
                ).catch(() => {});
            } catch {}
        }
    }
}

export async function checkVictoryConditions(roomKey: string): Promise<boolean> {
    const room = activeRooms.get(roomKey);

    if (!room) return false;

    if (room.alivePlayers.size <= 2) {
        return true;
    }

    return false;
}

export async function endGame(
    client: Client,
    roomKey: string,
    impostorWins: boolean
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) return;

    const guild = client.guilds.cache.get(room.guildId);
    const impostor = await guild!.members.fetch(room.impostorId!);
    const word = room.currentWord!;

    const embed = await createGameEndEmbed(impostorWins, impostor.displayName, word);

    const channel = client.channels.cache.get(room.channelId);
    if (channel && 'send' in channel) {
        await channel.send({ embeds: [embed] });
    }

    if (room.gameMessage) {
        try {
            await room.gameMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del juego', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.lobbyMessage) {
        try {
            await room.lobbyMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del lobby', error instanceof Error ? error : new Error(String(error)));
        }
    }

    activeRooms.delete(roomKey);
    logger.info('Impostor', `Juego terminado en sala ${roomKey} - ${impostorWins ? 'Impostor gana' : 'Jugadores ganan'}`);
}

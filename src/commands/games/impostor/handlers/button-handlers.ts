import {
    ButtonInteraction,
    MessageFlags,
    ComponentType,
    Message
} from 'discord.js';
import { activeRooms } from '../state.js';
import {
    getMemberDisplayName,
    getRandomImpostor,
    generateTurnOrder,
    sendDM,
    getRequiredVotes,
    selectWordFromProposals,
    generateThemeWithAI,
    getRandomWord
} from '../utils.js';
import { createLobbyButtons, createGameButtons } from '../buttons.js';
import { createRoleEmbed, createNewWordEmbed } from '../embeds.js';
import { updateLobbyMessage } from '../game.js';
import { startVoting } from '../voting.js';
import { createInfoEmbed } from '../../../../utils/messageUtils.js';
import { logger } from '../../../../utils/logger.js';

export async function handleButtonInteraction(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const customId = interaction.customId;

    switch (customId) {
        case 'impostor_join':
            await handleJoinButton(interaction, roomKey);
            break;
        case 'impostor_start':
            await handleStartButton(interaction, roomKey);
            break;
        case 'impostor_toggle_custom':
            await handleToggleCustomButton(interaction, roomKey);
            break;
        case 'impostor_leave':
            await handleLeaveButton(interaction, roomKey);
            break;
        case 'impostor_skip':
            await handleSkipButton(interaction, roomKey);
            break;
        case 'impostor_start_vote':
            await handleStartVoteButton(interaction, roomKey);
            break;
        case 'impostor_next_round':
            await handleNextRoundButton(interaction, roomKey);
            break;
    }
}

export async function handleJoinButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ El juego ya ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.players.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ Ya estás en la sala.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.players.size >= 10) {
        await interaction.reply({
            content: '❌ La sala está llena (máximo 10 jugadores).',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.players.add(interaction.user.id);

    await interaction.reply({
        content: `✅ **${getMemberDisplayName(interaction.member, interaction.user)}** se ha unido a la partida!`,
        flags: MessageFlags.Ephemeral
    });

    await updateLobbyMessage(room, interaction.message);
}

export async function handleToggleCustomButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ No puedes cambiar el modo mientras el juego está en curso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (interaction.user.id !== room.hostId) {
        await interaction.reply({
            content: '❌ Solo el anfitrión puede cambiar el modo de juego.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.useCustomThemes = !room.useCustomThemes;

    if (!room.useCustomThemes) {
        room.proposedWords.clear();
    }

    await interaction.reply({
        content: room.useCustomThemes
            ? '🎭 **Modo temáticas personalizadas activado**\nCada jugador debe proponer su palabra con `/impostor proponer`'
            : '✅ **Modo temáticas personalizadas desactivado**\nSe usarán temas aleatorios',
        flags: MessageFlags.Ephemeral
    });

    await updateLobbyMessage(room, interaction.message);
}

export async function handleStartButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.hostId !== interaction.user.id) {
        await interaction.reply({
            content: '❌ Solo el anfitrión puede iniciar el juego.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ El juego ya ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.players.size < 3) {
        await interaction.reply({
            content: `❌ Se necesitan mínimo 3 jugadores para empezar. Actualmente hay ${room.players.size}.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.useCustomThemes && room.proposedWords.size < room.players.size) {
        const playersWithoutProposal: string[] = [];
        for (const playerId of room.players) {
            if (!room.proposedWords.has(playerId)) {
                const member = await interaction.guild!.members.fetch(playerId);
                playersWithoutProposal.push(member.displayName);
            }
        }

        await interaction.reply({
            content: `❌ Todos los jugadores deben proponer una palabra antes de empezar.\n\n` +
                `**Falta(n):** ${playersWithoutProposal.join(', ')}\n` +
                `Usa \`/impostor proponer <palabra>\` para proponer.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.deferReply();

    const playerIds = Array.from(room.players);
    const impostorId = getRandomImpostor(playerIds);

    let word: string;
    let proposedWordsText: string = '';

    if (room.useCustomThemes) {
        word = selectWordFromProposals(room.proposedWords, impostorId);
        const allProposals = Array.from(room.proposedWords.values());
        proposedWordsText = `\n**🎯 Palabras propuestas:**\n${allProposals.map(w => `• ${w}`).join('\n')}\n` +
            `La palabra elegida es una de estas.\n`;
    } else {
        word = room.useAI ? await generateThemeWithAI() : getRandomWord();
    }

    const turnOrder = generateTurnOrder(playerIds, impostorId);

    room.started = true;
    room.currentWord = word;
    room.impostorId = impostorId;
    room.turnOrder = turnOrder;
    room.skipVotes.clear();
    room.alivePlayers = new Set(playerIds);
    room.votingInProgress = false;
    room.votes.clear();

    const turnOrderText: string[] = [];
    for (let i = 0; i < turnOrder.length; i++) {
        const member = await interaction.guild!.members.fetch(turnOrder[i]);
        turnOrderText.push(`${i + 1}. ${member.displayName}`);
    }

    const failedDMs: string[] = [];

    for (const playerId of playerIds) {
        const member = await interaction.guild!.members.fetch(playerId);
        const player = member.user;
        const isImpostor = playerId === impostorId;

        const embed = await createRoleEmbed(isImpostor, word, turnOrderText);

        const success = await sendDM(player, embed);
        if (!success) {
            failedDMs.push(member.displayName);
        }
    }

    let modeInfoButton = '';
    if (room.useCustomThemes) {
        modeInfoButton = `**📝 Modo:** Temáticas Personalizadas\n` +
            `**💡 Info:** La palabra fue seleccionada aleatoriamente entre las propuestas de los jugadores\n\n`;
    }

    let resultMessage = `🎮 **¡El juego ha comenzado!**\n\n` +
        `Se han enviado los roles por mensaje privado a todos los jugadores.\n` +
        `👥 **Jugadores:** ${playerIds.length}\n\n` +
        modeInfoButton +
        `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
        `**Usa los botones para:**\n` +
        `• 🗳️ **Votar Skip** - Cambiar de palabra (requiere mayoría)\n` +
        `• 🗳️ **Empezar Votación** - Votar para expulsar a un jugador\n\n` +
        `¡Que comience el juego! 🎲`;

    if (failedDMs.length > 0) {
        resultMessage += `\n\n⚠️ **Advertencia:** No se pudo enviar DM a: ${failedDMs.join(', ')}`;
    }

    const gameEmbed = createInfoEmbed('🎮 Juego Iniciado', resultMessage);
    const gameButtons = createGameButtons();

    const gameMessage = await interaction.editReply({
        embeds: [gameEmbed],
        components: [gameButtons]
    });

    room.gameMessage = gameMessage as Message;

    if (interaction.message) {
        try {
            await interaction.message.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del lobby - verifica permisos del bot', error instanceof Error ? error : new Error(String(error)));
        }
    }

    await updateLobbyMessage(room, interaction.message);

    const gameCollector = gameMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7200000
    });

    gameCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        try {
            await handleButtonInteraction(buttonInteraction, roomKey);
        } catch (error) {
            logger.error('Impostor', 'Error en botón del juego', error instanceof Error ? error : new Error(String(error)));
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu acción.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    gameCollector.on('end', () => {
        if (activeRooms.has(roomKey)) {
            activeRooms.delete(roomKey);
            logger.info('Impostor', `Sala ${roomKey} eliminada por timeout del juego`);
        }
    });
}

export async function handleLeaveButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.players.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ No estás en la sala.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.started) {
        await interaction.reply({
            content: '❌ No puedes salir mientras el juego está en curso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.players.delete(interaction.user.id);

    if (room.players.size === 0) {
        activeRooms.delete(roomKey);
        await interaction.reply({
            content: '🚪 La sala se ha cerrado porque no quedan jugadores.',
        });

        if (room.lobbyMessage) {
            try {
                await room.lobbyMessage.edit({ components: [] });
            } catch (error) {
                logger.error('Impostor', 'No se pudo deshabilitar botones del lobby cerrado - verifica permisos del bot', error instanceof Error ? error : new Error(String(error)));
            }
        }
        return;
    }

    if (room.hostId === interaction.user.id) {
        const newHostId = Array.from(room.players)[0];
        room.hostId = newHostId;
        const newHost = await interaction.guild!.members.fetch(newHostId);

        await interaction.reply({
            content: `🚪 **${getMemberDisplayName(interaction.member, interaction.user)}** ha salido de la sala.\n👑 **Nuevo anfitrión:** ${newHost.displayName}`,
            flags: MessageFlags.Ephemeral
        });
    } else {
        await interaction.reply({
            content: `🚪 **${getMemberDisplayName(interaction.member, interaction.user)}** ha salido de la sala.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await updateLobbyMessage(room, interaction.message);
}

export async function handleSkipButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.started) {
        await interaction.reply({
            content: '❌ El juego aún no ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.players.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ No estás participando en este juego.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.skipVotes.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ Ya has votado para saltar esta palabra.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    room.skipVotes.add(interaction.user.id);

    const requiredVotes = getRequiredVotes(room.players.size);
    const currentVotes = room.skipVotes.size;

    if (currentVotes >= requiredVotes) {
        room.skipVotes.clear();

        await interaction.deferReply();

        const newWord = room.useAI ? await generateThemeWithAI() : getRandomWord();
        const playerIds = Array.from(room.players);

        room.currentWord = newWord;

        const failedDMs: string[] = [];

        for (const playerId of playerIds) {
            if (playerId === room.impostorId) continue;

            const member = await interaction.guild!.members.fetch(playerId);
            const player = member.user;

            const embed = await createNewWordEmbed(newWord);

            const success = await sendDM(player, embed);
            if (!success) {
                failedDMs.push(member.displayName);
            }
        }

        let skipMessage = `🔄 **¡Palabra cambiada!**\n\n` +
            `La votación para skip ha sido exitosa.\n` +
            `Se ha generado una nueva palabra y enviado a todos los jugadores.\n\n` +
            `📊 **Votos:** ${currentVotes}/${requiredVotes}`;

        if (failedDMs.length > 0) {
            skipMessage += `\n\n⚠️ No se pudo enviar DM a: ${failedDMs.join(', ')}`;
        }

        await interaction.editReply({ content: skipMessage });
    } else {
        await interaction.reply({
            content: `🗳️ **${getMemberDisplayName(interaction.member, interaction.user)}** ha votado para cambiar la palabra.\n📊 **Votos:** ${currentVotes}/${requiredVotes}`,
        });
    }
}

export async function handleStartVoteButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.started) {
        await interaction.reply({
            content: '❌ El juego aún no ha comenzado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.hostId !== interaction.user.id) {
        await interaction.reply({
            content: '❌ Solo el anfitrión puede iniciar la votación.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.votingInProgress) {
        await interaction.reply({
            content: '❌ Ya hay una votación en progreso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.deferReply();

    await startVoting(interaction.client, roomKey, interaction.channelId);

    try {
        await interaction.deleteReply();
    } catch (error) {
        logger.error('Impostor', 'Error al eliminar respuesta diferida', error instanceof Error ? error : new Error(String(error)));
    }
}

export async function handleNextRoundButton(
    interaction: ButtonInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        await interaction.reply({
            content: '❌ Esta sala ya no está activa.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.started) {
        await interaction.reply({
            content: '❌ El juego no está en curso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.hostId !== interaction.user.id) {
        await interaction.reply({
            content: '❌ Solo el anfitrión puede iniciar la siguiente ronda.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        await interaction.message.edit({ components: [] });
    } catch (error) {
        logger.error('Impostor', 'Error al deshabilitar botón de siguiente ronda', error instanceof Error ? error : new Error(String(error)));
    }

    room.skipVotes.clear();

    const aliveCount = room.alivePlayers.size;
    const aliveList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const member = await interaction.guild!.members.fetch(playerId);
        aliveList.push(`• ${member.displayName}`);
    }

    const roundEmbed = createInfoEmbed(
        '▶️ Nueva Ronda',
        `🎮 **El juego continúa**\n\n` +
        `👥 **Jugadores vivos (${aliveCount}):**\n${aliveList.join('\n')}\n\n` +
        `**Continúen dando pistas y discutiendo.**\n` +
        `Cuando estén listos para votar de nuevo, usen el botón "Empezar Votación".`
    );

    const gameButtons = createGameButtons();

    const newGameMessage = await interaction.reply({
        embeds: [roundEmbed],
        components: [gameButtons],
        fetchReply: true
    });

    if (room.gameMessage) {
        try {
            await room.gameMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'Error al deshabilitar botones del mensaje anterior', error instanceof Error ? error : new Error(String(error)));
        }
    }

    room.gameMessage = newGameMessage as Message;

    const collector = newGameMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7200000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        try {
            await handleButtonInteraction(buttonInteraction, roomKey);
        } catch (error) {
            logger.error('Impostor', 'Error en botón de la ronda', error instanceof Error ? error : new Error(String(error)));
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu acción.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on('end', () => {
        if (activeRooms.has(roomKey)) {
            const currentRoom = activeRooms.get(roomKey);
            if (currentRoom && !currentRoom.votingInProgress) {
                logger.info('Impostor', `Collector de ronda terminado para sala ${roomKey}`);
            }
        }
    });
}

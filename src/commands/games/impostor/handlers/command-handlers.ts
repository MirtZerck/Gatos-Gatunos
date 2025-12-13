import {
    ChatInputCommandInteraction,
    ComponentType,
    ButtonInteraction,
    MessageFlags,
    EmbedBuilder
} from 'discord.js';
import { activeRooms, GameRoom } from '../state.js';
import {
    getRoomKey,
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
import { updateLobbyMessage, checkVictoryConditions, endGame } from '../game.js';
import { startVoting } from '../voting.js';
import { createSuccessEmbed, createInfoEmbed, sendMessage } from '../../../../utils/messageUtils.js';
import { CommandError, ErrorType } from '../../../../utils/errorHandler.js';
import { logger } from '../../../../utils/logger.js';
import { COLORS } from '../../../../utils/constants.js';

export async function handleCreate(
    interaction: ChatInputCommandInteraction,
    roomKey: string,
    guildId: string,
    channelId: string
): Promise<void> {
    if (activeRooms.has(roomKey)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Ya existe una sala activa en este canal',
            '❌ Ya hay una sala de juego activa en este canal. Usa el botón "Unirse" para unirte.'
        );
    }

    const useCustomThemes = interaction.options.getBoolean('tematica_personalizada') ?? false;
    const useAI = !useCustomThemes;

    let modeText = '';
    if (useCustomThemes) {
        modeText = '📝 **Temáticas personalizadas:** Cada jugador debe proponer una palabra\n' +
            '⚠️ Todos deben usar `/impostor proponer` antes de empezar\n';
    } else {
        modeText = '';
    }

    let howToPlayText = '';
    if (useCustomThemes) {
        howToPlayText =
            `🎯 **Cómo jugar (Temáticas Personalizadas):**\n\n` +
            `**1️⃣ Unirse:**\n` +
            `   • Haz clic en **"Unirse"** o usa \`/impostor unirse\`\n\n` +
            `**2️⃣ Proponer tu palabra (OBLIGATORIO):**\n` +
            `   • Escribe: \`/impostor proponer palabra:tu_palabra\`\n` +
            `   • Ejemplo: \`/impostor proponer palabra:funeral\`\n` +
            `   • Tu propuesta será **completamente secreta**\n` +
            `   • ✅ aparecerá junto a tu nombre cuando propongas\n\n` +
            `**3️⃣ Empezar:**\n` +
            `   • El anfitrión inicia cuando **todos** hayan propuesto\n` +
            `   • El sistema elegirá una palabra al azar (excepto la del impostor)\n\n` +
            `💡 **Cambiar modo:** El anfitrión puede usar el botón "Activar/Desactivar Personalizado"\n\n` +
            `⚠️ **Importante:** Sin propuestas de todos, no se puede empezar\n\n` +
            modeText +
            `👥 **Jugadores:** 1/10`;
    } else {
        howToPlayText =
            `🎯 **Cómo jugar:**\n` +
            `• Haz clic en **"Unirse"** para unirte\n` +
            `• Necesitas mínimo **3 jugadores** para empezar\n` +
            `• Cuando estén listos, el anfitrión hace clic en **"Empezar"**\n` +
            `• El impostor debe adivinar la palabra que tienen los demás\n` +
            `• Los demás deben dar pistas sin revelar la palabra\n\n` +
            `💡 **Cambiar modo:** El anfitrión puede activar temáticas personalizadas con el botón 🎭\n\n` +
            modeText +
            `👥 **Jugadores:** 1/10`;
    }

    const embed = createSuccessEmbed('🎮 Sala Creada',
        `**${getMemberDisplayName(interaction.member, interaction.user)}** ha creado una sala de juego!\n\n${howToPlayText}`
    );

    const buttons = createLobbyButtons(useCustomThemes);
    await interaction.reply({
        embeds: [embed],
        components: [buttons]
    });
    const response = await interaction.fetchReply();

    const room: GameRoom = {
        hostId: interaction.user.id,
        players: new Set([interaction.user.id]),
        channelId,
        guildId,
        started: false,
        skipVotes: new Set(),
        useAI,
        useCustomThemes,
        proposedWords: new Map(),
        lobbyMessage: response,
        alivePlayers: new Set(),
        votingInProgress: false,
        votes: new Map()
    };

    activeRooms.set(roomKey, room);

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 3600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        try {
            const { handleButtonInteraction } = await import('./button-handlers.js');
            await handleButtonInteraction(buttonInteraction, roomKey);
        } catch (error) {
            logger.error('Impostor', 'Error en botón del lobby', error instanceof Error ? error : new Error(String(error)));
            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu acción.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on('end', () => {
        if (activeRooms.has(roomKey) && !activeRooms.get(roomKey)!.started) {
            activeRooms.delete(roomKey);
            logger.info('Impostor', `Sala ${roomKey} eliminada por inactividad`);
        }
    });
}

export async function handleJoin(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal. Crea una con `/impostor crear`.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ El juego ya ha comenzado. Espera a que termine para unirte a la siguiente partida.'
        );
    }

    if (room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario ya está en la sala',
            '❌ Ya estás en la sala de juego.'
        );
    }

    if (room.players.size >= 10) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Sala llena',
            '❌ La sala está llena (máximo 10 jugadores).'
        );
    }

    room.players.add(interaction.user.id);

    const embed = createSuccessEmbed(
        '✅ Te has unido',
        `**${getMemberDisplayName(interaction.member, interaction.user)}** se ha unido a la partida!\n\n` +
        `👥 **Jugadores:** ${room.players.size}/10`
    );

    await sendMessage(interaction, { embed });

    await updateLobbyMessage(room);
}

export async function handlePropose(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (!room.useCustomThemes) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Temáticas personalizadas no activadas',
            '❌ Esta sala no tiene temáticas personalizadas activadas.'
        );
    }

    if (!room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en la sala',
            '❌ Debes unirte a la sala primero para proponer una palabra.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ El juego ya ha comenzado, no puedes proponer palabras ahora.'
        );
    }

    const palabra = interaction.options.getString('palabra', true).trim().toLowerCase();

    if (palabra.length < 3) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Palabra muy corta',
            '❌ La palabra debe tener al menos 3 caracteres.'
        );
    }

    room.proposedWords.set(interaction.user.id, palabra);

    const embed = createSuccessEmbed(
        '✅ Palabra Propuesta',
        `Has propuesto tu palabra secreta!\n\n` +
        `🔒 **Tu propuesta:** ||${palabra}||\n\n` +
        `📊 **Progreso:** ${room.proposedWords.size}/${room.players.size} jugadores han propuesto`
    );

    await sendMessage(interaction, { embed, ephemeral: true });

    await updateLobbyMessage(room);
}

export async function handleStart(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (room.hostId !== interaction.user.id) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'Usuario no es el host',
            '❌ Solo el anfitrión puede iniciar el juego.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ El juego ya ha comenzado.'
        );
    }

    if (room.players.size < 3) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'No hay suficientes jugadores',
            `❌ Se necesitan mínimo 3 jugadores para empezar. Actualmente hay ${room.players.size}.`
        );
    }

    if (room.useCustomThemes && room.proposedWords.size < room.players.size) {
        const playersWithoutProposal: string[] = [];
        for (const playerId of room.players) {
            if (!room.proposedWords.has(playerId)) {
                const member = await interaction.guild!.members.fetch(playerId);
                playersWithoutProposal.push(member.displayName);
            }
        }

        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Faltan propuestas',
            `❌ Todos los jugadores deben proponer una palabra antes de empezar.\n\n` +
            `**Falta(n):** ${playersWithoutProposal.join(', ')}\n` +
            `Usa \`/impostor proponer <palabra>\` para proponer.`
        );
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

    let modeInfo = '';
    if (room.useCustomThemes) {
        modeInfo = `**📝 Modo:** Temáticas Personalizadas\n` +
            `**💡 Info:** La palabra fue seleccionada aleatoriamente entre las propuestas de los jugadores\n\n`;
    }

    let resultMessage = `🎮 **¡El juego ha comenzado!**\n\n` +
        `Se han enviado los roles por mensaje privado a todos los jugadores.\n` +
        `👥 **Jugadores:** ${playerIds.length}\n\n` +
        modeInfo +
        `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
        `**Reglas:**\n` +
        `• Un jugador es el impostor y NO sabe cuál palabra fue elegida\n` +
        `• Los demás jugadores tienen la misma palabra secreta\n` +
        `• Turnense para dar pistas sobre la palabra\n` +
        `• El impostor debe intentar adivinar la palabra\n` +
        `• Cuando crean saber quién es el impostor, inicien votación con el botón\n` +
        `• Si no les gusta el tema, pueden votar con \`/impostor skip\`\n\n` +
        `**Botones disponibles:**\n` +
        `• 🗳️ **Votar Skip** - Cambiar de palabra (requiere mayoría)\n` +
        `• 🗳️ **Empezar Votación** - Votar para expulsar a un jugador\n\n` +
        `¡Que comience el juego! 🎲`;

    if (failedDMs.length > 0) {
        resultMessage += `\n\n⚠️ **Advertencia:** No se pudo enviar DM a: ${failedDMs.join(', ')}`;
    }

    const gameEmbed = createInfoEmbed('🎮 Juego Iniciado', resultMessage);

    await interaction.editReply({ embeds: [gameEmbed] });

    setTimeout(() => {
        if (activeRooms.has(roomKey)) {
            activeRooms.delete(roomKey);
            logger.info('Impostor', `Sala ${roomKey} eliminada por timeout`);
        }
    }, 7200000);
}

export async function handleSkip(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (!room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego no ha empezado',
            '❌ El juego aún no ha comenzado. Solo se puede votar skip durante una partida.'
        );
    }

    if (!room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en la sala',
            '❌ No estás participando en este juego.'
        );
    }

    if (room.skipVotes.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario ya votó',
            '❌ Ya has votado para saltar esta palabra.'
        );
    }

    room.skipVotes.add(interaction.user.id);

    const requiredVotes = getRequiredVotes(room.players.size);
    const currentVotes = room.skipVotes.size;

    if (currentVotes >= requiredVotes) {
        room.skipVotes.clear();

        await interaction.deferReply();

        const oldWord = room.currentWord;
        const newWord = await generateThemeWithAI();
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
            skipMessage += `\n\n⚠️ **Advertencia:** No se pudo enviar DM a: ${failedDMs.join(', ')}`;
        }

        const skipEmbed = createInfoEmbed('🔄 Palabra Cambiada', skipMessage);
        await interaction.editReply({ embeds: [skipEmbed] });

        logger.info('Impostor', `Palabra cambiada de "${oldWord}" a "${newWord}" en sala ${roomKey}`);
    } else {
        const embed = createInfoEmbed(
            '🗳️ Voto Registrado',
            `**${getMemberDisplayName(interaction.member, interaction.user)}** ha votado para cambiar la palabra.\n\n` +
            `📊 **Votos:** ${currentVotes}/${requiredVotes}\n` +
            `⏳ Faltan ${requiredVotes - currentVotes} voto(s) más para cambiar la palabra.`
        );

        await sendMessage(interaction, { embed });
    }
}

export async function handleLeave(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (!room.players.has(interaction.user.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Usuario no está en la sala',
            '❌ No estás en la sala de juego.'
        );
    }

    if (room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego ya empezó',
            '❌ No puedes salir mientras el juego está en curso. El anfitrión puede usar `/impostor terminar`.'
        );
    }

    room.players.delete(interaction.user.id);

    if (room.players.size === 0) {
        activeRooms.delete(roomKey);
        const embed = createInfoEmbed(
            '🚪 Sala Cerrada',
            'La sala se ha cerrado porque no quedan jugadores.'
        );
        await sendMessage(interaction, { embed });
        return;
    }

    if (room.hostId === interaction.user.id) {
        const newHostId = Array.from(room.players)[0];
        room.hostId = newHostId;
        const newHost = await interaction.guild!.members.fetch(newHostId);

        const embed = createInfoEmbed(
            '🚪 Jugador salió',
            `**${getMemberDisplayName(interaction.member, interaction.user)}** ha salido de la sala.\n` +
            `👑 **Nuevo anfitrión:** ${newHost.displayName}\n` +
            `👥 **Jugadores:** ${room.players.size}/10`
        );
        await sendMessage(interaction, { embed });
        return;
    }

    const embed = createInfoEmbed(
        '🚪 Has salido',
        `Has salido de la sala.\n👥 **Jugadores restantes:** ${room.players.size}/10`
    );
    await sendMessage(interaction, { embed });
}

export async function handlePlayers(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    const playerNames: string[] = [];
    for (const playerId of room.players) {
        const member = await interaction.guild!.members.fetch(playerId);
        const isHost = playerId === room.hostId;
        const isAlive = room.started ? room.alivePlayers.has(playerId) : true;
        const status = room.started ? (isAlive ? '✅' : '💀') : '';
        playerNames.push(`${status} ${isHost ? '👑 ' : ''}**${member.displayName}**`);
    }

    const embed = createInfoEmbed(
        '👥 Jugadores en la sala',
        `**Total:** ${room.players.size}/10\n` +
        `${room.started ? `**Vivos:** ${room.alivePlayers.size}\n` : ''}` +
        `**Estado:** ${room.started ? '🎮 En juego' : '⏳ Esperando'}\n\n` +
        playerNames.join('\n')
    );

    await sendMessage(interaction, { embed, ephemeral: true });
}

export async function handleExpel(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (room.hostId !== interaction.user.id) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'Usuario no es el host',
            '❌ Solo el anfitrión puede expulsar jugadores.'
        );
    }

    if (!room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego no ha empezado',
            '❌ El juego aún no ha comenzado.'
        );
    }

    const targetUser = interaction.options.getUser('jugador', true);
    const target = await interaction.guild!.members.fetch(targetUser.id);

    if (!room.alivePlayers.has(target.id)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Jugador no está vivo',
            '❌ Este jugador no está en el juego o ya fue expulsado.'
        );
    }

    const wasImpostor = target.id === room.impostorId;
    const votingWasActive = room.votingInProgress;

    room.alivePlayers.delete(target.id);

    if (room.votes.has(target.id)) {
        room.votes.delete(target.id);
    }

    if (votingWasActive && room.votingMessage) {
        try {
            await room.votingMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'Error al deshabilitar menú de votación tras expulsión', error instanceof Error ? error : new Error(String(error)));
        }
        room.votingInProgress = false;
        room.votes.clear();
    }

    const resultEmbed = new EmbedBuilder()
        .setColor(wasImpostor ? COLORS.SUCCESS : COLORS.WARNING)
        .setTitle('👮 Expulsión Manual')
        .setDescription(
            `**${target.displayName}** ha sido expulsado por el anfitrión.\n\n` +
            `${wasImpostor
                ? `🎉 **¡${target.displayName} ERA EL IMPOSTOR!**\n\n**Los jugadores normales ganan!**`
                : `⚠️ **${target.displayName} NO era el impostor.**\n\nEl juego continúa...`
            }` +
            `${votingWasActive ? '\n\n⚠️ La votación ha sido cancelada y se reiniciará automáticamente.' : ''}`
        )
        .setTimestamp();

    await sendMessage(interaction, { embed: resultEmbed });

    if (wasImpostor) {
        await endGame(interaction.client, roomKey, false);
        return;
    }

    const victoryCheck = await checkVictoryConditions(roomKey);
    if (victoryCheck) {
        await endGame(interaction.client, roomKey, true);
        return;
    }

    if (votingWasActive && room.alivePlayers.size >= 2) {
        await startVoting(interaction.client, roomKey, interaction.channelId);
    }
}

export async function handleEnd(
    interaction: ChatInputCommandInteraction,
    roomKey: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay sala activa',
            '❌ No hay ninguna sala de juego activa en este canal.'
        );
    }

    if (room.hostId !== interaction.user.id) {
        throw new CommandError(
            ErrorType.PERMISSION_ERROR,
            'Usuario no es el host',
            '❌ Solo el anfitrión puede terminar el juego.'
        );
    }

    if (!room.started) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'El juego no ha empezado',
            '❌ El juego aún no ha comenzado. Usa el botón "Salir" para abandonar la sala.'
        );
    }

    const word = room.currentWord!;
    const impostor = await interaction.guild!.members.fetch(room.impostorId!);

    const embed = createInfoEmbed(
        '🏁 Juego Terminado',
        `El anfitrión ha terminado el juego.\n\n` +
        `🔑 **La palabra era:** ||${word}||\n` +
        `🕵️ **El impostor era:** ${impostor.displayName}\n\n` +
        `¡Gracias por jugar!`
    );

    await sendMessage(interaction, { embed });

    if (room.gameMessage) {
        try {
            await room.gameMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones del juego', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.votingMessage) {
        try {
            await room.votingMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'No se pudo deshabilitar botones de votación', error instanceof Error ? error : new Error(String(error)));
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
    logger.info('Impostor', `Juego terminado en sala ${roomKey} por el host`);
}

import {
    ButtonInteraction,
    StringSelectMenuInteraction,
    ComponentType,
    MessageFlags
} from 'discord.js';
import { activeRooms } from './state.js';
import { createVoteSelectMenu, createNextRoundButton } from './buttons.js';
import { createVotingEmbed, createExpulsionEmbed } from './embeds.js';
import { createInfoEmbed } from '../../../utils/messageUtils.js';
import { logger } from '../../../utils/logger.js';
import { endGame, checkVictoryConditions } from './game.js';
import { getMemberDisplayName } from './utils.js';

export async function startVoting(
    client: ButtonInteraction['client'],
    roomKey: string,
    channelId: string
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room || !room.started || room.votingInProgress) {
        return;
    }

    room.votingInProgress = true;
    room.votes.clear();

    const guild = client.guilds.cache.get(room.guildId);
    const alivePlayersList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const member = await guild!.members.fetch(playerId);
        alivePlayersList.push(`• ${member.displayName}`);
    }

    const embed = createInfoEmbed(
        '🗳️ Votación Iniciada',
        `Es hora de votar para expulsar a un jugador.\n\n` +
        `**Jugadores vivos (${room.alivePlayers.size}):**\n${alivePlayersList.join('\n')}\n\n` +
        `Todos los jugadores vivos deben votar usando el menú de abajo.\n` +
        `⏱️ **Tiempo límite:** 10 minutos\n` +
        `**Votos:** ${room.votes.size}/${room.alivePlayers.size}`
    );

    const selectMenuRow = await createVoteSelectMenu(room, client, room.guildId);

    const channel = client.channels.cache.get(channelId);
    if (!channel || !('send' in channel)) return;

    const voteMessage = await channel.send({
        embeds: [embed],
        components: [selectMenuRow]
    });

    room.votingMessage = voteMessage;

    const collector = voteMessage.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 600000
    });

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
        try {
            if (selectInteraction.customId === 'impostor_vote_select') {
                await handleVoteSelect(selectInteraction, roomKey);
            }
        } catch (error) {
            logger.error('Impostor', 'Error en votación', error instanceof Error ? error : new Error(String(error)));
            if (!selectInteraction.replied && !selectInteraction.deferred) {
                await selectInteraction.reply({
                    content: '❌ Ocurrió un error al procesar tu voto.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on('end', async () => {
        if (activeRooms.has(roomKey)) {
            const currentRoom = activeRooms.get(roomKey)!;
            if (currentRoom.votingInProgress) {
                currentRoom.votingInProgress = false;
            }
        }
    });
}

export async function handleVoteSelect(
    interaction: StringSelectMenuInteraction,
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

    if (!room.votingInProgress) {
        await interaction.reply({
            content: '❌ No hay votación en progreso.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!room.alivePlayers.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ No puedes votar porque no estás en el juego o ya fuiste expulsado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (room.votes.has(interaction.user.id)) {
        await interaction.reply({
            content: '❌ Ya has votado.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const votedFor = interaction.values[0];
    room.votes.set(interaction.user.id, votedFor);

    await interaction.reply({
        content: `✅ Tu voto ha sido registrado.\n📊 **Votos:** ${room.votes.size}/${room.alivePlayers.size}`,
        flags: MessageFlags.Ephemeral
    });

    if (room.votingMessage) {
        const guild = interaction.client.guilds.cache.get(room.guildId);
        const embed = await createVotingEmbed(room, guild!);

        try {
            await room.votingMessage.edit({ embeds: [embed] });
        } catch (error) {
            logger.error('Impostor', 'Error al actualizar mensaje de votación', error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (room.votes.size === room.alivePlayers.size) {
        await processVotingResults(interaction, roomKey, interaction.client);
    }
}

export async function processVotingResults(
    interaction: StringSelectMenuInteraction,
    roomKey: string,
    client: StringSelectMenuInteraction['client']
): Promise<void> {
    const room = activeRooms.get(roomKey);

    if (!room) return;

    room.votingInProgress = false;

    const voteCounts = new Map<string, number>();

    for (const [, votedFor] of room.votes) {
        voteCounts.set(votedFor, (voteCounts.get(votedFor) || 0) + 1);
    }

    let maxVotes = 0;
    const playersWithMaxVotes: string[] = [];

    for (const [playerId, count] of voteCounts) {
        if (playerId === 'skip') continue;

        if (count > maxVotes) {
            maxVotes = count;
            playersWithMaxVotes.length = 0;
            playersWithMaxVotes.push(playerId);
        } else if (count === maxVotes) {
            playersWithMaxVotes.push(playerId);
        }
    }

    const skipVotes = voteCounts.get('skip') || 0;

    if (room.votingMessage) {
        try {
            await room.votingMessage.edit({ components: [] });
        } catch (error) {
            logger.error('Impostor', 'Error al deshabilitar menú de votación', error instanceof Error ? error : new Error(String(error)));
        }
    }

    const channel = client.channels.cache.get(room.channelId);
    if (!channel || !('send' in channel)) return;

    if (playersWithMaxVotes.length === 0 || playersWithMaxVotes.length > 1 || skipVotes >= maxVotes) {
        const tieMessage = playersWithMaxVotes.length > 1
            ? `Hubo un empate entre ${playersWithMaxVotes.length} jugadores.`
            : `La mayoría votó por no expulsar a nadie.`;

        const guild = client.guilds.cache.get(room.guildId);
        const aliveCount = room.alivePlayers.size;
        const aliveList: string[] = [];
        for (const playerId of room.alivePlayers) {
            const member = await guild!.members.fetch(playerId);
            aliveList.push(`• ${member.displayName}`);
        }

        const embed = createInfoEmbed(
            '🗳️ Resultados de Votación',
            `${tieMessage}\n\n**Nadie fue expulsado.**\n\n` +
            `👥 **Jugadores vivos (${aliveCount}):**\n${aliveList.join('\n')}\n\n` +
            `El juego continúa... Presiona "Siguiente Ronda" cuando estén listos.`
        );

        const nextRoundButton = createNextRoundButton();

        const resultMessage = await channel.send({
            embeds: [embed],
            components: [nextRoundButton]
        });

        const collector = resultMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            if (buttonInteraction.customId === 'impostor_next_round') {
                const { handleNextRoundButton } = await import('./handlers/button-handlers.js');
                await handleNextRoundButton(buttonInteraction, roomKey);
                collector.stop();
            }
        });

        room.votes.clear();
        return;
    }

    const expelledId = playersWithMaxVotes[0];
    const guild = client.guilds.cache.get(room.guildId);
    const expelled = await guild!.members.fetch(expelledId);
    const wasImpostor = expelledId === room.impostorId;

    room.alivePlayers.delete(expelledId);
    room.votes.clear();

    if (wasImpostor) {
        const resultEmbed = await createExpulsionEmbed(wasImpostor, expelled.displayName, maxVotes);
        await channel.send({ embeds: [resultEmbed] });
        await endGame(client, roomKey, false);
        return;
    }

    const victoryCheck = await checkVictoryConditions(roomKey);
    if (victoryCheck) {
        const resultEmbed = await createExpulsionEmbed(wasImpostor, expelled.displayName, maxVotes);
        resultEmbed.setDescription(
            `**${expelled.displayName}** ha sido expulsado con **${maxVotes}** voto(s).\n\n` +
            `❌ **${expelled.displayName} NO era el impostor...**\n\n` +
            `🕵️ **¡El impostor gana!** Solo quedan 2 jugadores.`
        );
        await channel.send({ embeds: [resultEmbed] });
        await endGame(client, roomKey, true);
        return;
    }

    const aliveCount = room.alivePlayers.size;
    const aliveList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const member = await guild!.members.fetch(playerId);
        aliveList.push(`• ${member.displayName}`);
    }

    const resultEmbed = await createExpulsionEmbed(wasImpostor, expelled.displayName, maxVotes);
    resultEmbed.setDescription(
        `**${expelled.displayName}** ha sido expulsado con **${maxVotes}** voto(s).\n\n` +
        `❌ **${expelled.displayName} NO era el impostor...**\n\n` +
        `👥 **Jugadores vivos (${aliveCount}):**\n${aliveList.join('\n')}\n\n` +
        `El impostor sigue entre ustedes. Presiona "Siguiente Ronda" cuando estén listos.`
    );

    const nextRoundButton = createNextRoundButton();

    const resultMessage = await channel.send({
        embeds: [resultEmbed],
        components: [nextRoundButton]
    });

    const collector = resultMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === 'impostor_next_round') {
            const { handleNextRoundButton } = await import('./handlers/button-handlers.js');
            await handleNextRoundButton(buttonInteraction, roomKey);
            collector.stop();
        }
    });
}

import { EmbedBuilder, Guild } from 'discord.js';
import { COLORS } from '../../../utils/constants.js';
import { GameRoom } from './state.js';

export async function createRoleEmbed(
    isImpostor: boolean,
    word: string | undefined,
    turnOrderText: string[]
): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setColor(isImpostor ? COLORS.DANGER : COLORS.SUCCESS)
        .setTimestamp();

    if (isImpostor) {
        embed
            .setTitle('🕵️ ¡ERES EL IMPOSTOR!')
            .setDescription(
                '**Tu objetivo:** Descubrir cuál es la palabra secreta\n\n' +
                `🎭 **Tu rol:** Impostor\n` +
                `❓ **Palabra secreta:** ???\n\n` +
                `**Consejos:**\n` +
                `• Escucha atentamente las pistas de los demás\n` +
                `• Trata de participar sin revelar que no sabes la palabra\n` +
                `• Adivina la palabra cuando estés seguro\n\n` +
                `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
                `¡Buena suerte! 🎲`
            );
    } else {
        embed
            .setTitle('✅ Eres un jugador normal')
            .setDescription(
                '**Tu objetivo:** Da pistas sin revelar la palabra al impostor\n\n' +
                `👤 **Tu rol:** Jugador\n` +
                `🔑 **Palabra secreta:** ||${word}||\n\n` +
                `**Consejos:**\n` +
                `• Da pistas relacionadas con la palabra\n` +
                `• No seas demasiado obvio\n` +
                `• Intenta identificar quién es el impostor\n` +
                `• Si no te gusta el tema, usa el botón "Votar Skip"\n\n` +
                `**📋 Orden de turnos:**\n${turnOrderText.join('\n')}\n\n` +
                `¡Buena suerte! 🎲`
            );
    }

    return embed;
}

export async function createNewWordEmbed(newWord: string): Promise<EmbedBuilder> {
    return new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('🔄 Nueva Palabra')
        .setDescription(
            `La palabra ha sido cambiada por votación!\n\n` +
            `🔑 **Nueva palabra:** ||${newWord}||\n\n` +
            `Continúa dando pistas para la nueva palabra.`
        )
        .setTimestamp();
}

export async function createVotingEmbed(
    room: GameRoom,
    guild: Guild
): Promise<EmbedBuilder> {
    const alivePlayersList: string[] = [];
    for (const playerId of room.alivePlayers) {
        const member = await guild.members.fetch(playerId);
        const hasVoted = room.votes.has(playerId);
        alivePlayersList.push(`${hasVoted ? '✅' : '⏳'} ${member.displayName}`);
    }

    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🗳️ Votación en Progreso')
        .setDescription(
            `Es hora de votar para expulsar a un jugador.\n\n` +
            `**Jugadores vivos (${room.alivePlayers.size}):**\n${alivePlayersList.join('\n')}\n\n` +
            `⏱️ **Tiempo límite:** 10 minutos\n` +
            `**Votos:** ${room.votes.size}/${room.alivePlayers.size}`
        );
}

export async function createExpulsionEmbed(
    wasImpostor: boolean,
    expelledName: string,
    votes: number
): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setColor(wasImpostor ? COLORS.SUCCESS : COLORS.DANGER)
        .setTitle('🗳️ Resultados de Votación')
        .setTimestamp();

    if (wasImpostor) {
        embed.setDescription(
            `**${expelledName}** ha sido expulsado con **${votes}** voto(s).\n\n` +
            `🎉 **¡${expelledName} ERA EL IMPOSTOR!**\n\n**Los jugadores normales ganan!**`
        );
    } else {
        embed.setDescription(
            `**${expelledName}** ha sido expulsado con **${votes}** voto(s).\n\n` +
            `❌ **${expelledName} NO era el impostor...**`
        );
    }

    return embed;
}

export async function createGameEndEmbed(
    impostorWins: boolean,
    impostorName: string,
    word: string
): Promise<EmbedBuilder> {
    return new EmbedBuilder()
        .setColor(impostorWins ? COLORS.DANGER : COLORS.SUCCESS)
        .setTitle(impostorWins ? '🕵️ ¡El Impostor Gana!' : '✅ ¡Los Jugadores Ganan!')
        .setDescription(
            impostorWins
                ? `**${impostorName}** (el impostor) ha ganado!\n\nQuedan muy pocos jugadores para votarlo.\n\n🔑 **La palabra era:** ||${word}||`
                : `**${impostorName}** era el impostor y ha sido descubierto!\n\n🔑 **La palabra era:** ||${word}||\n\n¡Gracias por jugar!`
        )
        .setTimestamp();
}

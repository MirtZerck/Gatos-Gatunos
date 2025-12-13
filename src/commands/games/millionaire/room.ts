import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
    ComponentType,
    User
} from 'discord.js';
import { BotClient } from '../../../types/BotClient.js';
import { MillionaireGameRoom } from '../../../types/millionaire.js';
import { COLORS } from '../../../utils/constants.js';
import { CommandError, ErrorType } from '../../../utils/errorHandler.js';
import { sendMessage, createInfoEmbed, createErrorEmbed } from '../../../utils/messageUtils.js';
import { logger } from '../../../utils/logger.js';
import { triviaService } from '../../../services/TriviaService.js';
import { formatPrize } from '../../../config/millionairePrizes.js';
import { startGame } from './game.js';

// This will be imported from state.ts once it's created
const activeRooms = new Map<string, MillionaireGameRoom>();

// Helper functions that need to be in this file
function getRoomKey(guildId: string, channelId: string): string {
    return `${guildId}-${channelId}`;
}

function canStartGame(room: MillionaireGameRoom): boolean {
    return !!room.playerId;
}

function createLobbyEmbed(room: MillionaireGameRoom, creator: User): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('💰 ¿Quién Quiere Ser Millonario? 💰')
        .setDescription('¡Responde 15 preguntas de trivia y gana hasta **$1,000,000**!')
        .addFields(
            {
                name: '🎯 Concursante',
                value: room.playerId ? `<@${room.playerId}>` : 'Esperando...',
                inline: true
            },
            {
                name: '🎬 Anfitrión',
                value: room.hostId ? `<@${room.hostId}>` : 'Ninguno (Opcional)',
                inline: true
            }
        )
        .addFields(
            {
                name: '📋 Reglas',
                value: '• 15 preguntas de dificultad progresiva\n• 4 comodines disponibles\n• Puntos seguros en $1,000 y $32,000\n• Puedes retirarte en cualquier momento'
            }
        )
        .setFooter({ text: `Creado por ${creator.displayName}` })
        .setTimestamp();

    return embed;
}

function createLobbyButtons(room: MillionaireGameRoom): ActionRowBuilder<ButtonBuilder> {
    const joinButton = new ButtonBuilder()
        .setCustomId('millionaire_join')
        .setLabel('Unirse como Concursante')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎯')
        .setDisabled(!!room.playerId);

    const volunteerButton = new ButtonBuilder()
        .setCustomId('millionaire_volunteer_host')
        .setLabel('Ser Anfitrión')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎬')
        .setDisabled(!!room.hostId);

    const startButton = new ButtonBuilder()
        .setCustomId('millionaire_start')
        .setLabel('Iniciar Juego')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️')
        .setDisabled(!canStartGame(room));

    const leaveButton = new ButtonBuilder()
        .setCustomId('millionaire_leave')
        .setLabel('Abandonar Sala')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚪');

    const cancelButton = new ButtonBuilder()
        .setCustomId('millionaire_cancel')
        .setLabel('Cancelar Juego')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        joinButton,
        volunteerButton,
        startButton,
        leaveButton,
        cancelButton
    );
}

// NOTE: This function calls startGame which is not in this file
// startGame will need to be imported or moved here as well
async function createRoom(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Comando solo disponible en servidores',
            '❌ Este comando solo puede usarse en un servidor.'
        );
    }

    const roomKey = getRoomKey(interaction.guildId, interaction.channelId);

    if (activeRooms.has(roomKey)) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Ya existe una sala activa',
            '❌ Ya hay un juego activo en este canal. Espera a que termine o usa `/millionaire abandonar`.'
        );
    }

    const room: MillionaireGameRoom = {
        hostId: '',
        playerId: '',
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        started: false,
        hasHost: true,
        currentQuestionIndex: 0,
        currentPrize: 0,
        safeHavenReached: 0,
        usedQuestionIds: new Set(),
        lifelines: {
            fiftyFifty: true,
            askAudience: true,
            callFriend: true,
            changeQuestion: true
        }
    };

    activeRooms.set(roomKey, room);

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    const message = await interaction.reply({
        embeds: [embed],
        components: [buttons],
        fetchReply: true
    });

    room.lobbyMessage = message;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        try {
            if (i.customId === 'millionaire_join') {
                await handleJoin(i, room);
            } else if (i.customId === 'millionaire_volunteer_host') {
                await handleVolunteerHost(i, room);
            } else if (i.customId === 'millionaire_start') {
                await handleStart(i, room);
            } else if (i.customId === 'millionaire_leave') {
                await handleLeaveRoom(i, room);
            } else if (i.customId === 'millionaire_cancel') {
                await handleCancel(i, room, roomKey);
            }
        } catch (error) {
            logger.error('Millionaire', 'Error en lobby collector', error instanceof Error ? error : new Error(String(error)));
            const embed = createErrorEmbed('❌ Error', 'Ocurrió un error. Por favor, intenta nuevamente.');
            await i.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }
    });

    collector.on('end', () => {
        if (!room.started && activeRooms.has(roomKey)) {
            activeRooms.delete(roomKey);
            logger.info('Millionaire', `Lobby timeout en ${roomKey}`);
        }
    });

    logger.info('Millionaire', `Sala creada en ${roomKey} (anfitrión opcional)`);
}

async function handleJoin(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (room.playerId) {
        await interaction.reply({
            content: '❌ Ya hay un concursante en la sala.',
            ephemeral: true
        });
        return;
    }

    if (room.hostId === interaction.user.id) {
        await interaction.reply({
            content: '❌ No puedes ser concursante y anfitrión al mismo tiempo.',
            ephemeral: true
        });
        return;
    }

    room.playerId = interaction.user.id;

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });

    logger.info('Millionaire', `${interaction.user.tag} se unió como concursante`);
}

async function handleVolunteerHost(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (room.hostId) {
        await interaction.reply({
            content: '❌ Ya hay un anfitrión en la sala.',
            ephemeral: true
        });
        return;
    }

    if (room.playerId === interaction.user.id) {
        await interaction.reply({
            content: '❌ No puedes ser anfitrión y concursante al mismo tiempo.',
            ephemeral: true
        });
        return;
    }

    room.hostId = interaction.user.id;

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });

    logger.info('Millionaire', `${interaction.user.tag} se unió como anfitrión`);
}

async function handleLeaveRoom(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    const userId = interaction.user.id;
    let wasInRoom = false;
    let role = '';

    if (room.playerId === userId) {
        room.playerId = '';
        wasInRoom = true;
        role = 'concursante';
    }

    if (room.hostId === userId) {
        room.hostId = '';
        wasInRoom = true;
        role = role ? 'concursante y anfitrión' : 'anfitrión';
    }

    if (!wasInRoom) {
        await interaction.reply({
            content: '❌ No estás en la sala.',
            ephemeral: true
        });
        return;
    }

    const embed = createLobbyEmbed(room, interaction.user);
    const buttons = createLobbyButtons(room);

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });

    logger.info('Millionaire', `${interaction.user.tag} abandonó la sala (${role})`);
}

// NOTE: This function calls startGame and displayQuestion which are not in this file
// These will need to be imported or moved here as well
async function handleStart(interaction: ButtonInteraction, room: MillionaireGameRoom): Promise<void> {
    if (!canStartGame(room)) {
        await interaction.reply({
            content: '❌ No se puede iniciar el juego. Asegúrate de que haya un concursante.',
            ephemeral: true
        });
        return;
    }

    const isCreatorOrParticipant =
        interaction.user.id === room.playerId ||
        interaction.user.id === room.hostId;

    if (!isCreatorOrParticipant) {
        await interaction.reply({
            content: '❌ Solo los participantes del juego pueden iniciarlo.',
            ephemeral: true
        });
        return;
    }

    room.started = true;

    await interaction.update({
        embeds: [createInfoEmbed('🎮 Iniciando Juego', 'Preparando la primera pregunta...')],
        components: []
    });

    try {
        room.sessionToken = await triviaService.getSessionToken();
        await startGame(interaction, room);
    } catch (error) {
        logger.error('Millionaire', 'Error al iniciar juego', error instanceof Error ? error : new Error(String(error)));
        const embed = createErrorEmbed('❌ Error', 'No se pudo iniciar el juego. Intenta nuevamente.');
        await interaction.followUp({ embeds: [embed], ephemeral: true });
        const roomKey = getRoomKey(room.guildId, room.channelId);
        activeRooms.delete(roomKey);
    }
}

async function handleCancel(
    interaction: ButtonInteraction,
    room: MillionaireGameRoom,
    roomKey: string
): Promise<void> {
    activeRooms.delete(roomKey);

    await interaction.update({
        embeds: [createInfoEmbed('❌ Juego Cancelado', 'El juego ha sido cancelado.')],
        components: []
    });

    logger.info('Millionaire', `Juego cancelado en ${roomKey}`);
}

async function abandonGame(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
        throw new CommandError(
            ErrorType.VALIDATION_ERROR,
            'Comando solo disponible en servidores',
            '❌ Este comando solo puede usarse en un servidor.'
        );
    }

    const roomKey = getRoomKey(interaction.guildId, interaction.channelId);
    const room = activeRooms.get(roomKey);

    if (!room) {
        throw new CommandError(
            ErrorType.NOT_FOUND,
            'No hay juego activo',
            '❌ No hay un juego activo en este canal.'
        );
    }

    activeRooms.delete(roomKey);

    const embed = createInfoEmbed(
        '🚪 Juego Abandonado',
        'El juego ha sido abandonado por un administrador.'
    );

    await sendMessage(interaction, { embed, ephemeral: false });

    logger.info('Millionaire', `Juego abandonado en ${roomKey}`);
}

async function showRules(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('📋 Reglas de ¿Quién Quiere Ser Millonario?')
        .setDescription(
            '¡Responde 15 preguntas de trivia y gana hasta **$1,000,000**!'
        )
        .addFields(
            {
                name: '🎯 Objetivo',
                value: 'Responder correctamente 15 preguntas de dificultad progresiva para ganar el premio mayor.'
            },
            {
                name: '💰 Premios',
                value: `• Pregunta 1-5: $100 - $1,000 (Fácil)\n` +
                    `• Pregunta 6-10: $2,000 - $32,000 (Medio)\n` +
                    `• Pregunta 11-15: $64,000 - $1,000,000 (Difícil)\n\n` +
                    `**Puntos Seguros:** $1,000 (Q5) y $32,000 (Q10)`
            },
            {
                name: '🎁 Comodines',
                value: `**50:50** - Elimina 2 respuestas incorrectas\n` +
                    `**📊 Pregunta al Público** - Consulta a la audiencia\n` +
                    `**📞 Llamar a un Amigo** - Pide ayuda a otro usuario\n` +
                    `**🔄 Cambiar Pregunta** - Reemplaza la pregunta actual`
            },
            {
                name: '⏱️ Tiempo',
                value: 'Tienes 3 minutos para responder cada pregunta.'
            },
            {
                name: '🎬 Anfitrión (Opcional)',
                value: 'Opcionalmente, otro jugador puede unirse como anfitrión para dirigir el juego al estilo del programa de TV.'
            },
            {
                name: '🚪 Retirarse',
                value: 'Puedes retirarte en cualquier momento y llevarte tus ganancias actuales.'
            }
        )
        .setFooter({ text: '¡Buena suerte!' });

    await sendMessage(interaction, { embed, ephemeral: true });
}

async function showLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as BotClient;
    const firebase = client.firebaseAdminManager;

    if (!firebase) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Firebase no disponible',
            '❌ El sistema de estadísticas no está disponible en este momento.'
        );
    }

    await interaction.deferReply();

    const sortBy = (interaction.options.getString('ordenar_por') as 'totalWinnings' | 'highestLevel') || 'totalWinnings';
    const leaderboard = await firebase.getMillionaireLeaderboard(sortBy, 10);

    if (leaderboard.length === 0) {
        const embed = createInfoEmbed(
            '📊 Clasificación',
            'Aún no hay jugadores en la clasificación. ¡Sé el primero!'
        );
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const sortTitle = sortBy === 'totalWinnings' ? 'Total Ganado' : 'Nivel Más Alto';
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`🏆 Top 10 - ${sortTitle}`)
        .setDescription('Los mejores jugadores de ¿Quién Quiere Ser Millonario?')
        .setTimestamp();

    let description = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        const username = user ? user.displayName : 'Usuario Desconocido';

        if (sortBy === 'totalWinnings') {
            description += `${medal} **${username}** - ${formatPrize(entry.totalWinnings)}\n`;
        } else {
            description += `${medal} **${username}** - Nivel ${entry.highestLevel} (${formatPrize(entry.highestWinning)})\n`;
        }
    }

    embed.setDescription(description);

    await interaction.editReply({ embeds: [embed] });
}

async function showStats(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as BotClient;
    const firebase = client.firebaseAdminManager;

    if (!firebase) {
        throw new CommandError(
            ErrorType.API_ERROR,
            'Firebase no disponible',
            '❌ El sistema de estadísticas no está disponible en este momento.'
        );
    }

    const targetUser = interaction.options.getUser('usuario') || interaction.user;

    await interaction.deferReply();

    const stats = await firebase.getPlayerMillionaireStats(targetUser.id);

    if (!stats) {
        const embed = createInfoEmbed(
            '📊 Estadísticas',
            targetUser.id === interaction.user.id
                ? 'Aún no has jugado ninguna partida.'
                : `${targetUser.displayName} aún no ha jugado ninguna partida.`
        );
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const winRate = stats.questionsAnswered > 0
        ? ((stats.correctAnswers / stats.questionsAnswered) * 100).toFixed(1)
        : '0.0';

    const avgWinnings = stats.gamesPlayed > 0
        ? Math.floor(stats.totalWinnings / stats.gamesPlayed)
        : 0;

    const totalLifelinesUsed = stats.lifelinesUsed.fiftyFifty +
        stats.lifelinesUsed.askAudience +
        stats.lifelinesUsed.callFriend +
        stats.lifelinesUsed.changeQuestion;

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`📊 Estadísticas de ${targetUser.displayName}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            {
                name: '🎮 Partidas Jugadas',
                value: stats.gamesPlayed.toString(),
                inline: true
            },
            {
                name: '💰 Total Ganado',
                value: formatPrize(stats.totalWinnings),
                inline: true
            },
            {
                name: '🏆 Mayor Premio',
                value: formatPrize(stats.highestWinning),
                inline: true
            },
            {
                name: '📈 Nivel Más Alto',
                value: `Pregunta ${stats.highestLevel}`,
                inline: true
            },
            {
                name: '💵 Promedio por Juego',
                value: formatPrize(avgWinnings),
                inline: true
            },
            {
                name: '✅ Tasa de Aciertos',
                value: `${winRate}%`,
                inline: true
            },
            {
                name: '❓ Preguntas Respondidas',
                value: stats.questionsAnswered.toString(),
                inline: true
            },
            {
                name: '✓ Respuestas Correctas',
                value: stats.correctAnswers.toString(),
                inline: true
            },
            {
                name: '🎁 Comodines Usados',
                value: totalLifelinesUsed.toString(),
                inline: true
            }
        )
        .addFields({
            name: '📋 Detalles de Comodines',
            value: `• 50:50: ${stats.lifelinesUsed.fiftyFifty}\n` +
                `• 📊 Público: ${stats.lifelinesUsed.askAudience}\n` +
                `• 📞 Amigo: ${stats.lifelinesUsed.callFriend}\n` +
                `• 🔄 Cambiar: ${stats.lifelinesUsed.changeQuestion}`
        })
        .setFooter({ text: 'Última partida' })
        .setTimestamp(stats.lastPlayed);

    await interaction.editReply({ embeds: [embed] });
}

export {
    createRoom,
    handleJoin,
    handleVolunteerHost,
    handleLeaveRoom,
    handleStart,
    handleCancel,
    abandonGame,
    showRules,
    showLeaderboard,
    showStats,
    getRoomKey
};

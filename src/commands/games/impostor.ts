import {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} from 'discord.js';
import { SlashOnlyCommand } from '../../types/Command.js';
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { getRoomKey } from './impostor/utils.js';
import {
    handleCreate,
    handleJoin,
    handlePropose,
    handleStart,
    handleLeave,
    handlePlayers,
    handleSkip,
    handleExpel,
    handleEnd
} from './impostor/handlers/command-handlers.js';

export const impostor: SlashOnlyCommand = {
    type: 'slash-only',
    name: 'impostor',
    description: 'Minijuego de impostor - ¡Adivina la palabra secreta!',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName('impostor')
        .setDescription('Minijuego de impostor - ¡Adivina la palabra secreta!')
        .addSubcommand(sub =>
            sub
                .setName('crear')
                .setDescription('Crea una sala de juego')
                .addBooleanOption(opt =>
                    opt
                        .setName('tematica_personalizada')
                        .setDescription('¿Activar temáticas personalizadas? (cada jugador propone una palabra)')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub
                .setName('unirse')
                .setDescription('Únete a la sala de juego activa'))
        .addSubcommand(sub =>
            sub
                .setName('proponer')
                .setDescription('Propone una palabra/temática para el juego')
                .addStringOption(opt =>
                    opt
                        .setName('palabra')
                        .setDescription('Tu palabra o temática propuesta (será secreta)')
                        .setRequired(true)
                        .setMaxLength(50)))
        .addSubcommand(sub =>
            sub
                .setName('empezar')
                .setDescription('Inicia el juego (solo el anfitrión)'))
        .addSubcommand(sub =>
            sub
                .setName('salir')
                .setDescription('Sal de la sala de juego'))
        .addSubcommand(sub =>
            sub
                .setName('jugadores')
                .setDescription('Muestra la lista de jugadores en la sala'))
        .addSubcommand(sub =>
            sub
                .setName('skip')
                .setDescription('Vota para saltar la palabra actual (requiere mayoría)'))
        .addSubcommand(sub =>
            sub
                .setName('expulsar')
                .setDescription('Expulsa a un jugador del juego (solo el anfitrión)')
                .addUserOption(opt =>
                    opt
                        .setName('jugador')
                        .setDescription('Jugador a expulsar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('terminar')
                .setDescription('Termina el juego actual (solo el anfitrión)'))
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guildId!;
            const channelId = interaction.channelId;
            const roomKey = getRoomKey(guildId, channelId);

            switch (subcommand) {
                case 'crear':
                    await handleCreate(interaction, roomKey, guildId, channelId);
                    break;
                case 'unirse':
                    await handleJoin(interaction, roomKey);
                    break;
                case 'proponer':
                    await handlePropose(interaction, roomKey);
                    break;
                case 'empezar':
                    await handleStart(interaction, roomKey);
                    break;
                case 'salir':
                    await handleLeave(interaction, roomKey);
                    break;
                case 'jugadores':
                    await handlePlayers(interaction, roomKey);
                    break;
                case 'skip':
                    await handleSkip(interaction, roomKey);
                    break;
                case 'expulsar':
                    await handleExpel(interaction, roomKey);
                    break;
                case 'terminar':
                    await handleEnd(interaction, roomKey);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'impostor');
        }
    }
};

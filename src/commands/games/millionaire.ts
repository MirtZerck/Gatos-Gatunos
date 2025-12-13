import {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} from 'discord.js';
import { SlashOnlyCommand } from '../../types/Command.js';
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';

// Importar funciones de gestión de sala
import {
    createRoom,
    abandonGame,
    showRules,
    showLeaderboard,
    showStats
} from './millionaire/room.js';

export const millionaire: SlashOnlyCommand = {
    type: 'slash-only',
    name: 'millionaire',
    description: 'Juega ¿Quién Quiere Ser Millonario?',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName('millionaire')
        .setDescription('Juega ¿Quién Quiere Ser Millonario?')
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY)
        .addSubcommand(subcommand =>
            subcommand
                .setName('crear')
                .setDescription('Crea una nueva sala de juego')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('abandonar')
                .setDescription('Abandona el juego actual en este canal')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reglas')
                .setDescription('Muestra las reglas del juego')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clasificacion')
                .setDescription('Muestra el top 10 de jugadores')
                .addStringOption(option =>
                    option
                        .setName('ordenar_por')
                        .setDescription('Ordenar por')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Total Ganado', value: 'totalWinnings' },
                            { name: 'Nivel Más Alto', value: 'highestLevel' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('estadisticas')
                .setDescription('Muestra las estadísticas de un jugador')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a consultar (deja vacío para ver las tuyas)')
                        .setRequired(false)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'crear':
                    await createRoom(interaction);
                    break;
                case 'abandonar':
                    await abandonGame(interaction);
                    break;
                case 'reglas':
                    await showRules(interaction);
                    break;
                case 'clasificacion':
                    await showLeaderboard(interaction);
                    break;
                case 'estadisticas':
                    await showStats(interaction);
                    break;
                default:
                    throw new Error('Subcomando no reconocido');
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'millionaire');
        }
    }
};

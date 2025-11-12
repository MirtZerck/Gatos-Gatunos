import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getRandomGif } from '../../utils/tenor.js';
import { Validators } from '../../utils/validators.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';

const ACTION_QUERIES = {
    hug: 'anime hug',
    kiss: 'anime kiss',
    pat: 'anime head pat',
    slap: 'anime slap',
    poke: 'anime poke',
    cuddle: 'anime cuddle',
    bite: 'anime bite',
    tickle: 'anime tickle',
} as const

type ActionType = keyof typeof ACTION_QUERIES;

const ACTION_MESSAGES: Record<ActionType, (author: string, target: string) => string> = {
    hug: (author, target) => `**${author}** abraza a **${target}** 🤗`,
    kiss: (author, target) => `**${author}** besa a **${target}** 😘`,
    pat: (author, target) => `**${author}** acaricia la cabeza de **${target}** 😊`,
    slap: (author, target) => `**${author}** abofetea a **${target}** 🖐️`,
    poke: (author, target) => `**${author}** molesta a **${target}** 👉`,
    cuddle: (author, target) => `**${author}** se acurruca con **${target}** 🥰`,
    bite: (author, target) => `**${author}** muerde a **${target}** 😬`,
    tickle: (author, target) => `**${author}** le hace cosquillas a **${target}** 🤭`,
};

export const interact: HybridCommand = {
    type: 'hybrid',
    name: 'interact',
    description: 'Comandos de interacción con otros usuarios',
    category: CATEGORIES.INTERACTION,
    aliases: ['int', 'interactuar', 'interaccion'],

    data: new SlashCommandBuilder()
        .setName('interact')
        .setDescription('Comandos de interacción con otros usuarios')
        .addSubcommand(subcommand =>
            subcommand
                .setName('hug')
                .setDescription('Abraza a alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a abrazar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kiss')
                .setDescription('Besa a alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a besar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pat')
                .setDescription('Acaricia la cabeza de alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a acariciar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('slap')
                .setDescription('Abofetea a alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a abofetear')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('poke')
                .setDescription('Molesta a alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a molestar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cuddle')
                .setDescription('Acurrúcate con alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario con quien acurrucarse')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bite')
                .setDescription('Muerde a alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a morder')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tickle')
                .setDescription('Haz cosquillas a alguien')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a hacerle cosquillas')
                        .setRequired(true)
                )
        )
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand() as ActionType;
            const target = interaction.options.getUser('usuario', true);
            const author = interaction.user;

            Validators.validateNotSelf(author, target);
            Validators.validateNotBot(target);

            await interaction.deferReply();

            try {
                const gifURL = await getRandomGif(ACTION_QUERIES[subcommand]);
                const message = ACTION_MESSAGES[subcommand](author.displayName, target.displayName)

                const embed = new EmbedBuilder()
                    .setDescription(message)
                    .setImage(gifURL)
                    .setColor(COLORS.INTERACTION);

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                throw new CommandError(
                    ErrorType.API_ERROR,
                    `Error obteniendo GIF de Tenor`,
                    `❌ No se pudo obtener el GIF. Intenta de nuevo.`
                );
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'interact');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase() as ActionType;
            const validSubcommands = Object.keys(ACTION_QUERIES);

            if (!subcommand || !validSubcommands.includes(subcommand)) {
                await message.reply(
                    `❌ **Uso:** \`!interact <acción> @usuario\`\n\n` +
                    `**Acciones disponibles:**\n${validSubcommands.map(cmd => `• \`${cmd}\``).join('\n')}`
                );
                return;
            }

            const target = message.mentions.users.first();

            Validators.validateUserProvided(target);
            Validators.validateNotSelf(message.author, target);
            Validators.validateNotBot(target);

            const loadingMsg = await message.reply('🔄 Cargando GIF...');
            const messageText = ACTION_MESSAGES[subcommand](message.author.displayName, target.displayName)

            try {
                const gifUrl = await getRandomGif(ACTION_QUERIES[subcommand]);

                const embed = new EmbedBuilder()
                    .setDescription(messageText)
                    .setImage(gifUrl)
                    .setColor(COLORS.INTERACTION);

                await loadingMsg.edit({
                    content: null,
                    embeds: [embed]
                });
            } catch (error) {
                throw new CommandError(
                    ErrorType.API_ERROR,
                    'No se ha podido obtener un GIF de Tenor',
                    '❌ No se pudo obtener el GIF. Intenta de nuevo.'
                );
            }
        } catch (error) {
            await handleCommandError(error, message, 'interact');
        }
    },
};
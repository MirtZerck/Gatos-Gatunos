import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder
} from 'discord.js';
import { Command } from '../../types/Command.js';
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { getRandomGif } from '../../utils/tenor.js';

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

export const interact: Command = {
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
        const subcommand = interaction.options.getSubcommand() as ActionType;
        const target = interaction.options.getUser('usuario', true);
        const author = interaction.user;

        if (target.id === author.id) {
            await interaction.reply({
                content: 'No puedes interactuar contigo mismo.',
                ephemeral: true
            });
            return
        }

        if (target.bot) {
            await interaction.reply({
                content: 'No puedes interactuar con bots.',
                ephemeral: true
            });
            return
        }

        const messages: Record<ActionType, string> = {
            hug: `**${author.displayName}** abraza a **${target.displayName}** 🤗`,
            kiss: `**${author.displayName}** besa a **${target.displayName}** 😘`,
            pat: `**${author.displayName}** acaricia la cabeza de **${target.displayName}** 😊`,
            slap: `**${author.displayName}** abofetea a **${target.displayName}** 🖐️`,
            poke: `**${author.displayName}** molesta a **${target.displayName}** 👉`,
            cuddle: `**${author.displayName}** se acurruca con **${target.displayName}** 🥰`,
            bite: `**${author.displayName}** muerde a **${target.displayName}** 😬`,
            tickle: `**${author.displayName}** le hace cosquillas a **${target.displayName}** 🤭`
        };

        await interaction.deferReply();

        try {
            const gifURL = await getRandomGif(ACTION_QUERIES[subcommand]);

            const embed = new EmbedBuilder()
                .setDescription('\u200b') // Zero-width space para cumplir con el requisito de Discord
                .setImage(gifURL)
                .setColor(0xFF69B4);

            await interaction.editReply({
                content: messages[subcommand],
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error obteniendo GIF:', error);;
            await interaction.editReply({
                content: `${messages[subcommand]}\n\n_(No se pudo cargar el GIF)_`
            });

        }
    },

    async executePrefix(message: Message, args: string[]) {
        const subcommand = args[0]?.toLowerCase() as ActionType;
        const validSubcommands = Object.keys(ACTION_QUERIES);

        if (!subcommand || !validSubcommands.includes(subcommand)) {
            await message.reply(
                `❌ Uso: \`${message.content.split(' ')[0]} <${validSubcommands.join('|')}> @usuario\``
            );
            return;
        }

        const target = message.mentions.users.first();

        if (!target) {
            await message.reply('❌ Debes mencionar a un usuario.');
            return;
        }

        if (target.id === message.author.id) {
            await message.reply('❌ No puedes interactuar contigo mismo.');
            return;
        }

        if (target.bot) {
            await message.reply('❌ No puedes interactuar con bots.');
            return;
        }

        const messages: Record<ActionType, string> = {
            hug: `**${message.author.displayName}** abraza a **${target.displayName}** 🤗`,
            kiss: `**${message.author.displayName}** besa a **${target.displayName}** 😘`,
            pat: `**${message.author.displayName}** acaricia la cabeza de **${target.displayName}** 😊`,
            slap: `**${message.author.displayName}** abofetea a **${target.displayName}** 🖐️`,
            poke: `**${message.author.displayName}** molesta a **${target.displayName}** 👉`,
            cuddle: `**${message.author.displayName}** se acurruca con **${target.displayName}** 🥰`,
            bite: `**${message.author.displayName}** muerde a **${target.displayName}** 😬`,
            tickle: `**${message.author.displayName}** le hace cosquillas a **${target.displayName}** 🤭`,
        };

        const loadingMsg = await message.reply('🔄 Cargando GIF...');

        try {
            const gifUrl = await getRandomGif(ACTION_QUERIES[subcommand]);

            const embed = new EmbedBuilder()
                .setDescription('\u200b') // Zero-width space para cumplir con el requisito de Discord
                .setImage(gifUrl)
                .setColor(0xFF69B4);

            await loadingMsg.edit({
                content: messages[subcommand],
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error obteniendo GIF:', error);
            await loadingMsg.edit({
                content: `${messages[subcommand]}\n\n_(No se pudo cargar el GIF)_`
            });
        }
    },
};
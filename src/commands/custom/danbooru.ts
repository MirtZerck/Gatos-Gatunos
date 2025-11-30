import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    TextChannel,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType,
    Message
} from "discord.js";
import { HybridCommand } from "../../types/Command.js";
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";
import { getRandomImage, getRatingInfo } from "../../utils/danbooru.js";
import { config } from "../../config.js";
import { sendMessage, createErrorEmbed, createWarningEmbed } from "../../utils/messageUtils.js";

export const danbooru: HybridCommand = {
    type: "hybrid",
    name: 'danbooru',
    description: 'Envía una imagen completamente aleatoria de Danbooru',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName("danbooru")
        .setDescription("Envía una imagen completamente aleatoria de Danbooru (sin filtros, puede ser cualquier cosa)")
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Tag de búsqueda (ej: "cat girl" se convierte en "cat_girl")')
                .setRequired(false)
        )
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL)
        .setNSFW(true),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        const rawQuery = interaction.options.getString('query');
        const query = rawQuery ? rawQuery.trim().replace(/\s+/g, '_') : '';

        await interaction.deferReply();

        try {
            const { post, imageUrl } = await getRandomImage(query);
            const rating = getRatingInfo(post.rating);

            const searchType = query ? `con query: "${query}"` : 'aleatoria';
            logger.info('Danbooru', `URL de imagen obtenida (${searchType}): ${imageUrl} - ID: ${post.id}, Rating: ${rating.name}`);

            const title = query
                ? `🎨 Imagen de Danbooru: ${query}`
                : '🎨 Imagen Aleatoria de Danbooru';

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(`[Ver en Danbooru](https://danbooru.donmai.us/posts/${post.id})`)
                .setColor(rating.color)
                .setImage(imageUrl)
                .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
                .setFooter({
                    text: `${rating.emoji} Rating: ${rating.name} • Score: ${post.score || 0} • ID: ${post.id}`
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            logger.info('Danbooru', `Imagen enviada exitosamente (${searchType}) - ID: ${post.id}`);

        } catch (error) {
            logger.error('Danbooru', 'Error al obtener imagen de Danbooru', error);

            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            const hasAuth = !!config.danbooruUsername;

            let description = errorMessage;

            const isSearchError = errorMessage.includes('No se encontr') ||
                                 errorMessage.includes('No se pudo obtener');

            if (isSearchError && query) {
                description = `${errorMessage}\n\n**💡 Posibles causas:**\n`;
                description += '• El tag podría no existir o estar mal escrito\n';
                description += '• El contenido podría estar restringido a cuentas Gold de Danbooru';

                if (!hasAuth) {
                    description += '\n• No hay credenciales de Danbooru configuradas (algunas búsquedas requieren autenticación)';
                    description += '\n\n💎 Considera configurar una cuenta de Danbooru para acceder a más contenido.';
                } else {
                    description += '\n\n💎 Tu cuenta actual podría no tener acceso a este contenido.';
                }
            } else {
                description += '\n\nPor favor, intenta de nuevo más tarde.';
            }

            const embed = createErrorEmbed(
                '❌ Error al Obtener Imagen',
                description
            );

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message: Message, args: string[]) {
        const isDM = !message.guild;
        let isNSFW = false;

        if (isDM) {
            isNSFW = true;
        } else {
            if (!message.channel) {
                const embed = createErrorEmbed(
                    '❌ Error de Canal',
                    'No se pudo obtener información del canal.'
                );
                await sendMessage(message, { embed });
                return;
            }

            if (message.channel.isTextBased()) {
                const textChannel = message.channel as TextChannel;
                isNSFW = textChannel.nsfw === true;
            }
        }

        if (!isNSFW) {
            const embed = createWarningEmbed(
                '🔞 Canal NSFW Requerido',
                'Este comando solo puede usarse en:\n' +
                '• Canales de servidor marcados como NSFW\n' +
                '• Mensajes directos (requiere verificación de mayoría de edad)\n\n' +
                '💡 Para usar este comando en un servidor, marca el canal como NSFW en la configuración del canal.'
            );
            await sendMessage(message, { embed });
            return;
        }

        const query = args.length > 0 ? args.join(' ').trim().replace(/\s+/g, '_') : '';
        const loadingMessage = await message.reply(
            query
                ? `🔄 Buscando imagen de Danbooru con: "${query}"...`
                : '🔄 Buscando imagen aleatoria de Danbooru...'
        );

        try {
            const { post, imageUrl } = await getRandomImage(query);
            const rating = getRatingInfo(post.rating);

            const searchType = query ? `con query: "${query}"` : 'aleatoria';
            logger.info('Danbooru', `URL de imagen obtenida (prefix, ${searchType}): ${imageUrl} - ID: ${post.id}, Rating: ${rating.name}`);

            const title = query
                ? `🎨 Imagen de Danbooru: ${query}`
                : '🎨 Imagen Aleatoria de Danbooru';

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(`[Ver en Danbooru](https://danbooru.donmai.us/posts/${post.id})`)
                .setColor(rating.color)
                .setImage(imageUrl)
                .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
                .setFooter({
                    text: `${rating.emoji} Rating: ${rating.name} • Score: ${post.score || 0} • ID: ${post.id}`
                })
                .setTimestamp();

            await loadingMessage.edit({ content: null, embeds: [embed] });

            logger.info('Danbooru', `Imagen enviada exitosamente (prefix, ${searchType}) - ID: ${post.id}`);

        } catch (error) {
            logger.error('Danbooru', 'Error al obtener imagen de Danbooru (prefix)', error);

            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            const hasAuth = !!config.danbooruUsername;

            let description = errorMessage;

            const isSearchError = errorMessage.includes('No se encontr') ||
                                 errorMessage.includes('No se pudo obtener');

            if (isSearchError && query) {
                description = `${errorMessage}\n\n**💡 Posibles causas:**\n`;
                description += '• El tag podría no existir o estar mal escrito\n';
                description += '• El contenido podría estar restringido a cuentas Gold de Danbooru';

                if (!hasAuth) {
                    description += '\n• No hay credenciales de Danbooru configuradas (algunas búsquedas requieren autenticación)';
                    description += '\n\n💎 Considera configurar una cuenta de Danbooru para acceder a más contenido.';
                } else {
                    description += '\n\n💎 Tu cuenta actual podría no tener acceso a este contenido.';
                }
            } else {
                description += '\n\nPor favor, intenta de nuevo más tarde.';
            }

            const embed = createErrorEmbed(
                '❌ Error al Obtener Imagen',
                description
            );

            await loadingMessage.edit({ content: null, embeds: [embed] });
        }
    }
}
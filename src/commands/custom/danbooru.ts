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

export const danbooru: HybridCommand = {
    type: "hybrid",
    name: 'danbooru',
    description: 'Envía una imagen completamente aleatoria de Danbooru',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName("danbooru")
        .setDescription("Envía una imagen completamente aleatoria de Danbooru (sin filtros, puede ser cualquier cosa)")
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL)
        .setNSFW(true),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const { post, imageUrl } = await getRandomImage();
            const rating = getRatingInfo(post.rating);

            logger.info('Danbooru', `URL de imagen obtenida: ${imageUrl} - ID: ${post.id}, Rating: ${rating.name}`);

            const embed = new EmbedBuilder()
                .setTitle('🎨 Imagen Aleatoria de Danbooru')
                .setDescription(`[Ver en Danbooru](https://danbooru.donmai.us/posts/${post.id})`)
                .setColor(rating.color)
                .setImage(imageUrl)
                .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
                .setFooter({
                    text: `${rating.emoji} Rating: ${rating.name} • Score: ${post.score || 0} • ID: ${post.id}`
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            logger.info('Danbooru', `Imagen enviada exitosamente - ID: ${post.id}`);

        } catch (error) {
            logger.error('Danbooru', 'Error al obtener imagen de Danbooru', error);

            const errorMessage = error instanceof Error
                ? error.message
                : 'Error desconocido';

            await interaction.editReply({
                content: `❌ ${errorMessage}\n\nPor favor, intenta de nuevo más tarde.`
            });
        }
    },

    async executePrefix(message: Message) {
        const isDM = !message.guild;
        let isNSFW = false;

        if (isDM) {
            isNSFW = true;
        } else {
            if (!message.channel) {
                await message.reply('❌ No se pudo obtener información del canal.');
                return;
            }

            if (message.channel.isTextBased()) {
                const textChannel = message.channel as TextChannel;
                isNSFW = textChannel.nsfw === true;
            }
        }

        if (!isNSFW) {
            await message.reply(
                '🔞 Este comando solo puede usarse en:\n' +
                '• Canales de servidor marcados como NSFW\n' +
                '• Mensajes directos (requiere verificación de mayoría de edad)\n\n' +
                '💡 Para usar este comando en un servidor, marca el canal como NSFW en la configuración del canal.'
            );
            return;
        }

        const loadingMessage = await message.reply('🔄 Buscando imagen aleatoria de Danbooru...');

        try {
            const { post, imageUrl } = await getRandomImage();
            const rating = getRatingInfo(post.rating);

            const embed = new EmbedBuilder()
                .setTitle('🎨 Imagen Aleatoria de Danbooru')
                .setDescription(`[Ver en Danbooru](https://danbooru.donmai.us/posts/${post.id})`)
                .setColor(rating.color)
                .setImage(imageUrl)
                .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
                .setFooter({
                    text: `${rating.emoji} Rating: ${rating.name} • Score: ${post.score || 0} • ID: ${post.id}`
                })
                .setTimestamp();

            await loadingMessage.edit({ content: null, embeds: [embed] });

            logger.info('Danbooru', `Imagen enviada exitosamente (prefix) - ID: ${post.id}, Rating: ${rating.name}`);

        } catch (error) {
            logger.error('Danbooru', 'Error al obtener imagen de Danbooru (prefix)', error);

            const errorMessage = error instanceof Error
                ? error.message
                : 'Error desconocido';

            await loadingMessage.edit({
                content: `❌ ${errorMessage}\n\nPor favor, intenta de nuevo más tarde.`,
                embeds: []
            });
        }
    }
}
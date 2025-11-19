import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    TextChannel,
    MessageFlags,
    InteractionContextType,
    ApplicationIntegrationType
} from "discord.js";
import { SlashOnlyCommand } from "../../types/Command.js";
import { CATEGORIES } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";
import { getRandomGif, getRatingInfo } from "../../utils/danbooru.js";

export const danbooru: SlashOnlyCommand = {
    type: "slash-only",
    name: 'danbooru',
    description: 'Envía un GIF completamente aleatorio de Danbooru',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName("danbooru")
        .setDescription("Envía un GIF completamente aleatorio de Danbooru (sin filtros, puede ser cualquier cosa)")
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ])
        .setIntegrationTypes([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        ])
        .setNSFW(true),

    contexts: [
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
    ],

    integrationTypes: [
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
    ],

    async execute(interaction: ChatInputCommandInteraction) {
        // Verificar si es un DM o canal NSFW
        const isDM = !interaction.guild;
        let isNSFW = false;

        if (isDM) {
            isNSFW = true;
        } else {
            if (!interaction.channel) {
                await interaction.reply({
                    content: '❌ No se pudo obtener información del canal.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            if (interaction.channel.isTextBased()) {
                const textChannel = interaction.channel as TextChannel;
                isNSFW = textChannel.nsfw === true;
            }
        }

        if (!isNSFW) {
            await interaction.reply({
                content: '🔞 Este comando solo puede usarse en:\n' +
                    '• Canales de servidor marcados como NSFW\n' +
                    '• Mensajes directos (requiere verificación de mayoría de edad)\n\n' +
                    '💡 Para usar este comando en un servidor, marca el canal como NSFW en la configuración del canal.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Obtener GIF aleatorio con todos los ratings
            const { post, imageUrl } = await getRandomGif('animated_gif rating:g,s,q,e');

            // Obtener información del rating
            const rating = getRatingInfo(post.rating);

            console.log(imageUrl);
            
            // Crear embed con el GIF
            const embed = new EmbedBuilder()
                .setTitle('🎨 GIF Aleatorio de Danbooru')
                .setDescription(`[Ver en Danbooru](https://danbooru.donmai.us/posts/${post.id})`)
                .setColor(rating.color)
                .setImage(imageUrl)
                .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
                .setFooter({
                    text: `${rating.emoji} Rating: ${rating.name} • Score: ${post.score || 0} • ID: ${post.id}`
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            logger.info('Danbooru', `GIF enviado exitosamente - ID: ${post.id}, Rating: ${rating.name}`);

        } catch (error) {
            logger.error('Danbooru', 'Error al obtener GIF de Danbooru', error);

            const errorMessage = error instanceof Error
                ? error.message
                : 'Error desconocido';

            await interaction.editReply({
                content: `❌ ${errorMessage}\n\nPor favor, intenta de nuevo más tarde.`
            });
        }
    }
}
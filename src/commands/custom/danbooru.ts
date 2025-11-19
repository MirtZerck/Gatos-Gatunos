import axios from "axios";
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, TextChannel, MessageFlags } from "discord.js";
import { SlashOnlyCommand } from "../../types/Command.js";
import { CATEGORIES, CONTEXTS, INTEGRATION_TYPES } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";

const DANBOORU_API = "https://danbooru.donmai.us/posts.json";


export const danbooru: SlashOnlyCommand = {
    type: "slash-only",
    name: 'danbooru',
    description: 'Envía un GIF completamente aleatorio de Danbooru',
    category: CATEGORIES.FUN,

    data: new SlashCommandBuilder()
        .setName("danbooru")
        .setDescription("Envía un GIF completamente aleatorio de Danbooru (sin filtros, puede ser cualquier cosa)")
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL)
        .setNSFW(),

    async execute(interaction: ChatInputCommandInteraction) {
        // Verificar si es un DM (guild es null en DMs)
        const isDM = !interaction.guild;
        let isNSFW = false;

        if (isDM) {
            // Para DMs, Discord automáticamente verifica la verificación de mayoría de edad
            // cuando el comando está marcado como NSFW con .setNSFW()
            // Si el usuario no tiene la verificación, Discord no les mostrará el comando
            // Por lo tanto, si llegamos aquí, el usuario ya tiene la verificación
            isNSFW = true;
        } else {
            // Para canales de servidor, verificar que el canal exista y sea NSFW
            if (!interaction.channel) {
                await interaction.reply({
                    content: '❌ No se pudo obtener información del canal.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Verificar la propiedad nsfw del canal
            // Los canales de texto del servidor (TextChannel) tienen la propiedad nsfw
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
            const params = {
                limit: 1,
                random: "true",
                tags: "animated_gif",
            };

            // Configurar headers para la petición
            const headers: Record<string, string> = {
                'User-Agent': 'Discord-Bot/1.0'
            };

            // Para consultas públicas, Danbooru no requiere autenticación
            // La autenticación solo es necesaria para acciones que requieren permisos
            // Si en el futuro se necesita autenticación, se puede agregar aquí
            const axiosConfig = {
                params,
                timeout: 15000,
                headers
            };

            // Intentar obtener un post válido con URL (máximo 5 intentos)
            const maxAttempts = 5;
            let post = null;
            let imageUrl = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const { data } = await axios.get(DANBOORU_API, axiosConfig);

                if (!data || data.length === 0) {
                    if (attempt === maxAttempts) {
                        await interaction.editReply("No se encontraron GIFs después de varios intentos.");
                        return;
                    }
                    continue;
                }

                const currentPost = data[0];

                // Verificar que el post sea un GIF válido
                if (currentPost.file_ext !== 'gif') {
                    if (attempt === maxAttempts) {
                        await interaction.editReply('No se pudo encontrar un GIF válido después de varios intentos. Intenta de nuevo más tarde.');
                        return;
                    }
                    logger.debug('Danbooru', `Intento ${attempt}: Post no es GIF, reintentando...`, { postId: currentPost.id });
                    continue;
                }

                // Intentar obtener la URL de la imagen en este orden de prioridad:
                // Para GIFs animados, usar file_url directamente (es la URL del GIF completo)
                // Si no está disponible, intentar con otros campos
                const currentImageUrl = currentPost.large_file_url || currentPost.sample_url || currentPost.preview_file_url || currentPost.file_url;

                if (!currentImageUrl) {
                    if (attempt === maxAttempts) {
                        logger.error('Danbooru', 'No se encontró URL de imagen después de varios intentos', {
                            postId: currentPost.id,
                            availableFields: Object.keys(currentPost).filter(k => k.includes('url') || k.includes('file'))
                        });
                        await interaction.editReply('No se pudo obtener un GIF válido después de varios intentos. Intenta de nuevo más tarde.');
                        return;
                    }
                    logger.debug('Danbooru', `Intento ${attempt}: Post sin URL, reintentando...`, { postId: currentPost.id });
                    continue;
                }

                // Post válido encontrado
                post = currentPost;
                imageUrl = currentImageUrl;
                break;
            }

            if (!post || !imageUrl) {
                await interaction.editReply('No se pudo obtener un GIF válido. Intenta de nuevo más tarde.');
                return;
            }

            // Asegurar que la URL sea absoluta y completa
            if (!imageUrl.startsWith('http')) {
                // Si la URL es relativa, construir la URL completa
                imageUrl = `https://danbooru.donmai.us${imageUrl}`;
            }

            // Verificar que la URL termine con .gif para asegurar que Discord la reconozca
            if (!imageUrl.toLowerCase().endsWith('.gif')) {
                logger.warn('Danbooru', `URL no termina en .gif: ${imageUrl}`);
            }

            // Log para depuración
            logger.debug('Danbooru', `URL de imagen obtenida: ${imageUrl}`, {
                postId: post.id,
                fileExt: post.file_ext,
                fileSize: post.file_size
            });

            const embed = new EmbedBuilder()
                .setTitle('🎨 GIF de Danbooru')
                .setDescription(`[Ver en Danbooru](https://danbooru.donmai.us/posts/${post.id})`)
                .setColor(post.rating === 'e' ? 0xff0000 :
                    post.rating === 'q' ? 0xff0000 :
                        0x00ffea
                )
                .setImage(imageUrl)
                .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
                .setFooter({ text: `Rating: ${post.rating.toUpperCase()} • Score: ${post.score || 0} • ID: ${post.id}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Danbooru', 'No se pudo encontrar un Gif', error)
            await interaction.editReply('Ocurrió un error consultando.')
        }
    }
}
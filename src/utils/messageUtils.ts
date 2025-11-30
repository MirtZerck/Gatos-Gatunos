import {
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    MessageFlags,
    MessageCreateOptions,
    InteractionEditReplyOptions,
    MessagePayload,
    PermissionsBitField
} from 'discord.js';
import { logger } from './logger.js';

/**
 * Opciones para enviar mensajes con embeds y fallback
 */
export interface SendMessageOptions {
    /** Contenido de texto opcional */
    content?: string;
    /** Embed a enviar */
    embed?: EmbedBuilder;
    /** Si debe ser efímero (solo para slash commands) */
    ephemeral?: boolean;
}

/**
 * Envía un mensaje con embed, con fallback automático a texto plano si no hay permisos.
 *
 * @param context - Interacción de slash command o mensaje de prefijo
 * @param options - Opciones del mensaje
 * @returns Promesa que resuelve cuando el mensaje es enviado
 *
 * @example
 * ```typescript
 * const embed = new EmbedBuilder()
 *   .setTitle('Error')
 *   .setDescription('Algo salió mal')
 *   .setColor(0xFF0000);
 *
 * await sendMessage(interaction, { embed, ephemeral: true });
 * ```
 */
export async function sendMessage(
    context: ChatInputCommandInteraction | Message,
    options: SendMessageOptions
): Promise<void> {
    const { content, embed, ephemeral = false } = options;

    // Para slash commands
    if (context instanceof ChatInputCommandInteraction) {
        try {
            if (context.replied || context.deferred) {
                await context.editReply({
                    content: content ?? undefined,
                    embeds: embed ? [embed] : [],
                });
            } else {
                await context.reply({
                    content: content ?? undefined,
                    embeds: embed ? [embed] : [],
                    flags: ephemeral ? MessageFlags.Ephemeral : undefined
                });
            }
        } catch (error) {
            logger.error('messageUtils', 'Error enviando mensaje de interacción', error);
            // Intentar con solo texto como último recurso
            try {
                const fallbackContent = content ?? embedToText(embed);
                if (context.replied || context.deferred) {
                    await context.editReply({ content: fallbackContent, embeds: [] });
                } else {
                    await context.reply({
                        content: fallbackContent,
                        flags: ephemeral ? MessageFlags.Ephemeral : undefined
                    });
                }
            } catch (fallbackError) {
                logger.error('messageUtils', 'Error enviando fallback de interacción', fallbackError);
            }
        }
        return;
    }

    // Para prefix commands
    try {
        // Verificar permisos de embed si estamos en un servidor
        let canSendEmbeds = true;
        if (context.guild && context.channel && 'permissionsFor' in context.channel) {
            const permissions = context.channel.permissionsFor(context.guild.members.me!);
            canSendEmbeds = permissions?.has(PermissionsBitField.Flags.EmbedLinks) ?? false;
        }

        if (embed && canSendEmbeds) {
            // Intentar enviar con embed
            await context.reply({
                content: content ?? undefined,
                embeds: [embed]
            });
        } else if (embed && !canSendEmbeds) {
            // Fallback a texto plano si no hay permisos para embeds
            const textContent = content ? `${content}\n\n${embedToText(embed)}` : embedToText(embed);
            await context.reply(textContent);
        } else {
            // Solo contenido de texto
            await context.reply(content ?? 'Sin contenido');
        }
    } catch (error) {
        logger.error('messageUtils', 'Error enviando mensaje', error);

        // Último intento: solo texto plano
        try {
            const fallbackContent = content ?? embedToText(embed);
            await context.reply(fallbackContent);
        } catch (fallbackError) {
            logger.error('messageUtils', 'Error enviando fallback', fallbackError);
        }
    }
}

/**
 * Convierte un embed a texto plano para usar como fallback.
 *
 * @param embed - Embed a convertir
 * @returns Texto plano con el contenido del embed
 */
function embedToText(embed?: EmbedBuilder): string {
    if (!embed) return 'Sin contenido';

    const data = embed.data;
    let text = '';

    if (data.title) {
        text += `**${data.title}**\n\n`;
    }

    if (data.description) {
        text += `${data.description}\n`;
    }

    if (data.fields && data.fields.length > 0) {
        text += '\n';
        data.fields.forEach(field => {
            text += `**${field.name}**\n${field.value}\n\n`;
        });
    }

    if (data.footer?.text) {
        text += `\n_${data.footer.text}_`;
    }

    return text || 'Sin contenido';
}

/**
 * Crea un embed de error con estilo consistente.
 *
 * @param title - Título del error
 * @param description - Descripción del error
 * @param color - Color del embed (por defecto rojo)
 * @returns EmbedBuilder configurado
 */
export function createErrorEmbed(
    title: string,
    description: string,
    color: number = 0xFF0000
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

/**
 * Crea un embed de éxito con estilo consistente.
 *
 * @param title - Título del mensaje
 * @param description - Descripción del mensaje
 * @param color - Color del embed (por defecto verde)
 * @returns EmbedBuilder configurado
 */
export function createSuccessEmbed(
    title: string,
    description: string,
    color: number = 0x00FF00
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

/**
 * Crea un embed de advertencia con estilo consistente.
 *
 * @param title - Título de la advertencia
 * @param description - Descripción de la advertencia
 * @param color - Color del embed (por defecto naranja)
 * @returns EmbedBuilder configurado
 */
export function createWarningEmbed(
    title: string,
    description: string,
    color: number = 0xFFA500
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

/**
 * Crea un embed de información con estilo consistente.
 *
 * @param title - Título de la información
 * @param description - Descripción de la información
 * @param color - Color del embed (por defecto azul)
 * @returns EmbedBuilder configurado
 */
export function createInfoEmbed(
    title: string,
    description: string,
    color: number = 0x3498DB
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

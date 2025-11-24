import { Events, ButtonInteraction, EmbedBuilder, MessageFlags, TextChannel } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";
import { COLORS } from "../utils/constants.js";
import { getRandomGif } from "../utils/tenor.js";
import { BotClient } from "../types/BotClient.js";
import { PendingRequest } from "../managers/RequestManager.js";

/** Configuración de acciones de interacción */
const ACTION_CONFIG: Record<string, {
    emoji: string;
    name: string;
    color: number;
    query: string;
    successMessage: (author: string, target: string) => string;
    footer: string;
}> = {
    hug: {
        emoji: '🤗',
        name: 'abrazo',
        color: 0xFFB6C1,
        query: 'anime hug',
        successMessage: (a, t) => `**${a}** abraza cálidamente a **${t}**`,
        footer: '💝 Los abrazos son gratis pero invaluables'
    },
    kiss: {
        emoji: '😘',
        name: 'beso',
        color: 0xFF69B4,
        query: 'anime kiss',
        successMessage: (a, t) => `**${a}** le da un tierno beso a **${t}**`,
        footer: '💋 Con amor y cariño'
    },
    pat: {
        emoji: '😊',
        name: 'caricia',
        color: 0xFFA500,
        query: 'anime head pat',
        successMessage: (a, t) => `**${a}** acaricia suavemente la cabeza de **${t}**`,
        footer: '✨ Mimitos que alegran el día'
    },
    cuddle: {
        emoji: '🥰',
        name: 'acurrucada',
        color: 0xFFB6E1,
        query: 'anime cuddle',
        successMessage: (a, t) => `**${a}** se acurruca cómodamente con **${t}**`,
        footer: '🛋️ Momentos cálidos y acogedores'
    },
    dance: {
        emoji: '💃',
        name: 'baile',
        color: 0xDA70D6,
        query: 'anime dance',
        successMessage: (a, t) => `**${a}** baila alegremente con **${t}**`,
        footer: '🎶 ¡A mover el esqueleto!'
    },
    sing: {
        emoji: '🎤',
        name: 'canto',
        color: 0x9370DB,
        query: 'anime sing',
        successMessage: (a, t) => `**${a}** canta una hermosa canción con **${t}**`,
        footer: '🎵 La música une corazones'
    },
    highfive: {
        emoji: '✋',
        name: 'choque de manos',
        color: 0x32CD32,
        query: 'anime high five',
        successMessage: (a, t) => `**${a}** choca los cinco con **${t}**`,
        footer: '🙌 ¡Gran trabajo en equipo!'
    }
};

/**
 * Handler de botones para solicitudes de interacción.
 * Procesa las respuestas de aceptar/rechazar en solicitudes de interact/act.
 */
export default {
    name: Events.InteractionCreate,

    async execute(client: BotClient, interaction: ButtonInteraction) {
        if (!interaction.isButton()) return;

        const buttonInteraction = interaction as ButtonInteraction;

        if (!buttonInteraction.customId.startsWith('interact_') &&
            !buttonInteraction.customId.startsWith('act_')) {
            return;
        }

        try {
            await buttonInteraction.deferUpdate();
        } catch (error) {
            logger.error('ButtonInteraction', 'Error en deferUpdate', error);
            return;
        }

        const requestManager = client.requestManager;
        const request = requestManager?.findRequestByMessage(buttonInteraction.message.id);

        if (!request) {
            const expiredEmbed = new EmbedBuilder()
                .setDescription('❌ Esta solicitud ha expirado o ya fue respondida.')
                .setColor(COLORS.WARNING);

            await buttonInteraction.editReply({
                embeds: [expiredEmbed],
                components: []
            }).catch(() => { });
            return;
        }

        if (buttonInteraction.user.id !== request.targetId) {
            const wrongUserEmbed = new EmbedBuilder()
                .setDescription('❌ Esta solicitud no es para ti.')
                .setColor(COLORS.DANGER);

            await buttonInteraction.followUp({
                embeds: [wrongUserEmbed],
                flags: MessageFlags.Ephemeral
            }).catch(() => { });
            return;
        }

        const parts = buttonInteraction.customId.split('_');
        const actionType = parts[1];
        const action = parts[2] || request.action;

        try {
            if (actionType === 'accept') {
                await handleAccept(buttonInteraction, request, action, client);
            } else if (actionType === 'reject') {
                await handleReject(buttonInteraction, request, action, client);
            }

            requestManager?.resolveRequestWith(request.authorId, request.targetId);
        } catch (error) {
            logger.error('ButtonInteraction', 'Error procesando respuesta', error);

            try {
                const errorEmbed = new EmbedBuilder()
                    .setDescription('❌ Hubo un error al procesar tu respuesta.')
                    .setColor(COLORS.DANGER);

                await buttonInteraction.editReply({
                    embeds: [errorEmbed],
                    components: []
                });
            } catch {
                logger.error('ButtonInteraction', 'No se pudo enviar mensaje de error');
            }
        }
    }
} as Event;

/**
 * Procesa la aceptación de una solicitud de interacción.
 */
async function handleAccept(
    interaction: ButtonInteraction,
    request: PendingRequest,
    action: string,
    client: BotClient
): Promise<void> {
    const config = ACTION_CONFIG[action];
    if (!config) {
        throw new Error(`Acción no válida: ${action}`);
    }

    const author = await client.users.fetch(request.authorId);
    const target = interaction.user;

    const acceptedEmbed = new EmbedBuilder()
        .setDescription(`${config.emoji} **${target.displayName}** aceptó la solicitud de **${config.name}** de **${author.displayName}**`)
        .setColor(config.color)
        .setTimestamp();

    await interaction.editReply({
        embeds: [acceptedEmbed],
        components: []
    });

    const gifUrl = await getRandomGif(config.query);
    const message = config.successMessage(author.displayName, target.displayName);

    const statsManager = client.interactionStatsManager;
    let statsText: string | null = null;

    if (statsManager && statsManager.shouldTrack(action)) {
        try {
            await statsManager.recordInteraction(author.id, target.id, action);
            statsText = await statsManager.getSpecificBriefStats(author.id, target.id, action);
        } catch (error) {
            logger.error('ButtonInteraction', 'Error registrando estadística', error);
        }
    }

    const successEmbed = new EmbedBuilder()
        .setImage(gifUrl)
        .setColor(config.color)
        .setTimestamp()
        .setFooter({ text: config.footer });

    if (statsText) {
        successEmbed.setDescription(`${config.emoji} ${message} \n${statsText}`);
    } else {
        successEmbed.setDescription(`${config.emoji} ${message}`);
    }

    const channel = interaction.channel as TextChannel;
    if (channel) {
        await channel.send({
            content: `<@${author.id}>`,
            embeds: [successEmbed]
        });
    }

    logger.info('ButtonInteraction', `Aceptado: ${author.tag} -> ${action} -> ${target.tag}`);
}

/**
 * Procesa el rechazo de una solicitud de interacción.
 */
async function handleReject(
    interaction: ButtonInteraction,
    request: PendingRequest,
    action: string,
    client: BotClient
): Promise<void> {
    const config = ACTION_CONFIG[action];
    const author = await client.users.fetch(request.authorId);
    const target = interaction.user;
    const actionName = config?.name || action;

    const rejectedEmbed = new EmbedBuilder()
        .setDescription(`❌ **${target.displayName}** rechazó la solicitud de **${actionName}** de **${author.displayName}**`)
        .setColor(COLORS.DANGER)
        .setTimestamp();

    await interaction.editReply({
        embeds: [rejectedEmbed],
        components: []
    });

    const rejectEmbed = new EmbedBuilder()
        .setDescription(
            `💔 **${target.displayName}** rechazó la solicitud de **${actionName}** de **${author.displayName}**`
        )
        .setColor(COLORS.DANGER)
        .setFooter({ text: '¡Quizás en otra ocasión!' })
        .setTimestamp();

    const channel = interaction.channel as TextChannel;
    if (channel) {
        await channel.send({
            content: `<@${author.id}>`,
            embeds: [rejectEmbed]
        });
    }

    logger.info('ButtonInteraction', `Rechazado: ${author.tag} -> ${action} -> ${target.tag}`);
}

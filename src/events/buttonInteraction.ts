import { Events, ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";
import { COLORS } from "../utils/constants.js";
import { getRandomGif } from "../utils/tenor.js";
import { BotClient } from "../types/BotClient.js";

/**
 * Mensajes para cada tipo de acción de interacción.
 */

const ACTION_MESSAGES: Record<string, (author: string, target: string) => string> = {
    hug: (author, target) => `**${author}** abraza a **${target}** 🤗`,
    kiss: (author, target) => `**${author}** besa a **${target}** 😘`,
    pat: (author, target) => `**${author}** acaricia la cabeza de **${target}** 😊`,
    slap: (author, target) => `**${author}** abofetea a **${target}** 🖐️`,
    poke: (author, target) => `**${author}** molesta a **${target}** 👉`,
    cuddle: (author, target) => `**${author}** se acurruca con **${target}** 🥰`,
    bite: (author, target) => `**${author}** muerde a **${target}** 😬`,
    tickle: (author, target) => `**${author}** le hace cosquillas a **${target}** 🤭`,
};

/**
 * Queries de búsqueda para Tenor API.
 */

const ACTION_QUERIES: Record<string, string> = {
    hug: 'anime hug',
    kiss: 'anime kiss',
    pat: 'anime head pat',
    slap: 'anime slap',
    poke: 'anime poke',
    cuddle: 'anime cuddle',
    bite: 'anime bite',
    tickle: 'anime tickle',
};

export default {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        const buttonInteraction = interaction as ButtonInteraction;

        // Solo procesar botones de solicitudes de interacción
        if (!buttonInteraction.customId.startsWith('interact_')) return;

        const requestManager = (client as BotClient).requestManager;
        if (!requestManager) {
            await buttonInteraction.reply({
                content: '❌ El sistema de solicitudes no está disponible.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Buscar la solicitud por ID del mensaje
        const request = requestManager.findRequestByMessage(buttonInteraction.message.id);

        if (!request) {
            await buttonInteraction.update({
                content: '❌ Esta solicitud ha expirado o ya fue respondida.',
                embeds: [],
                components: []
            });
            return;
        }

        // Verificar que quien responde es el usuario objetivo
        if (buttonInteraction.user.id !== request.targetId) {
            await buttonInteraction.reply({
                content: '❌ Esta solicitud no es para ti.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Extraer la acción del customId: interact_accept_hug o interact_reject_hug
        const [, actionType] = buttonInteraction.customId.split('_');

        if (actionType === 'accept') {
            await handleAccept(buttonInteraction, request, client as BotClient);
        } else if (actionType === 'reject') {
            await handleReject(buttonInteraction, request, client as BotClient);
        }

        // Resolver (eliminar) la solicitud
        requestManager.resolveRequest(request.authorId);
    }
} as Event;

/**
 * Maneja cuando se acepta una solicitud de interacción.
 */

async function handleAccept(
    interaction: ButtonInteraction,
    request: any,
    client: BotClient
): Promise<void> {
    try {
        const author = await client.users.fetch(request.authorId);
        const target = interaction.user;

        // Obtener el GIF de Tenor
        const gifUrl = await getRandomGif(ACTION_QUERIES[request.action]);
        const message = ACTION_MESSAGES[request.action](author.displayName, target.displayName);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await interaction.update({
            content: null,
            embeds: [embed],
            components: []
        });

        logger.info(
            'ButtonInteraction',
            `Solicitud aceptada: ${author.tag} ${request.action} ${target.tag}`
        );
    } catch (error) {
        logger.error('ButtonInteraction', 'Error al procesar aceptación', error);
        await interaction.update({
            content: '❌ Hubo un error al procesar tu respuesta.',
            embeds: [],
            components: []
        });
    }
}

/**
 * Maneja cuando se rechaza una solicitud de interacción.
 */

async function handleReject(
    interaction: ButtonInteraction,
    request: any,
    client: BotClient
): Promise<void> {
    try {
        const author = await client.users.fetch(request.authorId);
        const target = interaction.user;

        const embed = new EmbedBuilder()
            .setDescription(`❌ **${target.displayName}** rechazó la solicitud de **${author.displayName}**`)
            .setColor(COLORS.DANGER);

        await interaction.update({
            content: null,
            embeds: [embed],
            components: []
        });

        logger.info(
            'ButtonInteraction',
            `Solicitud rechazada: ${author.tag} ${request.action} ${target.tag}`
        );
    } catch (error) {
        logger.error('ButtonInteraction', 'Error al procesar rechazo', error);
        await interaction.update({
            content: '❌ Hubo un error al procesar tu respuesta.',
            embeds: [],
            components: []
        });
    }
}
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
    bonk: (author, target) => `**${author}** le da un golpe juguetón a **${target}** 🔨`,
    boop: (author, target) => `**${author}** toca la nariz de **${target}** 👆`,
    dance: (author, target) => `**${author}** baila con **${target}** 💃`,
    sing: (author, target) => `**${author}** canta con **${target}** 🎤`,
    highfive: (author, target) => `**${author}** choca los cinco con **${target}** ✋`,
    wave: (author, target) => `**${author}** saluda a **${target}** 👋`,
    bow: (author, target) => `**${author}** hace una reverencia ante **${target}** 🙇`,
    clap: (author, target) => `**${author}** aplaude a **${target}** 👏`,
    cheer: (author, target) => `**${author}** anima a **${target}** 🎉`,
    salute: (author, target) => `**${author}** saluda militarmente a **${target}** 🫡`,
    nod: (author, target) => `**${author}** asiente ante **${target}** 👍`,
    smile: (author, target) => `**${author}** sonríe gracias a **${target}** 😊`,
    laugh: (author, target) => `**${author}** se ríe por **${target}** 😂`,
    cry: (author, target) => `**${author}** llora por **${target}** 😢`,
    blush: (author, target) => `**${author}** se sonroja por **${target}** 😳`,
    pout: (author, target) => `**${author}** le hace pucheros a **${target}** 🥺`,
    angry: (author, target) => `**${author}** está enojado con **${target}** 😠`,
    confused: (author, target) => `**${author}** está confundido por **${target}** 😕`,
    shocked: (author, target) => `**${author}** está sorprendido por **${target}** 😱`,
    happy: (author, target) => `**${author}** está feliz con **${target}** 😄`,
    sad: (author, target) => `**${author}** está triste por **${target}** 😔`,
    sleep: (author, target) => `**${author}** se fue a dormir pensando en **${target}** 😴`,
    yawn: (author, target) => `**${author}** bosteza frente a **${target}** 🥱`,
    shrug: (author, target) => `**${author}** se encoge de hombros ante **${target}** 🤷`,
    think: (author, target) => `**${author}** piensa en **${target}** 🤔`,
    stare: (author, target) => `**${author}** mira fijamente a **${target}** 👀`,
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
    bonk: 'anime bonk',
    boop: 'anime boop',
    dance: 'anime dance',
    sing: 'anime sing',
    highfive: 'anime high five',
    wave: 'anime wave',
    bow: 'anime bow',
    clap: 'anime clap',
    cheer: 'anime cheer',
    salute: 'anime salute',
    nod: 'anime nod',
    smile: 'anime smile',
    laugh: 'anime laugh',
    cry: 'anime cry',
    blush: 'anime blush',
    pout: 'anime pout',
    angry: 'anime angry',
    confused: 'anime confused',
    shocked: 'anime shocked',
    happy: 'anime happy',
    sad: 'anime sad',
    yawn: 'anime yawn',
    shrug: 'anime shrug',
    think: 'anime think',
    stare: 'anime stare',
};

export default {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        const buttonInteraction = interaction as ButtonInteraction;

        // Solo procesar botones de solicitudes de interacción
        if (!buttonInteraction.customId.startsWith('interact_') && !buttonInteraction.customId.startsWith('act_') && !buttonInteraction.customId.startsWith('react_')) return;

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

        // Extraer el tipo de acción del customId: interact_accept_hug -> ['interact', 'accept', 'hug']
        const parts = buttonInteraction.customId.split('_');
        const actionType = parts[1]; // 'accept' o 'reject'

        try {
            if (actionType === 'accept') {
                await handleAccept(buttonInteraction, request, client as BotClient);
            } else if (actionType === 'reject') {
                await handleReject(buttonInteraction, request, client as BotClient);
            } else {
                await buttonInteraction.reply({
                    content: '❌ Tipo de acción no válido.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Resolver (eliminar) la solicitud solo si se procesó correctamente
            requestManager.resolveRequest(request.authorId);
        } catch (error) {
            logger.error('ButtonInteraction', 'Error procesando botón', error);
            // No resolver la solicitud si hubo un error, para que el usuario pueda intentar de nuevo
        }
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
        // Diferir la actualización inmediatamente para evitar que expire la interacción
        await interaction.deferUpdate();

        const author = await client.users.fetch(request.authorId);
        const target = interaction.user;

        // Validar que la acción existe
        if (!ACTION_QUERIES[request.action]) {
            throw new Error(`Acción no válida: ${request.action}`);
        }
        if (!ACTION_MESSAGES[request.action]) {
            throw new Error(`Mensaje no encontrado para acción: ${request.action}`);
        }

        // Obtener el GIF de Tenor
        const gifUrl = await getRandomGif(ACTION_QUERIES[request.action]);
        const message = ACTION_MESSAGES[request.action](author.displayName, target.displayName);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setImage(gifUrl)
            .setColor(COLORS.INTERACTION);

        await interaction.editReply({
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
        try {
            // Si ya se hizo deferUpdate, usar editReply; si no, usar update
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ Hubo un error al procesar tu respuesta.',
                    embeds: [],
                    components: []
                });
            } else {
                await interaction.update({
                    content: '❌ Hubo un error al procesar tu respuesta.',
                    embeds: [],
                    components: []
                });
            }
        } catch (replyError) {
            logger.error('ButtonInteraction', 'Error al responder al error', replyError);
        }
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
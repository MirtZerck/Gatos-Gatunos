import { Events, ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";
import { COLORS } from "../utils/constants.js";
import { getRandomGif } from "../utils/tenor.js";
import { BotClient } from "../types/BotClient.js";

// ✅ Mensajes consolidados por categoría de comando
const ACTION_MESSAGES: Record<string, (author: string, target: string) => string> = {
    // INTERACT
    hug: (a, t) => `**${a}** abraza a **${t}** 🤗`,
    kiss: (a, t) => `**${a}** besa a **${t}** 😘`,
    pat: (a, t) => `**${a}** acaricia la cabeza de **${t}** 😊`,
    cuddle: (a, t) => `**${a}** se acurruca con **${t}** 🥰`,
    // ACT
    dance: (a, t) => `**${a}** baila con **${t}** 💃`,
    sing: (a, t) => `**${a}** canta con **${t}** 🎤`,
    highfive: (a, t) => `**${a}** choca los cinco con **${t}** ✋`,
};

const ACTION_QUERIES: Record<string, string> = {
    // INTERACT
    hug: 'anime hug',
    kiss: 'anime kiss',
    pat: 'anime head pat',
    cuddle: 'anime cuddle',
    // ACT
    dance: 'anime dance',
    sing: 'anime sing',
    highfive: 'anime high five',
};

const ACTION_NAMES: Record<string, string> = {
    hug: 'abrazo',
    kiss: 'beso',
    pat: 'caricia',
    cuddle: 'acurrucada',
    dance: 'baile',
    sing: 'canto',
    highfive: 'choque de manos',
};

export default {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        // ✅ Filtro 1: Solo botones
        if (!interaction.isButton()) return;

        const buttonInteraction = interaction as ButtonInteraction;

        // ✅ Filtro 2: Solo botones de interact/act
        if (!buttonInteraction.customId.startsWith('interact_') && 
            !buttonInteraction.customId.startsWith('act_')) {
            return;
        }

        // ✅ DEFER INMEDIATO (antes de cualquier operación)
        try {
            await buttonInteraction.deferUpdate();
        } catch (error) {
            logger.error('ButtonInteraction', 'Error en deferUpdate', error);
            return; // Si falla el defer, no podemos continuar
        }

        const requestManager = (client as BotClient).requestManager;
        
        // ✅ Buscar solicitud registrada
        const request = requestManager?.findRequestByMessage(buttonInteraction.message.id);

        if (!request) {
            // La solicitud expiró o no existe
            const expiredEmbed = new EmbedBuilder()
                .setDescription('❌ Esta solicitud ha expirado o ya fue respondida.')
                .setColor(COLORS.WARNING);

            await buttonInteraction.editReply({
                embeds: [expiredEmbed],
                components: []
            }).catch(() => {});
            return;
        }

        // ✅ Verificar que quien responde es el usuario correcto
        if (buttonInteraction.user.id !== request.targetId) {
            // Enviar mensaje efímero al usuario incorrecto
            const wrongUserEmbed = new EmbedBuilder()
                .setDescription('❌ Esta solicitud no es para ti.')
                .setColor(COLORS.DANGER);

            await buttonInteraction.followUp({
                embeds: [wrongUserEmbed],
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return;
        }

        // ✅ Extraer información del customId
        // Formato: interact_accept_hug o act_reject_dance
        const parts = buttonInteraction.customId.split('_');
        const commandType = parts[0]; // 'interact' o 'act'
        const actionType = parts[1]; // 'accept' o 'reject'
        const action = parts[2] || request.action; // Acción específica

        // ✅ Procesar respuesta
        try {
            if (actionType === 'accept') {
                await handleAccept(buttonInteraction, request, action, client as BotClient);
            } else if (actionType === 'reject') {
                await handleReject(buttonInteraction, request, action, client as BotClient);
            }

            // ✅ Limpiar solicitud ESPECÍFICA del RequestManager
            if (requestManager) {
                requestManager.resolveRequestWith(request.authorId, request.targetId);
                
                // Log de solicitudes restantes (opcional - para debug)
                const remainingRequests = requestManager.getAllPendingRequestsByAuthor(request.authorId);
                if (remainingRequests.length > 0) {
                    logger.debug(
                        'ButtonInteraction',
                        `${request.authorId} tiene ${remainingRequests.length} solicitud(es) adicional(es) activa(s)`
                    );
                }
            }

        } catch (error) {
            logger.error('ButtonInteraction', 'Error procesando respuesta', error);
            
            // Intentar mostrar mensaje de error
            try {
                const errorEmbed = new EmbedBuilder()
                    .setDescription('❌ Hubo un error al procesar tu respuesta.')
                    .setColor(COLORS.DANGER);

                await buttonInteraction.editReply({
                    embeds: [errorEmbed],
                    components: []
                });
            } catch {
                // Si falla, al menos lo registramos
                logger.error('ButtonInteraction', 'No se pudo enviar mensaje de error al usuario');
            }
        }
    }
} as Event;

// ==================== HANDLERS ====================

async function handleAccept(
    interaction: ButtonInteraction,
    request: any,
    action: string,
    client: BotClient
): Promise<void> {
    // ✅ Validar que tenemos los datos necesarios
    if (!ACTION_QUERIES[action] || !ACTION_MESSAGES[action]) {
        throw new Error(`Acción no válida o no soportada: ${action}`);
    }

    // ✅ Obtener usuarios
    const author = await client.users.fetch(request.authorId);
    const target = interaction.user;

    // ✅ Obtener GIF (operación lenta, pero ya hicimos defer)
    const gifUrl = await getRandomGif(ACTION_QUERIES[action]);
    const message = ACTION_MESSAGES[action](author.displayName, target.displayName);

    const successEmbed = new EmbedBuilder()
        .setDescription(message)
        .setImage(gifUrl)
        .setColor(COLORS.INTERACTION)
        .setTimestamp();

    // ✅ Actualizar mensaje con resultado
    await interaction.editReply({
        embeds: [successEmbed],
        components: []
    });

    logger.info(
        'ButtonInteraction',
        `✅ Aceptado: ${author.tag} → ${action} → ${target.tag}`
    );
}

async function handleReject(
    interaction: ButtonInteraction,
    request: any,
    action: string,
    client: BotClient
): Promise<void> {
    // ✅ Obtener usuarios
    const author = await client.users.fetch(request.authorId);
    const target = interaction.user;
    const actionName = ACTION_NAMES[action] || action;

    const rejectEmbed = new EmbedBuilder()
        .setDescription(
            `${target.displayName} rechazó la solicitud de **${actionName}** de ${author.displayName}. 💔`
        )
        .setColor(COLORS.DANGER)
        .setTimestamp();

    // ✅ Actualizar mensaje con rechazo
    await interaction.editReply({
        embeds: [rejectEmbed],
        components: []
    });

    logger.info(
        'ButtonInteraction',
        `❌ Rechazado: ${author.tag} → ${action} → ${target.tag}`
    );
}
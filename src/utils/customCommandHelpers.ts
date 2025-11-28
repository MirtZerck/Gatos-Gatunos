import { EmbedBuilder } from 'discord.js';
import { COLORS } from './constants.js';
import { CommandProposal, NotificationData } from '../types/CustomCommand.js';

/**
 * Crea el embed para mostrar un comando personalizado
 */
export function createCustomCommandEmbed(
    commandName: string,
    imageUrl: string,
    totalImages: number,
    authorTag?: string
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`🎨 ${commandName}`)
        .setImage(imageUrl)
        .setColor(COLORS.PRIMARY)
        .setTimestamp();

    if (authorTag) {
        embed.setFooter({
            text: `Añadido por: ${authorTag} | Total de imágenes: ${totalImages}`
        });
    } else {
        embed.setFooter({
            text: `Total de imágenes: ${totalImages}`
        });
    }

    return embed;
}

/**
 * Crea el embed para confirmar una propuesta enviada
 */
export function createProposalSentEmbed(
    commandName: string,
    imageUrl: string,
    proposalId: string
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('✅ Propuesta Enviada')
        .setDescription(
            `**Comando:** ${commandName}\n\n` +
            `Tu propuesta ha sido enviada y está pendiente de revisión por los moderadores.\n\n` +
            `Recibirás una notificación cuando sea procesada.`
        )
        .setImage(imageUrl)
        .setColor(COLORS.SUCCESS)
        .setFooter({ text: `ID: ${proposalId}` })
        .setTimestamp();
}

/**
 * Crea el embed para gestionar propuestas (moderadores)
 */
export function createProposalManagementEmbed(
    proposal: CommandProposal,
    currentIndex: number,
    totalProposals: number,
    isNewCommand: boolean
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`📋 Propuesta ${currentIndex + 1} de ${totalProposals}`)
        .setDescription(
            `**Comando:** ${proposal.commandName}\n` +
            `**Propuesto por:** ${proposal.authorTag}\n` +
            `**Hace:** <t:${Math.floor(proposal.timestamp / 1000)}:R>\n\n` +
            (isNewCommand
                ? `⚠️ **Nuevo comando**\nSe creará el comando "${proposal.commandName}"`
                : `📝 **Comando existente**\nSe añadirá una nueva imagen al comando existente`
            )
        )
        .setImage(proposal.imageUrl)
        .setColor(COLORS.INFO)
        .setFooter({ text: `ID: ${proposal.id}` })
        .setTimestamp();

    return embed;
}

/**
 * Crea el embed de notificación para el usuario
 */
export function createNotificationEmbed(data: NotificationData): EmbedBuilder {
    if (data.accepted) {
        return new EmbedBuilder()
            .setTitle('✅ Propuesta Aceptada')
            .setDescription(
                `Tu propuesta para el comando **${data.commandName}** ha sido aceptada en **${data.guildName}**\n\n` +
                (data.isNewCommand
                    ? `¡Nuevo comando creado! Ya está disponible para todos.`
                    : `Tu imagen ha sido añadida al comando existente.`
                ) +
                `\n\n**Úsalo con:**\n\`*${data.commandName}\``
            )
            .setImage(data.imageUrl)
            .setColor(COLORS.SUCCESS)
            .setFooter({
                text: data.moderatorTag
                    ? `Procesado por: ${data.moderatorTag}`
                    : 'Procesado por moderador'
            })
            .setTimestamp();
    } else {
        return new EmbedBuilder()
            .setTitle('❌ Propuesta Rechazada')
            .setDescription(
                `Tu propuesta para el comando **${data.commandName}** en **${data.guildName}** ha sido rechazada.\n\n` +
                `Esto puede deberse a:\n` +
                `• Contenido inapropiado\n` +
                `• Imagen no válida\n` +
                `• Duplicado\n` +
                `• Decisión del equipo de moderación`
            )
            .setColor(COLORS.DANGER)
            .setFooter({
                text: data.moderatorTag
                    ? `Procesado por: ${data.moderatorTag}`
                    : 'Procesado por moderador'
            })
            .setTimestamp();
    }
}

/**
 * Crea el embed para listar comandos disponibles
 */
export function createCommandListEmbed(
    commands: Array<{ name: string; count: number }>,
    guildName: string,
    page: number = 0,
    itemsPerPage: number = 10
): EmbedBuilder {
    if (commands.length === 0) {
        return new EmbedBuilder()
            .setTitle('📋 Comandos Personalizados')
            .setDescription(
                `No hay comandos personalizados en **${guildName}** aún.\n\n` +
                `¡Sé el primero en proponer uno con \`*proponer <comando> <imagen>\`!`
            )
            .setColor(COLORS.INFO)
            .setTimestamp();
    }

    const totalPages = Math.ceil(commands.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCommands = commands.slice(start, end);

    const commandList = pageCommands
        .map(cmd => `• **${cmd.name}** (${cmd.count} imagen${cmd.count !== 1 ? 'es' : ''})`)
        .join('\n');

    return new EmbedBuilder()
        .setTitle('📋 Comandos Personalizados')
        .setDescription(
            `Comandos disponibles en **${guildName}**:\n\n${commandList}\n\n` +
            `💡 Usa \`*<comando>\` o \`/custom <comando>\` para verlos`
        )
        .setColor(COLORS.INFO)
        .setFooter({ text: `Página ${page + 1}/${totalPages} | Total: ${commands.length} comando${commands.length !== 1 ? 's' : ''}` })
        .setTimestamp();
}

/**
 * Crea el embed para editar comandos (moderadores)
 */
export function createEditCommandEmbed(
    commandName: string,
    values: Record<string, string>,
    currentIndex: number
): EmbedBuilder {
    const entries = Object.entries(values);
    const totalValues = entries.length;

    if (currentIndex >= totalValues) {
        currentIndex = 0;
    }

    const [index, imageUrl] = entries[currentIndex];

    return new EmbedBuilder()
        .setTitle(`✏️ Editando: ${commandName}`)
        .setDescription(
            `**Valor ${currentIndex + 1} de ${totalValues}**\n` +
            `**Índice:** ${index}\n\n` +
            `Usa los botones para navegar y eliminar valores.`
        )
        .setImage(imageUrl)
        .setColor(COLORS.WARNING)
        .setFooter({ text: 'Eliminar un valor no se puede deshacer' })
        .setTimestamp();
}

/**
 * Crea el embed de confirmación para eliminar comando
 */
export function createDeleteConfirmationEmbed(
    commandName: string,
    valueCount: number
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('⚠️ Confirmar Eliminación')
        .setDescription(
            `¿Estás seguro de que quieres eliminar el comando **${commandName}**?\n\n` +
            `Se eliminarán **${valueCount}** imagen${valueCount !== 1 ? 'es' : ''} permanentemente.\n\n` +
            `⚠️ **Esta acción no se puede deshacer.**`
        )
        .setColor(COLORS.DANGER)
        .setTimestamp();
}

/**
 * Crea el embed de confirmación para eliminar un valor
 */
export function createDeleteValueConfirmationEmbed(
    commandName: string,
    index: string,
    remainingValues: number
): EmbedBuilder {
    const willDeleteCommand = remainingValues === 1;

    return new EmbedBuilder()
        .setTitle('⚠️ Confirmar Eliminación de Valor')
        .setDescription(
            `¿Eliminar el valor **#${parseInt(index) + 1}** del comando **${commandName}**?\n\n` +
            (willDeleteCommand
                ? `⚠️ **Este es el único valor restante.**\nSe eliminará el comando completo.`
                : `Quedarán **${remainingValues - 1}** imagen${remainingValues - 1 !== 1 ? 'es' : ''}.`
            )
        )
        .setColor(COLORS.WARNING)
        .setTimestamp();
}

/**
 * Formatea un timestamp relativo
 */
export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `Hace ${days} día${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    return 'Hace un momento';
}
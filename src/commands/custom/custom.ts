import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    MessageFlags,
    ComponentType,
    ButtonInteraction
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError, CommandError, ErrorType } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { BotClient } from '../../types/BotClient.js';
import { Validators } from '../../utils/validators.js';
import { ProposalStatus } from '../../types/CustomCommand.js';
import {
    createProposalSentEmbed,
    createProposalManagementEmbed,
    createCommandListEmbed,
    createEditCommandEmbed,
    createDeleteConfirmationEmbed,
    createDeleteValueConfirmationEmbed
} from '../../utils/customCommandHelpers.js';

export const custom: HybridCommand = {
    type: 'hybrid',
    name: 'custom',
    description: 'Sistema de comandos personalizados del servidor',
    category: CATEGORIES.UTILITY,
    subcommands: [
        { name: 'proponer', aliases: ['propose', 'prop', 'sugerir'], description: 'Proponer un comando personalizado' },
        { name: 'lista', aliases: ['list', 'comandos', 'ver'], description: 'Ver comandos disponibles' },
        { name: 'gestionar', aliases: ['manage', 'revisar', 'propuestas'], description: 'Gestionar propuestas (Mod)' },
        { name: 'editar', aliases: ['edit', 'modificar'], description: 'Editar comando existente (Mod)' },
        { name: 'eliminar', aliases: ['delete', 'borrar', 'remove'], description: 'Eliminar comando (Mod)' },
    ],

    data: new SlashCommandBuilder()
        .setName('custom')
        .setDescription('Sistema de comandos personalizados del servidor')
        .addSubcommand(sub => sub
            .setName('proponer')
            .setDescription('Proponer un nuevo comando personalizado o añadir imagen a uno existente')
            .addStringOption(opt => opt
                .setName('comando')
                .setDescription('Nombre del comando (2-32 caracteres)')
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(32)
            )
            .addStringOption(opt => opt
                .setName('imagen')
                .setDescription('URL de la imagen')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('lista')
            .setDescription('Ver todos los comandos personalizados disponibles')
        )
        .addSubcommand(sub => sub
            .setName('gestionar')
            .setDescription('Gestionar propuestas pendientes (Moderadores)')
        )
        .addSubcommand(sub => sub
            .setName('editar')
            .setDescription('Editar un comando existente (Moderadores)')
            .addStringOption(opt => opt
                .setName('comando')
                .setDescription('Nombre del comando a editar')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('eliminar')
            .setDescription('Eliminar un comando completo (Moderadores)')
            .addStringOption(opt => opt
                .setName('comando')
                .setDescription('Nombre del comando a eliminar')
                .setRequired(true)
            )
        )
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            // Validar que esté en servidor
            Validators.validateInGuild(interaction);

            const subcommand = interaction.options.getSubcommand();

            // Defer según el tipo de comando
            if (['gestionar', 'editar'].includes(subcommand)) {
                // Estos comandos usan componentes interactivos
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            } else {
                await interaction.deferReply();
            }

            switch (subcommand) {
                case 'proponer':
                    await handleProponerSlash(interaction);
                    break;
                case 'lista':
                    await handleListaSlash(interaction);
                    break;
                case 'gestionar':
                    await handleGestionarSlash(interaction);
                    break;
                case 'editar':
                    await handleEditarSlash(interaction);
                    break;
                case 'eliminar':
                    await handleEliminarSlash(interaction);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'custom');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            Validators.validateInGuild(message);

            const subcommand = args[0]?.toLowerCase();

            if (!subcommand) {
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}custom <subcomando>\`\n\n` +
                    `**Para todos:**\n` +
                    `• \`proponer\` (\`prop\`, \`sugerir\`) - Proponer comando\n` +
                    `• \`lista\` (\`comandos\`, \`ver\`) - Ver comandos disponibles\n\n` +
                    `**Para moderadores:**\n` +
                    `• \`gestionar\` (\`revisar\`, \`propuestas\`) - Gestionar propuestas\n` +
                    `• \`editar\` (\`modificar\`) - Editar comando\n` +
                    `• \`eliminar\` (\`borrar\`) - Eliminar comando`
                );
                return;
            }

            switch (subcommand) {
                case 'proponer':
                case 'prop':
                case 'sugerir':
                    await handleProponerPrefix(message, args.slice(1));
                    break;
                case 'lista':
                case 'list':
                case 'comandos':
                case 'ver':
                    await handleListaPrefix(message);
                    break;
                case 'gestionar':
                case 'manage':
                case 'revisar':
                case 'propuestas':
                    await handleGestionarPrefix(message);
                    break;
                case 'editar':
                case 'edit':
                case 'modificar':
                    await handleEditarPrefix(message, args.slice(1));
                    break;
                case 'eliminar':
                case 'delete':
                case 'borrar':
                case 'remove':
                    await handleEliminarPrefix(message, args.slice(1));
                    break;
                default:
                    await message.reply(`❌ Subcomando no válido: **${subcommand}**`);
            }
        } catch (error) {
            await handleCommandError(error, message, 'custom');
        }
    },
};

// ==================== HANDLERS: PROPONER ====================

async function handleProponerSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandName = interaction.options.getString('comando', true).toLowerCase();
    const imageUrl = interaction.options.getString('imagen', true);

    const customManager = (interaction.client as BotClient).customCommandManager;

    if (!customManager) {
        await interaction.editReply({
            content: '❌ El sistema de comandos personalizados no está disponible.'
        });
        return;
    }

    try {
        const proposal = await customManager.createProposal(
            interaction.guild!.id,
            commandName,
            imageUrl,
            interaction.user
        );

        const embed = createProposalSentEmbed(commandName, imageUrl, proposal.id);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        if (error instanceof Error) {
            throw new CommandError(
                ErrorType.VALIDATION_ERROR,
                error.message,
                `❌ ${error.message}`
            );
        }
        throw error;
    }
}

async function handleProponerPrefix(message: Message, args: string[]): Promise<void> {
    if (args.length < 2) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}proponer <comando> <imagen_url>\`\n\n` +
            `**Ejemplo:** \`${config.prefix}prop gatito https://i.imgur.com/abc.png\``
        );
        return;
    }

    const commandName = args[0].toLowerCase();
    const imageUrl = args[1];

    const customManager = (message.client as BotClient).customCommandManager;

    if (!customManager) {
        await message.reply('❌ El sistema de comandos personalizados no está disponible.');
        return;
    }

    try {
        const proposal = await customManager.createProposal(
            message.guild!.id,
            commandName,
            imageUrl,
            message.author
        );

        const embed = createProposalSentEmbed(commandName, imageUrl, proposal.id);
        await message.reply({ embeds: [embed] });
    } catch (error) {
        if (error instanceof Error) {
            await message.reply(`❌ ${error.message}`);
        }
    }
}

// ==================== HANDLERS: LISTA ====================

async function handleListaSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    const customManager = (interaction.client as BotClient).customCommandManager;

    if (!customManager) {
        await interaction.editReply({
            content: '❌ El sistema de comandos personalizados no está disponible.'
        });
        return;
    }

    const commands = await customManager.getCommands(interaction.guild!.id);
    const embed = createCommandListEmbed(commands, interaction.guild!.name);

    await interaction.editReply({ embeds: [embed] });
}

async function handleListaPrefix(message: Message): Promise<void> {
    const customManager = (message.client as BotClient).customCommandManager;

    if (!customManager) {
        await message.reply('❌ El sistema de comandos personalizados no está disponible.');
        return;
    }

    const commands = await customManager.getCommands(message.guild!.id);
    const embed = createCommandListEmbed(commands, message.guild!.name);

    await message.reply({ embeds: [embed] });
}

// ==================== HANDLERS: GESTIONAR ====================

async function handleGestionarSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    // Validar permisos
    Validators.validateUserPermissions(
        interaction.member as any,
        [PermissionFlagsBits.ManageMessages],
        ['Gestionar Mensajes']
    );

    const customManager = (interaction.client as BotClient).customCommandManager;

    if (!customManager) {
        await interaction.editReply({
            content: '❌ El sistema de comandos personalizados no está disponible.'
        });
        return;
    }

    const proposals = await customManager.getProposals(
        interaction.guild!.id,
        ProposalStatus.PENDING
    );

    if (proposals.length === 0) {
        await interaction.editReply({
            content: '📭 No hay propuestas pendientes en este momento.'
        });
        return;
    }

    // Iniciar navegación
    await showProposalNavigation(interaction, proposals, 0, customManager);
}

async function handleGestionarPrefix(message: Message): Promise<void> {
    // Validar permisos
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply('❌ Necesitas permisos de **Gestionar Mensajes** para usar este comando.');
        return;
    }

    const customManager = (message.client as BotClient).customCommandManager;

    if (!customManager) {
        await message.reply('❌ El sistema de comandos personalizados no está disponible.');
        return;
    }

    const proposals = await customManager.getProposals(
        message.guild!.id,
        ProposalStatus.PENDING
    );

    if (proposals.length === 0) {
        await message.reply('📭 No hay propuestas pendientes en este momento.');
        return;
    }

    // Enviar mensaje y iniciar navegación
    const reply = await message.reply('🔄 Cargando propuestas...');
    await showProposalNavigationPrefix(reply, proposals, 0, customManager);
}

async function showProposalNavigation(
    interaction: ChatInputCommandInteraction,
    proposals: any[],
    currentIndex: number,
    customManager: any
): Promise<void> {
    const proposal = proposals[currentIndex];
    const isNewCommand = !(await customManager.commandExists(interaction.guild!.id, proposal.commandName));

    const embed = createProposalManagementEmbed(
        proposal,
        currentIndex,
        proposals.length,
        isNewCommand
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('proposal_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('proposal_accept')
                .setLabel('Aceptar')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('proposal_reject')
                .setLabel('Rechazar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('proposal_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === proposals.length - 1)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [buttons]
    });

    // Collector de botones
    const collector = (await interaction.fetchReply()).createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000 // 10 minutos
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        // Verificar que sea el mismo usuario
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador que abrió el menú puede usarlo.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        try {
            if (buttonInteraction.customId === 'proposal_prev') {
                await showProposalNavigation(interaction, proposals, currentIndex - 1, customManager);
            } else if (buttonInteraction.customId === 'proposal_next') {
                await showProposalNavigation(interaction, proposals, currentIndex + 1, customManager);
            } else if (buttonInteraction.customId === 'proposal_accept') {
                await processProposalAction(interaction, proposal, true, customManager, proposals);
            } else if (buttonInteraction.customId === 'proposal_reject') {
                await processProposalAction(interaction, proposal, false, customManager, proposals);
            }
        } catch (error) {
            console.error('Error en collector:', error);
        }
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [] });
        } catch {
            // Ignorar si el mensaje fue eliminado
        }
    });
}

async function processProposalAction(
    interaction: ChatInputCommandInteraction,
    proposal: any,
    accept: boolean,
    customManager: any,
    allProposals: any[]
): Promise<void> {
    try {
        await customManager.processProposal(
            interaction.guild!.id,
            proposal.id,
            accept,
            interaction.user
        );

        // Notificar al usuario
        await customManager.notifyUser(
            proposal.authorId,
            interaction.guild!,
            proposal,
            accept,
            interaction.channel as any
        );

        // Actualizar lista
        const remainingProposals = allProposals.filter(p => p.id !== proposal.id);

        if (remainingProposals.length === 0) {
            const resultEmbed = new EmbedBuilder()
                .setTitle(accept ? '✅ Propuesta Aceptada' : '❌ Propuesta Rechazada')
                .setDescription(
                    `**Comando:** ${proposal.commandName}\n` +
                    `**Autor:** ${proposal.authorTag}\n\n` +
                    `No hay más propuestas pendientes.`
                )
                .setColor(accept ? COLORS.SUCCESS : COLORS.DANGER)
                .setTimestamp();

            await interaction.editReply({
                embeds: [resultEmbed],
                components: []
            });
        } else {
            // Mostrar siguiente propuesta
            const nextIndex = Math.min(0, remainingProposals.length - 1);
            await showProposalNavigation(interaction, remainingProposals, nextIndex, customManager);
        }
    } catch (error) {
        throw new CommandError(
            ErrorType.UNKNOWN,
            'Error procesando propuesta',
            '❌ No se pudo procesar la propuesta. Intenta de nuevo.'
        );
    }
}

async function showProposalNavigationPrefix(
    message: Message,
    proposals: any[],
    currentIndex: number,
    customManager: any
): Promise<void> {
    const proposal = proposals[currentIndex];
    const isNewCommand = !(await customManager.commandExists(message.guild!.id, proposal.commandName));

    const embed = createProposalManagementEmbed(
        proposal,
        currentIndex,
        proposals.length,
        isNewCommand
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('proposal_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('proposal_accept')
                .setLabel('Aceptar')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('proposal_reject')
                .setLabel('Rechazar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('proposal_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === proposals.length - 1)
        );

    await message.edit({
        content: null,
        embeds: [embed],
        components: [buttons]
    });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== message.author.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador que abrió el menú puede usarlo.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        try {
            if (buttonInteraction.customId === 'proposal_prev') {
                await showProposalNavigationPrefix(message, proposals, currentIndex - 1, customManager);
            } else if (buttonInteraction.customId === 'proposal_next') {
                await showProposalNavigationPrefix(message, proposals, currentIndex + 1, customManager);
            } else if (buttonInteraction.customId === 'proposal_accept') {
                await processProposalActionPrefix(message, proposal, true, customManager, proposals);
            } else if (buttonInteraction.customId === 'proposal_reject') {
                await processProposalActionPrefix(message, proposal, false, customManager, proposals);
            }
        } catch (error) {
            console.error('Error en collector:', error);
        }
    });

    collector.on('end', async () => {
        try {
            await message.edit({ components: [] });
        } catch {
            // Ignorar
        }
    });
}

async function processProposalActionPrefix(
    message: Message,
    proposal: any,
    accept: boolean,
    customManager: any,
    allProposals: any[]
): Promise<void> {
    try {
        await customManager.processProposal(
            message.guild!.id,
            proposal.id,
            accept,
            message.author
        );

        await customManager.notifyUser(
            proposal.authorId,
            message.guild!,
            proposal,
            accept,
            message.channel as any
        );

        const remainingProposals = allProposals.filter(p => p.id !== proposal.id);

        if (remainingProposals.length === 0) {
            const resultEmbed = new EmbedBuilder()
                .setTitle(accept ? '✅ Propuesta Aceptada' : '❌ Propuesta Rechazada')
                .setDescription(
                    `**Comando:** ${proposal.commandName}\n` +
                    `**Autor:** ${proposal.authorTag}\n\n` +
                    `No hay más propuestas pendientes.`
                )
                .setColor(accept ? COLORS.SUCCESS : COLORS.DANGER)
                .setTimestamp();

            await message.edit({
                embeds: [resultEmbed],
                components: []
            });
        } else {
            const nextIndex = Math.min(0, remainingProposals.length - 1);
            await showProposalNavigationPrefix(message, remainingProposals, nextIndex, customManager);
        }
    } catch (error) {
        await message.reply('❌ No se pudo procesar la propuesta. Intenta de nuevo.');
    }
}

// ==================== HANDLERS: EDITAR ====================

async function handleEditarSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    Validators.validateUserPermissions(
        interaction.member as any,
        [PermissionFlagsBits.ManageMessages],
        ['Gestionar Mensajes']
    );

    const commandName = interaction.options.getString('comando', true).toLowerCase();
    const customManager = (interaction.client as BotClient).customCommandManager;

    if (!customManager) {
        await interaction.editReply({
            content: '❌ El sistema de comandos personalizados no está disponible.'
        });
        return;
    }

    const values = await customManager.getCommandValues(interaction.guild!.id, commandName);

    if (!values || Object.keys(values).length === 0) {
        await interaction.editReply({
            content: `❌ El comando **${commandName}** no existe o no tiene valores.`
        });
        return;
    }

    await showEditNavigation(interaction, commandName, values, 0, customManager);
}

async function handleEditarPrefix(message: Message, args: string[]): Promise<void> {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply('❌ Necesitas permisos de **Gestionar Mensajes** para usar este comando.');
        return;
    }

    if (args.length === 0) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}editar <comando>\`\n\n` +
            `**Ejemplo:** \`${config.prefix}editar gatito\``
        );
        return;
    }

    const commandName = args[0].toLowerCase();
    const customManager = (message.client as BotClient).customCommandManager;

    if (!customManager) {
        await message.reply('❌ El sistema de comandos personalizados no está disponible.');
        return;
    }

    const values = await customManager.getCommandValues(message.guild!.id, commandName);

    if (!values || Object.keys(values).length === 0) {
        await message.reply(`❌ El comando **${commandName}** no existe o no tiene valores.`);
        return;
    }

    const reply = await message.reply('🔄 Cargando editor...');
    await showEditNavigationPrefix(reply, commandName, values, 0, customManager);
}

async function showEditNavigation(
    interaction: ChatInputCommandInteraction,
    commandName: string,
    values: Record<string, string>,
    currentIndex: number,
    customManager: any
): Promise<void> {
    const entries = Object.entries(values);

    if (currentIndex >= entries.length) {
        currentIndex = 0;
    }

    const embed = createEditCommandEmbed(commandName, values, currentIndex);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('edit_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('edit_delete')
                .setLabel('Eliminar Valor')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('edit_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === entries.length - 1),
            new ButtonBuilder()
                .setCustomId('edit_exit')
                .setLabel('Salir')
                .setEmoji('🚪')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [buttons]
    });

    const collector = (await interaction.fetchReply()).createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador que abrió el editor puede usarlo.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        try {
            if (buttonInteraction.customId === 'edit_prev') {
                await showEditNavigation(interaction, commandName, values, currentIndex - 1, customManager);
            } else if (buttonInteraction.customId === 'edit_next') {
                await showEditNavigation(interaction, commandName, values, currentIndex + 1, customManager);
            } else if (buttonInteraction.customId === 'edit_delete') {
                await confirmDeleteValue(interaction, commandName, entries[currentIndex][0], values, customManager);
            } else if (buttonInteraction.customId === 'edit_exit') {
                const exitEmbed = new EmbedBuilder()
                    .setDescription('✅ Editor cerrado.')
                    .setColor(COLORS.SUCCESS);
                await interaction.editReply({ embeds: [exitEmbed], components: [] });
            }
        } catch (error) {
            console.error('Error en editor:', error);
        }
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [] });
        } catch {
            // Ignorar
        }
    });
}

async function confirmDeleteValue(
    interaction: ChatInputCommandInteraction,
    commandName: string,
    index: string,
    allValues: Record<string, string>,
    customManager: any
): Promise<void> {
    const remainingCount = Object.keys(allValues).length;
    const confirmEmbed = createDeleteValueConfirmationEmbed(commandName, index, remainingCount);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_delete_value')
                .setLabel('Confirmar')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_delete_value')
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [confirmEmbed],
        components: [buttons]
    });

    const collector = (await interaction.fetchReply()).createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador que abrió el editor puede confirmar.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId === 'confirm_delete_value') {
            const success = await customManager.deleteCommandValue(
                interaction.guild!.id,
                commandName,
                index
            );

            if (success) {
                const successEmbed = new EmbedBuilder()
                    .setDescription(`✅ Valor eliminado del comando **${commandName}**.`)
                    .setColor(COLORS.SUCCESS);

                await interaction.editReply({ embeds: [successEmbed], components: [] });
            } else {
                await interaction.editReply({
                    content: '❌ No se pudo eliminar el valor.',
                    embeds: [],
                    components: []
                });
            }
        } else {
            // Volver al editor
            const updatedValues = await customManager.getCommandValues(interaction.guild!.id, commandName);
            if (updatedValues) {
                await showEditNavigation(interaction, commandName, updatedValues, 0, customManager);
            }
        }
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [] });
        } catch {
            // Ignorar
        }
    });
}

async function showEditNavigationPrefix(
    message: Message,
    commandName: string,
    values: Record<string, string>,
    currentIndex: number,
    customManager: any
): Promise<void> {
    // Implementación similar a showEditNavigation pero para prefix
    // (código casi idéntico, solo cambia message por interaction)
    const entries = Object.entries(values);

    if (currentIndex >= entries.length) {
        currentIndex = 0;
    }

    const embed = createEditCommandEmbed(commandName, values, currentIndex);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('edit_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('edit_delete')
                .setLabel('Eliminar Valor')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('edit_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentIndex === entries.length - 1),
            new ButtonBuilder()
                .setCustomId('edit_exit')
                .setLabel('Salir')
                .setEmoji('🚪')
                .setStyle(ButtonStyle.Secondary)
        );

    await message.edit({
        content: null,
        embeds: [embed],
        components: [buttons]
    });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== message.author.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador que abrió el editor puede usarlo.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        try {
            if (buttonInteraction.customId === 'edit_prev') {
                await showEditNavigationPrefix(message, commandName, values, currentIndex - 1, customManager);
            } else if (buttonInteraction.customId === 'edit_next') {
                await showEditNavigationPrefix(message, commandName, values, currentIndex + 1, customManager);
            } else if (buttonInteraction.customId === 'edit_delete') {
                // Similar confirmación
                const success = await customManager.deleteCommandValue(
                    message.guild!.id,
                    commandName,
                    entries[currentIndex][0]
                );

                if (success) {
                    await message.edit({
                        content: `✅ Valor eliminado del comando **${commandName}**.`,
                        embeds: [],
                        components: []
                    });
                }
            } else if (buttonInteraction.customId === 'edit_exit') {
                await message.edit({
                    content: '✅ Editor cerrado.',
                    embeds: [],
                    components: []
                });
            }
        } catch (error) {
            console.error('Error en editor:', error);
        }
    });

    collector.on('end', async () => {
        try {
            await message.edit({ components: [] });
        } catch {
            // Ignorar
        }
    });
}

// ==================== HANDLERS: ELIMINAR ====================

async function handleEliminarSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    Validators.validateUserPermissions(
        interaction.member as any,
        [PermissionFlagsBits.ManageMessages],
        ['Gestionar Mensajes']
    );

    const commandName = interaction.options.getString('comando', true).toLowerCase();
    const customManager = (interaction.client as BotClient).customCommandManager;

    if (!customManager) {
        await interaction.editReply({
            content: '❌ El sistema de comandos personalizados no está disponible.'
        });
        return;
    }

    const info = await customManager.getCommandInfo(interaction.guild!.id, commandName);

    if (!info.exists) {
        await interaction.editReply({
            content: `❌ El comando **${commandName}** no existe.`
        });
        return;
    }

    const confirmEmbed = createDeleteConfirmationEmbed(commandName, info.count);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_delete_command')
                .setLabel('Confirmar Eliminación')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_delete_command')
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [confirmEmbed],
        components: [buttons]
    });

    const collector = (await interaction.fetchReply()).createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador puede confirmar la eliminación.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId === 'confirm_delete_command') {
            const success = await customManager.deleteCommand(interaction.guild!.id, commandName);

            if (success) {
                const successEmbed = new EmbedBuilder()
                    .setDescription(`✅ Comando **${commandName}** eliminado completamente.`)
                    .setColor(COLORS.SUCCESS);

                await interaction.editReply({ embeds: [successEmbed], components: [] });
            } else {
                await interaction.editReply({
                    content: '❌ No se pudo eliminar el comando.',
                    embeds: [],
                    components: []
                });
            }
        } else {
            const cancelEmbed = new EmbedBuilder()
                .setDescription('❌ Eliminación cancelada.')
                .setColor(COLORS.INFO);

            await interaction.editReply({ embeds: [cancelEmbed], components: [] });
        }
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [] });
        } catch {
            // Ignorar
        }
    });
}

async function handleEliminarPrefix(message: Message, args: string[]): Promise<void> {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply('❌ Necesitas permisos de **Gestionar Mensajes** para usar este comando.');
        return;
    }

    if (args.length === 0) {
        await message.reply(
            `❌ **Uso:** \`${config.prefix}eliminar <comando>\`\n\n` +
            `**Ejemplo:** \`${config.prefix}eliminar gatito\``
        );
        return;
    }

    const commandName = args[0].toLowerCase();
    const customManager = (message.client as BotClient).customCommandManager;

    if (!customManager) {
        await message.reply('❌ El sistema de comandos personalizados no está disponible.');
        return;
    }

    const info = await customManager.getCommandInfo(message.guild!.id, commandName);

    if (!info.exists) {
        await message.reply(`❌ El comando **${commandName}** no existe.`);
        return;
    }

    const confirmEmbed = createDeleteConfirmationEmbed(commandName, info.count);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_delete_command')
                .setLabel('Confirmar Eliminación')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_delete_command')
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

    const reply = await message.reply({
        embeds: [confirmEmbed],
        components: [buttons]
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== message.author.id) {
            await buttonInteraction.reply({
                content: '❌ Solo el moderador puede confirmar la eliminación.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId === 'confirm_delete_command') {
            const success = await customManager.deleteCommand(message.guild!.id, commandName);

            if (success) {
                await reply.edit({
                    content: `✅ Comando **${commandName}** eliminado completamente.`,
                    embeds: [],
                    components: []
                });
            } else {
                await reply.edit({
                    content: '❌ No se pudo eliminar el comando.',
                    embeds: [],
                    components: []
                });
            }
        } else {
            await reply.edit({
                content: '❌ Eliminación cancelada.',
                embeds: [],
                components: []
            });
        }
    });

    collector.on('end', async () => {
        try {
            await reply.edit({ components: [] });
        } catch {
            // Ignorar
        }
    });
}
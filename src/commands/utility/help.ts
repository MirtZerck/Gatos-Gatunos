import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    AutocompleteInteraction,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle
} from 'discord.js';
import { UnifiedCommand, Command } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { config } from '../../config.js';
import { sendMessage, createErrorEmbed } from '../../utils/messageUtils.js';

export const help: UnifiedCommand & {
    handleAutocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    handleSelectMenu?: (interaction: StringSelectMenuInteraction) => Promise<void>;
    handleButton?: (interaction: ButtonInteraction) => Promise<void>;
} = {
    type: 'unified',
    name: 'help',
    description: 'Muestra información sobre los comandos disponibles',
    category: CATEGORIES.UTILITY,
    aliases: ['ayuda', 'comandos', 'commands'],

    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra información sobre los comandos disponibles')
        .addStringOption(option =>
            option
                .setName('comando')
                .setDescription('Nombre del comando para ver detalles específicos')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async execute(source: ChatInputCommandInteraction | Message, args?: string[]) {
        try {
            const client = source.client as BotClient;

            let commandName: string | null = null;

            if (source instanceof Message) {
                commandName = args?.[0]?.toLowerCase() || null;
            } else {
                commandName = source.options.getString('comando') || null;
            }

            if (commandName) {
                await showCommandDetails(source, client, commandName);
            } else {
                await showCategoryMenu(source, client);
            }
        } catch (error) {
            await handleCommandError(error, source, 'help');
        }
    },

    async handleAutocomplete(interaction: AutocompleteInteraction) {
        const client = interaction.client as BotClient;
        const focusedValue = interaction.options.getFocused().toLowerCase();

        const commands: { name: string; description: string }[] = [];
        const processedCommands = new Set<string>();

        for (const [name, command] of client.commands) {
            if (command.category === CATEGORIES.DEVELOPER) continue;
            if (processedCommands.has(name)) continue;

            const mainCommandName = command.name;
            if (!processedCommands.has(mainCommandName)) {
                commands.push({
                    name: mainCommandName,
                    description: command.description
                });
                processedCommands.add(mainCommandName);
            }
        }

        const filtered = commands
            .filter(cmd =>
                cmd.name.toLowerCase().includes(focusedValue) ||
                cmd.description.toLowerCase().includes(focusedValue)
            )
            .slice(0, 25)
            .map(cmd => ({
                name: `${cmd.name} - ${cmd.description.substring(0, 80)}`,
                value: cmd.name
            }));

        await interaction.respond(filtered);
    },

    async handleSelectMenu(interaction: StringSelectMenuInteraction) {
        const client = interaction.client as BotClient;
        const [commandId, action, userId] = interaction.customId.split(':');

        if (commandId !== 'help') return;

        if (userId && userId !== interaction.user.id) {
            const embed = createErrorEmbed(
                '🚫 Acceso Denegado',
                'No puedes interactuar con el menú de ayuda de otra persona.\n\nUsa `/help` para obtener tu propio menú.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const selectedCategory = interaction.values[0];

        if (selectedCategory === 'home') {
            await interaction.update(await buildCategoryMenuMessage(client, userId));
        } else {
            await interaction.update(await buildCategoryDetailsMessage(client, selectedCategory, 0, userId));
        }
    },

    async handleButton(interaction: ButtonInteraction) {
        const client = interaction.client as BotClient;
        const parts = interaction.customId.split(':');
        const [commandId, action, userId] = parts;

        if (commandId !== 'help') return;

        if (userId && userId !== interaction.user.id) {
            const embed = createErrorEmbed(
                '🚫 Acceso Denegado',
                'No puedes interactuar con el menú de ayuda de otra persona.\n\nUsa `/help` para obtener tu propio menú.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        if (action === 'close') {
            await interaction.message.delete();
        } else if (action === 'home') {
            await interaction.update(await buildCategoryMenuMessage(client, userId));
        } else if (action === 'page') {
            const category = parts[3];
            const page = parseInt(parts[4]) || 0;
            await interaction.update(await buildCategoryDetailsMessage(client, category, page, userId));
        }
    },
};

/**
 * Muestra el menú principal con las categorías disponibles
 */
async function showCategoryMenu(
    source: ChatInputCommandInteraction | Message,
    client: BotClient
): Promise<void> {
    const userId = source instanceof Message ? source.author.id : source.user.id;
    const message = await buildCategoryMenuMessage(client, userId);
    await source.reply(message);
}

/**
 * Construye el mensaje del menú de categorías
 */
async function buildCategoryMenuMessage(client: BotClient, userId?: string) {
    const categories = getCategoriesWithCommands(client);

    const categoryEmojis: Record<string, string> = {
        [CATEGORIES.INTERACTION]: '💝',
        [CATEGORIES.MODERATION]: '🛡️',
        [CATEGORIES.MUSIC]: '🎵',
        [CATEGORIES.UTILITY]: '🔧',
        [CATEGORIES.FUN]: '🎮',
        [CATEGORIES.INFORMATION]: 'ℹ️',
        [CATEGORIES.CONFIGURATION]: '⚙️',
    };

    const embed = new EmbedBuilder()
        .setTitle('📚 Sistema de Ayuda')
        .setDescription(
            '¡Bienvenido al sistema de ayuda de Hitori Gotoh!\n\n' +
            '**Selecciona una categoría** del menú desplegable para ver sus comandos.\n\n' +
            '**Otras opciones:**\n' +
            `• Usa \`/help comando:<nombre>\` para ver detalles de un comando\n` +
            `• Usa \`${config.prefix}help <comando>\` con prefijo\n\n` +
            `**Prefijo del bot:** \`${config.prefix}\``
        )
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: `${categories.size} categorías disponibles` });

    const categoryDescriptions: string[] = [];
    for (const [category, commands] of Array.from(categories.entries()).sort()) {
        const emoji = categoryEmojis[category] || '📁';
        categoryDescriptions.push(
            `${emoji} **${category}** • ${commands.size} comando${commands.size !== 1 ? 's' : ''}`
        );
    }

    embed.addFields({
        name: '📂 Categorías Disponibles',
        value: categoryDescriptions.join('\n'),
        inline: false
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`help:category:${userId || ''}`)
        .setPlaceholder('🔍 Selecciona una categoría para explorar')
        .setMinValues(1)
        .setMaxValues(1);

    for (const [category] of Array.from(categories.entries()).sort()) {
        const emoji = categoryEmojis[category] || '📁';
        const commandCount = categories.get(category)!.size;

        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(category)
                .setDescription(`${commandCount} comando${commandCount !== 1 ? 's' : ''} disponible${commandCount !== 1 ? 's' : ''}`)
                .setValue(category)
                .setEmoji(emoji)
        );
    }

    // Botón de cerrar
    const closeButton = new ButtonBuilder()
        .setCustomId(`help:close:${userId || ''}:`)
        .setLabel('Cerrar')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(closeButton);

    return {
        embeds: [embed],
        components: [selectRow, buttonRow]
    };
}

/**
 * Construye el mensaje de detalles de una categoría con paginación
 */
async function buildCategoryDetailsMessage(client: BotClient, category: string, page: number = 0, userId?: string) {
    const categories = getCategoriesWithCommands(client);
    const commands = categories.get(category);

    if (!commands || commands.size === 0) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Categoría no encontrada')
            .setDescription('No se encontró la categoría seleccionada.')
            .setColor(COLORS.DANGER);

        return { embeds: [embed], components: [] };
    }

    const categoryEmojis: Record<string, string> = {
        [CATEGORIES.INTERACTION]: '💝',
        [CATEGORIES.MODERATION]: '🛡️',
        [CATEGORIES.MUSIC]: '🎵',
        [CATEGORIES.UTILITY]: '🔧',
        [CATEGORIES.FUN]: '🎮',
        [CATEGORIES.INFORMATION]: 'ℹ️',
        [CATEGORIES.CONFIGURATION]: '⚙️',
    };

    const emoji = categoryEmojis[category] || '📁';

    // Generar lista completa de comandos
    const commandList: string[] = [];
    for (const [name, command] of Array.from(commands.entries()).sort()) {
        const typeIcons: Record<string, string> = {
            'slash-only': '⚡',
            'prefix-only': '💬',
            'hybrid': '🔀',
            'unified': '🔗'
        };

        const icon = typeIcons[command.type] || '❓';
        const aliases = command.type !== 'slash-only' && 'aliases' in command && command.aliases && command.aliases.length > 0
            ? ` (\`${command.aliases[0]}\`)`
            : '';

        commandList.push(`${icon} **${name}**${aliases}\n└ ${command.description}`);
    }

    // Configurar paginación
    const commandsPerPage = 6;
    const totalPages = Math.ceil(commandList.length / commandsPerPage);
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));

    const startIndex = currentPage * commandsPerPage;
    const endIndex = startIndex + commandsPerPage;
    const pageCommands = commandList.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setTitle(`${emoji} ${category}`)
        .setDescription(
            `Comandos disponibles en la categoría **${category}**.\n` +
            `Usa \`/help comando:<nombre>\` para ver detalles de un comando específico.`
        )
        .setColor(getCategoryColor(category))
        .setTimestamp()
        .setFooter({
            text: totalPages > 1
                ? `Página ${currentPage + 1}/${totalPages} • ${commands.size} comando${commands.size !== 1 ? 's' : ''} total${commands.size !== 1 ? 'es' : ''}`
                : `${commands.size} comando${commands.size !== 1 ? 's' : ''} en esta categoría`
        });

    embed.addFields({
        name: 'Comandos',
        value: pageCommands.join('\n\n'),
        inline: false
    });

    // Crear componentes
    const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

    // Botones de navegación y control
    const buttonRow = new ActionRowBuilder<ButtonBuilder>();

    // Botones de navegación (solo si hay múltiples páginas)
    if (totalPages > 1) {
        // Botón anterior
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`help:page:${userId || ''}:${category}:${currentPage - 1}`)
                .setLabel('◀ Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0)
        );

        // Botón de inicio
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`help:home:${userId || ''}::0`)
                .setLabel('🏠 Inicio')
                .setStyle(ButtonStyle.Secondary)
        );

        // Botón siguiente
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`help:page:${userId || ''}:${category}:${currentPage + 1}`)
                .setLabel('Siguiente ▶')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages - 1)
        );
    } else {
        // Si no hay paginación, solo mostrar botón de inicio
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`help:home:${userId || ''}::0`)
                .setLabel('🏠 Inicio')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    // Botón de cerrar (siempre disponible)
    buttonRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`help:close:${userId || ''}::`)
            .setLabel('Cerrar')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
    );

    components.push(buttonRow);

    // Select menu para cambiar de categoría
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`help:category:${userId || ''}`)
        .setPlaceholder('🔍 Cambiar de categoría o volver al inicio')
        .setMinValues(1)
        .setMaxValues(1);

    selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('🏠 Volver al inicio')
            .setDescription('Regresar al menú principal')
            .setValue('home')
            .setEmoji('🏠')
    );

    const allCategories = getCategoriesWithCommands(client);
    for (const [cat] of Array.from(allCategories.entries()).sort()) {
        const catEmoji = categoryEmojis[cat] || '📁';
        const commandCount = allCategories.get(cat)!.size;

        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(cat)
                .setDescription(`${commandCount} comando${commandCount !== 1 ? 's' : ''}`)
                .setValue(cat)
                .setEmoji(catEmoji)
                .setDefault(cat === category)
        );
    }

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

    components.push(selectRow);

    return {
        embeds: [embed],
        components: components
    };
}

/**
 * Obtiene las categorías con sus comandos (excluyendo dev)
 */
function getCategoriesWithCommands(client: BotClient): Map<string, Map<string, Command>> {
    const categories = new Map<string, Map<string, Command>>();
    const processedCommands = new Set<string>();

    for (const [name, command] of client.commands) {
        if (command.category === CATEGORIES.DEVELOPER) continue;

        const mainCommandName = command.name;
        if (processedCommands.has(mainCommandName)) continue;

        const category = command.category || 'Sin categoría';
        if (!categories.has(category)) {
            categories.set(category, new Map());
        }

        categories.get(category)!.set(mainCommandName, command);
        processedCommands.add(mainCommandName);

        if (command.type !== 'slash-only' && 'aliases' in command && command.aliases) {
            command.aliases.forEach(alias => processedCommands.add(alias));
        }

        if ('subcommands' in command && command.subcommands) {
            command.subcommands.forEach(sub => {
                sub.aliases?.forEach(alias => processedCommands.add(alias));
            });
        }
    }

    return categories;
}

/**
 * Muestra información detallada de un comando específico
 */
async function showCommandDetails(
    source: ChatInputCommandInteraction | Message,
    client: BotClient,
    commandName: string
): Promise<void> {
    const command = client.commands.get(commandName);

    if (!command) {
        const embed = createErrorEmbed(
            '🔍 Comando No Encontrado',
            `No se encontró el comando **${commandName}**.\n\nUsa \`${config.prefix}help\` o \`/help\` para ver todos los comandos disponibles.`
        );

        await sendMessage(source, { embed, ephemeral: true });
        return;
    }

    if (command.category === CATEGORIES.DEVELOPER) {
        const embed = createErrorEmbed(
            '🔒 Comando No Disponible',
            `El comando **${commandName}** no está disponible.`
        );

        await sendMessage(source, { embed, ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`📖 ${command.name}`)
        .setDescription(command.description)
        .setColor(getCategoryColor(command.category))
        .setTimestamp();

    const typeLabels = {
        'slash-only': '⚡ Solo slash commands',
        'prefix-only': '💬 Solo comandos con prefijo',
        'hybrid': '🔀 Slash y prefijo (separados)',
        'unified': '🔗 Slash y prefijo (unificados)'
    };

    embed.addFields({
        name: '📌 Tipo',
        value: typeLabels[command.type],
        inline: true
    });

    if (command.category) {
        embed.addFields({
            name: '📂 Categoría',
            value: command.category,
            inline: true
        });
    }

    if (command.type !== 'slash-only' && 'aliases' in command && command.aliases && command.aliases.length > 0) {
        embed.addFields({
            name: '🔀 Aliases',
            value: command.aliases.map(a => `\`${a}\``).join(', '),
            inline: false
        });
    }

    if ('subcommands' in command && command.subcommands && command.subcommands.length > 0) {
        const subcommandList = command.subcommands.map(sub => {
            const aliases = sub.aliases && sub.aliases.length > 0
                ? ` • Aliases: ${sub.aliases.map(a => `\`${a}\``).join(', ')}`
                : '';
            return `**${sub.name}**\n└ ${sub.description}${aliases}`;
        }).join('\n\n');

        embed.addFields({
            name: '📝 Subcomandos',
            value: subcommandList,
            inline: false
        });
    }

    let usageExamples = '';

    if (command.type !== 'prefix-only') {
        usageExamples += `**Slash Command:**\n\`/${command.name}\`\n\n`;
    }

    if (command.type !== 'slash-only') {
        usageExamples += `**Con Prefijo:**\n\`${config.prefix}${command.name}\``;

        if ('aliases' in command && command.aliases && command.aliases.length > 0) {
            usageExamples += `\n\`${config.prefix}${command.aliases[0]}\``;
        }
    }

    if (usageExamples) {
        embed.addFields({
            name: '💡 Ejemplos de Uso',
            value: usageExamples,
            inline: false
        });
    }

    await sendMessage(source, { embed });
}

/**
 * Obtiene el color del embed según la categoría del comando
 */
function getCategoryColor(category?: string): number {
    const categoryColors: Record<string, number> = {
        [CATEGORIES.INTERACTION]: COLORS.INTERACTION,
        [CATEGORIES.MODERATION]: COLORS.MODERATION,
        [CATEGORIES.MUSIC]: COLORS.MUSIC,
        [CATEGORIES.UTILITY]: COLORS.INFO,
        [CATEGORIES.FUN]: COLORS.SUCCESS,
        [CATEGORIES.INFORMATION]: COLORS.INFO,
        [CATEGORIES.CONFIGURATION]: COLORS.WARNING,
    };

    return category ? (categoryColors[category] || COLORS.PRIMARY) : COLORS.PRIMARY;
}

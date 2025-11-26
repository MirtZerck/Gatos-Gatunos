import { Message, EmbedBuilder, User } from 'discord.js';
import { PrefixOnlyCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { BotClient } from '../../types/BotClient.js';
import { config } from '../../config.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';
import { AnsiFormatter, ANSI } from '../../utils/ansiFormatter.js';
import { isDevFormatMessage } from '../../events/messageCreate.js';
import type { AIManager } from '../../ai/core/AIManager.js';
import type { UserMemoryData, SessionData } from '../../ai/core/types.js';

export const dev: PrefixOnlyCommand = {
    type: 'prefix-only',
    name: 'dev',
    description: 'Comandos de desarrollador (solo devs autorizados)',
    category: CATEGORIES.DEVELOPER,
    aliases: ['developer'],

    async execute(message: Message, args: string[]) {
        try {
            if (!isDeveloper(message.author.id)) {
                return;
            }

            const subcommand = args[0]?.toLowerCase();

            if (!subcommand || subcommand === 'help') {
                await showDevHelp(message);
                return;
            }

            switch (subcommand) {
                case 'memory':
                case 'mem':
                    await handleMemory(message, args.slice(1));
                    break;
                case 'clear':
                case 'clearmem':
                    await handleClearMemory(message, args.slice(1));
                    break;
                default:
                    await message.reply(`❌ Subcomando no válido: **${subcommand}**\nUsa \`${config.prefix}dev help\` para ver comandos disponibles.`);
            }
        } catch (error) {
            await handleCommandError(error, message, 'dev');
        }
    },
};

function isDeveloper(userId: string): boolean {
    return config.developerIds.includes(userId);
}

async function showDevHelp(message: Message): Promise<void> {
    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header('╔═══════════════════════════════════════════╗') + '\n';
        output += AnsiFormatter.header('║     COMANDOS DE DESARROLLADOR             ║') + '\n';
        output += AnsiFormatter.header('╚═══════════════════════════════════════════╝') + '\n\n';

        output += AnsiFormatter.format('COMANDO', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.format(`${config.prefix}dev help`, ANSI.BRIGHT_GREEN) + '\n';
        output += AnsiFormatter.dim('  └─ Muestra esta ayuda') + '\n\n';

        output += AnsiFormatter.format(`${config.prefix}dev memory [@usuario]`, ANSI.BRIGHT_GREEN) + '\n';
        output += AnsiFormatter.dim('  └─ Ver estadísticas del sistema de IA') + '\n';
        output += AnsiFormatter.dim('  └─ o memoria de un usuario específico') + '\n';
        output += AnsiFormatter.dim('  └─ Alias: mem') + '\n\n';

        output += AnsiFormatter.format(`${config.prefix}dev clear [opciones]`, ANSI.BRIGHT_GREEN) + '\n';
        output += AnsiFormatter.dim('  └─ Limpiar memoria de IA') + '\n';
        output += AnsiFormatter.dim('  └─ --all: Limpiar toda la memoria') + '\n';
        output += AnsiFormatter.dim('  └─ @usuario: Limpiar memoria de usuario') + '\n';
        output += AnsiFormatter.dim('  └─ --long-term: Incluir memoria largo plazo') + '\n';
        output += AnsiFormatter.dim('  └─ Alias: clearmem') + '\n\n';

        output += AnsiFormatter.dim('═'.repeat(45)) + '\n';
        output += AnsiFormatter.format('⚡ Solo desarrolladores autorizados', ANSI.BRIGHT_YELLOW);

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        const embed = new EmbedBuilder()
            .setTitle('🔧 Comandos de Desarrollador')
            .setDescription('Comandos exclusivos para desarrolladores del bot')
            .setColor(COLORS.WARNING)
            .addFields(
                {
                    name: `${config.prefix}dev help`,
                    value: 'Muestra esta ayuda',
                    inline: false
                },
                {
                    name: `${config.prefix}dev memory [@usuario]`,
                    value: 'Ver estadísticas del sistema de IA o memoria de un usuario específico\nAlias: `mem`',
                    inline: false
                },
                {
                    name: `${config.prefix}dev clear [opciones]`,
                    value: 'Limpiar memoria de IA\n`--all`: Limpiar toda la memoria\n`@usuario`: Limpiar memoria de usuario\n`--long-term`: Incluir memoria largo plazo\nAlias: `clearmem`',
                    inline: false
                }
            )
            .setFooter({ text: `Solo visible para desarrolladores autorizados` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

async function handleMemory(message: Message, args: string[]): Promise<void> {
    const aiManager = (message.client as BotClient).aiManager;

    if (!aiManager) {
        await message.reply('❌ El sistema de IA no está disponible.');
        return;
    }

    let targetUser: User | null = null;

    if (args.length > 0) {
        targetUser = message.mentions.users.first() || null;

        if (!targetUser && message.guild) {
            targetUser = await UserSearchHelper.findUser(message.guild, args[0]);
        }
    }

    if (targetUser) {
        await showUserMemory(message, targetUser, aiManager);
    } else {
        await showAISystemStats(message, aiManager);
    }
}

async function showAISystemStats(message: Message, aiManager: AIManager): Promise<void> {
    const stats = aiManager.getStats();

    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header('╔════════════════════════════════════════════╗') + '\n';
        output += AnsiFormatter.header('║    ESTADÍSTICAS DEL SISTEMA DE IA         ║') + '\n';
        output += AnsiFormatter.header('╚════════════════════════════════════════════╝') + '\n\n';

        output += AnsiFormatter.format('📊 FILTROS', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Procesados') + ': ' + AnsiFormatter.value(stats.filters.message.processed.toString()) + '\n';
        output += AnsiFormatter.key('  Aprobados ') + ': ' + AnsiFormatter.format(stats.filters.message.allowed.toString(), ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.key('  Bloqueados') + ': ' + AnsiFormatter.format(stats.filters.message.blocked.toString(), ANSI.BRIGHT_RED, ANSI.BOLD) + '\n\n';

        output += AnsiFormatter.format('💾 MEMORIA - CORTO PLAZO', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Usuarios en caché') + ': ' + AnsiFormatter.value(stats.memory.shortTerm.totalEntries.toString()) + '\n\n';

        output += AnsiFormatter.format('📝 SESIONES ACTIVAS', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Total') + ': ' + AnsiFormatter.value(stats.memory.session.activeSessions.toString()) + '\n\n';

        output += AnsiFormatter.format('🗄️  MEMORIA - LARGO PLAZO', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Usuarios') + ': ' + AnsiFormatter.value(stats.memory.longTerm.cachedUsers.toString()) + '\n\n';

        output += AnsiFormatter.dim('═'.repeat(45)) + '\n';
        output += AnsiFormatter.format(`💡 Usa ${config.prefix}dev memory @usuario`, ANSI.BRIGHT_YELLOW);

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Estadísticas del Sistema de IA')
            .setColor(COLORS.INFO)
            .addFields(
                {
                    name: '📊 Filtros',
                    value:
                        `Procesados: **${stats.filters.message.processed}**\n` +
                        `Aprobados: **${stats.filters.message.allowed}**\n` +
                        `Bloqueados: **${stats.filters.message.blocked}**`,
                    inline: true
                },
                {
                    name: '💾 Memoria (Corto Plazo)',
                    value: `Usuarios en caché: **${stats.memory.shortTerm.totalEntries}**`,
                    inline: true
                },
                {
                    name: '📝 Sesiones Activas',
                    value: `Total: **${stats.memory.session.activeSessions}**`,
                    inline: true
                },
                {
                    name: '🗄️ Memoria a Largo Plazo',
                    value: `Usuarios: **${stats.memory.longTerm.cachedUsers}**`,
                    inline: false
                }
            )
            .setFooter({ text: `Usa ${config.prefix}dev memory @usuario para ver memoria específica` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

async function showUserMemory(message: Message, user: User, aiManager: AIManager): Promise<void> {
    if (user.bot) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Los bots no tienen memoria de IA'))
            : '❌ Los bots no tienen memoria de IA.';
        await message.reply(errorMsg);
        return;
    }

    const memoryManager = aiManager.getMemoryManager();
    const userData = await memoryManager.getUserMemory(user.id);
    const sessionData = await memoryManager.getSession(user.id, message.guildId || undefined);

    if (!userData && !sessionData) {
        const noDataMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.warning(`⚠ ${user.tag} no tiene memoria almacenada aún`))
            : `📊 **${user.tag}** no tiene memoria almacenada aún.`;
        await message.reply(noDataMsg);
        return;
    }

    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header(`╔════════════════════════════════════════════╗`) + '\n';
        output += AnsiFormatter.header(`║    MEMORIA DE ${user.tag.toUpperCase().padEnd(30)}║`) + '\n';
        output += AnsiFormatter.header(`╚════════════════════════════════════════════╝`) + '\n\n';

        if (userData) {
            const facts = Array.from(userData.longTerm.facts.values()).slice(0, 3);
            const preferences = Array.from(userData.longTerm.preferences.values()).slice(0, 3);

            if (facts.length > 0) {
                output += AnsiFormatter.format('📝 INFORMACIÓN', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
                output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
                facts.forEach(f => {
                    output += AnsiFormatter.format('  • ', ANSI.BRIGHT_YELLOW) + f.fact;
                    output += AnsiFormatter.dim(` (${f.relevance}%)`) + '\n';
                });
                output += '\n';
            }

            if (preferences.length > 0) {
                output += AnsiFormatter.format('❤️  PREFERENCIAS', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
                output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
                preferences.forEach(p => {
                    const symbol = p.type === 'like' ? AnsiFormatter.format('✓', ANSI.BRIGHT_GREEN) : AnsiFormatter.format('✗', ANSI.BRIGHT_RED);
                    output += `  ${symbol} ${p.item}`;
                    output += AnsiFormatter.dim(` (${p.relevance}%)`) + '\n';
                });
                output += '\n';
            }

            output += AnsiFormatter.format('📊 ESTADÍSTICAS', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
            output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
            output += AnsiFormatter.key('  Total mensajes') + ': ' + AnsiFormatter.value(userData.stats.totalMessages.toString()) + '\n';
            output += AnsiFormatter.key('  Facts         ') + ': ' + AnsiFormatter.value(userData.longTerm.facts.size.toString()) + '\n';
            output += AnsiFormatter.key('  Preferencias  ') + ': ' + AnsiFormatter.value(userData.longTerm.preferences.size.toString()) + '\n';
            output += AnsiFormatter.key('  Relaciones    ') + ': ' + AnsiFormatter.value(userData.longTerm.relationships.size.toString()) + '\n';
        }

        if (sessionData) {
            output += '\n' + AnsiFormatter.format('💬 SESIÓN ACTUAL', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
            output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
            output += AnsiFormatter.key('  Mensajes') + ': ' + AnsiFormatter.value(sessionData.messageCount.toString()) + '\n';
            const startTime = Math.floor(sessionData.startTime.getTime() / 1000);
            output += AnsiFormatter.key('  Inicio  ') + ': ' + AnsiFormatter.dim(`<t:${startTime}:R>`) + '\n';
        }

        output += '\n' + AnsiFormatter.dim('═'.repeat(45)) + '\n';
        output += AnsiFormatter.format('🧠 Memoria del sistema de IA', ANSI.BRIGHT_MAGENTA);

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        const embed = new EmbedBuilder()
            .setTitle(`🧠 Memoria de ${user.tag}`)
            .setColor(COLORS.INFO)
            .setThumbnail(user.displayAvatarURL());

        if (userData) {
            const facts = Array.from(userData.longTerm.facts.values()).slice(0, 3);
            const preferences = Array.from(userData.longTerm.preferences.values()).slice(0, 3);

            if (facts.length > 0) {
                embed.addFields({
                    name: '📝 Información',
                    value: facts.map(f => `• ${f.fact} (${f.relevance}%)`).join('\n') || 'Ninguna',
                    inline: false
                });
            }

            if (preferences.length > 0) {
                embed.addFields({
                    name: '❤️ Preferencias',
                    value: preferences.map(p => {
                        const emoji = p.type === 'like' ? '✅' : '❌';
                        return `${emoji} ${p.item} (${p.relevance}%)`;
                    }).join('\n') || 'Ninguna',
                    inline: false
                });
            }

            embed.addFields({
                name: '📊 Estadísticas',
                value:
                    `Total mensajes: **${userData.stats.totalMessages}**\n` +
                    `Facts: **${userData.longTerm.facts.size}**\n` +
                    `Preferencias: **${userData.longTerm.preferences.size}**\n` +
                    `Relaciones: **${userData.longTerm.relationships.size}**`,
                inline: true
            });
        }

        if (sessionData) {
            embed.addFields({
                name: '💬 Sesión Actual',
                value: `Mensajes: **${sessionData.messageCount}**\nInicio: <t:${Math.floor(sessionData.startTime.getTime() / 1000)}:R>`,
                inline: true
            });
        }

        embed.setFooter({ text: 'Memoria del sistema de IA' }).setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

async function handleClearMemory(message: Message, args: string[]): Promise<void> {
    const aiManager = (message.client as BotClient).aiManager;

    if (!aiManager) {
        await message.reply('❌ El sistema de IA no está disponible.');
        return;
    }

    const memoryManager = aiManager.getMemoryManager();
    const isAll = args.includes('--all');
    const includeLongTerm = args.includes('--long-term');

    let targetUser: User | null = null;
    const userArg = args.find(arg => !arg.startsWith('--'));

    if (userArg) {
        targetUser = message.mentions.users.first() || null;

        if (!targetUser && message.guild) {
            targetUser = await UserSearchHelper.findUser(message.guild, userArg);
        }
    }

    if (isAll) {
        const confirmMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(
                AnsiFormatter.warning('⚠️  ¿Estás seguro de que quieres limpiar TODA la memoria de IA?') + '\n' +
                AnsiFormatter.dim(includeLongTerm ? 'Se eliminará la memoria de corto, mediano Y largo plazo de TODOS los usuarios.' : 'Se eliminará la memoria de corto y mediano plazo de TODOS los usuarios.') + '\n\n' +
                AnsiFormatter.format('Responde con "confirmar" en los próximos 30 segundos.', ANSI.BRIGHT_YELLOW)
            )
            : `⚠️  **¿Estás seguro de que quieres limpiar TODA la memoria de IA?**\n${includeLongTerm ? 'Se eliminará la memoria de corto, mediano Y largo plazo de TODOS los usuarios.' : 'Se eliminará la memoria de corto y mediano plazo de TODOS los usuarios.'}\n\nResponde con "confirmar" en los próximos 30 segundos.`;

        const reply = await message.reply(confirmMsg);

        try {
            if (!('awaitMessages' in message.channel)) {
                await message.reply('❌ Esta operación no es compatible con este tipo de canal.');
                return;
            }

            const collected = await message.channel.awaitMessages({
                filter: (m: Message) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirmar',
                max: 1,
                time: 30000,
                errors: ['time']
            });

            if (collected.size > 0) {
                await memoryManager.clearAllMemory(includeLongTerm);

                const successMsg = isDevFormatMessage(message)
                    ? AnsiFormatter.codeBlock(
                        AnsiFormatter.format('✓ Memoria limpiada exitosamente', ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n' +
                        AnsiFormatter.dim(includeLongTerm ? 'Toda la memoria (corto, mediano y largo plazo) ha sido eliminada.' : 'Toda la memoria de corto y mediano plazo ha sido eliminada.')
                    )
                    : `✅ **Memoria limpiada exitosamente**\n${includeLongTerm ? 'Toda la memoria (corto, mediano y largo plazo) ha sido eliminada.' : 'Toda la memoria de corto y mediano plazo ha sido eliminada.'}`;

                await message.reply(successMsg);
            }
        } catch (error) {
            const cancelMsg = isDevFormatMessage(message)
                ? AnsiFormatter.codeBlock(AnsiFormatter.dim('❌ Operación cancelada (tiempo agotado)'))
                : '❌ Operación cancelada (tiempo agotado).';

            await message.reply(cancelMsg);
        }
    } else if (targetUser) {
        if (targetUser.bot) {
            const errorMsg = isDevFormatMessage(message)
                ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Los bots no tienen memoria de IA'))
                : '❌ Los bots no tienen memoria de IA.';
            await message.reply(errorMsg);
            return;
        }

        await memoryManager.clearUserMemory(targetUser.id, message.guildId || undefined, includeLongTerm);

        const successMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(
                AnsiFormatter.format(`✓ Memoria de ${targetUser.tag} limpiada`, ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n' +
                AnsiFormatter.dim(includeLongTerm ? 'Memoria de corto, mediano y largo plazo eliminada.' : 'Memoria de corto y mediano plazo eliminada.')
            )
            : `✅ **Memoria de ${targetUser.tag} limpiada**\n${includeLongTerm ? 'Memoria de corto, mediano y largo plazo eliminada.' : 'Memoria de corto y mediano plazo eliminada.'}`;

        await message.reply(successMsg);
    } else {
        const helpMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(
                AnsiFormatter.error('✘ Debes especificar --all o @usuario') + '\n\n' +
                AnsiFormatter.format('Ejemplos:', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n' +
                AnsiFormatter.dim(`  ${config.prefix}dev clear --all`) + '\n' +
                AnsiFormatter.dim(`  ${config.prefix}dev clear @usuario`) + '\n' +
                AnsiFormatter.dim(`  ${config.prefix}dev clear @usuario --long-term`) + '\n' +
                AnsiFormatter.dim(`  ${config.prefix}dev clear --all --long-term`)
            )
            : `❌ **Debes especificar --all o @usuario**\n\n**Ejemplos:**\n\`${config.prefix}dev clear --all\`\n\`${config.prefix}dev clear @usuario\`\n\`${config.prefix}dev clear @usuario --long-term\`\n\`${config.prefix}dev clear --all --long-term\``;

        await message.reply(helpMsg);
    }
}

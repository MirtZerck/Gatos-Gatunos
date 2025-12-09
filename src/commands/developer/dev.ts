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
import { PremiumTier, PremiumType, PremiumSource } from '../../types/Premium.js';
import { getTierName, getTierEmoji } from '../../utils/premiumHelpers.js';
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from '../../utils/messageUtils.js';

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
                case 'premium':
                case 'prem':
                    await handlePremium(message, args.slice(1));
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

        output += AnsiFormatter.format(`${config.prefix}dev premium <acción>`, ANSI.BRIGHT_GREEN) + '\n';
        output += AnsiFormatter.dim('  └─ Gestionar sistema premium') + '\n';
        output += AnsiFormatter.dim('  └─ grant @usuario <tier> [días]') + '\n';
        output += AnsiFormatter.dim('  └─ revoke @usuario [razón]') + '\n';
        output += AnsiFormatter.dim('  └─ check @usuario') + '\n';
        output += AnsiFormatter.dim('  └─ stats') + '\n';
        output += AnsiFormatter.dim('  └─ Alias: prem') + '\n\n';

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
                },
                {
                    name: `${config.prefix}dev premium <acción>`,
                    value: 'Gestionar sistema premium\n`grant @usuario <tier> [días]`\n`revoke @usuario [razón]`\n`check @usuario`\n`stats`\nAlias: `prem`',
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

async function handlePremium(message: Message, args: string[]): Promise<void> {
    const client = message.client as BotClient;

    if (!client.premiumManager) {
        await message.reply('❌ El sistema premium no está disponible.');
        return;
    }

    const action = args[0]?.toLowerCase();

    if (!action) {
        await message.reply(`❌ Especifica una acción: grant, revoke, check, stats, generate, codes, delete-code`);
        return;
    }

    switch (action) {
        case 'grant':
            await handlePremiumGrant(message, args.slice(1), client);
            break;
        case 'revoke':
            await handlePremiumRevoke(message, args.slice(1), client);
            break;
        case 'check':
            await handlePremiumCheck(message, args.slice(1), client);
            break;
        case 'stats':
            await handlePremiumStats(message, client);
            break;
        case 'generate':
        case 'gen':
            await handlePremiumGenerateCode(message, args.slice(1), client);
            break;
        case 'codes':
        case 'list':
            await handlePremiumListCodes(message, args.slice(1), client);
            break;
        case 'delete-code':
        case 'delcode':
            await handlePremiumDeleteCode(message, args.slice(1), client);
            break;
        default:
            await message.reply(`❌ Acción no válida: **${action}**`);
    }
}

async function handlePremiumGrant(message: Message, args: string[], client: BotClient): Promise<void> {
    let targetUser: User | null = message.mentions.users.first() || null;

    if (!targetUser && args[0] && message.guild) {
        targetUser = await UserSearchHelper.findUser(message.guild, args[0]);
    }

    if (!targetUser) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Debes mencionar un usuario o proporcionar su nombre/ID'))
            : '❌ Debes mencionar un usuario o proporcionar su nombre/ID.';
        await message.reply(errorMsg);
        return;
    }

    const tierArg = args[1]?.toLowerCase();
    if (!tierArg) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Especifica un tier: basic, pro, ultra'))
            : '❌ Especifica un tier: basic, pro, ultra';
        await message.reply(errorMsg);
        return;
    }

    let tier: PremiumTier;
    switch (tierArg) {
        case 'basic':
        case 'basico':
            tier = PremiumTier.BASIC;
            break;
        case 'pro':
            tier = PremiumTier.PRO;
            break;
        case 'ultra':
            tier = PremiumTier.ULTRA;
            break;
        default:
            const errorMsg = isDevFormatMessage(message)
                ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Tier no válido. Usa: basic, pro, ultra'))
                : '❌ Tier no válido. Usa: basic, pro, ultra';
            await message.reply(errorMsg);
            return;
    }

    const durationArg = args[2];
    let type: PremiumType;
    let duration: number | undefined;

    if (durationArg === 'permanent' || durationArg === 'perm') {
        type = PremiumType.PERMANENT;
    } else if (durationArg) {
        const days = parseInt(durationArg);
        if (isNaN(days) || days <= 0) {
            const errorMsg = isDevFormatMessage(message)
                ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Duración inválida. Especifica un número de días o "permanent"'))
                : '❌ Duración inválida. Especifica un número de días o "permanent"';
            await message.reply(errorMsg);
            return;
        }
        type = PremiumType.TEMPORARY;
        duration = days * 86400000;
    } else {
        type = PremiumType.TEMPORARY;
        duration = 30 * 86400000;
    }

    const success = await client.premiumManager!.grantPremium({
        userId: targetUser.id,
        tier,
        type,
        duration,
        source: PremiumSource.MANUAL,
        sourceId: message.author.id,
        grantedBy: message.author.id
    });

    if (success) {
        const tierName = getTierName(tier);
        const tierEmoji = getTierEmoji(tier);
        const durationText = type === PremiumType.PERMANENT ? 'permanente' : `${Math.ceil(duration! / 86400000)} días`;

        if (isDevFormatMessage(message)) {
            let output = '';
            output += AnsiFormatter.format('✓ Premium Otorgado', ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n\n';
            output += AnsiFormatter.key('Usuario') + ': ' + AnsiFormatter.value(targetUser.tag) + '\n';
            output += AnsiFormatter.key('Tier   ') + ': ' + AnsiFormatter.format(`${tierName} ${tierEmoji}`, ANSI.BRIGHT_CYAN) + '\n';
            output += AnsiFormatter.key('Tipo   ') + ': ' + AnsiFormatter.value(durationText);
            await message.reply(AnsiFormatter.codeBlock(output));
        } else {
            const embed = createSuccessEmbed(
                `${tierEmoji} Premium Otorgado`,
                `Premium **${tierName}** otorgado a ${targetUser}\n\nTipo: ${durationText}`
            );
            await message.reply({ embeds: [embed] });
        }
    } else {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ No se pudo otorgar el premium'))
            : undefined;
        if (errorMsg) {
            await message.reply(errorMsg);
        } else {
            const embed = createErrorEmbed('❌ Error', 'No se pudo otorgar el premium');
            await message.reply({ embeds: [embed] });
        }
    }
}

async function handlePremiumRevoke(message: Message, args: string[], client: BotClient): Promise<void> {
    let targetUser: User | null = message.mentions.users.first() || null;

    if (!targetUser && args[0] && message.guild) {
        targetUser = await UserSearchHelper.findUser(message.guild, args[0]);
    }

    if (!targetUser) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Debes mencionar un usuario o proporcionar su nombre/ID'))
            : '❌ Debes mencionar un usuario o proporcionar su nombre/ID.';
        await message.reply(errorMsg);
        return;
    }

    const reason = args.slice(1).join(' ') || 'Sin razón especificada';

    const success = await client.premiumManager!.revokePremium(
        targetUser.id,
        message.author.id,
        reason
    );

    if (success) {
        if (isDevFormatMessage(message)) {
            let output = '';
            output += AnsiFormatter.format('✓ Premium Revocado', ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n\n';
            output += AnsiFormatter.key('Usuario') + ': ' + AnsiFormatter.value(targetUser.tag) + '\n';
            output += AnsiFormatter.key('Razón  ') + ': ' + AnsiFormatter.dim(reason);
            await message.reply(AnsiFormatter.codeBlock(output));
        } else {
            const embed = createSuccessEmbed(
                '✅ Premium Revocado',
                `Premium revocado de ${targetUser}\n\nRazón: ${reason}`
            );
            await message.reply({ embeds: [embed] });
        }
    } else {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ El usuario no tiene premium activo'))
            : undefined;
        if (errorMsg) {
            await message.reply(errorMsg);
        } else {
            const embed = createErrorEmbed('❌ Error', 'El usuario no tiene premium activo');
            await message.reply({ embeds: [embed] });
        }
    }
}

async function handlePremiumCheck(message: Message, args: string[], client: BotClient): Promise<void> {
    let targetUser: User | null = message.mentions.users.first() || null;

    if (!targetUser && args[0] && message.guild) {
        targetUser = await UserSearchHelper.findUser(message.guild, args[0]);
    }

    if (!targetUser) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error('✘ Debes mencionar un usuario o proporcionar su nombre/ID'))
            : '❌ Debes mencionar un usuario o proporcionar su nombre/ID.';
        await message.reply(errorMsg);
        return;
    }

    const status = await client.premiumManager!.getPremiumStatus(targetUser.id);

    if (!status.hasPremium) {
        if (isDevFormatMessage(message)) {
            const output = AnsiFormatter.warning(`⚠ ${targetUser.tag} no tiene premium activo`);
            await message.reply(AnsiFormatter.codeBlock(output));
        } else {
            const embed = createInfoEmbed(
                'ℹ️ Estado Premium',
                `${targetUser} no tiene premium activo`
            );
            await message.reply({ embeds: [embed] });
        }
        return;
    }

    const tierName = getTierName(status.tier!);
    const tierEmoji = getTierEmoji(status.tier!);

    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header(`╔═══════════════════════════════════════════╗`) + '\n';
        output += AnsiFormatter.header(`║       ESTADO PREMIUM                      ║`) + '\n';
        output += AnsiFormatter.header(`╚═══════════════════════════════════════════╝`) + '\n\n';
        output += AnsiFormatter.key('Usuario') + ': ' + AnsiFormatter.value(targetUser.tag) + '\n';
        output += AnsiFormatter.key('Tier   ') + ': ' + AnsiFormatter.format(`${tierName} ${tierEmoji}`, ANSI.BRIGHT_CYAN) + '\n';
        output += AnsiFormatter.key('Tipo   ') + ': ' + AnsiFormatter.value(status.type === PremiumType.PERMANENT ? 'Permanente' : 'Temporal') + '\n';
        output += AnsiFormatter.key('Fuente ') + ': ' + AnsiFormatter.value(status.source!) + '\n';

        if (status.type === PremiumType.TEMPORARY && status.expiresAt) {
            const daysRemaining = Math.ceil((status.expiresAt - Date.now()) / 86400000);
            output += AnsiFormatter.key('Expira ') + ': ' + AnsiFormatter.dim(`<t:${Math.floor(status.expiresAt / 1000)}:R>`) + '\n';
            output += AnsiFormatter.key('Días   ') + ': ' + AnsiFormatter.format(daysRemaining.toString(), ANSI.BRIGHT_YELLOW);
        }

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        let description = `Usuario: ${targetUser}\n`;
        description += `Tier: **${tierName}** ${tierEmoji}\n`;
        description += `Tipo: **${status.type === PremiumType.PERMANENT ? 'Permanente' : 'Temporal'}**\n`;
        description += `Fuente: **${status.source}**\n`;

        if (status.type === PremiumType.TEMPORARY && status.expiresAt) {
            const daysRemaining = Math.ceil((status.expiresAt - Date.now()) / 86400000);
            description += `Expira: <t:${Math.floor(status.expiresAt / 1000)}:R>\n`;
            description += `Días restantes: **${daysRemaining}**`;
        }

        const embed = createInfoEmbed(`${tierEmoji} Estado Premium`, description);
        await message.reply({ embeds: [embed] });
    }
}

async function handlePremiumStats(message: Message, client: BotClient): Promise<void> {
    const stats = await client.premiumManager!.getStats();

    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header('╔════════════════════════════════════════════╗') + '\n';
        output += AnsiFormatter.header('║    ESTADÍSTICAS PREMIUM                    ║') + '\n';
        output += AnsiFormatter.header('╚════════════════════════════════════════════╝') + '\n\n';

        output += AnsiFormatter.format('👥 USUARIOS', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Total  ') + ': ' + AnsiFormatter.value(stats.totalUsers.toString()) + '\n';
        output += AnsiFormatter.key('  Activos') + ': ' + AnsiFormatter.format(stats.activeUsers.toString(), ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n\n';

        output += AnsiFormatter.format('🥉 POR TIER', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Básico') + ': ' + AnsiFormatter.value(stats.byTier.basic.toString()) + '\n';
        output += AnsiFormatter.key('  Pro   ') + ': ' + AnsiFormatter.value(stats.byTier.pro.toString()) + '\n';
        output += AnsiFormatter.key('  Ultra ') + ': ' + AnsiFormatter.value(stats.byTier.ultra.toString()) + '\n\n';

        output += AnsiFormatter.format('📍 POR FUENTE', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Ko-fi ') + ': ' + AnsiFormatter.value(stats.bySource.kofi.toString()) + '\n';
        output += AnsiFormatter.key('  Top.gg') + ': ' + AnsiFormatter.value(stats.bySource.topgg.toString()) + '\n';
        output += AnsiFormatter.key('  DBL   ') + ': ' + AnsiFormatter.value(stats.bySource.dbl.toString()) + '\n';
        output += AnsiFormatter.key('  Códigs') + ': ' + AnsiFormatter.value(stats.bySource.code.toString()) + '\n';
        output += AnsiFormatter.key('  Manual') + ': ' + AnsiFormatter.value(stats.bySource.manual.toString()) + '\n';

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        const embed = new EmbedBuilder()
            .setTitle('📊 Estadísticas Premium')
            .setColor(COLORS.INFO)
            .addFields(
                {
                    name: '👥 Usuarios',
                    value: `Total: **${stats.totalUsers}**\nActivos: **${stats.activeUsers}**`,
                    inline: true
                },
                {
                    name: '🥉 Por Tier',
                    value:
                        `Básico: **${stats.byTier.basic}**\n` +
                        `Pro: **${stats.byTier.pro}**\n` +
                        `Ultra: **${stats.byTier.ultra}**`,
                    inline: true
                },
                {
                    name: '📍 Por Fuente',
                    value:
                        `Ko-fi: **${stats.bySource.kofi}**\n` +
                        `Top.gg: **${stats.bySource.topgg}**\n` +
                        `DBL: **${stats.bySource.dbl}**\n` +
                        `Códigos: **${stats.bySource.code}**\n` +
                        `Manual: **${stats.bySource.manual}**`,
                    inline: false
                }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

async function handlePremiumGenerateCode(message: Message, args: string[], client: BotClient): Promise<void> {
    if (!client.redeemCodeManager) {
        await message.reply('❌ El sistema de códigos no está disponible.');
        return;
    }

    const tierArg = args[0]?.toLowerCase();
    const typeArg = args[1]?.toLowerCase();

    if (!tierArg || !typeArg) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(
                AnsiFormatter.error('✘ Uso incorrecto') + '\n\n' +
                AnsiFormatter.format('Uso:', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n' +
                AnsiFormatter.dim(`  ${config.prefix}dev premium generate <tier> <tipo> [días]`) + '\n\n' +
                AnsiFormatter.format('Tiers:', ANSI.BRIGHT_CYAN) + ' basic, pro, ultra\n' +
                AnsiFormatter.format('Tipos:', ANSI.BRIGHT_CYAN) + ' temp, permanent'
            )
            : '❌ **Uso:** `*dev premium generate <tier> <tipo> [días]`\n**Tiers:** basic, pro, ultra\n**Tipos:** temp, permanent';
        await message.reply(errorMsg);
        return;
    }

    let tier: PremiumTier;
    switch (tierArg) {
        case 'basic':
        case 'basico':
            tier = PremiumTier.BASIC;
            break;
        case 'pro':
            tier = PremiumTier.PRO;
            break;
        case 'ultra':
            tier = PremiumTier.ULTRA;
            break;
        default:
            await message.reply(`❌ Tier inválido: **${tierArg}**`);
            return;
    }

    let type: PremiumType;
    let duration: number | undefined;

    switch (typeArg) {
        case 'temp':
        case 'temporal':
            type = PremiumType.TEMPORARY;
            const days = parseInt(args[2]);
            if (!days || days <= 0) {
                await message.reply('❌ Debes especificar la duración en días para códigos temporales.');
                return;
            }
            duration = days * 86400000;
            break;
        case 'perm':
        case 'permanent':
        case 'permanente':
            type = PremiumType.PERMANENT;
            duration = undefined;
            break;
        default:
            await message.reply(`❌ Tipo inválido: **${typeArg}**`);
            return;
    }

    const code = await client.redeemCodeManager.generateCode({
        tier,
        type,
        duration,
        createdBy: message.author.id
    });

    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header('╔════════════════════════════════════════════╗') + '\n';
        output += AnsiFormatter.header('║    CÓDIGO GENERADO                         ║') + '\n';
        output += AnsiFormatter.header('╚════════════════════════════════════════════╝') + '\n\n';

        output += AnsiFormatter.format('📋 CÓDIGO', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.format(`  ${code.code}`, ANSI.BRIGHT_GREEN, ANSI.BOLD) + '\n\n';

        output += AnsiFormatter.format('ℹ️  DETALLES', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n';
        output += AnsiFormatter.dim('─'.repeat(45)) + '\n';
        output += AnsiFormatter.key('  Tier  ') + ': ' + AnsiFormatter.value(tier) + '\n';
        output += AnsiFormatter.key('  Tipo  ') + ': ' + AnsiFormatter.value(type) + '\n';
        if (duration) {
            const days = Math.ceil(duration / 86400000);
            output += AnsiFormatter.key('  Duración') + ': ' + AnsiFormatter.value(`${days} días`) + '\n';
        }

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        const tierName = tier === PremiumTier.BASIC ? 'Básico' : tier === PremiumTier.PRO ? 'Pro' : 'Ultra';
        const embed = new EmbedBuilder()
            .setTitle('✅ Código Generado')
            .setColor(COLORS.SUCCESS)
            .addFields(
                {
                    name: '📋 Código',
                    value: `\`${code.code}\``,
                    inline: false
                },
                {
                    name: 'Tier',
                    value: tierName,
                    inline: true
                },
                {
                    name: 'Tipo',
                    value: type === PremiumType.PERMANENT ? 'Permanente' : 'Temporal',
                    inline: true
                }
            )
            .setTimestamp();

        if (duration) {
            const days = Math.ceil(duration / 86400000);
            embed.addFields({
                name: 'Duración',
                value: `${days} días`,
                inline: true
            });
        }

        await message.reply({ embeds: [embed] });
    }
}

async function handlePremiumListCodes(message: Message, args: string[], client: BotClient): Promise<void> {
    if (!client.redeemCodeManager) {
        await message.reply('❌ El sistema de códigos no está disponible.');
        return;
    }

    const filter = args[0]?.toLowerCase() || 'active';
    let codes;

    switch (filter) {
        case 'active':
        case 'activos':
            codes = await client.redeemCodeManager.getActiveCodes();
            break;
        case 'used':
        case 'usados':
            codes = await client.redeemCodeManager.getUsedCodes();
            break;
        case 'all':
        case 'todos':
            codes = await client.redeemCodeManager.getAllCodes();
            break;
        default:
            await message.reply(`❌ Filtro inválido: **${filter}**\nUsa: active, used, all`);
            return;
    }

    if (codes.length === 0) {
        const noCodesMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.warning('⚠ No hay códigos para mostrar'))
            : '⚠️ No hay códigos para mostrar.';
        await message.reply(noCodesMsg);
        return;
    }

    if (isDevFormatMessage(message)) {
        let output = '';
        output += AnsiFormatter.header('╔════════════════════════════════════════════╗') + '\n';
        output += AnsiFormatter.header(`║    CÓDIGOS (${filter.toUpperCase()})${' '.repeat(Math.max(0, 32 - filter.length))}║`) + '\n';
        output += AnsiFormatter.header('╚════════════════════════════════════════════╝') + '\n\n';

        for (const code of codes.slice(0, 10)) {
            output += AnsiFormatter.format('•', ANSI.BRIGHT_YELLOW) + ' ';
            output += AnsiFormatter.format(code.code, ANSI.BRIGHT_GREEN, ANSI.BOLD);
            output += AnsiFormatter.dim(` [${code.tier}] `);

            if (code.used) {
                output += AnsiFormatter.error('USADO');
            } else {
                output += AnsiFormatter.success('ACTIVO');
            }

            output += '\n';
        }

        if (codes.length > 10) {
            output += '\n' + AnsiFormatter.dim(`... y ${codes.length - 10} más`);
        }

        await message.reply(AnsiFormatter.codeBlock(output));
    } else {
        const codesList = codes.slice(0, 10).map(code => {
            const status = code.used ? '❌ USADO' : '✅ ACTIVO';
            return `• \`${code.code}\` [${code.tier}] ${status}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`📋 Códigos Premium (${filter})`)
            .setDescription(codesList + (codes.length > 10 ? `\n\n... y ${codes.length - 10} más` : ''))
            .setColor(COLORS.INFO)
            .setFooter({ text: `Total: ${codes.length} códigos` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

async function handlePremiumDeleteCode(message: Message, args: string[], client: BotClient): Promise<void> {
    if (!client.redeemCodeManager) {
        await message.reply('❌ El sistema de códigos no está disponible.');
        return;
    }

    const code = args[0];

    if (!code) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(
                AnsiFormatter.error('✘ Debes proporcionar un código') + '\n\n' +
                AnsiFormatter.format('Uso:', ANSI.BRIGHT_CYAN, ANSI.BOLD) + '\n' +
                AnsiFormatter.dim(`  ${config.prefix}dev premium delete-code <código>`)
            )
            : '❌ **Uso:** `*dev premium delete-code <código>`';
        await message.reply(errorMsg);
        return;
    }

    const deleted = await client.redeemCodeManager.deleteCode(code);

    if (!deleted) {
        const errorMsg = isDevFormatMessage(message)
            ? AnsiFormatter.codeBlock(AnsiFormatter.error(`✘ Código no encontrado o ya usado: ${code}`))
            : `❌ Código no encontrado o ya usado: \`${code}\``;
        await message.reply(errorMsg);
        return;
    }

    const successMsg = isDevFormatMessage(message)
        ? AnsiFormatter.codeBlock(AnsiFormatter.success(`✓ Código eliminado: ${code}`))
        : `✅ Código eliminado: \`${code}\``;
    await message.reply(successMsg);
}

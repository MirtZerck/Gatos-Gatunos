import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    EmbedBuilder,
    GuildMember
} from 'discord.js';
import { HybridCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';
import { handleCommandError } from '../../utils/errorHandler.js';
import { config } from '../../config.js';
import { UserSearchHelper } from '../../utils/userSearchHelpers.js';

export const user: HybridCommand = {
    type: 'hybrid',
    name: 'user',
    description: 'Comandos de información de usuarios',
    category: CATEGORIES.UTILITY,
    subcommands: [
        { name: 'info', aliases: ['ui', 'useri', 'userinfo'], description: 'Muestra información detallada de un usuario' },
        { name: 'avatar', aliases: ['av', 'pfp'], description: 'Muestra el avatar y perfil de un usuario' },
    ],

    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Comandos de información de usuarios')

        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Muestra información detallada de un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('El usuario del que quieres ver la información')
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Muestra el avatar y perfil de un usuario')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('El usuario del que quieres ver el avatar')
                        .setRequired(false)
                )
        )

        .setContexts(CONTEXTS.ALL)
        .setIntegrationTypes(INTEGRATION_TYPES.ALL),

    async executeSlash(interaction: ChatInputCommandInteraction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'info':
                    await handleUserInfo(interaction);
                    break;
                case 'avatar':
                    await handleAvatar(interaction);
                    break;
            }
        } catch (error) {
            await handleCommandError(error, interaction, 'user');
        }
    },

    async executePrefix(message: Message, args: string[]) {
        try {
            const subcommand = args[0]?.toLowerCase();

            if (!subcommand) {
                await message.reply(
                    `❌ **Uso:** \`${config.prefix}user <subcomando>\` o usa los aliases directamente\n\n` +
                    `**Subcomandos disponibles:**\n` +
                    `• \`info\` (\`ui\`, \`useri\`, \`userinfo\`) [@usuario] - Muestra información del usuario\n` +
                    `• \`avatar\` (\`av\`, \`pfp\`) [@usuario] - Muestra avatar y perfil`
                );
                return;
            }

            switch (subcommand) {
                case 'info':
                    await handleUserInfoPrefix(message, args.slice(1));
                    break;
                case 'avatar':
                    await handleAvatarPrefix(message, args.slice(1));
                    break;
                default:
                    await message.reply(`❌ Subcomando no válido: **${subcommand}**`);
            }
        } catch (error) {
            await handleCommandError(error, message, 'user');
        }
    },
};

function formatDate(date: Date): string {
    return `<t:${Math.floor(date.getTime() / 1000)}:D>`;
}

function formatUserRoles(member: GuildMember): string {
    const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(role => `<@&${role.id}>`)
        .slice(0, 10);

    if (roles.length === 0) {
        return 'Sin roles';
    }

    const remaining = member.roles.cache.size - 1 - roles.length;
    if (remaining > 0) {
        return `${roles.join(', ')} y ${remaining} más`;
    }

    return roles.join(', ');
}

async function handleUserInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;

    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Este comando solo puede usarse en un servidor.',
            ephemeral: true
        });
        return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
        await interaction.reply({
            content: '❌ El usuario no existe en este servidor.',
            ephemeral: true
        });
        return;
    }

    const fetchedUser = await targetUser.fetch(true);
    const avatarURL = fetchedUser.displayAvatarURL({ size: 512, extension: 'png' });
    const createdAt = formatDate(targetUser.createdAt);
    const joinedAt = member.joinedAt ? formatDate(member.joinedAt) : 'Desconocido';
    const rolesDescription = formatUserRoles(member);

    const daysSinceJoined = member.joinedAt
        ? Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: `${member.user.tag}`,
            iconURL: avatarURL
        })
        .setTitle(`👤 Información de Usuario`)
        .setThumbnail(avatarURL)
        .setColor(fetchedUser.accentColor || member.displayHexColor || COLORS.INFO)
        .addFields(
            {
                name: '📝 Nombre',
                value: member.displayName,
                inline: true
            },
            {
                name: '🔖 Tag',
                value: `\`${member.user.tag}\``,
                inline: true
            },
            {
                name: '🆔 ID',
                value: `\`${targetUser.id}\``,
                inline: true
            },
            {
                name: '📅 Cuenta Creada',
                value: `${createdAt}\n(<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>)`,
                inline: true
            },
            {
                name: '📥 Se Unió al Servidor',
                value: `${joinedAt}${daysSinceJoined !== null ? `\n(Hace ${daysSinceJoined} días)` : ''}`,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: `👥 Roles [${member.roles.cache.size - 1}]`,
                value: rolesDescription,
                inline: false
            }
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
        .setTimestamp();

    if (fetchedUser.bannerURL()) {
        embed.setImage(fetchedUser.bannerURL({ size: 1024 })!);
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleUserInfoPrefix(message: Message, args: string[]): Promise<void> {
    if (!message.guild) {
        await message.reply('❌ Este comando solo puede usarse en un servidor.');
        return;
    }

    const mentionedMember = message.mentions.members?.first();
    const query = args[0];

    let member: GuildMember | null = null;

    if (mentionedMember) {
        member = mentionedMember;
    } else if (query) {
        if (query.length < 3) {
            await message.reply('❌ El usuario a mencionar debe tener al menos 3 caracteres.');
            return;
        }

        member = await UserSearchHelper.findMember(message.guild, query);

        if (!member) {
            await message.reply(`❌ No se encontró al usuario: **${query}**`);
            return;
        }
    } else {
        member = message.member;
    }

    if (!member) {
        await message.reply('❌ No se pudo obtener la información del usuario.');
        return;
    }

    const user = member.user;
    const fetchedUser = await user.fetch(true);
    const avatarURL = fetchedUser.displayAvatarURL({ size: 512, extension: 'png' });
    const createdAt = formatDate(user.createdAt);
    const joinedAt = member.joinedAt ? formatDate(member.joinedAt) : 'Desconocido';
    const rolesDescription = formatUserRoles(member);

    const daysSinceJoined = member.joinedAt
        ? Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: `${member.user.tag}`,
            iconURL: avatarURL
        })
        .setTitle(`👤 Información de Usuario`)
        .setThumbnail(avatarURL)
        .setColor(fetchedUser.accentColor || member.displayHexColor || COLORS.INFO)
        .addFields(
            {
                name: '📝 Nombre',
                value: member.displayName,
                inline: true
            },
            {
                name: '🔖 Tag',
                value: `\`${member.user.tag}\``,
                inline: true
            },
            {
                name: '🆔 ID',
                value: `\`${user.id}\``,
                inline: true
            },
            {
                name: '📅 Cuenta Creada',
                value: `${createdAt}\n(<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>)`,
                inline: true
            },
            {
                name: '📥 Se Unió al Servidor',
                value: `${joinedAt}${daysSinceJoined !== null ? `\n(Hace ${daysSinceJoined} días)` : ''}`,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: `👥 Roles [${member.roles.cache.size - 1}]`,
                value: rolesDescription,
                inline: false
            }
        )
        .setFooter({ text: `Solicitado por ${message.author.tag}` })
        .setTimestamp();

    if (fetchedUser.bannerURL()) {
        embed.setImage(fetchedUser.bannerURL({ size: 1024 })!);
    }

    await message.reply({ embeds: [embed] });
}

async function handleAvatar(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;

    const fetchedUser = await targetUser.fetch(true);

    const avatarGlobal = fetchedUser.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: false });
    const avatarGlobalStatic = fetchedUser.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: true });
    const isAnimated = fetchedUser.avatar?.startsWith('a_') || false;

    const banner = fetchedUser.bannerURL({ size: 4096, extension: 'png', forceStatic: false });
    const avatarDecoration = fetchedUser.avatarDecorationURL({ size: 4096 });

    let member: GuildMember | null = null;
    let avatarServer: string | null = null;

    if (interaction.guild) {
        member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member && member.avatar) {
            avatarServer = member.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: false });
        }
    }

    const description = [];

    if (avatarDecoration) {
        description.push(`✨ **Decoración de perfil activa**`);
    }

    if (banner) {
        description.push(`🎨 **Banner personalizado**`);
    }

    if (avatarServer && avatarServer !== avatarGlobal) {
        description.push(`🏠 **Avatar de servidor personalizado**`);
    }

    if (isAnimated) {
        description.push(`🎬 **Avatar animado**`);
    }

    const embed = new EmbedBuilder()
        .setTitle(`${isAnimated ? '✨' : '🖼️'} Avatar de ${fetchedUser.displayName}`)
        .setDescription(description.length > 0 ? description.join('\n') : 'Avatar del usuario')
        .setImage(avatarGlobal)
        .setColor(fetchedUser.accentColor || COLORS.INFO);

    const links = [];
    links.push(`[PNG](${avatarGlobalStatic.replace('png', 'png?size=4096')})`);
    links.push(`[WEBP](${avatarGlobalStatic.replace('png', 'webp?size=4096')})`);
    links.push(`[JPG](${avatarGlobalStatic.replace('png', 'jpg?size=4096')})`);
    if (isAnimated) {
        links.push(`[GIF](${avatarGlobal.replace('png', 'gif?size=4096')})`);
    }

    embed.addFields({
        name: '🔗 Descargar Avatar Global',
        value: links.join(' • '),
        inline: false
    });

    if (avatarServer && avatarServer !== avatarGlobal) {
        const serverLinks = [];
        serverLinks.push(`[PNG](${avatarServer.replace('png', 'png?size=4096')})`);
        serverLinks.push(`[WEBP](${avatarServer.replace('png', 'webp?size=4096')})`);
        serverLinks.push(`[JPG](${avatarServer.replace('png', 'jpg?size=4096')})`);

        embed.addFields({
            name: '🏠 Descargar Avatar del Servidor',
            value: serverLinks.join(' • '),
            inline: false
        });
    }

    if (banner) {
        embed.addFields({
            name: '🎨 Banner',
            value: `[Ver Banner](${banner})`,
            inline: true
        });
    }

    if (avatarDecoration) {
        embed.addFields({
            name: '✨ Decoración',
            value: `[Ver Decoración](${avatarDecoration})`,
            inline: true
        });
    }

    embed.setFooter({ text: `ID: ${fetchedUser.id}` });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleAvatarPrefix(message: Message, args: string[]): Promise<void> {
    let targetUser = message.author;

    if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first()!;
    } else if (args[0] && message.guild) {
        const member = await UserSearchHelper.findMember(message.guild, args[0]);
        if (!member) {
            await message.reply(`❌ No se encontró al usuario: **${args[0]}**`);
            return;
        }
        targetUser = member.user;
    }

    const fetchedUser = await targetUser.fetch(true);

    const avatarGlobal = fetchedUser.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: false });
    const avatarGlobalStatic = fetchedUser.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: true });
    const isAnimated = fetchedUser.avatar?.startsWith('a_') || false;

    const banner = fetchedUser.bannerURL({ size: 4096, extension: 'png', forceStatic: false });
    const avatarDecoration = fetchedUser.avatarDecorationURL({ size: 4096 });

    let member: GuildMember | null = null;
    let avatarServer: string | null = null;

    if (message.guild) {
        member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (member && member.avatar) {
            avatarServer = member.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: false });
        }
    }

    const description = [];

    if (avatarDecoration) {
        description.push(`✨ **Decoración de perfil activa**`);
    }

    if (banner) {
        description.push(`🎨 **Banner personalizado**`);
    }

    if (avatarServer && avatarServer !== avatarGlobal) {
        description.push(`🏠 **Avatar de servidor personalizado**`);
    }

    if (isAnimated) {
        description.push(`🎬 **Avatar animado**`);
    }

    const embed = new EmbedBuilder()
        .setTitle(`${isAnimated ? '✨' : '🖼️'} Avatar de ${fetchedUser.displayName}`)
        .setDescription(description.length > 0 ? description.join('\n') : 'Avatar del usuario')
        .setImage(avatarGlobal)
        .setColor(fetchedUser.accentColor || COLORS.INFO);

    const links = [];
    links.push(`[PNG](${avatarGlobalStatic.replace('png', 'png?size=4096')})`);
    links.push(`[WEBP](${avatarGlobalStatic.replace('png', 'webp?size=4096')})`);
    links.push(`[JPG](${avatarGlobalStatic.replace('png', 'jpg?size=4096')})`);
    if (isAnimated) {
        links.push(`[GIF](${avatarGlobal.replace('png', 'gif?size=4096')})`);
    }

    embed.addFields({
        name: '🔗 Descargar Avatar Global',
        value: links.join(' • '),
        inline: false
    });

    if (avatarServer && avatarServer !== avatarGlobal) {
        const serverLinks = [];
        serverLinks.push(`[PNG](${avatarServer.replace('png', 'png?size=4096')})`);
        serverLinks.push(`[WEBP](${avatarServer.replace('png', 'webp?size=4096')})`);
        serverLinks.push(`[JPG](${avatarServer.replace('png', 'jpg?size=4096')})`);

        embed.addFields({
            name: '🏠 Descargar Avatar del Servidor',
            value: serverLinks.join(' • '),
            inline: false
        });
    }

    if (banner) {
        embed.addFields({
            name: '🎨 Banner',
            value: `[Ver Banner](${banner})`,
            inline: true
        });
    }

    if (avatarDecoration) {
        embed.addFields({
            name: '✨ Decoración',
            value: `[Ver Decoración](${avatarDecoration})`,
            inline: true
        });
    }

    embed.setFooter({ text: `ID: ${fetchedUser.id}` });
    embed.setTimestamp();

    await message.reply({ embeds: [embed] });
}

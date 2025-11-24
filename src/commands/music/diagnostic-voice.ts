import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { SlashOnlyCommand } from '../../types/Command.js';
import { CATEGORIES, COLORS, CONTEXTS, INTEGRATION_TYPES } from '../../utils/constants.js';

export const diagnosticVoice: SlashOnlyCommand = {
    type: 'slash-only',
    name: 'diagnostic-voice',
    description: 'Verifica los permisos de voz del bot',
    category: CATEGORIES.UTILITY,

    data: new SlashCommandBuilder()
        .setName('diagnostic-voice')
        .setDescription('Verifica los permisos de voz del bot')
        .setContexts(CONTEXTS.GUILD_ONLY)
        .setIntegrationTypes(INTEGRATION_TYPES.GUILD_ONLY),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const botMember = interaction.guild.members.me;
        if (!botMember) {
            await interaction.reply('❌ No pude obtener información del bot.');
            return;
        }

        // Verificar permisos globales
        const hasConnect = botMember.permissions.has(PermissionFlagsBits.Connect);
        const hasSpeak = botMember.permissions.has(PermissionFlagsBits.Speak);
        const hasVoiceActivity = botMember.permissions.has(PermissionFlagsBits.UseVAD);

        // Si el usuario está en un canal de voz, verificar permisos específicos del canal
        const member = interaction.member as GuildMember;
        let channelPerms = '';

        if (member.voice?.channel) {
            const channel = member.voice.channel;
            const channelConnect = channel.permissionsFor(botMember)?.has(PermissionFlagsBits.Connect);
            const channelSpeak = channel.permissionsFor(botMember)?.has(PermissionFlagsBits.Speak);

            channelPerms = `\n\n**Permisos en ${channel.name}:**\n` +
                `${channelConnect ? '✅' : '❌'} Connect\n` +
                `${channelSpeak ? '✅' : '❌'} Speak`;
        }

        await interaction.reply({
            content: `**🔍 Diagnóstico de Permisos de Voz**\n\n` +
                `**Permisos Globales:**\n` +
                `${hasConnect ? '✅' : '❌'} Connect\n` +
                `${hasSpeak ? '✅' : '❌'} Speak\n` +
                `${hasVoiceActivity ? '✅' : '❌'} Use Voice Activity\n` +
                `${botMember.permissions.has(PermissionFlagsBits.Administrator) ? '✅ Administrator (todos los permisos)' : ''}` +
                channelPerms,
            ephemeral: true
        });
    }
};
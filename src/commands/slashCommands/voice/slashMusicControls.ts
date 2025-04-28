import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, VoiceChannel, TextChannel, CommandInteractionOptionResolver } from 'discord.js';
import { pause, resume, skip, stop, verifyUserInSameVoiceChannel, handleVoiceConnection } from "../../../utils/sharedMusicFunctions.js";
import { getVoiceConnection } from "@discordjs/voice";

export const musicCommand = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Comandos de control de música')
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pausa la reproducción de música'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Reanuda la reproducción de música'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Salta la canción actual'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Detiene la reproducción de música'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disconnect')
                .setDescription('Desconecta el bot del canal de voz'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Conecta el bot al canal de voz')),

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = (interaction.options as CommandInteractionOptionResolver).getSubcommand();
        const textChannel = interaction.channel as TextChannel;

        try {
            switch (subcommand) {
                case 'pause':
                    if (await verifyUserInSameVoiceChannel(interaction)) {
                        const guildId = interaction.guild!.id;
                        const result = pause(guildId);
                        await interaction.editReply(result);
                    } else {
                        await interaction.editReply({ content: "No estás en el mismo canal de voz que el bot." });
                    }
                    break;

                case 'resume':
                    if (await verifyUserInSameVoiceChannel(interaction)) {
                        const guildId = interaction.guild!.id;
                        const result = resume(guildId);
                        await interaction.editReply(result);
                    } else {
                        await interaction.editReply({ content: "No estás en el mismo canal de voz que el bot." });
                    }
                    break;

                case 'skip':
                    if (await verifyUserInSameVoiceChannel(interaction)) {
                        const guildId = interaction.guild!.id;
                        const result = await skip(guildId, textChannel);
                        await interaction.editReply(result);
                    } else {
                        await interaction.editReply({ content: "No estás en el mismo canal de voz que el bot." });
                    }
                    break;

                case 'stop':
                    if (await verifyUserInSameVoiceChannel(interaction)) {
                        const guildId = interaction.guild!.id;
                        const result = stop(guildId);
                        await interaction.editReply(result);
                    } else {
                        await interaction.editReply({ content: "No estás en el mismo canal de voz que el bot." });
                    }
                    break;

                case 'disconnect':
                    if (await verifyUserInSameVoiceChannel(interaction)) {
                        const guildId = interaction.guild!.id;
                        const connection = getVoiceConnection(guildId);
                        if (connection) {
                            connection.destroy();
                            await interaction.editReply("Desconectado del canal de voz.");
                        } else {
                            await interaction.editReply({ content: "El bot no está conectado a ningún canal de voz." });
                        }
                    } else {
                        await interaction.editReply({ content: "No estás en el mismo canal de voz que el bot." });
                    }
                    break;

                case 'join':
                    const member = interaction.member as GuildMember;
                    const voiceChannel = member.voice.channel as VoiceChannel | null;
                    if (!voiceChannel) {
                        await interaction.editReply({ content: "Debes estar en un canal de voz para usar este comando." });
                        return;
                    }

                    const isInSameChannel = await verifyUserInSameVoiceChannel(interaction, true);
                    if (isInSameChannel) {
                        await interaction.editReply({ content: "Ya estamos en el mismo canal de voz." });
                        return;
                    }

                    const { status, connection, message: connectionMessage } = await handleVoiceConnection(member, interaction);
                    if (status === "error") {
                        await interaction.editReply({ content: connectionMessage || "Error de conexión desconocido." });
                    } else if (!connection) {
                        await interaction.editReply({ content: "No se pudo establecer una conexión de voz." });
                    } else {
                        await interaction.editReply({ content: `Conectado al canal de voz: ${voiceChannel.name}` });
                    }
                    break;

                default:
                    await interaction.editReply({ content: "Comando no reconocido." });
                    break;
            }
        } catch (error) {
            console.error("Error ejecutando el comando:", error);
            await interaction.editReply({ content: "Hubo un error al ejecutar este comando." });
        }
    },
};

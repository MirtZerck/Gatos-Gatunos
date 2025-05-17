import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, CommandInteractionOptionResolver } from "discord.js";
import { SlashCommand, CommandCategory } from "../../types/command.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";
import { CustomImageURLOptions } from "../../types/embeds.js";

export const slashAvatarCommand: SlashCommand = {
    name: "avatar",
    description: "Muestra el avatar de un usuario",
    category: CommandCategory.UTILITY,
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Muestra el avatar de un usuario")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("El usuario del que quieres ver el avatar")
                .setRequired(false)
        ),

    async execute(interaction: CommandInteraction) {
        try {
            // Obtener el usuario objetivo (el mencionado o el que ejecuta el comando)
            const targetUser = (interaction.options as CommandInteractionOptionResolver).getUser("usuario") || interaction.user;
            const member = interaction.guild?.members.cache.get(targetUser.id);
            const dynamicColor = member ? getDynamicColor(member) : "#FF0000";

            // Crear el embed con el avatar
            const avatarEmbed = new EmbedBuilder()
                .setAuthor({
                    name: member?.displayName ?? targetUser.username,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true } as CustomImageURLOptions)
                })
                .setTitle("Avatar")
                .setImage(targetUser.displayAvatarURL({ size: 4096, dynamic: true } as CustomImageURLOptions))
                .setColor(dynamicColor)
                .setTimestamp();

            // Responder con el embed
            await interaction.reply({ embeds: [avatarEmbed] });
        } catch (error) {
            console.error("Error al mostrar el avatar:", error);
            await interaction.reply({ 
                content: "Hubo un error al mostrar el avatar. Por favor, intenta de nuevo.",
                ephemeral: true 
            }).catch(console.error);
        }
    }
};

import { Events, Client, Interaction, CommandInteraction } from "discord.js";
import { arraySlashCommands } from "./slashIndex.js";

export const onInteractionCreate = async (client: Client) => {
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (!interaction.isCommand() && !interaction.isChatInputCommand()) return;

        const slashCommand = arraySlashCommands.find(
            (slashCommand) => slashCommand.data.name === interaction.commandName
        );

        if (!slashCommand) {
            await interaction.reply({ 
                content: "Comando no encontrado", 
                ephemeral: true 
            });
            return;
        }

        try {
            // Verificar si es un comando con subcomandos
            if (interaction.isChatInputCommand()) {
                const subcommandName = interaction.options.data[0]?.name;
                if (subcommandName) {
                    console.log(`Ejecutando subcomando: ${interaction.commandName} ${subcommandName}`);
                }
            }

            await slashCommand.execute(interaction);
        } catch (error) {
            console.error("Error ejecutando el comando:", error);
            
            // Intentar responder al usuario de manera segura
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "Hubo un error al ejecutar este comando.",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: "Hubo un error al ejecutar este comando.",
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error("Error al enviar mensaje de error:", replyError);
            }
        }
    });
};

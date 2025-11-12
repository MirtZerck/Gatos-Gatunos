import { Events } from "discord.js";
import { Event } from "../types/Events.js";

export default {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Comando ${interaction.commandName} no encontrado.`);
            return;
        }
        try {
            console.log(`${interaction.user.displayName} usó /${interaction.commandName}`);

            if (command.executeSlash) {
                await command.executeSlash(interaction);
            } else if (command.execute) {
                await command.execute(interaction);
            } else {
                await interaction.reply({
                    content: 'Este comando solo funciona con prefijo.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.log(`Error ejecutando ${interaction.commandName}`, error);

            const errorMensaje = {
                content: 'Hubo un error al ejecutar este comando.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMensaje);
            } else {
                await interaction.reply(errorMensaje);
            }

        }
    }
} as Event
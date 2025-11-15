import { Events } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";

export default {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger.error('InteractionCreate', `Comando no encontrado: ${interaction.commandName}`);
            return;
        }

        if (command.type === 'prefix-only') {
            await interaction.reply({
                content: '❌ Este comando solo funciona con prefijo.',
                ephemeral: true
            });
            return;
        }

        if (client.cooldownManager) {
            const cooldownRemaining = client.cooldownManager.getRemainingCooldown(
                interaction.commandName,
                interaction.user.id
            );

            if (cooldownRemaining > 0) {
                const seconds = Math.ceil(cooldownRemaining / 1000);
                await interaction.reply({
                    content: `⏱️ Debes esperar **${seconds}** segundo${seconds !== 1 ? 's' : ''} antes de usar este comando nuevamente.`,
                    ephemeral: true
                });
                return;
            }
        }

        try {
            logger.command(
                'slash',
                interaction.user.tag,
                interaction.commandName,
                interaction.guild?.name
            )

            if (command.type === 'slash-only' || command.type === 'unified') {
                await command.execute(interaction);
            } else if (command.type === 'hybrid') {
                await command.executeSlash(interaction);
            }

            if (client.cooldownManager) {
                client.cooldownManager.setCooldown(
                    interaction.commandName,
                    interaction.user.id
                );
            }

        } catch (error) {
            logger.error('InteractionCreate', `Error ejecutando ${interaction.commandName}`, error);

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
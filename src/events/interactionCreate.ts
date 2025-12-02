import { Events, MessageFlags, ChatInputCommandInteraction, Interaction } from "discord.js";
import { Event } from "../types/Events.js";
import { logger } from "../utils/logger.js";
import { BotClient } from "../types/BotClient.js";
import { checkPremiumAccess, getSubcommandFromInteraction } from "../utils/premiumHelpers.js";
import { createPremiumRequiredEmbed } from "../utils/premiumEmbeds.js";

/**
 * Handler del evento InteractionCreate.
 * Procesa comandos slash, autocomplete, select menus, verifica cooldowns y ejecuta el comando correspondiente.
 */
export default {
    name: Events.InteractionCreate,

    async execute(client: BotClient, interaction: Interaction) {
        // Manejar autocomplete
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            if ('autocomplete' in command && typeof command.autocomplete === 'function') {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    logger.error('InteractionCreate', `Error en autocomplete de ${interaction.commandName}`, error);
                }
            }
            return;
        }

        // Manejar select menus
        if (interaction.isStringSelectMenu()) {
            const command = client.commands.get(interaction.customId.split(':')[0]);

            if (!command) return;

            if ('handleSelectMenu' in command && typeof command.handleSelectMenu === 'function') {
                try {
                    await command.handleSelectMenu(interaction);
                } catch (error) {
                    logger.error('InteractionCreate', `Error en select menu de ${interaction.customId}`, error);
                }
            }
            return;
        }

        // Manejar botones
        if (interaction.isButton()) {
            const command = client.commands.get(interaction.customId.split(':')[0]);

            if (!command) return;

            if ('handleButton' in command && typeof command.handleButton === 'function') {
                try {
                    await command.handleButton(interaction);
                } catch (error) {
                    logger.error('InteractionCreate', `Error en botón de ${interaction.customId}`, error);
                }
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger.error('InteractionCreate', `Comando no encontrado: ${interaction.commandName}`);
            return;
        }

        if (command.type === 'prefix-only') {
            await interaction.reply({
                content: '❌ Este comando solo funciona con prefijo.',
                flags: MessageFlags.Ephemeral
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
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
        }

        const subcommand = getSubcommandFromInteraction(interaction, command);
        const requiredTier = subcommand?.premiumTier ||
            ('premiumTier' in command ? command.premiumTier : undefined);

        if (requiredTier) {
            const premiumCheck = await checkPremiumAccess(
                interaction.user.id,
                requiredTier,
                client
            );

            if (!premiumCheck.hasAccess) {
                const embed = createPremiumRequiredEmbed(
                    requiredTier,
                    premiumCheck.currentTier
                );
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
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
            );

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

            const replyOptions = {
                content: 'Hubo un error al ejecutar este comando.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }
        }
    }
} as Event;

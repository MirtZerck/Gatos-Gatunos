import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    Message,
    StringSelectMenuInteraction,
    ButtonInteraction,
    ComponentType,
    InteractionCollector,
} from "discord.js";
import { getDynamicColor } from "../utils/getDynamicColor.js";
import { CommandsService } from "../db_service/commandsService.js";
import { Command } from "../types/command.js";
import { CustomImageURLOptions } from "../types/embeds.js";
import { CommandData } from "../types/commandData.js";

export const customCommandsList: Command = {
    name: "commands",
    alias: ["comandos", "command-list"],

    async execute(message: Message, args: string[]) {
        const guildID = message.guild!.id;
        const commandsDB = new CommandsService(guildID);
        const dynamicColor = getDynamicColor(message.member!)

        const propsPerPage = 5;
        let currentPage = 1;

        const closeButton = createButton("cerrar", "Cerrar", ButtonStyle.Danger);
        const previousButton = createButton("previous", "Anterior", ButtonStyle.Primary, true);
        const nextButton = createButton("next", "Siguiente", ButtonStyle.Success, true);
        const backButton = createButton("back", "Volver", ButtonStyle.Secondary);

        const initialButtonComponents = new ActionRowBuilder<ButtonBuilder>().addComponents(
            closeButton,
            previousButton,
            nextButton
        );

        const commands = await commandsDB.getCommands();
        await renderCommandCategories(message, commands);

        async function renderCommandCategories(message: Message, commands: { [key: string]: CommandData }) {
            if (!commands || Object.keys(commands).length === 0) {
                await sendEmptyCategoriesEmbed(message);
                return;
            }

            const categories = Object.entries(commands);
            const [categoriesText, menuOptions] = setTextAndMenuCategoryOptions(categories);

            const embedCategories = new EmbedBuilder()
                .setAuthor({
                    name: message.member!.displayName,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle("Categorías de comandos")
                .setDescription(`Selecciona una categoría para ver sus comandos.\n${categoriesText}`)
                .setColor(dynamicColor)
                .setTimestamp();

            const response = await message.reply({
                embeds: [embedCategories],
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuOptions), initialButtonComponents],
                content: "Selecciona una categoría para ver sus comandos.",
            });

            const collector = response.createMessageComponentCollector({
                time: 5 * 60 * 1000,
                componentType: ComponentType.StringSelect,
            }) as unknown as InteractionCollector<StringSelectMenuInteraction | ButtonInteraction>;

            collector.on("collect", async (componentMessage) => {
                if (componentMessage.user.id !== message.author.id) {
                    await componentMessage.reply({
                        content: "No puedes interactuar con este mensaje",
                        ephemeral: true,
                    });
                    return;
                }

                if (componentMessage.isStringSelectMenu()) {
                    await handleCategorySelection(componentMessage, commands);
                } else if (componentMessage.isButton()) {
                    if (componentMessage.customId === "cerrar") {
                        await componentMessage.deferUpdate();
                        collector.stop("cerrado");
                    } else if (componentMessage.customId === "previous") {
                        await handleNavigation("previous", componentMessage);
                    } else if (componentMessage.customId === "next") {
                        await handleNavigation("next", componentMessage);
                    }
                }
            });

            collector.on("end", async (_, reason) => {
                const description = "Menú de categorías cerrado.";
                const embedOver = new EmbedBuilder()
                    .setAuthor({
                        name: message.member!.displayName,
                        iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                    })
                    .setDescription(description)
                    .setColor(dynamicColor)
                    .setTimestamp();

                await response.edit({
                    embeds: [embedOver],
                    components: [],
                    content: "",
                });
            });

            async function handleCategorySelection(componentMessage: StringSelectMenuInteraction, commands: { [key: string]: CommandData }) {
                await componentMessage.deferUpdate();
                const value = componentMessage.values[0];
                const categoryCommands = commands[value];

                if (!categoryCommands) {
                    await componentMessage.reply({ content: "No se encontraron comandos en esta categoría.", ephemeral: true });
                    return;
                }

                const [commandsText] = setTextAndMenuCommandOptions(categoryCommands, value);

                const embedCommands = new EmbedBuilder()
                    .setAuthor({
                        name: message.member!.displayName,
                        iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                    })
                    .setTitle(`Lista de comandos: ${value}`)
                    .setDescription(commandsText || "No hay comandos en esta categoría.")
                    .setColor(dynamicColor)
                    .setTimestamp();

                await response.edit({
                    embeds: [embedCommands],
                    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, previousButton, nextButton)],
                    content: "Selecciona una categoría para ver sus comandos.",
                });

                const categoryCollector = response.createMessageComponentCollector({
                    time: 5 * 60 * 1000,
                    componentType: ComponentType.Button,
                }) as unknown as InteractionCollector<ButtonInteraction>;

                categoryCollector.on("collect", async (componentMessage2) => {
                    if (componentMessage2.user.id !== message.author.id) {
                        await componentMessage2.reply({
                            content: "No puedes interactuar con este mensaje",
                            ephemeral: true,
                        });
                        return;
                    }

                    if (componentMessage2.isButton()) {
                        if (componentMessage2.customId === "back") {
                            await componentMessage2.deferUpdate();
                            await renderCommandCategories(message, commands);
                            categoryCollector.stop("back");
                        } else if (componentMessage2.customId === "previous") {
                            await handleNavigation("previous", componentMessage2);
                        } else if (componentMessage2.customId === "next") {
                            await handleNavigation("next", componentMessage2);
                        }
                    }
                });

                categoryCollector.on("end", async (_, reason) => {
                    if (reason === "back") return;
                    const description = "Menú de comandos cerrado.";
                    const embedOver = new EmbedBuilder()
                        .setAuthor({
                            name: message.member!.displayName,
                            iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                        })
                        .setDescription(description)
                        .setColor(dynamicColor)
                        .setTimestamp();

                    await response.edit({
                        embeds: [embedOver],
                        components: [],
                        content: "",
                    });
                });
            }

            async function handleNavigation(direction: "previous" | "next", componentMessage: ButtonInteraction) {
                await componentMessage.deferUpdate();
                currentPage += direction === "next" ? 1 : -1;
                const [newCommandsText, newMenuOptions] = setTextAndMenuCategoryOptions(categories);
                const embedCategories = new EmbedBuilder()
                    .setAuthor({
                        name: message.member!.displayName,
                        iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                    })
                    .setTitle("Categorías de comandos")
                    .setDescription(`Selecciona una categoría para ver sus comandos.\n${newCommandsText}`)
                    .setColor(dynamicColor)
                    .setTimestamp();

                nextButton.setDisabled(currentPage >= Math.ceil(categories.length / propsPerPage));
                previousButton.setDisabled(currentPage <= 1);

                await response.edit({
                    embeds: [embedCategories],
                    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, previousButton, nextButton), new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(newMenuOptions)],
                });
            }
        }

        function setTextAndMenuCategoryOptions(categories: [string, CommandData][]): [string, StringSelectMenuBuilder] {
            const menuOptions = new StringSelectMenuBuilder()
                .setCustomId("select")
                .setPlaceholder("Selecciona una categoría");

            let categoriesText = "";
            categories.forEach(([category, commands], index) => {
                categoriesText += `- **${category}**: ${Object.keys(commands).length} comandos\n`;

                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(`${category} (${Object.keys(commands).length})`.slice(0, 25))
                    .setValue(category);
                menuOptions.addOptions(option);
            });

            return [categoriesText, menuOptions];
        }

        function setTextAndMenuCommandOptions(categoryCommands: CommandData, category: string): [string] {
            let commandsText = "";
            const commands = Object.entries(categoryCommands).slice((currentPage - 1) * propsPerPage, currentPage * propsPerPage);
            commands.forEach(([name, value], index) => {
                const i = propsPerPage * (currentPage - 1) + index + 1;
                commandsText += `- **${i}. ${name}:** ${Object.keys(value).length} comandos\n`;
            });

            return [commandsText];
        }

        function createButton(customId: string, label: string, style: ButtonStyle, disabled = false): ButtonBuilder {
            return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled);
        }

        async function sendEmptyCategoriesEmbed(message: Message) {
            const embedEmptyCategories = new EmbedBuilder()
                .setTitle("Categorías de comandos")
                .setDescription("No hay categorías de comandos!")
                .setColor(dynamicColor)
                .setTimestamp();

            await message.reply({ embeds: [embedEmptyCategories] });
        }
    },
};

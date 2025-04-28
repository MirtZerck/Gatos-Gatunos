import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Message,
  GuildMember,
  ButtonInteraction,
  ComponentType,
  InteractionCollector,
  StringSelectMenuInteraction,
  TextChannel,
} from "discord.js";
import { ProposalService } from "../../db_service/proposalsService.js";
import { getMemberByFilter } from "../../constants/get-user.js";
import { CommandsService } from "../../db_service/commandsService.js";
import { PrefixCommand, CommandCategory } from "../../types/command.js";
import { CustomImageURLOptions } from "../../types/embeds.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";

export const acceptProposalCommand: PrefixCommand = {
  name: "prop-list",
  alias: ["list-prop", "props-list", "list-props", "prop-l"],
  description: "Muestra la lista de propuestas de comandos",
  category: CommandCategory.PROPOSALS,

  async execute(message: Message, args: string[]): Promise<void> {
    const guildID = message.guild!.id;
    const proposalsDB = new ProposalService(guildID);
    const commandsDB = new CommandsService(guildID);
    const dynamicColor = getDynamicColor(message.member!);

    if (
      !message.member!.permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      await message.reply("No tienes permisos para usar este comando.");
      return;
    }

    const propsPerPage = 5;
    let currentPage = 1;

    const closeButton = createButton("cerrar", "Cerrar", ButtonStyle.Danger);
    const previousButton = createButton(
      "anterior",
      "Anterior",
      ButtonStyle.Primary,
      true
    );
    const nextButton = createButton(
      "siguiente",
      "Siguiente",
      ButtonStyle.Success,
      true
    );

    const buttonComponents =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        closeButton,
        previousButton,
        nextButton
      );

    const proposals = await proposalsDB.getProposals();
    await renderProposals(message, proposals);

    async function renderProposals(message: Message, proposals: any[]) {
      if (!proposals || proposals.length === 0) {
        return sendEmptyProposalsEmbed(message, dynamicColor);
      }

      const pages = Math.ceil(proposals.length / propsPerPage);
      const [propText, menuOptions] = setTextAndMenuOptionsProps(proposals);

      const embedProps = new EmbedBuilder()
        .setAuthor({
          name: message.member!.displayName,
          iconURL: message.author.displayAvatarURL({
            dynamic: true,
          } as CustomImageURLOptions),
        })
        .setTitle("Propuestas de comandos")
        .setDescription(propText || "Sin descripción")
        .setColor(dynamicColor)
        .setTimestamp();

      const menuComponents =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          menuOptions
        );

      const response = await message.reply({
        embeds: [embedProps],
        components: [buttonComponents, menuComponents],
        content: "Selecciona una propuesta para ver sus detalles.",
      });

      const collector = response.createMessageComponentCollector({
        time: 5 * 60 * 1000,
        componentType: ComponentType.StringSelect,
      }) as unknown as InteractionCollector<StringSelectMenuInteraction | ButtonInteraction>;

      collector.on("collect", async (componentMessage) => {
        if (componentMessage.user.id !== message.author.id) {
          await componentMessage.reply({
            content: "No puedes interactuar con esta propuesta",
            ephemeral: true,
          });
          return;
        }

        if (componentMessage.isButton()) {
          switch (componentMessage.customId) {
            case "cerrar":
              await componentMessage.deferUpdate();
              collector.stop("cerrado");
              break;
            case "anterior":
              await handleNavigation("previous");
              break;
            case "siguiente":
              await handleNavigation("next");
              break;
          }
        } else if (componentMessage.isStringSelectMenu()) {
          await handleProposalSelection(componentMessage);
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "cerrado") {
          await sendClosedEmbed(response, message, dynamicColor);
        } else if (reason === "vacio") {
          await sendEmptyProposalsEmbed(response, dynamicColor);
        }
      });

      async function handleNavigation(direction: "previous" | "next") {
        currentPage += direction === "next" ? 1 : -1;
        const [newPropsText, newMenuOptions] =
          setTextAndMenuOptionsProps(proposals);
        embedProps.setDescription(newPropsText || "Sin descripción");
        nextButton.setDisabled(currentPage >= pages);
        previousButton.setDisabled(currentPage <= 1);
        buttonComponents.setComponents([
          closeButton,
          previousButton,
          nextButton,
        ]);

        await response.edit({
          embeds: [embedProps],
          components: [
            buttonComponents,
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              newMenuOptions
            ),
          ],
        });
      }

      async function handleProposalSelection(componentMessage: any) {
        await componentMessage.deferUpdate();
        const index = componentMessage.values[0];
        const prop = proposals.find((p) => p[0] === index)[1];
        const member = getMemberByFilter(message, prop.user);
        const propColor = getDynamicColor(message.member!);

        const embedProp = new EmbedBuilder()
          .setAuthor({
            name: `Propuesta de ${member?.displayName ?? "Unknown"}`,
            iconURL: member?.user.displayAvatarURL({
              dynamic: true,
            } as CustomImageURLOptions),
          })
          .setTitle("Propuesta")
          .setImage(prop.image)
          .setDescription(
            `**Categoría:** ${prop.category}\n**Imagen:** ${prop.image}` ||
              "Sin descripción"
          )
          .setColor(propColor)
          .setTimestamp();

        const backButton = createButton(
          "volver",
          "Volver",
          ButtonStyle.Secondary
        );
        const checkButton = createButton(
          "aceptar",
          "Aceptar",
          ButtonStyle.Success
        );
        const rejectButton = createButton(
          "rechazar",
          "Rechazar",
          ButtonStyle.Danger
        );

        const buttonPropComponents =
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            backButton,
            rejectButton,
            checkButton
          );

        await response.edit({
          embeds: [embedProp],
          components: [buttonPropComponents],
          content: "¿Qué deseas hacer con esta propuesta?",
        });

        const collector2 = response.createMessageComponentCollector({
          time: 3 * 60 * 1000,
        });

        collector2.on(
          "collect",
          async (componentMessage2: ButtonInteraction) => {
            if (componentMessage2.user.id !== message.author.id) {
              await componentMessage2.reply({
                content: "No puedes interactuar con esta propuesta",
                ephemeral: true,
              });
              return;
            }

            switch (componentMessage2.customId) {
              case "volver":
                await componentMessage2.deferUpdate();
                await response.edit({
                  embeds: [embedProps],
                  components: [buttonComponents, menuComponents],
                  content: "Selecciona una propuesta para ver sus detalles.",
                });
                collector2.stop("volver");
                break;
              case "aceptar":
                await handleProposalAction(
                  componentMessage2,
                  "aceptada",
                  index,
                  prop
                );
                await response.edit({
                  embeds: [embedProp],
                  components: [],
                  content: "Propuesta aceptada.",
                });
                collector2.stop("aceptada");
                break;
              case "rechazar":
                await handleProposalAction(
                  componentMessage2,
                  "rechazada",
                  index,
                  prop
                );
                await response.edit({
                  embeds: [embedProp],
                  components: [],
                  content: "Propuesta rechazada",
                });
                collector2.stop("rechazada");
                break;
            }
          }
        );

        collector2.on("end", async (collected, reason) => {
          if (reason === "volver") return;
          if (reason === "aceptada" || reason === "rechazada") {
            const updatedProposals = await proposalsDB.getProposals();
            if (!updatedProposals || updatedProposals.length === 0) {
              await sendEmptyProposalsEmbed(response, dynamicColor);
              return;
            }

            const [propText, menuOptions] =
              setTextAndMenuOptionsProps(updatedProposals);
            embedProps.setDescription(propText || "Sin descripción");
            menuComponents.setComponents(menuOptions);

            await response.edit({
              embeds: [embedProps],
              components: [buttonComponents, menuComponents],
              content: "Selecciona una propuesta para ver sus detalles.",
            });
            return;
          }

          const description = "Propuesta cancelada por falta de tiempo.";
          await sendClosedEmbed(response, message, dynamicColor, description);
        });
      }
    }

    function setTextAndMenuOptionsProps(
      proposals: any[]
    ): [string, StringSelectMenuBuilder] {
      const menuOptions = new StringSelectMenuBuilder()
        .setCustomId("select")
        .setPlaceholder("Selecciona una propuesta");

      let propText = "";
      const props = proposals.slice(
        (currentPage - 1) * propsPerPage,
        currentPage * propsPerPage
      );
      props.forEach((p, index) => {
        const prop = p[1];
        const id = p[0];
        const i = propsPerPage * (currentPage - 1) + index + 1;
        const user =
          getMemberByFilter(message, prop.user)?.displayName ?? "Unknown";

        let label = `${i}. ${prop.category} - Por: ${user}`;
        if (label.length > 25) label = label.slice(0, 22) + "...";

        let description = prop.date || "Sin descripción";
        if (description.length > 50)
          description = description.slice(0, 47) + "...";

        propText += `**${i}.** ${prop.category} - Propuesto por: ${user}\n`;

        const option = new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setValue(id)
          .setDescription(description);
        menuOptions.addOptions(option);
      });

      return [propText, menuOptions];
    }

    async function handleProposalAction(
      componentMessage: ButtonInteraction,
      action: string,
      index: string,
      prop: any
    ) {
      await componentMessage.deferUpdate();
      await proposalsDB.deleteProposal(index);
      if (action === "aceptada") {
        await commandsDB.setUserReplyCommand(prop.category, prop.image);
      }

      if (componentMessage.channel instanceof TextChannel) {
        await componentMessage.channel.send({
          content: `La propuesta ha sido ${action}.`,
        });
      }
    }

    function createButton(
      customId: string,
      label: string,
      style: ButtonStyle,
      disabled = false
    ): ButtonBuilder {
      return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled);
    }

    async function sendEmptyProposalsEmbed(message: Message | any, color: any) {
      const embedEmptyProposals = new EmbedBuilder()
        .setTitle("Propuestas")
        .setDescription("No hay propuestas!")
        .setColor(color)
        .setTimestamp();

      await message.reply({ embeds: [embedEmptyProposals] });
    }

    async function sendClosedEmbed(
      message: any,
      response: Message,
      color: any,
      description = "Menú de propuestas cerrado."
    ) {
      const embedOver = new EmbedBuilder()
        .setAuthor({
          name: response.member!.displayName,
          iconURL: response.author.displayAvatarURL({
            dynamic: true,
          } as CustomImageURLOptions),
        })
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

      await message.edit({ embeds: [embedOver], components: [], content: "" });
    }
  },
};

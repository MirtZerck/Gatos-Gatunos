import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    Message,
    TextChannel,
    GuildMember,
    ButtonInteraction,
    StringSelectMenuInteraction,
    ComponentType,
    InteractionCollector,
} from "discord.js";
import { ProposalService } from "../db_service/proposalsService.js";
import { isImage } from "../utils/utilsFunctions.js";
import { getDynamicColor } from "../utils/getDynamicColor.js";
import { CustomImageURLOptions } from "../types/embeds.js";
import { Command } from "../types/command.js";
import { Proposal } from "../types/proposal.js";

export const proposalCommand: Command = {
    name: "proposal",
    alias: ["prop", "propuesta"],

    async execute(message: Message, args: string[]) {
        try {
            if (args.length < 2) {
                await message.reply("Por favor, proporciona una categoría y una imagen. Ejemplo: `!propuesta categoria url_imagen`");
                return;
            }

            const category = args[0];
            const imageUrl = args[1];

            if (!imageUrl.startsWith("http")) {
                await message.reply("Por favor, proporciona una URL de imagen válida.");
                return;
            }

            const serverId = message.guild!.id;
            const serverName = message.guild!.name;
            const userId = message.author.id;
            const date = new Date().toISOString();

            const proposalService = new ProposalService(serverId);
            const proposal: Proposal = {
                category,
                image: imageUrl,
                user: userId,
                date,
                serverName
            };
            await proposalService.setProposal(proposal);

            const dynamicColor = getDynamicColor(message.member!);
            const embedProposal = new EmbedBuilder()
                .setAuthor({
                    name: message.member?.nickname ?? message.author.username,
                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                })
                .setTitle(`Propuesta Enviada`)
                .setDescription(`**Categoría:** ${category}\n**Imagen:** ${imageUrl}`)
                .setColor(dynamicColor)
                .setTimestamp();

            if (message.channel instanceof TextChannel) {
                await message.channel.send({ embeds: [embedProposal] });
            }
        } catch (error) {
            console.error("Error al ejecutar el comando proposalCommand:", error);
            await message.reply("Ocurrió un error al ejecutar el comando. Por favor, intenta nuevamente más tarde.");
        }
    },
};

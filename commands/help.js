import { EmbedBuilder } from "discord.js";
import { getReplys } from "../constants/answers.js";
import { getReplysDelete } from "../constants/answers_delete.js";
import { linksImages } from "../constants/links_images.js";
import { getArrayCommandsObject } from "../constants/lista_comandosxd.js";
import { prefijo } from "../constants/prefix.js";

export const helpCommand = {
  name: "help",
  alias: ["h"],

  async execute(message, args) {
    const option = args[0] ?? "1";
    const author = message.author;

    let description = "";
    let titulo = "";
    let objectReplys = {};

    if (option === "1") {
      objectReplys = getReplys(message, "", "", args);
      titulo = "Comandos de Respuesta";
    } else if (option === "2") {
      objectReplys = getReplysDelete(message, "", "", args);
      titulo = "Comandos de Respuesta Anónima";
    } else if (option === "3") {
      objectReplys = linksImages;
      titulo = "Comandos de Imágen";
    } else if (option === "4") {
      objectReplys = getArrayCommandsObject();
      titulo = "Comandos de Utilidad";
    } else {
      return message.reply("Ya no hay más xd");
    }
    const replysKeys = Object.keys(objectReplys);

    if (option === "4") {
      replysKeys.forEach((keys) => {
        description += `\n > - ${keys}, [${objectReplys[keys]}] `;
      });
    } else {
      replysKeys.forEach((keys) => {
        description += `\n > - ${keys} `;
      });
    }

    const embedHelp = new EmbedBuilder()
      .setAuthor({
        name: message.member.nickname ?? message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(titulo)
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setDescription(`**>> Estos son los comandos actuales** ${description}`)
      .setColor(0x81d4fa)
      .setFooter({ text: `${prefijo}help 1-4` })
      .setTimestamp();

    message.channel.send({ embeds: [embedHelp] });
  },
};

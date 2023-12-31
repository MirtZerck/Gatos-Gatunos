import { db } from "../michi.js";
import { getRankXpellitDiscord } from "../constants/clanService.js";
import { EmbedBuilder } from "discord.js";
import {
  rolGatosGatunosXpellit,
  rolIDClanPRuebas,
  rolXpellGames,
} from "../constants/rolesID.js";

export const xpellitRankingServidor = {
  name: "rankingservidor",
  alias: ["rankserver", "rs"],

  async execute(message, args) {
    if (!message.member.roles.cache.get(rolXpellGames)) return;

    const rankingDiscord = await getRankXpellitDiscord();
    if (!rankingDiscord) return message.reply("No existe todavía");
    const rank = Object.entries(rankingDiscord);

    let puestos = "";
    //ordenar rank de mayor a menor
    rank.sort((a, b) => {
      return b[1].puntos - a[1].puntos;
    });

    rank.forEach((val, i) => {
      //val[0]: key (ID)
      //val[1]: value({nickname, puntos})
      puestos += `**${i + 1}.** ${val[1].nickname}: ${val[1].puntos}\n`;
      //1. Si: 3\n2. MirtZerck: 1
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: message.member.nickname ?? message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`Ranking miembros más activos en Discord`)
      .setDescription(`${puestos}`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setColor(0x81d4fa)
      .setFooter({ text: "Este es el ranking de actividad del servidor" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};

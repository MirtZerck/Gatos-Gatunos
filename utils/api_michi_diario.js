import { Colors, EmbedBuilder } from "discord.js";
import { getRandomNumber } from "./utilsFunctions.js";
import { buenosNyas } from "../constants/buenos_nyas.js";
import { Api_Michi_URL } from "../constants/apis_url.js";
import { obtenerDataApi } from "./apiserver.js";
/* export async function obtenerMichiDiario() {
  const url = `https://api.thecatapi.com/v1/images/search`;
  const respuesta = await fetch(url);
  const data = await respuesta.json();
  return data[0].url;  */

//AXIOS
/* GET
POST -> usuario: 'mirt' contraseña: '1234';
PATCH/PUT -> EDITAR;
REMOVE/DELETE -> ELIMINAR; */

export async function obtenerEmbedMichiDiario() {
  const response = await obtenerDataApi(Api_Michi_URL);
  const imgUrl = response[0].url;
  const index = getRandomNumber(0, buenosNyas.length - 1);
  const mensaje = buenosNyas[index];

  const embedMichiDiario = new EmbedBuilder()
    .setAuthor({
      name: "Gatos Gatunos",
      iconURL:
        "https://fotografias.lasexta.com/clipping/cmsimages02/2019/01/25/DB41B993-B4C4-4E95-8B01-C445B8544E8E/98.jpg?crop=4156,2338,x0,y219&width=1900&height=1069&optimize=high&format=webply",
    })
    .setDescription(mensaje)
    .setTimestamp()
    .setImage(imgUrl)
    .setColor(0x81d4fa);
  return embedMichiDiario;
}

export async function enviarGatoALas(hora, canal) {
  const now = new Date();
  const targetTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hora,
    0,
    0
  );

  let diferencia = targetTime - now;

  if (diferencia < 0) {
    targetTime.setDate(targetTime.getDate() + 1);
    diferencia = targetTime - now;
  }

  const embed = await obtenerEmbedMichiDiario();

  setTimeout(() => {
    canal.send({embeds: [embed]});

    enviarGatoALas(hora, canal);
  }, diferencia);
}

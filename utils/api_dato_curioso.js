import {
  API_DATO_CURIOSO_URL,
  API_TRADUCTOR_URL,
} from "../constants/apis_url.js";
import { obtenerTraduccionEnEs } from "./api_traductor.js";
import { obtenerDataApi, solicitarPostAPI } from "./apiserver.js";

export async function obtenerDatoCurioso() {
  const respuesta = await obtenerDataApi(API_DATO_CURIOSO_URL);
  const fact = respuesta.fact;
  const dato = await obtenerTraduccionEnEs(fact);
  return dato;
}

import { createServer } from "node:http";
import { saludar } from "./saludo.mjs";

const CONTENT_TYPE_JSON = "application/json; charset=utf-8";
const LARGO_MAXIMO_NOMBRE = 100;

function enviarJson(res, status, cuerpo, headers = {}) {
  res.writeHead(status, { "Content-Type": CONTENT_TYPE_JSON, ...headers });
  res.end(JSON.stringify(cuerpo));
}

function enviarError(res, status, code, message, headers = {}) {
  enviarJson(res, status, { error: { code, message } }, headers);
}

export function crearServidor() {
  return createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname !== "/saludo") {
      enviarError(res, 404, "RUTA_NO_ENCONTRADA", "Ruta no encontrada");
      return;
    }

    if (req.method !== "GET") {
      enviarError(res, 405, "METODO_NO_PERMITIDO", "Método no permitido", { Allow: "GET" });
      return;
    }

    const nombreRecortado = (url.searchParams.get("nombre") ?? "").trim();

    if (nombreRecortado.length > LARGO_MAXIMO_NOMBRE) {
      enviarError(res, 400, "NOMBRE_DEMASIADO_LARGO", "El nombre es demasiado largo");
      return;
    }

    try {
      const saludo = saludar(nombreRecortado);
      enviarJson(res, 200, { saludo });
    } catch (error) {
      if (error.message === "El nombre es obligatorio") {
        enviarError(res, 400, "NOMBRE_OBLIGATORIO", "El nombre es obligatorio");
        return;
      }
      throw error;
    }
  });
}

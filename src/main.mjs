import { crearServidor } from "./servidor.mjs";

const puerto = Number(process.env.PORT) || 3000;
const servidor = crearServidor();

servidor.listen(puerto);

process.on("SIGTERM", () => {
  servidor.close(() => process.exit(0));
});

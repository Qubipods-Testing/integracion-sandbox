export function saludar(nombre) {
  const nombreRecortado = typeof nombre === "string" ? nombre.trim() : "";

  if (nombreRecortado === "") {
    throw new Error("El nombre es obligatorio");
  }

  return `Hola, ${nombreRecortado}.`;
}

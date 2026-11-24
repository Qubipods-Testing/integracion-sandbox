import { test } from "node:test";
import assert from "node:assert/strict";
import { saludar } from "../src/saludo.mjs";

test("saluda con un nombre simple", () => {
  assert.strictEqual(saludar("Ana"), "Hola, Ana.");
});

test("recorta espacios alrededor del nombre", () => {
  assert.strictEqual(saludar("  Luis  "), "Hola, Luis.");
});

test("lanza error si el nombre es vacío o solo espacios", () => {
  assert.throws(() => saludar(""), { message: "El nombre es obligatorio" });
  assert.throws(() => saludar("   "), { message: "El nombre es obligatorio" });
});

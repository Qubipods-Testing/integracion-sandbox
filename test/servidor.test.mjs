import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { crearServidor } from "../src/servidor.mjs";

let servidor;
let baseUrl;

before(async () => {
  servidor = crearServidor();
  await new Promise((resolve) => servidor.listen(0, resolve));
  baseUrl = `http://localhost:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
});

function observar(ejemplo, status, body) {
  const dir = new URL("../.agentos/contracts/observed/saludo-api/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL(`${ejemplo}.json`, dir), JSON.stringify({ status, body }));
}

test("GET /saludo?nombre=Ana responde 200 con el saludo", async () => {
  const res = await fetch(`${baseUrl}/saludo?nombre=Ana`);
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(body, { saludo: "Hola, Ana." });
  assert.strictEqual(res.headers.get("content-type"), "application/json; charset=utf-8");
  observar("ana", res.status, body);
});

test("GET /saludo?nombre=%20%20 responde 400 NOMBRE_OBLIGATORIO", async () => {
  const res = await fetch(`${baseUrl}/saludo?nombre=${encodeURIComponent("  ")}`);
  const body = await res.json();
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(body, {
    error: { code: "NOMBRE_OBLIGATORIO", message: "El nombre es obligatorio" },
  });
  observar("vacio", res.status, body);
});

test("GET /saludo con nombre de más de 100 caracteres responde 400 NOMBRE_DEMASIADO_LARGO", async () => {
  const nombreLargo = "a".repeat(101);
  const res = await fetch(`${baseUrl}/saludo?nombre=${nombreLargo}`);
  const body = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(body.error.code, "NOMBRE_DEMASIADO_LARGO");
  observar("demasiado-largo", res.status, body);
});

test("POST /saludo responde 405 con Allow: GET", async () => {
  const res = await fetch(`${baseUrl}/saludo`, { method: "POST" });
  const body = await res.json();
  assert.strictEqual(res.status, 405);
  assert.strictEqual(res.headers.get("allow"), "GET");
  assert.strictEqual(body.error.code, "METODO_NO_PERMITIDO");
  observar("metodo-no-permitido", res.status, body);
});

test("GET /otra responde 404 RUTA_NO_ENCONTRADA", async () => {
  const res = await fetch(`${baseUrl}/otra`);
  const body = await res.json();
  assert.strictEqual(res.status, 404);
  assert.strictEqual(body.error.code, "RUTA_NO_ENCONTRADA");
  observar("no-encontrada", res.status, body);
});

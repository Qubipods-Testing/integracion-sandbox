# Proposal: API de saludo publicada como contrato

## Why

El DERCAS DEF-2026-003 v1.0.0 pide publicar el saludo existente (`saludar`,
de REQ-2026-002) como una API HTTP que otros servicios puedan consumir sin
reimplementarla, con su contrato `saludo-api` 1.0.0 publicado en el catálogo
para que los consumidores construyan contra él. Hoy `saludar(nombre)` solo es
importable dentro de este repo; no hay forma de pedirlo por HTTP.

## What Changes

- Agregar `src/servidor.mjs` con `crearServidor()`, que devuelve un
  `http.Server` (sin escuchar) que expone `GET /saludo?nombre=<nombre>`.
- Agregar `src/main.mjs` como punto de arranque: levanta el servidor de
  `crearServidor()` en el puerto de la variable `PORT` (por defecto 3000) y
  cierra ordenadamente ante `SIGTERM`.
- Agregar `test/servidor.test.mjs` con pruebas `node:test` + `fetch` contra
  un puerto efímero, cubriendo los cuatro criterios de aceptación de
  US-01.01.
- Agregar el script `"start": "node src/main.mjs"` a `package.json`,
  manteniendo `"test": "node --test"` y sin `dependencies` (NFR-01).
- Publicar el contrato `saludo-api` (tipo `http-api`, OpenAPI 3.1, versión
  inicial 1.0.0) en `openspec/changes/req-2026-003-saludo-api-http/contracts/saludo-api.contract.json`.

## Capabilities

### New Capabilities
- `saludo-http`: exponer `saludar(nombre)` como una API HTTP (`GET /saludo`)
  con sus respuestas de éxito y error, consumible por otros servicios.

### Modified Capabilities
(ninguna — `saludo` conserva su comportamiento actual; `saludo-http` lo
reutiliza sin cambiarlo.)

## Acceptance Criteria (trazadas al DERCAS)

- AC-01.01.1: `GET /saludo?nombre=Ana` responde 200 con
  `{"saludo":"Hola, Ana."}` y `Content-Type: application/json; charset=utf-8`.
- AC-01.01.2: `GET /saludo?nombre=%20%20` responde 400 con el error
  `NOMBRE_OBLIGATORIO`.
- AC-01.01.3: `POST /saludo` responde 405 con `Allow: GET`.
- AC-01.01.4: `GET /otra` responde 404 con el formato de error estándar.
- NFR-01: `package.json` no declara `dependencies`.

## Impact

Serie única (A), un solo PR de construcción:
- Afecta: `src/servidor.mjs` (nuevo), `src/main.mjs` (nuevo),
  `test/servidor.test.mjs` (nuevo), `package.json` (agrega script `start`),
  `openspec/changes/req-2026-003-saludo-api-http/contracts/saludo-api.contract.json` (nuevo).
- Reutiliza sin modificar: `src/saludo.mjs` (`saludar`).
- No afecta rutas ni contratos existentes: es el primer contrato HTTP de
  este repo.
- Validación: `npm test` (Node 22, `node:test` + `fetch` global) corre en el
  Qubipod de este entorno sin dependencias ni servicios externos.

## Non-goals

- No se agregan más rutas, versiones de API, autenticación ni CORS.
- No hay interfaz gráfica (ver Interfaz solicitada en el DERCAS): no se
  incluye sección UI ni mockup.
- No se agrega registro de peticiones (logging) en esta línea base (ADR-13).
- No se usa PostgreSQL ni Docker: esta línea base no requiere persistencia
  ni contenedores.

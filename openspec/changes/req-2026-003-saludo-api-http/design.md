# Diseño: API de saludo publicada como contrato

## Decisiones (DERCAS DEF-2026-003 v1.0.0)

- **ADR-01 · Servidor con node:http** (aprobada): "Usar el módulo node:http
  de Node 22 para el servidor, sin frameworks. El repo no tiene dependencias
  y NFR-01 lo exige; un framework sumaría superficie de ataque y
  mantenimiento para un solo endpoint." Se implementa tal cual:
  `src/servidor.mjs` usa únicamente `node:http` y `node:url`
  (`URLSearchParams`), ambos del core de Node, sin dependencias de npm.
- **ADR-02 · Módulo ES y función crearServidor()** (aprobada): "Exportar
  crearServidor() desde src/servidor.mjs que devuelve un http.Server sin
  escuchar. Las pruebas lo levantan en un puerto efímero y el arranque real
  vive en src/main.mjs." `crearServidor()` construye el servidor con
  `http.createServer(...)` y lo devuelve sin llamar a `.listen()`;
  `test/servidor.test.mjs` llama `servidor.listen(0)` para un puerto
  efímero, y `src/main.mjs` es el único lugar que escucha en el puerto real.
- **ADR-03 · Puerto por variable PORT** (aprobada): "El puerto sale de la
  variable de entorno PORT con 3000 por defecto." `src/main.mjs` usa
  `const port = Number(process.env.PORT) || 3000`.
- **ADR-04 · Ruta única GET /saludo** (aprobada): "El contrato expone solo
  GET /saludo. Cualquier otra ruta responde 404 con el cuerpo de error
  estándar." Implementado: cualquier `pathname` distinto de `/saludo`
  responde 404 con `RUTA_NO_ENCONTRADA` (ver spec `saludo-http`, requisito
  "Responder 404 fuera del contrato").
- **ADR-05 · Parámetro de consulta nombre** (aprobada): "El nombre llega en
  el query string ?nombre=. Se decodifica con URLSearchParams, se recorta
  con trim() y se pasa a saludar(); no se aceptan cuerpos en GET."
  `servidor.mjs` lee `new URL(req.url, "http://localhost").searchParams`,
  obtiene `nombre`, lo recorta y lo pasa a `saludar()`; no se lee el cuerpo
  de la petición.
- **ADR-06 · Respuesta JSON con campo saludo** (aprobada): "La respuesta
  exitosa es 200 con {"saludo":"Hola, <nombre>."}." Implementado literal:
  el cuerpo 200 es `{"saludo": saludar(nombreRecortado)}`.
- **ADR-07 · Content-Type con charset** (aprobada): "Todas las respuestas
  llevan Content-Type: application/json; charset=utf-8." Toda respuesta
  (200, 400, 404, 405) se escribe con ese header exacto.
- **ADR-08 · Error 400 para nombre vacío** (aprobada): "Si saludar() lanza
  «El nombre es obligatorio», el servidor responde 400 con
  {"error":{"code":"NOMBRE_OBLIGATORIO","message":"El nombre es
  obligatorio"}}." `servidor.mjs` llama a `saludar()` (sin modificarla, de
  REQ-2026-002) y en su `catch` mapea el mensaje `"El nombre es
  obligatorio"` a ese cuerpo 400.
- **ADR-09 · Formato único de error** (aprobada): "Todos los errores usan
  {"error":{"code","message"}} con code en MAYÚSCULAS_CON_GUION_BAJO."
  Los cuatro códigos usados (`NOMBRE_OBLIGATORIO`,
  `NOMBRE_DEMASIADO_LARGO`, `METODO_NO_PERMITIDO`, `RUTA_NO_ENCONTRADA`)
  siguen ese formato y comparten una única función de respuesta de error en
  `servidor.mjs`.
- **ADR-10 · Largo máximo de 100 caracteres** (aprobada): "Un nombre de más
  de 100 caracteres después del trim responde 400 con code
  NOMBRE_DEMASIADO_LARGO." Esta validación es de la capa HTTP (un límite de
  contrato, no de negocio): `servidor.mjs` comprueba
  `nombreRecortado.length > 100` **antes** de llamar a `saludar()` y
  responde 400 directamente si se excede; `saludar()` (REQ-2026-002) no se
  modifica.
- **ADR-11 · 405 para otros métodos** (aprobada): "Cualquier método
  distinto de GET sobre /saludo responde 405 con el header Allow: GET y el
  error METODO_NO_PERMITIDO." Implementado: si `pathname === "/saludo"` y
  `req.method !== "GET"`, la respuesta es 405 con `Allow: GET` y ese cuerpo.
- **ADR-12 · Sin CORS** (aprobada): "No se envían headers CORS." Ningún
  header `Access-Control-*` se escribe en ninguna respuesta.
- **ADR-13 · Sin registro de peticiones** (aprobada): "El servidor no
  escribe logs por petición en esta línea base." `servidor.mjs` no llama a
  `console.log` ni a ningún logger por petición.
- **ADR-14 · Pruebas con fetch contra puerto efímero** (aprobada): "Las
  pruebas de node:test levantan crearServidor() en el puerto 0 y llaman con
  fetch global de Node 22." `test/servidor.test.mjs` hace
  `servidor.listen(0)`, lee el puerto asignado de `servidor.address().port`
  y llama con el `fetch` global; cierra el servidor en cada prueba o al
  final con `servidor.close()`.
- **ADR-15 · Contrato saludo-api versión 1.0.0** (aprobada): "El contrato se
  publica como http-api con OpenAPI 3.1, versión 1.0.0, con la ruta, el
  parámetro, las respuestas 200, 400, 404 y 405 y sus esquemas." Ver
  sección `## Contratos` más abajo.
- **ADR-16 · Compatibilidad hacia atrás** (aprobada): "Cambios futuros solo
  agregan campos opcionales; quitar o renombrar el campo saludo o los
  códigos de error es un cambio mayor que pide una versión 2.0.0 del
  contrato." Registrada como regla para futuras revisiones de este
  contrato; no implica código en esta línea base.
- **ADR-17 · Cierre ordenado** (aprobada): "src/main.mjs atiende SIGTERM
  cerrando el servidor con server.close() antes de salir." `src/main.mjs`
  registra `process.on("SIGTERM", () => servidor.close(() => process.exit(0)))`.
- **ADR-18 · Script start en package.json** (aprobada): "Se agrega el
  script "start": "node src/main.mjs" y se mantiene "test": "node --test".
  Sin build." `package.json` agrega `"start": "node src/main.mjs"` junto al
  `"test"` existente; no se agrega paso de build.

## Comportamiento de `GET /saludo`

1. Si el método no es `GET` → 405, `Allow: GET`, `METODO_NO_PERMITIDO`
   (ADR-11).
2. Si la ruta no es `/saludo` → 404, `RUTA_NO_ENCONTRADA` (ADR-04).
3. Se lee `nombre` del query string con `URLSearchParams` y se recorta con
   `trim()` (ADR-05).
4. Si el nombre recortado tiene más de 100 caracteres → 400,
   `NOMBRE_DEMASIADO_LARGO` (ADR-10).
5. Se llama a `saludar(nombreRecortado)` (sin modificar, de REQ-2026-002).
   Si lanza `Error("El nombre es obligatorio")` → 400, `NOMBRE_OBLIGATORIO`
   (ADR-08).
6. En caso contrario → 200, `{"saludo": <resultado de saludar()>}`
   (ADR-06).
7. Toda respuesta lleva `Content-Type: application/json; charset=utf-8`
   (ADR-07) y ningún header CORS (ADR-12).

## Riesgos

- Ninguno significativo: el servidor no tiene estado ni I/O más allá del
  socket HTTP; `saludar()` ya está probada por REQ-2026-002 y no se toca.
- Riesgo menor: si una solicitud futura cambia el mensaje de error de
  `saludar()`, el mapeo del paso 5 dejaría de reconocerlo y respondería un
  error genérico en vez de 400; las pruebas de este cambio fijan el mensaje
  exacto para detectarlo.

## Entorno de ejecución del Qubipod

El equipo declaró Runtimes: Node 22, Bases de datos: PostgreSQL 16, Docker:
sí. Esta línea base no usa base de datos ni contenedores: es un servidor
HTTP en memoria sin persistencia. La única dependencia real es `node:http`
y el `fetch` global, ambos incluidos en Node 22 sin instalación adicional.
`npm test` corre directamente en este Qubipod con `node --test`, sin
RollForward de runtime, sin Docker y sin PostgreSQL. No hay pruebas que
deban limitarse a la CI del repo.

## Trazabilidad criterio → verificación

| Criterio | Verificación |
|---|---|
| AC-01.01.1 | `test/servidor.test.mjs`: `GET /saludo?nombre=Ana` → 200, body `{"saludo":"Hola, Ana."}`, `Content-Type: application/json; charset=utf-8` |
| AC-01.01.2 | `test/servidor.test.mjs`: `GET /saludo?nombre=%20%20` → 400, `error.code === "NOMBRE_OBLIGATORIO"` |
| AC-01.01.3 | `test/servidor.test.mjs`: `POST /saludo` → 405, header `Allow: GET` |
| AC-01.01.4 | `test/servidor.test.mjs`: `GET /otra` → 404, cuerpo `{"error":{"code","message"}}` |
| ADR-10 (largo máximo) | `test/servidor.test.mjs`: `GET /saludo?nombre=` + 101 letras → 400, `error.code === "NOMBRE_DEMASIADO_LARGO"` |
| NFR-01 | Revisión manual/CI de `package.json`: no contiene `dependencies` |

## Contratos

- **saludo-api** (`contracts/saludo-api.contract.json`, parte `http-api`,
  id `api`) — versión inicial 1.0.0, sin consumidores todavía (ninguno
  declarado en la instrucción). Publica `GET /saludo` con el parámetro de
  consulta `nombre` (string, opcional en el esquema OpenAPI porque su
  ausencia es un caso de error controlado, no una petición inválida) y las
  respuestas `200` (`{"saludo": string}`), `400` (`NOMBRE_OBLIGATORIO` o
  `NOMBRE_DEMASIADO_LARGO`), `404` (`RUTA_NO_ENCONTRADA`) y `405`
  (`METODO_NO_PERMITIDO`), todas con el esquema de error
  `{"error":{"code","message"}}` (ADR-09).
- **Casing**: el contrato no declara `casing` para la parte `api`. No hay
  evidencia en el repo de una convención de serialización (no hay
  serializador ni librería JSON que imponga un casing): las respuestas
  `{"saludo": ...}` y `{"error":{"code","message"}}` se arman a mano con
  `JSON.stringify` en `servidor.mjs`, y sus campos (`saludo`, `error`,
  `code`, `message`) son palabras simples de una sola forma, sin partes
  compuestas que distingan camelCase de snake_case. **Pregunta abierta para
  el AI Architect**: confirmar el casing a declarar en una futura versión
  del contrato si se agregan campos compuestos (por ejemplo
  `nombreOriginal` vs `nombre_original`).
- No rompe a nadie: es la primera versión del contrato, sin consumidores
  previos.

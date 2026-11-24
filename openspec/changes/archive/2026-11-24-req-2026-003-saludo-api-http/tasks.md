# Tareas

## Serie A — Servidor HTTP, pruebas y contrato

- [x] 1. Escribir `test/servidor.test.mjs` (rojo primero) con los casos:
      nombre simple (200), nombre vacío/solo espacios (400
      `NOMBRE_OBLIGATORIO`), nombre de más de 100 caracteres (400
      `NOMBRE_DEMASIADO_LARGO`), `POST /saludo` (405 con `Allow: GET`),
      `GET /otra` (404).
- [x] 2. Implementar `src/servidor.mjs` exportando `crearServidor()` hasta
      que las pruebas pasen, reutilizando `saludar()` de `src/saludo.mjs`
      sin modificarla.
- [x] 3. Implementar `src/main.mjs`: levanta `crearServidor()` en
      `process.env.PORT || 3000` y cierra ordenadamente ante `SIGTERM`.
- [x] 4. Agregar el script `"start": "node src/main.mjs"` a
      `package.json`, sin agregar `dependencies`.
- [x] 5. Ejecutar `npm test` y confirmar que todos los casos pasan.
- [x] 6. Escribir `contracts/saludo-api.contract.json` (versión inicial,
      sin `version` ni `hash`) y validarlo con
      `node .claude/skills/generate-spec/check-contracts.mjs openspec/changes/req-2026-003-saludo-api-http/contracts/*.contract.json`
      hasta que no reporte errores.
- [x] 7. Confirmar que `package.json` no tiene `dependencies` (NFR-01).

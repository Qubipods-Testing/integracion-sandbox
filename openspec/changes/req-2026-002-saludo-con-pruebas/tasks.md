# Tareas

## Serie A — Función saludar y pruebas

- [x] 1. Crear `package.json` con `"type": "module"`, sin `dependencies`, y
      script `"test": "node --test"`.
- [x] 2. Escribir `test/saludo.test.mjs` (rojo primero) con los tres casos:
      nombre simple, nombre con espacios, nombre vacío/solo espacios.
- [x] 3. Implementar `src/saludo.mjs` exportando `saludar(nombre)` hasta que
      las pruebas pasen.
- [x] 4. Ejecutar `npm test` y confirmar que los tres casos pasan.
- [x] 5. Confirmar que `package.json` no tiene `dependencies` (NFR-01).

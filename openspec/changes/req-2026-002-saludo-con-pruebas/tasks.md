# Tareas

## Serie A — Función saludar y pruebas

- [ ] 1. Crear `package.json` con `"type": "module"`, sin `dependencies`, y
      script `"test": "node --test"`.
- [ ] 2. Escribir `test/saludo.test.mjs` (rojo primero) con los tres casos:
      nombre simple, nombre con espacios, nombre vacío/solo espacios.
- [ ] 3. Implementar `src/saludo.mjs` exportando `saludar(nombre)` hasta que
      las pruebas pasen.
- [ ] 4. Ejecutar `npm test` y confirmar que los tres casos pasan.
- [ ] 5. Confirmar que `package.json` no tiene `dependencies` (NFR-01).

# Propuesta: Función de saludo con pruebas

## Why

El DERCAS DEF-2026-002 v1.0.0 pide una función reutilizable de saludo que otros
scripts del repo puedan importar, con pruebas automatizadas que demuestren que
cumple las reglas de formato y validación acordadas. Hoy el repo no tiene
ningún código fuente ni pruebas: es la línea base (INCR-01).

## What Changes

- Agregar `src/saludo.mjs` con la función `saludar(nombre)`.
- Agregar `test/saludo.test.mjs` con pruebas `node:test` que cubren los tres
  criterios de aceptación de US-01.01.
- Agregar `package.json` con `"type": "module"` y el script `"test"`, sin
  dependencias externas (NFR-01).

## Capabilities

- **saludo**: generar un saludo de texto a partir de un nombre, con
  normalización de espacios y validación de nombre obligatorio.

## Acceptance Criteria (trazadas al DERCAS)

- AC-01.01.1: `saludar("Ana")` devuelve `"Hola, Ana."`.
- AC-01.01.2: `saludar("  Luis  ")` devuelve `"Hola, Luis."` (espacios recortados).
- AC-01.01.3: `saludar("")` (o solo espacios) lanza `Error("El nombre es obligatorio")`.
- NFR-01: `package.json` no declara `dependencies`.

## Impact

Serie única (A), un solo PR de construcción:
- Afecta: `src/saludo.mjs` (nuevo), `test/saludo.test.mjs` (nuevo),
  `package.json` (nuevo).
- No afecta código ni rutas existentes: el repo no tenía fuente previa.
- Validación: `npm test` (Node 22, `node:test`) corre en el Qubipod de este
  entorno sin dependencias ni servicios externos.

## Non-goals

- No se agregan más funciones de saludo, i18n, ni CLI.
- No hay interfaz gráfica (ver Interfaz solicitada en el DERCAS): no se
  incluye sección UI ni mockup.
- No se usa PostgreSQL ni Docker: esta línea base no requiere persistencia ni
  contenedores.

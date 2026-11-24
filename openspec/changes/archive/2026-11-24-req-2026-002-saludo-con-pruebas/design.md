# Diseño: Función de saludo con pruebas

## Decisiones (DERCAS DEF-2026-002 v1.0.0)

- **Arquitectura (aprobada)**: "script → import { saludar } from \"./src/saludo.mjs\" → texto".
  Se mantiene literal: `saludar` es una función pura, sin efectos secundarios,
  exportada como named export desde un módulo ES.
- **Sistema integracion-sandbox (aprobado)**: "Módulo ES src/saludo.mjs, pruebas
  y package.json con \"type\": \"module\"" — dueño: Bryan Testing. Se implementa
  tal cual: `package.json` declara `"type": "module"`, y tanto el módulo como
  el archivo de pruebas usan sintaxis `import`/`export`.
- **NFR-01 (aprobado)**: "Sin dependencias externas de npm — cómo se comprueba:
  package.json sin dependencies". `package.json` solo declara `name`, `version`,
  `type` y el script `test`; no lleva bloque `dependencies` ni `devDependencies`.

## Comportamiento de `saludar(nombre)`

1. Recorta espacios al inicio/fin del nombre (`String.prototype.trim`).
2. Si el resultado recortado es una cadena vacía (incluye `undefined`/espacios
   solos), lanza `new Error("El nombre es obligatorio")`.
3. En caso contrario devuelve `` `Hola, ${nombreRecortado}.` ``.

Esto cubre AC-01.01.1 (nombre simple), AC-01.01.2 (recorte de espacios) y
AC-01.01.3 (validación de obligatoriedad) sin ramas adicionales.

## Riesgos

- Ninguno significativo: función pura, sin I/O, sin estado compartido.
- Riesgo menor: que una implementación futura cambie el mensaje exacto del
  saludo o del error rompería los scripts consumidores; las pruebas fijan el
  texto literal para evitar esa deriva silenciosa.

## Entorno de ejecución del Qubipod

El equipo declaró Runtimes: Node 22, Bases de datos: PostgreSQL 16, Docker: sí.
Esta línea base no usa base de datos ni contenedores: es una función pura en
memoria. La única dependencia real es el runtime `node:test`, incluido en
Node 22 sin instalación adicional. `npm test` corre directamente en este
Qubipod con `node --test`, sin RollForward de runtime, sin Docker y sin
PostgreSQL. No hay pruebas que deban limitarse a la CI del repo.

## Trazabilidad criterio → verificación

| Criterio | Verificación |
|---|---|
| AC-01.01.1 | `test/saludo.test.mjs`: `assert.strictEqual(saludar("Ana"), "Hola, Ana.")` |
| AC-01.01.2 | `test/saludo.test.mjs`: `assert.strictEqual(saludar("  Luis  "), "Hola, Luis.")` |
| AC-01.01.3 | `test/saludo.test.mjs`: `assert.throws(() => saludar(""), { message: "El nombre es obligatorio" })` |
| NFR-01 | Revisión manual/CI de `package.json`: no contiene `dependencies` |

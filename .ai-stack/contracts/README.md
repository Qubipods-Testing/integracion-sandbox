# Contratos entre pods

Esta carpeta es la copia de los contratos que este repo publica o consume. La publica la plataforma Qubipods: es la
fuente de verdad y llega con el kit. **No edites estos archivos**: un cambio de contrato se pide en Qubipods Studio
(solicitud de cambio) y llega en una versión nueva.

- `index.json`: cada contrato con su versión, su hash y el rol de este repo (`provider` o `consumer`).
- `<slug>/contract.json`: el contrato completo (formato en `FORMAT.md`).
- `<slug>/openapi.json`: la parte `http-api` suelta, para visores y generadores.
- `<slug>/fixtures/<ejemplo>.json` (consumidor): la petición y la respuesta de cada ejemplo, `{ operationId, request, response }`.
- `check.mjs`: la verificación (`node .ai-stack/contracts/check.mjs --role provider|consumer`). La corre la entrega del Qubipod.
- `mock-server.mjs` (consumidor): un servidor que responde los fixtures (`node .ai-stack/contracts/mock-server.mjs --port 4010`).

## Lo observado

Las pruebas del repo dejan lo que observan en `.agentos/contracts/observed/<slug>/<ejemplo>.json` (fuera de git):

- **Proveedor:** una prueba por ejemplo ejecuta la petición contra el pipeline HTTP real en memoria y escribe
  `{ "status": <número>, "body": <json> }`. La respuesta tiene que cumplir la forma del contrato, con los mismos nombres
  de campos (casing) y los valores marcados en `assert`.
- **Consumidor:** las pruebas usan los fixtures (nunca escritos a mano) y escriben `{ "exercised": true, "test": "<nombre>" }`
  por cada fixture que ejercitan.

Fragmentos para escribir lo observado:

```csharp
// .NET (xUnit + WebApplicationFactory o el host de pruebas)
var dir = Path.Combine(root, ".agentos/contracts/observed", slug);
Directory.CreateDirectory(dir);
File.WriteAllText(Path.Combine(dir, $"{example}.json"), JsonSerializer.Serialize(new { status = (int)res.StatusCode, body }));
```

```dart
// Dart / Flutter
final file = File('.agentos/contracts/observed/$slug/$example.json')..createSync(recursive: true);
file.writeAsStringSync(jsonEncode({'exercised': true, 'test': testName}));
```

```ts
// TypeScript (supertest)
fs.mkdirSync(`.agentos/contracts/observed/${slug}`, { recursive: true });
fs.writeFileSync(`.agentos/contracts/observed/${slug}/${example}.json`, JSON.stringify({ status: res.status, body: res.body }));
```

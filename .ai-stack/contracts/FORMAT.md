# qubipods.contract/1

A contract is one JSON file per contract. The platform validates it, classifies each new version against the
approved one (compatible or breaking) and assigns the version number. Never write `version` or `hash`.

## Envelope
```json
{
  "format": "qubipods.contract/1",
  "slug": "<the slug the instruction gives you>",
  "title": "<short title, up to 120 characters>",
  "summary": "<what it publishes and for whom, up to 500 characters>",
  "provider": { "system": "<the providing repository>" },
  "parts": [ { "id": "api", "type": "http-api", "casing": "camelCase", "openapi": { } } ]
}
```
- `slug` and `provider.system` are the ones the instruction gives you; do not change them.
- `parts`: 1 to 20, each with a unique `id` (lowercase letters, digits and dashes, up to 32).
- Limits: 64 KB of canonical JSON, 100 operations, messages or routes, 50 examples, shapes nested up to 8 levels.
- Every example satisfies the rules of its part. An example the platform cannot validate blocks the approval of the specification.
- `http-api` and `event` carry their examples inside their standard document. `routes`, `published-file` and
  `config` (own format) use two more envelope keys:
  - `"shapes": { "<Name>": <JSON Schema> }`: named shapes, referenced as `{ "$ref": "#/shapes/<Name>" }` (no other `$ref`).
  - `"examples": [ { "id": "<unique, lowercase and dashes>", "part": "<part id>", ... } ]`: the fields after `part` depend on the type.

## Part `http-api`: OpenAPI 3.1 embedded
`{ "id", "type": "http-api", "casing": "camelCase" | "snake_case" | "PascalCase", "openapi": <OpenAPI 3.1 document> }`.
`casing` is how field names are written on the wire; consumers are linted against it. For operations that already exist,
take it from the provider's serializer configuration or real responses (fixtures, tests, API docs),
never from the source language's naming convention (ASP.NET Core answers camelCase although C# properties are PascalCase);
without evidence, leave it out and ask the AI Architect. For operations the request creates, take it from the repository's serializer configuration and,
without one, from the framework's default on the wire, and record it as a decision in `## Contratos`.

Supported profile (anything else is accepted but reported, and any change inside it counts as breaking):
- `"openapi": "3.1.x"`, `info.title`, `info.version` (informative only).
- `paths` with operations; every operation has a unique `operationId`.
- `parameters` in `path`, `query` or `header`, each with `schema`; a path parameter is `required: true` and appears in the path.
- `requestBody` and `responses` with `application/json` content and a `schema`.
- `components.schemas` and `components.parameters`; only local `$ref` (`#/components/...`).
- Shapes in JSON Schema 2020-12: `type` (a list with `"null"` makes it nullable), `properties`, `required`,
  `additionalProperties`, `items`, `enum`, `format`, `pattern`, `minimum`/`maximum` (and exclusive),
  `minLength`/`maxLength`, `minItems`/`maxItems`, `description`, and `x-extensible: true` on an enum
  that may grow without breaking consumers.
- Outside the profile: `oneOf`, `anyOf`, `allOf`, `not`, external `$ref`, `callbacks`, `links`, response
  `headers`, non-JSON content, cookie parameters.

### Examples (mandatory)
- Use the standard `examples` maps. One example is the request and the response that share the same key:
  the `examples.<key>` of the parameters and of the request body pair with the `examples.<key>` of one response,
  and that response gives the expected status.
- A request with no response example under its key pairs with the operation's only 2xx response without a body (a 204).
- Every operation has at least one example. A positive example carries every required parameter and the body when it is required.
- Every example satisfies its schema: every `required` field is present at every level (an `id` too), and
  `null` only where the type lists `"null"` (never `null` where the schema expects an object or a list).
  Only the request of a negative example (its response is 4xx) may break it on purpose.
- A negative example is a request to that same operation that the provider rejects, and every example of an operation
  asks for something different.
  A route or method the contract does not declare (a 404 for an unknown route, a 405) is not an example.
- `"x-qubipods-assert": ["/items/0/style"]` on a response example lists JSON Pointers whose values must be equal in the real response.
- Synthetic data only: never real client data, secrets or personal data.

```json
"responses": {
  "200": { "description": "Rates", "content": { "application/json": {
    "schema": { "$ref": "#/components/schemas/RateList" },
    "examples": { "rates-lima": { "value": { "items": [ { "id": "r-1", "mode": "express" } ] }, "x-qubipods-assert": ["/items/0/mode"] } }
  } } }
}
```

## Part `routes`: routes and deep links (own format)
```json
{ "id": "links", "type": "routes", "hosts": ["shop.example"],
  "routes": [ { "id": "order-detail", "pattern": "/orders/{orderId}", "description": "Order detail",
    "params": { "orderId": { "$ref": "#/shapes/OrderId" } }, "query": { "tab": { "type": "string", "enum": ["map", "history"] } },
    "requiredQuery": [], "target": "order-detail", "platforms": ["ios", "android", "web"] } ] }
```
- `hosts`: lowercase domains, no scheme. `pattern`: starts with `/`, literal segments or `{param}`; each `{param}` has its shape in `params`.
- `query`: optional query parameters with their shapes; `requiredQuery` lists the mandatory ones. `target`: the screen or view it opens.
  `platforms`: any of `ios`, `android`, `web`.
- Example: `{ "id", "part", "url": "https://shop.example/orders/ord-1?tab=map", "expect": { "route": "order-detail", "params": { "orderId": "ord-1", "tab": "map" } } }`.
  The host is in `hosts`, the path matches exactly one route, and `expect.params` are the path parameters plus the declared query
  parameters present in the URL, as text, each valid against its shape. Every route has at least one example.
- Breaking: a route removed, its `pattern` or `target` changed, a parameter type change or a stricter parameter shape, a host or
  platform removed, a new required query parameter, a query parameter removed or made required.
  Compatible: new routes, hosts or platforms, new optional query parameters, looser parameter shapes.

## Part `published-file`: files a repository serves (own format)
```json
{ "id": "files", "type": "published-file", "files": [
  { "id": "assetlinks", "path": "public/.well-known/assetlinks.json", "servedAt": "/.well-known/assetlinks.json", "format": "json",
    "contentType": "application/json", "mustContain": [ { "target": { "namespace": "android_app", "package_name": "example.app" } } ] },
  { "id": "prices", "path": "public/exports/prices.csv", "servedAt": "/exports/prices.csv", "format": "csv", "contentType": "text/csv",
    "columns": ["zone", "mode", "price"], "delimiter": ",", "header": true, "ordered": true } ] }
```
- `path`: the file inside the repository (no leading `/`, no `..`); `servedAt`: where it is served. `format`: `json`, `csv`, `sitemap` or `text`.
- `json`: `mustContain` is matched as a subset: an object matches when it has every key with a matching value, and a list matches
  when every expected element has an element that matches it. Extra keys and elements are fine.
- `mustContain` has the same root type as the file it describes, and so has the example's `content`:
  - an object root (an `apple-app-site-association`) takes an object:
    `"mustContain": { "applinks": { "details": [ { "appIDs": ["ABCDE12345.example.app"] } ] } }`
  - a list root (an `assetlinks.json`) takes a list:
    `"mustContain": [ { "target": { "namespace": "android_app", "package_name": "example.app" } } ]`
- `csv`: `columns`, `delimiter` (`,` `;` tab or `|`, default `,`), `header` (default true) and `ordered` (the header starts with
  the columns in that order; a CSV without header is always ordered). `sitemap`: `urls` that must be in a `<loc>`. `text`: `lines` that must be present.
- Example: `{ "id", "part", "file": "<file id>", "content": <the JSON value, or the text of a csv, sitemap or text file> }`; it must
  satisfy its file. Every file has at least one example. The provider check reads the real file at `path` with the same rules.
- Breaking: a file removed, its `path`, `servedAt`, `format` or `contentType` changed, required content removed, a CSV column
  removed, renamed, moved or inserted before the last one of an ordered CSV, a delimiter or header change, an ordered CSV that stops
  being ordered. Compatible: new files, more required content, CSV columns appended.

## Part `event`: AsyncAPI 3.0 embedded
`{ "id", "type": "event", "asyncapi": <AsyncAPI 3.0 document> }`. Supported profile (anything else is accepted but reported, and any
change inside it counts as breaking):
- `"asyncapi": "3.0.x"`, `info.title`, `info.version`.
- `channels`: each with `address` and `messages` (inline or `{ "$ref": "#/components/messages/<Name>" }`).
- `operations`: each with `action` (`send` = the provider emits it, `receive` = the provider accepts it), `channel`
  (`{ "$ref": "#/channels/<channel>" }`) and optional `messages` (`{ "$ref": "#/channels/<channel>/messages/<key>" }` of the same channel).
- `components.messages` with `payload` (a shape), optional `headers` (an object shape), `contentType` `application/json`, and
  `examples`: `[ { "name": "<unique, lowercase and dashes>", "payload": { }, "headers": { } } ]`. `components.schemas`; local `$ref` only.
- Outside the profile: `servers`, `bindings`, `traits`, `reply`, `correlationId`, channel `parameters`, non-JSON content.
- Every message an operation uses has at least one example, and every example satisfies its payload and headers.
- Rules: the payload and headers of a `send` message follow the response rules of `http-api`, and those of a `receive` message
  the request rules. Also breaking: an operation removed or its `action` changed, a channel `address` changed, a message removed, a
  new message in a `send` operation. Compatible: new operations, a new message in a `receive` operation, example changes.

## Part `config`: configuration keys and flags (own format)
```json
{ "id": "settings", "type": "config",
  "sources": [ { "path": "config/appsettings.json", "format": "json", "root": "Orders" }, { "path": ".env.example", "format": "env" } ],
  "keys": [
    { "key": "orders.cacheSeconds", "source": "config/appsettings.json", "type": "integer", "required": true, "default": 300, "secret": false },
    { "key": "ORDERS_API_KEY", "source": ".env.example", "type": "string", "required": true, "secret": true } ] }
```
- `sources`: `path` in the repository, `format` `json`, `env` or `yaml`, and `root` (json or yaml) for the section that holds the keys.
  With more than one source, every key says its `source`. A key of an `env` source uses letters, digits and underscores.
- `type`: `string`, `integer`, `number` or `boolean`. `required` and `secret` are mandatory booleans; `default` and `values`
  (the allowed values) are optional and match `type`.
- **A secret key never carries a value anywhere in the contract**: no `default`, no `values`, and no value in an example.
- Example: `{ "id", "part", "values": { "<key>": <value> } }` with every required non-secret key that has no default. At least one per part.
- Breaking: a key removed, its `type`, `secret` or `source` changed, fewer allowed values, a required key that becomes optional,
  a source removed or its `format` or `root` changed. Compatible: new keys or sources, more allowed values, a new default,
  an optional key that becomes required.

## What breaks consumers
In `http-api`, breaking (major version): removing an operation, a field, a parameter or a 2xx status; a new required request field
or parameter; an optional response field that becomes nullable, or a required one that becomes optional; a new value
in a closed response enum; a looser response constraint; a stricter request constraint; any type change; a casing change.
Compatible (minor): new operations, optional request fields, new response fields, new statuses, example changes.
Every other part type lists its own breaking and compatible changes above. Patch, in every type: descriptions and
titles only. Prefer compatible changes; a breaking one blocks every consumer until they accept it.

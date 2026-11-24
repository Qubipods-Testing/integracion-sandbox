# Spec Delta

## Purpose

Expose the existing `saludar(nombre)` greeting as an HTTP endpoint,
`GET /saludo`, so other services can request a greeting without
reimplementing the greeting logic themselves.

## ADDED Requirements

### Requirement: Responder un saludo por HTTP
The system SHALL expose `GET /saludo` on the server returned by
`crearServidor()`. When called with a non-empty `nombre` query parameter
(after trimming) of at most 100 characters, it SHALL respond `200` with
JSON body `{"saludo":"Hola, <nombre recortado>."}` and header
`Content-Type: application/json; charset=utf-8`.

#### Scenario: Nombre simple
- **WHEN** a client sends `GET /saludo?nombre=Ana`
- **THEN** the response status is 200
- **AND** the body is `{"saludo":"Hola, Ana."}`
- **AND** the `Content-Type` header is `application/json; charset=utf-8`

### Requirement: Validar nombre obligatorio
The system SHALL respond `400` with JSON body
`{"error":{"code":"NOMBRE_OBLIGATORIO","message":"El nombre es obligatorio"}}`
when the `nombre` query parameter is missing, empty, or made only of
whitespace after trimming.

#### Scenario: Nombre vacío o solo espacios
- **WHEN** a client sends `GET /saludo?nombre=%20%20`
- **THEN** the response status is 400
- **AND** the body is `{"error":{"code":"NOMBRE_OBLIGATORIO","message":"El nombre es obligatorio"}}`

### Requirement: Validar nombre demasiado largo
The system SHALL respond `400` with JSON body
`{"error":{"code":"NOMBRE_DEMASIADO_LARGO","message":"El nombre es demasiado largo"}}`
when the `nombre` query parameter, after trimming, is longer than 100
characters.

#### Scenario: Nombre de más de 100 caracteres
- **WHEN** a client sends `GET /saludo?nombre=` followed by 101 letters
- **THEN** the response status is 400
- **AND** the body `error.code` is `NOMBRE_DEMASIADO_LARGO`

### Requirement: Rechazar métodos distintos de GET en /saludo
The system SHALL respond `405` with header `Allow: GET` and JSON body
`{"error":{"code":"METODO_NO_PERMITIDO","message":"Método no permitido"}}`
when `/saludo` is requested with any HTTP method other than `GET`.

#### Scenario: POST a /saludo
- **WHEN** a client sends `POST /saludo`
- **THEN** the response status is 405
- **AND** the `Allow` header is `GET`
- **AND** the body `error.code` is `METODO_NO_PERMITIDO`

### Requirement: Responder 404 fuera del contrato
The system SHALL respond `404` with JSON body
`{"error":{"code":"RUTA_NO_ENCONTRADA","message":"Ruta no encontrada"}}`
for any request to a path other than `/saludo`.

#### Scenario: Ruta desconocida
- **WHEN** a client sends `GET /otra`
- **THEN** the response status is 404
- **AND** the body `error.code` is `RUTA_NO_ENCONTRADA`

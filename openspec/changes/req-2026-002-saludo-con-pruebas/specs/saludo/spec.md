# Spec: saludo

## ADDED Requirements

### Requirement: Saludar por nombre
The system SHALL export a `saludar(nombre)` function from `src/saludo.mjs`
that returns a greeting text built from the trimmed `nombre`.

#### Scenario: Nombre simple
- **GIVEN** the name "Ana"
- **WHEN** `saludar("Ana")` is called
- **THEN** it returns "Hola, Ana."

#### Scenario: Nombre con espacios alrededor
- **GIVEN** the name "  Luis  "
- **WHEN** `saludar("  Luis  ")` is called
- **THEN** it returns "Hola, Luis."

### Requirement: Validación de nombre obligatorio
The system SHALL throw an `Error` with message "El nombre es obligatorio"
when `saludar` is called with an empty or whitespace-only name.

#### Scenario: Nombre vacío
- **GIVEN** an empty string ""
- **WHEN** `saludar("")` is called
- **THEN** it throws an Error with message "El nombre es obligatorio"

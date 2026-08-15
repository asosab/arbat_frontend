# Buddy Auth — contrato del servicio esperado por el cliente

Este documento define el comportamiento que debe implementar el servicio Auth del servidor para que el cliente `modules/auth` funcione sin adaptadores adicionales.

## Base URL

```text
https://api.statetty.com
```

Configurable desde `modules/auth/config.js`.

## Sesión

`GET /api/buddy/auth/session`

### Usuario autenticado

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": false,
  "needsName": false,
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": "Alejandro",
    "firstName": "Alejandro",
    "lastName": "Sosa",
    "phone": "+59170000000",
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

### Usuario nuevo sin nombre

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": true,
  "needsName": true,
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": null,
    "firstName": null,
    "lastName": null,
    "phone": null,
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

### Sin sesión

```json
{
  "ok": true,
  "authenticated": false,
  "newUser": false,
  "needsName": false,
  "user": null
}
```

## Solicitar login

`POST /api/buddy/auth/login`

```json
{
  "email": "usuario@example.com"
}
```

El servicio debe crear/actualizar la solicitud pendiente de autenticación para el correo, generar el hash de un solo uso y utilizar el servicio transversal de correo para enviar el enlace.

Respuesta:

```json
{
  "ok": true
}
```

No es necesario revelar al cliente si el correo ya corresponde a un usuario existente.

## Verificar enlace

`GET /api/buddy/auth/verify?auth=HASH`

En caso válido, el servidor debe crear/restablecer la sesión autenticada y devolver el usuario.

Para usuario existente:

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": false,
  "needsName": false,
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": "Alejandro",
    "firstName": "Alejandro",
    "lastName": "Sosa",
    "phone": "+59170000000",
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

Para usuario nuevo:

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": true,
  "needsName": true,
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": null,
    "firstName": null,
    "lastName": null,
    "phone": null,
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

## Acción `register-name`

`POST /api/buddy/auth/login`

```json
{
  "action": "register-name",
  "name": "Alejandro"
}
```

El servidor debe obtener el usuario desde la sesión autenticada, nunca desde un `userId` enviado por el navegador.

### Reglas

- La sesión debe ser válida.
- `name` es obligatorio.
- Debe eliminar espacios extremos.
- Debe rechazarse un nombre vacío.
- El servidor valida límites de longitud y caracteres.
- Debe persistirse el nombre.
- Debe devolver el usuario completo actualizado.

Respuesta:

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": false,
  "needsName": false,
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": "Alejandro",
    "firstName": "Alejandro",
    "lastName": null,
    "phone": null,
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

## Logout

`GET /api/buddy/auth/logout`

Debe invalidar la sesión actual asociada a la cookie `buddy`.

Respuesta:

```json
{
  "ok": true,
  "authenticated": false,
  "user": null
}
```

## Cookie

El nombre esperado por el cliente es:

```text
buddy
```

La cookie debe ser gestionada por el servidor. El cliente no debe leerla ni almacenarla manualmente.

## Principio de consistencia

Los cuatro endpoints deben utilizar el mismo formato conceptual de respuesta. El cliente debe poder consumir `user` de cualquiera de ellos sin conocer qué servicio concreto produjo la respuesta.

# Modo Mock de Buddy

Permite probar el look & feel de `user` y `archerySchool` sin controllers, rutas ni datos del backend.

## Activación

El modo mock está desactivado por defecto.

Para activarlo en una página que cargue Buddy, agrega el parámetro:

`?buddyMock=1`

El parámetro activa el mock en `modules/user/config.js` y `modules/archerySchool/config.js` sin cambiar el comportamiento de producción.

## Entorno de prueba incluido

Abrir `buddy/mock-test.html` permite probar ambos módulos sin cargar `auth` ni `chat`, por lo que no se realizan peticiones de autenticación al backend.

La página permite:

- User: perfil completo.
- User: onboarding de perfil.
- User: restablecer datos mock.
- ArcherySchool: vista estudiante.
- ArcherySchool: vista administración.
- ArcherySchool: restablecer datos mock.

## Persistencia

Por defecto los cambios se guardan en `localStorage`:

- `buddy.user.mock`
- `buddy.archerySchool.mock`

Para una prueba limpia se puede usar el botón de restablecimiento o borrar esas claves del almacenamiento del navegador.

## Datos mock

Los datos iniciales están definidos en los `config.js` de cada módulo. Pueden modificarse para probar distintos estados de usuario, perfil, inscripción, atributos y equipamiento.

## Producción

Con `buddyMock` ausente o con cualquier valor distinto de `1`, `mock.enabled` permanece en `false` y los módulos usan sus servicios reales configurados mediante Telemetry.

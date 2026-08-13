# Fase 8 — fuentes de Buddy Says

Fuentes registradas:
- `agenda.js` → fuente autónoma de Google Calendar; no depende de archivos ni de variables de Jekyll.
- `consejos_arch.js` → carga `consejos_arch.json`.

Configuración de agenda

Editar `buddy/modules/says/sources/agenda.js` en `BuddyAgendaConfig`, o definir `window.BuddyAgendaConfig` antes de cargar `buddy.js`.

Valores por defecto solicitados:
- `calendarId`: `arbat.archery@gmail.com`
- `timezone`: `America/La_Paz`
- `apiKey`: vacío; debe configurarse en el sitio anfitrión.

Los horarios (`horarios`) deben ser definidos por el sitio anfitrión porque Buddy es portable y no debe depender del `_config.yml` de ningún sitio.

Selección de mensajes:
- `agenda`: secuencial.
- `consejos_arch`: aleatoria.

El motor aplica frecuencia, recurrencia diaria, persistencia y la variante `Buddy.says.decirSiLibre()`.

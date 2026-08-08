# CHANGELOG — arbat

- 2026-08-08 — frontend: generado el set completo de favicons a partir del
  logo (`favicon.ico` multi-resolución, PNGs 16/32/48/96, `apple-touch-icon`,
  íconos Android/PWA estándar y maskable, tiles de Windows, `safari-pinned-tab.svg`
  vectorial, `site.webmanifest` y `browserconfig.xml`) en
  `arbat_frontend/assets/images/favicon/`; actualizado `_includes/head.html`
  para referenciar todo el set (reemplaza el `favicon.svg` único anterior).
  Commiteado y probado funcional en navegador.
- 2026-08-08 — infraestructura: creado `opencode/infraestructura.md` con el estado actual del sistema (entorno WSL/v9fs, stack Ruby/Jekyll, estructura de directorios, scripts, config opencode y estado de procesos).
- 2026-08-08 — infraestructura: incorporada la sección «Servicio local (Jekyll)» a `AGENTS.md` (uso de `service.sh`, resolución de errores de PATH y huérfanos); borrado `opencode/tmp/agents.md` (archivo de traspaso).
- 2026-08-07 — frontend: andamiaje completo del sitio Jekyll de ARBAT en `arbat_frontend/` (layouts, includes, schema JSON-LD, colecciones `_instructores`/`_clases`, 9 páginas raíz, landing, form de reserva a WhatsApp, CSS mínimo). Build verificado sin errores ni warnings.
- 2026-08-07 — inicio: creada la estructura de documentación `opencode/` (CHANGELOG.md, PLAN.md, PLAN/index.md).

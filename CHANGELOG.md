# CHANGELOG — arbat

- 2026-08-08 — frontend: creados los includes faltantes que rompían el build
  de GitHub Pages, `_includes/calendar-eventos-embed.html` (embed público
  de solo lectura del calendario) y `_includes/calendar-citas-embed.html`
  (embed de agenda de citas de Google Calendar, usado en `/reservar/`).
  Build vuelve a pasar en GitHub Pages.
- 2026-08-08 — frontend: corregido `_includes/head.html` — había dos
  `<title>` en el `<head>` (uno manual y uno generado por `{% seo %}` con
  orden invertido). Apagado el título de `jekyll-seo-tag` (`{% seo title=false %}`)
  y dejado un único `<title>` con el orden `arbat | {{ page.title }}`.
- 2026-08-08 — frontend: revisión de diseño visual del sitio publicado en
  GitHub Pages. Se descartó una dirección visual alternativa (paleta y
  tipografía nuevas) a favor de seguir creciendo desde el sistema ya
  existente en `style.scss` (paleta tinta/diana/papel/piedra/grafito,
  motivo de anillo de diana, tipografía Quicksand/Work Sans), por pedido
  explícito de mantener continuidad con el logotipo.
- 2026-08-08 — contenido: reescritos en voz de instructor (voseo, directo,
  íntimo) `index.md`, `metodologia.md`, `quienes-somos.md`, `precios.md`,
  `horarios.md`, `preguntas-frecuentes.md`, `reservar.md` y las 4 páginas
  de `_clases/` (`principiantes`, `ninos`, `entrenamiento-deportivo`,
  `clases-individuales`). Se mantuvo el registro funcional/directo en
  páginas transaccionales (home, clases, precios, horarios, reservar) según
  la regla ya definida de reservar el formato "Reflexiones" solo para
  redes/blog. Los `TODO`s de contenido pendiente de confirmar con arbat se
  dejaron intactos, sin rellenar con información no confirmada.
- 2026-08-08 — contenido: estructurados los 3 perfiles de instructores
  (`raul-suarez.md`, `sebastian-bedregal.md`, `alexander-mendoza.md`) con
  nombre, WhatsApp e Instagram funcionales, sin inventar trayectoria — cada
  uno queda con `TODO` explícito hasta que el instructor confirme qué
  publicar (ver plan, sección 10, punto 3).
- 2026-08-08 — datos/SEO: agregadas coordenadas reales de arbat
  (`latitud`, `longitud`) y el link corto de Google Maps
  (`google_maps_url`) a `_config.yml`. Actualizado `ubicacion.md` con el
  link de Maps y el iframe apuntando a las coordenadas exactas (antes
  geocodificaba la dirección en texto). Actualizado
  `_includes/schema/local-business.html` con bloque `geo`
  (`GeoCoordinates`), `hasMap` y `telephone` en el JSON-LD de
  `LocalBusiness`.
- 2026-08-08 — frontend: generado el set completo de favicons a partir del
  logo (`favicon.ico` multi-resolución, PNGs 16/32/48/96, `apple-touch-icon`,
  íconos Android/PWA estándar y maskable, tiles de Windows, `safari-pinned-tab.svg`
  vectorial, `site.webmanifest` y `browserconfig.xml`) en
  `arbat_frontend/assets/images/favicon/`; actualizado `_includes/head.html`
  para referenciar todo el set (reemplaza el `favicon.svg` único anterior).
  Commiteado y probado funcional en navegador.
- 2026-08-08 — infraestructura: creado `opencode/infraestructura.md` con el estado actual del sistema (entorno WSL/v9fs, stack Ruby/Jekyll, estructura de directorios, scripts, config opencode y estado de procesos).
- 2026-08-08 — infraestructura: incorporada la sección «Servicio local (Jekyll)» a `AGENTS.md` (uso de `service.sh`, resolución de errores de PATH y huérfanos); borrado `opencode/tmp/agents.md` (archivo de traspaso).
- 2026-08-07 — frontend: andamiaje completo del sitio Jekyll de arbat en `arbat_frontend/` (layouts, includes, schema JSON-LD, colecciones `_instructores`/`_clases`, 9 páginas raíz, landing, form de reserva a WhatsApp, CSS mínimo). Build verificado sin errores ni warnings.
- 2026-08-07 — inicio: creada la estructura de documentación `opencode/` (CHANGELOG.md, PLAN.md, PLAN/index.md).

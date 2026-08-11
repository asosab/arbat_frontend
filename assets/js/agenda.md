# Mensajes de agenda — agenda.js + raulito-agenda.js

Documentación del comportamiento del sistema de mensajes de agenda del sitio:
qué hace cada script, por qué se tomó cada decisión, y qué queda pendiente de
confirmar antes de producción.

## 1. Idea general

El sitio lee la agenda pública de Google Calendar de arbat
(`{{ site.arbat.email }}`, el mismo calendario que ya usan
`calendar-citas-embed.html` y `calendar-eventos-embed.html`) y la muestra como
globos de diálogo de Raulito. Son dos archivos que se cargan en ese orden,
después de `raulito.js` (en `_layouts/default.html`):

```html
<script src="{{ '/assets/js/raulito.js' | relative_url }}" defer></script>
<script>window.ARBAT_AGENDA_API_KEY = 'AIza...';</script>
<script src="{{ '/assets/js/agenda.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/raulito-agenda.js' | relative_url }}" defer></script>
```

- **`agenda.js`** arma, en memoria, un array de strings (mensajes) a partir del
  calendario y lo expone como `ArbatAgenda.getMensajes()` (una Promise que
  resuelve a `string[]`). **No dibuja nada en pantalla**: es solo la fuente de
  mensajes.
- **`raulito-agenda.js`** es el puente que consume esos mensajes y los muestra
  como globo de Raulito, gestionando el "cuándo" (para no interrumpir el juego)
  y la persistencia (para no repetir mensajes ya mostrados).

Ninguno de los dos conoce al otro directamente: `agenda.js` solo expone la API,
`raulito-agenda.js` solo la consume, y el archivo que los une es el único que
sabe de ambos (ver §4).

## 2. `agenda.js` — lectura del calendario

### 2.1 Por qué la API REST de Google Calendar y no el `.ics` público

El sitio tiene el link al feed `.ics` público
(`site.arbat.google_calendar_eventos_ics_url`), pero ese feed **no envía
cabeceras CORS**: un `fetch()` desde el navegador hacia `calendar.google.com` es
bloqueado por el navegador mismo, sin importar qué tan bien escrito esté el
código. No es algo que se pueda arreglar del lado del cliente.

El único camino 100% del lado del cliente (sin backend propio) es la API REST de
Google Calendar (`www.googleapis.com/calendar/v3/...`), que sí responde con CORS
cuando la llamada trae una API key. Pasos para dejarla lista:

1. En [Google Cloud Console](https://console.cloud.google.com/), crear o
   reutilizar un proyecto y habilitar **"Google Calendar API"**.
2. Crear una **API key** (Credenciales → Crear credenciales → Clave de API).
3. Restringirla:
   - **Restricciones de aplicación → Referentes HTTP**: agregar
     `https://asosab.github.io/arbat_frontend/*` y, cuando exista,
     `https://arbat.com.bo/*`.
   - **Restricciones de API**: limitarla a "Google Calendar API" únicamente.
4. El calendario ya está en disponibilidad pública (por eso funciona el `.ics`
   hoy), así que no hace falta tocar nada ahí.
5. Definir la key en el sitio **antes** de cargar `agenda.js`:
   ```html
   <script>window.ARBAT_AGENDA_API_KEY = 'AIza...';</script>
   ```
   > **Pendiente:** hoy la key está escrita inline en `_layouts/default.html`
   > (commiteada). Conviene restringirla por referrer HTTP a los dominios propios
   > del sitio y/o sacarla de código versionado para poder rotarla sin commits.

Una API key restringida por referrer a los dominios propios del sitio es segura
de exponer en el navegador (así es como Google espera que se use una key pensada
para clientes web); no hace falta OAuth ni un backend, porque solo se está
*leyendo* un calendario público.

**Sin key configurada, `agenda.js` no rompe nada:** avisa por consola y
`getMensajes()` resuelve un array vacío. Lo mismo si la API responde error o si
falla la red (ver §2.4).

### 2.2 Tipos de mensaje

Cada llamada consulta eventos hasta `CONFIG.horizonteDias` (31) hacia adelante,
los ordena de lo más próximo a lo más lejano en el tiempo y genera dos tipos de
mensaje:

1. **Disponibilidad del próximo entrenamiento regular** — se detectan los turnos
   (de `site.arbat.horarios` en `_config.yml`, la misma fuente que usan
   `horarios.md` e `index.md`) que aún no empezaron y no llegaron al cupo:
   - "Aún quedan espacios disponibles para el entrenamiento de esta tarde…"
     (o "de este sábado…" si el próximo es sábado).
   - "Aún quedan espacios disponibles para el próximo entrenamiento, el
     {día} {X} de {mes}, recuerda reservar con tiempo".
2. **Eventos especiales** (competencias, torneos, clínicas) — cualquier evento
   del calendario cuyo título contenga alguna palabra de
   `CONFIG.palabrasClaveEventoEspecial` (`competencia, torneo, campeonato,
   clínica, clinica, evento especial`):
   - "El {fecha} tendremos {título}, en {lugar} a las {hora}".
   - Si el evento es de "todo el día" (sin hora) se omite "a las {hora}"; si no
     tiene ubicación cargada se omite "en {lugar}".

### 2.3 Convención de nombres para eventos especiales

`agenda.js` no tiene forma de "saber" que un evento es una competencia: lo
decide por palabras clave en el título. El mensaje inserta el título **tal cual
está escrito** en el calendario, por eso conviene tituarlo ya listo para encajar
en la frase — por ejemplo `la competencia interdepartamental`, no `Competencia
Interdepartamental 2026`.

**Pendiente de decidir con Alejandro:** si conviene mantener esta convención de
palabras clave, o si es mejor algo más explícito (un color de evento reservado
en Calendar, o un prefijo fijo como `[EVENTO] ...`) para no depender de que
alguien recuerde incluir la palabra correcta al cargarlo.

### 2.4 Cómo se decide si "hoy"/"este sábado" tienen espacio

- Se ignoran los turnos que ya empezaron (comparando la hora actual en Bolivia
  contra la hora de inicio del turno) — no tiene sentido avisar de un cupo para
  un turno ya en curso.
- "Este sábado" siempre se refiere al sábado más próximo (hoy mismo, si hoy es
  sábado y queda un turno sin empezar; si no, el siguiente).
- Todos los cálculos de fecha/hora se hacen **en el huso horario de Bolivia**
  (`site.timezone`), no en el del navegador del visitante: un visitante desde
  otro país no debería ver "esta tarde" calculado con su propia hora local.
- Si la consulta falla o no hay API key, no se genera **ningún** mensaje de
  disponibilidad. La alternativa (asumir que no hay reservas y avisar igual) se
  descartó a propósito: sería afirmar algo que no se pudo confirmar.

### 2.5 Supuestos sin confirmar

- **Cupo por turno:** `CONFIG.capacidadPorTurno: 8` es un placeholder (2
  arqueros por cada uno de los 4 campos de tiro), no un dato confirmado por
  ARBAT. **Ajustarlo al número real antes de producción.** Si el cupo varía por
  turno, avisar para separar la configuración por turno.
- **Un evento del calendario = una reserva ocupada**, sin importar cuánta gente
  cubre esa reserva (una cita "para 2 personas" cuenta como 1). Si el sistema de
  citas real crea un evento por persona, hay que ajustar
  `contarReservasEnTurno()`.

### 2.6 Límites conocidos

- La consulta trae hasta 250 eventos dentro del horizonte, sin paginar. Para una
  escuela con esta cantidad de turnos por semana no debería alcanzarse el límite,
  pero si algún día se supera hay que agregar manejo de `nextPageToken`.
- No distingue eventos marcados como "libre" (`transparency: transparent`) de
  eventos "ocupado": todos cuentan como turno reservado.

## 3. Raulito — API `say()` y `decirSiLibre()`

`raulito.js` expone dos formas de mostrar un globo de diálogo (ver §11 de
`raulito.md`):

- `Raulito.say(texto)` / `showSpeechBubble(texto, duracionMs, opts)` — fuerza el
  globo, pisando cualquier cosa que esté en pantalla.
- `Raulito.decirSiLibre(texto, duracionMs, opts)` (v1.7+) — **nunca fuerza**:
  - si Raúl está oculto (`hidden`) lo muestra y sigue de largo con el mensaje;
  - si está jugando (`pending`/`aiming`/`resolved`), agotado (`exhausted`), o ya
    hay un globo visible, **no muestra nada**;
  - devuelve `true` si logró mostrar el globo y `false` si no — para que quien
    llama decida si reintenta más tarde.

Para mensajería "de fondo" como la de agenda, la función correcta es
`decirSiLibre()`: un aviso de agenda no tiene por qué interrumpir un tiro en
curso ni pisar un globo que ya está en pantalla.

## 4. `raulito-agenda.js` — el puente

Es el **único** archivo que conoce a los otros dos (`ArbatAgenda` y `Raulito`);
ninguno de ellos sabe que el otro existe, así que este archivo puede cambiar o
desaparecer sin tocarlos. No tiene front matter Liquid porque no lee nada de
`site.arbat.*` (a diferencia de `agenda.js`, que sí lo necesita).

### 4.1 Cola de mensajes y persistencia

Cada mensaje que llega de `ArbatAgenda.getMensajes()` se agrega a una cola con
una marca "entregado" (`true`/`false`). Esa cola se guarda en `localStorage`
(clave `arbatRaulitoAgendaCola.v1`), así que sobrevive a un refresh o a cerrar y
volver a abrir el navegador.

- El `id` de cada entrada se calcula desde el propio texto (hash djb2): dos
  mensajes con el mismo contenido son el mismo mensaje — no se duplican ni se
  reenvían.
- En cada turno se toma el primer mensaje pendiente (`entregado: false`) y se
  intenta con `Raulito.decirSiLibre()`. Recién si se mostró se marca como
  entregado y se guarda: un refresh en el medio nunca hace que se reenvíe.
- Un mensaje pendiente que no se llegó a mostrar (Raúl ocupado) se mantiene en la
  cola y se reintenta; si tras `maxReintentosPorTurno` (6) intentos con cadencia
  rápida sigue sin poder, se baja a la cadencia normal (la pausa entre mensajes)
  pero el mensaje no se pierde.
- Un mensaje que ya no aparece en la agenda fresca (el evento pasó, o cambió su
  fecha relativa) queda fuera de la cola: mantenerlo sería anunciar algo vencido.

### 4.2 Cadencias (CONFIG, al inicio del archivo)

Todos los tiempos aceptan **dos formatos** para que ajustar la cadencia sea
cómodo sin tocar lógica: un número fijo en ms, o un rango aleatorio
`{ min, max }` en ms (cada uso sortea un valor nuevo, para que la cadencia no se
sienta mecánica).

| Config | Valor por defecto | Sentido |
|---|---|---|
| `lectura.palabrasPorMinuto` | 200 | velocidad de lectura asumida para calcular la duración del globo |
| `lectura.margenMs` / `duracionMinimaMs` / `duracionMaximaMs` | 1200 / 3500 / 9000 | tiempo extra fijo, piso y techo de la duración |
| `pausaEntreMensajesMs` | `{min: 30000, max: 60000}` | pausa con Raúl en silencio, **desde que el mensaje anterior termina** de mostrarse |
| `retrasoInicialMs` | `{min: 4000, max: 15000}` | demora antes del primer intento al cargar la página (evita que todos vean el primer mensaje al mismo tiempo) |
| `reintentoMs` | `{min: 3000, max: 7000}` | cadencia rápida cuando Raúl está ocupado |
| `maxReintentosPorTurno` | 6 | tope de intentos rápidos antes de bajar a la cadencia normal |
| `refrescarAgendaMs` | 20 min | cada cuánto se vuelve a pedir la agenda (los mensajes son sensibles al tiempo: "esta tarde", "el próximo sábado") |

La duración en pantalla se calcula por **tiempo de lectura** del texto (no es un
valor fijo): una frase corta y el anuncio de un evento con fecha, hora y lugar no
deben durar lo mismo.

### 4.3 Dependencia con la versión de `raulito.js`

Si se carga una versión de `raulito.js` anterior a la que tiene `decirSiLibre`
(v1.7), este archivo simplemente **no muestra nada**: no rompe la página y —a
propósito— no cae a `say()` como respaldo, porque `say()` rompería justo la
garantía de "nunca interrumpir" que se busca acá.

## 5. Orden de carga y dónde vive

Todo se carga al final del `<body>` de `_layouts/default.html` (ver §1). El
puente espera a que `ArbatAgenda` y `Raulito` existan (los poll en intervalos de
200 ms) antes de arrancar, así que el orden de los `<script>` importa menos que
el hecho de que estén los tres en la misma página.

## 6. Pendientes antes de producción

- Confirmar `CONFIG.capacidadPorTurno` en `agenda.js` (§2.5).
- Decidir la convención de eventos especiales (§2.3).
- Restringir por referrer / sacar de código versionado la API key de Google
  Calendar (hoy commiteada en `_layouts/default.html`, §2.1).
- No hay un componente visible que muestre el resultado del premio 2x1 del
  minijuego más allá del globo de Raulito — los mensajes de agenda son solo una
  de las fuentes que puede usar el futuro sistema de mensajería.

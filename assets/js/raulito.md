# Raulito — minijuego de puntería

Documentación del comportamiento actual de `raulito.js`. Pensada para
reemplazar el changelog largo que hoy vive como comentario al inicio del
archivo: acá se explica **qué hace el código y por qué**, no la historia de
cómo llegó a ser así. El `.js` puede quedar con un encabezado corto que
apunte a este documento.

No requiere frameworks. Se incluye con:

```html
<script src="/assets/js/raulito.js" defer></script>
```

en cualquier página del sitio Jekyll (`arbat_frontend`). Al cargar, se
autoinicializa (`init()`, al final del archivo) y no hace falta llamar nada
más a mano — aunque queda expuesta una API mínima por si hace falta
invocar/depurar cosas desde otro script o la consola (ver [API pública](#api-pública-windowraulito)).

---

## 1. Idea general

Un personaje (Raulito) aparece fijo en la esquina inferior derecha de la
pantalla. El jugador mantiene el toque/click presionado sobre él (**toque
largo**, no un tap normal) para que arme el arco y empiece a apuntar; mueve
el dedo/mouse para desplazar la mira, y suelta para disparar. La flecha
vuela hacia el **logo real del sitio** (arriba a la izquierda), que actúa de
diana, y el puntaje depende de qué tan cerca del centro del logo cayó.

Para que apuntar no sea trivial, la mira tiembla y se desvía por varios
motivos a la vez (late el pulso, se cansa el brazo, hace un vaivén
constante, se descalibra con el uso) — todos configurables por separado, ver
[Handicaps de puntería](#6-handicaps-de-puntería).

## 2. Assets y supuestos de carpetas

```
CONFIG.assetBase = '/arbat_frontend/assets/images/minijuego/'
CONFIG.audioBase = '/arbat_frontend/assets/sonido/minijuego/'
```

Ambas rutas pueden sobreescribirse antes de cargar el script definiendo
`window.RAULITO_ASSET_BASE` / `window.RAULITO_AUDIO_BASE` (útil para pruebas
locales con rutas relativas, sin tocar el script).

> **Supuesto sin confirmar**: no se especificó dónde vive el audio del sitio
> real; se asumió una carpeta `sonido` paralela a `imagen`. Ajustar
> `audioBase` si el sitio real usa otra convención (p. ej. `/assets/audio/`).

Imágenes esperadas dentro de `assetBase`:

| Archivo | Uso |
|---|---|
| `pose01.png` | apuntando (arco armado) |
| `pose02.png` | disparo recién hecho |
| `pose03.png` | reposo / idle |
| `pose04.png` | fallo (soltó tarde, timeout, gesto inválido) |
| `mira.png` | mira que se arrastra por pantalla |
| `f01.png` … `f04.png` | variantes de flecha clavada (se elige una al azar por disparo) |
| `logo.png` | copia de repuesto del logo, solo si no se encuentra el logo real (ver [§5](#5-el-blanco-el-logo-real-del-sitio)) |

Y dentro de `audioBase`: `disparo.mp3` (liberación de la cuerda), `golpe.mp3`
(impacto) y `tensar.mp3` (tensado del arco).

`preloadAssets()` precarga todo esto al iniciar.

## 3. Posicionamiento del personaje

Raulito se muestra **solo de la cintura para arriba** (no cuerpo entero), a
un tamaño relativo al lado largo de la pantalla
(`characterLongSidePercent`, `Math.max(innerWidth, innerHeight)`). Dos
familias de valores por pose, todos medidos a mano sobre los PNG reales,
gobiernan dónde queda exactamente:

- **`characterWaistRatio`** (`idle`/`fail`: 0.52, `aim`/`fire`: 0.58):
  fracción de la altura de cada imagen hasta la línea de cintura. Se usa
  para calcular un `bottom` dinámico que deja siempre la cintura a
  `characterMarginPx` del borde inferior de la ventana, empujando las
  piernas fuera de la vista.
- **`characterAnchorXRatio`** (`idle`/`fail`: 0.48, `aim`/`fire`: 0.57) +
  **`characterAnchorRightPercent`** (0.15): en qué columna de cada imagen
  vive el torso, y a qué distancia del borde derecho de pantalla debe
  quedar ese punto. Existen valores separados por pose porque `pose01`/
  `pose02` incluyen el arco extendido hacia el lado (imágenes más anchas
  que `pose03`/`pose04`), así que el centro geométrico de la imagen no
  coincide con el torso real.

Para recalibrar el tamaño/posición sin tener que entender el resto del
script, hay dos zonas pensadas para eso:

- `CONFIG.scales` — multiplicador (>1 agranda, <1 achica) por elemento
  (`character` por pose, `mira`, `arrow`, `target`), encima del porcentaje
  base.
- `characterAnchorRightPercent` / `characterAnchorXRatio` — mover Raulito
  completo (el primero) o corregir una pose puntual que se vea desalineada
  respecto de las demás (el segundo).

Todo se recalcula en `positionCharacter()`, disparado al cargar cada imagen,
en cada cambio de pose y en cada resize.

## 4. Máquina de estados

```
hidden → idle → pending → aiming → resolved → idle
                                 ↘ exhausted ↗ (solo si se agota, ver §6)
```

- **`hidden`**: Raulito no se muestra. Se sale con el triple click de prueba
  (ver [§8](#8-panel-de-debug-y-atajo-de-prueba)) o `Raulito.show()`.
- **`idle`**: reposo, esperando el gesto.
- **`pending`**: hubo `pointerdown` sobre Raulito; si se suelta antes de
  `CONFIG.longPressThresholdMs` (350ms), no cuenta como intento y vuelve a
  `idle`. Si el toque se sostiene ese umbral, pasa a `aiming`
  (`enterAimState`).
- **`aiming`**: arco armado (`pose01`), mira visible y siguiendo el
  arrastre. Se sale por: soltar (dispara o falla según el tiempo, ver
  [§5](#5-el-blanco-el-logo-real-del-sitio)), cruzar la mitad de pantalla
  inválida, o `CONFIG.maxHoldMs` (10s) sin soltar (timeout).
- **`resolved`**: se muestra `pose02` (disparo) o `pose04` (fallo) durante
  `CONFIG.resolveDisplayMs` (1.5s), y se dispara el globo de diálogo con el
  resultado. Después vuelve a `idle` — salvo excepciones cubiertas en
  [§7](#7-pedido-de-apuntado-en-cola) y [§6](#6-handicaps-de-puntería)
  (agotamiento).
- **`exhausted`**: variante de reposo forzado cuando Raúl se cansó demasiado
  (ver `fatigue.exhaustionStreak` en [§6](#6-handicaps-de-puntería)); un
  nuevo toque solo hace que Raúl se queje, no entra en pose de apuntado.

Todo el gesto se maneja con Pointer Events (`pointerdown`/`pointermove`/
`pointerup`/`pointercancel`) sobre `charEl`, con `setPointerCapture` para no
perder el seguimiento si el dedo se sale del elemento.

## 5. El blanco: el logo real del sitio

```js
targetSelector: '.site-header .site-logo img'
```

El juego **nunca muestra, oculta, mueve ni redimensiona** ese elemento —
solo lee su posición y tamaño (`getBoundingClientRect`) para calcular
anillos y anclar flechas. Si no encuentra ningún elemento con ese selector
(por ejemplo al probar este script aislado, fuera del sitio real), dibuja su
propia copia de `logo.png` en la esquina superior izquierda
(`updateTargetVisibility`) solo para poder testear la puntería sin la
página real.

**Puntaje** (`computeScore`): se asume que el blanco es aproximadamente
circular. Se mide la distancia del punto de impacto al centro del rect del
logo y se compara contra `CONFIG.rings`, fracciones del radio medidas
directamente sobre `logo.png` (el círculo dentro de la "a" de arbat: negro /
blanco / naranja / blanco / negro):

| Puntos | Hasta (% del radio) | Zona |
|---|---|---|
| 10 | 14% | círculo negro interno |
| 9 | 27% | aro blanco |
| 8 | 45% | aro naranja |
| 7 | 61% | espacio blanco |
| 6 | 81% | aro negro externo |
| 5 | 105% | espacio blanco externo |
| — | más allá | "miss" |

> **Supuesto documentado**: las primeras cinco fracciones salen de examinar
> los píxeles reales de `logo.png`; la última (5 puntos) **no** está
> delimitada por el arte del logo — es una zona inventada para dar margen a
> los impactos cercanos pero fuera del logo. Es la más fácil de mover si
> hace falta agrandar o achicar esa zona.

Si el logo real tiene mucho padding o no es cuadrado, apuntar
`targetSelector` al elemento gráfico exacto (sin padding extra) para que el
radio calculado sea correcto.

**Anclaje de flechas clavadas** (`stickArrowAt` + `repositionStuckArrows`):
como el logo vive en el flujo normal de la página (no es `position: fixed`),
cada flecha guarda su offset respecto de la esquina superior izquierda del
blanco en el instante del impacto, y ese offset se recalcula en cada scroll
o resize (`bindArrowRepositioning`) — así la flecha se mueve junto con el
logo real sin tocar la página en sí.

## 6. Movimiento de la mira y validez del gesto

Mientras se apunta (`onPointerMoveWhileAiming`), el desplazamiento real del
puntero se invierte y amplifica:

```js
dx = (e.clientX - startX) * CONFIG.aimSensitivity  // 4 por defecto
miraBaseDx = -dx  // espejado
```

Espejado porque el blanco (izquierda) y Raulito (derecha) están en lados
opuestos; amplificado porque, arrancando pegado a la esquina, no hay
recorrido físico suficiente en píxeles reales del dedo para cruzar toda la
pantalla sin el multiplicador.

**Tres reglas de validez independientes**, todas evaluadas en cada
`pointermove`:

1. El **puntero real** (dedo/mouse) debe quedarse en la mitad **derecha** de
   la pantalla. Si cruza a la izquierda, se cancela el tiro
   (`resolve('fail', ...)`, pasa a `pose04`) con MISS genérico.
2. La **mira** (ya espejada y amplificada) tampoco puede terminar en la
   mitad **derecha** — se calcula sobre la posición base, sin el temblor
   (que es demasiado errático para decidir un fallo por sí solo). Si la
   cruza, mismo `resolve('fail', ...)` pero con mensaje específico: *"No se
   debe apuntar tan lejos de la diana"*.
3. **Zona de "sabiduría"** (`CONFIG.wisdomZone.bottomFraction`, 0.25 por
   defecto): si la mira cae en el cuarto inferior de la **ventana visible**
   (viewport, `window.innerHeight` — igual criterio que la regla anterior,
   no el documento completo), Raúl decide directamente **no disparar**:
   equivale a apuntar hacia abajo, al suelo, en vez de hacia el blanco. A
   diferencia de las dos reglas anteriores, **esto no es un fallo**:
   `resolve('wisdom', ...)` no pasa por `pose04`/MISS, vuelve derecho a
   `pose03` (idle) con un mensaje propio: *"Es sabio saber cuándo no
   disparar"*.

La mira no tiene clamping propio de bordes: puede salirse del viewport sin
restricción (necesario para que llegue hasta el blanco real).

**Ventana de disparo**: soltar dentro de `CONFIG.fireWindowMs` (8s) cuenta
como disparo válido (`pose02`); soltar después, o no soltar nunca hasta
`CONFIG.maxHoldMs` (10s), cuenta como fallo por timeout.

## 6. Handicaps de puntería

Cuatro efectos independientes, calculados en el mismo loop de animación
(`aimTremorTick`, un `requestAnimationFrame` que corre mientras se apunta) y
sumados todos sobre la posición base de la mira. Cada uno tiene su propia
zona de calibración en `CONFIG`, pensada para ajuste a mano sin tocar el
resto del script.

### Latido (`CONFIG.heartbeat`)
Pulso "lub-dub" (dos lóbulos por ciclo) que sube de intensidad rápido
(`intensityAttackPerSec`) cuando el puntero real se mueve rápido, y baja
lento (`intensityReleasePerSec`) al quedarse quieto. En reposo es casi
imperceptible (`restAmplitudePx: 1.5`, `restBpm: 62`); agitado llega a
`maxAmplitudePx: 14` / `maxBpm: 190`, más ruido aleatorio (`jitterPx`) que
crece con la intensidad.

### Cansancio muscular (`CONFIG.fatigue`)
Empieza a manifestarse recién a partir de `fatigue.startAfterArrow` flechas
disparadas en la sesión. Cada flecha soltada sin respetar
`fatigue.expectedCooldownMs` desde la anterior sube un nivel de temblor
(`currentFatigueLevel`); descansar sin disparar lo baja (`restStartMs` para
empezar a bajar, `restStepMs` por cada nivel adicional). Si se acumulan
`fatigue.exhaustionStreak` flechas seguidas sin respetar el cooldown, Raúl
se agota del todo: fuerza `pose04`, dice `exhaustionMessage`, bloquea nuevos
disparos (estado `exhausted`) hasta descansar `exhaustionRestMs`, y ahí
vuelve solo a `pose03`.

### Vaivén en 8 (`CONFIG.vaiven`)
A diferencia del latido, no depende de la velocidad del puntero: es un
balanceo ambiente constante desde el primer instante de apuntado, con forma
de curva de Lissajous 1:2 (un "8" acostado). Su radio arranca chico
(`baseRadiusPx: 5`) y crece con el mismo nivel de cansancio que ya calcula
`fatigue` (`radiusPerFatigueLevelPx` por nivel) — si `fatigue.enabled` es
`false`, el radio queda fijo.

### Cadencia de disparo (`CONFIG.cadencia`)
Mide lo mismo que dispara el umbral de `fatigue` (tiempo desde el último
disparo) pero el efecto es **continuo**, no por niveles discretos: cuanto
menos tiempo pasó desde el último disparo, mayor el multiplicador
(`cadenciaMultiplier`, hasta `1 + maxExtraMultiplier`) que se aplica ENCIMA
de las tres distancias anteriores (latido, cansancio, vaivén) a la vez. Con
`cadencia.restMs` (6s) de pausa sin disparar, el multiplicador vuelve a 1.
No toca ninguno de los tiempos de cooldown de `fatigue` ni del carcaj — es
puramente visual.

### Mira sin calibrar (`CONFIG.calibracion`)
El único handicap que **no** mueve el dibujo de la mira en pantalla (eso
sigue siendo trabajo de los cuatro anteriores) — en cambio desvía el
**punto de impacto real** que usan `computeScore`/`stickArrowAt` respecto
de lo que el jugador vio al soltar, como una mira óptica descalibrada. Al
cargar la página se sortea un desvío fijo (`minErrorPx`–`maxErrorPx`, 10–30
por defecto) en una dirección aleatoria; se mantiene igual disparo a disparo
y solo se corrige un `correctionRatio` (25%) al completar cada andanada de
`arrowLimit.countBeforeCooldown` flechas (`recalibrateMira`), momento en el
que Raúl avisa con `calibracion.message`. El error nunca llega a 0 exacto,
solo se achica con el tiempo (75% del anterior en cada corrección).

## 7. Límite de flechas / cooldown del carcaj

Cada `CONFIG.arrowLimit.countBeforeCooldown` flechas clavadas (6 por
defecto), Raúl necesita `cooldownMs` (10s) antes de poder disparar de nuevo.
Si se intenta iniciar un disparo durante ese cooldown, dice
`arrowLimit.waitMessage` en vez de entrar en pose de apuntado. A los
`fadeStartMs` (5s) de esa espera, las flechas de la tanda que se acaba de
completar empiezan a desvanecerse durante `fadeDurationMs` hasta
desaparecer del todo — por defecto ese fundido termina justo cuando se
vuelve a poder disparar.

Todas las flechas disparadas (impactadas) en la sesión quedan además en un
registro en memoria (`CONFIG.arrowLog`, expuesto vía
`Raulito.getArrowLog()`) agrupadas en "andanadas" — pensado para
estadísticas futuras. No sobrevive a un refresh de página.

## 8. Pedido de apuntado en cola

Si se hace click/touch-and-drag sobre Raulito mientras todavía está en
`resolved` mostrando `pose02` (la flecha anterior recién se soltó, no
terminó de resolverse), ese click **no cancela ni descarta** la flecha en
vuelo — sigue su curso normal (impacto, puntaje, sonido, todo intacto).
Lo único que hace es anotar un pedido (`pendingAimRequest`): apenas esa
flecha termina de resolverse, en vez de volver a `idle` pasa derecho a
`aiming`, sin pasar por el toque largo de siempre — como si el jugador ya
estuviera tensando el arco con la flecha anterior todavía en el aire. Si ese
disparo deja a Raúl agotado, o completa una tanda y dispara el cooldown del
carcaj, el pedido en cola se descarta igual (no saltea ninguno de los dos).
Soltar antes de que la flecha anterior resuelva simplemente cancela el
pedido, sin afectarla. Este atajo no aplica sobre un fallo (`pose04`): ese
caso siempre espera a volver a `idle` normalmente.

## 9. Globo de diálogo

`showSpeechBubble(text, durationMs)` posiciona un globo apuntando a la
cara/cabeza real de cada pose (`characterFaceAnchor`, medido a mano por
pose — de espaldas en `aim`/`fire`, de frente en `idle`/`fail` — en vez de
usar el rectángulo completo de la imagen, que en `aim`/`fire` incluye el
brazo y el arco extendidos). Se usa para el puntaje (`SCORE_PHRASES`, 10 a
5), el "MISS" genérico, el mensaje de mira muy lejana, el aviso de
recalibración y el de agotamiento. Reutilizable para diálogos futuros — está
expuesta como `Raulito.say(texto)`.

## 10. Panel de debug y atajo de prueba

`CONFIG.debug = false` por defecto — en `true` muestra un panel de texto con
el estado interno en vivo (útil para calibrar los handicaps de §6). Dejarlo
en `false` para producción.

Para mostrar/ocultar a Raulito durante pruebas sin acceso a un teclado
físico, un **triple click** en cualquier parte del documento dentro de una
ventana de `CONFIG.testTrigger.windowMs` (500ms) dispara el mismo toggle
(`onTestTriggerClick`). Solo funciona en `idle`/`hidden`; se ignora si hay
un intento en curso.

## 11. API pública (`window.Raulito`)

```js
Raulito.show()               // fuerza mostrar a Raulito
Raulito.hide()                // fuerza ocultarlo
Raulito.resetArrows()         // limpia todas las flechas clavadas en pantalla
Raulito.say(texto)            // muestra un globo de diálogo con texto libre
Raulito.computeScore(x, y)    // puntaje (10..5 o null) para un punto de pantalla dado
Raulito.getArrowLog()         // copia del registro de flechas de la sesión (ver §7)
Raulito.getFatigueLevel()     // nivel de cansancio actual (0..fatigue.maxLevel)
Raulito.getCalibrationError() // desvío actual (px) de la mira sin calibrar (ver §6)
```

## 12. Compatibilidad táctil

Como el toque largo es la mecánica central, el script desactiva
explícitamente los menús nativos que el navegador dispara con ese mismo
gesto sobre la imagen de Raulito (`charEl`):

- **iOS Safari**: `-webkit-touch-callout: none` apaga el menú de
  Copiar/Guardar imagen que aparece al mantener presionada una `<img>`.
  Ni `touch-action: none` ni `user-select: none` lo cubren — son
  propiedades distintas, resuelven otros problemas (scroll/zoom y
  selección de texto).
- **Android / Chrome**: no hay callout, pero al soltar un long-press se
  dispara un evento `contextmenu` sintético; se previene con
  `charEl.addEventListener('contextmenu', e => e.preventDefault())`, ya que
  no hay forma de evitarlo solo con CSS.

Acotado únicamente a `charEl` — no toca `miraEl`, `targetEl` (la copia de
repuesto del logo) ni el resto de la página; el logo real del sitio sigue
totalmente fuera del control del script (ver [§5](#5-el-blanco-el-logo-real-del-sitio)).

## 13. Cosas a revisar antes de producción

- `audioBase` es un supuesto sin confirmar contra la estructura real del
  sitio (ver [§2](#2-assets-y-supuestos-de-carpetas)).
- El anillo de 5 puntos (`rings`, último ítem) es una zona inventada, no
  medida sobre el logo real (ver [§5](#5-el-blanco-el-logo-real-del-sitio)).
- `CONFIG.debug` debe quedar en `false`.
- Si el logo real del sitio cambia de estructura HTML/CSS,
  `CONFIG.targetSelector` (`.site-header .site-logo img`) hay que
  revisarlo — si deja de encontrar el elemento, el juego cae automáticamente
  a la copia de repuesto (`logo.png`) sin romperse, pero deja de apuntar al
  logo real.

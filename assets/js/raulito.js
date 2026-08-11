/**
 * raulito.js
 * ---------------------------------------------------------------------------
 * Prototipo del minijuego "Raulito" (ver raulito.md).
 *
 * v0   — esqueleto de interacción con teclado + long-press (pose03 -> pose01
 *        -> pose02/pose04) y mira espejada.
 * v0.1 — agrega precarga de assets, sonido de disparo (disparo.mp3) y
 *        flechas clavadas (aleatorias entre f01-f04) en el punto real donde
 *        estaba el centro de la mira al soltar, sin acotar la mira a los
 *        bordes de pantalla.
 * v0.2 — agrega:
 *   - `CONFIG.scales`: una zona única para ajustar a mano el tamaño de cada
 *     elemento (personaje por pose, mira, flechas, logo de repuesto), pensada
 *     para ensayo y error visual sin tocar el resto del código.
 *   - `CONFIG.aimSensitivity`: amplifica el desplazamiento real del puntero
 *     al mover la mira (ver "exageración" en raulito.md). Sin esto no había
 *     espacio físico suficiente para arrastrar la mira hasta cruzar el borde
 *     izquierdo de la pantalla, porque Raulito arranca pegado a la esquina.
 *   - Regla de validez: el puntero real (dedo/mouse) debe quedarse en la
 *     mitad DERECHA de la pantalla mientras se apunta. Si cruza a la mitad
 *     izquierda (el lado del blanco), se cancela el disparo y se pasa a
 *     pose04, igual que un fallo por tiempo.
 *   - Sistema de puntería: detecta el logo real de arbat en el DOM
 *     (CONFIG.targetSelector) o, si no lo encuentra, dibuja su propia copia
 *     de logo.png en la esquina superior izquierda (para poder probar este
 *     demo aislado). Calcula distancia del punto de impacto al centro del
 *     logo y la compara contra `CONFIG.rings` (10 a 5 puntos, o "miss").
 *   - Globos de diálogo (`showSpeechBubble`) sobre el personaje: "MISS",
 *     "¡Eso fue un diez!", etc. Reutilizable para diálogos futuros.
 *   - Sonido de tensado (tensar.mp3): suena al entrar en pose de apuntado.
 * v0.3 — agrega:
 *   - Regla de mitad de pantalla para la MIRA (no solo para el puntero
 *     real): si el centro de la mira cruza a la mitad DERECHA de la
 *     pantalla (el lado de Raulito) mientras se apunta, se cancela el tiro
 *     y pasa a pose04 — antes solo se validaba la mitad de pantalla del
 *     puntero real, pero la mira (amplificada y espejada) podía terminar
 *     del lado derecho igual, lo que permitía clavar flechas ahí.
 *   - Se separa el sonido único `disparo.mp3` (antes representaba
 *     liberación + impacto juntos) del nuevo `golpe.mp3` (impacto):
 *     `disparo.mp3` suena apenas se libera la flecha (al entrar en
 *     pose02), y recién `CONFIG.hitDelayMs` después suena `golpe.mp3`
 *     junto con la flecha clavándose en pantalla y el cálculo/globo de
 *     puntaje (antes ambos ocurrían en el mismo instante, con un solo clip
 *     y sin delay).
 * v0.4 — agrega:
 *   - `CONFIG.heartbeat`: "latidos" de la mira. Mientras se apunta, un
 *     loop de animación (requestAnimationFrame) suma un pequeño temblor
 *     pulsante a la mira, encima del desplazamiento normal por el
 *     arrastre. En reposo (puntero real quieto) el pulso es casi
 *     imperceptible; ante un movimiento brusco del puntero se acelera y se
 *     vuelve errático (más amplitud, más frecuencia, más ruido aleatorio),
 *     simulando un latido de corazón que se agita. Toda la calibración
 *     (amplitudes, bpm de reposo/máximo, qué tan rápido sube/baja la
 *     intensidad) vive en `CONFIG.heartbeat`, pensada para ajuste a mano
 *     como la zona de `scales`. La validez de la mira (regla de mitad de
 *     pantalla) se sigue calculando sobre la posición BASE, sin el pulso,
 *     para que el temblor nunca sea la causa de un fallo.
 *   - `CONFIG.arrowLimit`: cada `countBeforeCooldown` flechas clavadas
 *     (6 por defecto), Raul necesita `cooldownMs` (10s) antes de poder
 *     disparar de nuevo. A los `fadeStartMs` (5s) de esa espera, las
 *     flechas de la tanda que se acaba de completar empiezan a
 *     desvanecerse (`fadeDurationMs`) hasta desaparecer del todo. Si se
 *     intenta iniciar un disparo estando en ese cooldown, Raul dice
 *     `CONFIG.arrowLimit.waitMessage` ("Espera, debo ir por las
 *     flechas...") en vez de entrar en pose de apuntado.
 *   - Mensaje de fallo específico cuando la MIRA cruza a la mitad derecha
 *     de la pantalla (se aleja demasiado de la diana, que vive del lado
 *     izquierdo): en vez del "MISS" genérico, el globo dice "No se debe
 *     apuntar tan lejos de la diana". El resto de los fallos (soltar
 *     tarde, timeout, o el puntero real cruzando de lado) siguen usando el
 *     "MISS" genérico, igual que un impacto que cae fuera de todos los
 *     aros.
 * v0.5 — agrega:
 *   - `CONFIG.arrowLog`: registro en memoria de TODAS las flechas
 *     lanzadas (impactadas) en esta sesión del explorador — cada entrada
 *     guarda número de flecha, marca de tiempo (Date.now()) y puntaje.
 *     Se agrupan en "andanadas" de `arrowLog.arrowsPerAndanada` flechas
 *     (6 por defecto). Pensado para usarse más adelante (estadísticas,
 *     analítica, etc.), expuesto vía `Raulito.getArrowLog()`. Vive sólo
 *     en memoria: no sobrevive a un F5 (ver comentario junto a
 *     `sessionArrowLog` más abajo).
 *   - `CONFIG.fatigue`: "temblor de cansancio muscular" en la mira,
 *     independiente del latido de `CONFIG.heartbeat` y sumado encima de
 *     él. Empieza a manifestarse a partir de `fatigue.startAfterArrow`
 *     flechas disparadas. Cada flecha que se dispara sin respetar
 *     `fatigue.expectedCooldownMs` desde la anterior sube el temblor un
 *     nivel; descansar (no disparar) `fatigue.restStartMs` lo baja, y
 *     cada `fatigue.restStepMs` adicionales de descanso lo baja un nivel
 *     más, hasta volver a cero. Si se acumulan
 *     `fatigue.exhaustionStreak` flechas seguidas sin respetar el
 *     cooldown, Raúl se agota: fuerza pose04 y dice
 *     `fatigue.exhaustionMessage`, bloqueando nuevos disparos hasta
 *     descansar `fatigue.exhaustionRestMs`, momento en el que vuelve solo
 *     a pose03 (sonriendo) y se puede seguir jugando.
 * v0.6 — agrega:
 *   - `CONFIG.vaiven`: nuevo handicap de puntería, independiente del
 *     latido (`heartbeat`) y del temblor de cansancio (`fatigue`), aunque
 *     comparte el mismo loop de animación (aimTremorTick). Mientras se
 *     apunta, la mira recorre un vaivén suave con forma de 8 (curva de
 *     Lissajous 1:2) alrededor de su posición base — a diferencia del
 *     latido, no reacciona a la velocidad del puntero real: es un
 *     movimiento ambiente constante, presente desde el primer instante de
 *     apuntado. El radio de ese 8 arranca chico (`vaiven.baseRadiusPx`,
 *     "un ligero vaivén") y crece con el mismo nivel de cansancio que ya
 *     calcula `currentFatigueLevel()` para el temblor de `fatigue`
 *     (`vaiven.radiusPerFatigueLevelPx` por nivel) — es decir, cuanto más
 *     cansado está Raúl, más lejos del centro se desplaza la mira tanto
 *     por el vaivén en 8 como por la sacudida de `fatigue` (que ya crecía
 *     con el nivel desde v0.5: `fatigue.amplitudePerLevelPx`).
 * v0.7 — agrega:
 *   - `CONFIG.targetSelector` pasa a apuntar por defecto al logo real del
 *     sitio (`.site-header .site-logo img`, confirmado contra el HTML/CSS
 *     reales de arbat_frontend) en vez de quedar en `null`. El juego NUNCA
 *     muestra, oculta, mueve ni redimensiona ese elemento — sólo LEE su
 *     posición y tamaño (getBoundingClientRect) para calcular aros y
 *     anclar flechas; la única tecla que controla algo visualmente es
 *     `testTriggerKey` ('r'), y sólo afecta a Raulito (el personaje),
 *     nunca al logo, que es contenido de la página fuera de su control.
 *   - Anclaje de las flechas clavadas al blanco real (`stickArrowAt` +
 *     `repositionStuckArrows`, disparado en scroll/resize vía
 *     `bindArrowRepositioning`): antes, cada flecha guardaba solo su
 *     coordenada de VIEWPORT en el momento del impacto y quedaba fija ahí
 *     (position: fixed). Como el logo real vive en el flujo normal de la
 *     página (no es fixed), scrollear después de un impacto separaba
 *     visualmente la flecha del logo. Ahora cada flecha guarda además su
 *     offset respecto de la esquina superior izquierda del blanco en el
 *     instante del impacto (`anchorDx`/`anchorDy`), y ese offset se usa
 *     para recalcular left/top cada vez que la página scrollea o cambia
 *     de tamaño — así la flecha se mueve junto con el logo real, sin
 *     tocar la página en sí (sigue siendo `position: fixed`, sólo se le
 *     recalculan las coordenadas). `computeScore` ahora acepta un `rect`
 *     ya leído para no leer el DOM dos veces y garantizar que el puntaje
 *     y el anclaje usen la misma posición exacta del logo.
 * v0.8 — agrega:
 *   - `CONFIG.calibracion`: nuevo handicap, "mira sin calibrar". No mueve
 *     el DIBUJO de la mira (eso lo siguen haciendo heartbeat/fatigue/vaiven
 *     encima, sin cambios) sino el PUNTO DE IMPACTO real usado por
 *     computeScore/stickArrowAt, que queda corrido respecto del centro
 *     visual que el jugador vio al soltar — como una mira óptica
 *     descalibrada. Al cargar la página (`initCalibration`, llamada desde
 *     init()) se sortea un desvío fijo de entre `minErrorPx` y
 *     `maxErrorPx` en una dirección aleatoria; ese desvío se mantiene
 *     igual disparo a disparo y sólo se corrige un `correctionRatio`
 *     (25% por defecto) al completar cada andanada de
 *     `CONFIG.arrowLimit.countBeforeCooldown` flechas
 *     (`recalibrateMira`, llamada desde `startArrowCooldown` — reutiliza
 *     ese mismo umbral de "andanada" en vez de llevar un contador
 *     propio), momento en el que Raúl avisa con `calibracion.message`
 *     ("Voy a calibrar la mira...") con el mismo delay que dura el globo
 *     de puntaje recién mostrado, para no taparlo. El error nunca llega a
 *     0 exacto (siempre queda un 75% del anterior), sólo se achica con el
 *     tiempo.
 * v1.0 — primera versión en producción. Agrega:
 *   - Pedido de apuntado en cola desde pose02: antes, mientras Raúl
 *     estaba en 'resolved' (pose02, recién disparó, todavía sin volver a
 *     pose03), un nuevo pointerdown se ignoraba por completo
 *     (`onPointerDown` exigía `state === 'idle'`), así que había que
 *     esperar a que terminara toda la secuencia de disparo (impacto +
 *     globo de puntaje) para poder volver a tocar/arrastrar a Raulito.
 *     Ahora, si se hace click/touch-and-drag sobre Raulito mientras sigue
 *     en pose02 (`currentCharPoseKey === 'fire'`), la flecha que acaba de
 *     soltar NO se cancela ni se descarta — sigue su curso normal
 *     (`hitTimer`/`resolveTimer` intactos: impacto, puntaje, sonido,
 *     `arrowLimit`, todo igual que sin este click). Lo que hace el click
 *     es dejar anotado un pedido (`pendingAimRequest`): apenas esa
 *     flecha termina de resolverse — mismo instante en que antes volvía a
 *     pose03 — en vez de eso pasa DERECHO a pose01 (apuntando), sin pasar
 *     por 'pending' ni por el toque largo de `longPressThresholdMs`, como
 *     si el jugador ya lo estuviera volviendo a tensar con el arco
 *     todavía en la mano. Si Raúl queda agotado por ese disparo, o si ese
 *     mismo disparo completa una tanda y dispara el cooldown del carcaj,
 *     el pedido en cola se descarta (no se saltea ni el agotamiento ni el
 *     cooldown). Soltar antes de que la flecha anterior resuelva cancela
 *     el pedido en cola sin afectar esa flecha. Este atajo NO aplica
 *     sobre pose04 (fallo): ese caso sigue esperando a volver a 'idle'
 *     como antes.
 *   - `CONFIG.cadencia`: nuevo handicap, independiente de `fatigue`
 *     aunque mide lo mismo que dispara su umbral (tiempo transcurrido
 *     desde el último disparo, `lastShotAt`). A diferencia de `fatigue`
 *     (niveles discretos que suben de a uno y decaen de a pasos), acá el
 *     efecto es CONTINUO: cuanto menos tiempo pasó desde el último
 *     disparo, mayor el multiplicador (`cadenciaMultiplier`, > 1) que se
 *     aplica ENCIMA de lo que ya calculan por su cuenta el vaivén en 8
 *     (distancia), el latido (recorrido) y el temblor de cansancio
 *     (distancia) — los tres a la vez, en `aimTremorTick`. Con una pausa
 *     de `CONFIG.cadencia.restMs` (6s por defecto) sin disparar, el
 *     multiplicador vuelve a 1 y las tres distancias quedan en su valor
 *     original. No modifica ninguno de los tiempos de cooldown que ya
 *     exige `fatigue` ni el cooldown del carcaj (`arrowLimit`) — es
 *     puramente un efecto visual sobre la mira, y no afecta la posición
 *     BASE que se usa para validar el apuntado.
 *
 * No requiere frameworks. Pensado para incluirse con:
 *   <script src="/assets/js/raulito.js" defer></script>
 * en cualquier página del sitio Jekyll (arbat_frontend).
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------
  var CONFIG = {
    // Carpetas de assets. Pueden sobreescribirse antes de cargar este script
    // definiendo window.RAULITO_ASSET_BASE / window.RAULITO_AUDIO_BASE
    // (útil para pruebas locales con rutas relativas).
    assetBase: window.RAULITO_ASSET_BASE || '/arbat_frontend/assets/imagen/minijuego/',
    // Supuesto: no se especificó dónde vive el audio del sitio real: se
    // asume una carpeta "sonido" paralela a "imagen". Ajustar si el sitio
    // real usa otra convención (p. ej. /assets/audio/).
    audioBase: window.RAULITO_AUDIO_BASE || '/arbat_frontend/assets/sonido/minijuego/',

    poses: {
      idle: 'pose03.png', // parado, en reposo — estado por defecto
      aim: 'pose01.png',  // arco armado y apuntando (arranca con toque largo)
      fire: 'pose02.png', // flecha soltada / disparo realizado
      fail: 'pose04.png'  // se soltó tarde, se agotó el tiempo, o gesto inválido
    },
    miraImage: 'mira.png',
    arrowImages: ['f01.png', 'f02.png', 'f03.png', 'f04.png'],
    // disparo.mp3 = liberación de la cuerda (suena al instante, junto con
    // pose02). golpe.mp3 = impacto de la flecha (suena CONFIG.hitDelayMs
    // después, junto con la flecha clavándose — ver hitTimer/resolve()).
    // Antes de v0.3 era un solo clip que representaba ambos momentos a la
    // vez; ahora están separados en el tiempo.
    shotSound: 'disparo.mp3',
    hitSound: 'golpe.mp3',
    tensSound: 'tensar.mp3', // sonido de tensado de la cuerda

    // -------------------------------------------------------------------
    // ZONA DE ESCALAS — pensada para ensayo y error visual. Cada valor es
    // un multiplicador que se aplica ENCIMA del % base de cada elemento
    // (characterLongSidePercent / miraLongSidePercent / arrowLongSidePercent
    // / targetLongSidePercent, más abajo). 1 = no cambia nada, >1 agranda,
    // <1 achica. Es el único lugar que hace falta tocar para calibrar
    // tamaños — no hace falta entender el resto del script para usarlo.
    //
    // Por qué pose01/pose02 necesitan un valor propio: ambas miden 848×1264,
    // bastante más anchas que pose03/pose04 (372×1195) porque incluyen el
    // arco extendido hacia el lado. Como el ajuste de tamaño usa el LADO
    // LARGO (la altura, en los cuatro casos), pose01/02 terminan con la
    // misma altura de imagen que pose03/04 — pero dentro de esa altura, el
    // cuerpo del personaje ocupa menos espacio (aprox. 76% vs. ~97%, porque
    // arriba del hombro queda el arco/la punta de la flecha), así que se ve
    // más chico. 1.3 es el valor inicial estimado a partir de esa
    // proporción (0.97/0.76 ≈ 1.28) — ajustar aquí si al probarlo en
    // pantalla no coincide con pose03/pose04.
    scales: {
      character: {
        idle: 1,    // pose03
        aim: 1.3,   // pose01 — valor inicial estimado, ajustar en pruebas
        fire: 1.3,  // pose02 — mismo encuadre que pose01
        fail: 1     // pose04
      },
      mira: 1,
      arrow: 1,
      target: 1 // solo afecta la copia de repuesto del logo (ver más abajo)
    },

    // Reglas de tamaño base. Se calculan sobre el "lado largo de la
    // pantalla" = Math.max(innerWidth, innerHeight). El multiplicador de
    // `scales` de arriba se aplica sobre estos porcentajes.
    characterLongSidePercent: 0.15, // Raulito ocupa 15% del lado largo
    arrowLongSidePercent: 0.05,     // cada flecha clavada ocupa 5%
    miraLongSidePercent: 0.20,      // mira.png ocupa 20% del lado largo
    targetLongSidePercent: 0.08,    // copia de repuesto del logo (demo)

    // Umbral para distinguir "toque largo" de un click/tap normal.
    longPressThresholdMs: 350,

    // Ventana de disparo: soltar antes de esto = pose02 (disparó bien).
    fireWindowMs: 8000,
    // Tiempo absoluto máximo sosteniendo el arco antes de forzar el fallo.
    maxHoldMs: 10000,

    // Cuánto se queda mostrando pose02/pose04 antes de volver a pose03.
    resolveDisplayMs: 1500,
    // Cuánto se queda visible el globo de diálogo con el resultado.
    bubbleDisplayMs: 2200,

    // Delay entre el momento del disparo (pose02 + disparo.mp3) y el
    // impacto (golpe.mp3 + la flecha clavándose en pantalla + el cálculo
    // de puntaje/globo de diálogo). Valor inicial estimado — pensado para
    // simular el vuelo breve de la flecha; ajustar a ojo si al probarlo no
    // se siente natural. Debe quedar por debajo de `resolveDisplayMs`
    // (si no, volvería a pose03 antes de llegar a mostrar el impacto).
    hitDelayMs: 300,

    // Multiplicador de "exageración" del movimiento de la mira respecto al
    // arrastre real del puntero (ver raulito.md, mecánica de la mira: "con
    // demora y exageración respecto a los movimientos reales del usuario").
    // Sin amplificar, no hay espacio físico suficiente para mover la mira
    // hasta el borde izquierdo de la pantalla: Raulito arranca pegado a la
    // esquina inferior derecha, así que el arrastre válido (ver regla de
    // "mitad de pantalla" abajo) dispone de poco recorrido en píxeles reales
    // antes de considerarse inválido. Subir este valor si la mira sigue sin
    // llegar al borde; bajarlo si se vuelve demasiado nerviosa/difícil de
    // controlar.
    aimSensitivity: 4,

    // -------------------------------------------------------------------
    // Latidos de la mira (v0.4). Zona de calibración pensada para ensayo y
    // error visual, igual que `scales` — no hace falta tocar el resto del
    // script para ajustar cómo se siente el pulso.
    //
    // Mecánica: mientras se apunta, un loop de animación calcula en cada
    // frame una intensidad 0..1. Esa intensidad SUBE rápido (ver
    // `intensityAttackPerSec`) cuando el puntero real se mueve rápido
    // (medido en px/ms contra `velocityForMaxIntensity`), y BAJA lento
    // (`intensityReleasePerSec`) apenas el puntero deja de moverse — igual
    // que un pulso real, que se acelera al instante ante un sobresalto
    // pero tarda en volver a calmarse. La intensidad interpola entre los
    // valores "rest" (reposo) y "max" (agitado) de amplitud/bpm de abajo,
    // y también escala el ruido aleatorio (`jitterPx`) que hace que el
    // temblor se sienta errático y no un simple vaivén regular.
    heartbeat: {
      enabled: true,

      // Amplitud del pulso en reposo (px) — debe ser chica, casi
      // imperceptible a simple vista.
      restAmplitudePx: 1.5,
      // Amplitud del pulso al máximo de agitación (px).
      maxAmplitudePx: 14,

      // Frecuencia del pulso en reposo, en pulsaciones por minuto (bpm),
      // como un latido cardíaco tranquilo.
      restBpm: 62,
      // Frecuencia del pulso al máximo de agitación (bpm), como un latido
      // acelerado.
      maxBpm: 190,

      // Velocidad real del puntero (px/ms) que corresponde a intensidad
      // máxima (1). Un arrastre rápido con mouse/dedo suele rondar 1.5-3
      // px/ms — bajar este valor si cuesta llegar a la intensidad máxima,
      // subirlo si se dispara demasiado fácil.
      velocityForMaxIntensity: 2.2,

      // Qué tan rápido SUBE la intensidad ante un movimiento brusco,
      // expresado en "unidades de intensidad (0 a 1) por segundo". Alto =
      // reacciona casi al instante ante el sobresalto.
      intensityAttackPerSec: 10,
      // Qué tan rápido BAJA la intensidad cuando el puntero se queda
      // quieto, mismas unidades. Bajo = tarda en calmarse.
      intensityReleasePerSec: 1.2,
      // Cuántos ms sin un evento pointermove hacen falta para considerar
      // que el puntero real "dejó de moverse" (y por lo tanto el objetivo
      // de intensidad empieza a decaer hacia el reposo).
      stillnessMs: 80,

      // Temblor errático adicional (px), sumado al pulso principal y
      // escalado por la intensidad actual — a intensidad 0 no suma nada,
      // a intensidad 1 suma hasta este valor en cada eje.
      jitterPx: 6
    },

    // -------------------------------------------------------------------
    // Temblor de cansancio muscular (v0.5). A diferencia del latido de
    // `heartbeat` (que reacciona a la VELOCIDAD del puntero real), este
    // temblor depende de CUÁNTAS flechas se llevan disparadas y CUÁNTO se
    // descansó entre una y otra — simula que sostener y tensar el arco
    // repetidas veces, sin pausas, cansa el brazo. Se suma encima del
    // pulso de `heartbeat` (ambos comparten el mismo loop de animación,
    // ver aimTremorTick), y puede activarse/desactivarse por separado con
    // `enabled`.
    fatigue: {
      enabled: true,

      // Cantidad de flechas disparadas (impactadas) en la sesión a partir
      // de la cual empieza a manifestarse el cansancio. Antes de llegar a
      // esta flecha no hay temblor de cansancio (sólo puede seguir
      // habiendo latido, que es independiente).
      startAfterArrow: 6,

      // Tiempo mínimo esperable entre el disparo de una flecha y el
      // siguiente para considerarlo un ritmo "sano". Disparar antes de
      // que pase este tiempo desde la flecha anterior sube el temblor un
      // nivel (ver increasePerLateShot) y suma una flecha a la racha de
      // exhaustionStreak.
      expectedCooldownMs: 5000,

      // Cuántos niveles de temblor se suman cada vez que se dispara sin
      // respetar expectedCooldownMs.
      increasePerLateShot: 1,

      // Tope de niveles de temblor (0 = sin temblor). Evita que crezca
      // sin límite visual aunque se acumulen muchas flechas seguidas.
      maxLevel: 6,

      // A partir de cuántos ms de descanso (sin disparar) empieza a BAJAR
      // el temblor. Por debajo de este tiempo el temblor no sube (si se
      // respetó expectedCooldownMs) ni baja: queda como está.
      restStartMs: 15000,
      // Cada cuántos ms adicionales de descanso, por encima de
      // restStartMs, se suma un nivel más de reducción. Con los valores
      // por defecto: a los 15s se reduce 1 nivel, a los 20s 2 niveles, a
      // los 25s 3 niveles, y así de a restStepMs hasta llegar a 0. Ajustar
      // estos dos valores (restStartMs / restStepMs) para hacer la
      // recuperación más rápida o más lenta.
      restStepMs: 5000,

      // Cuántas flechas SEGUIDAS disparadas sin respetar
      // expectedCooldownMs (sin que se corte la racha con un disparo bien
      // espaciado) hacen que Raúl se agote del todo: fuerza pose04 y dice
      // exhaustionMessage, bloqueando nuevos disparos. Sólo cuenta a
      // partir de startAfterArrow.
      exhaustionStreak: 18,
      // Lo que dice Raúl al agotarse del todo.
      exhaustionMessage: 'dame un descanzo, se me canzó el brazo',
      // Cuánto descanso (ms sin disparar) hace falta, una vez agotado,
      // para que Raúl vuelva solo a pose03 y se pueda seguir jugando. Por
      // defecto es igual a restStartMs (el mismo umbral que empieza a
      // bajar el temblor), pero se deja como valor propio por si se
      // quiere pedir un descanso más largo específicamente para
      // recuperarse del agotamiento total.
      exhaustionRestMs: 15000,

      // Calibración visual: cuántos px de amplitud aporta CADA nivel de
      // temblor (se suma encima del pulso de heartbeat).
      amplitudePerLevelPx: 2.5,
      // Ruido/jitter aleatorio adicional por nivel, análogo a
      // heartbeat.jitterPx pero propio de este sistema.
      jitterPerLevelPx: 1.2,
      // Frecuencia de la sacudida de cansancio, en ciclos por segundo
      // (Hz). A diferencia del latido (bpm variable según intensidad),
      // acá la frecuencia es fija — sólo la amplitud/jitter escalan con
      // el nivel de cansancio.
      shakeHz: 9
    },

    // -------------------------------------------------------------------
    // Vaivén en forma de 8 (v0.6). Handicap de puntería independiente del
    // latido (`heartbeat`) y del temblor de cansancio (`fatigue`), aunque
    // se calcula en el mismo loop de animación y se suma encima de ambos.
    //
    // Mecánica: mientras se apunta, la mira recorre constantemente una
    // curva de Lissajous 1:2 (x = sin(fase), y = 0.5·sin(2·fase)) alrededor
    // de su posición base — el trazo clásico de un "8" acostado. A
    // diferencia del latido, NO depende de qué tan rápido se mueve el
    // puntero real: es un balanceo ambiente presente desde el primer
    // instante de apuntado, constante mientras no haya cansancio.
    //
    // El radio de ese 8 (qué tan lejos del centro llega la mira) arranca
    // chico (`baseRadiusPx`) y crece con el mismo nivel de cansancio que
    // ya calcula `currentFatigueLevel()` para `fatigue` — reutiliza ese
    // nivel (0..fatigue.maxLevel) en vez de llevar un contador propio, así
    // que si `fatigue.enabled` está en false el radio nunca crece y queda
    // fijo en `baseRadiusPx`.
    vaiven: {
      enabled: true,

      // Radio (px) del 8 sin cansancio acumulado — debe ser chico, "un
      // ligero vaivén" apenas perceptible.
      baseRadiusPx: 5,
      // Radio adicional (px) que aporta CADA nivel de cansancio actual
      // (currentFatigueLevel), sumado sobre baseRadiusPx. Con los valores
      // por defecto de `fatigue` (maxLevel: 6), el radio máximo posible es
      // baseRadiusPx + 6 * radiusPerFatigueLevelPx.
      radiusPerFatigueLevelPx: 3.5,

      // Velocidad a la que se recorre el 8, en vueltas completas por
      // segundo (Hz). Deliberadamente lento — es un balanceo, no un
      // temblor — para que se distinga a simple vista del latido/cansancio.
      hz: 0.35
    },

    // -------------------------------------------------------------------
    // Cadencia de disparo (v1.0). Handicap nuevo, independiente de
    // `fatigue` aunque mide lo mismo que dispara su umbral (el tiempo
    // transcurrido desde el último disparo, `lastShotAt`). La diferencia:
    // `fatigue` sube/baja por NIVELES discretos (un nivel entero por
    // disparo apurado, decae de a pasos con `restStartMs`/`restStepMs`);
    // acá el efecto es CONTINUO y puramente de tiempo transcurrido —
    // cuanto MENOS tiempo pasó desde el último disparo, mayor el
    // multiplicador (> 1) que se aplica ENCIMA de lo que cada uno ya
    // calcula por su cuenta: la distancia del vaivén en 8
    // (`vaivenRadius`), el recorrido del latido (`amplitude`/jitter de
    // `heartbeat`) y la distancia del temblor de cansancio
    // (`fatigueAmplitude`/jitter de `fatigue`) — los tres a la vez (ver
    // `cadenciaMultiplier` y su uso en `aimTremorTick`). Con una pausa
    // de `restMs` (6s por defecto) sin disparar, el multiplicador vuelve
    // a 1 y las tres distancias quedan en su valor original, como si
    // este handicap no existiera.
    //
    // Importante: esto NO toca ninguno de los tiempos de cooldown que ya
    // exige `fatigue` (expectedCooldownMs, restStartMs/restStepMs,
    // exhaustionStreak, exhaustionRestMs) ni el cooldown del carcaj
    // (`arrowLimit`) — es un efecto puramente visual sobre la mira,
    // igual que el resto de los temblores, y nunca afecta la posición
    // BASE que se usa para validar el apuntado.
    cadencia: {
      enabled: true,

      // Pausa (ms) sin disparar que hace falta para que el multiplicador
      // vuelva a 1 (distancias en su valor original).
      restMs: 6000,

      // Multiplicador EXTRA (encima de 1) en el peor caso, cuando el
      // tiempo desde el último disparo es ~0 (se vuelve a disparar casi
      // inmediatamente). Con el valor por defecto (1) el multiplicador
      // total va de 2× (recién disparado) a 1× (tras restMs de pausa) —
      // ajustar a mano junto con el resto de las amplitudes si se siente
      // poco o demasiado intenso.
      maxExtraMultiplier: 1
    },

    // -------------------------------------------------------------------
    // Mira sin calibrar (v0.8). Handicap de puntería distinto a los
    // anteriores: no mueve el DIBUJO de la mira en pantalla (eso lo
    // siguen haciendo heartbeat/fatigue/vaiven encima), sino que desplaza
    // el PUNTO DE IMPACTO real (el que usan computeScore y stickArrowAt)
    // respecto de donde el jugador vio realmente el centro de la mira al
    // soltar — como una mira óptica que no está bien calibrada: uno
    // apunta donde parece correcto, pero la flecha cae corrida.
    //
    // Al cargar la página se sortea un error fijo (`calibOffsetX/Y`, ver
    // más abajo) de entre `minErrorPx` y `maxErrorPx` de magnitud, en una
    // dirección aleatoria. Ese error se mantiene igual disparo a disparo
    // dentro de una misma andanada — no es ruido nuevo en cada flecha,
    // es un desvío constante, como correspondería a una mira mal
    // calibrada de verdad — y sólo se corrige (se reduce un
    // `correctionRatio` de su valor actual, es decir se achica un 25% por
    // defecto) al completar cada andanada de
    // `CONFIG.arrowLimit.countBeforeCooldown` flechas (reutiliza ese
    // mismo umbral en vez de llevar un contador propio — ver
    // startArrowCooldown/recalibrateMira), momento en el que Raúl avisa
    // con `message` que va a ajustarla. Con el tiempo (varias andanadas)
    // el error tiende a cero sin llegar a desaparecer del todo (75% del
    // error anterior, nunca 0 exacto).
    calibracion: {
      enabled: true,

      // Magnitud mínima/máxima (px) del error inicial, sorteado una sola
      // vez al cargar la página (ver initCalibration).
      minErrorPx: 10,
      maxErrorPx: 30,

      // Fracción del error ACTUAL que se corrige (se acerca al centro
      // real) cada vez que se completa una andanada. 0.25 = el error
      // queda en 75% de lo que era.
      correctionRatio: 0.25,

      // Lo que dice Raúl al recalibrar, mostrado con el mismo delay que
      // dura el globo de puntaje de la última flecha de la andanada
      // (CONFIG.bubbleDisplayMs), para no taparlo.
      message: 'Voy a calibrar la mira...'
    },

    // -------------------------------------------------------------------
    // Límite de flechas / cooldown del carcaj (v0.4). Cada
    // `countBeforeCooldown` flechas clavadas, Raul necesita `cooldownMs`
    // antes de poder disparar de nuevo (va a buscar las flechas). A los
    // `fadeStartMs` de esa espera, las flechas de la tanda recién
    // completada empiezan a desvanecerse durante `fadeDurationMs`, hasta
    // desaparecer del todo. Si se intenta iniciar un disparo estando en
    // cooldown, se muestra `waitMessage` en vez de entrar en pose de
    // apuntado.
    arrowLimit: {
      countBeforeCooldown: 6,
      cooldownMs: 10000,
      fadeStartMs: 5000,
      // Por defecto ocupa el resto del cooldown (cooldownMs - fadeStartMs)
      // para que las flechas terminen de desvanecerse justo cuando se
      // vuelve a poder disparar. Se puede fijar a mano si se prefiere un
      // desvanecimiento más rápido o más lento.
      fadeDurationMs: 5000,
      waitMessage: 'Espera, debo ir por las flechas...'
    },

    // -------------------------------------------------------------------
    // Registro de flechas de la sesión (v0.5). Ver `sessionArrowLog` más
    // abajo — un arreglo en memoria con TODAS las flechas disparadas
    // (impactadas) desde que se cargó la página, pensado para usarse más
    // adelante (estadísticas, analítica, etc.).
    arrowLog: {
      // Tamaño de cada "andanada" (grupo de flechas) para el conteo de
      // sessionArrowLog. Coincide por defecto con
      // arrowLimit.countBeforeCooldown porque conceptualmente es el mismo
      // grupo de 6, pero se deja como valor propio por si se quisiera
      // contar andanadas de un tamaño distinto al del cooldown del
      // carcaj.
      arrowsPerAndanada: 6
    },

    // -------------------------------------------------------------------
    // Blanco / puntería. El logo real de arbat (esquina superior izquierda
    // de la página) sirve de diana. El juego usa su posición y tamaño
    // reales (getBoundingClientRect) para calcular los aros — nunca lo
    // muestra, oculta, mueve ni redimensiona: es contenido de la página
    // (fuera del control de raulito.js), sólo se LEE su posición.
    // '.site-header .site-logo img' es el <img> real dentro de
    // `<a class="site-logo">` en el layout del sitio (ver
    // .site-header .site-logo img en style.css: height:30px, width:auto).
    // Si no se encuentra ningún elemento con ese selector (p. ej. al
    // probar este script aislado, fuera del sitio real), el script dibuja
    // su propia copia de `targetImage` en la esquina superior izquierda,
    // solo para poder probar la puntería sin la página real.
    targetSelector: '.site-header .site-logo img',
    targetImage: 'logo.png',
    targetMarginPx: 16,

    // Anillos de puntería, medidos directamente sobre logo.png (el círculo
    // dentro de la "a" de arbat: negro / blanco / naranja / blanco / negro).
    // outerPercent = fracción del RADIO del logo renderizado (0 a 1) hasta
    // donde llega cada zona, medida desde el centro. Las primeras cinco
    // fracciones salen de examinar los píxeles reales de logo.png; la
    // última (5 puntos, "espacio blanco externo") no está delimitada por el
    // arte del logo en sí —es un supuesto documentado en raulito.md—, así
    // que es la más fácil de mover si hace falta agrandar o achicar la zona
    // de 5 puntos.
    rings: [
      { points: 10, outerPercent: 0.14 }, // círculo negro interno
      { points: 9,  outerPercent: 0.27 }, // aro blanco
      { points: 8,  outerPercent: 0.45 }, // aro naranja
      { points: 7,  outerPercent: 0.61 }, // espacio blanco
      { points: 6,  outerPercent: 0.81 }, // aro negro externo
      { points: 5,  outerPercent: 1.05 }  // espacio blanco externo (supuesto)
    ],

    // Tecla de prueba para invocar/ocultar a Raulito. Cambiar si genera
    // conflicto con otros atajos del sitio.
    testTriggerKey: 'r',

    characterMarginPx: 16,
    miraMarginPx: 16,

    // Panel de depuración visible mientras se prueba el prototipo. Poner en
    // false (o borrar el bloque marcado como DEBUG) para producción.
    debug: false
  };

  // Frases del globo de diálogo según el puntaje. "MISS" (fuera de todos
  // los aros, o intento inválido) no necesita entrada acá, se usa el string
  // fijo más abajo. Agregar/editar frases acá cuando haya más variedad.
  var SCORE_PHRASES = {
    10: '¡Eso fue un diez!',
    9: '¡Eso fue un nueve!',
    8: '¡Eso fue un ocho!',
    7: '¡Eso fue un siete!',
    6: '¡Eso fue un seis!',
    5: '¡Eso fue un cinco!'
  };
  var MISS_TEXT = 'MISS';
  // Mensaje específico (v0.4) para cuando la MIRA cruza a la mitad derecha
  // de la pantalla (se aleja demasiado de la diana). Reemplaza al "MISS"
  // genérico solo en ese caso puntual — ver la regla de validez en
  // onPointerMoveWhileAiming.
  var FAR_AIM_TEXT = 'No se debe apuntar tan lejos de la diana';

  // ---------------------------------------------------------------------
  // Estado interno
  // ---------------------------------------------------------------------
  var state = 'hidden'; // hidden | idle | pending | aiming | resolved
  var charEl = null;
  var miraEl = null;
  var targetEl = null;  // copia de repuesto del logo (solo si no hay selector real)
  var bubbleEl = null;
  var debugEl = null;

  var activePointerId = null;
  var startX = 0;
  var startY = 0;
  var longPressTimer = null;
  var maxHoldTimer = null;
  var resolveTimer = null;
  var bubbleTimer = null;
  var hitTimer = null; // delay entre disparo.mp3/pose02 y golpe.mp3/flecha clavada
  var aimStartedAt = 0;
  var currentCharPoseKey = 'idle';

  // v1.0: pedido de apuntado en cola — true si el jugador ya hizo
  // click/touch-and-drag sobre Raulito mientras la flecha anterior
  // todavía estaba resolviéndose (pose02, esperando hitTimer/resolveTimer).
  // No cancela esa resolución: sólo queda anotado para, apenas termine,
  // pasar derecho a pose01 en vez de volver a pose03 (ver el resolveTimer
  // dentro de resolve()).
  var pendingAimRequest = false;
  var pendingAimStartX = 0;
  var pendingAimStartY = 0;

  // Precarga: dimensiones naturales cacheadas por nombre de archivo, para
  // poder posicionar/dimensionar una flecha clavada al instante, sin
  // esperar un nuevo evento 'load'.
  var assetDimsCache = {};
  var shotAudio = null;
  var hitAudio = null;
  var tensAudio = null;

  // Flechas ya clavadas en pantalla (para la lógica de agrupamiento). Cada
  // entrada es { el, x, y, score }. Se acumulan entre disparos; no se
  // limpian solas (salvo por el cooldown de v0.4, ver más abajo).
  var stuckArrows = [];

  // -------------------------------------------------------------------
  // Temblor de la mira mientras se apunta: latidos (v0.4) + cansancio
  // (v0.5) — ver CONFIG.heartbeat y CONFIG.fatigue. Ambas fuentes
  // comparten el mismo loop de animación (aimTremorTick).
  // -------------------------------------------------------------------
  var aimTremorRAF = null;         // id de requestAnimationFrame en curso
  var heartbeatIntensity = 0;      // valor mostrado (suavizado), 0..1
  var heartbeatTargetIntensity = 0; // objetivo, fijado por la velocidad real del puntero
  var heartbeatPhase = 0;          // fase acumulada del pulso de latido (radianes)
  var lastPointerMoveAt = 0;       // performance.now() del último pointermove
  var lastPointerX = 0;
  var lastPointerY = 0;
  var lastTremorFrameAt = 0;       // performance.now() del último frame pintado
  var fatiguePhase = 0;            // fase acumulada de la sacudida de cansancio (radianes)
  var vaivenPhase = 0;             // fase acumulada del vaivén en forma de 8 (radianes)
  var lastVaivenRadiusPx = 0;      // último radio de 8 pintado (para el panel de debug)
  // Posición base de la mira (SIN los temblores): lo que antes se
  // escribía directo en miraEl.style.transform en cada pointermove. Ahora
  // solo aimTremorTick escribe el transform final (base + temblores),
  // para no pelear por la escritura del estilo entre el handler de
  // pointermove y el loop de animación.
  var miraBaseDx = 0;
  var miraBaseDy = 0;

  // -------------------------------------------------------------------
  // Cansancio muscular (v0.5) — ver CONFIG.fatigue.
  // -------------------------------------------------------------------
  var fatigueLevel = 0;      // nivel de temblor "consumido" al momento del último disparo (0..maxLevel), sin decaer todavía por el descanso posterior — ver currentFatigueLevel()
  var lastShotAt = 0;        // performance.now() del último disparo (0 = todavía no se disparó ninguna flecha en la sesión)
  var lateShotStreak = 0;    // flechas seguidas disparadas sin respetar fatigue.expectedCooldownMs
  var exhausted = false;     // true mientras Raúl está forzado a pose04 por agotamiento total
  var exhaustionRecoveryTimer = null; // dispara la vuelta a pose03 tras fatigue.exhaustionRestMs de descanso

  // -------------------------------------------------------------------
  // Límite de flechas / cooldown del carcaj (v0.4) — ver CONFIG.arrowLimit.
  // -------------------------------------------------------------------
  var arrowsInBatch = 0;    // flechas clavadas desde el último cooldown
  var cooldownUntil = 0;    // performance.now() hasta el que hay que esperar; 0 = sin cooldown
  var fadeTimer = null;     // dispara el desvanecimiento de la tanda actual

  // -------------------------------------------------------------------
  // Mira sin calibrar (v0.8) — ver CONFIG.calibracion. Desvío (px) entre
  // el centro visual de la mira y el punto de impacto real, sorteado una
  // vez al cargar la página (initCalibration) y corregido de a poco al
  // completar cada andanada (recalibrateMira). Se aplica sólo al momento
  // de resolver un disparo (ver resolve() -> hitTimer) — nunca a la
  // posición dibujada de la mira mientras se apunta.
  var calibOffsetX = 0;
  var calibOffsetY = 0;
  var calibrationBubbleTimer = null; // delay del globo "Voy a calibrar..." tras el de puntaje

  // -------------------------------------------------------------------
  // Registro de flechas de la sesión (v0.5) — ver CONFIG.arrowLog.
  // -------------------------------------------------------------------
  // Cada entrada: { index, timestamp, score, andanada }.
  //   - index: número de flecha dentro de la sesión (arranca en 1).
  //   - timestamp: Date.now() (epoch ms) del impacto — se usa Date.now()
  //     y no performance.now() a propósito, porque esto es para
  //     consumirse después (estadísticas), y Date.now() tiene sentido
  //     fuera de la vida de la página; performance.now() no.
  //   - score: 5 a 10, o null si la flecha impactó fuera de todos los
  //     aros ("miss").
  //   - andanada: número de andanada (grupo de arrowLog.arrowsPerAndanada
  //     flechas) a la que pertenece esta flecha, arranca en 1.
  // Vive sólo en memoria: "sesión del explorador" acá se interpreta como
  // "mientras la página siga cargada en la pestaña", no como algo que
  // sobreviva a un F5 — no se usó sessionStorage porque no se pidió que
  // sobreviva a una recarga; si hiciera falta, es cuestión de serializar
  // este arreglo a sessionStorage en logArrowShot() y restaurarlo en
  // init().
  var sessionArrowLog = [];
  var arrowsFiredTotal = 0; // total de flechas disparadas en la sesión (para gatillar fatigue.startAfterArrow)

  // ---------------------------------------------------------------------
  // Precarga de assets
  // ---------------------------------------------------------------------
  function preloadAssets() {
    var imageNames = [
      CONFIG.poses.idle, CONFIG.poses.aim, CONFIG.poses.fire, CONFIG.poses.fail,
      CONFIG.miraImage, CONFIG.targetImage
    ].concat(CONFIG.arrowImages);

    imageNames.forEach(function (name) {
      var img = new Image();
      img.addEventListener('load', function () {
        assetDimsCache[name] = { width: img.naturalWidth, height: img.naturalHeight };
      });
      img.src = CONFIG.assetBase + name;
    });

    shotAudio = new Audio(CONFIG.audioBase + CONFIG.shotSound);
    shotAudio.preload = 'auto';
    try { shotAudio.load(); } catch (err) { /* noop */ }

    hitAudio = new Audio(CONFIG.audioBase + CONFIG.hitSound);
    hitAudio.preload = 'auto';
    try { hitAudio.load(); } catch (err) { /* noop */ }

    tensAudio = new Audio(CONFIG.audioBase + CONFIG.tensSound);
    tensAudio.preload = 'auto';
    try { tensAudio.load(); } catch (err) { /* noop */ }
  }

  function playShotSound() {
    if (!shotAudio) return;
    try {
      shotAudio.currentTime = 0;
      var p = shotAudio.play();
      if (p && typeof p.catch === 'function') {
        // Los navegadores pueden bloquear el autoplay hasta que haya
        // interacción del usuario; el toque largo ya cuenta como tal, pero
        // se captura el rechazo igual para no ensuciar la consola.
        p.catch(function () { /* noop */ });
      }
    } catch (err) { /* noop */ }
  }

  function playHitSound() {
    if (!hitAudio) return;
    try {
      hitAudio.currentTime = 0;
      var p = hitAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* noop */ });
      }
    } catch (err) { /* noop */ }
  }

  function playTensSound() {
    if (!tensAudio) return;
    try {
      tensAudio.currentTime = 0;
      var p = tensAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* noop */ });
      }
    } catch (err) { /* noop */ }
  }

  function stopTensSound() {
    if (!tensAudio) return;
    try { tensAudio.pause(); tensAudio.currentTime = 0; } catch (err) { /* noop */ }
  }

  // ---------------------------------------------------------------------
  // Utilidades de tamaño
  // ---------------------------------------------------------------------
  function screenLongSide() {
    return Math.max(window.innerWidth, window.innerHeight);
  }

  // Ajusta un elemento para que su lado más largo mida targetPx, a partir
  // de dimensiones naturales ya conocidas (nw/nh), manteniendo proporción.
  function applyLongSideFit(imgEl, nw, nh, targetPx) {
    if (!nw || !nh) return;
    if (nw >= nh) {
      imgEl.style.width = targetPx + 'px';
      imgEl.style.height = 'auto';
    } else {
      imgEl.style.height = targetPx + 'px';
      imgEl.style.width = 'auto';
    }
  }

  // Variante que lee las dimensiones directamente del <img> (usar solo
  // cuando ya está cargado / imgEl.complete === true).
  function fitLongSide(imgEl, targetPx) {
    applyLongSideFit(imgEl, imgEl.naturalWidth, imgEl.naturalHeight, targetPx);
  }

  function characterTargetPx(poseKey) {
    var scale = CONFIG.scales.character[poseKey];
    if (typeof scale !== 'number') scale = 1;
    return CONFIG.characterLongSidePercent * screenLongSide() * scale;
  }

  function miraTargetPx() {
    return CONFIG.miraLongSidePercent * screenLongSide() * CONFIG.scales.mira;
  }

  function arrowTargetPx() {
    return CONFIG.arrowLongSidePercent * screenLongSide() * CONFIG.scales.arrow;
  }

  function targetTargetPx() {
    return CONFIG.targetLongSidePercent * screenLongSide() * CONFIG.scales.target;
  }

  // ---------------------------------------------------------------------
  // Blanco / puntería
  // ---------------------------------------------------------------------
  // Devuelve el elemento a usar como diana: el logo real del sitio si
  // CONFIG.targetSelector está definido y existe en el DOM, o si no, la
  // copia de repuesto (targetEl) que dibuja este script.
  function getTargetEl() {
    if (CONFIG.targetSelector) {
      var real = document.querySelector(CONFIG.targetSelector);
      if (real) return real;
    }
    return targetEl;
  }

  // Muestra la copia de repuesto del logo solo cuando no se encontró un
  // logo real en el DOM (para no dibujar dos logos superpuestos).
  function updateTargetVisibility() {
    if (!targetEl) return;
    var usingRealLogo = !!(CONFIG.targetSelector && document.querySelector(CONFIG.targetSelector));
    targetEl.style.display = usingRealLogo ? 'none' : 'block';
  }

  // Puntaje según distancia de (x, y) al centro del blanco. Devuelve un
  // número (10 a 5) o null si cae fuera de todos los aros ("miss"). Asume
  // que el blanco es aproximadamente circular — si el logo real del sitio
  // tiene mucho padding o no es cuadrado, apuntar targetSelector al
  // elemento gráfico exacto (sin padding extra) para que el radio calculado
  // sea correcto.
  //
  // `rect` es opcional: si ya se leyó getBoundingClientRect() del blanco
  // en el mismo instante (ver resolve() -> hitTimer, que lo reutiliza
  // también para anclar la flecha en stickArrowAt), pasarlo acá evita
  // leer el DOM una segunda vez y garantiza que el puntaje y el anclaje
  // de la flecha usen exactamente el mismo rect. Si no se pasa, se lee
  // uno nuevo (comportamiento anterior, usado por ej. en el preview de
  // puntería del panel de debug mientras se apunta).
  function computeScore(x, y, rect) {
    if (!rect) {
      var el = getTargetEl();
      if (!el) return null;
      rect = el.getBoundingClientRect();
    }
    if (!rect.width || !rect.height) return null;

    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var maxRadius = Math.min(rect.width, rect.height) / 2;
    var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

    for (var i = 0; i < CONFIG.rings.length; i++) {
      var ring = CONFIG.rings[i];
      if (dist <= ring.outerPercent * maxRadius) return ring.points;
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Globo de diálogo
  // ---------------------------------------------------------------------
  function ensureBubbleStyles() {
    if (document.getElementById('raulito-bubble-style')) return;
    var style = document.createElement('style');
    style.id = 'raulito-bubble-style';
    style.textContent =
      '.raulito-bubble{position:fixed;max-width:230px;background:#ffffff;' +
      'color:#1a1a1a;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,' +
      '"Segoe UI",Roboto,sans-serif;padding:10px 14px;border-radius:16px;' +
      'box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:10000;pointer-events:none;' +
      'user-select:none;opacity:0;transform:translateY(8px) scale(.96);' +
      'transition:opacity .18s ease,transform .18s ease;text-align:center;}' +
      '.raulito-bubble.is-visible{opacity:1;transform:translateY(0) scale(1);}' +
      '.raulito-bubble::after{content:"";position:absolute;bottom:-6px;' +
      'right:28px;width:14px;height:14px;background:#ffffff;' +
      'transform:rotate(45deg);border-radius:2px;}';
    document.head.appendChild(style);
  }

  // Posiciona el globo pegado arriba de Raulito, con la colita apuntando
  // hacia su cabeza. Reutiliza charEl.getBoundingClientRect(), así que
  // sigue funcionando aunque cambie el tamaño/posición del personaje.
  function positionBubble() {
    if (!charEl || !bubbleEl) return;
    var rect = charEl.getBoundingClientRect();
    var gap = 14;
    bubbleEl.style.left = 'auto';
    bubbleEl.style.top = 'auto';
    bubbleEl.style.right = Math.max(8, window.innerWidth - rect.right + 10) + 'px';
    bubbleEl.style.bottom = (window.innerHeight - rect.top + gap) + 'px';
  }

  // Función genérica de globo de texto — pensada para reusarse más
  // adelante con cualquier diálogo de Raulito, no solo resultados de tiro.
  function showSpeechBubble(text, durationMs) {
    ensureElements();
    bubbleEl.textContent = text;
    positionBubble();
    bubbleEl.style.display = 'block';
    // Fuerza reflow para que la transición de entrada dispare siempre,
    // incluso si el globo ya estaba visible mostrando otro texto.
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add('is-visible');

    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideSpeechBubble, durationMs || CONFIG.bubbleDisplayMs);
  }

  function hideSpeechBubble() {
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
    if (!bubbleEl) return;
    bubbleEl.classList.remove('is-visible');
    setTimeout(function () {
      if (bubbleEl && !bubbleEl.classList.contains('is-visible')) {
        bubbleEl.style.display = 'none';
      }
    }, 200);
  }

  // ---------------------------------------------------------------------
  // Flecha clavada
  // ---------------------------------------------------------------------
  function pickRandomArrowName() {
    var list = CONFIG.arrowImages;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Clava una flecha aleatoria con su esquina superior izquierda (punto de
  // "clavado", ver raulito.md) exactamente en (x, y), y guarda el puntaje
  // obtenido junto con la posición (base para la lógica de agrupamiento).
  // Deliberadamente sin acotar a los límites del viewport: si (x, y) cae
  // fuera de pantalla, la flecha se crea igual ahí — simplemente no será
  // visible ("se pierde").
  //
  // v0.7 — ancla la flecha al BLANCO, no al viewport. El blanco real (el
  // logo del sitio) vive en el flujo normal de la página: si la persona
  // scrollea después de clavar la flecha, el logo se mueve en el
  // viewport aunque su posición en la página no haya cambiado. Como la
  // flecha se dibuja con `position: fixed` (para poder clavarse en
  // cualquier punto de la pantalla, incluso fuera del elemento gráfico
  // del logo), sin este anclaje quedaría pegada al punto de VIEWPORT
  // donde se clavó y se "despegaría" visualmente del logo en cuanto se
  // scrollea. Para evitarlo, junto con (x, y) se guarda el offset a
  // (x, y) desde la esquina superior izquierda del `targetRect` vigente
  // en el momento del disparo (targetRect = getTargetEl().getBoundingClientRect(),
  // ya calculado en resolve() para el puntaje, se reutiliza acá para no
  // leer el DOM dos veces) — ese offset NO cambia con el scroll, así que
  // repositionStuckArrows() puede recalcular left/top en cada scroll/resize
  // como targetRect_ACTUAL.left/top + ese offset, y la flecha se mueve
  // junto con el logo real. Si no hay target (targetRect null — no
  // debería pasar salvo antes de que cargue la copia de repuesto), la
  // flecha simplemente queda fija en (x, y) como antes.
  function stickArrowAt(x, y, score, targetRect) {
    var name = pickRandomArrowName();
    var arrowEl = document.createElement('img');
    arrowEl.alt = '';
    arrowEl.draggable = false;
    Object.assign(arrowEl.style, {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      zIndex: '9990',
      pointerEvents: 'none',
      userSelect: 'none',
      // Arranca totalmente opaca y sin transición; fadeOutArrows (v0.4)
      // le agrega la transición recién cuando hace falta desvanecerla.
      opacity: '1',
      transition: 'none'
    });

    var cached = assetDimsCache[name];
    if (cached) {
      applyLongSideFit(arrowEl, cached.width, cached.height, arrowTargetPx());
    } else {
      // La precarga todavía no terminó de resolver este archivo puntual:
      // se ajusta en cuanto cargue.
      arrowEl.addEventListener('load', function () {
        assetDimsCache[name] = { width: arrowEl.naturalWidth, height: arrowEl.naturalHeight };
        applyLongSideFit(arrowEl, arrowEl.naturalWidth, arrowEl.naturalHeight, arrowTargetPx());
      });
    }
    arrowEl.src = CONFIG.assetBase + name;

    document.body.appendChild(arrowEl);
    var hasAnchor = !!(targetRect && targetRect.width && targetRect.height);
    var record = {
      el: arrowEl,
      x: x,
      y: y,
      score: score,
      // Offset fijo respecto del blanco (ver comentario de arriba). Sólo
      // tiene sentido si hasAnchor es true.
      anchorDx: hasAnchor ? (x - targetRect.left) : 0,
      anchorDy: hasAnchor ? (y - targetRect.top) : 0,
      hasAnchor: hasAnchor
    };
    stuckArrows.push(record);
    return record;
  }

  // v0.7 — recalcula left/top de cada flecha clavada (con anclaje al
  // blanco, ver stickArrowAt) a partir de la posición ACTUAL del blanco
  // en el viewport. Se llama en scroll/resize (ver bindArrowRepositioning
  // más abajo) para que las flechas sigan "clavadas" en el logo real
  // aunque la página se desplace — el logo vive en el flujo normal de la
  // página (no es fixed), así que su posición en el viewport cambia con
  // el scroll aunque su posición dentro de la página no cambie.
  function repositionStuckArrows() {
    if (!stuckArrows.length) return;
    var el = getTargetEl();
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    stuckArrows.forEach(function (item) {
      if (!item.hasAnchor) return;
      var nx = rect.left + item.anchorDx;
      var ny = rect.top + item.anchorDy;
      item.el.style.left = nx + 'px';
      item.el.style.top = ny + 'px';
    });
  }

  // v0.7 — throttlea repositionStuckArrows a un máximo de una vez por
  // frame con requestAnimationFrame, para no recalcular en cada evento de
  // scroll individual (que puede disparar decenas por segundo).
  var repositionArrowsRAF = null;
  function scheduleRepositionStuckArrows() {
    if (repositionArrowsRAF) return;
    repositionArrowsRAF = requestAnimationFrame(function () {
      repositionArrowsRAF = null;
      repositionStuckArrows();
    });
  }

  function bindArrowRepositioning() {
    window.addEventListener('scroll', scheduleRepositionStuckArrows, { passive: true });
    window.addEventListener('resize', scheduleRepositionStuckArrows);
  }

  function resetArrows() {
    stuckArrows.forEach(function (item) {
      if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
    });
    stuckArrows = [];

    // Reset manual completo (v0.4): también corta cualquier cooldown /
    // desvanecimiento en curso, ya que no tendría sentido seguir esperando
    // a que "desaparezcan" flechas que este reset ya borró.
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    arrowsInBatch = 0;
    cooldownUntil = 0;
    // Deliberadamente NO toca fatigueLevel/lateShotStreak/sessionArrowLog
    // (v0.5) ni calibOffsetX/Y (v0.8): esto sólo limpia las flechas
    // clavadas en pantalla, no "descansa" el brazo de Raúl, no borra el
    // historial de la sesión, ni recalibra la mira.
  }

  // ---------------------------------------------------------------------
  // Límite de flechas / cooldown del carcaj (v0.4)
  // ---------------------------------------------------------------------
  // Se llama justo cuando se clava la flecha que completa una tanda de
  // CONFIG.arrowLimit.countBeforeCooldown. Arranca el período de espera
  // (cooldownUntil) y programa el desvanecimiento de la tanda recién
  // completada para CONFIG.arrowLimit.fadeStartMs después.
  function startArrowCooldown() {
    cooldownUntil = performance.now() + CONFIG.arrowLimit.cooldownMs;

    // Mira sin calibrar (v0.8): cada andanada completa (esta función se
    // llama exactamente en ese momento) es también la señal para ir
    // ajustando la mira — reutiliza el mismo umbral de
    // CONFIG.arrowLimit.countBeforeCooldown en vez de llevar un contador
    // propio, ya que conceptualmente es la misma "andanada de seis
    // flechas".
    recalibrateMira();

    // Foto de las flechas a desvanecer: las clavadas hasta este instante
    // (la tanda que se acaba de completar). Cualquier flecha que se agregue
    // después de este punto pertenece a la tanda siguiente y no se toca acá.
    var batch = stuckArrows.slice();

    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      fadeOutArrows(batch, CONFIG.arrowLimit.fadeDurationMs);
    }, CONFIG.arrowLimit.fadeStartMs);
  }

  // Desvanece (opacity -> 0) las flechas de `batch` a lo largo de
  // `durationMs` y, al terminar la transición, las saca del DOM y de
  // `stuckArrows`.
  function fadeOutArrows(batch, durationMs) {
    batch.forEach(function (item) {
      if (!item.el) return;
      item.el.style.transition = 'opacity ' + durationMs + 'ms ease';
      // Fuerza reflow para que la transición dispare siempre, aunque el
      // elemento se haya creado recién.
      void item.el.offsetWidth;
      item.el.style.opacity = '0';
    });

    setTimeout(function () {
      batch.forEach(function (item) {
        if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
        var idx = stuckArrows.indexOf(item);
        if (idx !== -1) stuckArrows.splice(idx, 1);
      });
    }, durationMs);
  }

  // ---------------------------------------------------------------------
  // Mira sin calibrar (v0.8) — ver CONFIG.calibracion.
  // ---------------------------------------------------------------------
  // Sortea el desvío inicial (calibOffsetX/Y) una sola vez, al cargar la
  // página — se llama desde init(). Dirección aleatoria (ángulo 0..2π),
  // magnitud aleatoria entre minErrorPx y maxErrorPx.
  function initCalibration() {
    if (!CONFIG.calibracion.enabled) {
      calibOffsetX = 0;
      calibOffsetY = 0;
      return;
    }
    var angle = Math.random() * Math.PI * 2;
    var span = CONFIG.calibracion.maxErrorPx - CONFIG.calibracion.minErrorPx;
    var magnitude = CONFIG.calibracion.minErrorPx + Math.random() * span;
    calibOffsetX = Math.cos(angle) * magnitude;
    calibOffsetY = Math.sin(angle) * magnitude;
  }

  // Se llama al completar cada andanada (ver startArrowCooldown). Achica
  // el desvío actual en CONFIG.calibracion.correctionRatio (se acerca al
  // centro real sin llegar nunca a 0 exacto) y hace que Raúl lo comente,
  // con el mismo delay que dura el globo de puntaje recién mostrado para
  // la última flecha de la andanada (CONFIG.bubbleDisplayMs) — así no lo
  // tapa, se lee primero el puntaje y después el comentario.
  function recalibrateMira() {
    if (!CONFIG.calibracion.enabled) return;
    calibOffsetX *= (1 - CONFIG.calibracion.correctionRatio);
    calibOffsetY *= (1 - CONFIG.calibracion.correctionRatio);

    if (calibrationBubbleTimer) clearTimeout(calibrationBubbleTimer);
    calibrationBubbleTimer = setTimeout(function () {
      calibrationBubbleTimer = null;
      showSpeechBubble(CONFIG.calibracion.message);
    }, CONFIG.bubbleDisplayMs);
  }

  // ---------------------------------------------------------------------
  // Registro de flechas de la sesión (v0.5) — ver CONFIG.arrowLog y
  // sessionArrowLog más arriba.
  // ---------------------------------------------------------------------
  // Se llama en el momento del IMPACTO (junto con stickArrowAt/golpe.mp3),
  // ya con el puntaje final calculado. Devuelve la entrada creada, aunque
  // por ahora nadie la usa todavía ("lo usaremos luego" — ver
  // Raulito.getArrowLog()).
  function logArrowShot(score) {
    var entry = {
      index: sessionArrowLog.length + 1,
      timestamp: Date.now(),
      score: score, // 5-10, o null si fue miss
      andanada: Math.floor(sessionArrowLog.length / CONFIG.arrowLog.arrowsPerAndanada) + 1
    };
    sessionArrowLog.push(entry);
    return entry;
  }

  // ---------------------------------------------------------------------
  // Cansancio muscular (v0.5) — ver CONFIG.fatigue.
  // ---------------------------------------------------------------------
  // Se llama en el momento del DISPARO (no del impacto — ver comentario en
  // resolve()), antes de sonar disparo.mp3. Actualiza fatigueLevel /
  // lateShotStreak según cuánto se esperó desde el disparo anterior, y
  // dispara el agotamiento total si corresponde.
  function recordArrowFired() {
    var now = performance.now();
    arrowsFiredTotal++;

    if (fatigueActiveNow()) {
      var elapsed = lastShotAt ? (now - lastShotAt) : Infinity;
      var decayedLevel = currentFatigueLevel(now);

      if (elapsed < CONFIG.fatigue.expectedCooldownMs) {
        // Disparo "apurado": no se esperó el cooldown esperado entre
        // flecha y flecha. Sube el temblor y la racha de disparos
        // apurados.
        fatigueLevel = Math.min(CONFIG.fatigue.maxLevel, decayedLevel + CONFIG.fatigue.increasePerLateShot);
        lateShotStreak++;
      } else {
        // Se respetó (al menos) el cooldown mínimo: el temblor queda en
        // el nivel ya decaído por el descanso, sin subir, y se corta la
        // racha de disparos apurados.
        fatigueLevel = decayedLevel;
        lateShotStreak = 0;
      }

      if (lateShotStreak >= CONFIG.fatigue.exhaustionStreak) {
        exhausted = true; // la pose04 / bloqueo se aplican en resolveTimer -> enterExhaustedIdle()
      }
    }

    lastShotAt = now;
  }

  // Fuerza a Raúl a pose04 y bloquea nuevos disparos hasta que descanse
  // CONFIG.fatigue.exhaustionRestMs (ver recoverFromExhaustion). Se llama
  // desde resolveTimer, ya con el disparo que agotó a Raúl totalmente
  // resuelto e impactado.
  function enterExhaustedIdle() {
    state = 'exhausted';
    showPose('fail'); // pose04
    showSpeechBubble(CONFIG.fatigue.exhaustionMessage);
    setDebug('estado: exhausted — Raúl necesita descansar el brazo…');
    scheduleExhaustionRecovery();
  }

  function scheduleExhaustionRecovery() {
    clearExhaustionRecoveryTimer();
    exhaustionRecoveryTimer = setTimeout(recoverFromExhaustion, CONFIG.fatigue.exhaustionRestMs);
  }

  function clearExhaustionRecoveryTimer() {
    if (exhaustionRecoveryTimer) { clearTimeout(exhaustionRecoveryTimer); exhaustionRecoveryTimer = null; }
  }

  // Mientras esté en pose04 por agotamiento, no se puede volver a disparar
  // (ver onPointerDown), así que lastShotAt no cambia durante la espera:
  // este timer, agendado una sola vez al entrar en el estado, alcanza
  // para saber que ya pasó el descanso pedido.
  function recoverFromExhaustion() {
    exhausted = false;
    exhaustionRecoveryTimer = null;
    fatigueLevel = 0;
    lateShotStreak = 0;
    lastShotAt = 0; // el cansancio anterior queda "olvidado"
    if (state === 'exhausted') {
      state = 'idle';
      showPose('idle'); // pose03, sonriendo — se puede seguir jugando
      setDebug(idleDebugMessage());
    }
  }

  // ---------------------------------------------------------------------
  // Creación de elementos
  // ---------------------------------------------------------------------
  function ensureElements() {
    if (charEl) return;

    charEl = document.createElement('img');
    charEl.id = 'raulito-character';
    charEl.alt = 'Raulito';
    charEl.draggable = false;
    Object.assign(charEl.style, {
      position: 'fixed',
      right: CONFIG.characterMarginPx + 'px',
      bottom: CONFIG.characterMarginPx + 'px',
      zIndex: '9999',
      touchAction: 'none',
      userSelect: 'none',
      cursor: 'pointer',
      display: 'none'
    });
    charEl.addEventListener('load', function () {
      fitLongSide(charEl, characterTargetPx(currentCharPoseKey));
    });

    miraEl = document.createElement('img');
    miraEl.id = 'raulito-mira';
    miraEl.alt = '';
    miraEl.draggable = false;
    Object.assign(miraEl.style, {
      position: 'fixed',
      left: CONFIG.miraMarginPx + 'px',
      top: CONFIG.miraMarginPx + 'px',
      zIndex: '9998',
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'none',
      willChange: 'transform'
      // Sin overflow/clip propio ni clamping en JS: puede desplazarse más
      // allá de los bordes del viewport sin restricción (ver stickArrowAt
      // y CONFIG.aimSensitivity, que le da suficiente rango para llegar).
    });
    miraEl.src = CONFIG.assetBase + CONFIG.miraImage;
    miraEl.addEventListener('load', function () {
      fitLongSide(miraEl, miraTargetPx());
    });

    // Copia de repuesto del logo (solo se muestra si no se encuentra un
    // logo real en CONFIG.targetSelector — ver updateTargetVisibility).
    targetEl = document.createElement('img');
    targetEl.id = 'raulito-target';
    targetEl.alt = '';
    targetEl.draggable = false;
    Object.assign(targetEl.style, {
      position: 'fixed',
      left: CONFIG.targetMarginPx + 'px',
      top: CONFIG.targetMarginPx + 'px',
      zIndex: '9000',
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'none'
    });
    targetEl.src = CONFIG.assetBase + CONFIG.targetImage;
    targetEl.addEventListener('load', function () {
      fitLongSide(targetEl, targetTargetPx());
    });

    ensureBubbleStyles();
    bubbleEl = document.createElement('div');
    bubbleEl.id = 'raulito-bubble';
    bubbleEl.className = 'raulito-bubble';
    bubbleEl.style.display = 'none';

    document.body.appendChild(targetEl);
    document.body.appendChild(charEl);
    document.body.appendChild(miraEl);
    document.body.appendChild(bubbleEl);

    if (CONFIG.debug) {
      debugEl = document.createElement('div');
      debugEl.id = 'raulito-debug';
      Object.assign(debugEl.style, {
        position: 'fixed',
        left: '16px',
        bottom: '16px',
        zIndex: '9999',
        font: '12px/1.4 monospace',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: '4px',
        pointerEvents: 'none',
        display: 'none'
      });
      document.body.appendChild(debugEl);
    }

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (charEl && charEl.style.display !== 'none') {
      fitLongSide(charEl, characterTargetPx(currentCharPoseKey));
    }
    if (miraEl && miraEl.style.display !== 'none') {
      fitLongSide(miraEl, miraTargetPx());
    }
    if (targetEl && targetEl.style.display !== 'none') {
      fitLongSide(targetEl, targetTargetPx());
    }
    if (bubbleEl && bubbleEl.style.display !== 'none') {
      positionBubble();
    }
  }

  function setDebug(text) {
    if (!debugEl) return;
    if (!CONFIG.debug || !text) {
      debugEl.style.display = 'none';
      return;
    }
    debugEl.style.display = 'block';
    debugEl.textContent = text;
  }

  // Mensaje de estado "idle", con cuenta regresiva si hay un cooldown de
  // flechas activo (v0.4). Centralizado acá para no repetir la lógica en
  // cada lugar que vuelve a mostrar el estado idle.
  function idleDebugMessage() {
    if (cooldownUntil && performance.now() < cooldownUntil) {
      var remaining = Math.ceil((cooldownUntil - performance.now()) / 1000);
      return 'estado: idle — Raul va por las flechas (' + remaining + 's)';
    }
    return 'estado: idle — mantené click/touch sobre Raulito';
  }

  // ---------------------------------------------------------------------
  // Máquina de estados
  // ---------------------------------------------------------------------
  function showPose(key) {
    currentCharPoseKey = key;
    var name = CONFIG.poses[key];
    charEl.src = CONFIG.assetBase + name;
    // Si la imagen ya estaba cargada (misma src), 'load' no vuelve a
    // disparar — forzamos el ajuste igual por si cambió el tamaño de
    // pantalla o el multiplicador de escala entre disparos.
    if (charEl.complete) fitLongSide(charEl, characterTargetPx(key));
  }

  function showCharacter() {
    ensureElements();
    state = 'idle';
    charEl.style.display = 'block';
    updateTargetVisibility();
    showPose('idle');
    setDebug(idleDebugMessage());
  }

  function hideCharacter() {
    clearAllTimers();
    detachAimListeners();
    hideSpeechBubble();
    stopTensSound();
    stopAimTremor();
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    arrowsInBatch = 0;
    cooldownUntil = 0;
    // v1.0: si había un pedido de apuntado en cola (ver pendingAimRequest
    // en onPointerDown), se descarta al ocultar — no tendría sentido
    // "recordar" que había que volver a tensar apenas se muestre a Raúl
    // de nuevo, potencialmente mucho después.
    pendingAimRequest = false;
    if (charEl) {
      charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
      charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
    }
    // Cansancio (v0.5): al ocultar a Raúl se corta cualquier agotamiento o
    // temblor acumulado — no tendría sentido que "siga cansado" mientras
    // está oculto. El registro de sesión (sessionArrowLog) NO se toca acá:
    // es historial, no estado visual.
    clearExhaustionRecoveryTimer();
    exhausted = false;
    fatigueLevel = 0;
    lateShotStreak = 0;
    lastShotAt = 0;
    state = 'hidden';
    if (charEl) charEl.style.display = 'none';
    if (miraEl) miraEl.style.display = 'none';
    if (targetEl) targetEl.style.display = 'none';
    setDebug('');
  }

  function clearAllTimers() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (maxHoldTimer) { clearTimeout(maxHoldTimer); maxHoldTimer = null; }
    if (resolveTimer) { clearTimeout(resolveTimer); resolveTimer = null; }
    if (hitTimer) { clearTimeout(hitTimer); hitTimer = null; }
  }

  function onPointerDown(e) {
    // Agotamiento total (v0.5): si Raúl está en pose04 pidiendo descanso
    // (ver enterExhaustedIdle), no entra en pose de apuntado — sólo
    // recuerda que necesita descansar. Se revisa ANTES que 'idle' porque
    // 'exhausted' es un estado propio, distinto de 'idle'.
    if (state === 'exhausted') {
      showSpeechBubble(CONFIG.fatigue.exhaustionMessage);
      setDebug('estado: exhausted — Raúl necesita descansar el brazo…');
      return;
    }

    // v1.0: si Raúl está en 'resolved' pero TODAVÍA se ve pose02 (la
    // flecha recién soltada no terminó de resolverse), un nuevo
    // click/touch-and-drag sobre él NO cancela ese disparo — sigue su
    // curso normal (impacto, puntaje, sonido, `arrowLimit`, todo intacto,
    // ver hitTimer/resolveTimer más abajo en resolve()). Lo único que hace
    // este click es dejar en cola un pedido de apuntado: apenas esa
    // flecha termine de resolverse, en vez de volver a pose03 pasa
    // derecho a pose01, sin pasar por 'pending' ni por el toque largo de
    // siempre (ver el resolveTimer dentro de resolve()). No se aplica
    // sobre pose04 (fallo): ese caso sigue esperando a volver a 'idle'
    // como antes de esta versión.
    var canQueueAimRequest = (state === 'resolved' && currentCharPoseKey === 'fire');

    if (state !== 'idle' && !canQueueAimRequest) return;

    // Cooldown del carcaj (v0.4): si todavía no pasó CONFIG.arrowLimit.cooldownMs
    // desde que se completó la última tanda de CONFIG.arrowLimit.countBeforeCooldown
    // flechas, Raul no entra en pose de apuntado — solo avisa que está yendo
    // por las flechas. Se sigue respetando igual al querer poner un pedido
    // en cola: no tendría sentido que un click salteara el cooldown del
    // carcaj.
    if (cooldownUntil && performance.now() < cooldownUntil) {
      showSpeechBubble(CONFIG.arrowLimit.waitMessage);
      setDebug(idleDebugMessage());
      return;
    }

    activePointerId = e.pointerId;
    try { charEl.setPointerCapture(activePointerId); } catch (err) { /* noop */ }

    if (canQueueAimRequest) {
      pendingAimRequest = true;
      pendingAimStartX = e.clientX;
      pendingAimStartY = e.clientY;
      charEl.addEventListener('pointerup', onPointerUpDuringPendingAimRequest);
      charEl.addEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
      setDebug(
        'estado: resolved (fire) — flecha en vuelo, arco listo para volver a tensar apenas llegue…'
      );
      return;
    }

    startX = e.clientX;
    startY = e.clientY;
    state = 'pending';
    setDebug('estado: pending — esperando toque largo…');

    longPressTimer = setTimeout(enterAimState, CONFIG.longPressThresholdMs);

    charEl.addEventListener('pointerup', onPointerUpDuringPending);
    charEl.addEventListener('pointercancel', onPointerCancel);
  }

  // v1.0: soltar (o cancelar el gesto) mientras el pedido de apuntado
  // sigue en cola simplemente lo descarta — el jugador se arrepintió de
  // volver a tensar apenas llegue la flecha anterior. No toca esa flecha
  // ni su resolución, que sigue corriendo sola en resolve()/hitTimer.
  function onPointerUpDuringPendingAimRequest() {
    if (!pendingAimRequest) return;
    pendingAimRequest = false;
    charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
    charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
  }

  function onPointerCancelDuringPendingAimRequest() {
    onPointerUpDuringPendingAimRequest();
  }

  // Soltar antes de cumplir el umbral de toque largo: se cancela, no cuenta
  // como intento (Raulito vuelve a quedar a la espera).
  function onPointerUpDuringPending() {
    if (state !== 'pending') return;
    charEl.removeEventListener('pointerup', onPointerUpDuringPending);
    clearAllTimers();
    state = 'idle';
    setDebug(idleDebugMessage());
  }

  function onPointerCancel() {
    clearAllTimers();
    detachAimListeners();
    stopTensSound();
    stopAimTremor();
    charEl.removeEventListener('pointerup', onPointerUpDuringPending);
    if (state !== 'hidden') {
      state = 'idle';
      showPose('idle');
      if (miraEl) miraEl.style.display = 'none';
      setDebug(idleDebugMessage());
    }
  }

  function enterAimState() {
    if (state !== 'pending') return;
    charEl.removeEventListener('pointerup', onPointerUpDuringPending);
    state = 'aiming';
    aimStartedAt = performance.now();

    showPose('aim');
    playTensSound();
    miraEl.style.display = 'block';
    miraBaseDx = 0;
    miraBaseDy = 0;
    miraEl.style.transform = 'translate(0px, 0px)';
    fitLongSide(miraEl, miraTargetPx());

    // Arranca el pulso de latido (v0.4) en reposo: sin intensidad hasta que
    // el primer pointermove aporte una velocidad real que medir. El
    // temblor de cansancio (v0.5) no se "reinicia" acá — su fase visual
    // arranca de nuevo pero su NIVEL (fatigueLevel) es el que trae de
    // disparos anteriores, decaído según currentFatigueLevel(). El vaivén
    // en forma de 8 (v0.6) también arranca su fase de nuevo, pero su radio
    // depende del mismo currentFatigueLevel() recién descripto — no lleva
    // nivel propio.
    heartbeatIntensity = 0;
    heartbeatTargetIntensity = 0;
    heartbeatPhase = 0;
    fatiguePhase = 0;
    vaivenPhase = 0;
    lastVaivenRadiusPx = CONFIG.vaiven.baseRadiusPx;
    lastPointerMoveAt = performance.now();
    lastPointerX = startX;
    lastPointerY = startY;
    lastTremorFrameAt = 0;
    startAimTremor();

    charEl.addEventListener('pointermove', onPointerMoveWhileAiming);
    charEl.addEventListener('pointerup', onPointerUpWhileAiming);
    charEl.addEventListener('pointercancel', onPointerCancel);

    maxHoldTimer = setTimeout(function () {
      resolve('fail', 'timeout (10s)');
    }, CONFIG.maxHoldMs);

    setDebug('estado: aiming — soltá antes de 8s para disparar bien');
  }

  // -------------------------------------------------------------------
  // Temblor de la mira: latidos (v0.4) + cansancio muscular (v0.5)
  // -------------------------------------------------------------------
  // ¿Hace falta que el loop de animación esté corriendo? Sí si el latido
  // está activo, si el cansancio está activo Y ya se llegó a la flecha a
  // partir de la cual se manifiesta (CONFIG.fatigue.startAfterArrow), o si
  // el vaivén en forma de 8 está activo (éste no espera a ninguna flecha,
  // corre desde el primer instante de apuntado).
  function aimTremorActive() {
    return !!CONFIG.heartbeat.enabled || fatigueActiveNow() || !!CONFIG.vaiven.enabled;
  }

  function fatigueActiveNow() {
    return !!CONFIG.fatigue.enabled && arrowsFiredTotal >= CONFIG.fatigue.startAfterArrow;
  }

  // Nivel de temblor de cansancio EN ESTE INSTANTE (`now`), aplicando la
  // reducción por descanso a `fatigueLevel` (el nivel tal como quedó
  // después del último disparo) según CONFIG.fatigue.restStartMs /
  // restStepMs. Se recalcula bajo demanda en vez de guardarse ya
  // decaído, para que el temblor baje "en vivo" mientras se descansa, sin
  // necesitar un timer aparte.
  function currentFatigueLevel(now) {
    if (!lastShotAt) return 0;
    var restedMs = now - lastShotAt;
    if (restedMs < CONFIG.fatigue.restStartMs) return fatigueLevel;
    var steps = 1 + Math.floor((restedMs - CONFIG.fatigue.restStartMs) / CONFIG.fatigue.restStepMs);
    return Math.max(0, fatigueLevel - steps);
  }

  // v1.0: multiplicador de cadencia de disparo (ver CONFIG.cadencia). 1 =
  // sin efecto (distancias originales); crece de forma continua hacia
  // 1 + maxExtraMultiplier a medida que el tiempo transcurrido desde el
  // último disparo (lastShotAt) se acerca a 0, y vuelve a 1 apenas pasan
  // CONFIG.cadencia.restMs sin disparar. No usa `fatigueLevel` ni sus
  // pasos de descanso — es un cálculo de tiempo puro, independiente del
  // sistema de niveles de `fatigue`.
  function cadenciaMultiplier(now) {
    if (!CONFIG.cadencia.enabled || !lastShotAt) return 1;
    var gap = now - lastShotAt;
    if (gap >= CONFIG.cadencia.restMs) return 1;
    var intensity = 1 - (gap / CONFIG.cadencia.restMs); // 1 en gap≈0 → 0 en gap≥restMs
    return 1 + intensity * CONFIG.cadencia.maxExtraMultiplier;
  }

  function startAimTremor() {
    if (!aimTremorActive()) return;
    if (aimTremorRAF) cancelAnimationFrame(aimTremorRAF);
    aimTremorRAF = requestAnimationFrame(aimTremorTick);
  }

  function stopAimTremor() {
    if (aimTremorRAF) {
      cancelAnimationFrame(aimTremorRAF);
      aimTremorRAF = null;
    }
  }

  // Loop de animación: en cada frame calcula el pulso de latido (si
  // CONFIG.heartbeat.enabled) y la sacudida de cansancio (si
  // fatigueActiveNow()), y pinta la SUMA de ambos encima de la posición
  // base de la mira (miraBaseDx/Dy, la que fija onPointerMoveWhileAiming a
  // partir del arrastre real) — este loop es el único que escribe
  // miraEl.style.transform mientras se apunta.
  function aimTremorTick(now) {
    if (state !== 'aiming' || !miraEl) {
      aimTremorRAF = null;
      return;
    }

    var dt = lastTremorFrameAt ? (now - lastTremorFrameAt) : 16;
    lastTremorFrameAt = now;

    var pulseX = 0;
    var pulseY = 0;

    // v1.0: multiplicador de cadencia (ver CONFIG.cadencia), calculado
    // una sola vez por frame y reutilizado por los tres temblores de
    // abajo — 1 si pasaron CONFIG.cadencia.restMs o más desde el último
    // disparo (distancias originales, sin efecto).
    var cadMult = cadenciaMultiplier(now);

    // --- Latido (v0.4) ---------------------------------------------
    if (CONFIG.heartbeat.enabled) {
      // Si el puntero real no se movió en los últimos stillnessMs, el
      // objetivo de intensidad decae a 0 (reposo) aunque el último tramo
      // medido haya sido brusco — así el pulso se calma solo al dejar de
      // mover el dedo/mouse, no solo al soltar.
      if (now - lastPointerMoveAt > CONFIG.heartbeat.stillnessMs) {
        heartbeatTargetIntensity = 0;
      }

      var rate = (heartbeatTargetIntensity > heartbeatIntensity)
        ? CONFIG.heartbeat.intensityAttackPerSec
        : CONFIG.heartbeat.intensityReleasePerSec;
      var step = rate * (dt / 1000);
      if (heartbeatTargetIntensity > heartbeatIntensity) {
        heartbeatIntensity = Math.min(heartbeatTargetIntensity, heartbeatIntensity + step);
      } else {
        heartbeatIntensity = Math.max(heartbeatTargetIntensity, heartbeatIntensity - step);
      }

      var bpm = CONFIG.heartbeat.restBpm +
        (CONFIG.heartbeat.maxBpm - CONFIG.heartbeat.restBpm) * heartbeatIntensity;
      var hz = bpm / 60;
      heartbeatPhase += 2 * Math.PI * hz * (dt / 1000);

      var amplitude = (CONFIG.heartbeat.restAmplitudePx +
        (CONFIG.heartbeat.maxAmplitudePx - CONFIG.heartbeat.restAmplitudePx) * heartbeatIntensity) * cadMult;

      // Forma "lub-dub": dos lóbulos por ciclo (el segundo más chico y
      // desfasado), para que se sienta más a un latido real que a un seno
      // simple.
      var wave = Math.sin(heartbeatPhase) + 0.35 * Math.sin(2 * heartbeatPhase - 0.6);
      var pulse = wave * amplitude;

      // Temblor errático: ruido aleatorio que solo se nota con intensidad
      // alta (movimiento brusco reciente). También escalado por cadMult,
      // igual que el pulso principal (ver CONFIG.cadencia).
      var jitterX = (Math.random() * 2 - 1) * CONFIG.heartbeat.jitterPx * heartbeatIntensity * cadMult;
      var jitterY = (Math.random() * 2 - 1) * CONFIG.heartbeat.jitterPx * heartbeatIntensity * cadMult;

      // El pulso principal se siente sobre todo en el eje vertical (como
      // un latido real), con una fracción menor en horizontal, más el
      // temblor errático en ambos ejes.
      pulseX += pulse * 0.35 + jitterX;
      pulseY += pulse + jitterY;
    }

    // --- Cansancio muscular (v0.5) ----------------------------------
    if (fatigueActiveNow()) {
      var level = currentFatigueLevel(now);
      if (level > 0) {
        fatiguePhase += 2 * Math.PI * CONFIG.fatigue.shakeHz * (dt / 1000);
        var fatigueAmplitude = level * CONFIG.fatigue.amplitudePerLevelPx * cadMult;
        // Sacudida más errática que el latido: dos frecuencias no
        // múltiplo exacto entre sí, para que no se sienta como un simple
        // vaivén regular.
        var fatigueWave = Math.sin(fatiguePhase) + 0.5 * Math.sin(1.7 * fatiguePhase + 1.1);
        var fatigueJitterX = (Math.random() * 2 - 1) * level * CONFIG.fatigue.jitterPerLevelPx * cadMult;
        var fatigueJitterY = (Math.random() * 2 - 1) * level * CONFIG.fatigue.jitterPerLevelPx * cadMult;
        pulseX += fatigueWave * fatigueAmplitude + fatigueJitterX;
        pulseY += fatigueWave * fatigueAmplitude * 0.8 + fatigueJitterY;
      }
    }

    // --- Vaivén en forma de 8 (v0.6) --------------------------------
    if (CONFIG.vaiven.enabled) {
      // Reutiliza el mismo nivel de cansancio que ya calcula `fatigue`
      // (decaído en vivo por currentFatigueLevel) para agrandar el 8 — sin
      // cansancio acumulado (nivel 0, o fatigue.enabled=false) queda fijo
      // en baseRadiusPx. v1.0: ese radio se escala además por cadMult
      // (CONFIG.cadencia) — recién disparado, el mismo nivel de cansancio
      // produce un 8 más grande que tras varios segundos de pausa.
      var vaivenLevel = currentFatigueLevel(now);
      var vaivenRadius = (CONFIG.vaiven.baseRadiusPx +
        vaivenLevel * CONFIG.vaiven.radiusPerFatigueLevelPx) * cadMult;
      lastVaivenRadiusPx = vaivenRadius;

      vaivenPhase += 2 * Math.PI * CONFIG.vaiven.hz * (dt / 1000);

      // Curva de Lissajous 1:2 (relación de frecuencias x:y = 1:2): traza
      // un "8" acostado de ancho 2·vaivenRadius y alto vaivenRadius,
      // centrado en (0,0) — se suma sobre la posición base igual que el
      // latido y el cansancio.
      pulseX += vaivenRadius * Math.sin(vaivenPhase);
      pulseY += vaivenRadius * 0.5 * Math.sin(2 * vaivenPhase);
    }

    miraEl.style.transform =
      'translate(' + (miraBaseDx + pulseX) + 'px, ' + (miraBaseDy + pulseY) + 'px)';

    aimTremorRAF = requestAnimationFrame(aimTremorTick);
  }

  function detachAimListeners() {
    if (!charEl) return;
    charEl.removeEventListener('pointermove', onPointerMoveWhileAiming);
    charEl.removeEventListener('pointerup', onPointerUpWhileAiming);
    charEl.removeEventListener('pointercancel', onPointerCancel);
  }

  // Movimiento espejado y amplificado (CONFIG.aimSensitivity): si el
  // dedo/puntero se mueve hacia abajo-derecha, la mira se mueve hacia
  // arriba-izquierda (delta invertido y multiplicado). Sin clamping propio:
  // la mira puede salirse del viewport sin restricción.
  //
  // Regla de validez: el puntero real debe quedarse en la mitad DERECHA de
  // la pantalla (el lado de Raulito). Si cruza a la mitad izquierda (el
  // lado del blanco), el gesto se considera inválido y se cancela el tiro.
  function onPointerMoveWhileAiming(e) {
    if (state !== 'aiming') return;

    if (e.clientX < window.innerWidth / 2) {
      resolve('fail', 'puntero cruzó a la mitad izquierda de la pantalla');
      return;
    }

    // --- Latidos (v0.4): estima la velocidad real del puntero entre este
    // evento y el anterior (px/ms) para fijar el objetivo de intensidad del
    // pulso — ver heartbeatTick, que es quien de verdad pinta el temblor en
    // cada frame. Se mide acá porque solo pointermove conoce el
    // desplazamiento real del dedo/mouse entre dos instantes.
    var now = performance.now();
    var moveDt = now - lastPointerMoveAt;
    if (moveDt > 0) {
      var moved = Math.hypot(e.clientX - lastPointerX, e.clientY - lastPointerY);
      var velocity = moved / moveDt;
      var normalized = velocity / CONFIG.heartbeat.velocityForMaxIntensity;
      heartbeatTargetIntensity = Math.max(0, Math.min(1, normalized));
    }
    lastPointerMoveAt = now;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    var dx = (e.clientX - startX) * CONFIG.aimSensitivity;
    var dy = (e.clientY - startY) * CONFIG.aimSensitivity;
    miraBaseDx = -dx;
    miraBaseDy = -dy;
    // El transform real (posición base + temblores) lo termina de pintar
    // aimTremorTick en el próximo frame — acá solo actualizamos el
    // objetivo "sin temblor", para no pelear por la escritura del estilo
    // entre este handler y el loop de animación. Excepción: si ni el
    // latido ni el cansancio están activos (aimTremorTick nunca corre),
    // hay que pintar la posición base acá mismo o la mira quedaría
    // congelada.
    if (!aimTremorActive()) {
      miraEl.style.transform = 'translate(' + miraBaseDx + 'px, ' + miraBaseDy + 'px)';
    }

    // Regla (v0.3, ajustada en v0.4): la MIRA en sí (no solo el puntero
    // real) tampoco puede terminar en la mitad DERECHA de la pantalla — es
    // el lado de Raulito, no el del blanco, así que ninguna flecha debería
    // poder clavarse ahí. Se calcula de forma analítica sobre la posición
    // BASE (sin el pulso del latido, que es demasiado chico/errático como
    // para decidir un fallo por sí solo) usando offsetWidth/Height, que no
    // se ven afectados por `transform`.
    var mWidth = miraEl.offsetWidth;
    var mHeight = miraEl.offsetHeight;
    var miraCenterX = CONFIG.miraMarginPx + miraBaseDx + mWidth / 2;
    var miraCenterY = CONFIG.miraMarginPx + miraBaseDy + mHeight / 2;
    if (miraCenterX >= window.innerWidth / 2) {
      // v0.4: mensaje específico ("no apuntar tan lejos de la diana") en
      // vez del MISS genérico — la mira se alejó demasiado del blanco.
      resolve('fail', 'la mira cruzó a la mitad derecha de la pantalla', FAR_AIM_TEXT);
      return;
    }

    if (CONFIG.debug) {
      // v0.8: el preview de puntería en debug también aplica el desvío de
      // calibración, para poder ver en vivo el puntaje REAL esperado (no
      // sólo el visual) mientras se ajustan los valores de CONFIG.calibracion.
      var preview = computeScore(miraCenterX + calibOffsetX, miraCenterY + calibOffsetY);
      var fatigueNow = fatigueActiveNow() ? currentFatigueLevel(now) : 0;
      var calibMagnitude = Math.sqrt(calibOffsetX * calibOffsetX + calibOffsetY * calibOffsetY);
      // v1.0: multiplicador de cadencia actual (ver CONFIG.cadencia),
      // mostrado como % extra sobre las distancias originales — 0% si
      // pasaron CONFIG.cadencia.restMs o más desde el último disparo.
      var cadenciaExtraPct = Math.round((cadenciaMultiplier(now) - 1) * 100);
      setDebug(
        'estado: aiming — dx:' + Math.round(dx) + ' dy:' + Math.round(dy) +
        ' — puntería actual: ' + (preview != null ? preview : 'miss') +
        ' — pulso: ' + Math.round(heartbeatIntensity * 100) + '%' +
        ' — cansancio: ' + fatigueNow + '/' + CONFIG.fatigue.maxLevel +
        ' — vaivén: ' + Math.round(lastVaivenRadiusPx) + 'px' +
        ' — calibración: ' + Math.round(calibMagnitude) + 'px de error' +
        ' — cadencia: +' + cadenciaExtraPct + '%'
      );
    }
  }

  function onPointerUpWhileAiming() {
    if (state !== 'aiming') return;
    var elapsed = performance.now() - aimStartedAt;
    if (elapsed <= CONFIG.fireWindowMs) {
      resolve('fire', 'soltó a los ' + Math.round(elapsed) + 'ms');
    } else {
      resolve('fail', 'soltó tarde (' + Math.round(elapsed) + 'ms)');
    }
  }

  function resolve(outcome, reasonLabel, failBubbleText) {
    clearAllTimers();
    detachAimListeners();
    stopTensSound();
    stopAimTremor();
    state = 'resolved';

    if (outcome === 'fire') {
      // Centro visual REAL de la mira (incluye el offset espejado y
      // amplificado ya aplicado), tomado ANTES de ocultarla — con
      // display:none el elemento colapsa a 0×0 y getBoundingClientRect()
      // devolvería la esquina superior izquierda, así que este orden
      // importa. Se guarda ahora aunque la flecha recién se clave después
      // del delay de impacto, para que el puntaje sea el del instante de
      // soltar.
      var rect = miraEl.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;

      miraEl.style.display = 'none';

      // Momento del disparo: pose02 (flecha ya liberada) + disparo.mp3.
      // También el momento que cuenta para el cansancio (v0.5): "el
      // cooldown entre una flecha y otra" se mide de disparo a disparo,
      // no de impacto a impacto (el delay de impacto es de sólo
      // CONFIG.hitDelayMs, insignificante frente a los ~segundos de
      // fatigue).
      showPose('fire');
      playShotSound();
      recordArrowFired();
      setDebug(
        'estado: resolved (fire) — ' + reasonLabel + ' — esperando impacto…'
      );

      // Momento del impacto, CONFIG.hitDelayMs después: golpe.mp3 suena
      // junto con la flecha clavándose y el cálculo/globo de puntaje.
      hitTimer = setTimeout(function () {
        // v0.7: se lee el rect del blanco UNA sola vez acá y se reutiliza
        // tanto para el puntaje como para anclar la flecha al blanco (ver
        // stickArrowAt / repositionStuckArrows) — así ambos cálculos usan
        // exactamente la misma posición del logo real, sin importar si
        // hubo scroll entre el disparo y el impacto (CONFIG.hitDelayMs).
        var targetElNow = getTargetEl();
        var targetRect = targetElNow ? targetElNow.getBoundingClientRect() : null;

        // v0.8: mira sin calibrar (CONFIG.calibracion) — el punto de
        // impacto real se desvía de (centerX, centerY), el centro visual
        // que el jugador vio al soltar, según calibOffsetX/Y. El puntaje
        // y la flecha clavada usan este punto desviado; nada más en el
        // juego (ni la mira dibujada, ni la validez de apuntado) se ve
        // afectado por este desvío.
        var impactX = centerX + calibOffsetX;
        var impactY = centerY + calibOffsetY;

        var score = computeScore(impactX, impactY, targetRect);
        stickArrowAt(impactX, impactY, score, targetRect);
        playHitSound();
        logArrowShot(score); // v0.5: registro de la sesión (ver CONFIG.arrowLog)
        var bubbleText = (score != null) ? (SCORE_PHRASES[score] || ('¡Eso fue un ' + score + '!')) : MISS_TEXT;
        showSpeechBubble(bubbleText);
        setDebug(
          'estado: resolved (fire) — ' + reasonLabel + ' — ' + bubbleText +
          ' — flechas clavadas: ' + stuckArrows.length
        );

        // Límite de flechas (v0.4): esta flecha recién clavada cuenta para
        // la tanda actual. Al completar CONFIG.arrowLimit.countBeforeCooldown,
        // arranca el cooldown y se reinicia el conteo para la próxima tanda.
        arrowsInBatch++;
        if (arrowsInBatch >= CONFIG.arrowLimit.countBeforeCooldown) {
          startArrowCooldown();
          arrowsInBatch = 0;
        }
      }, CONFIG.hitDelayMs);
    } else {
      miraEl.style.display = 'none';
      showPose('fail');
      var failText = failBubbleText || MISS_TEXT;
      showSpeechBubble(failText);
      setDebug('estado: resolved (fail) — ' + reasonLabel + ' — ' + failText);
    }

    resolveTimer = setTimeout(function () {
      // v1.0: si mientras esta flecha volaba/resolvía el jugador ya hizo
      // click/touch-and-drag sobre Raulito (ver pendingAimRequest en
      // onPointerDown), acá es donde se lo honra o se lo descarta — el
      // pedido nunca tocó el disparo que se acaba de terminar de resolver.
      var hadPendingAimRequest = pendingAimRequest;
      if (hadPendingAimRequest) {
        pendingAimRequest = false;
        charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
        charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
      }

      // v0.5: si el disparo que se acaba de resolver dejó a Raúl agotado
      // (ver recordArrowFired -> exhausted = true), en vez de volver a
      // pose03 se lo deja en pose04 pidiendo descanso — sólo descansando
      // CONFIG.fatigue.exhaustionRestMs vuelve solo a pose03 (ver
      // recoverFromExhaustion). El pedido en cola, si había, se descarta:
      // agotado no se puede volver a apuntar aunque ya se haya clickeado.
      if (exhausted) {
        enterExhaustedIdle();
        return;
      }

      // Cooldown del carcaj (v0.4): si ESTA flecha fue la que completó la
      // tanda y disparó el cooldown, un pedido en cola tampoco lo saltea
      // — se descarta igual que si el click hubiera llegado recién ahora
      // durante el cooldown (ver el mismo chequeo en onPointerDown).
      var cooldownActive = cooldownUntil && performance.now() < cooldownUntil;

      if (hadPendingAimRequest && !cooldownActive) {
        // Pasa derecho a pose01 con la posición del click que quedó en
        // cola, sin pasar por 'pending' ni por el toque largo de siempre.
        startX = pendingAimStartX;
        startY = pendingAimStartY;
        state = 'pending';
        enterAimState();
        return;
      }

      state = 'idle';
      showPose('idle');
      setDebug(idleDebugMessage());
    }, CONFIG.resolveDisplayMs);
  }

  // ---------------------------------------------------------------------
  // Atajo de teclado (solo para esta fase de prueba)
  // ---------------------------------------------------------------------
  function onKeyDown(e) {
    var target = e.target;
    var isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (isTyping) return;
    if (e.key.toLowerCase() !== CONFIG.testTriggerKey) return;

    if (state === 'hidden') {
      showCharacter();
    } else if (state === 'idle') {
      hideCharacter();
    }
    // Si está en 'pending' / 'aiming' / 'resolved' se ignora la tecla para
    // no interrumpir una prueba en curso.
  }

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  function init() {
    preloadAssets();
    ensureElements();
    bindArrowRepositioning();
    initCalibration(); // v0.8: sortea el desvío inicial de la mira sin calibrar
    document.addEventListener('keydown', onKeyDown);
    charEl.addEventListener('pointerdown', onPointerDown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // API mínima expuesta por si se quiere invocar/depurar desde otro script
  // o desde la consola del navegador.
  window.Raulito = {
    show: showCharacter,
    hide: hideCharacter,
    resetArrows: resetArrows,
    say: showSpeechBubble, // ej: Raulito.say('¡Eso fue un diez!')
    computeScore: computeScore,
    // v0.5 — registro de flechas de la sesión (ver CONFIG.arrowLog):
    // devuelve una COPIA del arreglo (con copias de cada entrada), para
    // que quien lo consuma no pueda mutar el registro interno por error.
    getArrowLog: function () {
      return sessionArrowLog.map(function (entry) { return Object.assign({}, entry); });
    },
    // v0.5 — nivel de temblor de cansancio actual (0..CONFIG.fatigue.maxLevel),
    // ya decaído por el descanso, útil para un futuro HUD/debug.
    getFatigueLevel: function () {
      return fatigueActiveNow() ? currentFatigueLevel(performance.now()) : 0;
    },
    // v0.8 — desvío actual (px) entre el centro visual de la mira y el
    // punto de impacto real (ver CONFIG.calibracion), útil para un futuro
    // HUD/debug. No es información que el juego le muestre al jugador
    // durante la partida — sólo Raúl la comenta indirectamente al avisar
    // que va a calibrar.
    getCalibrationError: function () {
      return Math.sqrt(calibOffsetX * calibOffsetX + calibOffsetY * calibOffsetY);
    }
  };
})();

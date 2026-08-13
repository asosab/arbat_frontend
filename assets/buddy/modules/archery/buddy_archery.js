/**
 * assets/buddy/modules/archery/buddy_archery.js
 * ---------------------------------------------------------------------------
 * Fase 5 — mecánica del minijuego de puntería para la arquitectura "buddy".
 *
 * La mecánica y sus valores se extraen conservadoramente de raulito.js.
 * El personaje se resuelve/renderiza mediante Buddy y los globos mediante
 * buddy_says. Este módulo no implementa posicionamiento del personaje,
 * CSS/DOM del globo, fuentes de mensajes ni política común de ocupado.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  var CONFIG = {
      arrowImages: ['flecha01.png', 'flecha02.png', 'flecha03.png', 'flecha04.png'],
      shotSound: 'disparar.mp3',
      hitSound: 'impacto.mp3',
      tensSound: 'tensar.mp3',
      scales: {
        mira: 1,
        arrow: 1,
        target: 1
      },

      // Tamaño base de los elementos propios del módulo, medido sobre el
      // lado largo del viewport. Valores heredados de raulito.js.
      arrowLongSidePercent: 0.1,
      miraLongSidePercent: 0.20,
      targetLongSidePercent: 0.09,
      longPressThresholdMs: 350,
  
      // Ventana de disparo: soltar antes de esto = pose02 (disparó bien).
      // Coincide a propósito con CONFIG.sostenido.imposibleEnMs (8s): a
      // partir de ese punto el temblor por sostener la mira ya es tan
      // grande que en la práctica apuntar bien deja de ser posible.,
      fireWindowMs: 8000,
      // El tope de tiempo sosteniendo el arco ya no es un valor fijo: lo
      // define CONFIG.sostenido, con un instante distinto (entre
      // forzarBajaMinMs y forzarBajaMaxMs) cada vez que se apunta. Ver ese
      // bloque más abajo.
  
      // Cuánto se queda mostrando pose02/pose04 antes de volver a pose03.,
      resolveDisplayMs: 1500,
      // Cuánto se queda visible el globo de diálogo con el resultado.,
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
      // controlar.,
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
      // temblor se sienta errático y no un simple vaivén regular.,
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
      // `enabled`.,
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
        // Lo que dice Raúl al agotarse del todo. Texto real en
        // getDialogue('exhaustion') — ver enterExhaustedIdle() y
        // onPointerDown(). Null para permitir sobreescritura puntual.
        exhaustionMessage: null,
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
      // fijo en `baseRadiusPx`.,
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
      // BASE que se usa para validar el apuntado.,
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
      // Cansancio por sostener la mira (v2.0). Handicap nuevo, distinto de
      // `fatigue` (que depende de cuántas flechas se dispararon en la
      // sesión) y de `heartbeat` (que depende de qué tan rápido se mueve
      // el puntero real). Este depende únicamente de cuánto tiempo lleva
      // sostenida ESTA mira sin soltar, contado desde `aimStartedAt`.
      //
      // Mecánica: desde el instante de apuntar hasta `startAfterMs` (4s)
      // no aporta nada. A partir de ahí crece con una curva EXPONENCIAL
      // real, definida por `growthRate`, hasta llegar a intensidad máxima
      // en `imposibleEnMs` (8s), momento en el que el temblor total ya es
      // tan grande que apuntar bien deja de ser posible en la práctica.
      // Ese crecimiento empuja dos cosas a la vez, tal como pidió el
      // diseño ("se incrementa el temblor y los latidos"):
      //   1. Un piso mínimo para `heartbeatTargetIntensity` (ver
      //      aimTremorTick), así el pulso de `heartbeat` también se
      //      acelera solo, aunque el puntero esté quieto.
      //   2. Una sacudida propia adicional (amplitud/jitter definidos
      //      acá), sumada encima de todo lo demás.
      //
      // Un poco después de volverse imposible de sostener, el brazo baja
      // solo: entre `forzarBajaMinMs` y `forzarBajaMaxMs` (10 a 14s) se
      // sortea un instante distinto cada vez que se apunta (ver
      // enterAimState) en el que, si todavía no se soltó, se fuerza el
      // fallo (pose04) mostrando `forzarBajaMensaje`.,
      sostenido: {
        enabled: true,
  
        // Desde acá empieza a subir la intensidad (ms desde que se
        // empezó a apuntar).
        startAfterMs: 4000,
        // En este punto la intensidad llega a su máximo (1). Coincide con
        // CONFIG.fireWindowMs por diseño (ver comentario ahí).
        imposibleEnMs: 8000,
        // Qué tan pronunciada es la curva exponencial (progress 0..1 hacia
        // intensidad 0..1). Un valor más alto mantiene el arranque más
        // suave y concentra el crecimiento fuerte cerca del final.
        growthRate: 3.5,
  
        // Amplitud propia (px) en el peor momento (intensidad 1), sumada
        // encima del pulso de heartbeat.
        maxAmplitudePx: 40,
        // Ruido aleatorio propio (px) en el peor momento, análogo a
        // heartbeat.jitterPx / fatigue.jitterPerLevelPx.
        maxJitterPx: 22,
        // Frecuencia de esta sacudida (Hz), más rápida que la de fatigue
        // para que se sienta distinta y más urgente.
        shakeHz: 11,
  
        // Ventana (ms) en la que se sortea el instante exacto en el que el
        // brazo se fuerza a bajar, si para entonces todavía no se soltó.
        forzarBajaMinMs: 10000,
        forzarBajaMaxMs: 14000,
        // Mensaje que dice Raúl al bajar el brazo forzosamente.
        forzarBajaMensaje: '¡Se me cansó el brazo! Necesito un descanzo'
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
      // error anterior, nunca 0 exacto).,
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
        // (2800), para no taparlo. Texto real en
        // getDialogue('recalibrating') — ver uso en
        // scheduleCalibrationMessage(). Se deja en null para permitir
        // sobreescritura puntual si se necesita.
        message: null
      },
  
      // -------------------------------------------------------------------
      // Límite de flechas / cooldown del carcaj (v0.4). Cada
      // `countBeforeCooldown` flechas clavadas, Raul necesita `cooldownMs`
      // antes de poder disparar de nuevo (va a buscar las flechas). A los
      // `fadeStartMs` de esa espera, las flechas de la tanda recién
      // completada empiezan a desvanecerse durante `fadeDurationMs`, hasta
      // desaparecer del todo. Si se intenta iniciar un disparo estando en
      // cooldown, se muestra `waitMessage` en vez de entrar en pose de
      // apuntado.,
      arrowLimit: {
        countBeforeCooldown: 6,
        cooldownMs: 10000,
        fadeStartMs: 5000,
        // Por defecto ocupa el resto del cooldown (cooldownMs - fadeStartMs)
        // para que las flechas terminen de desvanecerse justo cuando se
        // vuelve a poder disparar. Se puede fijar a mano si se prefiere un
        // desvanecimiento más rápido o más lento.
        fadeDurationMs: 5000,
        // Texto real en getDialogue('arrow_cooldown_wait') — ver
        // uso en onPointerDown(). Null para permitir sobreescritura puntual.
        waitMessage: null
      },
  
      // -------------------------------------------------------------------
      // Registro de flechas de la sesión (v0.5). Ver `sessionArrowLog` más
      // abajo — un arreglo en memoria con TODAS las flechas disparadas
      // (impactadas) desde que se cargó la página, pensado para usarse más
      // adelante (estadísticas, analítica, etc.).,
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
      // Puntaje total de la andanada (v1.5) y premio por tanda perfecta
      // (v1.6). Al completarse cada tanda de CONFIG.arrowLimit
      // .countBeforeCooldown flechas, además del globo de puntaje de cada
      // flecha individual (getDialogue('score_N')), se narra la SUMA de esa tanda
      // con un globo propio (ver narrateAndanadaTotal(), llamado desde el
      // mismo lugar que startArrowCooldown()) — o, si la tanda fue
      // perfecta y CONFIG.andanada.promo.enabled, el globo del premio (ver
      // promo más abajo) en vez del texto de puntaje. Ese globo se muestra
      // recién después de que se apaga el de la última flecha (mismo delay
      // que 2800), y el aviso de recalibración de la mira
      // se corre a su vez para aparecer justo cuando ESTE globo se apaga
      // (ver scheduleCalibrationMessage()) — sin importar si duró
      // 2800 (puntaje normal) o CONFIG.andanada.promo
      // .displayMs (premio, bastante más largo).,
      andanada: {
        // Umbral (inclusive) de puntos totales de la tanda a partir del cual
        // Raúl vuelve a pose03 (idle) como pose de reposo entre disparos;
        // por debajo de este umbral, en cambio, la pose de reposo pasa a
        // ser pose04 (fail) hasta que se complete la próxima tanda — ver
        // defaultIdlePoseKey. Pedido original: "por debajo de 35" -> pose04,
        // "36 o más" -> pose03; el valor 35 en sí no se especificó, así que
        // se resuelve igual que el resto de los valores por debajo de 36
        // (pose04), para no dejar un puntaje sin regla. Ajustar acá si se
        // quiere mover el corte.
        lowScorePoseThreshold: 36,
        // Plantilla del globo con la suma de la tanda. "{puntos}" se
        // reemplaza por el total (0..puntaje máximo posible de la tanda).
        // No se usa cuando la tanda es perfecta y CONFIG.andanada.promo
        // está habilitado (ver promo.bubbleHtml más abajo, que reemplaza a
        // perfectMessage en ese caso). Texto real en
        // getDialogue('andanada_score') — ver narrateAndanadaTotal().
        // Null para permitir sobreescritura puntual.
        message: null,
        // Plantilla especial cuando la tanda entera dio el puntaje máximo
        // posible (CONFIG.arrowLimit.countBeforeCooldown flechas, cada una
        // en el aro de mayor valor de CONFIG.rings — con los valores por
        // defecto, 6 × 10 = 60). Sirve de respaldo si CONFIG.andanada
        // .promo.enabled se pone en false más adelante. Texto real en
        // getDialogue('andanada_perfect').
        perfectMessage: null,
  
        // -----------------------------------------------------------------
        // Premio por tanda perfecta (v1.6). Cuando la tanda da el puntaje
        // máximo posible (ver perfectMessage arriba) Y esto está habilitado,
        // en vez de perfectMessage se muestra bubbleHtml: un globo con un
        // link a WhatsApp que arma un mensaje de reclamo con un código
        // corto (ver buildPromoCode()/buildWhatsAppLink() más abajo).
        //
        // Supuesto documentado (no especificado en el pedido original): el
        // "código de premio" es un hash MD5 (calculado con una
        // implementación propia en JS puro — el juego no usa frameworks ni
        // Web Crypto, que además no soporta MD5) de `Date.now()` + un
        // componente aleatorio, en el instante exacto en que se completa la
        // tanda perfecta, recortado a los primeros 6 caracteres hex. Como
        // el juego es 100% cliente (sin backend), este código NO es
        // verificable del lado del servidor — funciona como un
        // comprobante liviano que el staff de arbat puede mirar a simple
        // vista, no como una prueba criptográfica. Si arbat necesita
        // validarlo contra algo (por ejemplo, un secreto compartido o un
        // registro propio), hay que ajustar buildPromoCode().
        promo: {
          enabled: true,
          whatsappNumber: '59170885758',
          // "{hash}" se reemplaza por el código de 6 caracteres.
          whatsappMessage: '¡Hola arbat! acabo de lograr hacer 60 puntos en la página web y me he ganado un 2x1, aquí está mi código de premio: {hash}',
          // Texto del globo dentro del juego (HTML — ver buddy_says
          // con opts.html). "{link}" se reemplaza por el link de WhatsApp ya
          // armado (wa.me + el mensaje de arriba, URL-encodeado). Texto real
          // en getDialogue('andanada_promo_reward') — ver uso en
          // narrateAndanadaTotal(). Null para permitir sobreescritura puntual.
          bubbleHtml: null,
          // Bastante más que 2800: hay mucho más texto
          // para leer y, a diferencia de los demás globos, éste tiene un
          // link que hay que llegar a tocar.
          displayMs: 12000
        }
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
      // solo para poder probar la puntería sin la página real.,
      targetSelector: '.site-header .site-logo img',
      targetImage: 'diana.png',
      targetMarginPx: 16,
  
      // Anillos de puntería, medidos directamente sobre diana.png (el círculo
      // dentro de la "a" de arbat: negro / blanco / naranja / blanco / negro).
      // outerPercent = fracción del RADIO del logo renderizado (0 a 1) hasta
      // donde llega cada zona, medida desde el centro. Las primeras cinco
      // fracciones salen de examinar los píxeles reales de diana.png; la
      // última (5 puntos, "espacio blanco externo") no está delimitada por el
      // arte del logo en sí —es un supuesto documentado en raulito.md—, así
      // que es la más fácil de mover si hace falta agrandar o achicar la zona
      // de 5 puntos.,
      rings: [
        { points: 10, outerPercent: 0.14 }, // círculo negro interno
        { points: 9,  outerPercent: 0.27 }, // aro blanco
        { points: 8,  outerPercent: 0.45 }, // aro naranja
        { points: 7,  outerPercent: 0.61 }, // espacio blanco
        { points: 6,  outerPercent: 0.81 }, // aro negro externo
        { points: 5,  outerPercent: 1.05 }  // espacio blanco externo (supuesto)
      ],
  
      // Triple click de prueba para invocar/ocultar a Raulito. Cambiar
      // clicksToTrigger o windowMs si genera falsos positivos/negativos.

      testTrigger: {
        clicksToTrigger: 3,
        windowMs: 500
      },
      miraMarginPx: 16,
  
      // -------------------------------------------------------------------
      // Zona de "sabiduría": si al apuntar la mira cae en el cuarto inferior
      // de la VENTANA VISIBLE (viewport) — equivalente a apuntar hacia abajo,
      // al suelo, en vez de hacia el blanco — Raúl decide directamente no
      // disparar. A diferencia de las otras reglas de validez (mitad de
      // pantalla), esto NO es un fallo: no pasa por pose04/MISS, vuelve
      // derecho a pose03 con un mensaje propio (ver clave "arm_lowered_early" y la regla
      // en onPointerMoveWhileAiming).,
      wisdomZone: {
        // Fracción (0..1) del alto de la ventana visible que cuenta como
        // "cuarto inferior", medida desde abajo. 0.25 = el 25% más bajo del
        // viewport.
        bottomFraction: 0.25
      },
  
      // Panel de depuración visible mientras se prueba el prototipo. Poner en
      // false (o borrar el bloque marcado como DEBUG) para producción.,
      debug: false
    };

  // ---------------------------------------------------------------------
    // Estado interno
    // ---------------------------------------------------------------------
    var state = 'hidden'; // hidden | idle | pending | aiming | resolved | exhausted
    var charEl = null;
    var miraEl = null;
    var targetEl = null;  // copia de repuesto del logo (solo si no hay selector real)
    var debugEl = null;
  
    var activePointerId = null;
    var startX = 0;
    var startY = 0;
    var longPressTimer = null;
    var maxHoldTimer = null;
    var resolveTimer = null;
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

    // Triple-click de prueba para invocar/ocultar a Raulito.
    // Mantener este estado privado dentro del módulo; no depende de variables
    // globales del script original.
    var testTriggerClickCount = 0;
    var testTriggerClickTimer = null;
  
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
    var repositionArrowsRAF = null; // id de requestAnimationFrame para reposicionar flechas clavadas
  
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
    var sostenidoPhase = 0;          // fase acumulada de la sacudida de "sostener la mira" (v2.0, radianes)
    var lastSostenidoIntensity = 0;  // último valor 0..1 calculado (para el panel de debug)
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
    // Puntaje total de la andanada (v1.5) — ver CONFIG.andanada.
    // -------------------------------------------------------------------
    var batchScoreSum = 0;        // suma de puntos de la tanda en curso (miss cuenta 0); se reinicia junto con arrowsInBatch
    var andanadaBubbleTimer = null; // delay del globo con la suma de la tanda, tras el de la última flecha
    // Pose a la que Raúl vuelve entre disparos cuando no hay nada más
    // puntual que mostrar (fuego/apuntado/fallo de ESE tiro/agotamiento).
    // Arranca en 'idle' (pose03) y narrateAndanadaTotal() la actualiza al
    // completar cada tanda de seis flechas según CONFIG.andanada
    // .lowScorePoseThreshold. A propósito NO se reinicia en resetArrows()
    // ni en hideCharacter() — es "cómo quedó Raúl" tras la última tanda
    // jugada, no algo que dependa de las flechas que estén dibujadas en
    // pantalla en este momento.
    var defaultIdlePoseKey = 'idle';
  
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
  // Utilidades de tamaño para elementos propios del módulo (mira/flechas/
  // diana de fallback). El personaje se escala y posiciona exclusivamente
  // mediante window.Buddy.showCharacterImage().
  // ---------------------------------------------------------------------
  function viewportLongSide() {
    return Math.max(window.innerWidth, window.innerHeight);
  }

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

  function fitLongSide(imgEl, targetPx) {
    applyLongSideFit(imgEl, imgEl.naturalWidth, imgEl.naturalHeight, targetPx);
  }


  // ---------------------------------------------------------------------
  // Diálogos del módulo: el contenido vive en buddy_archery_zen.js.
  // La mecánica solo conoce claves de diálogo y categorías emocionales.
  // ---------------------------------------------------------------------
  var dialogueLastIndex = {};

  function getDialogue(key) {
    var data = window.BuddyTexts &&
      window.BuddyTexts.archery &&
      window.BuddyTexts.archery.es &&
      window.BuddyTexts.archery.es.zen;

    if (!data || !data.dialogues || !data.dialogues[key]) return null;

    var variants = data.dialogues[key];
    if (!Array.isArray(variants) || !variants.length) return null;
    if (variants.length === 1) return variants[0];

    var lastIndex = dialogueLastIndex[key];
    var index;
    do {
      index = Math.floor(Math.random() * variants.length);
    } while (index === lastIndex);

    dialogueLastIndex[key] = index;
    return variants[index];
  }

  function say(texto, emocion, opciones) {
    if (!texto || typeof window.buddy_says !== 'function') return;
    opciones = opciones || {};
    opciones.emocion = emocion || opciones.emocion || 'neutral';
    window.buddy_says(texto, opciones);
  }


function pickRandom(variants, memoKey) {
    if (!variants || variants.length === 0) return null;
    if (variants.length === 1) return variants[0];

    var lastIndex = dialogueLastIndex[memoKey];
    var index;
    do {
      index = Math.floor(Math.random() * variants.length);
    } while (index === lastIndex);

    dialogueLastIndex[memoKey] = index;
    return variants[index];
  }

function preloadAssets() {
    var imageKeys = ['mira', 'diana', 'flecha01', 'flecha02', 'flecha03', 'flecha04'];

    imageKeys.forEach(function (key) {
      var datos = window.Buddy.resolveAsset('archery', 'images', key);
      if (!datos || !datos.archivo) return;

      var img = new Image();
      img.addEventListener('load', function () {
        assetDimsCache[key] = { width: img.naturalWidth, height: img.naturalHeight };
      });
      img.src = datos.archivo;
    });

    var shotPath = window.Buddy.resolveAsset('archery', 'sounds', 'disparar');
    var hitPath = window.Buddy.resolveAsset('archery', 'sounds', 'impacto');
    var tensPath = window.Buddy.resolveAsset('archery', 'sounds', 'tensar');

    shotAudio = new Audio(shotPath);
    shotAudio.preload = 'auto';
    try { shotAudio.load(); } catch (err) { /* noop */ }

    hitAudio = new Audio(hitPath);
    hitAudio.preload = 'auto';
    try { hitAudio.load(); } catch (err) { /* noop */ }

    tensAudio = new Audio(tensPath);
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

function assetScale(asset, fallbackScale) {
    return asset && typeof asset.escala === 'number' ? asset.escala : fallbackScale;
  }

function miraTargetPx(asset) {
    return CONFIG.miraLongSidePercent * viewportLongSide() * assetScale(asset, CONFIG.scales.mira);
  }

function arrowTargetPx(asset) {
    return CONFIG.arrowLongSidePercent * viewportLongSide() * assetScale(asset, CONFIG.scales.arrow);
  }

function targetTargetPx() {
    return CONFIG.targetLongSidePercent * viewportLongSide() * CONFIG.scales.target;
  }

function getTargetEl() {
    if (CONFIG.targetSelector) {
      var real = document.querySelector(CONFIG.targetSelector);
      if (real) return real;
    }
    return targetEl;
  }

function updateTargetVisibility() {
    if (!targetEl) return;
    var usingRealLogo = !!(CONFIG.targetSelector && document.querySelector(CONFIG.targetSelector));
    targetEl.style.display = usingRealLogo ? 'none' : 'block';
  }

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

function pickRandomArrowName() {
    var list = CONFIG.arrowImages;
    return list[Math.floor(Math.random() * list.length)];
  }

function stickArrowAt(x, y, score, targetRect) {
    var name = pickRandomArrowName();
    var arrowKey = name.replace('.png', '');
    var arrowAsset = window.Buddy.resolveAsset('archery', 'images', arrowKey);
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
      // No permitir ni un frame en tamaño natural: la flecha queda invisible
      // hasta que conocemos sus dimensiones y aplicamos la escala del asset
      // resuelto (override del personaje o default del módulo).
      visibility: 'hidden',
      opacity: '1',
      transition: 'none'
    });

    function applyArrowSize(width, height) {
      assetDimsCache[name] = { width: width, height: height };
      applyLongSideFit(arrowEl, width, height, arrowTargetPx(arrowAsset));
      arrowEl.style.visibility = 'visible';
    }

    var cached = assetDimsCache[name];
    if (cached) {
      applyArrowSize(cached.width, cached.height);
    } else {
      arrowEl.addEventListener('load', function () {
        applyArrowSize(arrowEl.naturalWidth, arrowEl.naturalHeight);
      });
    }
    arrowEl.src = arrowAsset && arrowAsset.archivo ? arrowAsset.archivo : '';

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
    batchScoreSum = 0; // v1.5: la tanda en curso queda incompleta, no se narra su suma
    cooldownUntil = 0;
    // Deliberadamente NO toca fatigueLevel/lateShotStreak/sessionArrowLog
    // (v0.5), calibOffsetX/Y (v0.8) ni defaultIdlePoseKey (v1.5): esto
    // sólo limpia las flechas clavadas en pantalla, no "descansa" el
    // brazo de Raúl, no borra el historial de la sesión, no recalibra la
    // mira, ni cambia cómo quedó Raúl tras la última tanda completa.
  }

function maxSingleArrowScore() {
    var max = 0;
    for (var i = 0; i < CONFIG.rings.length; i++) {
      if (CONFIG.rings[i].points > max) max = CONFIG.rings[i].points;
    }
    return max;
  }

function maxAndanadaScore() {
    return CONFIG.arrowLimit.countBeforeCooldown * maxSingleArrowScore();
  }

function narrateAndanadaTotal(total) {
    defaultIdlePoseKey = (total >= CONFIG.andanada.lowScorePoseThreshold) ? 'idle' : 'fail';

    var isPerfect = total >= maxAndanadaScore();
    var showPromo = isPerfect && CONFIG.andanada.promo.enabled;

    if (andanadaBubbleTimer) clearTimeout(andanadaBubbleTimer);
    andanadaBubbleTimer = setTimeout(function () {
      andanadaBubbleTimer = null;
      var displayMs = 2800;

      if (showPromo) {
        displayMs = CONFIG.andanada.promo.displayMs;
        var htmlTemplate = CONFIG.andanada.promo.bubbleHtml || getDialogue('andanada_promo_reward');
        var html = htmlTemplate.replace('{link}', buildWhatsAppLink());
        say(html, 'positivo', { html: true, promo: true, durationMs: displayMs });
      } else {
        var template = isPerfect
          ? (CONFIG.andanada.perfectMessage || getDialogue('andanada_perfect'))
          : (CONFIG.andanada.message || getDialogue('andanada_score'));
        say(template ? template.replace('{puntos}', total) : null,
            isPerfect ? 'positivo' : 'neutral',
            { durationMs: displayMs });
      }

      scheduleCalibrationMessage(displayMs);
    }, 2800);
  }

function md5(str) {
    function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }

    function toUtf8Bytes(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i++) {
        var code = s.codePointAt(i);
        if (code > 0xFFFF) i++; // consumió un par subrogado
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
          bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
          bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        }
      }
      return bytes;
    }

    var S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];
    // K[i] = floor(abs(sin(i+1)) * 2^32), i = 0..63 (constante estándar
    // de MD5) — se calcula en vez de hardcodear 64 números mágicos.
    var K = new Array(64);
    for (var i = 0; i < 64; i++) K[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)) | 0;

    var bytes = toUtf8Bytes(str);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    // Longitud del mensaje en bits, 64 bits little-endian. Los 32 bits
    // altos quedan en 0: asume entradas de menos de ~2^29 bytes, de sobra
    // para los strings cortos que arma buildPromoCode().
    for (var i = 0; i < 4; i++) bytes.push((bitLen >>> (8 * i)) & 0xFF);
    for (var i = 0; i < 4; i++) bytes.push(0);

    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

    for (var chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
      var M = new Array(16);
      for (var j = 0; j < 16; j++) {
        M[j] = bytes[chunkStart + j * 4] |
          (bytes[chunkStart + j * 4 + 1] << 8) |
          (bytes[chunkStart + j * 4 + 2] << 16) |
          (bytes[chunkStart + j * 4 + 3] << 24);
      }
      var A = a0, B = b0, C = c0, D = d0;
      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + rotl(F, S[i])) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }

    function toHexLE(n) {
      var out = '';
      for (var i = 0; i < 4; i++) out += ('0' + ((n >>> (8 * i)) & 0xFF).toString(16)).slice(-2);
      return out;
    }

    return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
  }

function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }

function toUtf8Bytes(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i++) {
        var code = s.codePointAt(i);
        if (code > 0xFFFF) i++; // consumió un par subrogado
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
          bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
          bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        }
      }
      return bytes;
    }

function toHexLE(n) {
      var out = '';
      for (var i = 0; i < 4; i++) out += ('0' + ((n >>> (8 * i)) & 0xFF).toString(16)).slice(-2);
      return out;
    }

function buildPromoCode() {
    var seed = Date.now() + ':' + Math.random().toString(36).slice(2);
    return md5(seed).slice(0, 6);
  }

function buildWhatsAppLink() {
    var promo = CONFIG.andanada.promo;
    var text = promo.whatsappMessage.replace('{hash}', buildPromoCode());
    return 'https://wa.me/' + promo.whatsappNumber + '?text=' + encodeURIComponent(text);
  }

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

function recalibrateMira() {
    if (!CONFIG.calibracion.enabled) return;
    calibOffsetX *= (1 - CONFIG.calibracion.correctionRatio);
    calibOffsetY *= (1 - CONFIG.calibracion.correctionRatio);
  }

function scheduleCalibrationMessage(afterMs) {
    if (!CONFIG.calibracion.enabled) return;
    if (calibrationBubbleTimer) clearTimeout(calibrationBubbleTimer);
    calibrationBubbleTimer = setTimeout(function () {
      calibrationBubbleTimer = null;
      say(CONFIG.calibracion.message || getDialogue('recalibrating'), 'neutral');
    }, afterMs);
  }

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

function enterExhaustedIdle() {
    state = 'exhausted';
    showPose('fail');
    say(CONFIG.fatigue.exhaustionMessage || getDialogue('exhaustion'), 'negativo');
    setDebug('estado: exhausted — el buddy necesita descansar el brazo…');
    scheduleExhaustionRecovery();
  }

function scheduleExhaustionRecovery() {
    clearExhaustionRecoveryTimer();
    exhaustionRecoveryTimer = setTimeout(recoverFromExhaustion, CONFIG.fatigue.exhaustionRestMs);
  }

function clearExhaustionRecoveryTimer() {
    if (exhaustionRecoveryTimer) { clearTimeout(exhaustionRecoveryTimer); exhaustionRecoveryTimer = null; }
  }

function recoverFromExhaustion() {
    exhausted = false;
    exhaustionRecoveryTimer = null;
    fatigueLevel = 0;
    lateShotStreak = 0;
    lastShotAt = 0;
    if (state === 'exhausted') {
      state = 'idle';
      showPose('idle');
      setDebug(idleDebugMessage());
    }
  }

function ensureElements() {
    // buddy.js es el único dueño del elemento del personaje.
    charEl = document.getElementById('buddy-character');

    if (!miraEl) {
      miraEl = document.createElement('img');
      miraEl.id = 'buddy-mira';
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
        visibility: 'hidden',
        willChange: 'transform'
      });
      miraEl.addEventListener('load', function () {
        var miraAsset = window.Buddy.resolveAsset('archery', 'images', 'mira');
        fitLongSide(miraEl, miraTargetPx(miraAsset));
        miraEl.style.visibility = 'visible';
      });
      var miraAsset = window.Buddy.resolveAsset('archery', 'images', 'mira');
      if (miraAsset && miraAsset.archivo) miraEl.src = miraAsset.archivo;
      document.body.appendChild(miraEl);
    }

    if (!targetEl) {
      targetEl = document.createElement('img');
      targetEl.id = 'buddy-target';
      targetEl.alt = '';
      targetEl.draggable = false;
      Object.assign(targetEl.style, {
        position: 'fixed',
        left: CONFIG.targetMarginPx + 'px',
        top: CONFIG.targetMarginPx + 'px',
        zIndex: '1',
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'none'
      });
      targetEl.addEventListener('load', function () {
        fitLongSide(targetEl, targetTargetPx());
      });
      var diana = window.Buddy.resolveAsset('archery', 'images', 'diana');
      if (diana && diana.archivo) targetEl.src = diana.archivo;
      document.body.appendChild(targetEl);
    }

    if (!debugEl) {
      debugEl = document.createElement('pre');
      debugEl.id = 'buddy-debug';
      Object.assign(debugEl.style, {
        position: 'fixed',
        left: '8px',
        bottom: '8px',
        zIndex: '10001',
        maxWidth: '90vw',
        margin: '0',
        padding: '6px 8px',
        background: 'rgba(0,0,0,.75)',
        color: '#fff',
        font: '12px/1.3 monospace',
        pointerEvents: 'none',
        display: 'none'
      });
      document.body.appendChild(debugEl);
    }

    updateTargetVisibility();
    return !!charEl;
  }

function onResize() {
    if (miraEl && miraEl.style.display !== 'none') {
      fitLongSide(miraEl, miraTargetPx(window.Buddy.resolveAsset('archery', 'images', 'mira')));
    }
    if (targetEl && targetEl.style.display !== 'none') {
      fitLongSide(targetEl, targetTargetPx());
    }
    repositionStuckArrows();
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

  function idleDebugMessage() {
    if (cooldownUntil && performance.now() < cooldownUntil) {
      var remaining = Math.ceil((cooldownUntil - performance.now()) / 1000);
      return 'estado: idle — buddy va por las flechas (' + remaining + 's)';
    }
    return 'estado: idle — mantené click/touch sobre el buddy';
  }

function idleDebugMessage() {
    if (cooldownUntil && performance.now() < cooldownUntil) {
      var remaining = Math.ceil((cooldownUntil - performance.now()) / 1000);
      return 'estado: idle — buddy va por las flechas (' + remaining + 's)';
    }
    return 'estado: idle — mantené click/touch sobre el buddy';
  }

function showPose(key) {
    currentCharPoseKey = key;

    var datosImagen;
    if (key === 'idle') {
      datosImagen = window.Buddy.resolveExpression('sereno');
    } else if (key === 'aim') {
      datosImagen = window.Buddy.resolveAsset('archery', 'images', 'apuntar');
    } else if (key === 'fire') {
      datosImagen = window.Buddy.resolveAsset('archery', 'images', 'liberar_flecha');
    } else {
      datosImagen = window.Buddy.resolveExpressionByCategory('negativo');
    }

    if (datosImagen) {
      window.Buddy.showCharacterImage(datosImagen);
      charEl = document.getElementById('buddy-character');
      bindCharacterEvents();
    }
  }

  var characterEventsBound = false;

  function bindCharacterEvents() {
    if (!charEl || characterEventsBound) return;
    characterEventsBound = true;
    charEl.addEventListener('pointerdown', onPointerDown);
    charEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

function showCharacter() {
    state = 'idle';
    showPose(defaultIdlePoseKey);
    ensureElements();
    if (charEl) charEl.style.display = 'block';
    updateTargetVisibility();
    setDebug(idleDebugMessage());
  }

function hideCharacter() {
    clearAllTimers();
    detachAimListeners();
    stopTensSound();
    stopAimTremor();

    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    if (andanadaBubbleTimer) { clearTimeout(andanadaBubbleTimer); andanadaBubbleTimer = null; }
    if (calibrationBubbleTimer) { clearTimeout(calibrationBubbleTimer); calibrationBubbleTimer = null; }

    arrowsInBatch = 0;
    batchScoreSum = 0;
    cooldownUntil = 0;
    pendingAimRequest = false;

    if (charEl) {
      charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
      charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
      charEl.style.display = 'none';
    }

    clearExhaustionRecoveryTimer();
    exhausted = false;
    fatigueLevel = 0;
    lateShotStreak = 0;
    lastShotAt = 0;
    state = 'hidden';

    if (miraEl) { miraEl.style.display = 'none'; miraEl.style.visibility = 'hidden'; }
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
      say(CONFIG.fatigue.exhaustionMessage || getDialogue('exhaustion'), 'negativo');
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
      say(CONFIG.arrowLimit.waitMessage || getDialogue('arrow_cooldown_wait'), 'neutral');
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

function onPointerUpDuringPendingAimRequest() {
    if (!pendingAimRequest) return;
    pendingAimRequest = false;
    charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
    charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
  }

function onPointerCancelDuringPendingAimRequest() {
    onPointerUpDuringPendingAimRequest();
  }

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
      showPose(defaultIdlePoseKey); // v1.5: ver defaultIdlePoseKey
      if (miraEl) { miraEl.style.display = 'none'; miraEl.style.visibility = 'hidden'; }
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
    if (miraEl.complete && miraEl.naturalWidth) {
      fitLongSide(miraEl, miraTargetPx(window.Buddy.resolveAsset('archery', 'images', 'mira')));
      miraEl.style.visibility = 'visible';
    } else {
      miraEl.style.visibility = 'hidden';
    }
    miraBaseDx = 0;
    miraBaseDy = 0;
    miraEl.style.transform = 'translate(0px, 0px)';
    fitLongSide(miraEl, miraTargetPx(window.Buddy.resolveAsset('archery', 'images', 'mira')));

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
    sostenidoPhase = 0;
    lastSostenidoIntensity = 0;
    lastPointerMoveAt = performance.now();
    lastPointerX = startX;
    lastPointerY = startY;
    lastTremorFrameAt = 0;
    startAimTremor();

    charEl.addEventListener('pointermove', onPointerMoveWhileAiming);
    charEl.addEventListener('pointerup', onPointerUpWhileAiming);
    charEl.addEventListener('pointercancel', onPointerCancel);

    // v2.0: el brazo se baja solo en algún punto entre forzarBajaMinMs y
    // forzarBajaMaxMs (10 a 14s), sorteado acá mismo para que sea un
    // instante distinto cada vez que se apunta, en vez de un cronómetro
    // fijo. Ver CONFIG.sostenido para el resto del handicap (el temblor
    // que lo precede desde los 4s).
    var forzarBajaMs = CONFIG.sostenido.forzarBajaMinMs +
      Math.random() * (CONFIG.sostenido.forzarBajaMaxMs - CONFIG.sostenido.forzarBajaMinMs);
    maxHoldTimer = setTimeout(function () {
      resolve('fail', 'brazo cansado (' + Math.round(forzarBajaMs) + 'ms)', CONFIG.sostenido.forzarBajaMensaje);
    }, forzarBajaMs);

    setDebug('estado: aiming — soltá antes de 8s para disparar bien');
  }

function aimTremorActive() {
    return !!CONFIG.heartbeat.enabled || fatigueActiveNow() || !!CONFIG.vaiven.enabled ||
      !!CONFIG.sostenido.enabled;
  }

function fatigueActiveNow() {
    return !!CONFIG.fatigue.enabled && arrowsFiredTotal >= CONFIG.fatigue.startAfterArrow;
  }

function currentFatigueLevel(now) {
    if (!lastShotAt) return 0;
    var restedMs = now - lastShotAt;
    if (restedMs < CONFIG.fatigue.restStartMs) return fatigueLevel;
    var steps = 1 + Math.floor((restedMs - CONFIG.fatigue.restStartMs) / CONFIG.fatigue.restStepMs);
    return Math.max(0, fatigueLevel - steps);
  }

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

    // v2.0: intensidad (0..1) del cansancio por sostener la mira (ver
    // CONFIG.sostenido). Se calcula acá, antes que todo lo demás, porque
    // el bloque de latido de abajo también la usa (empuja su piso
    // mínimo de intensidad, así "los latidos" se aceleran solos con el
    // tiempo sostenido, no solo con la velocidad real del puntero).
    var sostenidoIntensity = 0;
    if (CONFIG.sostenido.enabled) {
      var heldMs = now - aimStartedAt;
      if (heldMs > CONFIG.sostenido.startAfterMs) {
        var span = CONFIG.sostenido.imposibleEnMs - CONFIG.sostenido.startAfterMs;
        var progress = Math.min(1, (heldMs - CONFIG.sostenido.startAfterMs) / span);
        // Curva exponencial real (no lineal): arranca casi plana y se
        // dispara cerca de imposibleEnMs, tal como pidió el diseño
        // ("el incremento aumenta exponencialmente cada segundo").
        var k = CONFIG.sostenido.growthRate;
        sostenidoIntensity = (Math.exp(k * progress) - 1) / (Math.exp(k) - 1);
      }
    }
    lastSostenidoIntensity = sostenidoIntensity;

    // --- Latido (v0.4) ---------------------------------------------
    if (CONFIG.heartbeat.enabled) {
      // Si el puntero real no se movió en los últimos stillnessMs, el
      // objetivo de intensidad decae a 0 (reposo) aunque el último tramo
      // medido haya sido brusco — así el pulso se calma solo al dejar de
      // mover el dedo/mouse, no solo al soltar.
      if (now - lastPointerMoveAt > CONFIG.heartbeat.stillnessMs) {
        heartbeatTargetIntensity = 0;
      }

      // v2.0: sostener mucho tiempo pone un piso mínimo a la intensidad
      // del latido, aunque el puntero esté quieto (ver sostenidoIntensity
      // arriba). Nunca la baja: sólo puede subirla por encima de lo que
      // ya haya puesto el movimiento real del puntero.
      heartbeatTargetIntensity = Math.max(heartbeatTargetIntensity, sostenidoIntensity);

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

    // --- Cansancio por sostener la mira (v2.0) -----------------------
    // Sacudida propia, sumada encima de todo lo anterior. No hace nada
    // antes de startAfterMs (sostenidoIntensity queda en 0); de ahí en
    // adelante crece con la curva exponencial calculada arriba, hasta
    // volverse lo bastante grande como para que apuntar sea imposible
    // en la práctica cerca de imposibleEnMs.
    if (sostenidoIntensity > 0) {
      sostenidoPhase += 2 * Math.PI * CONFIG.sostenido.shakeHz * (dt / 1000);
      var sostenidoAmplitude = CONFIG.sostenido.maxAmplitudePx * sostenidoIntensity * cadMult;
      var sostenidoWave = Math.sin(sostenidoPhase) + 0.6 * Math.sin(1.9 * sostenidoPhase + 0.4);
      var sostenidoJitterX = (Math.random() * 2 - 1) * CONFIG.sostenido.maxJitterPx * sostenidoIntensity * cadMult;
      var sostenidoJitterY = (Math.random() * 2 - 1) * CONFIG.sostenido.maxJitterPx * sostenidoIntensity * cadMult;
      pulseX += sostenidoWave * sostenidoAmplitude + sostenidoJitterX;
      pulseY += sostenidoWave * sostenidoAmplitude * 0.85 + sostenidoJitterY;
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
    // el lado de buddy, no el del blanco, así que ninguna flecha debería
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
      resolve('fail', 'la mira cruzó a la mitad derecha de la pantalla', getDialogue('aim_too_far'));
      return;
    }

    // Zona de "sabiduría" (CONFIG.wisdomZone): si la mira cae en el cuarto
    // inferior de la VENTANA VISIBLE (viewport) — equivalente a apuntar
    // hacia abajo, al suelo, en vez de hacia el blanco — Raúl decide no
    // disparar. Se calcula con window.innerHeight, igual que la regla de
    // arriba (mitad de pantalla), no con el alto del documento completo.
    // A diferencia de esa regla, esto NO es un fallo: resolve('wisdom', ...)
    // vuelve derecho a pose03 en vez de pose04/MISS (ver la rama 'wisdom'
    // dentro de resolve()).
    var wisdomThresholdY = window.innerHeight * (1 - CONFIG.wisdomZone.bottomFraction);
    if (miraCenterY >= wisdomThresholdY) {
      resolve('wisdom', 'la mira apuntó al cuarto inferior de la ventana visible');
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
        ' — cadencia: +' + cadenciaExtraPct + '%' +
        ' — sostenido: ' + Math.round(lastSostenidoIntensity * 100) + '%'
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
        var bubbleText = (score != null)
          ? (getDialogue('score_' + score) || ('¡Eso fue un ' + score + '!'))
          : getDialogue('miss');
        say(bubbleText, (score != null && score >= 8) ? 'positivo' : (score != null ? 'neutral' : 'negativo'));
        setDebug(
          'estado: resolved (fire) — ' + reasonLabel + ' — ' + bubbleText +
          ' — flechas clavadas: ' + stuckArrows.length
        );

        // Límite de flechas (v0.4): esta flecha recién clavada cuenta para
        // la tanda actual. Al completar CONFIG.arrowLimit.countBeforeCooldown,
        // arranca el cooldown y se reinicia el conteo para la próxima tanda.
        // v1.5: batchScoreSum acompaña a arrowsInBatch flecha a flecha (un
        // miss suma 0) y se narra/reinicia en el mismo momento.
        arrowsInBatch++;
        batchScoreSum += (score != null ? score : 0);
        if (arrowsInBatch >= CONFIG.arrowLimit.countBeforeCooldown) {
          startArrowCooldown();
          narrateAndanadaTotal(batchScoreSum);
          arrowsInBatch = 0;
          batchScoreSum = 0;
        }
      }, CONFIG.hitDelayMs);
    } else if (outcome === 'wisdom') {
      // Zona de "sabiduría" (CONFIG.wisdomZone): NO es un fallo — Raúl
      // elige conscientemente no disparar, así que vuelve derecho a su
      // pose de reposo (idle/pose03 salvo que la última andanada haya
      // sido floja — ver defaultIdlePoseKey), nunca a pose04 por MISS.
      var wisdomText = failBubbleText || getDialogue('arm_lowered_early');
      miraEl.style.display = 'none';
      showPose(defaultIdlePoseKey); // v1.5: ver defaultIdlePoseKey
      say(wisdomText, 'neutral');
      setDebug('estado: resolved (wisdom) — ' + reasonLabel + ' — ' + wisdomText);
    } else {
      miraEl.style.display = 'none';
      showPose('fail');
      var failText = failBubbleText || getDialogue('miss');
      say(failText, 'negativo');
      setDebug('estado: resolved (fail) — ' + reasonLabel + ' — ' + failText);
    }

    resolveTimer = setTimeout(function () {
      // v1.0: si mientras esta flecha volaba/resolvía el jugador ya hizo
      // click/touch-and-drag sobre buddy (ver pendingAimRequest en
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
      showPose(defaultIdlePoseKey); // v1.5: ver defaultIdlePoseKey
      setDebug(idleDebugMessage());
    }, CONFIG.resolveDisplayMs);
  }

function onTestTriggerClick(e) {
    testTriggerClickCount++;

    if (testTriggerClickTimer) {
      clearTimeout(testTriggerClickTimer);
    }
    testTriggerClickTimer = setTimeout(function () {
      testTriggerClickCount = 0;
      testTriggerClickTimer = null;
    }, CONFIG.testTrigger.windowMs);

    if (testTriggerClickCount < CONFIG.testTrigger.clicksToTrigger) return;

    testTriggerClickCount = 0;
    clearTimeout(testTriggerClickTimer);
    testTriggerClickTimer = null;

    if (state === 'hidden') {
      showCharacter();
    } else if (state === 'idle') {
      hideCharacter();
    }
    // Si está en 'pending' / 'aiming' / 'resolved' se ignora el triple
    // click para no interrumpir una prueba en curso.
  }

function init() {
    var missing = [];
    if (!window.Buddy || typeof window.Buddy.resolveAsset !== 'function') missing.push('window.Buddy.resolveAsset');
    if (!window.Buddy || typeof window.Buddy.resolveExpression !== 'function') missing.push('window.Buddy.resolveExpression');
    if (!window.Buddy || typeof window.Buddy.resolveExpressionByCategory !== 'function') missing.push('window.Buddy.resolveExpressionByCategory');
    if (!window.Buddy || typeof window.Buddy.showCharacterImage !== 'function') missing.push('window.Buddy.showCharacterImage');
    if (typeof window.buddy_says !== 'function') missing.push('window.buddy_says');

    if (missing.length) {
      console.error('[buddy_archery] No se pudo inicializar: faltan APIs: ' + missing.join(', '));
      return;
    }

    preloadAssets();
    ensureElements();
    bindArrowRepositioning();
    window.addEventListener('resize', onResize);
    initCalibration();
    document.addEventListener('click', onTestTriggerClick);
  }


  // ---------------------------------------------------------------------
  // API pública del módulo
  // ---------------------------------------------------------------------
  window.Buddy = window.Buddy || {};
  window.Buddy.archery = {
    show: showCharacter,
    hide: hideCharacter,
    resetArrows: resetArrows,
    computeScore: computeScore,
    getArrowLog: function () {
      return sessionArrowLog.map(function (entry) {
        return Object.assign({}, entry);
      });
    },
    getFatigueLevel: function () {
      return fatigueActiveNow() ? currentFatigueLevel(performance.now()) : 0;
    },
    getCalibrationError: function () {
      return Math.sqrt(calibOffsetX * calibOffsetX + calibOffsetY * calibOffsetY);
    },
    estaOcupado: function () {
      return state !== 'idle';
    }
  };


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

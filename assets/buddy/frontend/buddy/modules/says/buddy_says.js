/**
 * assets/buddy/modules/says/buddy_says.js
 * ---------------------------------------------------------------------------
 * Fase 4 del plan de separación de raulito.js (ver planBuddy_v5.md, sección
 * 4.4 y 4.4.1; prompt de ejecución en fase04.md).
 *
 * Fase 8: además del NÚCLEO de comunicación por globo, este archivo
 * incorpora el motor de fuentes automáticas (recurrencia, frecuencia,
 * medios registrados en modules/says/sources/, selección aleatoria/secuencial,
 * persistencia diaria y variante cortés que nunca interrumpe una actividad ocupada).
 *
 * Fuente del mecanismo: raulito.js (ensureBubbleStyles, positionBubble,
 * showSpeechBubble, hideSpeechBubble, CONFIG.bubbleGapPx/bubbleLeftShiftPx/
 * bubbleTailOffsetPx/bubbleDisplayMs). Se traslada conservando el
 * comportamiento visual; lo que cambia es:
 *   - el punto de anclaje: antes CONFIG.characterFaceAnchor.x/y[poseKey]
 *     (nivel de ojos/sombrero, indexado por pose fija); ahora
 *     datosExpresion.anclas.cabeza_superior (esquina superior-izquierda de
 *     la cabeza, medida por expresión — ver planBuddy_v5.md sección 4.1 y
 *     4.4.1, y tabla de mapeo sección 4.1);
 *   - la fuente de la expresión/imagen: antes showPose(poseKey) local a
 *     raulito.js; ahora window.Buddy.showCharacterImage(datosExpresion)
 *     de la Fase 3 (buddy.js) — este módulo no dibuja ni posiciona al
 *     personaje.
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function () {
  'use strict';

  // -------------------------------------------------------------------
  // Verificación de dependencias de la Fase 3. Si buddy.js no está
  // cargado o no expone las APIs que exige fase04.md (sección 1), se
  // detiene la carga y se reporta qué falta, en vez de inventar una
  // implementación paralela.
  // -------------------------------------------------------------------
  var faltantes = [];
  if (!window.Buddy || typeof window.Buddy.showCharacterImage !== 'function') {
    faltantes.push('window.Buddy.showCharacterImage');
  }
  if (!window.Buddy || typeof window.Buddy.resolveExpression !== 'function') {
    faltantes.push('window.Buddy.resolveExpression');
  }
  if (!window.Buddy || typeof window.Buddy.resolveExpressionByCategory !== 'function') {
    faltantes.push('window.Buddy.resolveExpressionByCategory');
  }
  if (!window.Buddy || typeof window.Buddy.resolveExpressionExact !== 'function') {
    faltantes.push('window.Buddy.resolveExpressionExact');
  }
  if (faltantes.length) {
    console.error(
      '[buddy_says] No se pudo inicializar: faltan APIs de la Fase 3 (buddy.js): ' +
      faltantes.join(', ') + '. Verificá que assets/buddy/buddy.js se cargue ' +
      'ANTES que assets/buddy/modules/says/buddy_says.js.'
    );
    return;
  }

  // -------------------------------------------------------------------
  // Config propia del módulo — geometría del globo, trasladada de
  // raulito.js sin cambiar los valores (ver cabecera del archivo).
  // -------------------------------------------------------------------
  var CONFIG = {
    // Cuánto se queda visible el globo por defecto si no se pasa
    // opciones.durationMs (= CONFIG.bubbleDisplayMs en raulito.js).
    bubbleDisplayMs: 2800,

    // Duración adaptativa: los mensajes largos permanecen visibles el
    // tiempo suficiente para poder leerlos. Los límites y la velocidad se
    // pueden ajustar desde BuddySaysConfig.display.
    bubbleDuration: {
      minMs: 2800,
      maxMs: 9000,
      charsPerSecond: 14,
      extraMs: 500
    },

    // Separación vertical entre la base del globo y anclas.cabeza_superior.
    bubbleGapPx: 20,
    // Corrimiento del CUERPO del globo hacia la izquierda del punto de
    // cabeza_superior (la colita se queda apuntando cerca del punto real).
    bubbleLeftShiftPx: 17,
    // Debe coincidir con la colita del globo (::after en ensureBubbleStyles:
    // "right:28px;width:14px" -> el centro de la colita queda a
    // 28+14/2=35px del borde derecho del globo).
    bubbleTailOffsetPx: 17,

    // Expresión de reposo — obligatoria en cualquier personaje (ver
    // buddy.js, EXPRESION_OBLIGATORIA), a la que se vuelve al terminar
    // un mensaje.
    expresionPorDefecto: 'sereno',

    // Fallback expresado también en píxeles absolutos del archivo original.
    // Se usa únicamente si una expresión no declara cabeza_superior.
    cabezaSuperiorFallback: { x: 90, y: 59 }
  };

  // -------------------------------------------------------------------
  // Estilos del globo — mismos valores visuales que raulito.js
  // (.raulito-bubble), renombrados para no depender de nombres de
  // Raulito.
  // -------------------------------------------------------------------
  function ensureBubbleStyles() {
    if (document.getElementById('buddy-says-bubble-style')) return;
    var style = document.createElement('style');
    style.id = 'buddy-says-bubble-style';
    style.textContent =
      '.buddy-says-bubble{position:fixed;max-width:230px;background:#ffffff;' +
      'color:#1a1a1a;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,' +
      '"Segoe UI",Roboto,sans-serif;padding:10px 14px;border-radius:16px;' +
      'box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:10000;pointer-events:none;' +
      'user-select:none;opacity:0;transform:translateY(8px) scale(.96);' +
      'transition:opacity .18s ease,transform .18s ease;text-align:center;}' +
      '.buddy-says-bubble.is-visible{opacity:1;transform:translateY(0) scale(1);}' +
      '.buddy-says-bubble::after{content:"";position:absolute;bottom:-6px;' +
      'right:28px;width:14px;height:14px;background:#ffffff;' +
      'transform:rotate(45deg);border-radius:2px;}' +
      // Globo "promo" (más ancho, con pointer-events habilitado para poder
      // tocar un <a> real adentro) — mismo criterio que raulito.js.
      '.buddy-says-bubble.is-interactive{pointer-events:auto;user-select:none;max-width:300px;}'+
      '.buddy-says-bubble.is-interactive .buddy-says-choice{margin:8px 4px 0;padding:6px 12px;border:1px solid #888;' +
      'border-radius:8px;background:#f3f3f3;color:#1a1a1a;cursor:pointer;font:inherit;}'+
      '.buddy-says-bubble.is-interactive .buddy-says-choice:hover{background:#e8e8e8;}'+
      '.buddy-says-bubble.is-promo{max-width:300px;pointer-events:auto;'
      'user-select:text;}' +
      '.buddy-says-bubble.is-promo a{color:#0d6efd;text-decoration:underline;' +
      'pointer-events:auto;}';
    document.head.appendChild(style);
  }

  var bubbleEl = null;
  var interactiveHandler = null;

  function ensureBubbleElement() {
    if (bubbleEl) return bubbleEl;
    ensureBubbleStyles();
    bubbleEl = document.createElement('div');
    bubbleEl.id = 'buddy-says-bubble';
    bubbleEl.className = 'buddy-says-bubble';
    bubbleEl.style.display = 'none';
    document.body.appendChild(bubbleEl);
    return bubbleEl;
  }

  // -------------------------------------------------------------------
  // Elemento del personaje: buddy_says NO dibuja ni calcula la posición
  // del personaje (eso es responsabilidad exclusiva de buddy.js / Fase 3).
  // Acá solo se LEE el rect ya renderizado por buddy.js, a través del id
  // fijo que buddy.js le asigna (#buddy-character), para saber dónde cae
  // en pantalla el ancla cabeza_superior. No se reimplementa ningún
  // cálculo de escala/offset/cintura.
  // -------------------------------------------------------------------
  function getCharacterEl() {
    return document.getElementById('buddy-character');
  }

  // Posiciona el globo apuntando a datosExpresion.anclas.cabeza_superior
  // (sección 4.4.1 del plan), no al borde del rectángulo completo de la
  // imagen ni a coordenadas fijas del personaje. La base del globo (borde
  // inferior + colita) queda fija respecto de ese punto; el cuerpo crece
  // hacia arriba (ver showBubble/CSS: bottom/right, nunca top/left).
  function positionBubble(datosExpresion) {
    var charEl = getCharacterEl();
    if (!charEl || !bubbleEl) return;
    var rect = charEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var cabezaSuperior = datosExpresion && datosExpresion.anclas &&
      datosExpresion.anclas.cabeza_superior;

    // Las anclas de las expresiones ahora son coordenadas ABSOLUTAS en
    // píxeles dentro de la imagen original, igual que las anclas del
    // personaje y de Archery. No se pueden multiplicar directamente por
    // rect.width/height: primero hay que convertirlas a la escala renderizada.
    var sourceWidth = Number(datosExpresion && datosExpresion.ancho);
    var sourceHeight = Number(datosExpresion && datosExpresion.alto);
    var anchorX = cabezaSuperior && typeof cabezaSuperior.x === 'number'
      ? cabezaSuperior.x
      : CONFIG.cabezaSuperiorFallback.x;
    var anchorY = cabezaSuperior && typeof cabezaSuperior.y === 'number'
      ? cabezaSuperior.y
      : CONFIG.cabezaSuperiorFallback.y;

    if (!sourceWidth || !sourceHeight ||
        !isFinite(sourceWidth) || !isFinite(sourceHeight)) {
      console.warn('[buddy_says] La expresión no tiene ancho/alto válidos; no se puede convertir cabeza_superior a píxeles renderizados.');
      return;
    }

    var renderedAnchorX = anchorX * rect.width / sourceWidth;
    var renderedAnchorY = anchorY * rect.height / sourceHeight;

    var faceX = rect.left + renderedAnchorX;
    var faceY = rect.top + renderedAnchorY;

    // La colita (bubbleTailOffsetPx) apunta cerca de faceX; el cuerpo del
    // globo se corre bubbleLeftShiftPx más a la izquierda de eso.
    var tailTargetX = faceX - CONFIG.bubbleLeftShiftPx;

    bubbleEl.style.left = 'auto';
    bubbleEl.style.top = 'auto';
    // right/bottom (no left/top): el globo crece hacia arriba y a la
    // izquierda sin mover su base — un texto largo no desplaza el anclaje.
    bubbleEl.style.right = Math.max(8, window.innerWidth - tailTargetX - CONFIG.bubbleTailOffsetPx) + 'px';
    bubbleEl.style.bottom = (window.innerHeight - faceY + CONFIG.bubbleGapPx) + 'px';
  }

  function clearInteractiveChoices() {
    if (!bubbleEl) return;
    var choices = bubbleEl.querySelectorAll('.buddy-says-choice');
    for (var i = 0; i < choices.length; i += 1) choices[i].remove();
    interactiveHandler = null;
    bubbleEl.classList.remove('is-interactive');
  }

  function cancelInteractive() {
    interactiveHandler = null;
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    callToken++;
    clearInteractiveChoices();
    hideBubble();
    showNextQueuedSpeech();
    return true;
  }

  function finishInteractive(value) {
    var handler = interactiveHandler;
    interactiveHandler = null;
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    callToken++;
    clearInteractiveChoices();
    hideBubble();
    if (typeof handler === 'function') {
      var result = handler(value);
      // El handler puede generar inmediatamente el siguiente mensaje; si no
      // lo hizo, libera la cola que estaba esperando detrás de la interacción.
      if (!hasActiveSpeech()) showNextQueuedSpeech();
      return result;
    }
    showNextQueuedSpeech();
    return false;
  }

  function renderInteractiveChoices(opciones) {
    clearInteractiveChoices();
    if (!opciones || opciones.interactive !== true || !Array.isArray(opciones.choices)) return;
    interactiveHandler = typeof opciones.onChoice === 'function' ? opciones.onChoice : null;
    bubbleEl.classList.add('is-interactive');
    opciones.choices.forEach(function (choice) {
      if (!choice) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'buddy-says-choice';
      button.textContent = String(choice.label == null ? choice.value : choice.label);
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        finishInteractive(choice.value);
      });
      bubbleEl.appendChild(button);
    });
  }

  function showBubble(texto, opciones, datosExpresion) {
    ensureBubbleElement();
    clearInteractiveChoices();
    if (opciones.html) {
      bubbleEl.innerHTML = texto;
    } else {
      bubbleEl.textContent = texto;
    }
    bubbleEl.classList.toggle('is-promo', !!opciones.promo);
    renderInteractiveChoices(opciones);
    positionBubble(datosExpresion);
    bubbleEl.style.display = 'block';
    // Fuerza reflow para que la transición de entrada dispare siempre,
    // incluso si el globo ya estaba visible mostrando otro texto.
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add('is-visible');
  }

  function hideBubble() {
    if (!bubbleEl) return;
    bubbleEl.classList.remove('is-visible');
    setTimeout(function () {
      if (bubbleEl && !bubbleEl.classList.contains('is-visible')) {
        bubbleEl.style.display = 'none';
      }
    }, 200);
  }

  // -------------------------------------------------------------------
  // Resolución de emocion -> datosExpresion.
  //
  // La prioridad es: 1) categoría del diccionario, 2) expresión exacta,
  // 3) expresión por defecto. Las APIs Exact permiten saber si realmente
  // hubo una coincidencia, sin comparar rutas de archivos contra sereno.
  // -------------------------------------------------------------------
  function resolveExpresionParaEmocion(emocion) {
    if (!emocion) emocion = CONFIG.expresionPorDefecto;

    var porCategoria = window.Buddy.resolveExpressionByCategory(emocion);
    if (porCategoria) return porCategoria;

    var directa = window.Buddy.resolveExpressionExact(emocion);
    if (directa) return directa;

    return window.Buddy.resolveExpression(CONFIG.expresionPorDefecto);
  }

  // -------------------------------------------------------------------
  // Estado interno mínimo: timer de ocultación + token de llamada (para
  // saber si, cuando vence durationMs, otro buddy_says() ya tomó el
  // control mientras tanto — en ese caso NO se restaura 'sereno', porque
  // ese llamado más nuevo es responsable de su propia restauración).
  // -------------------------------------------------------------------
  var bubbleTimer = null;
  var callToken = 0;

  // Cola FIFO de mensajes solicitados por los módulos. Antes un nuevo
  // buddy_says() sustituía inmediatamente el globo/timer anterior. Eso hacía
  // que mensajes generados en cadena (por ejemplo, Archery al terminar una
  // tanda) se perdieran. Los mensajes pendientes ahora se conservan y se
  // entregan en orden cuando termina el mensaje actual.
  var speechQueue = [];

  function getBubbleDurationMs(texto, opciones) {
    if (opciones && typeof opciones.durationMs === 'number') {
      return Math.max(0, opciones.durationMs);
    }

    var settings = window.BuddySaysConfig && window.BuddySaysConfig.display || {};
    var base = Number(settings.baseMs);
    var minMs = Number(settings.minMs);
    var maxMs = Number(settings.maxMs);
    var charsPerSecond = Number(settings.charsPerSecond);
    var extraMs = Number(settings.extraMs);

    if (!isFinite(base) || base < 0) base = CONFIG.bubbleDisplayMs;
    if (!isFinite(minMs) || minMs < 0) minMs = CONFIG.bubbleDuration.minMs;
    if (!isFinite(maxMs) || maxMs < minMs) maxMs = CONFIG.bubbleDuration.maxMs;
    if (!isFinite(charsPerSecond) || charsPerSecond <= 0) charsPerSecond = CONFIG.bubbleDuration.charsPerSecond;
    if (!isFinite(extraMs) || extraMs < 0) extraMs = CONFIG.bubbleDuration.extraMs;

    var plainText = String(texto == null ? '' : texto)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    var chars = plainText.length;
    var duration = base + (chars / charsPerSecond) * 1000 + (chars > 45 ? extraMs : 0);
    return Math.round(Math.min(maxMs, Math.max(minMs, duration)));
  }

  function hasActiveSpeech() {
    return !!(bubbleTimer || interactiveHandler || isBubbleVisible());
  }

  function showNextQueuedSpeech() {
    if (hasActiveSpeech() || !speechQueue.length) return false;

    var next = speechQueue.shift();
    debugSource('[BUDDY SAYS] entregando mensaje pendiente:', next.texto,
      'pendientes=', speechQueue.length);
    return showSpeechNow(next.texto, next.opciones);
  }

  function buddySays(texto, opciones) {
    opciones = Object.assign({}, opciones || {});

    if (hasActiveSpeech()) {
      speechQueue.push({ texto: texto, opciones: opciones });
      debugSource('[BUDDY SAYS] mensaje agregado a la cola:', texto,
        'pendientes=', speechQueue.length);
      return true;
    }

    return showSpeechNow(texto, opciones);
  }

  function showSpeechNow(texto, opciones) {
    opciones = opciones || {};
    var interactive = opciones.interactive === true && Array.isArray(opciones.choices);
    var durationMs = getBubbleDurationMs(texto, opciones);

    var datosExpresion = resolveExpresionParaEmocion(opciones.emocion);
    if (!datosExpresion || !datosExpresion.archivo) {
      console.error(
        "[buddy_says] No se pudo resolver ninguna expresión (ni siquiera '" +
        CONFIG.expresionPorDefecto + "'). Revisar el archivo de datos del " +
        'personaje activo (window.BuddyChars).'
      );
      return false;
    }

    // 1) cambia la cara mientras dura el mensaje. showCharacterImage()
    // también hace visible al personaje y notifica a los módulos para que
    // puedan salir de su estado interno 'hidden'.
    window.Buddy.showCharacterImage(datosExpresion);
    // 2) muestra el globo, anclado a cabeza_superior de esa expresión.
    showBubble(texto, opciones, datosExpresion);

    // Sustituye cualquier mensaje/timer anterior en curso (mismo criterio
    // que raulito.js: un nuevo llamado siempre gana).
    callToken++;
    var thisCall = callToken;
    if (bubbleTimer) clearTimeout(bubbleTimer);

    if (interactive) {
      bubbleTimer = null;
      return true;
    }

    bubbleTimer = setTimeout(function () {
      bubbleTimer = null;
      // Si otro buddy_says() ya se ejecutó después de este, ese llamado
      // es dueño del estado actual: no pisar su globo ni su expresión.
      if (thisCall !== callToken) return;

      hideBubble();

      // Si un módulo interactivo mantiene el control de la pose (por ejemplo
      // Archery mientras se apunta o mientras la flecha está en vuelo), no
      // debemos imponer sereno al terminar el mensaje. El módulo activo es
      // quien conoce cuál debe ser la pose en ese instante.
      if (window.Buddy && window.Buddy.archery &&
          typeof window.Buddy.archery.restoreCurrentPose === 'function' &&
          typeof window.Buddy.archery.estaOcupado === 'function' &&
          window.Buddy.archery.estaOcupado()) {
        window.Buddy.archery.restoreCurrentPose();
      } else {
        var serenoData = window.Buddy.resolveExpression(CONFIG.expresionPorDefecto);
        if (serenoData) {
          window.Buddy.showCharacterImage(serenoData);
        }
      }

      // Una vez liberado el mensaje actual, continúa el tren FIFO sin
      // reemplazar ni perder los mensajes que llegaron mientras se hablaba.
      showNextQueuedSpeech();
    }, durationMs);

    return true;
  }


  // -------------------------------------------------------------------
  // Fase 8 — motor de fuentes
  // -------------------------------------------------------------------
  var SOURCES = window.BuddyInformSources = window.BuddyInformSources || {};
  var SOURCE_STORAGE_KEY = 'buddySaysV1';
  var sourceStates = {};
  var sourceEngineStarted = false;
  var sourceEngineTimer = null;
  var sourceQueue = [];
  var queueIndex = 0;
  var lastDeliveryDate = 0;

  var configuredSources = window.BuddySaysConfig && Array.isArray(window.BuddySaysConfig.sources) ?
    window.BuddySaysConfig.sources : [];

  var SOURCES_CONFIG = configuredSources.filter(function (item) {
    return item && item.enabled === true && item.id;
  }).map(function (item) {
    return {
      id: String(item.id),
      recurrence: item.recurrence != null ? Number(item.recurrence) : Number(item.recurrencia || 1),
      frequency: item.frequency || item.frecuencia || { min: 0, max: 0 },
      selection: String(item.selection || item.seleccion || 'sequential').toLowerCase(),
      primero: item.primero === true
    };
  });

  function debugSource() {
    if (window.BUDDY_SAYS_DEBUG && window.console && window.console.log) {
      window.console.log.apply(window.console, arguments);
    }
  }

  function warnSource() {
    if (window.console && window.console.warn) {
      window.console.warn.apply(window.console, arguments);
    }
  }

  function todayKey(timestamp) {
    var date = new Date(timestamp == null ? Date.now() : timestamp);
    return date.getFullYear() + '-' +
      ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
      ('0' + date.getDate()).slice(-2);
  }

  function isToday(timestamp) {
    return Number(timestamp) > 0 && todayKey(timestamp) === todayKey();
  }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore() {
    try {
      window.localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(sourceStore));
    } catch (e) {
      warnSource('[buddy_says] No se pudo guardar buddySaysV1:', e);
    }
  }

  var sourceStore = readStore().filter(function (message) {
    return !Number(message && message.date) || isToday(message.date);
  });

  function stableHash(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function getMessageText(message) {
    if (typeof message === 'string') return message.trim();
    if (message && typeof message.texto === 'string') return message.texto.trim();
    if (message && typeof message.mensaje === 'string') return message.mensaje.trim();
    if (message && typeof message.text === 'string') return message.text.trim();
    return '';
  }

  function getMessageId(message) {
    return stableHash(getMessageText(message));
  }

  function getMessageEmotion(message) {
    if (message && typeof message === 'object' && typeof message.emocion === 'string') {
      return message.emocion;
    }
    return CONFIG.expresionPorDefecto;
  }

  function normalizeMessages(sourceId, messages) {
    if (!Array.isArray(messages)) return [];
    return messages.map(function (message, index) {
      var texto = getMessageText(message);
      if (!texto) return null;
      return {
        id: getMessageId(message),
        texto: texto,
        emocion: getMessageEmotion(message),
        source: sourceId,
        sourceIndex: index,
        original: message
      };
    }).filter(Boolean);
  }

  function randomNumberInclusive(min, max) {
    min = Math.max(0, Number(min) || 0);
    max = Math.max(min, Number(max) || min);
    return min + Math.random() * (max - min);
  }

  function getWaitMinutes(config) {
    var min = Math.max(0, Number(config.frequency && config.frequency.min) || 0);
    var max = Math.max(min, Number(config.frequency && config.frequency.max) || min);
    return randomNumberInclusive(min, max);
  }

  function getStoredMessage(id) {
    for (var i = 0; i < sourceStore.length; i++) {
      if (sourceStore[i].id === id) return sourceStore[i];
    }
    return null;
  }

  function ensureStoredMessage(message, config) {
    var stored = getStoredMessage(message.id);
    var recurrence = Math.max(0, Number(config.recurrence) || 0);

    if (!stored) {
      stored = {
        id: message.id,
        texto: message.texto,
        emocion: message.emocion,
        source: message.source,
        date: 0,
        recurrence: recurrence,
        espera: getWaitMinutes(config)
      };
      sourceStore.push(stored);
      return stored;
    }

    // El texto/emoción/fuente se actualizan con la fuente actual, pero
    // recurrence, espera y date pertenecen al estado persistente del mensaje.
    stored.texto = message.texto;
    stored.emocion = message.emocion;
    stored.source = message.source;
    stored.recurrence = Math.max(0, Number(stored.recurrence) || 0);
    stored.espera = Math.max(0, Number(stored.espera) || 0);
    stored.date = Number(stored.date) || 0;
    return stored;
  }

  function loadSource(state) {
    var source = SOURCES[state.config.id];
    if (source === undefined || source === null) {
      state.error = new Error('Fuente no registrada: ' + state.config.id);
      warnSource('[buddy_says] ' + state.error.message);
      return Promise.resolve(false);
    }

    state.loading = true;
    return Promise.resolve().then(function () {
      if (Array.isArray(source)) return source;
      if (typeof source.obtenerMensajes === 'function') return source.obtenerMensajes();
      throw new Error('Formato de fuente no válido: ' + state.config.id);
    }).then(function (messages) {
      state.messages = normalizeMessages(state.config.id, messages);
      state.error = null;
      state.messages.forEach(function (message) {
        message.stored = ensureStoredMessage(message, state.config);
      });
      debugSource('[BUDDY SAYS] mensajes cargados:', state.config.id, '=', state.messages.length);
      return true;
    }).catch(function (error) {
      state.messages = [];
      state.error = error;
      warnSource('[buddy_says] Error en fuente ' + state.config.id + ':', error);
      return false;
    }).then(function (ok) {
      state.loading = false;
      return ok;
    });
  }

  function shuffleArray(list) {
    var result = list.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  function getAvailableMessages(config) {
    var state = sourceStates[config.id];
    if (!state || !state.messages.length) return [];

    var available = state.messages.filter(function (message) {
      return message.stored && Number(message.stored.recurrence) > 0;
    });

    if (config.selection === 'shuffle' || config.selection === 'random' ||
        config.selection === 'aleatorio' || config.selection === 'aleatoria') {
      available = shuffleArray(available);
    }

    return available;
  }

  function interleaveSources(sourceLists) {
    var queue = [];
    var active = sourceLists.filter(function (item) { return item.messages.length > 0; });
    var emitted = active.map(function () { return 0; });
    var total = active.map(function (item) { return item.messages.length; });
    var remaining = active.reduce(function (sum, item) { return sum + item.messages.length; }, 0);

    while (remaining > 0) {
      var selected = -1;
      var bestRatio = Infinity;

      active.forEach(function (item, index) {
        if (emitted[index] >= total[index]) return;
        var ratio = emitted[index] / total[index];
        if (ratio < bestRatio) {
          bestRatio = ratio;
          selected = index;
        }
      });

      if (selected < 0) break;
      queue.push(active[selected].messages[emitted[selected]]);
      emitted[selected]++;
      remaining--;
    }

    return queue;
  }

  function buildCycleQueue() {
    var first = [];
    var normal = [];

    SOURCES_CONFIG.forEach(function (config) {
      var messages = getAvailableMessages(config);
      if (!messages.length) return;
      if (config.primero) {
        first = first.concat(messages);
        return;
      }
      normal.push({ config: config, messages: messages });
    });

    return first.concat(interleaveSources(normal));
  }

  function getLastDeliveryDate() {
    var latest = Number(lastDeliveryDate) || 0;
    sourceStore.forEach(function (message) {
      var date = Number(message && message.date) || 0;
      if (date > latest && isToday(date)) latest = date;
    });
    lastDeliveryDate = latest;
    return latest;
  }

  // Si localStorage conserva al menos un mensaje pendiente por entregar
  // (recurrence > 0) y el personaje está oculto después de una recarga,
  // hacemos visible al personaje para que el motor de Says pueda entregar
  // ese mensaje. No consumimos recurrencias ni creamos una entrega aquí.
  function restoreCharacterVisibilityIfNeeded() {
    if (!window.Buddy || typeof window.Buddy.isCharacterVisible !== 'function' ||
        typeof window.Buddy.showCharacterImage !== 'function') return;

    if (window.Buddy.isCharacterVisible()) return;

    var pending = sourceStore.some(function (message) {
      return Number(message && message.recurrence) > 0;
    });

    if (!pending) return;

    var serenoData = resolveExpresionParaEmocion(CONFIG.expresionPorDefecto);
    if (serenoData && serenoData.archivo) {
      debugSource('[BUDDY SAYS] hay mensajes pendientes tras recarga; mostrando el personaje para poder entregarlos.');
      window.Buddy.showCharacterImage(serenoData);
    }
  }

  function getWaitRemainingMs(message) {
    var previous = getLastDeliveryDate();
    if (!previous) return 0;
    var espera = Math.max(0, Number(message.stored.espera) || 0);
    var dueAt = previous + espera * 60 * 1000;
    return Math.max(0, dueAt - Date.now());
  }

  function isBubbleVisible() {
    return !!(bubbleEl && bubbleEl.classList.contains('is-visible'));
  }

  function isSystemBusy() {
    if (window.Buddy && typeof window.Buddy.isBusy === 'function') {
      try {
        return !!window.Buddy.isBusy();
      } catch (e) {
        warnSource('[buddy_says] Buddy.isBusy() lanzó una excepción; se considera ocupado.');
        return true;
      }
    }
    return true;
  }

  function canSpeakPolitely() {
    // Archery tiene prioridad durante una interacción. En particular, desde
    // que comienza 'aiming' hasta que termina la resolución del disparo, no
    // deben aparecer mensajes automáticos de las fuentes. Se consulta
    // directamente además de Buddy.isBusy() para que la protección siga
    // funcionando incluso si el proveedor común todavía no fue registrado
    // por un orden de carga atípico.
    if (window.Buddy && window.Buddy.archery &&
        typeof window.Buddy.archery.estaOcupado === 'function') {
      try {
        if (window.Buddy.archery.estaOcupado()) return false;
      } catch (e) {
        warnSource('[buddy_says] Archery no pudo informar su estado; se considera ocupado.');
        return false;
      }
    }

    return !isBubbleVisible() && !isSystemBusy();
  }

  function hasPendingMessages() {
    return sourceStore.some(function (message) {
      return Number(message && message.recurrence) > 0 &&
        sourceStates[message.source] &&
        sourceStates[message.source].messages.some(function (item) {
          return item.id === message.id;
        });
    });
  }

  function deliverMessage(message) {
    if (!message || !message.stored) return false;

    // La entrega sólo se considera realizada si Says pudo resolver la
    // expresión y hacer visible al personaje. Esto evita consumir una
    // recurrencia persistente cuando la capa visual todavía no está lista.
    if (!buddySays(message.texto, {
      emocion: message.emocion
    })) {
      return false;
    }

    var now = Date.now();
    message.stored.date = now;
    message.stored.recurrence = Math.max(0, Number(message.stored.recurrence) - 1);
    lastDeliveryDate = now;
    writeStore();

    debugSource('[BUDDY SAYS] mensaje mostrado:', message.source, message.id,
      'recurrence=', message.stored.recurrence, 'espera=', message.stored.espera);
    return true;
  }

  function scheduleEngine(delay) {
    if (!sourceEngineStarted) return;
    if (sourceEngineTimer) clearTimeout(sourceEngineTimer);
    sourceEngineTimer = setTimeout(runSourceEngine, Math.max(250, delay || 0));
  }

  function runSourceEngine() {
    sourceEngineTimer = null;
    if (!sourceEngineStarted) return;

    if (!sourceQueue.length || queueIndex >= sourceQueue.length) {
      sourceQueue = buildCycleQueue();
      queueIndex = 0;

      if (!sourceQueue.length) {
        debugSource('[BUDDY SAYS] ciclo finalizado: no quedan mensajes con recurrence > 0.');
        return;
      }
    }

    var message = sourceQueue[queueIndex];
    if (!message || !message.stored || Number(message.stored.recurrence) <= 0) {
      queueIndex++;
      scheduleEngine(0);
      return;
    }

    var remaining = getWaitRemainingMs(message);
    if (remaining > 0) {
      scheduleEngine(remaining);
      return;
    }

    if (!canSpeakPolitely()) {
      // Si el mensaje ya está vencido pero Buddy está ocupado, no debemos
      // perderlo ni dormir durante 30 s. Reintentamos pronto y dejamos que
      // visibilitychange/focus también despierte el motor inmediatamente.
      scheduleEngine(1000);
      return;
    }

    if (deliverMessage(message)) {
      queueIndex++;
    }

    scheduleEngine(0);
  }

  function wakeSourceEngine() {
    if (!sourceEngineStarted) return;
    scheduleEngine(0);
  }

  // Al recuperar foco/visibilidad no esperamos el timeout que estaba
  // pendiente: el motor comprueba inmediatamente si ya corresponde hablar.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', wakeSourceEngine);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', wakeSourceEngine);
  }

  function initializeSourceEngine() {
    if (sourceEngineStarted) return;
    sourceEngineStarted = true;

    SOURCES_CONFIG.forEach(function (config) {
      sourceStates[config.id] = {
        config: config,
        messages: [],
        loading: false,
        error: null
      };
    });

    var loads = SOURCES_CONFIG.map(function (config) {
      return loadSource(sourceStates[config.id]);
    });

    Promise.all(loads).then(function () {
      writeStore();
      getLastDeliveryDate();

      // Si localStorage conserva al menos un mensaje pendiente y el personaje
      // está oculto, lo hacemos visible para que el motor pueda entregar ese
      // mensaje tras la recarga.
      restoreCharacterVisibilityIfNeeded();

      sourceQueue = buildCycleQueue();
      queueIndex = 0;

      if (!sourceQueue.length) {
        debugSource('[BUDDY SAYS] no hay mensajes pendientes para hoy.');
        return;
      }

      // El primer mensaje del día se entrega inmediatamente. Los siguientes
      // respetan la espera fija del mensaje seleccionado desde la última entrega.
      scheduleEngine(0);
    });
  }

  // -------------------------------------------------------------------
  // Variante cortés y API pública del motor.
  // -------------------------------------------------------------------
  function decirSiLibre(texto, opciones) {
    if (!canSpeakPolitely()) return false;
    buddySays(texto, opciones || {});
    return true;
  }

  function cancelarMensajeActual() {
    callToken++;
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    clearInteractiveChoices();
    hideBubble();
    // Cancelar el mensaje actual no significa descartar los mensajes que
    // quedaron pendientes. Se continúa con el siguiente del tren.
    showNextQueuedSpeech();
  }

  function getPendingSpeechCount() {
    return speechQueue.length;
  }

  window.Buddy.says = {
    config: SOURCES_CONFIG,
    decirSiLibre: decirSiLibre,
    cancelarMensajeActual: cancelarMensajeActual,
    pendientes: getPendingSpeechCount,
    resolverInteraccion: finishInteractive,
    cancelarInteraccion: cancelInteractive,
    estaOcupado: isSystemBusy,
    iniciarFuentes: initializeSourceEngine,
    _sources: SOURCES,
    _state: sourceStates,
    _recurrenceKey: SOURCE_STORAGE_KEY,
    tieneAlgoQueDecir: function () {
      return Object.keys(sourceStates).some(function (id) {
        var state = sourceStates[id];
        return !!(state && state.messages && state.messages.some(function (message) {
          return !!(message && message.stored && Number(message.stored.recurrence) > 0);
        }));
      });
    }
  };

  // buddy.js llama a iniciarFuentes() después de registrar todas las fuentes.


  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  window.buddy_says = buddySays;
})();

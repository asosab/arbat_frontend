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
    bubbleGapPx: 50,
    // Corrimiento del CUERPO del globo hacia la izquierda del punto de
    // cabeza_superior (la colita se queda apuntando cerca del punto real).
    bubbleLeftShiftPx: 50,
    // Debe coincidir con la colita del globo (::after en ensureBubbleStyles:
    // "right:28px;width:14px" -> el centro de la colita queda a
    // 28+14/2=35px del borde derecho del globo).
    bubbleTailOffsetPx: 35,

    // Expresión de reposo — obligatoria en cualquier personaje (ver
    // buddy.js, EXPRESION_OBLIGATORIA), a la que se vuelve al terminar
    // un mensaje.
    expresionPorDefecto: 'sereno',

    // Fallback si una expresión todavía no declara anclas.cabeza_superior
    // (dato marcado TODO en planBuddy_v5.md hasta medirse a mano). Evita
    // que el globo se posicione en (0,0) mientras se completa esa medición.
    cabezaSuperiorFallback: { x: 0.4, y: 0.05 }
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
      '.buddy-says-bubble.is-promo{max-width:300px;pointer-events:auto;' +
      'user-select:text;}' +
      '.buddy-says-bubble.is-promo a{color:#0d6efd;text-decoration:underline;' +
      'pointer-events:auto;}';
    document.head.appendChild(style);
  }

  var bubbleEl = null;

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
    var anchorX = cabezaSuperior && typeof cabezaSuperior.x === 'number' ?
      cabezaSuperior.x : CONFIG.cabezaSuperiorFallback.x;
    var anchorY = cabezaSuperior && typeof cabezaSuperior.y === 'number' ?
      cabezaSuperior.y : CONFIG.cabezaSuperiorFallback.y;

    var faceX = rect.left + rect.width * anchorX;
    var faceY = rect.top + rect.height * anchorY;

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

  function showBubble(texto, opciones, datosExpresion) {
    ensureBubbleElement();
    if (opciones.html) {
      bubbleEl.innerHTML = texto;
    } else {
      bubbleEl.textContent = texto;
    }
    bubbleEl.classList.toggle('is-promo', !!opciones.promo);
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
  // fase04.md pide esta prioridad: 1) categoría del diccionario
  // (Buddy.resolveExpressionByCategory), 2) id directo de expresión
  // (Buddy.resolveExpression), 3) fallback 'sereno'. buddy.js (Fase 3) no
  // expone una forma de preguntar "¿esta clave es una categoría?" o
  // "¿esta expresión existe?" por separado: tanto resolveExpression como
  // resolveExpressionByCategory siempre devuelven algo, cayendo en
  // 'sereno' si no encuentran nada (falla "silenciosa" por diseño de la
  // Fase 3). Por eso la detección se hace comparando el archivo resuelto
  // contra el de 'sereno': si la categoría o el id directo devuelven un
  // archivo DISTINTO al de 'sereno', hubo una coincidencia real. Si
  // ambos coinciden con 'sereno', no había ni categoría ni expresión
  // válida y corresponde el fallback (que, si algún día una categoría
  // legítima apunta a 'sereno' — como diccionarioExpresiones.negativo
  // hoy — da el mismo resultado visual de todas formas).
  // -------------------------------------------------------------------
  function resolveExpresionParaEmocion(emocion) {
    if (!emocion) emocion = CONFIG.expresionPorDefecto;

    var serenoBase = window.Buddy.resolveExpression(CONFIG.expresionPorDefecto);
    var porCategoria = window.Buddy.resolveExpressionByCategory(emocion);
    var directa = window.Buddy.resolveExpression(emocion);

    if (porCategoria && serenoBase && porCategoria.archivo !== serenoBase.archivo) {
      return porCategoria;
    }
    if (directa && serenoBase && directa.archivo !== serenoBase.archivo) {
      return directa;
    }
    return serenoBase;
  }

  // -------------------------------------------------------------------
  // Estado interno mínimo: timer de ocultación + token de llamada (para
  // saber si, cuando vence durationMs, otro buddy_says() ya tomó el
  // control mientras tanto — en ese caso NO se restaura 'sereno', porque
  // ese llamado más nuevo es responsable de su propia restauración).
  // -------------------------------------------------------------------
  var bubbleTimer = null;
  var callToken = 0;

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

  function buddySays(texto, opciones) {
    opciones = opciones || {};
    var durationMs = getBubbleDurationMs(texto, opciones);

    var datosExpresion = resolveExpresionParaEmocion(opciones.emocion);
    if (!datosExpresion || !datosExpresion.archivo) {
      console.error(
        "[buddy_says] No se pudo resolver ninguna expresión (ni siquiera '" +
        CONFIG.expresionPorDefecto + "'). Revisar el archivo de datos del " +
        'personaje activo (window.BuddyChars).'
      );
      return;
    }

    // 1) cambia la cara mientras dura el mensaje.
    window.Buddy.showCharacterImage(datosExpresion);
    // 2) muestra el globo, anclado a cabeza_superior de esa expresión.
    showBubble(texto, opciones, datosExpresion);

    // Sustituye cualquier mensaje/timer anterior en curso (mismo criterio
    // que raulito.js: un nuevo llamado siempre gana).
    callToken++;
    var thisCall = callToken;
    if (bubbleTimer) clearTimeout(bubbleTimer);

    bubbleTimer = setTimeout(function () {
      bubbleTimer = null;
      // Si otro buddy_says() ya se ejecutó después de este, ese llamado
      // es dueño del estado actual: no pisar su globo ni su expresión.
      if (thisCall !== callToken) return;

      hideBubble();

      var serenoData = window.Buddy.resolveExpression(CONFIG.expresionPorDefecto);
      if (serenoData) {
        window.Buddy.showCharacterImage(serenoData);
      }
    }, durationMs);
  }


  // -------------------------------------------------------------------
  // Fase 8 — motor de fuentes
  // -------------------------------------------------------------------
  var SOURCES = window.BuddyInformSources = window.BuddyInformSources || {};

  // La configuración de qué fuentes participan pertenece a /says/config.js.
  // No se fija aquí para que el sitio pueda activar/desactivar fuentes y
  // cambiar su estrategia sin modificar el motor.
  var configuredSources = window.BuddySaysConfig && Array.isArray(window.BuddySaysConfig.sources) ?
    window.BuddySaysConfig.sources : [];

  var SOURCES_CONFIG = configuredSources.filter(function (item) {
    return item && item.enabled !== false && item.id;
  }).map(function (item) {
    return {
      id: String(item.id),
      recurrencia: item.recurrencia != null ? item.recurrencia : (item.recurrence != null ? item.recurrence : 1),
      frecuencia: item.frecuencia || item.frequency || { min: 0, max: 0 },
      seleccion: item.seleccion || item.selection || 'sequential'
    };
  });

  var sourceStates = {};
  var sourceEngineStarted = false;
  var sourceEngineTimer = null;
  var SOURCE_STORAGE_KEY = 'buddy.says.fase08.recurrencia.v1';

  function debugSource() {
    if (window.BUDDY_SAYS_DEBUG && window.console && console.log) {
      console.log.apply(console, arguments);
    }
  }

  function warnSource() {
    if (window.console && console.warn) {
      console.warn.apply(console, arguments);
    }
  }

  function todayKey() {
    var now = new Date();
    return now.getFullYear() + '-' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
      ('0' + now.getDate()).slice(-2);
  }

  function readRecurrenceStore() {
    var empty = { fecha: todayKey(), mensajes: {} };
    try {
      var raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
      if (!raw) return empty;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.fecha !== todayKey() || !parsed.mensajes ||
          typeof parsed.mensajes !== 'object') {
        return empty;
      }
      return parsed;
    } catch (e) {
      return empty;
    }
  }

  function writeRecurrenceStore(store) {
    try {
      window.localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      // localStorage puede estar bloqueado; la sesión sigue funcionando.
    }
  }

  var recurrenceStore = readRecurrenceStore();

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

  function getMessageId(sourceId, message) {
    if (message && typeof message === 'object' && message.id !== undefined &&
        message.id !== null && String(message.id).trim() !== '') {
      return sourceId + ':' + String(message.id).trim();
    }
    return sourceId + ':' + stableHash(getMessageText(message));
  }

  function getMessageEmotion(message) {
    if (message && typeof message === 'object' && typeof message.emocion === 'string') {
      return message.emocion;
    }
    return CONFIG.expresionPorDefecto;
  }

  function normalizeMessages(sourceId, messages) {
    if (!Array.isArray(messages)) return [];
    return messages.map(function (message) {
      var texto = getMessageText(message);
      if (!texto) return null;
      return {
        id: getMessageId(sourceId, message),
        texto: texto,
        emocion: getMessageEmotion(message),
        original: message
      };
    }).filter(Boolean);
  }

  function randomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    if (max <= min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function intervalMs(config) {
    var min = Math.max(0, Number(config.frecuencia.min) || 0);
    var max = Math.max(min, Number(config.frecuencia.max) || min);
    var minutes = randomIntInclusive(min, max);
    return minutes * 60 * 1000;
  }

  function isBubbleVisible() {
    return !!(bubbleEl && bubbleEl.classList.contains('is-visible'));
  }

  function isSystemBusy() {
    if (window.Buddy && typeof window.Buddy.isBusy === 'function') {
      try {
        return !!window.Buddy.isBusy();
      } catch (e) {
        // Buddy.isBusy() ya aplica una política conservadora internamente.
        // Si la API falla por completo, tampoco interrumpimos al usuario.
        warnSource('[buddy_says] Buddy.isBusy() lanzó una excepción; se considera ocupado.');
        return true;
      }
    }

    // Compatibilidad defensiva durante cargas anómalas: si la API común aún
    // no existe, no se permite una interrupción automática. No se conoce
    // ningún módulo concreto aquí (archery, u otro futuro).
    return true;
  }

  function canSpeakPolitely() {
    return !isBubbleVisible() && !isSystemBusy();
  }

  function recurrenceCount(messageId) {
    return Number(recurrenceStore.mensajes[messageId] || 0);
  }

  function canUseMessage(state, message) {
    var max = Math.max(1, Number(state.config.recurrencia) || 1);
    return recurrenceCount(message.id) < max;
  }

  function markMessageUsed(message) {
    recurrenceStore.mensajes[message.id] = recurrenceCount(message.id) + 1;
    writeRecurrenceStore(recurrenceStore);
  }

  function selectMessage(state) {
    var available = state.messages.filter(function (message) {
      return canUseMessage(state, message);
    });

    if (!available.length) return null;

    var selectionMode = String(state.config.seleccion || 'sequential').toLowerCase();
    if (selectionMode === 'aleatoria' || selectionMode === 'aleatorio' ||
        selectionMode === 'shuffle' || selectionMode === 'random') {
      // Evita repetir inmediatamente cuando hay más de una opción.
      var pool = available;
      if (pool.length > 1 && state.lastMessageId) {
        pool = pool.filter(function (message) {
          return message.id !== state.lastMessageId;
        });
        if (!pool.length) pool = available;
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }

    for (var i = 0; i < state.messages.length; i++) {
      var index = (state.nextIndex + i) % state.messages.length;
      var candidate = state.messages[index];
      if (canUseMessage(state, candidate)) {
        state.nextIndex = (index + 1) % state.messages.length;
        return candidate;
      }
    }

    return null;
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
      // Una fuente puede ser un array directo o un proveedor con
      // obtenerMensajes(). Los dos formatos son deliberadamente válidos.
      if (Array.isArray(source)) return source;
      if (typeof source.obtenerMensajes === 'function') {
        return source.obtenerMensajes();
      }
      throw new Error('Formato de fuente no válido: ' + state.config.id);
    }).then(function (messages) {
      state.messages = normalizeMessages(state.config.id, messages);
      state.error = null;
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

  function scheduleState(state, delay) {
    state.nextAt = Date.now() + Math.max(0, delay);
  }

  function getNextDelay() {
    var now = Date.now();
    var delay = 60 * 1000;
    Object.keys(sourceStates).forEach(function (id) {
      var state = sourceStates[id];
      if (!state.nextAt) return;
      delay = Math.min(delay, Math.max(0, state.nextAt - now));
    });
    return Math.max(250, delay);
  }

  function scheduleEngine() {
    if (!sourceEngineStarted) return;
    if (sourceEngineTimer) clearTimeout(sourceEngineTimer);
    sourceEngineTimer = setTimeout(runSourceEngine, getNextDelay());
  }

  function attemptSource(state) {
    if (state.loading || !state.messages.length) {
      scheduleState(state, intervalMs(state.config));
      return;
    }

    if (!canSpeakPolitely()) {
      // El mensaje no se consume ni se marca como usado. Se reintenta
      // pronto, sin crear un busy-loop y sin interferir con archery.
      state.pending = true;
      scheduleState(state, 30 * 1000);
      debugSource('[BUDDY SAYS] mensaje aplazado:', state.config.id);
      return;
    }

    var message = selectMessage(state);
    if (!message) {
      // Todos los mensajes alcanzaron la recurrencia diaria.
      state.pending = false;
      scheduleState(state, 60 * 60 * 1000);
      return;
    }

    state.pending = false;
    state.lastMessageId = message.id;
    markMessageUsed(message);

    buddySays(message.texto, {
      emocion: message.emocion,
      // Sin durationMs: el núcleo calcula automáticamente el tiempo según
      // el largo del mensaje.
    });

    debugSource('[BUDDY SAYS] mensaje mostrado:', state.config.id, message.id);
    scheduleState(state, intervalMs(state.config));
  }

  function runSourceEngine() {
    sourceEngineTimer = null;
    if (!sourceEngineStarted) return;

    Object.keys(sourceStates).forEach(function (id) {
      var state = sourceStates[id];
      if (state.nextAt && Date.now() >= state.nextAt) {
        attemptSource(state);
      }
    });

    scheduleEngine();
  }

  function initializeSourceEngine() {
    if (sourceEngineStarted) return;
    sourceEngineStarted = true;

    SOURCES_CONFIG.forEach(function (config) {
      sourceStates[config.id] = {
        config: config,
        messages: [],
        nextIndex: 0,
        // El primer mensaje no espera el intervalo de frecuencia:
        // al cargar Buddy, si alguna fuente tiene algo elegible que decir,
        // debe hablar inmediatamente.
        nextAt: 0,
        lastMessageId: null,
        pending: false,
        loading: false,
        error: null
      };
    });

    var loads = Object.keys(sourceStates).map(function (id) {
      return loadSource(sourceStates[id]);
    });

    Promise.all(loads).then(function () {
      var spokeImmediately = false;

      // Se respeta el orden declarado en /says/config.js: la primera fuente
      // que tenga un mensaje elegible gana el primer turno de Buddy.
      Object.keys(sourceStates).some(function (id) {
        var state = sourceStates[id];
        if (!state.messages.length || !canSpeakPolitely()) return false;

        var message = selectMessage(state);
        if (!message) return false;

        state.pending = false;
        state.lastMessageId = message.id;
        markMessageUsed(message);

        buddySays(message.texto, {
          emocion: message.emocion
        });

        debugSource('[BUDDY SAYS] mensaje inicial mostrado:', state.config.id, message.id);

        // Este medio vuelve a entrar en su frecuencia normal después del
        // mensaje inicial. Las demás fuentes conservan su primer intento
        // para después, evitando dos globos simultáneos al cargar.
        scheduleState(state, intervalMs(state.config));
        spokeImmediately = true;
        return true;
      });

      // Si ninguna fuente tuvo nada que decir al cargar, no se fuerza ningún
      // globo. El usuario puede invocar a Buddy mediante el triple click del
      // módulo que lo tenga habilitado.
      Object.keys(sourceStates).forEach(function (id) {
        var state = sourceStates[id];
        if (!state.nextAt) {
          scheduleState(state, intervalMs(state.config));
        } else if (spokeImmediately && !state.lastMessageId) {
          // Las fuentes que no ganaron el turno inicial conservan su
          // frecuencia normal desde la carga.
          scheduleState(state, intervalMs(state.config));
        }
      });

      scheduleEngine();
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

  window.Buddy.says = {
    config: SOURCES_CONFIG,
    decirSiLibre: decirSiLibre,
    estaOcupado: isSystemBusy,
    iniciarFuentes: initializeSourceEngine,
    _sources: SOURCES,
    _state: sourceStates,
    _recurrenceKey: SOURCE_STORAGE_KEY,
    tieneAlgoQueDecir: function () {
      return Object.keys(sourceStates).some(function (id) {
        var state = sourceStates[id];
        return !!(state && state.messages && state.messages.some(function (message) {
          return canUseMessage(state, message);
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

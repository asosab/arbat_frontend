/**
 * assets/buddy/modules/says/buddy_says.js
 * ---------------------------------------------------------------------------
 * Fase 4 del plan de separación de raulito.js (ver planBuddy_v5.md, sección
 * 4.4 y 4.4.1; prompt de ejecución en fase04.md).
 *
 * Esta es una versión PARCIAL de buddy_says.js: solo el NÚCLEO de
 * comunicación por globo (bubble + cambio de expresión). NO incluye
 * todavía el motor de fuentes (recurrencia, frecuencia, medios registrados
 * en modules/says/sources/, window.Buddy.says, decirSiLibre/estaOcupado) —
 * eso corresponde a la Fase 8.
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

  function buddySays(texto, opciones) {
    opciones = opciones || {};
    var durationMs = typeof opciones.durationMs === 'number' ?
      opciones.durationMs : CONFIG.bubbleDisplayMs;

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

  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  window.buddy_says = buddySays;
})();

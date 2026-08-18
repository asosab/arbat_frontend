/**
 * assets/buddy/buddy.js
 * ---------------------------------------------------------------------------
 * 
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function () {
  'use strict';

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy]');
    console.log.apply(console, args);
  }

  // -------------------------------------------------------------------
  // Config de rutas base. Puede sobreescribirse antes de cargar este
  // script definiendo window.BUDDY_ASSET_BASE (mismo criterio que
  // window.RAULITO_ASSET_BASE en raulito.js).
  // -------------------------------------------------------------------
  var entryScript = getEntryScript();

  // Cache-busting: la versión se toma del propio buddy.js que invoca la página.
  // Ejemplo: buddy.js?v=3 -> todos los .js cargados dinámicamente usan ?v=3.
  // Así no es necesario modificar este archivo en cada versión de prueba.
  var BUDDY_VERSION = (function () {
    if (!entryScript || !entryScript.src) return '';

    try {
      return new URL(entryScript.src, document.baseURI).searchParams.get('v') || '';
    } catch (err) {
      return '';
    }
  })();

  function withBuddyVersion(url) {
    if (!BUDDY_VERSION) return url;

    try {
      var parsed = new URL(url, document.baseURI);
      parsed.searchParams.set('v', BUDDY_VERSION);
      return parsed.href;
    } catch (err) {
      var separator = url.indexOf('?') === -1 ? '?' : '&';
      return url + separator + 'v=' + encodeURIComponent(BUDDY_VERSION);
    }
  }

  var ASSET_BASE = (function () {
    // Si se define explícitamente, respetarlo. Puede ser absoluto o
    // relativo al documento que contiene Buddy.
    if (window.BUDDY_ASSET_BASE) {
      var base = new URL(window.BUDDY_ASSET_BASE, document.baseURI).href;
      return base.charAt(base.length - 1) === '/' ? base : base + '/';
    }

    // Por defecto, Buddy se auto-localiza a partir de la URL de buddy.js.
    // Esto permite instalarlo bajo /arbat_frontend/, en otro subdirectorio
    // o en otro sitio sin cambiar las rutas de sus módulos/assets.
    if (entryScript && entryScript.src) {
      return new URL('./', entryScript.src).href;
    }

    throw new Error('[BUDDY] No se pudo determinar la ubicación de buddy.js');
  })();

  // Reglas de tamaño/posición del personaje en pantalla. Valores tomados
  // sin modificar de raulito.js (CONFIG.characterLongSidePercent,
  // CONFIG.characterMarginPx, CONFIG.characterAnchorRightPercent).
  var LAYOUT = {
    characterLongSidePercent: 0.45,
    characterMarginPx: 16,
    characterAnchorRightPercent: 0.15
  };

  // Expresión obligatoria de cualquier personaje (ver planBuddy_v5.md,
  // sección 2): única con fallback garantizado.
  var EXPRESION_OBLIGATORIA = 'sereno';

  // -------------------------------------------------------------------
  // Personaje activo. Se determina en Fase 6 leyendo data-buddy-character
  // del <script> de entrada, antes de cargar cualquier módulo dependiente.
  // -------------------------------------------------------------------
  var personajeActivo = null;
  var modulosActivos = [];
  var ready = false;
  var readyPromise = null;

  // -------------------------------------------------------------------
  // Política común de ocupado (Fase 10).
  // Cada módulo puede registrar un proveedor propio; Buddy combina todos
  // los proveedores con el estado de visibilidad del documento/ventana.
  // Ante cualquier duda o error se adopta el comportamiento conservador:
  // considerar ocupado para no interrumpir al usuario.
  // -------------------------------------------------------------------
  var busyProviders = {};

  function registerBusyProvider(modulo, provider) {
    var id = String(modulo || '').trim();
    if (!id || typeof provider !== 'function') {
      throw new TypeError('[BUDDY] registerBusyProvider requiere un modulo y una función.');
    }
    busyProviders[id] = provider;
  }

  function isVisibilityBusy() {
    try {
      if (typeof document === 'undefined') return true;

      // Si el documento no está visible, el usuario no puede recibir de forma
      // efectiva un mensaje dirigido al buddy.
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return true;
      }
      if (document.hidden === true) return true;

      // hasFocus() es la señal estándar disponible para saber si la ventana
      // que contiene el documento está activa. También cubre, de forma
      // conservadora, una ventana que perdió el foco (incluida una posible
      // minimización). El navegador no ofrece una API web universal que
      // permita distinguir con certeza "minimizada" de "sin foco".
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        return true;
      }
    } catch (err) {
      return true;
    }

    return false;
  }

  function isBusy() {
    if (isVisibilityBusy()) return true;

    var ids = Object.keys(busyProviders);
    for (var i = 0; i < ids.length; i += 1) {
      try {
        if (busyProviders[ids[i]]()) return true;
      } catch (err) {
        console.warn('[BUDDY] El proveedor de ocupado "' + ids[i] + '" lanzó una excepción; se considera ocupado.', err);
        return true;
      }
    }

    return false;
  }

  function getCharData() {
    return (window.BuddyChars && window.BuddyChars[personajeActivo]) || null;
  }

  // ---------------------------------------------------------------------
  // Construcción de rutas
  // ---------------------------------------------------------------------
  function charPath(tipoAsset, subfolder, archivo) {
    return ASSET_BASE + 'chars/' + personajeActivo + '/' + tipoAsset + '/' + subfolder + '/' + archivo;
  }

  // Ruta por defecto de un asset de módulo (sin override de personaje).
  // El plan (sección 4.2) lista los defaults de archery como rutas de
  // archivo fijas (modules/archery/images/diana.png, .../sounds/disparar.mp3,
  // etc.), no como objetos con metadata — de ahí la extensión asumida por
  // tipoAsset (.png para images, .mp3 para sounds), consistente con esa
  // lista. buddy_archery.js (fase posterior) es quien efectivamente puebla
  // estos archivos; acá solo se arma la ruta convencional.
  function moduleDefaultPath(modulo, tipoAsset, clave) {
    var ext = tipoAsset === 'sounds' ? '.mp3' : '.png';
    return ASSET_BASE + 'modules/' + modulo + '/' + tipoAsset + '/' + clave + ext;
  }

  // ---------------------------------------------------------------------
  // resolveAsset(modulo, tipoAsset, clave)
  // Precedencia: override del personaje activo -> default del módulo.
  // ---------------------------------------------------------------------
  // Resuelve exclusivamente el asset por defecto del módulo, sin consultar
  // overrides del personaje. Los módulos pueden usar esta API cuando su
  // configuración declara prioridad sobre los recursos del personaje.
  function resolveAssetDefault(modulo, tipoAsset, clave) {
    if (tipoAsset === 'sounds') {
      return moduleDefaultPath(modulo, 'sounds', clave);
    }
    return {
      archivo: moduleDefaultPath(modulo, 'images', clave),
      ancho: undefined,
      alto: undefined,
      escala: undefined,
      anclas: undefined
    };
  }

  // Indica si el personaje activo declara explícitamente un override
  // para este asset. No considera el default del módulo como override.
  function hasAssetOverride(modulo, tipoAsset, clave) {
    var charData = getCharData();
    var moduleOverrides = charData &&
      charData.overridesPorModulo &&
      charData.overridesPorModulo[modulo] &&
      charData.overridesPorModulo[modulo][tipoAsset];
    if (!moduleOverrides) return false;

    if (moduleOverrides[clave] !== undefined && moduleOverrides[clave] !== null) {
      return true;
    }

    return Object.keys(moduleOverrides).some(function (collectionKey) {
      var collection = moduleOverrides[collectionKey];
      if (!Array.isArray(collection)) return false;
      return collection.some(function (item) {
        return typeof item === 'string' && item.replace(/\.[^.]+$/, '') === clave;
      });
    });
  }

  function resolveAsset(modulo, tipoAsset, clave) {
    var charData = getCharData();
    var overrideEntry = charData &&
      charData.overridesPorModulo &&
      charData.overridesPorModulo[modulo] &&
      charData.overridesPorModulo[modulo][tipoAsset] &&
      charData.overridesPorModulo[modulo][tipoAsset][clave];

    // Compatibilidad con overrides declarados como colecciones (por ejemplo
    // archery.images.flechas = ['flecha01.png', ...]). La API pública sigue
    // siendo resolveAsset(modulo, tipoAsset, clave): se busca dentro de
    // cualquier colección el archivo cuyo nombre base coincide con `clave`.
    if (overrideEntry === undefined || overrideEntry === null) {
      var moduleOverrides = charData &&
        charData.overridesPorModulo &&
        charData.overridesPorModulo[modulo] &&
        charData.overridesPorModulo[modulo][tipoAsset];

      if (moduleOverrides) {
        Object.keys(moduleOverrides).some(function (collectionKey) {
          var collection = moduleOverrides[collectionKey];
          if (!Array.isArray(collection)) return false;

          for (var i = 0; i < collection.length; i++) {
            var item = collection[i];
            if (typeof item !== 'string') continue;
            var baseName = item.replace(/\\.[^.]+$/, '');
            if (baseName === clave) {
              overrideEntry = item;
              return true;
            }
          }
          return false;
        });
      }
    }

    if (overrideEntry !== undefined && overrideEntry !== null) {
      if (tipoAsset === 'sounds') {
        // Para sonidos, el override es directamente el nombre de archivo
        // (ver buddy_char_Raulito.js: sounds.disparar = 'disparar.mp3').
        return charPath('sounds', modulo, overrideEntry);
      }
      // Para imágenes, el override puede ser el objeto con metadata
      // habitual o un nombre de archivo proveniente de una colección.
      if (typeof overrideEntry === 'string') {
        return {
          archivo: charPath('images', modulo, overrideEntry),
          ancho: undefined,
          alto: undefined,
          escala: undefined,
          anclas: undefined
        };
      }

      return {
        archivo: charPath('images', modulo, overrideEntry.archivo),
        ancho: overrideEntry.ancho,
        alto: overrideEntry.alto,
        escala: overrideEntry.escala,
        anclas: overrideEntry.anclas
      };
    }

    // Sin override: cae al default del módulo.
    if (tipoAsset === 'sounds') {
      return moduleDefaultPath(modulo, 'sounds', clave);
    }
    return {
      archivo: moduleDefaultPath(modulo, 'images', clave),
      ancho: undefined,
      alto: undefined,
      escala: undefined,
      anclas: undefined
    };
  }

  // ---------------------------------------------------------------------
  // resolveExpression(expresionId)
  // Exclusivo del personaje activo. Sin fallback hacia ningún módulo.
  // ---------------------------------------------------------------------
  // ---------------------------------------------------------------------
  // resolveExpressionExact(expresionId)
  // Resuelve SOLO una expresión explícitamente declarada por el personaje.
  // No hace fallback: esto permite distinguir una expresión inexistente de
  // una expresión válida que casualmente use la misma imagen que 'sereno'.
  // ---------------------------------------------------------------------
  function resolveExpressionExact(expresionId) {
    var charData = getCharData();
    if (!charData || !charData.expresiones || !expresionId) return null;

    var entry = charData.expresiones[expresionId];
    if (!entry) return null;

    return {
      archivo: charPath('images', 'expresiones', entry.archivo),
      ancho: entry.ancho,
      alto: entry.alto,
      escala: entry.escala,
      anclas: entry.anclas
    };
  }

  // ---------------------------------------------------------------------
  // resolveExpression(expresionId)
  // API compatible con el comportamiento anterior: intenta la expresión
  // exacta y, si no existe, cae en la expresión obligatoria (sereno).
  // ---------------------------------------------------------------------
  function resolveExpression(expresionId) {
    var exacta = resolveExpressionExact(expresionId);
    if (exacta) return exacta;
    return resolveExpressionExact(EXPRESION_OBLIGATORIA);
  }

  // ---------------------------------------------------------------------
  // resolveExpressionByCategory(categoria)
  // Resuelve SOLO categorías realmente declaradas en el diccionario.
  // ---------------------------------------------------------------------
  function resolveExpressionByCategory(categoria) {
    var charData = getCharData();
    var diccionario = charData && charData.diccionarioExpresiones;
    if (!diccionario || !categoria) return null;

    var expresionId = diccionario[categoria];
    if (!expresionId) return null;

    return resolveExpressionExact(expresionId);
  }

  // ---------------------------------------------------------------------
  // resolveScenario(escenarioId)
  // Sin fallback obligatorio: si no existe, no hay escenario.
  // ---------------------------------------------------------------------
  function resolveScenario(escenarioId) {
    var charData = getCharData();
    var entry = charData && charData.escenarios && charData.escenarios[escenarioId];
    if (!entry) return null;

    return {
      archivo: charPath('images', 'escenario', entry.archivo),
      ancho: entry.ancho,
      alto: entry.alto
    };
  }

  // ---------------------------------------------------------------------
  // Utilidades de tamaño (trasladadas de raulito.js sin cambiar la
  // matemática — ver comentario de cabecera del archivo).
  // ---------------------------------------------------------------------
  function screenLongSide() {
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

  // Antes: characterTargetPx(poseKey) leía CONFIG.scales.character[poseKey].
  // Ahora recibe directamente `escala` del objeto ya resuelto.
  function characterTargetPx(escala) {
    var scale = typeof escala === 'number' ? escala : 1;
    return LAYOUT.characterLongSidePercent * screenLongSide() * scale;
  }

  // Las coordenadas de `anclas` son coordenadas ABSOLUTAS en píxeles
  // dentro del archivo original de la imagen (0,0 = esquina superior
  // izquierda). Como la imagen se redimensiona para adaptarse al viewport,
  // primero hay que transformar esos píxeles originales a píxeles renderizados.
  //
  // Ejemplo:
  //   imagen original: 848 x 1264
  //   ancla cintura:   x=512, y=737
  //   imagen renderizada: 699 x 1041
  //   ancla renderizada: x=422, y=607
  //
  // Esto evita tratar x/y como porcentajes o ratios. También hace que las
  // coordenadas sigan siendo correctas cuando cambia el tamaño/orientación
  // del viewport.
  function imageAnchorToRenderedPx(datosImagen, anchor, renderedWidth, renderedHeight) {
    if (!datosImagen || !anchor ||
        typeof anchor.x !== 'number' || typeof anchor.y !== 'number') {
      return null;
    }

    var sourceWidth = Number(datosImagen.ancho);
    var sourceHeight = Number(datosImagen.alto);

    if (!sourceWidth || !sourceHeight ||
        !isFinite(sourceWidth) || !isFinite(sourceHeight)) {
      return null;
    }

    return {
      x: anchor.x * renderedWidth / sourceWidth,
      y: anchor.y * renderedHeight / sourceHeight
    };
  }

  function characterAnchorTargetPx() {
    return LAYOUT.characterAnchorRightPercent * screenLongSide();
  }

  function characterBottomOffsetPx(datosImagen, renderedHeightPx, renderedWidthPx) {
    var anchor = datosImagen && datosImagen.anclas && datosImagen.anclas.cintura;
    var renderedAnchor = imageAnchorToRenderedPx(
      datosImagen,
      anchor,
      renderedWidthPx,
      renderedHeightPx
    );

    if (!renderedAnchor) {
      // Fallback para assets antiguos que no tengan dimensiones/anclas.
      renderedAnchor = {
        x: renderedWidthPx * 0.5,
        y: renderedHeightPx * 0.5
      };
    }

    // `bottom` se mide desde el borde inferior del viewport. Queremos que
    // el punto absoluto de la imagen quede sobre la línea de referencia.
    return LAYOUT.characterMarginPx -
      (renderedHeightPx - renderedAnchor.y);
  }

  function characterRightOffsetPx(datosImagen, renderedWidthPx, renderedHeightPx) {
    var anchor = datosImagen && datosImagen.anclas && datosImagen.anclas.cintura;
    var renderedAnchor = imageAnchorToRenderedPx(
      datosImagen,
      anchor,
      renderedWidthPx,
      renderedHeightPx
    );

    if (!renderedAnchor) {
      // Fallback para assets antiguos que no tengan dimensiones/anclas.
      renderedAnchor = {
        x: renderedWidthPx * 0.5,
        y: renderedHeightPx * 0.5
      };
    }

    // `right` se mide desde el borde derecho del viewport. Si el ancla está
    // a renderedAnchor.x desde la izquierda de la imagen, quedan
    // (renderedWidth - renderedAnchor.x) píxeles a su derecha.
    return characterAnchorTargetPx() -
      (renderedWidthPx - renderedAnchor.x);
  }

  function positionCharacter(datosImagen) {
    if (!charEl) return;
    var renderedHeight = charEl.offsetHeight;
    var renderedWidth = charEl.offsetWidth;
    if (!renderedHeight || !renderedWidth) return;

    charEl.style.bottom = characterBottomOffsetPx(
      datosImagen,
      renderedHeight,
      renderedWidth
    ) + 'px';

    charEl.style.right = characterRightOffsetPx(
      datosImagen,
      renderedWidth,
      renderedHeight
    ) + 'px';
  }

  // ---------------------------------------------------------------------
  // Elemento DOM del personaje — #buddy-character (único, creado una sola
  // vez; ver raulito.js ensureElements()/charEl para la referencia de
  // estilos trasladados).
  // ---------------------------------------------------------------------
  var charEl = null;
  var lastDatosImagen = null; // último dato de imagen mostrado, para el resize

  function ensureCharacterElement() {
    if (charEl) return charEl;

    charEl = document.createElement('img');
    charEl.id = 'buddy-character';
    charEl.alt = (getCharData() && getCharData().perfil && getCharData().perfil.nombre) || 'buddy';
    charEl.draggable = false;
    Object.assign(charEl.style, {
      position: 'fixed',
      right: LAYOUT.characterMarginPx + 'px',
      bottom: LAYOUT.characterMarginPx + 'px',
      zIndex: '9999',
      touchAction: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
      webkitTouchCallout: 'none',
      cursor: 'pointer',
      display: 'none'
    });
    charEl.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
    charEl.addEventListener('load', function () {
      fitLongSide(charEl, characterTargetPx(lastDatosImagen && lastDatosImagen.escala));
      positionCharacter(lastDatosImagen);
    });

    document.body.appendChild(charEl);
    window.addEventListener('resize', onResize);

    return charEl;
  }

  function onResize() {
    if (charEl && charEl.style.display !== 'none' && lastDatosImagen) {
      fitLongSide(charEl, characterTargetPx(lastDatosImagen.escala));
      positionCharacter(lastDatosImagen);
    }
  }

  // ---------------------------------------------------------------------
  // showCharacterImage(datosImagen)
  // datosImagen: { archivo, ancho, alto, escala, anclas } — misma forma
  // que devuelven resolveAsset/resolveExpression/resolveExpressionByCategory.
  // ---------------------------------------------------------------------
  function showCharacterImage(datosImagen) {
    if (!datosImagen || !datosImagen.archivo) return;

    ensureCharacterElement();
    lastDatosImagen = datosImagen;
    var wasHidden = charEl.style.display === 'none';
    charEl.style.display = 'block';
    charEl.src = datosImagen.archivo;

    // Una vez que cualquier parte de Buddy hace visible al personaje,
    // todos los módulos activos deben poder sincronizar su propio estado
    // interno con esa visibilidad. No limitamos el evento a la transición
    // CSS hidden -> visible: un módulo puede haber quedado en estado
    // 'hidden' aunque la imagen ya esté visible (por ejemplo, después de
    // una recarga o una restauración iniciada por Says).
    // Los módulos se suscriben a este evento sin que el núcleo tenga que
    // conocer implementaciones concretas como archery.
    try {
      window.dispatchEvent(new CustomEvent('buddy:character-visible', {
        detail: {
          character: personajeActivo,
          abilities: modulosActivos.slice(),
          wasHidden: wasHidden
        }
      }));
    } catch (e) {
      // Compatibilidad con entornos antiguos: la visibilidad del personaje
      // no debe fallar por un problema al emitir el evento.
    }

    // Si la imagen ya estaba cargada (misma src), 'load' no vuelve a
    // disparar — se fuerza el ajuste igual, mismo criterio que
    // showPose() en raulito.js.
    if (charEl.complete) {
      fitLongSide(charEl, characterTargetPx(datosImagen.escala));
      positionCharacter(datosImagen);
    }
  }

  // ---------------------------------------------------------------------
  // Orquestador de carga — Fase 6.
  // Lee la configuración del <script> de entrada y carga, en orden:
  // personaje -> says -> texto de says -> módulos -> texto de módulos.
  // ---------------------------------------------------------------------
  function getEntryScript() {
    if (document.currentScript && /(?:^|\/)buddy\.js(?:[?#]|$)/.test(document.currentScript.src || '')) {
      return document.currentScript;
    }

    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src') || '';
      if (/(?:^|\/)buddy\.js(?:[?#]|$)/.test(src)) return scripts[i];
    }
    return null;
  }

  function parseAbilities(value) {
    if (!value) return [];
    return String(value)
      .split(/[\s,]+/)
      .map(function (item) { return item.trim().toLowerCase(); })
      .filter(Boolean)
      .filter(function (item, index, array) { return array.indexOf(item) === index; });
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      // La versión del script de entrada se propaga a cada JS dinámico antes
      // de comparar/cargar, para que cada versión sea una identidad distinta.
      url = withBuddyVersion(url);

      // Evita cargar dos veces el mismo recurso si el layout ya lo incluyera
      // accidentalmente durante una transición.
      var existing = null;
      var loadedScripts = document.getElementsByTagName('script');
      for (var i = 0; i < loadedScripts.length; i++) {
        if (loadedScripts[i].getAttribute('data-buddy-loaded-src') === url) {
          existing = loadedScripts[i];
          break;
        }
      }
      if (existing) {
        if (existing.dataset.buddyLoadState === 'loaded') {
          resolve();
          return;
        }
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () {
          reject(new Error('No se pudo cargar ' + url));
        }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.dataset.buddyLoadedSrc = url;
      script.dataset.buddyLoadState = 'loading';
      script.onload = function () {
        script.dataset.buddyLoadState = 'loaded';
        resolve();
      };
      script.onerror = function () {
        script.dataset.buddyLoadState = 'error';
        reject(new Error('No se pudo cargar ' + url));
      };
      document.head.appendChild(script);
    });
  }

  function loadOptionalScript(url) {
    return loadScript(url).catch(function (error) {
      debugLog('No se pudo cargar un módulo opcional:', url, error);
      return undefined;
    });
  }

  function characterScriptName(characterId) {
    return characterId.charAt(0).toUpperCase() + characterId.slice(1);
  }

  function scriptUrlForCharacter(characterId) {
    return ASSET_BASE + 'chars/' + characterId + '/buddy_char_' +
      characterScriptName(characterId) + '.js';
  }

  function scriptUrlForSays(locale, style) {
    return ASSET_BASE + 'modules/says/' + locale + '/buddy_says_' + style + '.js';
  }

  function scriptUrlForSaysSource(sourceId) {
    return ASSET_BASE + 'modules/says/sources/' + sourceId + '.js';
  }

  function loadSaysSources() {
    var configured = window.BuddySaysConfig && Array.isArray(window.BuddySaysConfig.sources) ?
      window.BuddySaysConfig.sources : [];
    var sources = configured.filter(function (item) {
      return item && item.enabled !== false && item.id;
    }).map(function (item) {
      return String(item.id);
    });

    return sources.reduce(function (chain, sourceId) {
      return chain.then(function () {
        return loadScript(scriptUrlForSaysSource(sourceId)).catch(function (error) {
          // Una fuente opcional no debe impedir que Says, Chat u otros
          // módulos se inicialicen. La propia fuente puede exponer su API
          // pública cuando está disponible; si no existe, Chat podrá
          // detectar esa ausencia y responder con el mensaje de agenda
          // desactivada/no configurada.
          console.warn('[BUDDY] No se pudo cargar la fuente de says "' + sourceId + '". Se continuará sin ella.', error);
        });
      });
    }, Promise.resolve());
  }

  function scriptUrlForModule(moduleId) {
    return ASSET_BASE + 'modules/' + moduleId + '/buddy_' + moduleId + '.js';
  }

  // Cada módulo puede tener su propia configuración. Se carga ANTES de la
  // implementación del módulo para que buddy_<modulo>.js pueda consumirla
  // durante su inicialización.
  function scriptUrlForModuleConfig(moduleId) {
    return ASSET_BASE + 'modules/' + moduleId + '/config.js';
  }

  function scriptUrlForModuleText(moduleId, locale, style) {
    return ASSET_BASE + 'modules/' + moduleId + '/' + locale +
      '/buddy_' + moduleId + '_' + style + '.js';
  }

  // Chat es un módulo global de entrada (teclado, URL y API), por lo que no
  // depende de data-buddy-abilities. Su propio config.js decide si queda
  // habilitado para esta página.
  function loadChatModule() {
    return loadScript(ASSET_BASE + 'modules/chat/config.js')
      .then(function () {
        if (!window.BuddyChatConfig || window.BuddyChatConfig.enabled === false) {
          return undefined;
        }
        return loadScript(ASSET_BASE + 'modules/chat/buddy_chat.js');
      });
  }

  function preloadImage(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve({ ok: true, url: url }); };
      img.onerror = function () {
        console.warn('[BUDDY] No se pudo precargar imagen:', url);
        resolve({ ok: false, url: url });
      };
      img.src = url;
    });
  }

  function preloadAudio(url) {
    return new Promise(function (resolve) {
      var audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.oncanplaythrough = function () { resolve({ ok: true, url: url }); };
      audio.onerror = function () {
        console.warn('[BUDDY] No se pudo precargar sonido:', url);
        resolve({ ok: false, url: url });
      };
      audio.src = url;
      audio.load();
    });
  }

  function preloadCharacterAssets() {
    var charData = getCharData();
    if (!charData) return Promise.resolve();

    var jobs = [];
    var expressions = charData.expresiones || {};
    Object.keys(expressions).forEach(function (key) {
      var entry = expressions[key];
      if (entry && entry.archivo && typeof entry.archivo === 'string') {
        jobs.push(preloadImage(charPath('images', 'expresiones', entry.archivo)));
      }
    });

    // Los overrides de módulo pertenecen al personaje y por eso también se
    // precargan aquí. Los defaults del módulo se completan al cargar cada
    // habilidad.
    var overrides = charData.overridesPorModulo || {};
    Object.keys(overrides).forEach(function (moduleId) {
      var moduleOverrides = overrides[moduleId] || {};
      var images = moduleOverrides.images || {};
      Object.keys(images).forEach(function (key) {
        var entry = images[key];
        if (Array.isArray(entry)) {
          entry.forEach(function (file) {
            if (typeof file === 'string') jobs.push(preloadImage(charPath('images', moduleId, file)));
          });
        } else if (entry && typeof entry === 'object' && entry.archivo) {
          jobs.push(preloadImage(charPath('images', moduleId, entry.archivo)));
        } else if (typeof entry === 'string') {
          jobs.push(preloadImage(charPath('images', moduleId, entry)));
        }
      });
      var sounds = moduleOverrides.sounds || {};
      Object.keys(sounds).forEach(function (key) {
        var file = sounds[key];
        if (typeof file === 'string') jobs.push(preloadAudio(charPath('sounds', moduleId, file)));
      });
    });

    return Promise.all(jobs).then(function () { return undefined; });
  }

  function preloadModuleAssets(moduleId) {
    // Los módulos pueden exponer un hook opcional sin que buddy.js tenga que
    // conocer su implementación interna. Si no existe, la precarga del
    // personaje ya cubre sus overrides y el módulo puede cargar sus defaults
    // bajo demanda.
    var moduleApi = window.Buddy && window.Buddy[moduleId];
    if (moduleApi && typeof moduleApi.preloadAssets === 'function') {
      return Promise.resolve(moduleApi.preloadAssets());
    }
    return Promise.resolve();
  }

  function initialize() {
    var entry = getEntryScript();
    if (!entry) {
      return Promise.reject(new Error('[BUDDY] No se encontró el <script> de entrada buddy.js.'));
    }

    var characterId = (entry.getAttribute('data-buddy-character') || '').trim().toLowerCase();
    var abilities = parseAbilities(entry.getAttribute('data-buddy-abilities'));

    if (!characterId) {
      return Promise.reject(new Error('[BUDDY] Falta data-buddy-character en el script de entrada.'));
    }

    personajeActivo = characterId;
    modulosActivos = abilities;
    debugLog('initialize: inicio', { character: characterId, abilities: abilities.slice(), assetBase: ASSET_BASE });
    window.Buddy.characterId = characterId;
    window.Buddy.abilities = abilities.slice();

    return loadScript(ASSET_BASE + 'config.js')
      .then(function () {
        debugLog('config.js cargado', window.BuddyConfig || {});
      })
      .then(function () {
        window.Buddy.config = window.BuddyConfig || {};
        debugLog('BuddyConfig disponible. debug=' + (window.BuddyConfig.debug === true) + ' debugMode=' + (window.BuddyConfig.debugMode === true));
        return loadOptionalScript(ASSET_BASE + 'modules/telemetry/config.js');
      })
      .then(function () {
        return loadOptionalScript(ASSET_BASE + 'modules/telemetry/buddy_telemetry.js');
      })
      .then(function () {
        return loadOptionalScript(ASSET_BASE + 'modules/user/config.js');
      })
      .then(function () {
        return loadOptionalScript(ASSET_BASE + 'modules/user/buddy_user.js');
      })
      .then(function () {
        return loadScript(scriptUrlForCharacter(characterId));
      })
      .then(function () {
        // /says/config.js es el punto de configuración del módulo /says.
        return loadScript(ASSET_BASE + 'modules/says/config.js');
      })
      .then(function () {
        var charData = getCharData();
        if (!charData) {
          throw new Error('[BUDDY] El personaje "' + characterId +
            '" no registró window.BuddyChars.' + characterId + '.');
        }
        window.Buddy.character = charData;
        return preloadCharacterAssets();
      })
      .then(function () {
        return loadScript(ASSET_BASE + 'modules/says/buddy_says.js');
      })
      .then(function () {
        return loadSaysSources();
      })
      .then(function () {
        var charData = getCharData();
        var locale = charData.perfil.idioma;
        var style = charData.perfil.estilo;
        if (!locale || !style) {
          throw new Error('[BUDDY] El personaje "' + characterId +
            '" no define perfil.idioma/perfil.estilo.');
        }
        return loadScript(scriptUrlForSays(locale, style));
      })
      .then(function () {
        return loadChatModule();
      })
      .then(function () {
        return abilities.reduce(function (chain, moduleId) {
          return chain
            // La configuración del módulo debe existir antes de ejecutar su
            // implementación. Esto evita que módulos como Archery intenten
            // leer window.BuddyArcheryConfig antes de que config.js haya sido
            // cargado.
            .then(function () { debugLog('módulo ' + moduleId + ': cargando config'); return loadScript(scriptUrlForModuleConfig(moduleId)); })
            .then(function () { debugLog('módulo ' + moduleId + ': cargando implementación'); return loadScript(scriptUrlForModule(moduleId)); })
            .then(function () {
              var charData = getCharData();
              debugLog('módulo ' + moduleId + ': cargando texto');
              return loadScript(scriptUrlForModuleText(moduleId, charData.perfil.idioma, charData.perfil.estilo));
            })
            .then(function () {
              debugLog('módulo ' + moduleId + ': precargando assets');
              return preloadModuleAssets(moduleId);
            });
        }, Promise.resolve());
      })
      .then(function () {
        // Todos los módulos activos deben estar inicializados ANTES de que
        // Says pueda mostrar su primer mensaje. Así un mensaje automático
        // que hace visible al personaje no puede adelantarse a Archery (u
        // otro módulo) y dejarlo sin sus listeners de interacción.
        if (window.Buddy.says && typeof window.Buddy.says.iniciarFuentes === 'function') {
          window.Buddy.says.iniciarFuentes();
        }
      })
      .then(function () {
        ready = true;
        window.Buddy.ready = true;
        debugLog('initialize: Buddy listo', { character: personajeActivo, abilities: modulosActivos.slice() });
        window.Buddy.readyPromise = readyPromise;
        window.dispatchEvent(new CustomEvent('buddy:ready', {
          detail: { character: personajeActivo, abilities: modulosActivos.slice() }
        }));
      });
  }

  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  window.Buddy.config = window.BuddyConfig || {};
  window.Buddy.debugMode = function () {
    return !!(window.BuddyConfig && window.BuddyConfig.debugMode === true);
  };
  window.Buddy.debugLog = debugLog;

  window.Buddy.registerBusyProvider = registerBusyProvider;
  window.Buddy.isBusy = isBusy;
  window.Buddy.resolveAsset = resolveAsset;
  window.Buddy.hasAssetOverride = hasAssetOverride;
  window.Buddy.resolveAssetDefault = resolveAssetDefault;
  window.Buddy.resolveExpressionExact = resolveExpressionExact;
  window.Buddy.resolveExpression = resolveExpression;
  window.Buddy.resolveExpressionByCategory = resolveExpressionByCategory;
  window.Buddy.resolveScenario = resolveScenario;
  window.Buddy.showCharacterImage = showCharacterImage;
  window.Buddy.isCharacterVisible = function () {
    return !!(charEl && charEl.style.display !== 'none');
  };
  window.Buddy.getCharacter = getCharData;
  window.Buddy.isReady = function () { return ready; };
  window.Buddy.preloadCharacterAssets = preloadCharacterAssets;
  window.Buddy.preloadModuleAssets = preloadModuleAssets;

  // La inicialización se expone como Promise y comienza una sola vez.
  readyPromise = initialize();
  window.Buddy.readyPromise = readyPromise;
  readyPromise.catch(function (err) {
    console.error(err);
    window.Buddy.ready = false;
    window.Buddy.readyError = err;
    window.dispatchEvent(new CustomEvent('buddy:error', { detail: err }));
  });
})();

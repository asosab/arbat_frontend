/**
 * assets/buddy/buddy.js
 * ---------------------------------------------------------------------------
 * Fase 3 del plan de separación de raulito.js (ver planBuddy_v5.md).
 *
 * Fase 6: además de los resolutores y el render centralizado del personaje,
 * este archivo actúa como punto único de entrada: lee data-buddy-character /
 * data-buddy-abilities, carga personaje, says y módulos en orden, y expone el
 * estado de inicialización. El motor de fuentes de says y el busy global siguen
 * reservados para fases posteriores.
 *
 * Fuente de la matemática de encuadre: raulito.js (screenLongSide,
 * applyLongSideFit, fitLongSide, characterTargetPx, characterBottomOffsetPx,
 * characterAnchorTargetPx, characterRightOffsetPx, positionCharacter,
 * characterMarginPx, characterLongSidePercent, characterAnchorRightPercent).
 * Se traslada sin cambiar el comportamiento visual: antes esos cálculos
 * usaban CONFIG.scales.character[poseKey] / CONFIG.characterWaistRatio[poseKey]
 * / CONFIG.characterAnchorXRatio[poseKey] (indexados por pose fija); ahora
 * usan directamente los campos `escala` / `anclas.cintura.y` / `anclas.cintura.x`
 * del objeto { archivo, ancho, alto, escala, anclas } que devuelve cada
 * resolutor (ver planBuddy_v5.md, tabla de mapeo sección 4.1: "cintura" es
 * el equivalente exacto de characterWaistRatio/characterAnchorXRatio).
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function () {
  'use strict';

  // -------------------------------------------------------------------
  // Config de rutas base. Puede sobreescribirse antes de cargar este
  // script definiendo window.BUDDY_ASSET_BASE (mismo criterio que
  // window.RAULITO_ASSET_BASE en raulito.js).
  // -------------------------------------------------------------------
  var entryScript = getEntryScript();
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
  function resolveExpression(expresionId) {
    var charData = getCharData();
    if (!charData || !charData.expresiones) return null;

    var entry = charData.expresiones[expresionId];
    if (!entry) {
      entry = charData.expresiones[EXPRESION_OBLIGATORIA];
    }
    if (!entry) return null; // ni siquiera existe 'sereno': personaje mal definido

    return {
      archivo: charPath('images', 'expresiones', entry.archivo),
      ancho: entry.ancho,
      alto: entry.alto,
      escala: entry.escala,
      anclas: entry.anclas
    };
  }

  // ---------------------------------------------------------------------
  // resolveExpressionByCategory(categoria)
  // ---------------------------------------------------------------------
  function resolveExpressionByCategory(categoria) {
    var charData = getCharData();
    var expresionId = charData &&
      charData.diccionarioExpresiones &&
      charData.diccionarioExpresiones[categoria];

    // Si la categoría no existe en el diccionario del personaje,
    // resolveExpression(undefined) ya cae en 'sereno' por su propio
    // fallback — comportamiento seguro y coherente con el resto del plan.
    return resolveExpression(expresionId);
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

  // Antes: characterBottomOffsetPx(poseKey, renderedHeightPx) leía
  // CONFIG.characterWaistRatio[poseKey]. Ahora recibe waistRatio directo
  // (= anclas.cintura.y del objeto ya resuelto).
  function characterBottomOffsetPx(waistRatio, renderedHeightPx) {
    if (typeof waistRatio !== 'number') waistRatio = 0.5;
    var belowWaistPx = renderedHeightPx * (1 - waistRatio);
    return LAYOUT.characterMarginPx - belowWaistPx;
  }

  function characterAnchorTargetPx() {
    return LAYOUT.characterAnchorRightPercent * screenLongSide();
  }

  // Antes: characterRightOffsetPx(renderedWidthPx, poseKey) leía
  // CONFIG.characterAnchorXRatio[poseKey]. Ahora recibe anchorRatio
  // directo (= anclas.cintura.x del objeto ya resuelto).
  function characterRightOffsetPx(renderedWidthPx, anchorRatio) {
    if (typeof anchorRatio !== 'number') anchorRatio = 0.5;
    var pxToRightOfAnchor = renderedWidthPx * (1 - anchorRatio);
    return characterAnchorTargetPx() - pxToRightOfAnchor;
  }

  function waistRatioOf(datosImagen) {
    return datosImagen && datosImagen.anclas && datosImagen.anclas.cintura &&
      typeof datosImagen.anclas.cintura.y === 'number' ? datosImagen.anclas.cintura.y : undefined;
  }

  function anchorRatioOf(datosImagen) {
    return datosImagen && datosImagen.anclas && datosImagen.anclas.cintura &&
      typeof datosImagen.anclas.cintura.x === 'number' ? datosImagen.anclas.cintura.x : undefined;
  }

  function positionCharacter(datosImagen) {
    if (!charEl) return;
    var renderedHeight = charEl.offsetHeight;
    var renderedWidth = charEl.offsetWidth;
    if (!renderedHeight || !renderedWidth) return;
    charEl.style.bottom = characterBottomOffsetPx(waistRatioOf(datosImagen), renderedHeight) + 'px';
    charEl.style.right = characterRightOffsetPx(renderedWidth, anchorRatioOf(datosImagen)) + 'px';
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
    charEl.style.display = 'block';
    charEl.src = datosImagen.archivo;

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

  function scriptUrlForModule(moduleId) {
    return ASSET_BASE + 'modules/' + moduleId + '/buddy_' + moduleId + '.js';
  }

  function scriptUrlForModuleText(moduleId, locale, style) {
    return ASSET_BASE + 'modules/' + moduleId + '/' + locale +
      '/buddy_' + moduleId + '_' + style + '.js';
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
    window.Buddy.characterId = characterId;
    window.Buddy.abilities = abilities.slice();

    return loadScript(scriptUrlForCharacter(characterId))
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
        return abilities.reduce(function (chain, moduleId) {
          return chain
            .then(function () { return loadScript(scriptUrlForModule(moduleId)); })
            .then(function () {
              var charData = getCharData();
              return loadScript(scriptUrlForModuleText(moduleId, charData.perfil.idioma, charData.perfil.estilo));
            })
            .then(function () { return preloadModuleAssets(moduleId); });
        }, Promise.resolve());
      })
      .then(function () {
        ready = true;
        window.Buddy.ready = true;
        window.Buddy.readyPromise = readyPromise;
        window.dispatchEvent(new CustomEvent('buddy:ready', {
          detail: { character: personajeActivo, abilities: modulosActivos.slice() }
        }));
      });
  }

  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  window.Buddy.resolveAsset = resolveAsset;
  window.Buddy.resolveExpression = resolveExpression;
  window.Buddy.resolveExpressionByCategory = resolveExpressionByCategory;
  window.Buddy.resolveScenario = resolveScenario;
  window.Buddy.showCharacterImage = showCharacterImage;
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

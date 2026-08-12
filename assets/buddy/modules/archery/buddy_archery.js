/**
 * modules/archery/buddy_archery.js
 * ---------------------------------------------------------------------------
 * Módulo "archery": habilidad de minijuego de puntería (ver planBuddy.md,
 * Fase 5). Autocontenido: funciona completo sin personaje activo, usando
 * solo `defaults`. Con personaje activo, usa los overrides que ese personaje
 * defina en `modulos.archery` (ver §1.7 de planBuddy.md), resueltos siempre
 * a través de `resolverAsset()` (§1.8) — nunca con una ruta fija.
 *
 * Mecánica (turnos, puntería, resultado, progresión):
 *   - Toque largo sobre el personaje para tensar el arco (pose "apuntar").
 *   - Arrastrar mueve la mira; soltar dentro de la ventana de tiro dispara
 *     (pose "disparo"). Soltar tarde, o mover la mira fuera del rango
 *     válido, cuenta como fallo.
 *   - El puntaje sale de la distancia del impacto al centro de la diana
 *     (anillos concéntricos, §CONFIG.anillos).
 *   - Las flechas se agrupan en turnos de `CONFIG.turno.flechasPorTurno`.
 *     Al completar un turno hay un `cooldownMs` de descanso antes del
 *     siguiente, y se narra la suma de puntos del turno.
 *   - Progresión: cada `CONFIG.progresion.puntosPorNivel` puntos acumulados
 *     en la sesión suben un nivel (hasta `nivelMax`), y cada nivel agranda
 *     el temblor de la mira (`CONFIG.temblor`) — el juego se vuelve más
 *     difícil a medida que se acumulan aciertos.
 *
 * Textos usados (referenciados por clave, nunca strings literales — ver
 * §1.4 de planBuddy.md): saludoInicial, resultadoAcierto, resultadoFallo,
 * turnoCompletoResultado, turnoCompletoPerfecto, subioNivel,
 * esperandoCooldown, miraFueraDeRango, brazoCansado. Si no se recibe
 * diccionario de textos (módulo usado antes de la Fase 6, o de forma
 * standalone sin personaje), se muestra la clave entre corchetes como
 * placeholder — el módulo sigue siendo jugable igual.
 * ---------------------------------------------------------------------------
 */

// -----------------------------------------------------------------------
// 1. Assets por defecto del módulo (§1.6). El módulo debe poder jugarse
//    completo con solo esto, sin ningún personaje activo.
// -----------------------------------------------------------------------
export const defaults = {
  images: {
    diana: 'modules/archery/images/diana_default.png',
    personajeIdle: 'modules/archery/images/personaje_default.png',
    personajeDisparo: 'modules/archery/images/personaje_default_disparo.png'
  },
  sounds: {
    acierto: 'modules/archery/sounds/acierto_default.mp3',
    fallo: 'modules/archery/sounds/fallo_default.mp3'
  },
  // Anclas (0 a 1, relativas al sprite) del personaje por defecto del
  // módulo, mismo set de claves que usa `chars/{id}/buddy_char_*.js` en
  // sus expresiones (ver §1.1 de planBuddy.md). Se usan para ubicar la
  // mira sobre la mano/ojo del arquero cuando no hay personaje activo.
  // Supuesto documentado: el personaje por defecto está de pie, centrado,
  // mirando hacia la diana — mismos valores razonables para cualquier
  // sprite genérico de arquero.
  anclas: {
    cabezaSuperior: { x: 0.50, y: 0.04 },
    ojoIzq: { x: 0.46, y: 0.14 },
    ojoDer: { x: 0.54, y: 0.14 },
    cintura: { x: 0.50, y: 0.55 },
    pieIzq: { x: 0.42, y: 0.97 },
    pieDer: { x: 0.58, y: 0.97 }
  }
};

// -----------------------------------------------------------------------
// 2. Configuración de mecánica. Zona de calibración: no hace falta
//    entender el resto del archivo para ajustar estos valores.
// -----------------------------------------------------------------------
const CONFIG = {
  // Anillos de puntería, del centro hacia afuera. `outerPercent` es la
  // fracción (0 a 1) del radio de la diana hasta donde llega cada zona.
  anillos: [
    { puntos: 10, outerPercent: 0.14 },
    { puntos: 9, outerPercent: 0.27 },
    { puntos: 8, outerPercent: 0.45 },
    { puntos: 7, outerPercent: 0.61 },
    { puntos: 6, outerPercent: 0.81 },
    { puntos: 5, outerPercent: 1.00 }
  ],

  turno: {
    flechasPorTurno: 6,
    cooldownMs: 8000
  },

  punteria: {
    // Umbral (ms) para distinguir un toque largo de un click/tap normal.
    toqueLargoMs: 300,
    // Ventana (ms) desde que se empieza a apuntar hasta que soltar ya
    // cuenta como demora (fallo automático).
    ventanaDisparoMs: 6000,
    // Multiplicador de movimiento real del puntero a movimiento de mira.
    sensibilidad: 3,
    // Fracción (0 a 1) del ancho de pantalla, desde el lado del
    // personaje, dentro de la cual la mira se considera válida. Cruzar
    // ese límite hacia la diana cancela el tiro (mira "fuera de rango").
    rangoValidoFraccion: 0.6
  },

  // Progresión: cada `puntosPorNivel` puntos acumulados en la sesión
  // suben un nivel, hasta `nivelMax`. El nivel actual escala el temblor.
  progresion: {
    puntosPorNivel: 40,
    nivelMax: 5
  },

  // Temblor de la mira mientras se apunta: crece con el tiempo sostenido
  // y con el nivel de dificultad actual (progresión).
  temblor: {
    amplitudBasePx: 2,
    amplitudPorNivelPx: 3,
    // A partir de este tiempo sostenido (ms), el temblor por cansancio
    // empieza a crecer además del de dificultad.
    sostenerDesdeMs: 3000,
    amplitudMaxSostenidoPx: 18,
    hz: 6
  },

  tiempos: {
    // Cuánto queda visible la pose de disparo antes de volver a idle.
    resolverMs: 1200,
    // Cuánto dura el globo de resultado.
    globoMs: 2200
  }
};

// -----------------------------------------------------------------------
// 3. Utilidades de texto y resolución de assets.
// -----------------------------------------------------------------------

// Envuelve `ctx.textos[clave]`, con reemplazos simples de "{var}". Sin
// diccionario de textos (módulo standalone, o corrido antes de la Fase 6),
// muestra la clave entre corchetes como placeholder — nunca deja de
// funcionar por falta de textos.
function obtenerTexto(ctx, clave, reemplazos) {
  var plantilla = ctx.textos && ctx.textos[clave];
  if (typeof plantilla !== 'string') return '[' + clave + ']';
  if (!reemplazos) return plantilla;
  var resultado = plantilla;
  Object.keys(reemplazos).forEach(function (llave) {
    resultado = resultado.replace('{' + llave + '}', reemplazos[llave]);
  });
  return resultado;
}

// Resuelve una imagen/sonido del módulo. Siempre pasa por `ctx.resolverAsset`
// (§1.8 de planBuddy.md): si hay personaje activo con override para
// `modulos.archery.{tipo}.{clave}`, se usa ese; si no, el default de este
// módulo. `ctx.resolverAsset` ya llega acotado al módulo "archery" —
// buddy.js es quien lo arma así al montar el módulo (§Fase 7).
function resolverAsset(ctx, tipo, clave) {
  if (ctx.resolverAsset) return ctx.resolverAsset(tipo, clave);
  // Sin orquestador (módulo probado de forma completamente aislada): cae
  // directo en los defaults propios.
  return defaults[tipo] && defaults[tipo][clave];
}

// Anclas a usar para posicionar la mira: las del personaje activo (su
// expresión "sereno", que es el fallback universal — ver §1.3) si existen,
// o las anclas por defecto del módulo si no hay personaje.
function obtenerAnclas(ctx) {
  if (ctx.obtenerAnclas) {
    var anclasPersonaje = ctx.obtenerAnclas();
    if (anclasPersonaje) return anclasPersonaje;
  }
  return defaults.anclas;
}

// -----------------------------------------------------------------------
// 4. Puntaje por distancia al centro de la diana.
// -----------------------------------------------------------------------
function calcularPuntaje(x, y, dianaRect) {
  if (!dianaRect || !dianaRect.width || !dianaRect.height) return null;
  var cx = dianaRect.left + dianaRect.width / 2;
  var cy = dianaRect.top + dianaRect.height / 2;
  var radioMax = Math.min(dianaRect.width, dianaRect.height) / 2;
  var distancia = Math.hypot(x - cx, y - cy);

  for (var i = 0; i < CONFIG.anillos.length; i++) {
    var anillo = CONFIG.anillos[i];
    if (distancia <= anillo.outerPercent * radioMax) return anillo.puntos;
  }
  return null; // fuera de todos los anillos: fallo
}

// -----------------------------------------------------------------------
// 5. Fábrica del módulo. `ctx` (todo provisto por buddy.js al activar la
//    habilidad, §Fase 7):
//      - contenedor:      elemento DOM donde montar el juego
//      - resolverAsset:   (tipo, clave) => ruta,  ya acotado al módulo
//      - obtenerAnclas:   () => anclas de la expresión activa, o null
//      - textos:          diccionario plano de la Fase 6 (opcional)
//      - viewport:        config de escalado/posicionamiento (§1.2)
//    Devuelve una API mínima para que buddy.js controle el módulo:
//    mostrar / ocultar / reiniciar / obtenerProgreso.
// -----------------------------------------------------------------------
export function crearArchery(ctx) {
  ctx = ctx || {};

  // ---- Estado interno ---------------------------------------------------
  var estado = 'oculto'; // oculto | reposo | apuntando | resuelto
  var nivel = 0;
  var puntajeSesion = 0;
  var flechasEnTurno = 0;
  var puntajeTurno = 0;
  var turnoEnCooldownHasta = 0;

  var elArquero = null;
  var elMira = null;
  var elDiana = null;
  var elGlobo = null;

  var punteroActivo = null;
  var inicioX = 0;
  var inicioY = 0;
  var timerToqueLargo = null;
  var timerResolver = null;
  var timerGlobo = null;
  var inicioApuntadoEn = 0;
  var miraBaseDx = 0;
  var miraBaseDy = 0;
  var temblorRAF = null;
  var faseTemblor = 0;
  var ultimoFrameEn = 0;

  var audioAcierto = null;
  var audioFallo = null;

  // ---- Construcción de elementos ----------------------------------------
  function asegurarElementos() {
    if (elArquero) return;
    if (!ctx.contenedor) return;

    elDiana = document.createElement('img');
    elDiana.alt = '';
    elDiana.draggable = false;
    Object.assign(elDiana.style, {
      position: 'absolute', left: '16px', top: '16px',
      pointerEvents: 'none', userSelect: 'none', display: 'none'
    });

    elArquero = document.createElement('img');
    elArquero.alt = '';
    elArquero.draggable = false;
    Object.assign(elArquero.style, {
      position: 'absolute', right: '16px', bottom: '16px',
      touchAction: 'none', userSelect: 'none', cursor: 'pointer',
      display: 'none'
    });

    elMira = document.createElement('div');
    Object.assign(elMira.style, {
      position: 'absolute', width: '18px', height: '18px',
      border: '2px solid currentColor', borderRadius: '50%',
      pointerEvents: 'none', display: 'none', willChange: 'transform'
    });

    elGlobo = document.createElement('div');
    Object.assign(elGlobo.style, {
      position: 'absolute', maxWidth: '220px', padding: '8px 12px',
      background: '#fff', borderRadius: '12px', font: '13px/1.4 sans-serif',
      display: 'none', textAlign: 'center'
    });

    ctx.contenedor.style.position = ctx.contenedor.style.position || 'relative';
    ctx.contenedor.appendChild(elDiana);
    ctx.contenedor.appendChild(elArquero);
    ctx.contenedor.appendChild(elMira);
    ctx.contenedor.appendChild(elGlobo);

    elArquero.addEventListener('pointerdown', alPresionar);
    elArquero.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var srcAcierto = resolverAsset(ctx, 'sounds', 'acierto');
    var srcFallo = resolverAsset(ctx, 'sounds', 'fallo');
    if (srcAcierto) { audioAcierto = new Audio(srcAcierto); audioAcierto.preload = 'auto'; }
    if (srcFallo) { audioFallo = new Audio(srcFallo); audioFallo.preload = 'auto'; }
  }

  function reproducir(audio) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* reproducción bloqueada, se ignora */ });
    } catch (err) { /* noop */ }
  }

  // ---- Poses --------------------------------------------------------------
  function mostrarPoseArquero(clave) {
    var src = resolverAsset(ctx, 'images', clave);
    if (src) elArquero.src = src;
  }

  function mostrarDiana() {
    var src = resolverAsset(ctx, 'images', 'diana');
    if (src) elDiana.src = src;
    elDiana.style.display = 'block';
  }

  // ---- Globo de resultado --------------------------------------------------
  function mostrarGlobo(texto, duracionMs) {
    elGlobo.textContent = texto;
    elGlobo.style.left = '50%';
    elGlobo.style.top = '10%';
    elGlobo.style.transform = 'translateX(-50%)';
    elGlobo.style.display = 'block';
    if (timerGlobo) clearTimeout(timerGlobo);
    timerGlobo = setTimeout(function () {
      elGlobo.style.display = 'none';
    }, duracionMs || CONFIG.tiempos.globoMs);
  }

  // ---- Progresión -----------------------------------------------------------
  // Sube de nivel cada CONFIG.progresion.puntosPorNivel puntos acumulados
  // en la sesión, hasta nivelMax. El nivel actual agranda el temblor de la
  // mira (ver amplitudTemblorActual), haciendo el juego progresivamente
  // más difícil a medida que se acumulan aciertos.
  function actualizarProgresion() {
    var nivelObjetivo = Math.min(
      CONFIG.progresion.nivelMax,
      Math.floor(puntajeSesion / CONFIG.progresion.puntosPorNivel)
    );
    if (nivelObjetivo > nivel) {
      nivel = nivelObjetivo;
      mostrarGlobo(obtenerTexto(ctx, 'subioNivel', { nivel: nivel }));
    }
  }

  function amplitudTemblorActual(msSostenido) {
    var porNivel = CONFIG.temblor.amplitudBasePx + nivel * CONFIG.temblor.amplitudPorNivelPx;
    if (msSostenido <= CONFIG.temblor.sostenerDesdeMs) return porNivel;
    var progreso = Math.min(1,
      (msSostenido - CONFIG.temblor.sostenerDesdeMs) / CONFIG.punteria.ventanaDisparoMs);
    return porNivel + progreso * CONFIG.temblor.amplitudMaxSostenidoPx;
  }

  // ---- Temblor de la mira mientras se apunta ---------------------------------
  function iniciarTemblor() {
    faseTemblor = 0;
    ultimoFrameEn = 0;
    if (temblorRAF) cancelAnimationFrame(temblorRAF);
    temblorRAF = requestAnimationFrame(tickTemblor);
  }

  function detenerTemblor() {
    if (temblorRAF) { cancelAnimationFrame(temblorRAF); temblorRAF = null; }
  }

  function tickTemblor(ahora) {
    if (estado !== 'apuntando') { temblorRAF = null; return; }
    var dt = ultimoFrameEn ? (ahora - ultimoFrameEn) : 16;
    ultimoFrameEn = ahora;

    var sostenidoMs = ahora - inicioApuntadoEn;
    var amplitud = amplitudTemblorActual(sostenidoMs);
    faseTemblor += 2 * Math.PI * CONFIG.temblor.hz * (dt / 1000);

    var dx = miraBaseDx + Math.sin(faseTemblor) * amplitud;
    var dy = miraBaseDy + Math.sin(faseTemblor * 1.3) * amplitud * 0.6;
    elMira.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';

    temblorRAF = requestAnimationFrame(tickTemblor);
  }

  // ---- Ciclo de disparo -------------------------------------------------
  function alPresionar(e) {
    if (estado !== 'reposo') return;
    if (turnoEnCooldownHasta && performance.now() < turnoEnCooldownHasta) {
      mostrarGlobo(obtenerTexto(ctx, 'esperandoCooldown'));
      return;
    }

    punteroActivo = e.pointerId;
    try { elArquero.setPointerCapture(punteroActivo); } catch (err) { /* noop */ }
    inicioX = e.clientX;
    inicioY = e.clientY;

    timerToqueLargo = setTimeout(entrarEnApuntado, CONFIG.punteria.toqueLargoMs);
    elArquero.addEventListener('pointerup', alSoltarAntesDeApuntar);
    elArquero.addEventListener('pointercancel', cancelarGesto);
  }

  function alSoltarAntesDeApuntar() {
    if (estado !== 'reposo') return;
    limpiarTimersDeGesto();
    elArquero.removeEventListener('pointerup', alSoltarAntesDeApuntar);
  }

  function cancelarGesto() {
    limpiarTimersDeGesto();
    detenerTemblor();
    desprenderListenersDeApuntado();
    if (estado !== 'oculto') volverAReposo();
  }

  function limpiarTimersDeGesto() {
    if (timerToqueLargo) { clearTimeout(timerToqueLargo); timerToqueLargo = null; }
  }

  function entrarEnApuntado() {
    estado = 'apuntando';
    inicioApuntadoEn = performance.now();
    mostrarPoseArquero('personajeIdle');
    elMira.style.display = 'block';
    miraBaseDx = 0;
    miraBaseDy = 0;
    iniciarTemblor();

    elArquero.addEventListener('pointermove', alMoverApuntando);
    elArquero.addEventListener('pointerup', alSoltarApuntando);
  }

  function alMoverApuntando(e) {
    if (estado !== 'apuntando') return;

    // Rango válido: la mira no puede cruzar hacia el lado de la diana más
    // allá de `rangoValidoFraccion` del ancho de pantalla — evita disparos
    // triviales apuntando directo sobre el blanco.
    var anchoContenedor = ctx.contenedor.clientWidth;
    var limiteX = anchoContenedor * (1 - CONFIG.punteria.rangoValidoFraccion);
    if (e.clientX < limiteX) {
      resolverTiro('fallo', obtenerTexto(ctx, 'miraFueraDeRango'));
      return;
    }

    var dx = (e.clientX - inicioX) * CONFIG.punteria.sensibilidad;
    var dy = (e.clientY - inicioY) * CONFIG.punteria.sensibilidad;
    miraBaseDx = -dx;
    miraBaseDy = -dy;
  }

  function alSoltarApuntando() {
    if (estado !== 'apuntando') return;
    var transcurrido = performance.now() - inicioApuntadoEn;
    if (transcurrido <= CONFIG.punteria.ventanaDisparoMs) {
      resolverTiro('disparo');
    } else {
      resolverTiro('fallo', obtenerTexto(ctx, 'brazoCansado'));
    }
  }

  function desprenderListenersDeApuntado() {
    elArquero.removeEventListener('pointermove', alMoverApuntando);
    elArquero.removeEventListener('pointerup', alSoltarApuntando);
    elArquero.removeEventListener('pointerup', alSoltarAntesDeApuntar);
    elArquero.removeEventListener('pointercancel', cancelarGesto);
  }

  function resolverTiro(resultado, mensajeForzado) {
    limpiarTimersDeGesto();
    detenerTemblor();
    desprenderListenersDeApuntado();
    estado = 'resuelto';
    elMira.style.display = 'none';

    var puntos = null;
    if (resultado === 'disparo') {
      mostrarPoseArquero('personajeDisparo');
      var dianaRect = elDiana.getBoundingClientRect();
      var miraRect = elMira.getBoundingClientRect();
      puntos = calcularPuntaje(
        miraRect.left + miraRect.width / 2,
        miraRect.top + miraRect.height / 2,
        dianaRect
      );
      reproducir(puntos != null ? audioAcierto : audioFallo);
      var texto = puntos != null
        ? obtenerTexto(ctx, 'resultadoAcierto', { puntos: puntos })
        : obtenerTexto(ctx, 'resultadoFallo');
      mostrarGlobo(mensajeForzado || texto);
    } else {
      mostrarPoseArquero('personajeIdle');
      reproducir(audioFallo);
      mostrarGlobo(mensajeForzado || obtenerTexto(ctx, 'resultadoFallo'));
    }

    registrarFlecha(puntos);

    timerResolver = setTimeout(function () {
      estado = 'reposo';
      mostrarPoseArquero('personajeIdle');
    }, CONFIG.tiempos.resolverMs);
  }

  // ---- Turnos -------------------------------------------------------------
  function registrarFlecha(puntos) {
    var sumaPuntos = puntos != null ? puntos : 0;
    puntajeSesion += sumaPuntos;
    puntajeTurno += sumaPuntos;
    flechasEnTurno++;
    actualizarProgresion();

    if (flechasEnTurno >= CONFIG.turno.flechasPorTurno) {
      var esPerfecto = puntajeTurno >= CONFIG.turno.flechasPorTurno * CONFIG.anillos[0].puntos;
      var textoTurno = esPerfecto
        ? obtenerTexto(ctx, 'turnoCompletoPerfecto')
        : obtenerTexto(ctx, 'turnoCompletoResultado', { puntos: puntajeTurno });

      turnoEnCooldownHasta = performance.now() + CONFIG.turno.cooldownMs;
      setTimeout(function () { mostrarGlobo(textoTurno); }, CONFIG.tiempos.globoMs);

      flechasEnTurno = 0;
      puntajeTurno = 0;
    }
  }

  // ---- Ciclo de vida del módulo ---------------------------------------------
  function mostrar() {
    asegurarElementos();
    if (!elArquero) return;
    estado = 'reposo';
    elArquero.style.display = 'block';
    mostrarDiana();
    mostrarPoseArquero('personajeIdle');
    mostrarGlobo(obtenerTexto(ctx, 'saludoInicial'));
  }

  function ocultar() {
    limpiarTimersDeGesto();
    if (timerResolver) { clearTimeout(timerResolver); timerResolver = null; }
    if (timerGlobo) { clearTimeout(timerGlobo); timerGlobo = null; }
    detenerTemblor();
    if (elArquero) desprenderListenersDeApuntado();
    estado = 'oculto';
    if (elArquero) elArquero.style.display = 'none';
    if (elDiana) elDiana.style.display = 'none';
    if (elMira) elMira.style.display = 'none';
    if (elGlobo) elGlobo.style.display = 'none';
  }

  function reiniciarSesion() {
    nivel = 0;
    puntajeSesion = 0;
    flechasEnTurno = 0;
    puntajeTurno = 0;
    turnoEnCooldownHasta = 0;
  }

  function obtenerProgreso() {
    return {
      nivel: nivel,
      puntajeSesion: puntajeSesion,
      flechasEnTurno: flechasEnTurno,
      puntajeTurno: puntajeTurno
    };
  }

  return {
    mostrar: mostrar,
    ocultar: ocultar,
    reiniciarSesion: reiniciarSesion,
    obtenerProgreso: obtenerProgreso
  };
}

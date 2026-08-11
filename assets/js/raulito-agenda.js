/**
 * ARBAT — assets/js/raulito-agenda.js
 * ---------------------------------------------------------------------------
 * Puente entre ArbatAgenda (assets/js/agenda.js) y Raulito
 * (assets/js/raulito.js). Es el ÚNICO archivo que conoce a los dos — ninguno
 * de ellos sabe que el otro existe, así que este archivo puede desaparecer
 * o cambiar sin tocarlos.
 *
 * Requiere que ambos scripts ya estén cargados. Se incluye siempre DESPUÉS
 * de los dos, en la misma página:
 *   <script src="/assets/js/agenda.js" defer></script>
 *   <script src="/assets/js/raulito.js" defer></script>
 *   <script src="/assets/js/raulito-agenda.js" defer></script>
 *
 * No tiene Liquid/front matter porque no lee nada de site.arbat.* — por eso
 * es un .js plano, no pasa por el procesamiento de Jekyll (a diferencia de
 * agenda.js, que sí lo necesita para {{ site.arbat.email }} y compañía).
 *
 * Depende de Raulito.decirSiLibre(texto, duracionMs, opts) (raulito.js
 * v1.7+), que devuelve true si logró mostrar el globo y false si Raúl está
 * ocupado: jugando (apuntando/resolviendo un tiro), agotado, oculto, o ya
 * mostrando otro globo (propio o del juego). A diferencia de Raulito.say(),
 * que SIEMPRE fuerza el globo, decirSiLibre() nunca interrumpe una acción
 * de juego en curso ni pisa un mensaje que ya está en pantalla — por eso es
 * la función correcta para mensajería "de fondo" como esta. Si se carga una
 * versión de raulito.js anterior, sin decirSiLibre, este archivo
 * simplemente no muestra nada (no rompe la página, y no cae a say() a
 * propósito: say() rompería justo la garantía de "nunca interrumpir" que
 * se busca acá).
 * ---------------------------------------------------------------------------
 */
(function (window, document) {
  'use strict';

  // -------------------------------------------------------------------
  // Configuración
  // -------------------------------------------------------------------
  // Casi todos los tiempos de acá aceptan DOS formatos, para que ajustar
  // la cadencia sea cómodo sin tocar lógica:
  //   - un número fijo en ms                 → ej. 45000
  //   - un rango aleatorio { min, max } en ms → ej. { min: 30000, max: 60000 }
  // Con un rango, cada vez que ese tiempo se usa se sortea un valor nuevo
  // dentro del rango (ver resolverTiempo más abajo), así la cadencia de
  // aparición de los mensajes no se siente mecánica ni predecible.
  var CONFIG = {
    // Duración del mensaje en la boca de Raulito: se calcula a partir del
    // largo del texto (tiempo de lectura estimado), no es un valor fijo.
    // Un mensaje de agenda puede ser una frase corta o una bastante larga
    // (ej. el anuncio de un evento con fecha, hora y lugar) — mostrarlas
    // todas el mismo tiempo fijo dejaría muy poco tiempo para leer las
    // largas, o demasiado para las cortas.
    lectura: {
      palabrasPorMinuto: 200, // velocidad de lectura promedio asumida
      margenMs: 1200,         // tiempo extra fijo, para no cortar justo al terminar de leer
      duracionMinimaMs: 3500, // piso — ni un mensaje de 2 palabras se muestra menos que esto
      duracionMaximaMs: 9000  // techo — ni un mensaje muy largo se eterniza en pantalla
    },

    // Pausa con Raúl en silencio, contada DESDE QUE EL MENSAJE ANTERIOR
    // TERMINA de mostrarse (no desde que arrancó — ver intentarMostrarTurnoActual).
    // Así queda garantizada esta pausa mínima sin importar cuánto haya
    // durado ese mensaje según su propio tiempo de lectura.
    pausaEntreMensajesMs: { min: 30000, max: 60000 },

    // Demora aleatoria antes del primer intento, al cargar la página. Sin
    // esto, todas las personas que entran al sitio verían el primer
    // mensaje de agenda exactamente al mismo tiempo de haber cargado.
    retrasoInicialMs: { min: 4000, max: 15000 },

    // Si Raulito está ocupado cuando toca el turno de un mensaje, cada
    // cuánto se reintenta antes de rendirse en ESE turno puntual.
    reintentoMs: { min: 3000, max: 7000 },

    // Reintentos máximos por turno antes de saltarlo y pasar al próximo
    // mensaje en la rotación (evita quedar insistiendo para siempre si el
    // jugador no suelta el arco).
    maxReintentosPorTurno: 6,

    // Cada cuánto se vuelve a pedir la agenda. Los mensajes son sensibles
    // al tiempo ("esta tarde", "el próximo sábado") y pierden vigencia.
    refrescarAgendaMs: 20 * 60 * 1000
  };

  var mensajes = [];
  var indiceActual = 0;
  var reintentosActuales = 0;
  var timerTurno = null;

  function dependenciasListas() {
    return !!(window.ArbatAgenda && window.Raulito);
  }

  // Resuelve un valor de CONFIG a un número de ms concreto: si es un
  // número, se usa tal cual (modo "fijo", para quien prefiera desactivar
  // la aleatoriedad de un parámetro puntual); si es { min, max }, sortea
  // un valor dentro del rango en cada llamada.
  function resolverTiempo(valor) {
    if (typeof valor === 'number') return valor;
    if (valor && typeof valor.min === 'number' && typeof valor.max === 'number') {
      if (valor.max <= valor.min) return valor.min;
      return valor.min + Math.random() * (valor.max - valor.min);
    }
    if (window.console) {
      console.warn('[RaulitoAgenda] Configuración de tiempo inválida, se usa 0:', valor);
    }
    return 0;
  }

  // Duración en pantalla según el largo del texto (tiempo de lectura),
  // acotada entre lectura.duracionMinimaMs y lectura.duracionMaximaMs.
  function duracionLectura(texto) {
    var palabras = (texto || '').trim().split(/\s+/).filter(Boolean).length;
    var lectura = CONFIG.lectura;
    var ms = (palabras / lectura.palabrasPorMinuto) * 60000 + lectura.margenMs;
    return Math.max(lectura.duracionMinimaMs, Math.min(lectura.duracionMaximaMs, ms));
  }

  function refrescarMensajes() {
    return window.ArbatAgenda.getMensajes().then(function (nuevos) {
      // Si vino vacío (sin API key, sin red, calendario vacío) se conserva
      // la última lista buena en vez de vaciar la rotación de golpe.
      if (nuevos && nuevos.length) {
        mensajes = nuevos;
        indiceActual = 0;
      }
    });
  }

  function programarSiguienteTurno(delayMs) {
    if (timerTurno) clearTimeout(timerTurno);
    timerTurno = setTimeout(intentarMostrarTurnoActual, Math.round(delayMs));
  }

  function intentarMostrarTurnoActual() {
    if (!mensajes.length) {
      programarSiguienteTurno(resolverTiempo(CONFIG.pausaEntreMensajesMs));
      return;
    }

    if (typeof window.Raulito.decirSiLibre !== 'function') {
      // Falta aplicar el cambio en raulito.js todavía — no se fuerza nada.
      programarSiguienteTurno(resolverTiempo(CONFIG.pausaEntreMensajesMs));
      return;
    }

    var texto = mensajes[indiceActual];
    var duracion = duracionLectura(texto);
    // decirSiLibre() es quien decide si es un buen momento: si Raúl está
    // jugando, agotado, oculto, o ya mostrando otro globo (propio o del
    // juego), devuelve false sin mostrar ni interrumpir nada.
    var seMostro = window.Raulito.decirSiLibre(texto, duracion);

    if (seMostro) {
      reintentosActuales = 0;
      indiceActual = (indiceActual + 1) % mensajes.length;
      // La pausa arranca a partir de que ESTE mensaje termine de
      // mostrarse: duracion (lo que va a durar en pantalla) + la pausa en
      // silencio configurada. Así un mensaje largo nunca se come la
      // pausa del siguiente, sea cual sea su tiempo de lectura.
      programarSiguienteTurno(duracion + resolverTiempo(CONFIG.pausaEntreMensajesMs));
      return;
    }

    // Ocupado (jugando o con otro globo activo): reintentar pronto.
    reintentosActuales++;
    if (reintentosActuales >= CONFIG.maxReintentosPorTurno) {
      reintentosActuales = 0;
      indiceActual = (indiceActual + 1) % mensajes.length; // se saltea este turno
      programarSiguienteTurno(resolverTiempo(CONFIG.pausaEntreMensajesMs));
    } else {
      programarSiguienteTurno(resolverTiempo(CONFIG.reintentoMs));
    }
  }

  function iniciar() {
    refrescarMensajes().then(function () {
      programarSiguienteTurno(resolverTiempo(CONFIG.retrasoInicialMs));
    });
    setInterval(refrescarMensajes, CONFIG.refrescarAgendaMs);
  }

  function esperarDependencias() {
    if (dependenciasListas()) {
      iniciar();
      return;
    }
    setTimeout(esperarDependencias, 200);
  }

  esperarDependencias();
})(window, document);

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
 *
 * Cola de mensajes y persistencia:
 * Cada mensaje que llega de ArbatAgenda.getMensajes() se agrega a una cola
 * con una marca "entregado" (true/false). Esa cola se guarda en
 * localStorage, así que sobrevive a un refresh de página o a que la
 * persona cierre y vuelva a abrir el navegador. En cada turno se busca el
 * primer mensaje pendiente (entregado: false) y se intenta mostrar con
 * Raulito.decirSiLibre(); recién ahí se marca como entregado y se guarda
 * de nuevo. Un mensaje ya entregado no se vuelve a mostrar, ni siquiera
 * después de un refresh. Un mensaje pendiente que no se llegó a mostrar
 * se mantiene en la cola y se reintenta más adelante, hasta que Raulito
 * esté libre.
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

    // Reintentos máximos, con cadencia rápida (reintentoMs), antes de
    // bajar a la cadencia normal (pausaEntreMensajesMs). El mensaje
    // pendiente se mantiene igual, así que esto solo evita insistir muy
    // seguido mientras el jugador no suelta el arco.
    maxReintentosPorTurno: 6,

    // Cada cuánto se vuelve a pedir la agenda. Los mensajes son sensibles
    // al tiempo ("esta tarde", "el próximo sábado") y pierden vigencia.
    refrescarAgendaMs: 20 * 60 * 1000
  };

  // Clave de localStorage. El sufijo de versión permite cambiar la forma
  // de los datos guardados en el futuro sin arriesgarse a leer una cola
  // vieja con una forma distinta: alcanza con subir el número acá.
  var STORAGE_KEY = 'arbatRaulitoAgendaCola.v1';

  // Cada entrada de la cola tiene esta forma: { id, texto, entregado }.
  // El id se calcula a partir del propio texto (ver hashTexto), así que
  // dos mensajes con el mismo contenido son, a todo efecto, el mismo
  // mensaje: no se duplican en la cola ni se reenvían si ya se entregó
  // uno con ese texto exacto.
  var cola = leerColaGuardada();
  var reintentosActuales = 0;
  var timerTurno = null;

  function dependenciasListas() {
    return !!(window.ArbatAgenda && window.Raulito);
  }

  // Hash simple y estable (variante de djb2) para identificar un mensaje
  // por su propio texto. No busca seguridad, solo una forma corta y
  // consistente de comparar "es el mismo mensaje" entre una carga de
  // página y la siguiente.
  function hashTexto(texto) {
    var hash = 5381;
    for (var i = 0; i < texto.length; i++) {
      hash = ((hash * 33) ^ texto.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  }

  // Lee la cola guardada de una sesión anterior del navegador. Si no hay
  // nada guardado, si localStorage no está disponible, o si lo guardado
  // no tiene la forma esperada, se arranca con una cola vacía en vez de
  // romper la página.
  function leerColaGuardada() {
    if (typeof window.localStorage === 'undefined') return [];
    try {
      var crudo = window.localStorage.getItem(STORAGE_KEY);
      if (!crudo) return [];
      var datos = JSON.parse(crudo);
      if (!Array.isArray(datos)) return [];
      return datos.filter(function (item) {
        return item &&
          typeof item.id === 'string' &&
          typeof item.texto === 'string' &&
          typeof item.entregado === 'boolean';
      });
    } catch (error) {
      if (window.console) {
        console.warn('[RaulitoAgenda] No se pudo leer la cola guardada, se arranca de cero.', error);
      }
      return [];
    }
  }

  // Guarda la cola actual en localStorage. Si falla (cuota llena,
  // navegación privada, localStorage deshabilitado), la cola sigue
  // funcionando igual, solo que en memoria, para lo que dure esta carga
  // de página.
  function guardarCola() {
    if (typeof window.localStorage === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cola));
    } catch (error) {
      if (window.console) {
        console.warn('[RaulitoAgenda] No se pudo guardar la cola (se sigue trabajando solo en memoria).', error);
      }
    }
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
    return window.ArbatAgenda.getMensajes().then(function (textosFrescos) {
      // Si vino vacío (sin API key, sin red, calendario vacío) se conserva
      // la cola tal cual está, en vez de vaciarla de golpe.
      if (!textosFrescos || !textosFrescos.length) return;

      var colaNueva = textosFrescos.map(function (texto) {
        var id = hashTexto(texto);
        var yaExistente = null;
        for (var i = 0; i < cola.length; i++) {
          if (cola[i].id === id) {
            yaExistente = cola[i];
            break;
          }
        }
        // Si el mismo texto ya estaba en la cola, se conserva la entrada
        // tal cual (con su marca de entregado, sea la que sea): así un
        // mensaje ya mostrado no se vuelve a encolar, y uno pendiente no
        // pierde su lugar. Si es un texto nuevo, se agrega pendiente.
        return yaExistente || { id: id, texto: texto, entregado: false };
      });

      // Un mensaje que ya no aparece en la agenda fresca (el evento pasó,
      // o el texto cambió porque cambió su fecha relativa) queda afuera de
      // la cola nueva: mantenerlo sería anunciar algo vencido.
      cola = colaNueva;
      guardarCola();
    });
  }

  function programarSiguienteTurno(delayMs) {
    if (timerTurno) clearTimeout(timerTurno);
    timerTurno = setTimeout(intentarMostrarTurnoActual, Math.round(delayMs));
  }

  // Primera entrada de la cola todavía sin mostrar (entregado: false), en
  // el mismo orden en que llegó de ArbatAgenda.getMensajes() (de lo más
  // próximo a lo más lejano en el tiempo).
  function proximoPendiente() {
    for (var i = 0; i < cola.length; i++) {
      if (!cola[i].entregado) return cola[i];
    }
    return null;
  }

  function intentarMostrarTurnoActual() {
    var pendiente = proximoPendiente();

    if (!pendiente) {
      // No hay nada pendiente ahora mismo: se vuelve a revisar más
      // adelante, por si refrescarMensajes() trae algo nuevo mientras
      // tanto.
      programarSiguienteTurno(resolverTiempo(CONFIG.pausaEntreMensajesMs));
      return;
    }

    if (typeof window.Raulito.decirSiLibre !== 'function') {
      // Falta aplicar el cambio en raulito.js todavía, así que no se
      // fuerza nada.
      programarSiguienteTurno(resolverTiempo(CONFIG.pausaEntreMensajesMs));
      return;
    }

    var duracion = duracionLectura(pendiente.texto);
    // decirSiLibre() es quien decide si es un buen momento: si Raúl está
    // jugando, agotado, oculto, o ya mostrando otro globo (propio o del
    // juego), devuelve false sin mostrar ni interrumpir nada.
    var seMostro = window.Raulito.decirSiLibre(pendiente.texto, duracion);

    if (seMostro) {
      // Recién acá, con el globo ya mostrado, se marca como entregado y
      // se guarda: así un refresh de página en el medio nunca hace que
      // este mensaje se reenvíe.
      pendiente.entregado = true;
      guardarCola();
      reintentosActuales = 0;
      // La pausa arranca a partir de que ESTE mensaje termine de
      // mostrarse: duracion (lo que va a durar en pantalla) más la pausa
      // en silencio configurada. Así un mensaje largo nunca se come la
      // pausa del siguiente.
      programarSiguienteTurno(duracion + resolverTiempo(CONFIG.pausaEntreMensajesMs));
      return;
    }

    // Ocupado (jugando o con otro globo activo): se reintenta pronto, sin
    // marcar el mensaje como entregado, para garantizar que se muestre
    // más adelante y no se pierda.
    reintentosActuales++;
    if (reintentosActuales >= CONFIG.maxReintentosPorTurno) {
      // Se deja de insistir tan seguido en este turno puntual, pero el
      // mensaje se queda pendiente en la cola: el próximo turno vuelve a
      // intentar con él (o con el que esté primero en ese momento).
      reintentosActuales = 0;
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

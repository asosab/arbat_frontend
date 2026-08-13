/**
 * ARBAT — Buddy/modules/says/sources/agenda.js
 * ---------------------------------------------------------------------------
 * Lee la agenda pública de Google Calendar de arbat (arbat.archery@gmail.com)
 * y genera, en memoria, un arreglo de mensajes (strings) para que el futuro
 * sistema de mensajería del sitio se los muestre a los visitantes.
 *
 * No requiere frameworks. Pensado para incluirse con:
 *   <script src="/Buddy/modules/says/sources/agenda.js" defer></script>
 * en cualquier página del sitio Jekyll (arbat_frontend) que necesite estos
 * mensajes. No se agrega a _layouts/default.html: no tiene sentido pedirle
 * la agenda a Google en cada página hasta que exista un componente que
 * muestre los mensajes; agregar el <script> donde ese componente viva.
 *
 * IMPORTANTE — por qué esto NO lee el .ics público directamente:
 * El feed .ics de Google Calendar (el feed .ics público)
 * no envía cabeceras CORS, así que un fetch() a calendar.google.com desde el
 * navegador es bloqueado por el navegador mismo (no es un límite de este
 * código, es una restricción del lado de Google). El único camino 100% del
 * lado del cliente, sin backend propio, es la API REST de Google Calendar
 * (www.googleapis.com/calendar/v3/...), que sí responde con CORS cuando la
 * llamada trae una API key.
 *
 * Uso típico desde otro script:
 *   <script>window.BuddyAgendaConfig.apiKey = 'AIza...';</script>
 *   <script src="/Buddy/modules/says/sources/agenda.js" defer></script>
 *   <script>
 *     window.BuddyInformSources.agenda.obtenerMensajes().then(function (mensajes) {
 *       // mensajes es un array de strings, ya ordenados de lo más
 *       // próximo a lo más lejano en el tiempo. Puede llegar vacío
 *       // (sin agenda disponible ahora mismo, o sin API key configurada).
 *     });
 *   </script>
 * ---------------------------------------------------------------------------
 */
(function (window, document) {
  'use strict';

  // ---------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------
  var CONFIG = {
    // Mismo calendario público que ya usan calendar-eventos-embed.html y
    // calendar_citas: tanto las citas reservadas (turnos ocupados) como los
    // eventos especiales (torneos, clínicas) viven en un único calendario.
    calendarId: "arbat.archery@gmail.com",

    // La API key NO vive en este archivo (no es secreta, pero conviene
    // poder rotarla sin tocar código versionado). Se define ANTES de cargar
    // este script con: window.BuddyAgendaConfig.apiKey = 'AIza...'
    // Debe estar restringida por referrer HTTP a los dominios del sitio.
    // Sin key configurada, getMensajes() resuelve un
    // array vacío y avisa por consola — no rompe la página.
    apiKey: (window.BuddyAgendaConfig && window.BuddyAgendaConfig.apiKey) || '',

    timezone: "America/La_Paz",

    // Cuántos días hacia adelante se consultan en cada llamada a la API.
    horizonteDias: 31,

    // SUPUESTO SIN CONFIRMAR: no hay un cupo máximo por turno documentado
    // en ningún lado del proyecto. Se puso 8 como placeholder (2 arqueros
    // por cada uno de los 4 campos de tiro). Ajustar a la cifra real antes
    // de usar esto en producción.
    capacidadPorTurno: 8,

    // Misma fuente que horarios.md e index.md (BuddyAgendaConfig.horarios en
    // la configuración interna de Buddy) — un solo lugar donde editar los horarios reales, este
    // script los reutiliza en vez de duplicarlos.
    horarios: [{"dias":"Lunes, miércoles y viernes","turnos":["16:00","18:00"],"duracion":"2 horas"},{"dias":"Sábados","turnos":["09:00–12:00","14:30–17:00"]}],

    // Un evento del calendario se trata como "evento especial" (mensaje
    // tipo 2) cuando su título contiene alguna de estas palabras. Cualquier
    // otro evento (ej. una cita reservada) cuenta como turno ocupado
    // (mensaje tipo 1). La convención de nombres que esto le pide al
    // calendario se detalla en la documentación del proyecto.
    palabrasClaveEventoEspecial: [
      'competencia', 'torneo', 'campeonato', 'clínica', 'clinica', 'evento especial'
    ]
  };
  // La API key la proporciona el sitio anfitrión. Los demás valores proceden
  // de la configuración real migrada desde la agenda original.
  if (window.BuddyAgendaConfig) {
    if (window.BuddyAgendaConfig.apiKey !== undefined) CONFIG.apiKey = window.BuddyAgendaConfig.apiKey;
    if (window.BuddyAgendaConfig.calendarId) CONFIG.calendarId = window.BuddyAgendaConfig.calendarId;
    if (window.BuddyAgendaConfig.timezone) CONFIG.timezone = window.BuddyAgendaConfig.timezone;
    if (window.BuddyAgendaConfig.horizonteDias != null) CONFIG.horizonteDias = window.BuddyAgendaConfig.horizonteDias;
    if (window.BuddyAgendaConfig.capacidadPorTurno != null) CONFIG.capacidadPorTurno = window.BuddyAgendaConfig.capacidadPorTurno;
    if (window.BuddyAgendaConfig.horarios) CONFIG.horarios = window.BuddyAgendaConfig.horarios;
    if (window.BuddyAgendaConfig.palabrasClaveEventoEspecial) CONFIG.palabrasClaveEventoEspecial = window.BuddyAgendaConfig.palabrasClaveEventoEspecial;
  }


  // ---------------------------------------------------------------------
  // Utilidades de fecha/hora en huso horario de Bolivia
  // ---------------------------------------------------------------------
  // Bolivia no tiene horario de verano (UTC-4 todo el año), así que sumar
  // milisegundos fijos para avanzar "un día" es seguro acá.
  var UN_DIA_MS = 24 * 60 * 60 * 1000;

  var DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  var DIA_EN_A_INDICE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var DIAS_ES_A_INDICE = {
    domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6
  };

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Devuelve los componentes de una fecha TAL COMO SE VEN en el huso
  // horario de Bolivia, sin importar en qué huso esté el navegador de quien
  // visita el sitio (crítico: un visitante desde otro país no debería ver
  // "esta tarde" calculado con su propia hora local).
  function partesBolivia(fecha) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.timezone,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    var partes = {};
    fmt.formatToParts(fecha).forEach(function (p) { partes[p.type] = p.value; });
    // Algunos motores devuelven "24" en vez de "00" para medianoche con
    // hour12:false.
    var hora = partes.hour === '24' ? 0 : parseInt(partes.hour, 10);
    return {
      diaSemana: DIA_EN_A_INDICE[partes.weekday],
      anio: parseInt(partes.year, 10),
      mes: parseInt(partes.month, 10), // 1-12
      dia: parseInt(partes.day, 10),
      hora: hora,
      minuto: parseInt(partes.minute, 10)
    };
  }

  function mismaFecha(a, b) {
    return a.anio === b.anio && a.mes === b.mes && a.dia === b.dia;
  }

  function horaAMinutos(horaStr) {
    var partes = horaStr.split(':');
    return parseInt(partes[0], 10) * 60 + (partes[1] ? parseInt(partes[1], 10) : 0);
  }

  function sumarHoras(horaStr, horas) {
    var totalMin = horaAMinutos(horaStr) + Math.round(horas * 60);
    totalMin = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
    return pad2(Math.floor(totalMin / 60)) + ':' + pad2(totalMin % 60);
  }

  // Primera fecha (a partir de "ahora", buscando hacia adelante dentro del
  // horizonte configurado) cuyo día de la semana en Bolivia coincide con el
  // buscado. incluirHoy=false empieza a buscar desde mañana.
  function proximaFechaConDiaSemana(ahora, diaSemanaObjetivo, incluirHoy) {
    var desde = incluirHoy ? 0 : 1;
    for (var i = desde; i <= CONFIG.horizonteDias; i++) {
      var candidata = new Date(ahora.getTime() + i * UN_DIA_MS);
      if (partesBolivia(candidata).diaSemana === diaSemanaObjetivo) return candidata;
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Horarios: de la forma cruda de la configuración interna de Buddy (texto libre en "dias", más
  // turnos como "16:00" o "09:00–12:00") a algo que el resto del script
  // pueda usar directamente.
  // ---------------------------------------------------------------------
  function normalizarHorarios(horariosCrudos) {
    return (horariosCrudos || []).map(function (bloque) {
      var textoDias = (bloque.dias || '').toLowerCase();
      var diasSemana = [];
      Object.keys(DIAS_ES_A_INDICE).forEach(function (nombre) {
        if (textoDias.indexOf(nombre) !== -1) {
          var indice = DIAS_ES_A_INDICE[nombre];
          if (diasSemana.indexOf(indice) === -1) diasSemana.push(indice);
        }
      });

      var duracionHoras = null;
      if (bloque.duracion) {
        var coincidencia = /(\d+(?:[.,]\d+)?)/.exec(bloque.duracion);
        if (coincidencia) duracionHoras = parseFloat(coincidencia[1].replace(',', '.'));
      }

      var turnos = (bloque.turnos || []).map(function (turnoStr) {
        // Separa tanto "-" como "–" (guion largo, el que usa el sábado en
        // la configuración interna de Buddy) para no depender de cuál tipeen.
        var partes = turnoStr.split(/[–-]/).map(function (s) { return s.trim(); });
        var inicio = partes[0];
        var fin = partes[1] || (duracionHoras ? sumarHoras(inicio, duracionHoras) : sumarHoras(inicio, 2));
        return { inicio: inicio, fin: fin };
      });

      return { diasSemana: diasSemana, turnos: turnos };
    });
  }

  // ---------------------------------------------------------------------
  // Google Calendar API
  // ---------------------------------------------------------------------
  function construirUrlEventos(ahora) {
    var timeMin = ahora.toISOString();
    var timeMax = new Date(ahora.getTime() + CONFIG.horizonteDias * UN_DIA_MS).toISOString();
    var base = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(CONFIG.calendarId) + '/events';
    var params = [
      'key=' + encodeURIComponent(CONFIG.apiKey),
      'timeMin=' + encodeURIComponent(timeMin),
      'timeMax=' + encodeURIComponent(timeMax),
      'singleEvents=true',
      'orderBy=startTime',
      'maxResults=250'
    ];
    return base + '?' + params.join('&');
  }

  // Devuelve un array de eventos si la consulta se hizo con éxito (aunque
  // esté vacío: un calendario sin nada agendado es información real), o
  // `null` si no se pudo consultar (sin API key, error de red, respuesta no
  // válida). Esa diferencia importa: getMensajes() usa `null` como señal de
  // "no sé si hay espacio" y en ese caso NO arma el mensaje de
  // disponibilidad, en vez de asumir que no hay reservas y afirmar algo que
  // no se pudo confirmar.
  function obtenerEventos(ahora) {
    if (!CONFIG.apiKey || CONFIG.apiKey === '') {
      if (window.console) {
        console.warn(
          '[ArbatAgenda] Falta configurar window.BuddyAgendaConfig.apiKey (API key ' +
          'de Google Calendar). No se generarán mensajes de agenda.'
        );
      }
      return Promise.resolve(null);
    }

    return fetch(construirUrlEventos(ahora))
      .then(function (respuesta) {
        if (!respuesta.ok) {
          if (window.console) {
            console.warn('[ArbatAgenda] Google Calendar API respondió ' + respuesta.status + '.');
          }
          return null;
        }
        return respuesta.json();
      })
      .then(function (datos) {
        if (datos === null) return null;
        return (datos.items || []).filter(function (evento) {
          return evento.status !== 'cancelled';
        });
      })
      .catch(function (error) {
        if (window.console) {
          console.warn('[ArbatAgenda] No se pudo leer la agenda de Google Calendar.', error);
        }
        return null;
      });
  }

  function esEventoEspecial(evento) {
    var titulo = (evento.summary || '').toLowerCase();
    return CONFIG.palabrasClaveEventoEspecial.some(function (palabra) {
      return titulo.indexOf(palabra) !== -1;
    });
  }

  // ---------------------------------------------------------------------
  // Mensajes tipo 1 — disponibilidad de turnos regulares
  // ---------------------------------------------------------------------
  function contarReservasEnTurno(eventosRegulares, fechaObjetivo, turno) {
    var inicioMin = horaAMinutos(turno.inicio);
    var finMin = horaAMinutos(turno.fin);
    var contador = 0;

    eventosRegulares.forEach(function (evento) {
      var inicioCrudo = evento.start && (evento.start.dateTime || evento.start.date);
      if (!inicioCrudo) return;
      var partesEvento = partesBolivia(new Date(inicioCrudo));
      if (!mismaFecha(partesEvento, fechaObjetivo)) return;
      var minutosEvento = partesEvento.hora * 60 + partesEvento.minuto;
      if (minutosEvento >= inicioMin && minutosEvento < finMin) contador++;
    });

    return contador;
  }

  // Hay espacio en un bloque de horario (weekday) en una fecha dada si al
  // menos uno de sus turnos no empezó todavía y no llegó al cupo.
  function hayEspacioEnBloque(eventosRegulares, fechaObjetivo, bloque, minutosDesde) {
    return bloque.turnos.some(function (turno) {
      if (minutosDesde !== null && horaAMinutos(turno.inicio) <= minutosDesde) return false;
      return contarReservasEnTurno(eventosRegulares, fechaObjetivo, turno) < CONFIG.capacidadPorTurno;
    });
  }

  // Busca la próxima fecha con espacio para UN día de la semana puntual
  // (no para todo el bloque). Esto es lo que permite que lunes, miércoles y
  // viernes generen cada uno su propio mensaje aunque compartan turnos y
  // vivan en el mismo bloque de horariosNormalizados.
  function proximaFechaConEspacioParaDia(eventosRegulares, ahora, diaSemanaObjetivo, turnos, minutosAhora) {
    for (var i = 0; i <= CONFIG.horizonteDias; i++) {
      var candidata = new Date(ahora.getTime() + i * UN_DIA_MS);
      var partesCandidata = partesBolivia(candidata);
      if (partesCandidata.diaSemana !== diaSemanaObjetivo) continue;

      var minutosDesde = (i === 0) ? minutosAhora : null;
      if (hayEspacioEnBloque(eventosRegulares, partesCandidata, { turnos: turnos }, minutosDesde)) {
        return { fecha: candidata, partes: partesCandidata, esHoy: i === 0 };
      }
    }
    return null;
  }

  function mensajesDisponibilidad(eventosRegulares, horariosNormalizados, ahora) {
    var resultados = [];
    var partesAhora = partesBolivia(ahora);
    var minutosAhora = partesAhora.hora * 60 + partesAhora.minuto;

    horariosNormalizados.forEach(function (bloque) {
      bloque.diasSemana.forEach(function (diaSemanaObjetivo) {
        var proxima = proximaFechaConEspacioParaDia(
          eventosRegulares, ahora, diaSemanaObjetivo, bloque.turnos, minutosAhora
        );
        if (!proxima) return;

        var mensaje;
        if (proxima.esHoy) {
          mensaje = proxima.partes.diaSemana === 6
            ? 'Aún quedan espacios disponibles en el entrenamiento de este sábado, recuerda reservar con tiempo'
            : 'Aún quedan espacios disponibles para el entrenamiento de esta tarde, recuerda reservar con tiempo';
        } else {
          var fechaTexto = DIAS_ES[proxima.partes.diaSemana] + ' ' + proxima.partes.dia +
            ' de ' + MESES_ES[proxima.partes.mes - 1];
          mensaje = 'Aún quedan espacios disponibles para el próximo entrenamiento, el ' +
            fechaTexto + ', recuerda reservar con tiempo';
        }

        resultados.push({ fecha: proxima.fecha, mensaje: mensaje });
      });
    });

    return resultados;
  }

  // ---------------------------------------------------------------------
  // Mensajes tipo 2 — eventos especiales (competencias, torneos, clínicas)
  // ---------------------------------------------------------------------
  function mensajesEventosEspeciales(eventosEspeciales) {
    var resultados = [];

    eventosEspeciales.forEach(function (evento) {
      var inicioCrudo = evento.start && (evento.start.dateTime || evento.start.date);
      if (!inicioCrudo) return;

      var fecha = new Date(inicioCrudo);
      var partes = partesBolivia(fecha);
      var fechaTexto = DIAS_ES[partes.diaSemana] + ' ' + partes.dia + ' de ' + MESES_ES[partes.mes - 1];

      // Eventos de "todo el día" (evento.start.date, sin dateTime) no traen
      // hora — se omite esa parte del mensaje en vez de inventar un horario.
      var tieneHora = !!(evento.start && evento.start.dateTime);
      var horaTexto = tieneHora ? (pad2(partes.hora) + ':' + pad2(partes.minuto)) : null;
      var lugar = evento.location ? evento.location.trim() : null;

      // El título del evento se usa tal cual está escrito en el calendario:
      // conviene redactarlo ya listo para encajar en la frase, ej. "la
      // competencia interdepartamental" en vez de
      // "Competencia Interdepartamental 2026".
      var titulo = (evento.summary || 'un evento especial').trim();

      var mensaje = 'El ' + fechaTexto + ' tendremos ' + titulo;
      if (lugar) mensaje += ', en ' + lugar;
      if (horaTexto) mensaje += ' a las ' + horaTexto;

      resultados.push({ fecha: fecha, mensaje: mensaje });
    });

    return resultados;
  }

  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  // Devuelve una Promise que resuelve a un array de strings (los mensajes),
  // ordenados de lo más próximo a lo más lejano en el tiempo. En cualquier
  // escenario de error (sin API key, falla de red, calendario vacío)
  // resuelve un array vacío en vez de rechazar la Promise, para que quien
  // lo consuma no necesite un catch() propio.
  function getMensajes() {
    var ahora = new Date();

    return obtenerEventos(ahora).then(function (eventos) {
      if (eventos === null) return []; // no se pudo confirmar la agenda real: no se afirma nada

      var especiales = eventos.filter(esEventoEspecial);
      var regulares = eventos.filter(function (evento) { return !esEventoEspecial(evento); });
      var horariosNormalizados = normalizarHorarios(CONFIG.horarios);

      var disponibilidad = mensajesDisponibilidad(regulares, horariosNormalizados, ahora);
      var eventosEspecialesMsgs = mensajesEventosEspeciales(especiales);

      var todos = disponibilidad.concat(eventosEspecialesMsgs);
      todos.sort(function (a, b) { return a.fecha.getTime() - b.fecha.getTime(); });

      return todos.map(function (item) { return item.mensaje; });
    });
  }

  window.BuddyInformSources = window.BuddyInformSources || {};

  window.BuddyInformSources['agenda'] = {
    obtenerMensajes: getMensajes,
    _CONFIG: CONFIG
  };
})(window, document);

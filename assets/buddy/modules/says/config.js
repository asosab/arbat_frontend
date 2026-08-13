/**
 * Buddy Says — configuración de fuentes.
 *
 * Este archivo es el punto de configuración del módulo /says.
 * Aquí se decide qué fuentes se cargan y cómo se utiliza cada listado.
 *
 * selection:
 *   - 'sequential' : recorre el listado en orden.
 *   - 'shuffle'    : selecciona aleatoriamente.
 *
 * recurrence: máximo de veces que un mismo mensaje puede aparecer por día.
 * frequency: intervalo mínimo/máximo, en minutos, entre intentos de esa fuente.
 */
window.BuddySaysConfig = window.BuddySaysConfig || {};
// Tiempo visible del globo. Se calcula automáticamente según el largo del texto.
// Puedes ajustar estos valores sin tocar buddy_says.js.
window.BuddySaysConfig.display = {
  baseMs: 2800,
  minMs: 2800,
  maxMs: 9000,
  charsPerSecond: 10,
  extraMs: 500
};

window.BuddySaysConfig.sources = [
  {
    id: 'agenda',
    enabled: true,
    selection: 'sequential',
    recurrence: 1,
    frequency: { min: 1, max: 4 }
  },
  {
    id: 'consejos',
    enabled: true,
    selection: 'shuffle',
    recurrence: 2,
    frequency: { min: 1, max: 1 }
  }
];

// Configuración de la fuente agenda. La API key se deja vacía para que el
// sitio anfitrión la complete.
window.BuddyAgendaConfig = Object.assign({
  calendarId: 'arbat.archery@gmail.com',
  timezone: 'America/La_Paz',
  apiKey: 'AIzaSyDnoPb09RbigaWadj1ssOLYN-7IL5WSIgg',
  horizonteDias: 31,
  capacidadPorTurno: 8,
  horarios: [
    {
      dias: 'Lunes, miércoles y viernes',
      turnos: ['16:00–18:00', '18:00–20:00'],
      duracion: '2 horas'
    },
    {
      dias: 'Sábados',
      turnos: ['09:00–12:00', '14:30–17:00']
    }
  ],
  palabrasClaveEventoEspecial: [
    'competencia',
    'torneo',
    'campeonato',
    'clínica',
    'clinica',
    'evento especial'
  ]
}, window.BuddyAgendaConfig || {});

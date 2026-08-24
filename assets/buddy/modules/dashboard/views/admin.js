/**
 * Buddy Dashboard — vista admin.
 *
 * Esta vista es deliberadamente una capa de presentación:
 * - no hace peticiones HTTP;
 * - no calcula métricas comerciales;
 * - consume el contrato estructurado entregado por Buddy.dashboard;
 * - puede ser sustituida posteriormente por views/user.js,
 *   views/supervaca.js, etc.
 */
window.Buddy = window.Buddy || {};
window.BuddyDashboardViews = window.BuddyDashboardViews || {};

(function (window, document) {
  'use strict';

  var STYLE_ID = 'buddy-dashboard-admin-style';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    var number = Number(value);
    if (!isFinite(number)) return '0';
    return number.toLocaleString('es-BO');
  }

  function formatPercent(value) {
    var number = Number(value);
    if (!isFinite(number)) return '0%';
    return number.toLocaleString('es-BO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }) + '%';
  }

  function formatChange(value, percentagePoints) {
    var number = Number(value);
    if (!isFinite(number) || number === 0) return '—';

    var sign = number > 0 ? '↑ ' : '↓ ';
    var suffix = percentagePoints ? ' pp' : '%';
    return sign + Math.abs(number).toLocaleString('es-BO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }) + suffix;
  }

  function metricValue(metric, formatter) {
    metric = metric || {};
    return (formatter || formatNumber)(metric.value);
  }

  function metricCard(title, metric, formatter) {
    metric = metric || {};
    return '<article class="buddy-dashboard-card">' +
      '<div class="buddy-dashboard-card__label">' + escapeHtml(title) + '</div>' +
      '<div class="buddy-dashboard-card__value">' + metricValue(metric, formatter) + '</div>' +
      '<div class="buddy-dashboard-card__change">' +
        escapeHtml(formatChange(metric.change, formatter === formatPercent)) +
      '</div>' +
      (metric.projection != null
        ? '<div class="buddy-dashboard-card__projection">Proyección ' +
            escapeHtml((formatter || formatNumber)(metric.projection)) +
          '</div>'
        : '') +
      '</article>';
  }

  function formatDuration(value) {
    var seconds = Number(value);
    if (!isFinite(seconds) || seconds <= 0) return '0 s';
    if (seconds < 60) return Math.round(seconds) + ' s';
    var minutes = Math.floor(seconds / 60);
    var rest = Math.round(seconds % 60);
    return minutes + 'm ' + rest + 's';
  }

  function lowSampleTag(entry) {
    return (entry && entry.lowSample)
      ? ' <span class="buddy-dashboard-lowsample">muestra baja</span>'
      : '';
  }

  // Tarjeta que compara dos tasas de conversión (p.ej. jugó vs no jugó),
  // cada una con su propio tamaño de muestra visible junto al número.
  function comparisonCard(title, a, b, labelA, labelB) {
    a = a || {};
    b = b || {};
    return '<article class="buddy-dashboard-card">' +
      '<div class="buddy-dashboard-card__label">' + escapeHtml(title) + '</div>' +
      '<div class="buddy-dashboard-card__value">' +
        formatPercent(a.conversionRate) +
        ' <span style="font-size:.85rem;font-weight:400;color:#5f6368">vs</span> ' +
        formatPercent(b.conversionRate) +
      '</div>' +
      '<div class="buddy-dashboard-card__samples">' +
        '<span>' + escapeHtml(labelA) + ': n=' + formatNumber(a.n) + lowSampleTag(a) + '</span>' +
        '<span>' + escapeHtml(labelB) + ': n=' + formatNumber(b.n) + lowSampleTag(b) + '</span>' +
      '</div>' +
    '</article>';
  }

  function durationCard(title, entry) {
    entry = entry || {};
    return '<article class="buddy-dashboard-card">' +
      '<div class="buddy-dashboard-card__label">' + escapeHtml(title) + '</div>' +
      '<div class="buddy-dashboard-card__value">' + formatDuration(entry.value) + '</div>' +
      '<div class="buddy-dashboard-card__samples">' +
        '<span>n=' + formatNumber(entry.n) + lowSampleTag(entry) + '</span>' +
      '</div>' +
    '</article>';
  }

  // Tabla propia (no listRows) porque necesita insertar la etiqueta de
  // muestra baja como HTML dentro de la celda, y listRows escapa todo valor.
  function conversionByLevelTable(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="buddy-dashboard-muted">Sin datos en este período.</div>';
    }

    return '<div class="buddy-dashboard-table-wrap"><table>' +
      '<thead><tr><th>Nivel</th><th>Actores</th><th>Conversión a WhatsApp</th></tr></thead><tbody>' +
      items.map(function (item) {
        item = item || {};
        return '<tr>' +
          '<td>' + escapeHtml(item.label || item.level || '—') + '</td>' +
          '<td>' + formatNumber(item.n) + '</td>' +
          '<td>' + formatPercent(item.conversionRate) + lowSampleTag(item) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function section(title, body, className) {
    return '<section class="buddy-dashboard-section ' + (className || '') + '">' +
      '<h2>' + escapeHtml(title) + '</h2>' +
      body +
      '</section>';
  }

  function listRows(items, columns) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="buddy-dashboard-muted">Sin datos en este período.</div>';
    }

    return '<div class="buddy-dashboard-table-wrap"><table>' +
      '<thead><tr>' +
      columns.map(function (column) {
        return '<th>' + escapeHtml(column.label) + '</th>';
      }).join('') +
      '</tr></thead><tbody>' +
      items.slice(0, 10).map(function (item) {
        return '<tr>' +
          columns.map(function (column) {
            var value = typeof column.value === 'function'
              ? column.value(item)
              : item[column.value];
            return '<td>' + escapeHtml(value == null ? '—' : value) + '</td>';
          }).join('') +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.buddy-dashboard{max-width:1280px;margin:0 auto;padding:24px 28px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#202124;background:#fff}' +
      '.buddy-dashboard *{box-sizing:border-box}' +
      '.buddy-dashboard__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px}' +
      '.buddy-dashboard__eyebrow{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#70757a;margin-bottom:5px}' +
      '.buddy-dashboard__title{margin:0;font-size:1.8rem;line-height:1.2}' +
      '.buddy-dashboard__site{margin-top:6px;color:#5f6368}' +
      '.buddy-dashboard__controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}' +
      '.buddy-dashboard__period{font-size:.9rem;color:#5f6368;text-align:right}' +
      '.buddy-dashboard button{border:1px solid #d0d4d9;background:#fff;border-radius:8px;padding:9px 13px;font:inherit;cursor:pointer}' +
      '.buddy-dashboard button:hover{background:#f6f7f8}' +
      '.buddy-dashboard button:disabled{opacity:.55;cursor:wait}' +
      '.buddy-dashboard-section{margin-top:30px}' +
      '.buddy-dashboard-section>h2{font-size:1rem;text-transform:uppercase;letter-spacing:.06em;margin:0 0 13px}' +
      '.buddy-dashboard-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}' +
      '.buddy-dashboard-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}' +
      '.buddy-dashboard-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '.buddy-dashboard-card,.buddy-dashboard-panel{border:1px solid #e2e5e9;border-radius:12px;padding:18px;background:#fff}' +
      '.buddy-dashboard-card__label{font-size:.82rem;color:#5f6368;text-transform:uppercase;letter-spacing:.04em}' +
      '.buddy-dashboard-card__value{font-size:2rem;font-weight:650;line-height:1.15;margin-top:7px}' +
      '.buddy-dashboard-card__change{font-size:.9rem;margin-top:7px;color:#176b36}' +
      '.buddy-dashboard-card__projection{font-size:.78rem;color:#777;margin-top:7px}' +
      '.buddy-dashboard-card__samples{font-size:.78rem;color:#777;margin-top:7px;display:flex;gap:10px;flex-wrap:wrap}' +
      '.buddy-dashboard-lowsample{font-size:.72rem;color:#9a6b12;background:#fdf3e0;padding:1px 6px;border-radius:5px}' +
      '.buddy-dashboard-panel__title{font-weight:650;margin-bottom:14px}' +
      '.buddy-dashboard-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
      '.buddy-dashboard-mini{padding:12px;border-radius:9px;background:#f7f8f9}' +
      '.buddy-dashboard-mini__label{font-size:.8rem;color:#666}' +
      '.buddy-dashboard-mini__value{font-size:1.35rem;font-weight:650;margin-top:3px}' +
      '.buddy-dashboard-funnel{display:flex;align-items:stretch;gap:6px;overflow:auto}' +
      '.buddy-dashboard-funnel__item{flex:1;min-width:125px;padding:15px;background:#f7f8f9;border-radius:9px}' +
      '.buddy-dashboard-funnel__label{font-size:.78rem;color:#666}' +
      '.buddy-dashboard-funnel__value{font-size:1.45rem;font-weight:650;margin-top:4px}' +
      '.buddy-dashboard-table-wrap{overflow:auto}' +
      '.buddy-dashboard table{width:100%;border-collapse:collapse;font-size:.9rem}' +
      '.buddy-dashboard th,.buddy-dashboard td{text-align:left;padding:10px 8px;border-bottom:1px solid #eceff1;white-space:nowrap}' +
      '.buddy-dashboard th{font-weight:600;color:#5f6368}' +
      '.buddy-dashboard-muted{padding:18px 0;color:#777}' +
      '.buddy-dashboard-status{padding:18px;border:1px solid #e2e5e9;border-radius:12px;color:#5f6368}' +
      '.buddy-dashboard-status--error{color:#8a1c1c}' +
      '.buddy-dashboard-skeleton{height:100px;border-radius:12px;background:linear-gradient(90deg,#f2f3f4,#fafafa,#f2f3f4);background-size:200% 100%;animation:buddy-dashboard-loading 1.3s infinite}' +
      '@keyframes buddy-dashboard-loading{from{background-position:200% 0}to{background-position:-200% 0}}' +
      '@media(max-width:900px){.buddy-dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.buddy-dashboard__header{flex-direction:column}.buddy-dashboard__controls{justify-content:flex-start}.buddy-dashboard__period{text-align:left}}' +
      '@media(max-width:600px){.buddy-dashboard{padding:18px 14px}.buddy-dashboard-grid,.buddy-dashboard-grid--2,.buddy-dashboard-grid--3{grid-template-columns:1fr}.buddy-dashboard__title{font-size:1.45rem}.buddy-dashboard-funnel{display:grid;grid-template-columns:1fr 1fr}}';

    document.head.appendChild(style);
  }

  function renderLoading(target, config) {
    ensureStyles();
    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<div class="buddy-dashboard__header">' +
          '<div><div class="buddy-dashboard__eyebrow">BUDDY</div>' +
          '<h1 class="buddy-dashboard__title">Dashboard</h1></div>' +
        '</div>' +
        '<div class="buddy-dashboard-grid">' +
          '<div class="buddy-dashboard-skeleton"></div>' +
          '<div class="buddy-dashboard-skeleton"></div>' +
          '<div class="buddy-dashboard-skeleton"></div>' +
          '<div class="buddy-dashboard-skeleton"></div>' +
        '</div>' +
      '</div>';
  }

  function renderError(target, error, refresh) {
    ensureStyles();
    var message = error && error.data && error.data.error
      ? error.data.error
      : (error && error.message) || 'No pudimos actualizar las métricas.';

    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<div class="buddy-dashboard-status buddy-dashboard-status--error">' +
          '<strong>No pudimos actualizar las métricas.</strong>' +
          '<div>' + escapeHtml(message) + '</div>' +
          '<button type="button" data-dashboard-retry style="margin-top:12px">Intentar nuevamente</button>' +
        '</div>' +
      '</div>';

    var button = target.querySelector('[data-dashboard-retry]');
    if (button) {
      button.addEventListener('click', function () {
        button.disabled = true;
        Promise.resolve(refresh()).catch(function () {}).finally(function () {
          button.disabled = false;
        });
      });
    }
  }

  function renderEmpty(target) {
    ensureStyles();
    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<div class="buddy-dashboard-status">' +
          'Todavía no hay suficiente actividad para mostrar este período.' +
        '</div>' +
      '</div>';
  }

  function renderDashboard(args) {
    var target = args.target;
    var data = args.data;
    var state = args.state;
    var config = args.config || {};

    if (state.loading && !data) {
      renderLoading(target, config);
      return;
    }

    if (state.error && !data) {
      renderError(target, state.error, args.refresh);
      return;
    }

    if (!data) {
      renderEmpty(target);
      return;
    }

    ensureStyles();

    var site = data.site || {};
    var period = data.period || args.period || {};
    var current = period.current || {};
    var previous = period.previous || {};
    var audience = data.audience || {};
    var engagement = data.engagement || {};
    var intent = data.intent || {};
    var whatsapp = intent.whatsapp || {};
    var funnel = data.funnel || {};
    var acquisition = data.acquisition || {};
    var technology = data.technology || {};
    var archeryConversion = data.archeryConversion || {};

    var summary =
      '<div class="buddy-dashboard-grid">' +
        metricCard('Visitantes', audience.visitors || audience.anonymous, formatNumber) +
        metricCard('Identificados', audience.registered, formatNumber) +
        metricCard('Engagement', engagement.engagedUsers || engagement.engagementRate, formatPercent) +
        metricCard('Intención', whatsapp.uniqueUsers || whatsapp.clicks, formatNumber) +
      '</div>';

    var registered =
      '<div class="buddy-dashboard-panel">' +
        '<div class="buddy-dashboard-panel__title">Registrados</div>' +
        '<div class="buddy-dashboard-mini-grid">' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Total</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.registered) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Nuevos</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.newUsers) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Activos</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.activeUsers) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Recurrentes</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.returningUsers) + '</div></div>' +
        '</div>' +
      '</div>';

    var anonymous =
      '<div class="buddy-dashboard-panel">' +
        '<div class="buddy-dashboard-panel__title">Visitantes anónimos</div>' +
        '<div class="buddy-dashboard-mini-grid">' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Visitantes</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.anonymous) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Sesiones</div><div class="buddy-dashboard-mini__value">' +
            metricValue(engagement.sessions) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Eventos</div><div class="buddy-dashboard-mini__value">' +
            metricValue(engagement.events) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">Identificación</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.identificationRate, formatPercent) + '</div></div>' +
        '</div>' +
      '</div>';

    var engagementHtml =
      '<div class="buddy-dashboard-grid buddy-dashboard-grid--3">' +
        metricCard('Sesiones', engagement.sessions) +
        metricCard('Usuarios activos', engagement.activeUsers) +
        metricCard('Usuarios comprometidos', engagement.engagedUsers) +
      '</div>' +
      '<div class="buddy-dashboard-status" style="margin-top:12px">' +
        'Sesiones por usuario: <strong>' + escapeHtml(metricValue(engagement.sessionsPerUser)) +
        '</strong> · Eventos por sesión: <strong>' + escapeHtml(metricValue(engagement.eventsPerSession)) + '</strong>' +
      '</div>';

    var whatsappHtml =
      '<div class="buddy-dashboard-grid buddy-dashboard-grid--3">' +
        metricCard('Clicks WhatsApp', whatsapp.clicks) +
        metricCard('Usuarios únicos', whatsapp.uniqueUsers) +
        metricCard('Conversión', whatsapp.conversionRate, formatPercent) +
      '</div>';

    var funnelKeys = [
      ['visitors', 'Visitantes'],
      ['identified', 'Identificados'],
      ['active', 'Activos'],
      ['engaged', 'Comprometidos'],
      ['intent', 'Intención'],
      ['conversions', 'Conversiones']
    ];

    var funnelHtml =
      '<div class="buddy-dashboard-funnel">' +
      funnelKeys.map(function (item) {
        return '<div class="buddy-dashboard-funnel__item">' +
          '<div class="buddy-dashboard-funnel__label">' + escapeHtml(item[1]) + '</div>' +
          '<div class="buddy-dashboard-funnel__value">' + metricValue(funnel[item[0]]) + '</div>' +
        '</div>';
      }).join('') +
      '</div>';

    /*
     * Las tres secciones siguientes consumen colecciones que vienen de la API
     * con una forma distinta a las métricas simples:
     *   - activities.users/sessions son métricas { value, ... }
     *     y sus métricas específicas viven en activity.activity.
     *   - acquisition.topReferrers usa source/percentage.
     *   - technology.* usa percentage.
     *
     * No debemos pasar esos objetos directamente a Number(): Number({}) === NaN
     * y la vista terminaba mostrando 0%. Aquí adaptamos exclusivamente la
     * presentación al contrato real de la API.
     */
    function collectionMetricValue(metric, fallback) {
      if (metric && typeof metric === 'object' && metric.value != null) {
        return metric.value;
      }
      if (metric != null && typeof metric !== 'object') {
        return metric;
      }
      return fallback == null ? 0 : fallback;
    }

    function collectionPercentValue(item) {
      if (!item) return 0;
      if (item.percentage != null) return item.percentage;
      if (item.share != null) return item.share;
      if (item.rate != null) return item.rate;
      if (item.value != null && typeof item.value !== 'object') return item.value;
      return 0;
    }

    var activitiesHtml = Array.isArray(data.activities) && data.activities.length
      ? '<div class="buddy-dashboard-grid buddy-dashboard-grid--2">' +
          data.activities.slice(0, 6).map(function (activity) {
            var activityMetrics = activity.activity || {};
            var users = collectionMetricValue(activity.users, activity.userCount);
            var sessions = collectionMetricValue(activity.sessions, null);
            var games = collectionMetricValue(activity.games, activityMetrics.games);
            var arrows = collectionMetricValue(activity.arrows, activityMetrics.arrows);
            var activeSeconds = collectionMetricValue(activity.activeSeconds, activityMetrics.activeSeconds);
            var score = collectionMetricValue(activity.score, activityMetrics.score);

            return '<div class="buddy-dashboard-panel">' +
              '<div class="buddy-dashboard-panel__title">' + escapeHtml(activity.name || activity.label || activity.module || 'Actividad') + '</div>' +
              '<div>' +
                escapeHtml(formatNumber(users)) + ' usuarios' +
                (sessions != null ? ' · ' + escapeHtml(formatNumber(sessions)) + ' sesiones' : '') +
                (games != null ? ' · ' + escapeHtml(formatNumber(games)) + ' partidas' : '') +
              '</div>' +
              ((arrows != null || activeSeconds != null || score != null) ? '<div style="margin-top:8px;color:#5f6368">' +
                (arrows != null ? escapeHtml(formatNumber(arrows)) + ' flechas' : '') +
                (activeSeconds != null ? (arrows != null ? ' · ' : '') + escapeHtml(formatNumber(activeSeconds)) + ' s activos' : '') +
                (score != null ? ((arrows != null || activeSeconds != null) ? ' · ' : '') + escapeHtml(formatNumber(score)) + ' puntos' : '') +
              '</div>' : '') +
              (activity.ctaConversion ? '<div style="margin-top:8px">Conversión asistida: <strong>' +
                escapeHtml(formatPercent(activity.ctaConversion.value != null ? activity.ctaConversion.value : activity.ctaConversion)) +
                '</strong></div>' : '') +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="buddy-dashboard-muted">Sin actividad específica en este período.</div>';

    var acquisitionHtml = listRows(acquisition.topReferrers, [
      { label: 'Fuente', value: function (item) {
          return item.source || item.label || item.name || item.referrer || '—';
        } },
      { label: 'Visitantes', value: function (item) {
          return formatNumber(item.visitors != null ? item.visitors : item.value);
        } },
      { label: 'Participación', value: function (item) {
          return formatPercent(collectionPercentValue(item));
        } }
    ]);

    var technologyHtml =
      '<div class="buddy-dashboard-grid buddy-dashboard-grid--2">' +
        '<div class="buddy-dashboard-panel"><div class="buddy-dashboard-panel__title">Dispositivos</div>' +
          listRows(technology.devices, [
            { label: 'Dispositivo', value: function (item) { return item.label || item.name || item.key; } },
            { label: '%', value: function (item) { return formatPercent(collectionPercentValue(item)); } }
          ]) +
        '</div>' +
        '<div class="buddy-dashboard-panel"><div class="buddy-dashboard-panel__title">Navegadores</div>' +
          listRows(technology.browsers, [
            { label: 'Navegador', value: function (item) { return item.label || item.name || item.key; } },
            { label: '%', value: function (item) { return formatPercent(collectionPercentValue(item)); } }
          ]) +
        '</div>' +
      '</div>';

    // Cruce archery ↔ WhatsApp: demuestra si el minijuego canaliza hacia el
    // CTA. Si el backend todavía no envía este bloque (versión previa de la
    // API), se omite la sección en vez de mostrar tarjetas vacías.
    var hasArcheryConversion = archeryConversion.playedVsNotPlayed ||
      archeryConversion.identifiedVsAnonymous ||
      archeryConversion.avgSecondsBeforeClick ||
      (Array.isArray(archeryConversion.conversionByPlayLevel) && archeryConversion.conversionByPlayLevel.length);

    var archeryConversionHtml = hasArcheryConversion
      ? '<div class="buddy-dashboard-grid buddy-dashboard-grid--3">' +
          comparisonCard(
            'Conversión: jugó vs no jugó',
            archeryConversion.playedVsNotPlayed && archeryConversion.playedVsNotPlayed.played,
            archeryConversion.playedVsNotPlayed && archeryConversion.playedVsNotPlayed.notPlayed,
            'Jugó', 'No jugó'
          ) +
          comparisonCard(
            'Conversión: registrado vs anónimo',
            archeryConversion.identifiedVsAnonymous && archeryConversion.identifiedVsAnonymous.identified,
            archeryConversion.identifiedVsAnonymous && archeryConversion.identifiedVsAnonymous.anonymous,
            'Registrado', 'Anónimo'
          ) +
          durationCard('Tiempo medio jugando antes del click', archeryConversion.avgSecondsBeforeClick) +
        '</div>' +
        '<div style="margin-top:14px">' +
          '<div class="buddy-dashboard-panel__title" style="margin-bottom:10px">Conversión por nivel de juego</div>' +
          conversionByLevelTable(archeryConversion.conversionByPlayLevel) +
        '</div>'
      : '<div class="buddy-dashboard-muted">Sin datos suficientes en este período.</div>';

    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<header class="buddy-dashboard__header">' +
          '<div>' +
            '<div class="buddy-dashboard__eyebrow">BUDDY</div>' +
            '<h1 class="buddy-dashboard__title">Dashboard</h1>' +
            '<div class="buddy-dashboard__site">' +
              escapeHtml(config.labels && config.labels.site || 'Mi sitio') + ': ' +
              '<strong>' + escapeHtml(site.name || site.siteId || '—') + '</strong>' +
            '</div>' +
          '</div>' +
          '<div class="buddy-dashboard__controls">' +
            '<div class="buddy-dashboard__period">' +
              escapeHtml(config.labels && config.labels.period
                ? config.labels.period.replace('{days}', current.days || 30)
                : 'Últimos ' + (current.days || 30) + ' días') +
              '<br>' + escapeHtml(current.from || '—') + ' — ' + escapeHtml(current.to || '—') +
              (previous.from ? '<br><small>Comparado con: ' + escapeHtml(previous.from) + ' — ' + escapeHtml(previous.to) + '</small>' : '') +
            '</div>' +
            '<button type="button" data-dashboard-refresh>Actualizar ↻</button>' +
          '</div>' +
        '</header>' +

        section('Resumen', summary) +
        section('Audiencia', '<div class="buddy-dashboard-grid buddy-dashboard-grid--2">' + registered + anonymous + '</div>') +
        section('Engagement', engagementHtml) +
        section('Acciones de valor', whatsappHtml) +
        section('Embudo', funnelHtml) +
        section('Actividades', activitiesHtml) +
        section('Archery → WhatsApp', archeryConversionHtml) +
        section('Adquisición', acquisitionHtml) +
        section('Tecnología', technologyHtml) +
      '</div>';

    var refreshButton = target.querySelector('[data-dashboard-refresh]');
    if (refreshButton) {
      refreshButton.addEventListener('click', function () {
        refreshButton.disabled = true;
        Promise.resolve(args.refresh()).catch(function () {}).finally(function () {
          refreshButton.disabled = false;
        });
      });
    }
  }

  window.BuddyDashboardViews.admin = renderDashboard;
})(window, document);

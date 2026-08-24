/**
 * Buddy Dashboard — servicio y orquestador de datos.
 *
 * No utiliza fetch() directamente. Todas las peticiones cross-domain pasan
 * por Buddy Telemetry, igual que los demás módulos Buddy.
 *
 * API pública:
 *   Buddy.dashboard.get(options)
 *   Buddy.dashboard.refresh()
 *   Buddy.dashboard.render(options)
 *   Buddy.dashboard.setView(viewId, options)
 *   Buddy.dashboard.getState()
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyDashboardConfig || {};

  var state = {
    initialized: false,
    loading: false,
    error: null,
    data: null,
    period: null,
    view: CONFIG.view && CONFIG.view.defaultView || 'admin',
    target: null,
    requestId: 0,
    memoryCache: {}
  };

  function debugLog() {
    if (!window.BuddyConfig ||
        (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Dashboard]');
    console.log.apply(console, args);
  }

  function getSiteId() {
    var siteId = window.BuddyConfig &&
      window.BuddyConfig.app &&
      window.BuddyConfig.app.siteId;
    return siteId ? String(siteId).trim().toLowerCase() : null;
  }

  function getAccessToken() {
    if (window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function') {
      return window.Buddy.auth.getAccessToken();
    }
    return null;
  }

  function getTelemetry() {
    if (!window.Buddy.telemetry ||
        typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function configureApi() {
    var telemetry = getTelemetry();

    if (typeof telemetry.configureApi !== 'function') {
      throw new Error('Buddy Telemetry no permite configurar APIs.');
    }

    telemetry.configureApi(CONFIG.apiService || 'dashboard', {
      baseUrl: CONFIG.apiBaseUrl,
      get: CONFIG.endpoints && CONFIG.endpoints.get
    });

    return telemetry;
  }

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function formatDate(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function addDays(date, amount) {
    var result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + amount);
    return result;
  }

  /**
   * Construye el período solicitado por el frontend.
   *
   * "Últimos 30 días" se representa como 30 días calendario incluyendo hoy.
   * El backend debe usar estas fechas para filtrar primero por siteId y período.
   */
  function buildPeriod(days) {
    days = Math.max(1, Number(days || (CONFIG.period && CONFIG.period.days) || 30));

    var today = new Date();
    var currentFrom = addDays(today, -(days - 1));
    var currentTo = today;

    var previousTo = addDays(currentFrom, -1);
    var previousFrom = addDays(previousTo, -(days - 1));

    return {
      current: {
        from: formatDate(currentFrom),
        to: formatDate(currentTo),
        days: days
      },
      previous: {
        from: formatDate(previousFrom),
        to: formatDate(previousTo),
        days: days
      }
    };
  }

  function getRequestContext(siteId) {
    return {
      app: {
        siteId: siteId
      }
    };
  }

  function buildRequestData(period, extra) {
    return Object.assign({
      siteId: getSiteId(),
      period: period
    }, extra || {});
  }

  function buildGetUrl(path, payload) {
    var query = new URLSearchParams();
    query.set('event', payload.event);
    query.set('module', payload.module);
    query.set('data', JSON.stringify(payload.data || {}));
    query.set('context', JSON.stringify(payload.context || {}));

    return path + (path.indexOf('?') === -1 ? '?' : '&') + query.toString();
  }


  function getCacheStorageKey(siteId, period, viewId) {
    var configured = CONFIG.cache && CONFIG.cache.storageKey || 'buddy.dashboard.daily.v1';
    var today = formatDate(new Date());
    var current = period && period.current || {};
    return [
      configured,
      siteId || 'unknown-site',
      today,
      current.from || '',
      current.to || '',
      current.days || '',
      String(viewId || state.view || 'admin').toLowerCase()
    ].join(':');
  }

  function readDailyCache(siteId, period, viewId) {
    if (!CONFIG.cache || CONFIG.cache.enabled === false) return null;

    var key = getCacheStorageKey(siteId, period, viewId);
    if (Object.prototype.hasOwnProperty.call(state.memoryCache, key)) {
      return state.memoryCache[key];
    }

    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || !entry.savedAt || !entry.data) return null;

      // La fecha forma parte de la clave. ttlDays queda además como guardia
      // contra entradas antiguas que hayan sobrevivido a un cambio de reloj.
      var ttlDays = Number(CONFIG.cache.ttlDays || 1);
      if ((Date.now() - Number(entry.savedAt)) > ttlDays * 86400000) {
        window.localStorage.removeItem(key);
        return null;
      }

      state.memoryCache[key] = entry.data;
      return entry.data;
    } catch (error) {
      debugLog('No se pudo leer el caché local del dashboard:', error);
      return null;
    }
  }

  function writeDailyCache(siteId, period, viewId, data) {
    if (!CONFIG.cache || CONFIG.cache.enabled === false || !data) return;

    var key = getCacheStorageKey(siteId, period, viewId);
    var entry = { savedAt: Date.now(), data: data };
    state.memoryCache[key] = data;

    try {
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // localStorage puede estar bloqueado o lleno. La caché en memoria sigue
      // funcionando durante la vida de la página.
      debugLog('No se pudo persistir el caché local del dashboard:', error);
    }
  }

  function requestDashboard(options) {
    options = options || {};

    var siteId = getSiteId();
    if (!siteId) {
      return Promise.reject(new Error('Buddy Dashboard requiere un siteId autorizado.'));
    }

    var token = getAccessToken();
    if (!token) {
      return Promise.reject(new Error('No hay token de autenticación.'));
    }

    var period = options.period || buildPeriod(options.days);
    var data = buildRequestData(period, options.data);

    var payload = {
      event: CONFIG.request && CONFIG.request.event || 'dashboard.get',
      module: 'dashboard',
      data: data,
      context: getRequestContext(siteId)
    };

    var telemetry = configureApi();
    var endpoint = CONFIG.endpoints && CONFIG.endpoints.get;

    if (!endpoint) {
      return Promise.reject(new Error('Endpoint Dashboard no configurado.'));
    }

    var requestOptions = {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };

    var url = buildGetUrl(endpoint, payload);

    debugLog('Solicitando dashboard:', {
      siteId: siteId,
      period: period,
      endpoint: endpoint
    });

    return telemetry.request(CONFIG.apiService || 'dashboard', url, requestOptions)
      .then(function (response) {
        if (!response || typeof response !== 'object') {
          throw new Error('La API Dashboard devolvió una respuesta inválida.');
        }

        if (response.ok === false || response.authenticated === false) {
          throw new Error(response.error || 'La API no autorizó el dashboard.');
        }

        return response;
      });
  }

  function emptyMetric() {
    return {
      value: 0,
      previous: 0,
      change: 0,
      projection: 0
    };
  }

  function normalizeMetric(metric) {
    if (metric == null) return emptyMetric();

    if (typeof metric === 'number') {
      return {
        value: metric,
        previous: 0,
        change: 0,
        projection: metric
      };
    }

    return Object.assign(emptyMetric(), metric);
  }

  function normalizeDimension(dimension) {
    if (!dimension || typeof dimension !== 'object') return {};
    var result = Object.assign({}, dimension);

    if (result.metrics && typeof result.metrics === 'object') {
      Object.keys(result.metrics).forEach(function (key) {
        result.metrics[key] = normalizeMetric(result.metrics[key]);
      });
    }

    return result;
  }

  /**
   * Normaliza solamente la forma necesaria para que la vista sea estable.
   * No calcula KPIs en el cliente ni reconstruye journeys a partir de eventos.
   */
  function normalizeResponse(response, period) {
    var source = response.dashboard && typeof response.dashboard === 'object'
      ? response.dashboard
      : response;

    var result = Object.assign({
      site: {
        siteId: getSiteId(),
        name: getSiteId()
      },
      period: period,
      audience: {},
      engagement: {},
      intent: {},
      journeys: {},
      funnel: {},
      activities: [],
      acquisition: {
        topReferrers: [],
        topIntentPages: [],
        pagePerformance: []
      },
      technology: {
        devices: [],
        browsers: [],
        operatingSystems: []
      }
    }, source);

    result.audience = result.audience || {};
    Object.keys(result.audience).forEach(function (key) {
      result.audience[key] = normalizeMetric(result.audience[key]);
    });

    result.engagement = result.engagement || {};
    Object.keys(result.engagement).forEach(function (key) {
      result.engagement[key] = normalizeMetric(result.engagement[key]);
    });

    result.intent = result.intent || {};
    if (result.intent.whatsapp) {
      Object.keys(result.intent.whatsapp).forEach(function (key) {
        if (key !== 'byPage' && key !== 'assistedByModule') {
          result.intent.whatsapp[key] = normalizeMetric(result.intent.whatsapp[key]);
        }
      });
    }

    result.funnel = result.funnel || {};
    Object.keys(result.funnel).forEach(function (key) {
      result.funnel[key] = normalizeMetric(result.funnel[key]);
    });

    return result;
  }

  function findTarget(options) {
    options = options || {};
    if (options.target) {
      if (typeof options.target === 'string') return document.querySelector(options.target);
      if (options.target.nodeType === 1) return options.target;
    }

    if (state.target && document.documentElement.contains(state.target)) {
      return state.target;
    }

    var selector = CONFIG.view && CONFIG.view.selector || '[data-buddy-dashboard]';
    var existing = document.querySelector(selector);
    if (existing) return existing;

    // Buddy sólo tiene un punto de anclaje: buddy.js. El dashboard crea su
    // propio nodo de montaje; la página anfitriona no necesita HTML adicional.
    if (CONFIG.mount && CONFIG.mount.enabled !== false) {
      var id = CONFIG.mount.id || 'buddy-dashboard-root';
      var created = document.getElementById(id);
      if (created) return created;

      if (!document.body) return null;

      created = document.createElement('div');
      created.id = id;
      created.className = CONFIG.mount.className || 'buddy-dashboard-root';
      created.setAttribute('data-buddy-dashboard', '');
      document.body.appendChild(created);
      return created;
    }

    return null;
  }

  function getViewLoader(viewId) {
    var id = String(viewId || 'admin').trim().toLowerCase();
    var loader = window.BuddyDashboardViews && window.BuddyDashboardViews[id];
    return typeof loader === 'function' ? loader : null;
  }

  /*
   * La vista pertenece al módulo Dashboard, por lo que su ubicación debe
   * resolverse respecto de este propio script y no respecto de la instalación
   * global de Buddy.
   *
   * Se captura durante la evaluación del módulo porque document.currentScript
   * deja de apuntar a buddy_dashboard.js cuando loadView() se ejecuta de forma
   * asíncrona.
   */
  var MODULE_SCRIPT_URL = (function () {
    var currentScript = document.currentScript;

    // buddy.js proporciona explícitamente la URL con la que cargó el módulo.
    // Preferimos ese valor porque conserva la identidad exacta del recurso
    // incluso cuando la ejecución del módulo ocurre mediante carga dinámica.
    if (currentScript) {
      if (currentScript.dataset && currentScript.dataset.buddyModuleScriptUrl) {
        return currentScript.dataset.buddyModuleScriptUrl;
      }
      if (currentScript.src) {
        return currentScript.src;
      }
    }

    // Fallback limitado al propio recurso Dashboard. Nunca se deriva la base
    // desde buddy.js ni desde una ruta absoluta de la instalación.
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var script = scripts[i];
      var src = script.src || '';
      if (script.dataset && script.dataset.buddyModuleId === 'dashboard' && src) {
        return src;
      }
      if (/(?:^|\/)buddy_dashboard\.js(?:[?#]|$)/.test(src)) {
        return src;
      }
    }

    return null;
  })();

  function loadView(viewId) {
    var id = String(viewId || 'admin').trim().toLowerCase();
    var existing = getViewLoader(id);
    if (existing) return Promise.resolve(existing);

    if (!MODULE_SCRIPT_URL) {
      return Promise.reject(new Error(
        'No se pudo determinar la ubicación del módulo Dashboard.'
      ));
    }

    var url;
    try {
      url = new URL('views/' + id + '.js', MODULE_SCRIPT_URL).href;
    } catch (error) {
      return Promise.reject(new Error(
        'No se pudo resolver la ubicación de la vista Dashboard "' + id + '".'
      ));
    }
    debugLog('Cargando vista:', { id: id, url: url, moduleScriptUrl: MODULE_SCRIPT_URL });

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () {
        debugLog('Vista cargada:', { id: id, url: url });
        var view = getViewLoader(id);
        if (!view) {
          reject(new Error('La vista Dashboard "' + id + '" no registró su implementación.'));
          return;
        }
        resolve(view);
      };
      script.onerror = function () {
        debugLog('Error cargando vista:', { id: id, url: url });
        reject(new Error('No se pudo cargar la vista Dashboard "' + id + '".'));
      };
      document.head.appendChild(script);
    });
  }

  function render(options) {
    options = options || {};

    return loadView(options.view || state.view).then(function (view) {
      var target = findTarget(options);

      if (!target) {
        throw new Error(
          'No se encontró el contenedor del Dashboard. ' +
          'Usa ' + (CONFIG.view && CONFIG.view.selector || '[data-buddy-dashboard]') + '.'
        );
      }

      state.target = target;
      state.view = String(options.view || state.view || 'admin').toLowerCase();

      return view({
        target: target,
        data: state.data,
        period: state.period,
        state: state,
        config: CONFIG,
        refresh: refresh,
        setView: setView
      });
    });
  }

  function get(options) {
    options = options || {};

    var requestId = ++state.requestId;
    state.loading = true;
    state.error = null;
    state.period = options.period || buildPeriod(options.days);
    state.view = String(options.view || state.view || 'admin').toLowerCase();

    var siteId = getSiteId();
    var cached = options.force !== true
      ? readDailyCache(siteId, state.period, state.view)
      : null;

    // Render inicial para que la vista pueda mostrar skeleton/loading.
    return render(options).catch(function (error) {
      debugLog('No se pudo renderizar el estado inicial:', error);
      return undefined;
    }).then(function () {
      if (cached) {
        if (requestId !== state.requestId) return state.data;
        state.data = cached;
        state.loading = false;
        state.error = null;
        debugLog('Dashboard servido desde caché local:', getCacheStorageKey(siteId, state.period, state.view));
        return render(options).then(function () { return state.data; });
      }

      return requestDashboard({
        period: state.period,
        data: options.data
      }).then(function (response) {
        if (requestId !== state.requestId) return state.data;

        state.data = normalizeResponse(response, state.period);
        state.loading = false;
        state.error = null;
        writeDailyCache(siteId, state.period, state.view, state.data);

        return render(options).then(function () {
          return state.data;
        });
      });
    }).catch(function (error) {
      if (requestId !== state.requestId) throw error;

      state.loading = false;
      state.error = error;
      render(options).catch(function (renderError) {
        debugLog('No se pudo renderizar el error del dashboard:', renderError);
      });

      throw error;
    });
  }

  function refresh() {
    return get({
      period: state.period,
      view: state.view,
      target: state.target,
      force: true
    });
  }

  function setView(viewId, options) {
    options = Object.assign({}, options || {}, {
      view: String(viewId || 'admin').toLowerCase(),
      target: options && options.target ? options.target : state.target
    });
    state.view = options.view;
    return render(options);
  }

  function getState() {
    return {
      initialized: state.initialized,
      loading: state.loading,
      error: state.error,
      data: state.data,
      period: state.period,
      view: state.view,
      target: state.target
    };
  }

  function initialize() {
    if (state.initialized) return;
    state.initialized = true;

    function start(detail) {
      if (!detail || detail.authenticated !== true || !getAccessToken()) {
        return;
      }

      // Buddy sólo tiene el anclaje de buddy.js. La vista crea su propio
      // contenedor cuando la página ya dispone de <body>.
      var mountWhenReady = function () {
        if (!findTarget({})) return;
        get().catch(function (error) {
          debugLog('Dashboard no pudo cargar sus datos:', error);
        });
      };

      if (document.body) {
        mountWhenReady();
      } else {
        document.addEventListener('DOMContentLoaded', mountWhenReady, { once: true });
      }
    }

    window.addEventListener('buddy:auth-ready', function (event) {
      start(event && event.detail);
    });

    window.addEventListener('buddy:auth-state-changed', function (event) {
      start(event && event.detail);
    });

    if (window.Buddy.auth &&
        typeof window.Buddy.auth.isAuthenticated === 'function' &&
        window.Buddy.auth.isAuthenticated()) {
      start({ authenticated: true });
    }
  }

  window.Buddy.dashboard = {
    config: CONFIG,
    get: get,
    refresh: refresh,
    render: render,
    setView: setView,
    getState: getState,
    buildPeriod: buildPeriod,
    clearCache: function () {
      var prefix = (CONFIG.cache && CONFIG.cache.storageKey || 'buddy.dashboard.daily.v1') + ':';
      try {
        for (var i = window.localStorage.length - 1; i >= 0; i--) {
          var key = window.localStorage.key(i);
          if (key && key.indexOf(prefix) === 0) window.localStorage.removeItem(key);
        }
      } catch (error) {
        debugLog('No se pudo limpiar el caché local:', error);
      }
      state.memoryCache = {};
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window, document);

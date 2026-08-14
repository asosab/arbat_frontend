/**
 * Buddy Telemetry
 * ---------------------------------------------------------------------------
 * Capa común para comunicar eventos de uso de todos los módulos de Buddy.
 *
 * Los módulos producen eventos mediante:
 *
 *   Buddy.telemetry.send({
 *     event: '...',
 *     module: '...',
 *     data: { ... }
 *   });
 *
 * Telemetry no interpreta ni valida los datos particulares del evento.
 * Solamente agrega contexto común de Buddy, sesión y página y los envía a
 * POST /telemetry de forma fire-and-forget.
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyTelemetryConfig || {};
  var initialized = false;
  var sessionId = null;
  var userId = null;

  function debugLog() {
    if (!window.BuddyConfig || window.BuddyConfig.debugMode !== true) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy]');
    console.log.apply(console, args);
  }

  function createSessionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (error) {}

    return 's-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2) + '-' +
      Math.random().toString(36).slice(2);
  }

  function getSessionId() {
    if (sessionId) return sessionId;

    try {
      sessionId = window.sessionStorage.getItem('buddyTelemetrySessionId');
      if (!sessionId) {
        sessionId = createSessionId();
        window.sessionStorage.setItem('buddyTelemetrySessionId', sessionId);
      }
    } catch (error) {
      sessionId = createSessionId();
    }

    return sessionId;
  }

  function getPageContext() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || null,
      language: navigator.language,
      userAgent: navigator.userAgent,
      screen: window.screen ? window.screen.width + 'x' + window.screen.height : null,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  function getContext() {
    var buddyConfig = window.BuddyConfig || {};
    var characterId = window.Buddy.characterId || null;

    return {
      app: {
        siteId: buddyConfig.app && buddyConfig.app.siteId
          ? buddyConfig.app.siteId
          : null
      },
      buddy: {
        character: characterId
      },
      session: {
        sessionId: getSessionId(),
        userId: userId
      },
      page: getPageContext(),
      timestamp: new Date().toISOString()
    };
  }

  function normalizeEvent(data) {
    if (!data || typeof data !== 'object') return null;

    return {
      event: data.event || null,
      module: data.module || null,
      data: data.data !== undefined ? data.data : data
    };
  }

  function send(data) {
    if (!CONFIG || CONFIG.enabled === false) {
      debugLog('Telemetry deshabilitado.');
      return false;
    }

    var evento = normalizeEvent(data);
    if (!evento) {
      debugLog('Telemetry recibió un evento inválido.', data);
      return false;
    }

    var payload = {
      event: evento.event,
      module: evento.module,
      data: evento.data,
      context: getContext()
    };

    debugLog('Enviando evento de telemetry:', payload);

    try {
      fetch(CONFIG.apiUrl || '/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(function (response) {
        if (!response.ok) {
          debugLog('Telemetry respondió HTTP ' + response.status + '.');
        }
      }).catch(function (error) {
        debugLog('Error al enviar telemetry:', error);
      });
    } catch (error) {
      debugLog('Error al iniciar el envío de telemetry:', error);
    }

    return true;
  }

  function setUserId(value) {
    userId = value == null || value === '' ? null : String(value);
  }

  function clearUserId() {
    userId = null;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    getSessionId();
    debugLog('Telemetry inicializado.', {
      siteId: window.BuddyConfig &&
        window.BuddyConfig.app &&
        window.BuddyConfig.app.siteId,
      enabled: CONFIG.enabled !== false
    });
  }

  window.Buddy.telemetry = {
    send: send,
    setUserId: setUserId,
    clearUserId: clearUserId,
    getSessionId: getSessionId,
    init: init,
    config: CONFIG
  };

  init();
})(window, document);

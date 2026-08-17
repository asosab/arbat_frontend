/**
 * Buddy User — servicio cliente para crear/actualizar datos de usuario.
 *
 * Este módulo no presenta formularios ni decide cuándo pedir datos.
 * Todas las comunicaciones pasan por Buddy Telemetry.
 */
window.Buddy = window.Buddy || {};

(function (window) {
  'use strict';

  var CONFIG = window.BuddyUserConfig || {};

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy User]');
    console.log.apply(console, args);
  }

  function getTelemetry() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function getSessionToken() {
    if (window.Buddy.auth && typeof window.Buddy.auth.getSessionToken === 'function') {
      return window.Buddy.auth.getSessionToken();
    }
    return null;
  }

  function configureTelemetryApi() {
    var telemetry = getTelemetry();
    if (typeof telemetry.configureApi === 'function') {
      telemetry.configureApi(CONFIG.apiService || 'user', {
        baseUrl: CONFIG.apiBaseUrl,
        update: CONFIG.endpoints && CONFIG.endpoints.update
      });
    }
  }

  function update(data) {
    data = data || {};
    if (CONFIG.enabled === false) return Promise.reject(new Error('Servicio User deshabilitado.'));

    var params = new URLSearchParams();
    if (data.name !== undefined) params.set('name', String(data.name == null ? '' : data.name).trim());
    if (data.whatsapp !== undefined) params.set('phone', String(data.whatsapp == null ? '' : data.whatsapp).trim());
    else if (data.phone !== undefined) params.set('phone', String(data.phone == null ? '' : data.phone).trim());

    if (!params.toString()) return Promise.reject(new Error('No hay datos de usuario para actualizar.'));

    configureTelemetryApi();
    debugLog('update: payload', Object.fromEntries(params.entries()));

    var telemetry = getTelemetry();
    var requestOptions = {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      body: params
    };

    // Primer intento: cookie HttpOnly, sin Authorization. Esto mantiene la
    // cookie como mecanismo principal y evita un preflight innecesario.
    return telemetry.request(CONFIG.apiService || 'user', CONFIG.endpoints.update, requestOptions)
      .then(function (response) {
        debugLog('update: respuesta por cookie', response);
        if (!response || response.ok === false || response.authenticated === false) {
          throw new Error(response && response.error ? response.error : 'El servidor no confirmó la actualización del usuario.');
        }
        return response;
      })
      .catch(function (error) {
        var sessionToken = getSessionToken();

        // Fallback: si la cookie cross-site no llegó, reutilizamos la sesión
        // creada por auth/verify. El token sólo vive en memoria y viaja por
        // Authorization; credentials=omit evita que el preflight de Bearer
        // dependa del CORS con credenciales global.
        if (!error || error.status !== 401 || !sessionToken) {
          throw error;
        }

        debugLog('update: cookie no autenticó; intentando fallback Bearer.');

        return telemetry.request(CONFIG.apiService || 'user', CONFIG.endpoints.update, {
          method: 'POST',
          credentials: 'omit',
          cache: 'no-store',
          headers: {
            Authorization: 'Bearer ' + sessionToken
          },
          body: params
        }).then(function (response) {
          debugLog('update: respuesta por Bearer', response);
          if (!response || response.ok === false || response.authenticated === false) {
            throw new Error(response && response.error ? response.error : 'El servidor no confirmó la actualización del usuario.');
          }
          return response;
        });
      });
  }

  window.Buddy.user = {
    config: CONFIG,
    update: update
  };
})(window);

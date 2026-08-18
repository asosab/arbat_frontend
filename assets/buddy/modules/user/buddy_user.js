/**
 * Buddy User — servicio cliente para crear/actualizar datos de usuario.
 *
 * Autenticación exclusivamente por JWT Bearer token.
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

  function getAccessToken() {
    if (window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function') {
      return window.Buddy.auth.getAccessToken();
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

    var accessToken = getAccessToken();
    if (!accessToken) {
      return Promise.reject(new Error('No hay token de autenticación.'));
    }

    var telemetry = getTelemetry();
    return telemetry.request(CONFIG.apiService || 'user', CONFIG.endpoints.update, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    }).then(function (response) {
      debugLog('update: respuesta', response);
      if (!response || response.ok === false || response.authenticated === false) {
        throw new Error(response && response.error ? response.error : 'El servidor no confirmó la actualización del usuario.');
      }
      return response;
    });
  }

  window.Buddy.user = {
    config: CONFIG,
    update: update
  };
})(window);

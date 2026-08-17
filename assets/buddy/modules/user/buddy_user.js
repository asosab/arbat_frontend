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

    return getTelemetry().request(CONFIG.apiService || 'user', CONFIG.endpoints.update, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
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

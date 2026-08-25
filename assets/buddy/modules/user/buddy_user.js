/**
 * Buddy User — perfil universal de cuenta Buddy.
 *
 * No contiene datos específicos de arquería ni campos de autenticación.
 * La API concreta se configura en modules/user/config.js.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyUserConfig || {};
  var state = { user: null, loading: false, saving: false };

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy User]');
    console.log.apply(console, args);
  }

  function telemetry() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function token() {
    return window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function'
      ? window.Buddy.auth.getAccessToken()
      : null;
  }

  function configureApi() {
    telemetry().configureApi(CONFIG.apiService || 'user', {
      baseUrl: CONFIG.apiBaseUrl,
      current: CONFIG.endpoints && CONFIG.endpoints.current,
      update: CONFIG.endpoints && CONFIG.endpoints.update,
      uploadPhoto: CONFIG.endpoints && CONFIG.endpoints.uploadPhoto,
      removePhoto: CONFIG.endpoints && CONFIG.endpoints.removePhoto
    });
  }

  function request(path, options) {
    if (CONFIG.enabled === false) return Promise.reject(new Error('Servicio User deshabilitado.'));
    var accessToken = token();
    if (!accessToken) return Promise.reject(new Error('No hay token de autenticación.'));
    configureApi();
    options = options || {};
    options.headers = Object.assign({}, options.headers || {}, {
      Authorization: 'Bearer ' + accessToken
    });
    return telemetry().request(CONFIG.apiService || 'user', path, options);
  }

  function normalizeUser(data) {
    if (!data || typeof data !== 'object') return null;
    return data.user || data.data || data;
  }

  function getCurrent() {
    return request(CONFIG.endpoints.current, { method: 'GET' }).then(function (response) {
      state.user = normalizeUser(response);
      return state.user;
    });
  }

  function updateProfile(data) {
    data = data || {};
    var params = new URLSearchParams();
    ['name', 'firstName', 'lastName', 'email', 'phone', 'locale'].forEach(function (key) {
      if (data[key] !== undefined && data[key] !== null) params.set(key, String(data[key]).trim());
    });
    if (!params.toString()) return Promise.reject(new Error('No hay datos de usuario para actualizar.'));

    return request(CONFIG.endpoints.update, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    }).then(function (response) {
      state.user = normalizeUser(response) || Object.assign({}, state.user || {}, data);
      return response;
    });
  }

  function uploadPhoto(file) {
    if (!file) return Promise.reject(new Error('Selecciona una imagen.'));
    var form = new FormData();
    form.append('fotoPerfil', file);
    return request(CONFIG.endpoints.uploadPhoto, {
      method: 'POST',
      cache: 'no-store',
      body: form
    }).then(function (response) {
      var user = normalizeUser(response);
      if (user) state.user = user;
      return response;
    });
  }

  function removePhoto() {
    return request(CONFIG.endpoints.removePhoto, {
      method: 'DELETE',
      cache: 'no-store'
    }).then(function (response) {
      if (state.user) state.user.fotoPerfil = null;
      return response;
    });
  }

  function initials(user) {
    user = user || {};
    var source = String(user.name || '').trim() || [user.firstName, user.lastName].filter(Boolean).join(' ');
    var parts = source.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  function photoUrl(user) {
    var photo = user && user.fotoPerfil;
    return photo && (photo.url || photo.archivo) ? (photo.url || photo.archivo) : null;
  }

  function avatar(user, className) {
    var el = document.createElement('div');
    el.className = className || 'buddy-user-avatar';
    var url = photoUrl(user);
    if (url) {
      var img = document.createElement('img');
      img.alt = String(user && (user.name || user.firstName || 'Usuario') || 'Usuario');
      img.src = url;
      img.addEventListener('error', function () {
        el.textContent = initials(user);
      });
      el.appendChild(img);
    } else {
      el.textContent = initials(user);
    }
    return el;
  }

  function injectStyles() {
    if (document.getElementById('buddy-user-styles')) return;
    var style = document.createElement('style');
    style.id = 'buddy-user-styles';
    style.textContent = '.buddy-user-form{font:inherit;display:grid;gap:14px;max-width:560px}.buddy-user-form label{display:grid;gap:6px}.buddy-user-form input,.buddy-user-form select{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-user-avatar{width:96px;height:96px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#eee;font-weight:700;font-size:28px}.buddy-user-avatar img{width:100%;height:100%;object-fit:cover}.buddy-user-photo{display:flex;gap:12px;align-items:center}.buddy-user-actions{display:flex;gap:8px;flex-wrap:wrap}.buddy-user-status{min-height:1.3em}';
    document.head.appendChild(style);
  }

  var MODULE_SCRIPT_URL = (function () {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) return currentScript.src;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/(?:^|\/)buddy_user\.js(?:[?#]|$)/.test(scripts[i].src || '')) return scripts[i].src;
    }
    return null;
  })();

  function getViewLoader(viewId) {
    var views = window.BuddyUserViews || {};
    var id = String(viewId || 'profile').toLowerCase();
    return typeof views[id] === 'function' ? views[id] : null;
  }

  function loadView(viewId) {
    var id = String(viewId || 'profile').toLowerCase();
    var existing = getViewLoader(id);
    if (existing) return Promise.resolve(existing);
    if (!MODULE_SCRIPT_URL) return Promise.reject(new Error('No se pudo determinar la ubicación del módulo User.'));
    var url = new URL('views/' + id + '.js', MODULE_SCRIPT_URL).href;
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () {
        var view = getViewLoader(id);
        if (!view) return reject(new Error('La vista User "' + id + '" no registró su implementación.'));
        resolve(view);
      };
      script.onerror = function () { reject(new Error('No se pudo cargar la vista User "' + id + '".')); };
      document.head.appendChild(script);
    });
  }

  function render(options) {
    options = options || {};
    return loadView(options.view || 'profile').then(function (view) {
      if (!options.target) throw new Error('User requiere un contenedor de destino.');
      return view({ target: options.target, user: state.user, state: state, config: CONFIG, api: window.Buddy.user });
    });
  }

  window.Buddy.user = {
    config: CONFIG,
    getCurrent: getCurrent,
    update: updateProfile,
    updateProfile: updateProfile,
    uploadPhoto: uploadPhoto,
    removePhoto: removePhoto,
    avatar: avatar,
    render: render,
    renderProfile: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'profile' })); },
    renderAdmin: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'admin' })); },
    getState: function () { return { user: state.user }; }
  };

  window.addEventListener('buddy:auth-state-changed', function () {
    if (window.Buddy.auth && typeof window.Buddy.auth.isAuthenticated === 'function' && !window.Buddy.auth.isAuthenticated()) return;
    getCurrent().catch(function (error) { debugLog('No se pudo cargar el usuario actual.', error); });
  });
})(window, document);

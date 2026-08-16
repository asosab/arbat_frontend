/**
 * Buddy Auth — autenticación cliente por enlace de correo.
 *
 * Regla de arquitectura: Auth no usa fetch() directamente. Todas las
 * comunicaciones con servidor pasan por window.Buddy.telemetry.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyAuthConfig || {};
  var state = {
    enabled: CONFIG.enabled !== false,
    initialized: false,
    checking: false,
    busy: false,
    authenticated: false,
    user: null,
    needsName: false,
    mode: 'idle',
    welcomePending: false,
    welcomeType: null
  };

  function debugLog() {
    if (!window.BuddyConfig || window.BuddyConfig.debugMode !== true) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Auth]');
    console.log.apply(console, args);
  }

  function emitEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {}
  }

  function normalizeEmail(email) {
    return String(email == null ? '' : email).trim().toLowerCase();
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
  }

  function getAuthApi() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function configureTelemetryApi() {
    var telemetry = getAuthApi();
    if (typeof telemetry.configureApi === 'function') {
      telemetry.configureApi(CONFIG.apiService || 'auth', {
        baseUrl: CONFIG.apiBaseUrl,
        session: CONFIG.endpoints.session,
        login: CONFIG.endpoints.login,
        verify: CONFIG.endpoints.verify,
        logout: CONFIG.endpoints.logout
      });
    }
  }

  function apiRequest(endpointKey, options) {
    options = options || {};
    var telemetry = getAuthApi();
    var endpoint = CONFIG.endpoints[endpointKey];
    if (!endpoint) return Promise.reject(new Error('Endpoint Auth no configurado: ' + endpointKey));

    var service = CONFIG.apiService || 'auth';
    var path = endpoint;
    var method = String(options.method || 'GET').toUpperCase();
    var requestOptions = {
      method: method,
      credentials: 'include',
      cache: 'no-store'
    };

    if (options.body !== undefined) requestOptions.body = options.body;
    if (options.signal) requestOptions.signal = options.signal;

    return telemetry.request(service, path, requestOptions);
  }

  function getRedirectUrl() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete(CONFIG.verificationParameter);
      return url.toString();
    } catch (e) {
      return window.location.href;
    }
  }

  function getVerificationHash() {
    try {
      return new URL(window.location.href).searchParams.get(CONFIG.verificationParameter);
    } catch (e) {
      return null;
    }
  }

  function removeVerificationParameter() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete(CONFIG.verificationParameter);
      window.history.replaceState({}, document.title, url.href);
    } catch (e) {}
  }

  function clearLocalState() {
    state.authenticated = false;
    state.user = null;
    state.needsName = false;
    state.mode = 'idle';
    state.welcomePending = false;
    state.welcomeType = null;
    if (window.Buddy.telemetry && typeof window.Buddy.telemetry.clearUserId === 'function') {
      window.Buddy.telemetry.clearUserId();
    }
  }

  function setAuthenticated(user, needsName, welcomeType) {
    state.authenticated = true;
    state.user = user || null;
    state.needsName = !!needsName;
    state.mode = state.needsName ? 'name' : 'idle';
    state.welcomePending = true;
    state.welcomeType = welcomeType || (state.needsName ? 'new' : 'existing');

    if (window.Buddy.telemetry && typeof window.Buddy.telemetry.setUserId === 'function') {
      var userId = state.user && (state.user.id || state.user._id || state.user.email);
      window.Buddy.telemetry.setUserId(userId || null);
    }

    emitEvent('buddy:auth-state-changed', {
      authenticated: state.authenticated,
      user: state.user,
      needsName: state.needsName,
      welcomeType: state.welcomeType
    });
  }

  function setUnauthenticated() {
    clearLocalState();
    emitEvent('buddy:auth-state-changed', {
      authenticated: false,
      user: null,
      needsName: false,
      welcomeType: null
    });
  }

  function normalizeUser(data) {
    if (!data || typeof data !== 'object') return null;
    var user = data.user;
    if (!user || typeof user !== 'object') return null;

    // Contrato de usuario que Auth espera del servicio. El servidor puede
    // devolver campos adicionales; el cliente conserva únicamente los que
    // necesita para el estado de Buddy.
    return {
      id: user.id != null ? user.id : (user._id != null ? user._id : null),
      email: user.email || null,
      name: user.name || user.nombre || user.firstName || user.nombrePila || null,
      firstName: user.firstName || user.nombre || user.name || null,
      lastName: user.lastName || user.apellido || user.apellidos || null,
      phone: user.phone || user.telefono || user.mobile || user.celular || null,
      locale: user.locale || user.idioma || null,
      createdAt: user.createdAt || user.creadoEn || null
    };
  }

  function getResponseUser(data) {
    return normalizeUser(data) || normalizeUser({ user: data });
  }

  function applySessionResponse(data, welcomeType) {
    var authenticated = !!(data && (data.authenticated === true || data.active === true));
    if (!authenticated) {
      setUnauthenticated();
      return false;
    }

    var user = normalizeUser(data);
    var needsName = data.needsName === true || data.newUser === true || data.isNewUser === true || !user || !user.name;
    setAuthenticated(user, needsName, welcomeType || (needsName ? 'new' : 'existing'));
    return true;
  }

  function checkSession() {
    if (!state.enabled || state.checking) return Promise.resolve(state.authenticated);
    state.checking = true;
    configureTelemetryApi();

    return apiRequest('session', { method: 'GET' })
      .then(function (data) {
        applySessionResponse(data, data && data.newUser ? 'new' : 'existing');
        return state.authenticated;
      })
      .catch(function (error) {
        debugLog('No se pudo consultar la sesión.', error);
        setUnauthenticated();
        return false;
      })
      .then(function (result) {
        state.checking = false;
        emitEvent('buddy:auth-ready', {
          authenticated: state.authenticated,
          user: state.user,
          needsName: state.needsName,
          welcomeType: state.welcomeType,
          sessionOk: result
        });
        return result;
      });
  }

  function requestLogin(email) {
    var normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      return Promise.reject(new Error('Dirección de correo inválida.'));
    }
    if (state.busy) return Promise.reject(new Error('Auth ocupado.'));

    state.busy = true;
    state.mode = 'waiting-email';
    var params = new URLSearchParams();
    params.set('email', normalized);
    params.set('appID', window.BuddyConfig &&
      window.BuddyConfig.app &&
      window.BuddyConfig.app.siteId
      ? window.BuddyConfig.app.siteId
      : '');
    params.set('redirectUrl', getRedirectUrl());
    return apiRequest('login', {
      method: 'POST',
      body: params
    }).then(function (data) {
      emitEvent('buddy:auth-login-sent', { email: normalized });
      return data;
    }).finally(function () {
      state.busy = false;
    });
  }

  function verifyHash(hash) {
    var value = normalizeText(hash);
    if (!value || state.busy) return Promise.resolve(false);

    state.busy = true;
    state.mode = 'verifying';
    configureTelemetryApi();

    var endpoint = CONFIG.endpoints.verify;
    var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
    var path = endpoint + separator + encodeURIComponent(CONFIG.verificationParameter) + '=' + encodeURIComponent(value);

    return getAuthApi().request(CONFIG.apiService || 'auth', path, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    }).then(function (data) {
      if (!data || data.ok === false || data.authenticated === false) {
        throw new Error('El enlace de autenticación no pudo validarse.');
      }

      var user = normalizeUser(data);
      var needsName = data.needsName === true || data.newUser === true || data.isNewUser === true || !user || !user.name;
      setAuthenticated(user, needsName, needsName ? 'new' : 'existing');
      emitEvent('buddy:auth-verified', {
        authenticated: true,
        user: state.user,
        needsName: state.needsName
      });
      return true;
    }).catch(function (error) {
      debugLog('No se pudo verificar el enlace.', error);
      setUnauthenticated();
      emitEvent('buddy:auth-verify-failed', { error: error });
      return false;
    }).finally(function () {
      state.busy = false;
      removeVerificationParameter();
    });
  }

  function registerName(name) {
    var normalized = normalizeText(name);
    if (!state.authenticated || !normalized || state.busy) return Promise.resolve(false);

    state.busy = true;
    state.mode = 'registering-name';

    // register-name es una acción explícita del servicio Auth. Se mantiene
    // sobre POST /login para que el cliente no dependa de un endpoint adicional:
    // la sesión autenticada identifica al usuario que está completando el alta.
    var params = new URLSearchParams();
    params.set('action', 'register-name');
    params.set('name', normalized);
    return apiRequest('login', {
      method: 'POST',
      body: params
    }).then(function (data) {
      if (!data || data.ok === false || data.authenticated === false) {
        throw new Error('El servidor no confirmó el registro del nombre.');
      }

      var returnedUser = getResponseUser(data);
      if (!returnedUser) {
        throw new Error('El servidor no devolvió los datos del usuario.');
      }

      // El servicio debe devolver el usuario completo y actualizado después
      // de register-name. Esto permite que el cliente quede sincronizado sin
      // inventar apellido, teléfono u otros datos.
      state.user = returnedUser;
      state.needsName = data.needsName === true;
      state.mode = state.needsName ? 'name' : 'idle';
      state.welcomePending = true;
      state.welcomeType = state.needsName ? 'new' : 'named-new';

      emitEvent('buddy:auth-name-registered', {
        user: state.user,
        needsName: state.needsName
      });
      emitEvent('buddy:auth-state-changed', {
        authenticated: true,
        user: state.user,
        needsName: state.needsName,
        welcomeType: state.welcomeType
      });
      return true;
    }).catch(function (error) {
      debugLog('No se pudo registrar el nombre.', error);
      state.mode = 'name';
      throw error;
    }).finally(function () {
      state.busy = false;
    });
  }

  function logout() {
    if (!state.authenticated || state.busy) return Promise.resolve(false);
    state.busy = true;
    state.mode = 'logging-out';

    return apiRequest('logout', { method: 'GET' })
      .then(function (data) {
        if (data && data.ok === false) throw new Error('El servidor no confirmó el cierre de sesión.');
        setUnauthenticated();
        emitEvent('buddy:auth-logout', { ok: true });
        window.location.reload();
        return true;
      })
      .catch(function (error) {
        debugLog('No se pudo cerrar la sesión.', error);
        state.mode = 'logout-confirmation';
        emitEvent('buddy:auth-logout', { ok: false, error: error });
        throw error;
      })
      .finally(function () {
        state.busy = false;
      });
  }

  function enterLoginMode() {
    state.mode = 'login-email';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function enterLogoutMode() {
    state.mode = 'logout-confirmation';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function enterNameMode() {
    state.mode = 'name';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function cancelFlow() {
    state.mode = 'idle';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function consumeWelcome() {
    state.welcomePending = false;
    state.welcomeType = null;
  }

  function getState() {
    return {
      enabled: state.enabled,
      initialized: state.initialized,
      checking: state.checking,
      busy: state.busy,
      authenticated: state.authenticated,
      user: state.user,
      needsName: state.needsName,
      mode: state.mode,
      welcomePending: state.welcomePending,
      welcomeType: state.welcomeType
    };
  }

  function init() {
    if (state.initialized || !state.enabled) return;
    state.initialized = true;

    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      debugLog('Auth no puede inicializarse porque Telemetry no está disponible.');
      return;
    }

    configureTelemetryApi();

    var hash = getVerificationHash();
    if (hash) {
      verifyHash(hash);
    } else {
      checkSession();
    }
  }

  window.Buddy.auth = {
    enabled: state.enabled,
    config: CONFIG,
    isAuthenticated: function () { return state.authenticated; },
    getUser: function () { return state.user; },
    getState: getState,
    checkSession: checkSession,
    requestLogin: requestLogin,
    verifyHash: verifyHash,
    registerName: registerName,
    logout: logout,
    enterLoginMode: enterLoginMode,
    enterLogoutMode: enterLogoutMode,
    enterNameMode: enterNameMode,
    cancelFlow: cancelFlow,
    consumeWelcome: consumeWelcome,
    init: init
  };

  init();
})(window, document);

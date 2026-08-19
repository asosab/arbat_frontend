/**
 * ARBAT — assets/js/user.js
 * ---------------------------------------------------------------------
 * Integración de la UI de usuario de ARBAT con Buddy Auth.
 *
 * La autenticación, el registro, los JWT, el refresh, el logout y la
 * limpieza del parámetro ?auth= son responsabilidad exclusiva de Buddy.
 * Este módulo solo adapta Buddy a la interfaz de ARBAT.
 *
 * Buddy autentica contra https://api.statetty.com y puede reutilizarse en
 * sitios de dominios distintos.
 * ---------------------------------------------------------------------
 */

(function (window, document) {
  'use strict';

  var LOGIN_BUTTON_ID = 'btn-login';

  function getAuth() {
    return window.Buddy && window.Buddy.auth ? window.Buddy.auth : null;
  }

  function getUser() {
    var auth = getAuth();
    return auth && typeof auth.getUser === 'function' ? auth.getUser() : null;
  }

  function isLoggedIn() {
    var auth = getAuth();
    return !!(auth && typeof auth.isAuthenticated === 'function' && auth.isAuthenticated());
  }

  function initials(nombre) {
    var value = String(nombre || '').trim();
    if (!value) return '';

    var words = value.split(/\s+/).filter(Boolean);
    var result = words[0].charAt(0);
    if (words.length > 1) result += words[1].charAt(0);
    return result.toUpperCase();
  }

  function primerNombre(nombreCompleto) {
    return String(nombreCompleto || '').trim().split(/\s+/)[0] || '';
  }

  /**
   * El HTML existente puede tener un <img id="nav-user-avatar">.
   * Como todavía no se usa fotografía, lo convertimos a un elemento textual
   * que pueda mostrar las iniciales dentro del mismo círculo CSS.
   */
  function ensureAvatarElement() {
    var avatar = document.getElementById('nav-user-avatar');
    if (!avatar) return null;

    if (avatar.tagName && avatar.tagName.toLowerCase() === 'img') {
      var replacement = document.createElement('span');
      Array.prototype.forEach.call(avatar.attributes, function (attribute) {
        if (attribute.name !== 'src' && attribute.name !== 'alt') {
          replacement.setAttribute(attribute.name, attribute.value);
        }
      });
      replacement.textContent = '';
      replacement.setAttribute('aria-hidden', 'true');
      avatar.parentNode.replaceChild(replacement, avatar);
      avatar = replacement;
    }

    avatar.classList.add('nav-user-avatar-initials');
    return avatar;
  }

  function renderAvatar(avatar, user) {
    if (!avatar) return;
    avatar.textContent = user ? initials(user.name || user.firstName) : '';
    avatar.setAttribute('aria-label', user ? (user.name || user.email || 'Usuario') : 'Usuario');
    avatar.title = user ? (user.name || user.email || '') : '';
  }

  var ArbatUser = {
    /** Usuario autenticado según el estado actual de Buddy. */
    get: function () {
      return getUser();
    },

    /** true si Buddy considera autenticada la sesión actual. */
    isLoggedIn: function () {
      return isLoggedIn();
    },

    /**
     * Inicia el flujo de autenticación por correo de Buddy.
     * No maneja tokens ni URLs de verificación.
     */
    login: function (callback) {
      var auth = getAuth();
      if (!auth || typeof auth.startAuthenticationPrompt !== 'function') {
        console.error('ArbatUser.login: Buddy Auth no está disponible.');
        if (callback) callback(null);
        return false;
      }

      var handled = false;
      function onStateChange(event) {
        var detail = event.detail || {};
        if (detail.authenticated && !handled) {
          handled = true;
          window.removeEventListener('buddy:auth-state-changed', onStateChange);
          if (callback) callback(detail.user || getUser());
        }
      }
      window.addEventListener('buddy:auth-state-changed', onStateChange);

      var started = auth.startAuthenticationPrompt();
      if (!started) window.removeEventListener('buddy:auth-state-changed', onStateChange);
      return started;
    },

    /**
     * El registro de Buddy comienza igual que el login: autenticación por
     * correo. Si el usuario es nuevo o le faltan datos, Buddy solicita los
     * datos requeridos después de verificar el enlace.
     */
    register: function (callback) {
      return this.login(callback);
    },

    /** Comprueba/recupera la sesión a través de Buddy. */
    sync: function (callback) {
      var auth = getAuth();
      if (!auth || typeof auth.checkSession !== 'function') {
        if (callback) callback(null);
        return Promise.resolve(false);
      }

      return auth.checkSession().then(function () {
        var user = getUser();
        if (callback) callback(user);
        return user;
      });
    },

    /**
     * Cierra la sesión a través de Buddy. Buddy revoca los refresh tokens y
     * limpia el estado local; este módulo no manipula tokens.
     */
    logout: function (callback) {
      var auth = getAuth();
      if (!auth || typeof auth.logout !== 'function') {
        if (callback) callback(false);
        return Promise.resolve(false);
      }

      return auth.logout().then(function (ok) {
        if (callback) callback(ok);
        return ok;
      });
    }
  };

  window.ArbatUser = ArbatUser;

  function wireHeaderUI() {
    var btnLogin = document.getElementById(LOGIN_BUTTON_ID);
    var logged = document.getElementById('nav-user-logged');
    var avatar = ensureAvatarElement();
    var nombre = document.getElementById('nav-user-nombre');

    if (!logged) return;

    function render(user) {
      var authenticated = !!user;

      if (btnLogin) btnLogin.hidden = authenticated;
      logged.hidden = !authenticated;

      renderAvatar(avatar, user);

      if (nombre) {
        nombre.textContent = authenticated && user.name
          ? '¡Hola ' + primerNombre(user.name) + '!'
          : '';
      }
    }

    render(getUser());

    function renderFromEvent(event) {
      var detail = event.detail || {};
      render(detail.user !== undefined ? detail.user : (detail.authenticated ? getUser() : null));
    }

    window.addEventListener('buddy:auth-state-changed', renderFromEvent);
    window.addEventListener('buddy:auth-ready', renderFromEvent);
    window.addEventListener('buddy:auth-user-updated', function (event) {
      render((event.detail || {}).user || getUser());
    });
    window.addEventListener('buddy:auth-verified', renderFromEvent);
    window.addEventListener('buddy:auth-logout', function () {
      render(null);
    });

    function wireAuthButton(button, action) {
      if (!button) return;
      button.addEventListener('click', function () {
        button.disabled = true;
        var result = action();
        if (result && typeof result.finally === 'function') {
          result.finally(function () { button.disabled = false; });
        } else {
          setTimeout(function () { button.disabled = false; }, 500);
        }
      });
    }

    // El botón «Ingresar» inicia el único flujo de Buddy. Buddy determina
    // si corresponde a un login, un usuario nuevo o un perfil incompleto.
    wireAuthButton(btnLogin, function () {
      return ArbatUser.login();
    });
  }

  document.addEventListener('DOMContentLoaded', wireHeaderUI);

})(window, document);

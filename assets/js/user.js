/**
 * ARBAT — assets/js/user.js
 * ---------------------------------------------------------------------
 * Gestión de sesión de usuario en el sitio.
 *
 * Fase actual (esta versión):
 *   - Login vía Facebook SDK (requiere que _includes/facebook-sdk.html ya
 *     haya corrido FB.init() antes de que este script se use).
 *   - Persistencia en sessionStorage: sobrevive a la navegación entre
 *     páginas del sitio (es un sitio Jekyll multi-página, no una SPA), pero
 *     se borra al cerrar la pestaña/navegador. No hay backend todavía.
 *
 * Fase futura (marcada con "TODO: backend" abajo):
 *   - Enviar el accessToken de Facebook al API interno de ARBAT para que lo
 *     valide y devuelva un usuario/token propio.
 *   - Guardar ese token propio en vez de (o además de) los datos crudos de
 *     Facebook, y usarlo para las siguientes llamadas al backend.
 *
 * Uso típico desde otro script o desde el header:
 *   ArbatUser.loginWithFacebook(function (user) {
 *     if (user) { ... actualizar UI con user.nombre, user.foto ... }
 *   });
 *
 *   ArbatUser.logout();
 *
 *   var actual = ArbatUser.get(); // null si no hay sesión
 *
 *   window.addEventListener('arbat:user-changed', function (e) {
 *     // e.detail es el usuario (o null tras logout) — útil para que el
 *     // header/nav se repinte solo, sin acoplarse al código de login.
 *   });
 * ---------------------------------------------------------------------
 */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'arbat_user';

  var ArbatUser = {
    /**
     * Devuelve el usuario guardado en esta sesión del navegador, o null
     * si no hay nadie logueado.
     */
    get: function () {
      try {
        var raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.error('ArbatUser.get: no se pudo leer sessionStorage', e);
        return null;
      }
    },

    /** true si hay un usuario en sesión. */
    isLoggedIn: function () {
      return !!this.get();
    },

    /** Guarda el usuario en sessionStorage y avisa al resto de la página. */
    _save: function (user) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.error('ArbatUser._save: no se pudo escribir en sessionStorage', e);
      }
      window.dispatchEvent(new CustomEvent('arbat:user-changed', { detail: user }));
    },

    /** Borra la sesión guardada localmente (no cierra sesión en Facebook). */
    clear: function () {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('ArbatUser.clear: no se pudo limpiar sessionStorage', e);
      }
      window.dispatchEvent(new CustomEvent('arbat:user-changed', { detail: null }));
    },

    /**
     * Abre el diálogo de Facebook Login. Si el usuario acepta, pide su
     * perfil básico y lo guarda en sessionStorage.
     *
     * @param {function(Object|null)} [callback] recibe el usuario guardado,
     *        o null si el usuario canceló / no autorizó los permisos.
     */
    loginWithFacebook: function (callback) {
      var self = this;

      if (typeof FB === 'undefined') {
        console.error('ArbatUser.loginWithFacebook: el SDK de Facebook no está cargado todavía.');
        if (callback) callback(null);
        return;
      }

      FB.login(function (response) {
        if (!response.authResponse) {
          // el usuario cerró el diálogo o no dio los permisos pedidos
          if (callback) callback(null);
          return;
        }

        FB.api('/me', { fields: 'id,name,email,picture.width(160).height(160)' }, function (profile) {
          var user = {
            provider: 'facebook',
            fbUserID: profile.id,
            nombre: profile.name,
            email: profile.email || null,
            foto: (profile.picture && profile.picture.data) ? profile.picture.data.url : null,
            // TODO: backend — este accessToken es el de Facebook. Cuando
            // exista el API interno, mandarlo a un endpoint tipo
            // POST /auth/facebook { accessToken } y reemplazar este campo
            // por el token propio que devuelva ese endpoint.
            accessToken: response.authResponse.accessToken,
            autenticadoEn: new Date().toISOString()
          };
          self._save(user);
          if (callback) callback(user);
        });
      }, { scope: 'public_profile,email' });
    },

    /**
     * Cierra sesión: borra la sesión local y, si corresponde, también
     * la sesión de Facebook.
     */
    logout: function (callback) {
      var self = this;
      var finish = function () {
        self.clear();
        if (callback) callback();
      };

      if (typeof FB !== 'undefined' && self.isLoggedIn()) {
        FB.logout(finish);
      } else {
        finish();
      }
    },

    /**
     * Revisa contra Facebook si la sesión sigue siendo válida (por ejemplo,
     * si el usuario cerró sesión en Facebook desde otra pestaña o revocó el
     * permiso a la app). Si Facebook dice que ya no está conectado, limpia
     * la sesión local aunque hubiera quedado guardada.
     */
    sync: function () {
      if (typeof FB === 'undefined') return;
      var self = this;
      FB.getLoginStatus(function (response) {
        if (response.status !== 'connected' && self.isLoggedIn()) {
          self.clear();
        }
      });
    }
  };

  window.ArbatUser = ArbatUser;

  // Al cargar cualquier página, sincronizar con el estado real de Facebook.
  // El pequeño delay le da margen a fbAsyncInit (en facebook-sdk.html) para
  // terminar de inicializar el SDK antes de consultarlo.
  window.addEventListener('load', function () {
    setTimeout(function () { ArbatUser.sync(); }, 300);
  });

  /**
   * ---------------------------------------------------------------------
   * Cableado del botón de login/logout en _includes/header.html.
   * Busca los elementos por id; si una página no tiene header (por ejemplo
   * la landing /probar-clase/), simplemente no hace nada.
   * ---------------------------------------------------------------------
   */
  function wireHeaderUI() {
    var btnLogin = document.getElementById('btn-fb-login');
    var btnLogout = document.getElementById('btn-logout');
    var logged = document.getElementById('nav-user-logged');
    var avatar = document.getElementById('nav-user-avatar');
    var nombre = document.getElementById('nav-user-nombre');

    if (!btnLogin || !logged) return; // no hay header de usuario en esta página

    // Primer nombre a partir del nombre completo devuelto por Facebook.
    function primerNombre(nombreCompleto) {
      return (nombreCompleto || '').trim().split(/\s+/)[0] || '';
    }

    function render(user) {
      if (user) {
        btnLogin.hidden = true;
        logged.hidden = false;
        if (avatar) {
          avatar.src = user.foto || '';
          avatar.alt = user.nombre || '';
        }
        if (nombre) {
          nombre.textContent = user.nombre ? '¡Hola ' + primerNombre(user.nombre) + '!' : '';
        }
      } else {
        btnLogin.hidden = false;
        logged.hidden = true;
        if (avatar) avatar.src = '';
        if (nombre) nombre.textContent = '';
      }
    }

    // Estado inicial (por si ya había sesión guardada en esta pestaña).
    render(ArbatUser.get());

    // Repintar cada vez que login/logout/sync cambien el usuario.
    window.addEventListener('arbat:user-changed', function (e) {
      render(e.detail);
    });

    btnLogin.addEventListener('click', function () {
      btnLogin.disabled = true;
      ArbatUser.loginWithFacebook(function () {
        btnLogin.disabled = false;
      });
    });

    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        ArbatUser.logout();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', wireHeaderUI);

})(window);

/**
 * ARBAT — assets/js/menuuser.js
 * ---------------------------------------------------------------------
 * Menú desplegable del usuario autenticado.
 *
 * La autenticación y el logout son responsabilidad de Buddy Auth. Este
 * módulo solo presenta el menú y delega el cierre de sesión en ArbatUser.
 * ---------------------------------------------------------------------
 */

(function (window, document) {
  'use strict';

  var SALIR_ID = 'user-toolkit-salir';
  var TOP10_ID = 'user-toolkit-top10';

  function crearMenu() {
    var menu = document.createElement('div');
    menu.className = 'user-toolkit-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    menu.innerHTML =
      '<ul class="user-toolkit-menu__lista" role="none">' +
        '<li role="none"><button type="button" class="user-toolkit-menu__item" id="' + TOP10_ID + '" role="menuitem">🏹 Top 10</button></li>' +
      '</ul>' +
      '<div class="user-toolkit-menu__pie">' +
        '<button type="button" class="user-toolkit-menu__salir" id="' + SALIR_ID + '" role="menuitem">Cerrar sesión</button>' +
      '</div>';

    return menu;
  }

  function initMenuUsuario() {
    var contenedor = document.getElementById('nav-user-logged');
    var icono = document.getElementById('nav-user-avatar');

    if (!contenedor || !icono) return;

    // Evitar duplicar el menú si el script se inicializa más de una vez.
    if (contenedor.querySelector('.user-toolkit-menu')) return;

    var menu = crearMenu();
    contenedor.appendChild(menu);
    contenedor.classList.add('user-toolkit-trigger');
    icono.setAttribute('role', 'button');
    icono.setAttribute('aria-haspopup', 'true');
    icono.setAttribute('aria-expanded', 'false');
    icono.setAttribute('tabindex', '0');

    var abierto = false;

    function abrirMenu() {
      if (menu.hidden === false) return;
      menu.hidden = false;
      icono.setAttribute('aria-expanded', 'true');
      abierto = true;
    }

    function cerrarMenu() {
      menu.hidden = true;
      icono.setAttribute('aria-expanded', 'false');
      abierto = false;
    }

    function toggleMenu(evento) {
      evento.stopPropagation();
      if (abierto) cerrarMenu();
      else abrirMenu();
    }

    icono.addEventListener('click', toggleMenu);
    icono.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        toggleMenu(evento);
      }
    });

    document.addEventListener('click', function (evento) {
      if (abierto && !contenedor.contains(evento.target)) cerrarMenu();
    });

    document.addEventListener('keydown', function (evento) {
      if (abierto && evento.key === 'Escape') {
        cerrarMenu();
        icono.focus();
      }
    });

    function configurarTop10() {
      var btnTop10 = document.getElementById(TOP10_ID);
      if (!btnTop10) return;

      var archeryEnabled = !!(window.BuddyArcheryConfig && window.BuddyArcheryConfig.enabled !== false);
      var archeryActivo = !!(window.Buddy && Array.isArray(window.Buddy.abilities) &&
        window.Buddy.abilities.indexOf('archery') !== -1);

      btnTop10.parentNode.hidden = !(archeryEnabled && archeryActivo);
    }

    configurarTop10();

    window.addEventListener('buddy:ready', configurarTop10);

    menu.addEventListener('click', function (evento) {
      var btnTop10 = evento.target.closest ? evento.target.closest('#' + TOP10_ID) : null;
      if (btnTop10) {
        evento.stopPropagation();
        btnTop10.disabled = true;
        cerrarMenu();

        if (!window.Buddy || !window.Buddy.archery) {
          btnTop10.disabled = false;
          return;
        }

        var mostrar = typeof window.Buddy.archery.top10Mostrar === 'function'
          ? window.Buddy.archery.top10Mostrar
          : null;

        if (!mostrar) {
          btnTop10.disabled = false;
          return;
        }

        Promise.resolve(mostrar())
          .catch(function (error) {
            if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
              console.error('[Buddy] No se pudo obtener archery/top10.', error);
            }

            if (typeof window.buddy_says === 'function') {
              window.buddy_says('No pude consultar el Top 10 en este momento.');
            }
          })
          .then(function () {
            btnTop10.disabled = false;
          });

        return;
      }

      var btnSalir = evento.target.closest ? evento.target.closest('#' + SALIR_ID) : null;
      if (!btnSalir) return;

      evento.stopPropagation();
      btnSalir.disabled = true;

      if (!window.ArbatUser || typeof window.ArbatUser.logout !== 'function') {
        btnSalir.disabled = false;
        return;
      }

      window.ArbatUser.logout(function () {
        cerrarMenu();
      }).catch(function () {
        btnSalir.disabled = false;
      });
    });

    window.addEventListener('buddy:auth-state-changed', function (evento) {
      if (!(evento.detail || {}).authenticated) cerrarMenu();
    });

    window.addEventListener('buddy:auth-logout', cerrarMenu);
  }

  document.addEventListener('DOMContentLoaded', initMenuUsuario);

})(window, document);

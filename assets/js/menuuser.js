/**
 * ARBAT — assets/js/menuuser.js
 * ---------------------------------------------------------------------
 * Menú desplegable ("toolkit") del usuario autenticado.
 *
 * Se abre/cierra al hacer click sobre el ícono (avatar) del usuario en el
 * header (#nav-user-avatar, dentro de #nav-user-logged). Todo el HTML del
 * menú se genera acá mismo — header.html solo contiene el ícono/nombre que
 * lo dispara, ya no el botón "Salir".
 *
 * Requiere que assets/js/user.js (ArbatUser) esté cargado ANTES que este
 * script, porque usa ArbatUser.logout() para el botón del pie del menú.
 * Cargar en el mismo include donde ya se carga user.js, justo después:
 *   <script src="{{ '/assets/js/user.js' | relative_url }}"></script>
 *   <script src="{{ '/assets/js/menuuser.js' | relative_url }}"></script>
 * ---------------------------------------------------------------------
 */

(function (window, document) {
  'use strict';

  var SALIR_ID = 'user-toolkit-salir';

  /**
   * Arma el HTML del menú. Toda la estructura vive acá adentro: si mañana
   * se agregan más opciones (ej. "Mis reservas", "Mi perfil"), se suman
   * como <li> dentro de la lista, antes del pie.
   */
  function crearMenu() {
    var menu = document.createElement('div');
    menu.className = 'user-toolkit-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    menu.innerHTML =
      '<ul class="user-toolkit-menu__lista" role="none">' +
        // TODO: opciones futuras del usuario (perfil, reservas, etc.) van acá.
      '</ul>' +
      '<div class="user-toolkit-menu__pie">' +
        '<button type="button" class="user-toolkit-menu__salir" id="' + SALIR_ID + '" role="menuitem">Salir</button>' +
      '</div>';

    return menu;
  }

  function initMenuUsuario() {
    var contenedor = document.getElementById('nav-user-logged');
    var icono = document.getElementById('nav-user-avatar');

    if (!contenedor || !icono) return; // esta página no tiene header de usuario

    var menu = crearMenu();
    contenedor.appendChild(menu);
    contenedor.classList.add('user-toolkit-trigger');
    icono.setAttribute('role', 'button');
    icono.setAttribute('aria-haspopup', 'true');
    icono.setAttribute('aria-expanded', 'false');

    var abierto = false;

    function abrirMenu() {
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
      if (abierto) {
        cerrarMenu();
      } else {
        abrirMenu();
      }
    }

    // Solo el ícono abre/cierra el menú.
    icono.addEventListener('click', toggleMenu);

    // Click afuera del contenedor (ícono + menú) lo cierra.
    document.addEventListener('click', function (evento) {
      if (abierto && !contenedor.contains(evento.target)) {
        cerrarMenu();
      }
    });

    // Escape también lo cierra.
    document.addEventListener('keydown', function (evento) {
      if (abierto && evento.key === 'Escape') {
        cerrarMenu();
        icono.focus();
      }
    });

    // Botón "Salir", generado dentro del propio menú.
    menu.addEventListener('click', function (evento) {
      var btnSalir = evento.target.closest ? evento.target.closest('#' + SALIR_ID) : null;
      if (!btnSalir) return;
      evento.stopPropagation();
      btnSalir.disabled = true;
      if (window.ArbatUser) {
        window.ArbatUser.logout(function () {
          cerrarMenu();
        });
      }
    });

    // Si la sesión se cierra desde otro lugar (ej. ArbatUser.sync()), cerrar el menú.
    window.addEventListener('arbat:user-changed', function (evento) {
      if (!evento.detail) cerrarMenu();
    });
  }

  document.addEventListener('DOMContentLoaded', initMenuUsuario);

})(window, document);

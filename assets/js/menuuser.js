/**
 * ARBAT — assets/js/menuuser.js
 * ---------------------------------------------------------------------
 * Menú desplegable del usuario autenticado.
 *
 * La autenticación y el logout son responsabilidad de Buddy Auth. Este
 * módulo presenta el menú y delega la edición de perfiles en los módulos
 * Buddy correspondientes.
 * ---------------------------------------------------------------------
 */

(function (window, document) {
  'use strict';

  var SALIR_ID = 'user-toolkit-salir';
  var TOP10_ID = 'user-toolkit-top10';
  var USER_PROFILE_ID = 'user-toolkit-user-profile';
  var ARCHERY_STUDENT_ID = 'user-toolkit-archery-student';
  var ADMIN_ID = 'user-toolkit-admin';
  var DASHBOARD_ID = 'user-toolkit-dashboard';
  var ADMIN_ARCHERY_ID = 'user-toolkit-admin-archery';

  var EDIT_MODAL_ID = 'user-toolkit-edit-modal';
  var EDIT_MODAL_STYLE_ID = 'user-toolkit-edit-modal-style';

  function moduleActive(moduleId, configName) {
    var buddy = window.Buddy;
    if (buddy && buddy.modules && typeof buddy.modules.isActive === 'function') {
      return buddy.modules.isActive(moduleId);
    }
    var forced = configName && window[configName];
    return !(forced && forced.enabled === false);
  }

  function appId() {
    if (window.Buddy && window.Buddy.archerySchool &&
        typeof window.Buddy.archerySchool.appName === 'function') {
      return window.Buddy.archerySchool.appName();
    }
    var siteId = window.BuddyConfig && window.BuddyConfig.app && window.BuddyConfig.app.siteId;
    var id = siteId ? String(siteId) : 'ArcherySchool';
    return '🏹 ' + id;
  }

  function crearMenu() {
    var menu = document.createElement('div');
    menu.className = 'user-toolkit-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    menu.innerHTML =
      '<ul class="user-toolkit-menu__lista" role="none">' +
        '<li role="none"><button type="button" class="user-toolkit-menu__item" id="' + TOP10_ID + '" role="menuitem">🏹 Top 10</button></li>' +
        '<li role="none" hidden><button type="button" class="user-toolkit-menu__item" id="' + USER_PROFILE_ID + '" role="menuitem">👤 Mis datos de usuario</button></li>' +
        '<li role="none" hidden><button type="button" class="user-toolkit-menu__item" id="' + ARCHERY_STUDENT_ID + '" role="menuitem">🏹 Mis datos de estudiante</button></li>' +
        '<li role="none" hidden><button type="button" class="user-toolkit-menu__item" id="' + ADMIN_ID + '" role="menuitem">admin</button></li>' +
        '<li role="none" hidden><button type="button" class="user-toolkit-menu__item" id="' + DASHBOARD_ID + '" role="menuitem">dashboard</button></li>' +
        '<li role="none" hidden><button type="button" class="user-toolkit-menu__item" id="' + ADMIN_ARCHERY_ID + '" role="menuitem">' + appId() + ' (admin)</button></li>' +
      '</ul>' +
      '<div class="user-toolkit-menu__pie">' +
        '<button type="button" class="user-toolkit-menu__salir" id="' + SALIR_ID + '" role="menuitem">Cerrar sesión</button>' +
      '</div>';

    return menu;
  }

  function ensureEditModal() {
    var existing = document.getElementById(EDIT_MODAL_ID);
    if (existing) {
      return {
        modal: existing,
        target: existing.querySelector('[data-user-toolkit-edit-target]'),
        title: existing.querySelector('[data-user-toolkit-edit-title]')
      };
    }

    if (!document.body) throw new Error('No se puede abrir un formulario antes de que exista document.body.');

    if (!document.getElementById(EDIT_MODAL_STYLE_ID)) {
      var style = document.createElement('style');
      style.id = EDIT_MODAL_STYLE_ID;
      style.textContent =
        '.user-toolkit-edit-modal{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(0,0,0,.45)}' +
        '.user-toolkit-edit-modal[hidden]{display:none}' +
        '.user-toolkit-edit-modal__panel{width:min(980px,100%);height:min(900px,calc(100vh - 40px));overflow:auto;background:#fff;color:#202124;border-radius:14px;box-shadow:0 16px 60px rgba(0,0,0,.25);box-sizing:border-box}' +
        '.user-toolkit-edit-modal__head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 20px;background:#fff;border-bottom:1px solid #e5e7eb}' +
        '.user-toolkit-edit-modal__title{margin:0 auto 0 0;font:600 1.15rem system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
        '.user-toolkit-edit-modal__close{border:0;background:transparent;font-size:1.5rem;line-height:1;cursor:pointer;padding:4px 8px;color:#444}' +
        '.user-toolkit-edit-modal__body{padding:20px;box-sizing:border-box}' +
        '@media(max-width:600px){.user-toolkit-edit-modal{padding:8px}.user-toolkit-edit-modal__panel{height:calc(100vh - 16px);border-radius:10px}.user-toolkit-edit-modal__body{padding:12px}}';
      document.head.appendChild(style);
    }

    var modal = document.createElement('div');
    modal.id = EDIT_MODAL_ID;
    modal.className = 'user-toolkit-edit-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML =
      '<div class="user-toolkit-edit-modal__panel">' +
        '<div class="user-toolkit-edit-modal__head">' +
          '<h2 class="user-toolkit-edit-modal__title" data-user-toolkit-edit-title>Editar datos</h2>' +
          '<button type="button" class="user-toolkit-edit-modal__close" data-user-toolkit-edit-close aria-label="Cerrar formulario">×</button>' +
        '</div>' +
        '<div class="user-toolkit-edit-modal__body" data-user-toolkit-edit-target></div>' +
      '</div>';

    document.body.appendChild(modal);

    function close() {
      modal.hidden = true;
    }

    var closeButton = modal.querySelector('[data-user-toolkit-edit-close]');
    if (closeButton) closeButton.addEventListener('click', close);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) close();
    });

    return {
      modal: modal,
      target: modal.querySelector('[data-user-toolkit-edit-target]'),
      title: modal.querySelector('[data-user-toolkit-edit-title]')
    };
  }

  function openEditForm(moduleName, view, title, options) {
    options = options || {};

    if (!window.Buddy) return Promise.reject(new Error('Buddy no está disponible.'));

    var module = moduleName === 'archerySchool' ? window.Buddy.archerySchool : window.Buddy.user;
    if (!module || typeof module.render !== 'function') {
      return Promise.reject(new Error('El módulo requerido no está disponible.'));
    }

    var ui;
    try {
      ui = ensureEditModal();
    } catch (error) {
      return Promise.reject(error);
    }

    ui.title.textContent = title;
    ui.target.innerHTML = '<p>Cargando formulario…</p>';
    ui.modal.hidden = false;

    return module.render(Object.assign({}, options, {
      target: ui.target,
      view: view
    })).catch(function (error) {
      ui.target.innerHTML = '<p>No se pudo cargar el formulario: ' + escapeHtml(error.message || error) + '</p>';
      throw error;
    });
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function initMenuUsuario() {
    var contenedor = document.getElementById('nav-user-logged');
    var icono = document.getElementById('nav-user-avatar');

    if (!contenedor || !icono) return;
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

    function isAdmin() {
      return !!(window.Buddy && window.Buddy.admin &&
        typeof window.Buddy.admin.isAdmin === 'function' &&
        window.Buddy.admin.isAdmin());
    }

    function setVisible(id, visible) {
      var button = document.getElementById(id);
      if (button && button.parentNode) button.parentNode.hidden = !visible;
    }

    function configurarTop10() {
      var archeryEnabled = !!(window.BuddyArcheryConfig && window.BuddyArcheryConfig.enabled !== false);
      var archeryActivo = !!(window.Buddy && Array.isArray(window.Buddy.abilities) &&
        window.Buddy.abilities.indexOf('archery') !== -1);
      setVisible(TOP10_ID, archeryEnabled && archeryActivo);
    }

    function configurarUsuario() {
      var user = window.Buddy && window.Buddy.user;
      setVisible(USER_PROFILE_ID, moduleActive('user', 'BuddyUserConfig') &&
        !!(user && typeof user.render === 'function'));
    }

    function configurarAdmin() {
      var visible = isAdmin();
      var archeryActive = moduleActive('archerySchool', 'BuddyArcherySchoolConfig');

      setVisible(ADMIN_ID, visible && moduleActive('admin', 'BuddyAdminConfig'));
      setVisible(DASHBOARD_ID, visible && moduleActive('dashboard', 'BuddyDashboardConfig'));
      setVisible(ADMIN_ARCHERY_ID, visible && archeryActive);
    }

    function configurarEstudiante() {
      var active = moduleActive('archerySchool', 'BuddyArcherySchoolConfig');
      var archerySchool = window.Buddy && window.Buddy.archerySchool;
      setVisible(ARCHERY_STUDENT_ID, active &&
        !!(archerySchool && typeof archerySchool.render === 'function'));
    }

    function configurarMenu() {
      configurarTop10();
      configurarUsuario();
      configurarAdmin();
      configurarEstudiante();
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

      var btnUserProfile = evento.target.closest ? evento.target.closest('#' + USER_PROFILE_ID) : null;
      if (btnUserProfile) {
        evento.stopPropagation();
        btnUserProfile.disabled = true;
        cerrarMenu();

        openEditForm('user', 'profile', 'Mis datos de usuario')
          .catch(function (error) {
            if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
              console.error('[Buddy] No se pudo abrir el perfil de usuario.', error);
            }
          })
          .then(function () {
            btnUserProfile.disabled = false;
          });
        return;
      }

      var btnArcheryStudent = evento.target.closest ? evento.target.closest('#' + ARCHERY_STUDENT_ID) : null;
      if (btnArcheryStudent) {
        evento.stopPropagation();
        btnArcheryStudent.disabled = true;
        cerrarMenu();

        openEditForm('archerySchool', 'student', 'Mis datos de estudiante')
          .catch(function (error) {
            if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
              console.error('[Buddy] No se pudo abrir ArcherySchool del estudiante.', error);
            }
          })
          .then(function () {
            btnArcheryStudent.disabled = false;
          });
        return;
      }

      var btnAdminArchery = evento.target.closest ? evento.target.closest('#' + ADMIN_ARCHERY_ID) : null;
      if (btnAdminArchery) {
        evento.stopPropagation();
        btnAdminArchery.disabled = true;
        cerrarMenu();

        if (!isAdmin()) {
          btnAdminArchery.disabled = false;
          return;
        }

        openEditForm('archerySchool', 'admin', appId() + ' (admin)', { role: 'admin' })
          .catch(function (error) {
            if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
              console.error('[Buddy] No se pudo abrir el formulario ArcherySchool admin.', error);
            }
          })
          .then(function () {
            btnAdminArchery.disabled = false;
          });
        return;
      }

      var btnDashboard = evento.target.closest ? evento.target.closest('#' + DASHBOARD_ID) : null;
      if (btnDashboard) {
        evento.stopPropagation();
        btnDashboard.disabled = true;
        cerrarMenu();

        if (!isAdmin() ||
            !window.Buddy ||
            !window.Buddy.dashboard ||
            typeof window.Buddy.dashboard.open !== 'function') {
          btnDashboard.disabled = false;
          return;
        }

        Promise.resolve(window.Buddy.dashboard.open({
          view: 'admin',
          force: true
        })).catch(function (error) {
          if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
            console.error('[Buddy] No se pudo abrir Dashboard admin.', error);
          }
        }).then(function () {
          btnDashboard.disabled = false;
        });
        return;
      }

      var btnAdmin = evento.target.closest ? evento.target.closest('#' + ADMIN_ID) : null;
      if (btnAdmin) {
        evento.stopPropagation();
        cerrarMenu();

        if (!window.Buddy || !window.Buddy.admin || typeof window.Buddy.admin.open !== 'function') return;

        Promise.resolve(window.Buddy.admin.open()).catch(function (error) {
          if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
            console.error('[Buddy] No se pudo abrir Admin.', error);
          }
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

    window.addEventListener('buddy:ready', configurarMenu);
    window.addEventListener('buddy:admin-visibility-changed', function () {
      configurarAdmin();
      configurarEstudiante();
    });
    window.addEventListener('buddy:user-loaded', configurarUsuario);
    window.addEventListener('buddy:user-updated', configurarUsuario);
    window.addEventListener('buddy:auth-state-changed', function (evento) {
      if (!(evento.detail || {}).authenticated) {
        cerrarMenu();
        setVisible(USER_PROFILE_ID, false);
        setVisible(ARCHERY_STUDENT_ID, false);
        setVisible(ADMIN_ARCHERY_ID, false);
      } else {
        configurarMenu();
      }
    });
    window.addEventListener('buddy:auth-logout', function () {
      cerrarMenu();
      setVisible(USER_PROFILE_ID, false);
      setVisible(ARCHERY_STUDENT_ID, false);
      setVisible(ADMIN_ARCHERY_ID, false);
    });

    configurarMenu();
  }

  document.addEventListener('DOMContentLoaded', initMenuUsuario);

})(window, document);

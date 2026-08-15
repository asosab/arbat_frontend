/**
 * Buddy Chat
 * ---------------------------------------------------------------------------
 * Barra de entrada flotante para comandos de Buddy.
 *
 * Auth se integra como una interacción contextual: cuando existe una
 * interacción pendiente, el texto del input se entrega primero al módulo que
 * la registró y no al sistema de comandos normales.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyChatConfig || {};
  var state = {
    open: false,
    initialized: false,
    longPressTimer: null,
    longPressActive: false,
    longPressStartX: 0,
    longPressStartY: 0,
    interaction: null,
    authWelcomeShown: false
  };
  var elements = {};

  function emit(texto, emocion, opciones) {
    if (typeof window.buddy_says !== 'function') {
      console.warn('[Buddy Chat] window.buddy_says no está disponible.');
      return false;
    }
    opciones = Object.assign({}, opciones || {}, { emocion: emocion || 'sereno' });
    return window.buddy_says(texto, opciones);
  }

  function normalize(texto) {
    return String(texto == null ? '' : texto)
      .trim()
      .toLocaleLowerCase('es');
  }

  function getAuth() {
    if (!window.Buddy.auth || window.Buddy.auth.enabled !== true) return null;
    return window.Buddy.auth;
  }

  function ensureStyles() {
    if (document.getElementById('buddy-chat-style')) return;
    var style = document.createElement('style');
    style.id = 'buddy-chat-style';
    style.textContent =
      '.buddy-chat{position:fixed;left:0;right:0;bottom:0;z-index:10030;' +
      'display:flex;align-items:center;gap:8px;padding:8px 10px;' +
      'box-sizing:border-box;background:rgba(255,255,255,.98);' +
      'border-top:1px solid rgba(0,0,0,.12);box-shadow:0 -4px 16px rgba(0,0,0,.12);' +
      'font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
      '.buddy-chat[hidden]{display:none!important;}' +
      '.buddy-chat-input{min-width:0;flex:1 1 auto;height:36px;box-sizing:border-box;' +
      'padding:7px 10px;border:1px solid #bbb;border-radius:6px;outline:none;' +
      'font:inherit;line-height:20px;}' +
      '.buddy-chat-input:focus{border-color:#777;}' +
      '.buddy-chat-auth{flex:0 0 auto;height:36px;padding:0 12px;border:1px solid #888;' +
      'border-radius:6px;background:#f3f3f3;cursor:pointer;font:inherit;}' +
      '.buddy-chat-auth:hover{background:#e8e8e8;}' +
      '.buddy-chat-auth:active{transform:translateY(1px);}' +
      '.buddy-chat-send{flex:0 0 auto;height:36px;padding:0 14px;border:1px solid #888;' +
      'border-radius:6px;background:#f3f3f3;cursor:pointer;font:inherit;}' +
      '.buddy-chat-send:hover{background:#e8e8e8;}' +
      '.buddy-chat-send:active{transform:translateY(1px);}' +
      '.buddy-chat-enter{display:none!important;}' +
      '.buddy-chat-enter input{margin:0;}' +
      '.buddy-chat-close{flex:0 0 auto;width:32px;height:36px;padding:0;border:0;' +
      'background:transparent;color:#555;font-size:24px;line-height:32px;cursor:pointer;}' +
      '.buddy-chat-close:hover{color:#000;}';
    document.head.appendChild(style);
  }

  function ensureUI() {
    if (elements.container) return;
    ensureStyles();

    var container = document.createElement('div');
    container.id = 'buddy-chat';
    container.className = 'buddy-chat';
    container.hidden = true;
    container.setAttribute('role', 'search');
    container.setAttribute('aria-label', 'Chat de Buddy');

    var authButton = document.createElement('button');
    authButton.type = 'button';
    authButton.className = 'buddy-chat-auth';
    authButton.hidden = true;
    authButton.setAttribute('aria-label', 'Autenticación');

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'buddy-chat-input';
    input.id = 'buddy-chat-input';
    input.autocomplete = 'off';
    input.spellcheck = true;
    input.placeholder = CONFIG.placeholder || 'Escribe un comando…';
    input.setAttribute('aria-label', 'Comando de Buddy');

    var enterLabel = document.createElement('label');
    enterLabel.className = 'buddy-chat-enter';
    enterLabel.hidden = true;
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = 'buddy-chat-send-with-enter';
    var labelText = document.createElement('span');
    labelText.textContent = CONFIG.checkboxText || 'Enviar con Enter';
    enterLabel.appendChild(checkbox);
    enterLabel.appendChild(labelText);

    var send = document.createElement('button');
    send.type = 'button';
    send.className = 'buddy-chat-send';
    send.textContent = CONFIG.buttonText || 'Enviar';
    send.setAttribute('aria-label', 'Enviar comando');

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'buddy-chat-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar Chat');
    close.title = 'Cerrar';

    // Auth queda deliberadamente antes del input.
    container.appendChild(authButton);
    container.appendChild(input);
    container.appendChild(enterLabel);
    container.appendChild(send);
    container.appendChild(close);
    document.body.appendChild(container);

    elements = {
      container: container,
      authButton: authButton,
      input: input,
      checkbox: checkbox,
      enter: enterLabel,
      send: send,
      close: close
    };

    send.addEventListener('click', function () { sendCurrent(); });
    authButton.addEventListener('click', function () { handleAuthButton(); });
    close.addEventListener('click', function () { closeChat(); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeChat();
        return;
      }
      // El checkbox permanece marcado, pero oculto por falta de espacio.
      if (event.key === 'Enter' && elements.checkbox.checked) {
        event.preventDefault();
        sendCurrent();
      }
    });
  }

  function focusInput(options) {
    options = options || {};
    if (!elements.container || elements.container.hidden || !state.open) {
      openChat();
    }
    if (!elements.input) return false;
    try {
      elements.input.focus();
      if (options.selectAll) elements.input.select();
      else elements.input.setSelectionRange(elements.input.value.length, elements.input.value.length);
    } catch (e) {}
    return true;
  }

  function openChat(texto) {
    if (CONFIG.enabled === false) return false;
    ensureUI();
    state.open = true;
    elements.container.hidden = false;
    if (texto !== undefined && texto !== null) elements.input.value = String(texto);
    focusInput();
    return true;
  }

  function closeChat() {
    if (!elements.container) return false;
    state.open = false;
    elements.container.hidden = true;
    clearInteraction();
    return true;
  }

  function toggleChat() {
    return state.open ? closeChat() : openChat();
  }

  function setPlaceholder(text) {
    ensureUI();
    elements.input.placeholder = String(text == null ? '' : text);
  }

  function restorePlaceholder() {
    setPlaceholder(CONFIG.placeholder || 'Escribe un comando…');
  }

  function clearInput() {
    if (elements.input) elements.input.value = '';
  }

  function setInteraction(interaction) {
    state.interaction = typeof interaction === 'function' ? interaction : null;
  }

  function clearInteraction() {
    state.interaction = null;
  }

  function isEditableTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    var tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function isStandaloneKey(event, key) {
    return event && event.key && event.key.toLocaleLowerCase() === key &&
      !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
  }

  var LONG_PRESS_MS = 4000;
  var LONG_PRESS_MOVE_TOLERANCE = 18;

  function clearLongPressTimer() {
    if (state.longPressTimer !== null) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }

  function cancelLongPress() {
    clearLongPressTimer();
    state.longPressActive = false;
  }

  function handleTouchStart(event) {
    if (CONFIG.enabled === false || state.open) return;
    if (!event.touches || event.touches.length !== 1) {
      cancelLongPress();
      return;
    }
    var touch = event.touches[0];
    state.longPressStartX = touch.clientX;
    state.longPressStartY = touch.clientY;
    state.longPressActive = false;
    clearLongPressTimer();
    state.longPressTimer = window.setTimeout(function () {
      state.longPressTimer = null;
      state.longPressActive = true;
      openChat();
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(event) {
    if (state.longPressTimer === null || !event.touches || !event.touches.length) return;
    var touch = event.touches[0];
    var dx = touch.clientX - state.longPressStartX;
    var dy = touch.clientY - state.longPressStartY;
    if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_TOLERANCE) cancelLongPress();
  }

  function handleTouchEnd() {
    cancelLongPress();
  }

  function handleTouchCancel() {
    cancelLongPress();
  }

  function handleLongPressContextMenu(event) {
    if (state.longPressTimer !== null || state.longPressActive) event.preventDefault();
  }

  function handleGlobalKeydown(event) {
    if (event.key === 'Escape') {
      if (state.open) {
        event.preventDefault();
        closeChat();
      }
      return;
    }
    var key = String(CONFIG.keyboardKey || 't').toLocaleLowerCase();
    if (!key || !isStandaloneKey(event, key)) return;
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
    openChat();
  }

  function consultarReservasParaChat() {
    if (!window.BuddyAgenda || typeof window.BuddyAgenda.consultarReservas !== 'function') {
      emit('La agenda está desactivada para esta página o aún no ha sido configurada', 'sereno');
      return Promise.resolve(null);
    }
    var ahora = new Date();
    return window.BuddyAgenda.consultarReservas({ fechaInicial: ahora, dias: 3 }).then(function (resultado) {
      if (!resultado) return null;
      var total = Number(resultado.total) || 0;
      var porDia = resultado.porDia || [];
      var partes = porDia.slice(0, 3).map(function (item, index) {
        var nombre = index === 0 ? 'Hoy' : (index === 1 ? 'Mañana' : 'Pasado mañana');
        return nombre + ': ' + (Number(item.total) || 0);
      });
      var texto = 'Hay ' + total + ' reservas en los próximos 3 días.';
      if (partes.length) texto += ' ' + partes.join(' · ');
      emit(texto, 'sereno');
      return resultado;
    }).catch(function (error) {
      console.warn('[Buddy Chat] No se pudo consultar la agenda.', error);
      emit('La agenda está desactivada para esta página o aún no ha sido configurada', 'sereno');
      return null;
    });
  }

  function executeCommand(texto) {
    var limpio = String(texto == null ? '' : texto).trim();
    if (!limpio) return Promise.resolve(false);
    var comando = normalize(limpio);
    if (comando === 'hola') {
      emit('¡Hola!', 'alegre');
      return Promise.resolve(true);
    }
    if (comando === 'reservas') {
      return consultarReservasParaChat().then(function () { return true; });
    }
    return Promise.resolve(false);
  }

  function sendCurrent() {
    if (!elements.input) return Promise.resolve(false);
    var texto = elements.input.value.trim();
    if (!texto) return Promise.resolve(false);
    elements.input.value = '';

    if (state.interaction) {
      var interaction = state.interaction;
      // Una respuesta escrita también resuelve el globo interactivo.
      if (window.Buddy.says && typeof window.Buddy.says.resolverInteraccion === 'function') {
        window.Buddy.says.cancelarInteraccion();
      }
      // Una interacción consume la respuesta actual. La función puede volver
      // a registrar otra interacción si necesita mantener el flujo abierto.
      state.interaction = null;
      return Promise.resolve(interaction(texto));
    }

    return executeCommand(texto);
  }

  function handleUrlInvocation() {
    var parameter = String(CONFIG.urlParameter || 'chat');
    try {
      var params = new URL(window.location.href).searchParams;
      if (!params.has(parameter)) return;
      var value = params.get(parameter);
      if (value === null || value === '' || value === '1' || value === 'true') openChat();
      else openChat(value);
    } catch (e) {}
  }

  function setAuthButton(auth) {
    if (!elements.authButton) return;
    var enabled = !!auth;
    elements.authButton.hidden = !enabled;
    if (!enabled) return;
    var authenticated = auth.isAuthenticated();
    elements.authButton.textContent = authenticated
      ? (auth.config.logoutButtonText || 'Logout')
      : (auth.config.loginButtonText || 'Login');
    elements.authButton.setAttribute('aria-label', authenticated ? 'Cerrar sesión' : 'Iniciar sesión');
  }

  function showAuthPrompt(text, placeholder, interaction) {
    ensureUI();
    openChat();
    setPlaceholder(placeholder);
    clearInput();
    setInteraction(interaction);
    focusInput();
    emit(text, 'sereno');
  }

  function showWelcome(authState) {
    var auth = getAuth();
    if (!auth || state.authWelcomeShown) return;
    if (!authState || !authState.welcomePending) return;

    state.authWelcomeShown = true;
    var user = authState.user || {};
    if (authState.welcomeType === 'new' || authState.needsName) {
      var nameInteraction = function (texto) {
        var name = String(texto || '').trim();
        if (!name) return false;
        return auth.registerName(name).then(function () {
          clearInteraction();
          restorePlaceholder();
          var finalUser = auth.getUser() || {};
          var template = auth.config.nameSavedTemplate || '¡Mucho gusto, {name}!';
          emit(template.replace('{name}', finalUser.name || name), 'alegre');
          auth.consumeWelcome();
          focusInput();
          return true;
        }).catch(function () {
          showAuthPrompt('No pude registrar tu nombre. Inténtalo nuevamente.', auth.config.namePlaceholder || 'Escribe tu nombre', nameInteraction);
          return false;
        });
      };
      showAuthPrompt(
        auth.config.newUserWelcomeMessage || '¡Bienvenido! ¿Cómo te llamas?',
        auth.config.namePlaceholder || 'Escribe tu nombre',
        nameInteraction
      );
      return;
    }

    if (authState.welcomeType === 'named-new') {
      var namedTemplate = auth.config.nameSavedTemplate || '¡Mucho gusto, {name}!';
      emit(namedTemplate.replace('{name}', user.name || ''), 'alegre');
      auth.consumeWelcome();
      return;
    }

    if (authState.welcomeType === 'existing' && user.name) {
      var template = auth.config.existingWelcomeTemplate || '¡Bienvenido, {name}!';
      emit(template.replace('{name}', user.name), 'alegre');
      auth.consumeWelcome();
    }
  }

  function handleAuthButton() {
    var auth = getAuth();
    if (!auth) return;

    if (auth.isAuthenticated()) {
      auth.enterLogoutMode();
      var logoutInteraction = function (texto) {
        var respuesta = normalize(texto);
        if (respuesta === 'si' || respuesta === 'sí') return auth.logout();
        if (respuesta === 'no') {
          auth.cancelFlow();
          restorePlaceholder();
          clearInput();
          return true;
        }
        showAuthPrompt(
          auth.config.logoutQuestion || '¿Deseas cerrar tu sesión de usuario en este explorador?',
          auth.config.logoutPlaceholder || 'Escribe Si para cerrar tu sesion',
          logoutInteraction
        );
        return false;
      };
      showAuthPrompt(
        auth.config.logoutQuestion || '¿Deseas cerrar tu sesión de usuario en este explorador?',
        auth.config.logoutPlaceholder || 'Escribe Si para cerrar tu sesion',
        logoutInteraction
      );
      return;
    }

    auth.enterLoginMode();
    var loginInteraction = function (texto) {
      var email = String(texto || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAuthPrompt('Escribe una dirección de correo válida.', auth.config.emailPlaceholder || 'Escribe tu dirección de correo', loginInteraction);
        return false;
      }
      return auth.requestLogin(email).then(function () {
        auth.cancelFlow();
        restorePlaceholder();
        emit(auth.config.emailSentMessage || 'Revisa tu correo y has click en el link de logueo', 'sereno');
        return true;
      }).catch(function () {
        auth.enterLoginMode();
        showAuthPrompt('No pude enviar el enlace. Inténtalo nuevamente.', auth.config.emailPlaceholder || 'Escribe tu dirección de correo', loginInteraction);
        return false;
      });
    };
    showAuthPrompt(
      auth.config.loginMessage || 'Escribe tu correo en la caja de texto, te enviaré un link de verificación a esa dirección',
      auth.config.emailPlaceholder || 'Escribe tu dirección de correo',
      loginInteraction
    );
  }

  function refreshAuthIntegration() {
    ensureUI();
    var auth = getAuth();
    setAuthButton(auth);
    if (auth) showWelcome(auth.getState());
  }

  function handleAuthStateChanged(event) {
    var auth = getAuth();
    if (!auth) return;
    setAuthButton(auth);
    showWelcome(event && event.detail ? event.detail : auth.getState());
  }

  function handleAuthReady(event) {
    refreshAuthIntegration();
    if (event && event.detail) showWelcome(event.detail);
  }

  function init() {
    if (state.initialized || CONFIG.enabled === false) return;
    state.initialized = true;
    document.addEventListener('keydown', handleGlobalKeydown, true);
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
    document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });
    document.addEventListener('contextmenu', handleLongPressContextMenu, true);
    if (document.body) ensureUI();
    handleUrlInvocation();

    window.addEventListener('buddy:auth-ready', handleAuthReady);
    window.addEventListener('buddy:auth-state-changed', handleAuthStateChanged);
    window.addEventListener('buddy:ready', refreshAuthIntegration);
  }

  window.Buddy.chat = {
    open: openChat,
    close: closeChat,
    toggle: toggleChat,
    isOpen: function () { return state.open && !!elements.container && !elements.container.hidden; },
    send: executeCommand,
    sendCurrent: sendCurrent,
    setPlaceholder: setPlaceholder,
    getPlaceholder: function () { return elements.input ? elements.input.placeholder : ''; },
    restorePlaceholder: restorePlaceholder,
    focusInput: focusInput,
    ensureOpenAndFocus: function () { return openChat(); },
    getInputValue: function () { return elements.input ? elements.input.value : ''; },
    clearInput: clearInput,
    setInteraction: setInteraction,
    clearInteraction: clearInteraction,
    config: CONFIG,
    init: init
  };

  init();
})(window, document);

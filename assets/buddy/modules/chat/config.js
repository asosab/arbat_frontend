/**
 * Buddy Chat — configuración del módulo.
 *
 * El módulo se carga automáticamente cuando enabled=true. No depende de
 * data-buddy-abilities para poder invocarse mediante teclado, URL o API.
 */
window.BuddyChatConfig = window.BuddyChatConfig || {};
window.BuddyChatConfig = Object.assign({
  enabled: true,
  keyboardKey: 't',
  urlParameter: 'chat',
  sendWithEnter: true,
  placeholder: 'Escribe un comando…',
  buttonText: 'Enviar',
  checkboxText: 'Enviar con Enter'
}, window.BuddyChatConfig || {});

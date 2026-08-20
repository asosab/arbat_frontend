/**
 * Buddy Character — configuración del personaje.
 *
 * el personaje que debe utilizar y aplica fallback cuando sea necesario.
 */
window.BuddyCharacterConfig = window.BuddyCharacterConfig || {};
window.BuddyCharacterConfig = Object.assign({
  enabled: true,
  defaultCharacter: 'raulito',
  fallbackCharacter: 'raulito'
}, window.BuddyCharacterConfig || {});

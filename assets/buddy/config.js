/**
 * Buddy — configuración general de la aplicación.
 *
 * Esta configuración es común a todos los módulos.
 */
window.BuddyConfig = window.BuddyConfig || {};
window.BuddyConfig = Object.assign({
  // Debug global: todos los módulos Buddy deben usar esta bandera para sus trazas.
  debug: false,
  // Compatibilidad con módulos existentes que todavía consultan debugMode.
  debugMode: false,
  app: {
    siteId: 'arbat',
    email:  'arbat.archery@gmail.com'
  },

  // Registro de módulos que Buddy descubre automáticamente.
  // La activación real y cualquier condición se decide en cada config.js.
  modules: [
    'telemetry',
    'wa_listener',
    'user',
    'auth',
    'admin',
    'says',
    'chat',
    'archery'
  ],
}, window.BuddyConfig || {});

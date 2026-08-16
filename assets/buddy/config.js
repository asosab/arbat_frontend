/**
 * Buddy — configuración general de la aplicación.
 *
 * Esta configuración es común a todos los módulos.
 */
window.BuddyConfig = window.BuddyConfig || {};
window.BuddyConfig = Object.assign({
  // Debug global: todos los módulos Buddy deben usar esta bandera para sus trazas.
  debug: true,
  // Compatibilidad con módulos existentes que todavía consultan debugMode.
  debugMode: true,
  app: {
    siteId: 'arbat',
    email:  'arbat.archery@gmail.com'
  },
  debugMode: true
}, window.BuddyConfig || {});

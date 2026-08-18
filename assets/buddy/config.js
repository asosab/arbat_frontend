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
    email:  'info@arbatarchery.com'  //'arbat.archery@gmail.com'
  },
}, window.BuddyConfig || {});

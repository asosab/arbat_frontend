/**
 * Buddy — configuración general de la aplicación.
 *
 * Esta configuración es común a todos los módulos.
 */
window.BuddyConfig = window.BuddyConfig || {};
window.BuddyConfig = Object.assign({
  app: {
    siteId: 'arbat',
    email:  'arbat.archery@gmail.com'
  },
  debugMode: true
}, window.BuddyConfig || {});

/**
 * Buddy — configuración general de la aplicación.
 */
window.BuddyConfig = window.BuddyConfig || {};
window.BuddyConfig = Object.assign({
  debug: true,
  debugMode: false,
  app: {
    siteId: 'arbat',
    email: 'arbat.archery@gmail.com'
  },
  modules: [
    'telemetry',
    'wa_listener',
    'user',
    'auth',
    'admin',
    'dashboard',
    'says',
    'chat',
    'archeryGame',
    'archerySchool'
  ]
}, window.BuddyConfig || {});

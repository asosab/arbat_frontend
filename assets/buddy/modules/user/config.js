/** Buddy User — configuración del servicio de datos de usuario. */
window.BuddyUserConfig = window.BuddyUserConfig || {};
window.BuddyUserConfig = Object.assign({
  enabled: false,
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'user',
  endpoints: { update: '/api/buddy/user'}
}, window.BuddyUserConfig || {});

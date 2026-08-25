/** Buddy User — configuración universal del perfil Buddy. */
window.BuddyUserConfig = window.BuddyUserConfig || {};
window.BuddyUserConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'user',
  endpoints: {
    current: '/api/buddy/user',
    update: '/api/buddy/user',
    uploadPhoto: '/api/buddy/user/photo',
    removePhoto: '/api/buddy/user/photo'
  },
  fields: {
    email: true,
    phone: true,
    locale: true
  },
  locales: [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' }
  ]
}, window.BuddyUserConfig || {});

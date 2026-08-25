/** Buddy User — configuración universal del perfil Buddy. */
window.BuddyUserConfig = window.BuddyUserConfig || {};
var BUDDY_MOCK_QUERY = typeof window !== 'undefined' && /(?:^|[?&])buddyMock=1(?:&|$)/.test(window.location.search || '');
window.BuddyUserConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'user',
  /*
   * Mock local para diseñar/probar el formulario sin backend.
   * Desactivado por defecto: mock.enabled=false mantiene el comportamiento real.
   */
  mock: {
    enabled: BUDDY_MOCK_QUERY ? true : false,
    autoInitialize: true,
    persist: true,
    storageKey: 'buddy.user.mock',
    user: {
      id: 'mock-user-001',
      email: 'alejandro@example.com',
      firstName: 'Alejandro',
      lastName: 'Sosa',
      name: 'Alejandro Sosa',
      phone: '+591 70000000',
      locale: 'es'
    }
  },
  endpoints: {
    current: '/api/buddy/user',
    update: '/api/buddy/user',
    uploadPhoto: '/api/buddy/user/photo',
    removePhoto: '/api/buddy/user/photo'
  },
  fields: {
    email: true,
    firstName: true,
    lastName: true,
    name: true,
    phone: true,
    locale: true
  },
  /*
   * User es la autoridad sobre la completitud del perfil. Auth sólo autentica.
   * phone es el nombre canónico de API/modelo; la etiqueta visible puede
   * explicar que actualmente se utiliza principalmente para WhatsApp.
   */
  requiredProfileFields: ['name', 'phone'],
  onboarding: {
    enabled: true,
    emocion: 'sereno',
    emailLabel: 'Correo:',
    nameLabel: 'Nombre:',
    phoneLabel: 'Número celular que usa en WhatsApp',
    namePlaceholder: 'Escribe tu nombre',
    phonePlaceholder: 'Escribe tu número celular',
    submitText: 'enviar',
    cancelText: 'cancelar'
  },
  locales: [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' }
  ]
}, window.BuddyUserConfig || {});

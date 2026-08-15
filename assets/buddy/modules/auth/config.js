/**
 * Buddy Auth — configuración del módulo cliente.
 *
 * Las peticiones reales al servidor siempre pasan por Buddy Telemetry.
 * apiBaseUrl permite configurar explícitamente el dominio de Auth; durante
 * init() se sincroniza con la entrada auth de Buddy Telemetry.
 */
window.BuddyAuthConfig = window.BuddyAuthConfig || {};
window.BuddyAuthConfig = Object.assign({
  enabled: true,
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'auth',
  endpoints: {
    session: '/api/buddy/auth/session',
    login: '/api/buddy/auth/login',
    verify: '/api/buddy/auth/verify',
    logout: '/api/buddy/auth/logout'
  },
  verificationParameter: 'auth',
  cookieName: 'buddy',

  // Contrato esperado por el cliente. El servicio puede devolver campos
  // adicionales, pero estos son los datos públicos usados por Buddy.
  userFields: ['id', 'email', 'name', 'firstName', 'lastName', 'phone', 'locale', 'createdAt'],

  loginButtonText: 'Login',
  logoutButtonText: 'Logout',

  emailPlaceholder: 'Escribe tu dirección de correo',
  namePlaceholder: 'Escribe tu nombre',
  logoutPlaceholder: 'Escribe Si para cerrar tu sesion',

  loginMessage: 'Escribe tu correo en la caja de texto, te enviaré un link de verificación a esa dirección',
  emailSentMessage: 'Revisa tu correo y has click en el link de logueo',
  existingWelcomeTemplate: '¡Bienvenido, {name}!',
  newUserWelcomeMessage: '¡Bienvenido! ¿Cómo te llamas?',
  nameSavedTemplate: '¡Mucho gusto, {name}!',
  logoutQuestion: '¿Deseas cerrar tu sesión de usuario en este explorador?',
  logoutYesText: 'Si',
  logoutNoText: 'No',

  requestTimeoutMs: 15000
}, window.BuddyAuthConfig || {});

/**
 * Buddy Auth — configuración del módulo cliente.
 *
 * Autenticación basada en JWT (accessToken + refreshToken).
 * Sin cookies.
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
    logout: '/api/buddy/auth/logout',
    refresh: '/api/buddy/auth/refresh'
  },
  verificationParameter: 'auth',

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

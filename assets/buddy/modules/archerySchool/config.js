/** Buddy ArcherySchool — configuración genérica por sitio. */
window.BuddyArcherySchoolConfig = window.BuddyArcherySchoolConfig || {};
var BUDDY_MOCK_QUERY = typeof window !== 'undefined' && /(?:^|[?&])buddyMock=1(?:&|$)/.test(window.location.search || '');
window.BuddyArcherySchoolConfig = Object.assign({
  enabled: true,
  siteId: null,
  schoolName: null,
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'archerySchool',
  /*
   * Mock local para diseñar/probar ArcherySchool antes de implementar
   * controller y rutas en el backend. Desactivado por defecto.
   */
  mock: {
    enabled: BUDDY_MOCK_QUERY ? true : false,
    autoInitialize: true,
    persist: true,
    storageKey: 'buddy.archerySchool.mock',
    profile: {
      id: 'mock-school-profile-001',
      personaId: 'mock-user-001',
      siteId: 'arbat',
      fechaNacimiento: '1990-05-15',
      activo: true
    },
    enrollment: {
      id: 'mock-enrollment-001',
      siteId: 'arbat',
      personaId: 'mock-user-001',
      estado: 'activa',
      nivel: 'Inicial'
    },
    attributes: [
      { id: 'mock-attr-001', personaId: 'mock-user-001', tipo: 'altura', valorCm: 175, fuente: 'autorreportado' },
      { id: 'mock-attr-002', personaId: 'mock-user-001', tipo: 'peso', valorKg: 72, fuente: 'autorreportado' },
      { id: 'mock-attr-003', personaId: 'mock-user-001', tipo: 'aperturaBrazos', valorCm: 178, fuente: 'autorreportado' },
      { id: 'mock-attr-004', personaId: 'mock-user-001', tipo: 'aperturaArco', valorCm: 28, fuente: 'autorreportado' },
      { id: 'mock-attr-005', personaId: 'mock-user-001', tipo: 'librajeActual', valorLbs: 28, fuente: 'autorreportado' },
      { id: 'mock-attr-006', personaId: 'mock-user-001', tipo: 'lateralidad', valor: 'diestra', fuente: 'autorreportado' }
    ],
    equipment: [
      { id: 'mock-equipment-001', tipo: 'Empuñadura', marca: 'WNS', modelo: 'Explore', estado: 'activo' },
      { id: 'mock-equipment-002', tipo: 'Mira', marca: 'Shibuya', modelo: 'Ultima RC', estado: 'activo' },
      { id: 'mock-equipment-003', tipo: 'Flechas', marca: 'Easton', modelo: 'XX75', estado: 'activo' }
    ]
  },
  endpoints: {
    profile: '/api/buddy/archery-school/profile',
    enrollment: '/api/buddy/archery-school/enrollment',
    attributes: '/api/buddy/archery-school/attributes',
    attributeHistory: '/api/buddy/archery-school/attributes/history',
    equipment: '/api/buddy/archery-school/equipment',
    equipmentRelations: '/api/buddy/archery-school/equipment-relations'
  },
  permissions: {
    roles: ['student', 'instructor', 'admin']
  },
  attributeSources: [
    { value: 'autorreportado', label: 'Autorreportado' },
    { value: 'medido_en_escuela', label: 'Medido en la escuela' },
    { value: 'registrado_por_administrador', label: 'Registrado por administrador' }
  ],
  lateralidad: [
    { value: 'zurda', label: 'Zurda' },
    { value: 'izq-der', label: 'Izq-Der' },
    { value: 'diestra', label: 'Diestra' },
    { value: 'der-izq', label: 'Der-Izq' }
  ],
  posibilidadAdquisicion: [
    { value: 'remota', label: 'Remota' },
    { value: 'baja', label: 'Baja' },
    { value: 'viable', label: 'Viable' },
    { value: 'inmediata', label: 'Inmediata' }
  ],
  equipmentTypes: ['Brida', 'Tapa', 'Antebrazo', 'Pechera', 'Empuñadura', 'Mira', 'Palas', 'Flechas', 'Carcaj', 'Estabilizadores', 'Mochila'],
  equipmentStates: ['activo', 'baja', 'perdido', 'dañado']
}, window.BuddyArcherySchoolConfig || {});

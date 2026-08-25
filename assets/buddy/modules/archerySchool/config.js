/** Buddy ArcherySchool — configuración genérica por sitio. */
window.BuddyArcherySchoolConfig = window.BuddyArcherySchoolConfig || {};
var BUDDY_MOCK_QUERY = typeof window !== 'undefined' && /(?:^|[?&])buddyMock=1(?:&|$)/.test(window.location.search || '');
window.BuddyArcherySchoolConfig = Object.assign({
  enabled: true,
  siteId: null,
  schoolName: null,
  schoolOwnerCompany: 'arbatarchery.com',
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'archerySchool',

  /*
   * Mock local: permite diseñar/probar todo el flujo de ArcherySchool sin
   * controller ni rutas de backend. Desactivado por defecto.
   */
  mock: {
    enabled: BUDDY_MOCK_QUERY ? true : false,
    autoInitialize: true,
    persist: true,
    storageKey: 'buddy.archerySchool.mock',
    profile: {
      id: 'mock-archery-profile-001',
      buddyUserId: 'mock-user-001',
      nombreCompleto: 'Alejandro Sosa',
      fechaNacimiento: '1990-05-15',
    },
    students: [
      { id: 'mock-archery-profile-001', buddyUserId: 'mock-user-001', nombreCompleto: 'Alejandro Sosa', fechaNacimiento: '1990-05-15', email: 'alejandro@example.com', phone: '+591 70000001', estadoInscripcion: 'activo', fechaInscripcion: '2026-01-15', enrollment: { id: 'mock-enrollment-001', sitio: 'arbat', estado: 'activo', fechaInscripcion: '2026-01-15' }, datosArqueria: { altura: 175, peso: 72, lateralidad: 'Diestra', aperturaBrazos: 178, aperturaArco: 28, librajeActual: 28 } },
      { id: 'mock-archery-profile-002', buddyUserId: 'mock-user-002', nombreCompleto: 'María Fernanda Pérez', fechaNacimiento: '1992-09-21', email: 'maria@example.com', phone: '+591 70000002', estadoInscripcion: 'activo', fechaInscripcion: '2026-01-15', enrollment: { id: 'mock-enrollment-002', sitio: 'arbat', estado: 'activo', fechaInscripcion: '2026-01-20' }, datosArqueria: { altura: 168, peso: 61, lateralidad: 'Diestra', aperturaBrazos: 170, aperturaArco: 26, librajeActual: 24 } },
      { id: 'mock-archery-profile-003', buddyUserId: 'mock-user-003', nombreCompleto: 'Carlos Ramírez', fechaNacimiento: '1988-02-11', email: 'carlos@example.com', phone: '+591 70000003', estadoInscripcion: 'activo', fechaInscripcion: '2026-02-01', enrollment: { id: 'mock-enrollment-003', sitio: 'arbat', estado: 'activo', fechaInscripcion: '2026-02-01' }, datosArqueria: { altura: 181, peso: 80, lateralidad: 'Zurda', aperturaBrazos: 184, aperturaArco: 29, librajeActual: 32 } }
    ],
    enrollment: {
      id: 'mock-enrollment-001',
      personaId: 'mock-archery-profile-001',
      sitio: 'arbat',
      estado: 'activo',
      fechaInscripcion: '2026-01-15'
    },
    attributes: [
      { id: 'mock-attr-001', personaId: 'mock-archery-profile-001', tipo: 'altura', valorCm: 175, sitio: 'arbat', fuente: 'autorreportado' },
      { id: 'mock-attr-002', personaId: 'mock-archery-profile-001', tipo: 'peso', valorKg: 72, sitio: 'arbat', fuente: 'autorreportado' },
      { id: 'mock-attr-003', personaId: 'mock-archery-profile-001', tipo: 'aperturaBrazos', valorCm: 178, sitio: 'arbat', fuente: 'autorreportado' },
      { id: 'mock-attr-004', personaId: 'mock-archery-profile-001', tipo: 'aperturaArco', valorCm: 28, sitio: 'arbat', fuente: 'medido en escuela' },
      { id: 'mock-attr-005', personaId: 'mock-archery-profile-001', tipo: 'librajeActual', valorLbs: 28, sitio: 'arbat', fuente: 'medido en escuela' },
      { id: 'mock-attr-006', personaId: 'mock-archery-profile-001', tipo: 'lateralidad', valor: 'Diestra', sitio: 'arbat', fuente: 'autorreportado' },
      { id: 'mock-attr-007', personaId: 'mock-archery-profile-001', tipo: 'genero', valor: 'No especificado', fuente: 'autorreportado' },
      { id: 'mock-attr-009', personaId: 'mock-archery-profile-001', tipo: 'variacionBase', valor: 'Derecha', fuente: 'autorreportado' },
      { id: 'mock-attr-010', personaId: 'mock-archery-profile-001', tipo: 'posibilidadAdquisicion', valor: 'Viable', fuente: 'autorreportado' },
      { id: 'mock-attr-011', personaId: 'mock-archery-profile-001', tipo: 'documentoIdentidad', tipoDocumento: 'CI', numero: '1234567', paisEmisor: 'Bolivia', esPrincipal: true, fuente: 'autorreportado' }
    ],
    equipment: [
      {
        id: 'mock-equipment-001', tipo: 'Empuñadura', marca: 'WNS', modelo: 'Explore',
        numeroSerie: 'WNSEXP001', fechaAdquisicion: '2025-04-10', fechaBaja: null,
        estado: 'activo', notas: 'Equipo personal'
      },
      {
        id: 'mock-equipment-002', tipo: 'Mira', marca: 'Shibuya', modelo: 'Ultima RC',
        numeroSerie: 'SHI001', fechaAdquisicion: '2025-05-20', fechaBaja: null,
        estado: 'activo', notas: null
      },
      {
        id: 'mock-equipment-003', tipo: 'Flechas', marca: 'Easton', modelo: 'XX75',
        numeroSerie: null, fechaAdquisicion: null, fechaBaja: null,
        estado: 'activo', notas: 'Material de escuela'
      }
,      {
        id: 'mock-equipment-004', tipo: 'Carcaj', marca: 'Avalon', modelo: 'Tec One',
        numeroSerie: 'AVL001', fechaAdquisicion: '2026-02-03', fechaBaja: null,
        estado: 'activo', notas: 'Equipo de escuela disponible para préstamo'
      }
    ],
    equipmentRelations: [
      { id: 'mock-relation-001', equipoId: 'mock-equipment-001', tipo: 'propietario', parteTipo: 'persona', personaId: 'mock-archery-profile-001', empresa: null, vigenteDesde: '2025-04-10', vigenteHasta: null, notas: 'Compra' },
      { id: 'mock-relation-002', equipoId: 'mock-equipment-002', tipo: 'propietario', parteTipo: 'persona', personaId: 'mock-archery-profile-001', empresa: null, vigenteDesde: '2025-05-20', vigenteHasta: null, notas: null },
      { id: 'mock-relation-003', equipoId: 'mock-equipment-003', tipo: 'prestamo', parteTipo: 'empresa', personaId: null, empresa: 'arbatarchery.com', vigenteDesde: '2026-01-10', vigenteHasta: null, notas: 'Préstamo de escuela' }
,      { id: 'mock-relation-004', equipoId: 'mock-equipment-004', tipo: 'propietario', parteTipo: 'empresa', personaId: null, empresa: 'arbatarchery.com', vigenteDesde: '2026-02-03', vigenteHasta: null, notas: 'Propiedad de la escuela' }
    ]
  },

  endpoints: {
    students: '/api/buddy/archery-school/students',
    profile: '/api/buddy/archery-school/profile',
    enrollment: '/api/buddy/archery-school/enrollment',
    attributes: '/api/buddy/archery-school/attributes',
    attributeHistory: '/api/buddy/archery-school/attributes/history',
    equipment: '/api/buddy/archery-school/equipment',
    equipmentRelations: '/api/buddy/archery-school/equipment-relations'
  },

  permissions: { roles: ['student', 'instructor', 'admin'] },

  attributeSources: [
    { value: 'autorreportado', label: 'Autorreportado' },
    { value: 'medido_en_escuela', label: 'Medido en la escuela' },
    { value: 'registrado_por_administrador', label: 'Registrado por administrador' }
  ],

  lateralidad: [
    { value: 'Zurda', label: 'Zurda' },
    { value: 'Izq-Der', label: 'Izq-Der' },
    { value: 'Diestra', label: 'Diestra' },
    { value: 'Der-Izq', label: 'Der-Izq' }
  ],

  posibilidadAdquisicion: [
    { value: 'Remota', label: 'Remota' },
    { value: 'Baja', label: 'Baja' },
    { value: 'Viable', label: 'Viable' },
    { value: 'Inmediata', label: 'Inmediata' }
  ],

  enrollmentStates: [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Desactivado' },
    { value: 'egresado', label: 'Egresado' }
  ],

  equipmentTypes: ['Brida', 'Tapa', 'Antebrazo', 'Pechera', 'Empuñadura', 'Mira', 'Palas', 'Flechas', 'Carcaj', 'Estabilizadores', 'Mochila'],

  equipmentStates: [
    { value: 'activo', label: 'Activo' },
    { value: 'baja', label: 'Baja' },
    { value: 'perdido', label: 'Perdido' },
    { value: 'dañado', label: 'Dañado' }
  ],

  relationTypes: [
    { value: 'propietario', label: 'Propietario' },
    { value: 'prestamo', label: 'Préstamo' }
  ],

  relationPartyTypes: [
    { value: 'persona', label: 'Persona' },
    { value: 'empresa', label: 'Empresa' }
  ]
}, window.BuddyArcherySchoolConfig || {});

/** Buddy ArcherySchool — configuración genérica por sitio. */
window.BuddyArcherySchoolConfig = window.BuddyArcherySchoolConfig || {};
window.BuddyArcherySchoolConfig = Object.assign({
  enabled: true,
  siteId: null,
  schoolName: null,
  schoolOwnerCompany: 'arbatarchery.com',
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'archerySchool',

  endpoints: {
    users: '/api/buddy/users/list',
    profile: '/api/buddy/archerySchool/profile',
    attributes: '/api/buddy/archerySchool/attributes',
    attributeHistory: '/api/buddy/archerySchool/attributes/history',
    equipment: '/api/buddy/archerySchool/equipment',
    equipmentRelations: '/api/buddy/archerySchool/equipment-relations'
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

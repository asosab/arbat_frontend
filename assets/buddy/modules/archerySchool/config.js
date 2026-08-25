/** Buddy ArcherySchool — configuración genérica por sitio. */
window.BuddyArcherySchoolConfig = window.BuddyArcherySchoolConfig || {};
window.BuddyArcherySchoolConfig = Object.assign({
  enabled: true,
  siteId: null,
  schoolName: null,
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'archerySchool',
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

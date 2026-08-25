/**
 * Buddy ArcherySchool — perfil, inscripción, atributos y equipamiento.
 *
 * El módulo es genérico: siteId procede de BuddyConfig.app.siteId o de su
 * configuración explícita. No crea identidad, autenticación ni permisos.
 */
window.Buddy = window.Buddy || {};
(function (window, document) {
  'use strict';
  var CONFIG = window.BuddyArcherySchoolConfig || {};
  var state = { profile: null, enrollment: null, attributes: [], equipment: [], mock: false };

  function mockEnabled() {
    return !!(CONFIG.mock && CONFIG.mock.enabled === true);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function mockStorageKey() {
    return (CONFIG.mock && CONFIG.mock.storageKey) || 'buddy.archerySchool.mock';
  }

  function mockSeed() {
    var mock = CONFIG.mock || {};
    return {
      profile: clone(mock.profile || null),
      enrollment: clone(mock.enrollment || null),
      attributes: clone(mock.attributes || []),
      equipment: clone(mock.equipment || [])
    };
  }

  function mockLoad() {
    var data = mockSeed();
    if (CONFIG.mock && CONFIG.mock.persist !== false) {
      try {
        var saved = window.localStorage.getItem(mockStorageKey());
        if (saved) data = Object.assign(data, JSON.parse(saved));
      } catch (e) {}
    }
    return data;
  }

  function mockSave() {
    if (CONFIG.mock && CONFIG.mock.persist !== false) {
      try {
        window.localStorage.setItem(mockStorageKey(), JSON.stringify({
          profile: state.profile,
          enrollment: state.enrollment,
          attributes: state.attributes,
          equipment: state.equipment
        }));
      } catch (e) {}
    }
  }

  function resetMock() {
    var data = mockLoad();
    state.profile = data.profile;
    state.enrollment = data.enrollment;
    state.attributes = Array.isArray(data.attributes) ? data.attributes : [];
    state.equipment = Array.isArray(data.equipment) ? data.equipment : [];
    state.mock = true;
    mockSave();
    return getStateSnapshot();
  }

  function getStateSnapshot() {
    return {
      profile: clone(state.profile),
      enrollment: clone(state.enrollment),
      attributes: clone(state.attributes),
      equipment: clone(state.equipment),
      mock: state.mock
    };
  }

  function mockResult(data) {
    return { ok: true, mock: true, data: clone(data) };
  }

  function telemetry() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') throw new Error('Buddy Telemetry no está disponible.');
    return window.Buddy.telemetry;
  }
  function siteId() {
    return CONFIG.siteId || (window.BuddyConfig && window.BuddyConfig.app && window.BuddyConfig.app.siteId) || null;
  }
  function token() {
    return window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function' ? window.Buddy.auth.getAccessToken() : null;
  }
  function configureApi() {
    telemetry().configureApi(CONFIG.apiService || 'archerySchool', { baseUrl: CONFIG.apiBaseUrl });
  }
  function request(path, method, body) {
    if (mockEnabled()) return Promise.resolve(mockResult(body || {}));
    var accessToken = token();
    if (!accessToken) return Promise.reject(new Error('No hay token de autenticación.'));
    configureApi();
    var headers = { Authorization: 'Bearer ' + accessToken };
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return telemetry().request(CONFIG.apiService || 'archerySchool', path, { method: method || 'GET', headers: headers, body: body });
  }
  function withSite(data) {
    var result = Object.assign({}, data || {});
    if (!result.siteId && !result.sitio) result.siteId = siteId();
    return result;
  }
  function assertSite() {
    if (!siteId()) throw new Error('ArcherySchool requiere BuddyConfig.app.siteId.');
  }

  function getProfile() {
    assertSite();
    if (mockEnabled()) return Promise.resolve(state.profile);
    return request(CONFIG.endpoints.profile + '?siteId=' + encodeURIComponent(siteId()), 'GET').then(function (r) { state.profile = r && (r.profile || r.data || r); return state.profile; });
  }

  function createProfile(data) {
    assertSite();
    if (mockEnabled()) {
      state.profile = Object.assign({}, state.profile || {}, withSite(data), { id: (state.profile && state.profile.id) || 'mock-school-profile-' + Date.now() });
      mockSave();
      return Promise.resolve(mockResult(state.profile));
    }
    return request(CONFIG.endpoints.profile, 'POST', withSite(data)).then(function (r) { state.profile = r && (r.profile || r.data || r); return r; });
  }

  function updateProfile(data) {
    assertSite();
    if (mockEnabled()) {
      state.profile = Object.assign({}, state.profile || {}, withSite(data));
      mockSave();
      return Promise.resolve(mockResult(state.profile));
    }
    return request(CONFIG.endpoints.profile, 'PUT', withSite(data)).then(function (r) { state.profile = r && (r.profile || r.data || r); return r; });
  }

  function getEnrollment() {
    assertSite();
    if (mockEnabled()) return Promise.resolve(state.enrollment);
    return request(CONFIG.endpoints.enrollment + '?siteId=' + encodeURIComponent(siteId()), 'GET').then(function (r) { state.enrollment = r && (r.enrollment || r.data || r); return state.enrollment; });
  }

  function createEnrollment(data) {
    assertSite();
    if (mockEnabled()) {
      state.enrollment = Object.assign({}, state.enrollment || {}, withSite(data), { id: (state.enrollment && state.enrollment.id) || 'mock-enrollment-' + Date.now() });
      mockSave();
      return Promise.resolve(mockResult(state.enrollment));
    }
    return request(CONFIG.endpoints.enrollment, 'POST', withSite(data));
  }

  function updateEnrollment(data) {
    assertSite();
    if (mockEnabled()) {
      state.enrollment = Object.assign({}, state.enrollment || {}, withSite(data));
      mockSave();
      return Promise.resolve(mockResult(state.enrollment));
    }
    return request(CONFIG.endpoints.enrollment, 'PUT', withSite(data));
  }

  function getAttributes() {
    assertSite();
    if (mockEnabled()) return Promise.resolve(state.attributes);
    return request(CONFIG.endpoints.attributes + '?siteId=' + encodeURIComponent(siteId()), 'GET').then(function (r) { state.attributes = Array.isArray(r) ? r : (r && (r.attributes || r.data)) || []; return state.attributes; });
  }

  function setAttribute(data) {
    assertSite();
    if (mockEnabled()) {
      var item = Object.assign({}, withSite(data), { id: data && data.id || 'mock-attr-' + Date.now() });
      var replaced = false;
      state.attributes = state.attributes.map(function (existing) {
        if (existing && existing.tipo === item.tipo && !existing.vigenteHasta) { replaced = true; return item; }
        return existing;
      });
      if (!replaced) state.attributes.push(item);
      mockSave();
      return Promise.resolve(mockResult(item));
    }
    return request(CONFIG.endpoints.attributes, 'POST', withSite(data)).then(function (r) { getAttributes().catch(function () {}); return r; });
  }

  function getAttributeHistory(type) {
    assertSite();
    if (mockEnabled()) return Promise.resolve(state.attributes.filter(function (item) { return item && item.tipo === type; }));
    var query = '?siteId=' + encodeURIComponent(siteId()) + '&tipo=' + encodeURIComponent(type); return request(CONFIG.endpoints.attributeHistory + query, 'GET');
  }

  function getEquipment(options) {
    assertSite();
    options = options || {};
    if (mockEnabled()) {
      var list = state.equipment.slice();
      if (options.personaId) list = list.filter(function (item) { return !item.personaId || item.personaId === options.personaId; });
      return Promise.resolve(list);
    }
    var query = '?siteId=' + encodeURIComponent(siteId()); if (options.personaId) query += '&personaId=' + encodeURIComponent(options.personaId); return request(CONFIG.endpoints.equipment + query, 'GET').then(function (r) { state.equipment = Array.isArray(r) ? r : (r && (r.equipment || r.data)) || []; return state.equipment; });
  }

  function createEquipment(data) {
    assertSite();
    if (mockEnabled()) {
      var item = Object.assign({}, withSite(data), { id: data && data.id || 'mock-equipment-' + Date.now() });
      state.equipment.push(item); mockSave(); return Promise.resolve(mockResult(item));
    }
    return request(CONFIG.endpoints.equipment, 'POST', withSite(data));
  }

  function updateEquipment(data) {
    assertSite();
    if (mockEnabled()) {
      var id = data && (data.id || data._id);
      state.equipment = state.equipment.map(function (item) { return String(item.id || item._id) === String(id) ? Object.assign({}, item, data) : item; });
      mockSave(); return Promise.resolve(mockResult(data));
    }
    return request(CONFIG.endpoints.equipment, 'PUT', withSite(data));
  }

  function getEquipmentRelations(equipoId) {
    assertSite();
    if (mockEnabled()) return Promise.resolve([]);
    return request(CONFIG.endpoints.equipmentRelations + '?siteId=' + encodeURIComponent(siteId()) + '&equipoId=' + encodeURIComponent(equipoId), 'GET');
  }

  function createEquipmentRelation(data) {
    assertSite();
    if (mockEnabled()) return Promise.resolve(mockResult(Object.assign({}, withSite(data), { id: 'mock-relation-' + Date.now() })));
    return request(CONFIG.endpoints.equipmentRelations, 'POST', withSite(data));
  }

  function closeEquipmentRelation(id, vigenteHasta) {
    assertSite();
    if (mockEnabled()) return Promise.resolve(mockResult({ id: id, vigenteHasta: vigenteHasta || new Date().toISOString() }));
    return request(CONFIG.endpoints.equipmentRelations + '/' + encodeURIComponent(id), 'PUT', withSite({ vigenteHasta: vigenteHasta || new Date().toISOString() }));
  }

  if (mockEnabled() && (!CONFIG.mock || CONFIG.mock.autoInitialize !== false)) {
    resetMock();
  }

  function latestAttribute(type) {
    var matches = state.attributes.filter(function (item) { return item && item.tipo === type && !item.vigenteHasta; });
    return matches.length ? matches[matches.length - 1] : null;
  }
  var MODULE_SCRIPT_URL = (function () {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) return currentScript.src;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/(?:^|\/)buddy_archerySchool\.js(?:[?#]|$)/.test(scripts[i].src || '')) return scripts[i].src;
    }
    return null;
  })();

  function getViewLoader(viewId) {
    var views = window.BuddyArcherySchoolViews || {};
    var id = String(viewId || 'student').toLowerCase();
    return typeof views[id] === 'function' ? views[id] : null;
  }

  function loadView(viewId) {
    var id = String(viewId || 'student').toLowerCase();
    var existing = getViewLoader(id);
    if (existing) return Promise.resolve(existing);
    if (!MODULE_SCRIPT_URL) return Promise.reject(new Error('No se pudo determinar la ubicación del módulo ArcherySchool.'));
    var url = new URL('views/' + id + '.js', MODULE_SCRIPT_URL).href;
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () {
        var view = getViewLoader(id);
        if (!view) return reject(new Error('La vista ArcherySchool "' + id + '" no registró su implementación.'));
        resolve(view);
      };
      script.onerror = function () { reject(new Error('No se pudo cargar la vista ArcherySchool "' + id + '".')); };
      document.head.appendChild(script);
    });
  }

  function render(options) {
    options = options || {};
    return loadView(options.view || 'student').then(function (view) {
      if (!options.target) throw new Error('ArcherySchool requiere un contenedor de destino.');
      return view({
        target: options.target,
        state: state,
        config: CONFIG,
        api: window.Buddy.archerySchool,
        context: options.context || {},
        role: options.role || 'student'
      });
    });
  }

  window.Buddy.archerySchool = {
    config: CONFIG,
    getProfile: getProfile,
    createProfile: createProfile,
    updateProfile: updateProfile,
    getEnrollment: getEnrollment,
    createEnrollment: createEnrollment,
    updateEnrollment: updateEnrollment,
    getAttributes: getAttributes,
    setAttribute: setAttribute,
    getAttributeHistory: getAttributeHistory,
    getEquipment: getEquipment,
    createEquipment: createEquipment,
    updateEquipment: updateEquipment,
    getEquipmentRelations: getEquipmentRelations,
    createEquipmentRelation: createEquipmentRelation,
    closeEquipmentRelation: closeEquipmentRelation,
    mock: {
      enabled: mockEnabled,
      reset: function () { if (!mockEnabled()) throw new Error('Activa BuddyArcherySchoolConfig.mock.enabled para usar ArcherySchool mock.'); return resetMock(); },
      save: mockSave
    },
    render: render,
    renderProfile: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'student' })); },
    renderStudent: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'student' })); },
    renderAdmin: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'admin' })); },
    getState: function () { return getStateSnapshot(); }
  };
})(window, document);

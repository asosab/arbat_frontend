(() => {
  'use strict';

  const HISTORY_KEY = 'arbat-training-history';
  const CURRENT_KEY = 'arbat-training-current';
  const ANONYMOUS_DEVICE_KEY = 'arbat-anonymous-device-id';
  const $ = id => document.getElementById(id);
  const state = { directoryLoaded: false, privileged: false, users: [], selectedUser: null, renderSequence: 0 };

  const valueOf = arrow => arrow && arrow.label === 'M' ? 0 : Number(arrow && arrow.score) || 0;
  const arrowsOf = session => [...(session.completed || []).flatMap(end => end.arrows || []), ...(session.current || [])];
  const readJson = (key, fallback) => {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch (_) { return fallback; }
  };

  function dateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function parseLocalDate(key) {
    const parts = String(key || '').split('-').map(Number);
    return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(NaN);
  }

  function today() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
  function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
  function formatDate(date, options) { return new Intl.DateTimeFormat('es-BO', options).format(date); }
  function formatNumber(value, decimals = 2) { return Number(value).toFixed(decimals).replace('.', ','); }

  function rawCurrentUser() {
    if (window.ArbatUser && typeof window.ArbatUser.get === 'function') return window.ArbatUser.get();
    if (window.Buddy && window.Buddy.auth && typeof window.Buddy.auth.getUser === 'function') return window.Buddy.auth.getUser();
    return null;
  }

  function userId(user) {
    return String(user && (user.id ?? user._id ?? user.buddyUserId ?? user.personaId ?? user.anonymousId ?? user.deviceId ?? user.email) || '');
  }

  function userName(user) {
    return String(user && (user.name || user.nombreCompleto || user.fullName || user.firstName || user.email || user.displayName) || '').trim();
  }

  function normalizeUser(user, fallbackIndex = 0) {
    const id = userId(user) || `anonymous:${fallbackIndex}`;
    const name = userName(user);
    const anonymous = Boolean(user && (user.anonymous || user.anonymousId || user.deviceId || user.macAddress)) || !name;
    const identifier = String(user && (user.anonymousId || user.deviceId || user.macAddress || user.email || id) || id);
    return { id, name: name || `Sin nombre · ${identifier.slice(-8)}`, identifier, anonymous, raw: user || {} };
  }

  function currentUser() {
    const user = rawCurrentUser();
    if (user) return normalizeUser(user);
    let anonymousId = '';
    try { anonymousId = localStorage.getItem(ANONYMOUS_DEVICE_KEY) || ''; } catch (_) {}
    return anonymousId
      ? { id: `anon:${anonymousId}`, name: 'Este dispositivo', identifier: anonymousId, anonymous: true, raw: {} }
      : { id: 'device:local', name: 'Este dispositivo', identifier: 'local', anonymous: true, raw: {} };
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'A';
  }

  function rolesOf(user) {
    const values = [];
    ['role', 'rol', 'type', 'tipo'].forEach(key => { if (user && user[key]) values.push(user[key]); });
    [user && user.roles, user && user.permissions && user.permissions.roles].forEach(group => {
      if (Array.isArray(group)) values.push(...group); else if (group) values.push(group);
    });
    return values.flatMap(value => String(value).toLowerCase().split(/[\s,;|]+/)).filter(Boolean);
  }

  function isPrivileged() {
    const buddyAdmin = window.Buddy && window.Buddy.admin;
    if (buddyAdmin && typeof buddyAdmin.isAdmin === 'function' && buddyAdmin.isAdmin()) return true;
    return rolesOf(rawCurrentUser()).some(role => ['admin', 'superadmin', 'instructor', 'trainer', 'coach', 'entrenador'].includes(role));
  }

  function normalizeSession(session) {
    const arrows = Array.isArray(session.arrows) ? session.arrows : arrowsOf(session);
    const startedAt = session.startedAt || session.startTime || arrows[0] && arrows[0].recordedAt || '';
    const endedAt = session.endedAt || session.endTime || arrows[arrows.length - 1] && arrows[arrows.length - 1].recordedAt || '';
    return { ...session, date: session.date || dateKey(startedAt || endedAt), startedAt, endedAt, arrows };
  }

  function localSessions() {
    const saved = readJson(HISTORY_KEY, []);
    const sessions = Array.isArray(saved) ? saved.slice() : [];
    const current = readJson(CURRENT_KEY, null);
    if (current && arrowsOf(current).length) sessions.push({ ...current, isCurrent: true });
    return sessions.map(normalizeSession).filter(session => session.date && session.arrows.length);
  }

  function sessionsForLocalUser(user) {
    return localSessions().filter(session => {
      const ownerId = session.owner && session.owner.id != null ? String(session.owner.id) : '';
      if (user.id === 'device:local') return !ownerId;
      return ownerId ? ownerId === user.id : user.id === currentUser().id;
    });
  }

  function selectedRange() {
    const days = Number($('periodSelect').value) || 30;
    const end = today(), start = addDays(end, -days + 1);
    return { days, start, end, startKey: dateKey(start), endKey: dateKey(end) };
  }

  async function loadSessions(range, user) {
    const provider = window.Buddy && window.Buddy.trainingHistory;
    if (provider && typeof provider.getSessions === 'function') {
      const response = await provider.getSessions({ userId: user.id, from: range.startKey, to: range.endKey });
      const list = Array.isArray(response) ? response : response && (response.sessions || response.data) || [];
      return list.map(normalizeSession).filter(session => session.date >= range.startKey && session.date <= range.endKey);
    }
    const own = currentUser();
    const canReadLocally = user.id === own.id || user.id === 'device:local' || localSessions().some(session => session.owner && String(session.owner.id) === user.id);
    return canReadLocally ? sessionsForLocalUser(user).filter(session => session.date >= range.startKey && session.date <= range.endKey) : [];
  }

  function dailyData(sessions, range) {
    const map = new Map();
    for (let index = 0; index < range.days; index += 1) {
      const key = dateKey(addDays(range.start, index));
      map.set(key, { date: key, arrows: 0, total: 0, sessions: [] });
    }
    sessions.forEach(session => {
      const day = map.get(session.date); if (!day) return;
      day.sessions.push(session);
      session.arrows.forEach(arrow => { day.arrows += 1; day.total += valueOf(arrow); });
    });
    return Array.from(map.values()).map(day => ({ ...day, average: day.arrows ? day.total / day.arrows : null }));
  }

  function renderIdentity(user, source = 'local') {
    $('athleteName').textContent = user.name;
    $('athleteAvatar').textContent = initials(user.name);
    $('dataScope').textContent = source === 'remote'
      ? `Historial de ${user.name} guardado en arbat.`
      : `Sesiones de ${user.name} guardadas en este dispositivo.`;
  }

  function renderKpis(sessions) {
    const arrows = sessions.flatMap(session => session.arrows);
    const total = arrows.reduce((sum, arrow) => sum + valueOf(arrow), 0);
    $('kpiSessions').textContent = String(sessions.length);
    $('kpiArrows').textContent = String(arrows.length);
    $('kpiAverage').textContent = arrows.length ? formatNumber(total / arrows.length) : '—';
    $('kpiDays').textContent = String(new Set(sessions.map(session => session.date)).size);
  }

  function closePopover() {
    const popover = $('historyPopover'); popover.hidden = true; popover.replaceChildren();
  }

  function showPopover(content, anchor, wide = false) {
    const popover = $('historyPopover'); popover.replaceChildren();
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'popover-close'; close.setAttribute('aria-label', 'Cerrar'); close.textContent = '×';
    close.addEventListener('click', event => { event.stopPropagation(); closePopover(); });
    popover.append(close, content); popover.classList.toggle('history-popover--wide', wide); popover.hidden = false;
    const rect = anchor.getBoundingClientRect(), box = popover.getBoundingClientRect(), margin = 10;
    let left = rect.left + rect.width / 2 - box.width / 2, top = rect.bottom + 10;
    left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
    if (top + box.height > window.innerHeight - margin) top = Math.max(margin, rect.top - box.height - 10);
    popover.style.left = `${left}px`; popover.style.top = `${top}px`;
  }

  function metricContent(title, day, value, unit) {
    const content = document.createElement('div'), heading = document.createElement('h3'), date = document.createElement('p'), metric = document.createElement('strong');
    heading.textContent = title;
    date.textContent = formatDate(parseLocalDate(day.date), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    metric.textContent = `${value} ${unit}`; content.append(heading, date, metric);
    if (day.sessions.length > 1) { const note = document.createElement('small'); note.textContent = `${day.sessions.length} sesiones ese día`; content.append(note); }
    return content;
  }

  function interactive(node, label, callback) {
    node.setAttribute('role', 'button'); node.setAttribute('tabindex', '0'); node.setAttribute('aria-label', label);
    node.addEventListener('click', event => { event.stopPropagation(); callback(node); });
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); callback(node); }
    });
  }

  function constellation(arrows) {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'day-constellation'); svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Constelación de ${arrows.length} flechas`);
    const rings = [[48, '#f5f5ed'], [43.2, '#f5f5ed'], [38.4, '#17191b'], [33.6, '#17191b'], [28.8, '#21a0d8'], [24, '#21a0d8'], [19.2, '#e64b3e'], [14.4, '#e64b3e'], [9.6, '#ffd52f'], [4.8, '#ffd52f']];
    rings.forEach(([radius, fill]) => {
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '50'); circle.setAttribute('cy', '50'); circle.setAttribute('r', String(radius)); circle.setAttribute('fill', fill);
      circle.setAttribute('stroke', fill === '#17191b' ? '#727980' : '#25282b'); circle.setAttribute('stroke-width', '.32'); svg.append(circle);
    });
    const crossH = document.createElementNS(ns, 'line'), crossV = document.createElementNS(ns, 'line');
    [['x1', '48'], ['x2', '52'], ['y1', '50'], ['y2', '50']].forEach(([key, value]) => crossH.setAttribute(key, value));
    [['x1', '50'], ['x2', '50'], ['y1', '48'], ['y2', '52']].forEach(([key, value]) => crossV.setAttribute(key, value));
    [crossH, crossV].forEach(line => { line.setAttribute('stroke', '#222'); line.setAttribute('stroke-width', '.35'); svg.append(line); });
    arrows.forEach((arrow, index) => {
      if (!Number.isFinite(Number(arrow.x)) || !Number.isFinite(Number(arrow.y))) return;
      const group = document.createElementNS(ns, 'g'), dot = document.createElementNS(ns, 'circle'), text = document.createElementNS(ns, 'text');
      dot.setAttribute('cx', String(Math.max(1.8, Math.min(98.2, Number(arrow.x))))); dot.setAttribute('cy', String(Math.max(1.8, Math.min(98.2, Number(arrow.y)))));
      dot.setAttribute('r', '2.05'); dot.setAttribute('class', arrow.label === 'M' ? 'constellation-hit is-miss' : 'constellation-hit');
      text.setAttribute('x', dot.getAttribute('cx')); text.setAttribute('y', String(Number(dot.getAttribute('cy')) + .8)); text.setAttribute('class', 'constellation-number');
      text.textContent = String(index + 1); group.append(dot, text); svg.append(group);
    });
    return svg;
  }

  function timeValue(value) {
    const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : formatDate(date, { hour: '2-digit', minute: '2-digit' });
  }

  function dayDetails(day) {
    const content = document.createElement('div'); content.className = 'day-detail';
    const title = document.createElement('h3'); title.textContent = formatDate(parseLocalDate(day.date), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const starts = day.sessions.map(session => session.startedAt).filter(Boolean).sort(), ends = day.sessions.map(session => session.endedAt).filter(Boolean).sort();
    const summary = document.createElement('dl');
    [['Hora de inicio', timeValue(starts[0])], ['Hora final', timeValue(ends[ends.length - 1])], ['Puntaje total', String(day.total)], ['Flechas lanzadas', String(day.arrows)], ['Promedio', day.average == null ? '—' : formatNumber(day.average)]].forEach(([label, value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; summary.append(dt, dd);
    });
    const subtitle = document.createElement('h4'); subtitle.textContent = 'Constelación del día';
    content.append(title, summary, subtitle, constellation(day.sessions.flatMap(session => session.arrows))); return content;
  }

  function renderCalendar(days) {
    const root = $('activityCalendar'); root.replaceChildren();
    const max = Math.max(0, ...days.map(day => day.arrows)), firstDay = (parseLocalDate(days[0] && days[0].date).getDay() + 6) % 7;
    for (let index = 0; index < firstDay; index += 1) { const blank = document.createElement('span'); blank.className = 'activity-day is-empty'; blank.setAttribute('aria-hidden', 'true'); root.append(blank); }
    days.forEach(day => {
      const cell = document.createElement(day.arrows ? 'button' : 'span');
      const level = !day.arrows ? 0 : Math.max(1, Math.ceil(day.arrows / Math.max(1, max) * 3));
      const label = `${formatDate(parseLocalDate(day.date), { day: 'numeric', month: 'short', year: 'numeric' })}: ${day.arrows} flechas`;
      cell.className = 'activity-day'; cell.dataset.level = String(level); cell.title = label;
      if (day.arrows) {
        cell.type = 'button'; cell.setAttribute('aria-label', `${label}. Mostrar resumen y constelación.`);
        cell.addEventListener('click', event => { event.stopPropagation(); showPopover(dayDetails(day), cell, true); });
      }
      root.append(cell);
    });
  }

  function svgElement(name, attributes = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value))); return node;
  }

  function enableChartGestures(root, svg) {
    const pointers = new Map();
    let gesture = null;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const pair = () => Array.from(pointers.entries()).slice(0, 2);
    const localMidpoint = entries => {
      const rect = root.getBoundingClientRect();
      return ((entries[0][1].x + entries[1][1].x) / 2) - rect.left;
    };
    const distance = entries => Math.max(1, Math.hypot(entries[0][1].x - entries[1][1].x, entries[0][1].y - entries[1][1].y));
    const setZoom = zoom => {
      root.dataset.zoom = String(zoom);
      svg.style.width = `${zoom * 100}%`;
      root.classList.toggle('is-zoomed', zoom > 1.01);
    };
    const beginGesture = () => {
      const entries = pair();
      if (entries.length < 2) return;
      const zoom = Number(root.dataset.zoom) || 1;
      const mid = localMidpoint(entries);
      gesture = {
        distance: distance(entries),
        zoom,
        anchor: (root.scrollLeft + mid) / zoom
      };
      entries.forEach(([id]) => { try { svg.setPointerCapture(id); } catch (_) {} });
      root.classList.add('is-gesturing');
    };
    const updateGesture = event => {
      if (!gesture || pointers.size < 2) return;
      const entries = pair(), mid = localMidpoint(entries);
      const zoom = clamp(gesture.zoom * distance(entries) / gesture.distance, 1, 20);
      setZoom(zoom);
      root.scrollLeft = gesture.anchor * zoom - mid;
      event.preventDefault();
    };
    const finishPointer = event => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) { gesture = null; root.classList.remove('is-gesturing'); }
    };
    setZoom(1);
    svg.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) { beginGesture(); event.preventDefault(); }
    });
    svg.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      updateGesture(event);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => svg.addEventListener(name, finishPointer));
  }

  function renderChart(rootId, days, type) {
    const root = $(rootId); root.replaceChildren();
    const active = type === 'average' ? days.filter(day => day.average != null) : days;
    if (!active.some(day => type === 'average' ? day.average != null : day.arrows > 0)) {
      const empty = document.createElement('div'); empty.className = 'chart-empty'; empty.textContent = 'Todavía no hay datos en este período.'; root.append(empty); return;
    }
    const width = 1000, height = 220, left = 48, right = 16, top = 14, bottom = 30;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const values = active.map(day => type === 'average' ? day.average : day.arrows), max = type === 'average' ? 10 : Math.max(1, ...values);
    const svg = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' });
    [0, .5, 1].forEach(ratio => {
      const y = top + plotHeight * ratio; svg.append(svgElement('line', { x1: left, y1: y, x2: width - right, y2: y, class: 'grid-line' }));
      const label = svgElement('text', { x: left - 7, y: y + 4, 'text-anchor': 'end' }); label.textContent = String(Math.round(max * (1 - ratio) * 10) / 10).replace('.', ','); svg.append(label);
    });
    if (type === 'volume') {
      const step = plotWidth / days.length, barWidth = Math.max(1.5, step * .72);
      days.forEach((day, index) => {
        const barHeight = day.arrows / max * plotHeight;
        const bar = svgElement('rect', { x: left + index * step + (step - barWidth) / 2, y: top + plotHeight - barHeight, width: barWidth, height: Math.max(0, barHeight), class: 'bar', rx: Math.min(2, barWidth / 2) });
        if (day.arrows) interactive(bar, `${day.date}: ${day.arrows} flechas`, target => showPopover(metricContent('Cantidad de Flechas', day, day.arrows, day.arrows === 1 ? 'flecha' : 'flechas'), target));
        svg.append(bar);
      });
    } else {
      const points = active.map(day => {
        const index = days.findIndex(item => item.date === day.date);
        const x = left + (days.length === 1 ? plotWidth / 2 : index / (days.length - 1) * plotWidth), y = top + plotHeight - day.average / max * plotHeight;
        return { x, y, day };
      });
      svg.append(svgElement('path', { d: points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '), class: 'trend' }));
      points.forEach(point => {
        const hit = svgElement('circle', { cx: point.x, cy: point.y, r: 11, class: 'dot-hit' }), dot = svgElement('circle', { cx: point.x, cy: point.y, r: 3.5, class: 'dot' });
        interactive(hit, `${point.day.date}: promedio ${formatNumber(point.day.average)}`, target => showPopover(metricContent('Promedio del día', point.day, formatNumber(point.day.average), 'puntos'), target));
        svg.append(hit, dot);
      });
    }
    const every = Math.max(1, Math.ceil(days.length / 5));
    days.forEach((day, index) => {
      if (index % every && index !== days.length - 1) return;
      const x = left + (days.length === 1 ? plotWidth / 2 : index / (days.length - 1) * plotWidth), label = svgElement('text', { x, y: height - 8, 'text-anchor': index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle' });
      label.textContent = formatDate(parseLocalDate(day.date), { day: 'numeric', month: 'short' }); svg.append(label);
    });
    root.append(svg); enableChartGestures(root, svg);
  }

  function renderSessions(sessions) {
    const root = $('sessionList'); root.replaceChildren();
    if (!sessions.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No hay sesiones registradas en este período.'; root.append(empty); return; }
    sessions.slice().sort((a, b) => String(b.startedAt || b.date).localeCompare(String(a.startedAt || a.date))).slice(0, 12).forEach(session => {
      const total = session.arrows.reduce((sum, arrow) => sum + valueOf(arrow), 0), average = session.arrows.length ? total / session.arrows.length : 0;
      const row = document.createElement('article'); row.className = 'session-row';
      const text = document.createElement('div'), title = document.createElement('h3'), meta = document.createElement('p');
      title.textContent = formatDate(parseLocalDate(session.date), { weekday: 'short', day: 'numeric', month: 'long' });
      const ends = (session.completed || []).length + (session.current && session.current.length ? 1 : 0);
      meta.textContent = `${session.arrows.length} flechas · ${ends} andanada${ends === 1 ? '' : 's'}${session.isCurrent ? ' · En curso' : ''}`; text.append(title, meta);
      const score = document.createElement('div'); score.className = 'session-score';
      const strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = formatNumber(average); small.textContent = 'promedio'; score.append(strong, small);
      row.append(text, score); root.append(row);
    });
  }

  function localDirectoryUsers() {
    const users = new Map();
    localSessions().forEach(session => { if (session.owner && session.owner.id != null) { const item = normalizeUser(session.owner); users.set(item.id, item); } });
    const current = currentUser(); users.set(current.id, current); return Array.from(users.values());
  }

  async function fetchDirectoryOnce() {
    if (state.directoryLoaded) return state.users;
    state.directoryLoaded = true;
    const local = localDirectoryUsers(); let remote = [];
    const provider = window.Buddy && window.Buddy.trainingHistory, school = window.Buddy && window.Buddy.archerySchool;
    try {
      if (provider && typeof provider.getUsers === 'function') remote = await provider.getUsers();
      else if (school && typeof school.getUsers === 'function') remote = await school.getUsers();
    } catch (_) { remote = []; }
    const remoteUsers = Array.isArray(remote) ? remote : remote && (remote.users || remote.data) || [], combined = new Map();
    [...local, ...remoteUsers.map(normalizeUser)].forEach((user, index) => { const item = user.id ? user : normalizeUser(user, index); combined.set(item.id, item); });
    state.users = Array.from(combined.values()).sort((a, b) => a.name.localeCompare(b.name, 'es')); return state.users;
  }

  function closeUserResults() { $('athleteResults').hidden = true; $('athleteSearch').setAttribute('aria-expanded', 'false'); }

  function renderUserResults(filter = '') {
    const query = String(filter).trim().toLocaleLowerCase('es');
    const matches = state.users.filter(user => `${user.name} ${user.identifier}`.toLocaleLowerCase('es').includes(query));
    const root = $('athleteResults'); root.replaceChildren();
    matches.forEach(user => {
      const option = document.createElement('button'); option.type = 'button'; option.role = 'option'; option.className = 'athlete-option';
      option.setAttribute('aria-selected', String(state.selectedUser && state.selectedUser.id === user.id));
      const name = document.createElement('strong'), detail = document.createElement('small'); name.textContent = user.name; detail.textContent = user.anonymous ? `Anónimo · ${user.identifier.slice(-12)}` : user.identifier;
      option.append(name, detail); option.addEventListener('click', () => { state.selectedUser = user; $('athleteSearch').value = user.name; closeUserResults(); render(); }); root.append(option);
    });
    if (!matches.length) { const empty = document.createElement('p'); empty.className = 'athlete-results-empty'; empty.textContent = 'No se encontraron usuarios.'; root.append(empty); }
    root.hidden = false; $('athleteSearch').setAttribute('aria-expanded', 'true');
  }

  async function initializeDirectory() {
    state.privileged = isPrivileged();
    if (!state.privileged) { $('athletePicker').hidden = true; return; }
    $('athletePicker').hidden = false; $('athleteSearchStatus').textContent = 'Cargando usuarios…';
    await fetchDirectoryOnce();
    $('athleteSearchStatus').textContent = `${state.users.length} usuario${state.users.length === 1 ? '' : 's'} disponible${state.users.length === 1 ? '' : 's'}.`;
    if (!state.selectedUser) state.selectedUser = currentUser(); $('athleteSearch').value = state.selectedUser.name;
  }

  async function render() {
    const sequence = ++state.renderSequence; closePopover();
    const user = state.selectedUser || currentUser(), range = selectedRange();
    $('periodDates').textContent = `${formatDate(range.start, { day: 'numeric', month: 'short', year: 'numeric' })} — ${formatDate(range.end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    renderIdentity(user);
    const sessions = await loadSessions(range, user).catch(() => []); if (sequence !== state.renderSequence) return;
    const days = dailyData(sessions, range), provider = window.Buddy && window.Buddy.trainingHistory;
    renderIdentity(user, provider ? 'remote' : 'local'); renderKpis(sessions); renderCalendar(days); renderChart('volumeChart', days, 'volume'); renderChart('averageChart', days, 'average'); renderSessions(sessions);
  }

  $('periodSelect').addEventListener('change', render);
  $('athleteSearch').addEventListener('focus', event => renderUserResults(event.target.value));
  $('athleteSearch').addEventListener('input', event => renderUserResults(event.target.value));
  document.addEventListener('click', event => { if (!$('historyPopover').contains(event.target)) closePopover(); if (!$('athletePicker').contains(event.target)) closeUserResults(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closePopover(); closeUserResults(); } });
  window.addEventListener('resize', closePopover);
  ['buddy:auth-state-changed', 'buddy:auth-ready', 'buddy:user-loaded', 'buddy:user-updated'].forEach(eventName => window.addEventListener(eventName, () => {
    const signedUser = currentUser();
    if (!state.selectedUser || (state.selectedUser.anonymous && rawCurrentUser()) || (!rawCurrentUser() && !state.selectedUser.anonymous)) state.selectedUser = signedUser;
    initializeDirectory(); render();
  }));
  window.addEventListener('buddy:admin-visibility-changed', initializeDirectory);
  window.addEventListener('buddy:ready', initializeDirectory, { once: true });

  state.selectedUser = currentUser(); render();
  if (window.Buddy && window.Buddy.readyPromise) window.Buddy.readyPromise.then(initializeDirectory).catch(() => {}); else initializeDirectory();
  window.ArbatTrainingHistory = { render, allSessions: localSessions, closePopover };
})();

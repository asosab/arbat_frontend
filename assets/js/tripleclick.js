// arbat — triple click global → navega a /entrenamiento/
// Un triple click (3 clicks en ≤ VENTANA_MS y en un mismo radio) en cualquier
// página lleva al registro de entrenamiento. El destino lo inyecta el layout
// vía window.ARBAT_NAV_TRIPLECLICK_TARGET ('/entrenamiento/' | relative_url).

(() => {
  'use strict';
  const DESTINO = window.ARBAT_NAV_TRIPLECLICK_TARGET || '/entrenamiento/';
  const VENTANA_MS = 450;
  const RADIO_PX = 32;

  const rutaLocal = url =>
    String(url || '').replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const yaEnDestino = () => rutaLocal(location.href) === rutaLocal(DESTINO);

  let racha = [];
  document.addEventListener('click', e => {
    if (yaEnDestino()) { racha = []; return; }
    const ahora = Date.now();
    racha.push({ t: ahora, x: e.clientX, y: e.clientY });
    racha = racha.filter(c => ahora - c.t <= VENTANA_MS);
    if (racha.length < 3) return;
    const [a, b, c] = racha.slice(-3);
    const dentroDelRadio = p => Math.hypot(p.x - a.x, p.y - a.y) <= RADIO_PX;
    if (dentroDelRadio(b) && dentroDelRadio(c)) {
      racha = [];
      window.location.assign(DESTINO);
    }
  });
})();
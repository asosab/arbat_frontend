---
layout: default
title: "Registro de entrenamiento"
description: "Aplicación para registrar puntajes de entrenamiento de tiro con arco: anotá tus flechas en la diana, llevá el control de tus andanadas y generá la constelación de la sesión."
breadcrumb_hidden: true
estilos:
  - /entrenamiento/css/entrenamiento.css
scripts:
  - /entrenamiento/js/entrenamiento.js
---

<div class="app-entrenamiento">
  <div class="heading"><h1>Registro de entrenamiento</h1><p id="date" class="date"></p></div>
  <div class="layout">
    <section class="target-panel" aria-label="Diana interactiva">
      <div class="live-score" aria-live="polite"><span class="label">Flecha actual</span><strong id="currentScore">—</strong></div>
      <div class="target-wrap" id="targetWrap">
        <svg id="target" viewBox="0 0 100 100" role="img" aria-label="Diana olímpica interactiva">
          <circle cx="50" cy="50" r="49" fill="#ece6d8"/>
          <g id="rings" stroke="#303840" stroke-width=".32">
            <circle cx="50" cy="50" r="46" fill="#f8f8f4"/>
            <circle cx="50" cy="50" r="41.4" fill="#f8f8f4"/>
            <circle cx="50" cy="50" r="36.8" fill="#22282d"/>
            <circle cx="50" cy="50" r="32.2" fill="#22282d"/>
            <circle cx="50" cy="50" r="27.6" fill="#22a6d5"/>
            <circle cx="50" cy="50" r="23" fill="#22a6d5"/>
            <circle cx="50" cy="50" r="18.4" fill="#e5322d"/>
            <circle cx="50" cy="50" r="13.8" fill="#e5322d"/>
            <circle cx="50" cy="50" r="9.2" fill="#ffd21f"/>
            <circle cx="50" cy="50" r="4.6" fill="#ffd21f"/>
            <circle cx="50" cy="50" r="2.3" fill="none" stroke="#555" stroke-width=".28"/>
          </g>
          <circle id="highlight" class="aim-ring" cx="50" cy="50" r="0" fill="none" stroke="#fff" stroke-width="4.2"/>
          <g id="markers"></g>
        </svg>
      </div>
      <p class="target-note">Un dedo marca la flecha. Usa dos dedos para ampliar, reducir o desplazar la diana.</p>
      <div id="constellationOverlay" class="constellation-overlay" hidden aria-modal="true" role="dialog" aria-label="Constelación de flechas">
        <div class="constellation-view">
          <img id="constellationImage" alt="Constelación de flechas de la sesión" />
          <div class="constellation-actions">
            <button id="constellationDownload" class="btn btn-accent" type="button">descargar</button>
            <button id="constellationClose" class="btn btn-secondary" type="button">cerrar</button>
          </div>
        </div>
      </div>
    </section>

    <aside class="control-panel" aria-label="Controles de la andanada">
      <div class="quick-controls">
        <div class="stat"><span>Andanada actual</span><strong id="endNumber">1</strong></div>
        <div class="stat"><span>Flechas</span><strong id="arrowCount">0 / 6</strong></div>
        <button id="undoBtn" class="btn btn-secondary" type="button" disabled>Borrar última flecha</button>
        <div class="stat"><span>Puntaje andanada</span><strong id="endTotal">0</strong></div>
        <div class="stat"><span>Total sesión</span><strong id="sessionTotal">0</strong></div>
        <button id="finishBtn" class="btn btn-accent" type="button" disabled>Terminar andanada</button>
      </div>
      <div class="actions">
        <button id="constellationBtn" class="btn btn-constellation" type="button">Crear constelación</button>
        <a class="btn btn-home" href="/">Volver al inicio</a>
      </div>
      <p id="status" role="status" aria-live="polite">Toca la diana para registrar la primera flecha.</p>
    </aside>
  </div>

  <section class="score-section" aria-labelledby="scoreTitle">
    <div class="score-head"><h2 id="scoreTitle">Tabla de puntajes</h2><span class="legend">X = 10 · M = 0</span></div>
    <div id="scorecards"></div>
  </section>

  <section class="session-options" aria-labelledby="sessionOptionsTitle">
    <h2 id="sessionOptionsTitle">Opciones de la sesión</h2>
    <label class="check-option" for="twelveArrowMode">
      <input id="twelveArrowMode" type="checkbox">
      <span><strong>Andanadas de 12 flechas</strong><small>Actívalo antes de marcar la primera flecha. Por defecto, cada andanada termina automáticamente al llegar a 6.</small></span>
    </label>
  </section>
</div>

---
layout: default
title: "Registro de entrenamiento"
description: "Aplicación para registrar puntajes de entrenamiento de tiro con arco: anotá tus flechas en la diana, llevá el control de tus andanadas y descargá el CSV con los datos de la sesión."
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
      <p class="target-note">Mantén presionado, desliza y suelta. Fuera del círculo se registra M con su posición.</p>
    </section>

    <aside class="control-panel">
      <div class="stats">
        <div class="stat"><span>Andanada actual</span><strong id="endNumber">1</strong></div>
        <div class="stat"><span>Flechas</span><strong id="arrowCount">0 / 12</strong></div>
        <div class="stat"><span>Puntaje andanada</span><strong id="endTotal">0</strong></div>
        <div class="stat"><span>Total sesión</span><strong id="sessionTotal">0</strong></div>
        <div class="stat wide"><span>Progreso de la andanada</span><div class="progress"><div id="progressBar"></div></div></div>
      </div>
      <div class="actions">
        <button id="undoBtn" class="btn btn-secondary" type="button" disabled>Borrar última flecha</button>
        <button id="finishBtn" class="btn btn-accent" type="button" disabled>Terminar andanada</button>
        <button id="exportBtn" class="btn btn-export" type="button" disabled>Descargar CSV</button>
        <a class="btn btn-home" href="{{ '/' | relative_url }}">Volver al inicio</a>
      </div>
      <p id="status" role="status" aria-live="polite">Toca la diana para registrar la primera flecha.</p>
    </aside>
  </div>

  <section class="score-section" aria-labelledby="scoreTitle">
    <div class="score-head"><h2 id="scoreTitle">Tabla de puntajes</h2><span class="legend">X = 10 · M = 0</span></div>
    <div id="scorecards"></div>
    <details class="data-details" open>
      <summary>Datos de la sesión para guardar</summary>
      <p class="data-note">Una fila por andanada terminada. Primero los puntajes ordenados; después del separador, puntaje, hora de marcado y posición de cada flecha en orden de lanzamiento. El CSV incluye una explicación inicial una sola vez.</p>
      <div class="data-table-wrap">
        <table id="dataTable" class="data-table">
          <thead><tr>
            <th>Andanada</th><th class="separator">Separador 1</th>
            <th>Flecha 1</th><th>Flecha 2</th><th>Flecha 3</th><th>Flecha 4</th><th>Flecha 5</th><th>Flecha 6</th>
            <th>Flecha 7</th><th>Flecha 8</th><th>Flecha 9</th><th>Flecha 10</th><th>Flecha 11</th><th>Flecha 12</th>
            <th class="separator">Separador 2</th><th>Total andanada</th><th>Total sesión</th>
            <th class="separator">Separador 3</th><th>Fecha y hora de última flecha</th>
          </tr></thead>
          <tbody id="dataTableBody"></tbody>
        </table>
      </div>
    </details>
  </section>
</div>
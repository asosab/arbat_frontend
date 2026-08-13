/**
 * assets/buddy/modules/says/sources/consejos_arch.js
 * Fase 8 — fuente de consejos de archery.
 *
 * El contenido inicial proviene de buddy/consejos.js y se mantiene como JSON
 * en sources/consejos_arch.json para que la fuente sea independiente del
 * script raíz y pueda evolucionar sin tocar el motor de Buddy.
 */
(function (window, document) {
  'use strict';

  window.BuddyInformSources = window.BuddyInformSources || {};

  function dataUrl() {
    var src = document.currentScript && document.currentScript.src;
    if (!src) {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && /\/modules\/says\/sources\/consejos_arch\.js(?:[?#]|$)/.test(scripts[i].src)) {
          src = scripts[i].src;
          break;
        }
      }
    }
    if (!src) {
      return 'consejos_arch.json';
    }
    try {
      // /assets/buddy/modules/says/sources/consejos_arch.js
      // -> /assets/buddy/modules/says/sources/consejos_arch.json
      return new URL('./consejos_arch.json', src).href;
    } catch (e) {
      return 'consejos_arch.json';
    }
  }

  var cache = null;

  window.BuddyInformSources.consejos_arch = {
    obtenerMensajes: function () {
      if (cache) return Promise.resolve(cache.slice());

      return fetch(dataUrl(), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('[BuddyInformSources:consejos_arch] HTTP ' + response.status);
          }
          return response.json();
        })
        .then(function (data) {
          var frases = Array.isArray(data) ? data : data && data.frases;
          if (!Array.isArray(frases)) {
            throw new Error('[BuddyInformSources:consejos_arch] Formato inválido: se esperaba un array o { frases: [] }.');
          }

          cache = frases.filter(function (item) {
            return typeof item === 'string' && item.trim() !== '';
          }).map(function (item) {
            return item.trim();
          });

          return cache.slice();
        });
    }
  };
})(window, document);

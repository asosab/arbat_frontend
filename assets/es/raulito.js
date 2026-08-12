/**
 * assets/es/raulito.js
 * ---------------------------------------------------------------------------
 * Diálogos de Raulito en español (genérico/fallback), tono zen fijo.
 * Ver planmsj.md para el diseño completo del sistema (regiones, idiomas,
 * variantes, no-repetición).
 *
 * Adaptación respecto al ejemplo de planmsj.md: acá NO se usa
 * `export default` (el sitio carga los scripts como <script> clásicos, sin
 * módulos — ver raulito.js) — se expone como window.RaulitoDialogues.es. La
 * forma de los datos (meta + dialogues) es la misma que en el plan.
 *
 * Incluir con un <script> ANTES de assets/js/raulito.js:
 *   <script src="/assets/es/raulito.js" defer></script>
 *   <script src="/assets/js/raulito.js" defer></script>
 *
 * Contenido: solo los diálogos que ya existían (hardcodeados en raulito.js,
 * o inventariados en planmsj.md — login_required, invite_real_practice).
 * Cada clave tiene por ahora una sola variante; las variaciones se agregan
 * después.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  window.RaulitoDialogues = window.RaulitoDialogues || {};

  window.RaulitoDialogues.es = {
    meta: { locale: 'es', region: 'generic', character: 'raulito', tone: 'zen' },

    dialogues: {
      // Inventariados en planmsj.md (notas del concepto) — todavía sin
      // punto de disparo propio en raulito.js.
      login_required: [
        'Debes estar registrado para poder jugar'
      ],
      invite_real_practice: [
        'Esto mejora cuando lo haces en el mundo real ¿Te gustaría venir a mirar?'
      ],

      // Zona de "sabiduría" (CONFIG.wisdomZone): Raúl elige no disparar.
      arm_lowered_early: [
        'No disparar también es una forma de acertar',
        'El verdadero blanco no siempre pide la flecha',
        'Bajar el arco a tiempo ya es dar en el blanco',
        'No toda flecha guardada es una flecha perdida',
        'El arquero que espera también ha acertado',
        'Saber retener la cuerda es ya saber apuntar',
        'A veces el mayor disparo es el que no se hace',
        'El silencio de la cuerda también enseña',
        'No es debilidad soltar el arco: es escuchar al cuerpo',
        'Quien sabe cuándo no disparar, ya domina el arco'
      ],

      // Mira cruza a la mitad derecha de la pantalla (se aleja de la diana).
      aim_too_far: [
        'No se debe apuntar tan lejos de la diana',
        '¡Cuidado! Hay fotos de personas de ese lado de la pantalla',
        'Si la flecha se va más allá de Google no creo que podamos recuperarla'
      ],

      // Flecha fuera de todos los aros, o intento inválido.
      miss: [
        'MISS'
      ],

      // Puntaje por flecha individual, según el aro (CONFIG.rings).
      score_5: [
        '¡Eso fue un cinco!', 'Cinco puntos', 'Cinco, casi perdida'
      ],
      score_6: [
        '¡Eso fue un seis!', 'Seis puntos'
      ],
      score_7: [
        '¡Eso fue un siete!', '¡Siete puntos!'
      ],
      score_8: [
        '¡Eso fue un ocho!', '¡Ocho puntos!'
      ],
      score_9: [
        '¡Eso fue un nueve!', '¡Nueve puntos!'
      ],
      score_10: [
        '¡Eso fue un diez!', '¡Una x perfecta!', '¡Le diste a la mosca!'
      ],

      // Racha de disparos apurados sin respetar el cooldown esperado
      // (CONFIG.fatigue.exhaustionStreak) — Raúl se agota del todo.
      exhaustion: [
        'dame un descanzo, se me canzó el brazo', 
        'Déjame recuperar mi brazo, cayó por aquí...', 
        'Esto de la escultura viviente no se me da muy bien...'
      ],

      // Intento de disparo durante el cooldown del carcaj
      // (CONFIG.arrowLimit).
      arrow_cooldown_wait: [
        'Espera, debo ir por las flechas...', 
        '¿Te gustaría probar un arco olímpico real? <a href="https://asosab.github.io/arbat_frontend/ubicacion/" target="_blank" rel="noopener noreferrer">¡Ven!</a> '
      ],

      // Aviso de recalibración de la mira tras completar una andanada
      // (CONFIG.calibracion).
      recalibrating: [
        'Voy a calibrar la mira...', 
        'Voy a ajustar un poco la mira'
      ],

      // Suma de puntos de la andanada. "{puntos}" se reemplaza en el código
      // por el total.
      andanada_score: [
        'Hiciste {puntos} puntos', 'Tus flechas suman {puntos} puntos'
      ],

      // Suma cuando la andanada dio el puntaje máximo, si el premio
      // (CONFIG.andanada.promo) está deshabilitado.
      andanada_perfect: [
        '¡Fantástico! ¡Lograste {puntos} puntos!', 
        '¿Cuántas horas llevas jugando? ¡Lograste {puntos} puntos!'
      ],

      // Premio por andanada perfecta (CONFIG.andanada.promo) — HTML,
      // "{link}" se reemplaza en el código por el link de WhatsApp armado.
      andanada_promo_reward: [
        '¿Te gustaría disparar flechas en el mundo real? ¡Te has ganado un 2x1 en arbat! ' +
        'Basta con que tu o tu acompañante nunca hayan venido a una clase antes para que sólo uno ' +
        'de los dos pague la clase personalizada, haz click <a href="{link}" target="_blank" rel="noopener noreferrer">aquí</a> ' +
        'para recibir tu premio ¡Te lo has ganado!'
      ]
    }
  };
})();

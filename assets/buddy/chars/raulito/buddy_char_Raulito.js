/**
 * chars/raulito/buddy_char_Raulito.js
 * ---------------------------------------------------------------------------
 * Perfil de personaje "Raulito" para el sistema Buddy (ver planBuddy.md §1.1).
 *
 * FASE: 2 (parcial). Este archivo respeta la forma acordada en el contrato
 * de datos, pero varios valores son PLACEHOLDERS marcados con TODO porque
 * el prototipo original (raulito.js) no define un personaje con este
 * vocabulario: tenía 4 "poses" funcionales (idle/aim/fire/fail) atadas al
 * minijuego, no un set de "expresiones" emocionales reutilizables +
 * "poses de módulo" separadas, como pide el nuevo sistema.
 *
 * DECISIONES ABIERTAS para confirmar con Alejandro antes de dar esto por
 * cerrado (ver también planBuddy.md §1.1 y §1.7):
 *
 *   1) `expresiones` — sereno es la única obligatoria y por ahora es la
 *      única poblada, reutilizando pose04.png (la pose "parado, en reposo"
 *      del prototipo) como base. sonriente/riendo/serio/enojado/guino/
 *      preocupado NO tienen sprite propio todavía: quedan comentados como
 *      placeholder. Mientras no existan, cualquier módulo que las pida cae
 *      en sereno automáticamente (resolverExpresion(), planBuddy.md §1.3),
 *      así que el sistema funciona igual, solo que Raulito no gesticula.
 *
 *   2) `modulos.archery` — el contrato de módulo (§1.6) solo define DOS
 *      poses de acción (personajeIdle, personajeDisparo), pero el
 *      prototipo real de Raulito tiene CUATRO poses de juego (idle/aim/
 *      fire/fail: pose03/pose01/pose02/pose04). Acá se mapean las dos que
 *      calzan sin ambigüedad:
 *        - personajeIdle     -> pose01.png (apuntando, arco tensado)
 *        - personajeDisparo  -> pose02.png (flecha liberada)
 *      Quedan SIN mapear pose03 (reposo antes de apuntar) y pose04
 *      (fallo/agotamiento) porque el contrato actual de buddy_archery.js
 *      no tiene una clave para ellas. Falta decidir si:
 *        a) se agregan claves nuevas al contrato del módulo (ej.
 *           personajeReposo, personajeFallo), o
 *        b) esos dos estados pasan a resolverse con `expresiones` en vez
 *           de con poses de módulo (ej. reposo -> sereno, fallo ->
 *           preocupado).
 *      Mientras no se resuelva, dejar pose03/pose04 fuera de este archivo
 *      (no inventar claves que buddy_archery.js todavía no declara).
 *
 *   3) `modulos.archery.sounds` — el prototipo no distingue sonido de
 *      "acierto" vs "fallo": golpe.mp3 suena en CUALQUIER impacto,
 *      acierte o no. Se mapea acá como `acierto` (mejor aproximación
 *      disponible) y se deja `fallo` sin definir (cae al default del
 *      módulo). Confirmar si arbat quiere un sonido de fallo distinto.
 *
 *   4) Todas las `anclas` (x/y relativos 0–1) y las medidas `w`/`h` de
 *      sereno están en 0 — hace falta medirlas a mano sobre pose03.png,
 *      igual que se hizo con characterWaistRatio/characterAnchorXRatio en
 *      el prototipo (ver raulito.js CONFIG). No se copian esos valores
 *      directamente porque miden otra cosa (cintura/torso para el
 *      encuadre de pantalla), no las anclas cabeza/ojos/pies que pide
 *      este contrato.
 *
 *   5) `escenarios` — no hay fondos definidos todavía (cantinero,
 *      carnicero, etc. son ejemplos del contrato, no un pedido real para
 *      ARBAT). Queda vacío; es opcional por diseño (§1.1, §1.3).
 *
 * MIGRACIÓN DE ASSETS PENDIENTE: los `src` de abajo ya apuntan a las
 * rutas nuevas bajo assets/buddy/chars/raulito/, no a las rutas viejas de
 * raulito.js (CONFIG.assetBase = '/arbat_frontend/assets/images/minijuego/').
 * Falta copiar/renombrar los archivos físicos:
 *   pose03.png -> chars/raulito/images/expresiones/sereno.png
 *   pose01.png -> chars/raulito/images/archery/apuntar.png
 *   pose02.png -> chars/raulito/images/archery/liberar.png
 *   golpe.mp3  -> chars/raulito/sounds/archery/acierto.mp3
 * ---------------------------------------------------------------------------
 */

export const buddyChar = {
  id: "raulito",
  nombre: "Raulito",
  estiloConversacion: "zen",   // debe existir modules/*/es/*_zen.js en cada módulo activo
  idiomaBase: "es",
  voseo: true,

  // -----------------------------------------------------------------------
  // Expresiones — estado emocional, reutilizable por cualquier módulo.
  // sereno es la única obligatoria (fallback universal, ver §1.3).
  // -----------------------------------------------------------------------
  expresiones: {
    sereno: {
      src: "chars/raulito/images/expresiones/sereno.png", 
      w: 0, h: 0, // TODO: completar con la resolución nativa real del PNG
      anclas: {
        // TODO: medir a mano sobre sereno.png (mismo criterio que
        // characterWaistRatio/characterFaceAnchor en raulito.js CONFIG).
        cabezaSuperior: { x: 0, y: 0 },   // pixel central en margen superior de la cabeza (para medir altura del personaje, en caso de mostrarlo en escenarios dentro de un auto o una cueva, para que no sobrepase el techo del escenario)
        ojoIzq:         { x: 0, y: 0 },   // pixel central del ojo izquierdo
        ojoDer:         { x: 0, y: 0 },   // pixel central del ojo derecho
        cintura:        { x: 0, y: 0 },   // pixel central de la cintura
        pieIzq:         { x: 0, y: 0 },   // pixel mas bajo y centrado del pie (para medir dónde colocar el suelo bajo sus pies)
        pieDer:         { x: 0, y: 0 }    // pixel mas bajo y centrado del pie (para medir dónde colocar el suelo bajo sus pies)
      }
    }

    // TODO (decisión abierta #1): sin sprite propio todavía.
    // sonriente: { src: "...", w: 0, h: 0, anclas: { /* mismo set */ } },
    // riendo:    { src: "...", w: 0, h: 0, anclas: { /* mismo set */ } },
    // serio:     { src: "...", w: 0, h: 0, anclas: { /* mismo set */ } },
    // enojado:   { src: "...", w: 0, h: 0, anclas: { /* mismo set */ } },
    // guino:     { src: "...", w: 0, h: 0, anclas: { /* mismo set */ } },
    // preocupado:{ src: "...", w: 0, h: 0, anclas: { /* mismo set */ } }
  },

  // -----------------------------------------------------------------------
  // Escenarios — opcional por completo (decisión abierta #5). Sin fondos
  // definidos todavía: sin escenarios, Raulito se muestra solo.
  // -----------------------------------------------------------------------
  escenarios: {},

  // -----------------------------------------------------------------------
  // Overrides de assets por módulo (§1.7). Solo lo que Raulito reemplaza;
  // lo que no define acá, el módulo lo cubre con sus propios `defaults`.
  // -----------------------------------------------------------------------
  modulos: {
    archery: {
      images: {
        personajeIdle:    "chars/raulito/images/archery/apuntar.png",   
        personajeDisparo: "chars/raulito/images/archery/liberar.png",
        flecha01:         "chars/raulito/images/archery/f01.png",
        flecha02:         "chars/raulito/images/archery/f02.png",
        flecha03:         "chars/raulito/images/archery/f03.png",
        flecha04:         "chars/raulito/images/archery/f04.png",
        mira:             "chars/raulito/images/archery/mira.png",

      },
      sounds: {
        impacto:  "chars/raulito/sounds/archery/impacto.mp3" // sonido de impacto de flecha
        disparo:  "chars/raulito/sounds/archery/disparo.mp3" // sonido de disparo de flecha
        tensar:   "chars/raulito/sounds/archery/tensar.mp3" // sonido tensando la cuerda del arco, al comenzar a apuntar
        

      }
    }
    // "inform" queda sin overrides por ahora (Fase 3/4 del plan) — Raulito
    // usa los defaults del módulo hasta que se decida si necesita ícono o
    // sonido propios de notificación.
  }
};

/**
 * buddy_char_Raulito.js
 * ---------------------------------------------------------------------------
 * Perfil del personaje "Raulito" para la arquitectura "buddy".
 * Generado en la Fase 1 del plan de migración (ver planBuddy_v5.md, 4.1).
 * Fuente de valores: raulito.js (CONFIG). Estructura/contrato: planBuddy_v5.md.
 * ---------------------------------------------------------------------------
 */
window.BuddyChars = window.BuddyChars || {};
window.BuddyChars.raulito = {
  perfil: {
    id: 'raulito',
    nombre: 'Raulito',
    idioma: 'es',
    estilo: 'zen'
  },

  // Convención de nombres: el archivo se llama igual que la expresión que
  // representa. 'sereno' es obligatoria (viene de CONFIG.poses.idle /
  // pose03.png). 'sonriendo' y 'guinio' son nuevas en esta arquitectura:
  // raulito.js no tiene fuente para sus dimensiones/anclas.
  expresiones: {
    sereno: {
      archivo: 'sereno.png', // = CONFIG.poses.idle (pose03.png)
      ancho: 372,  // pose03/pose04 miden 372×1195 (raulito.js, comentario scales.character)
      alto: 1195,
      escala: 1,   // = CONFIG.scales.character.idle
      anclas: {
        // TODO: medir sobre sereno.png la esquina superior izquierda real de la cabeza.
        cabeza_superior: { x: 'TODO', y: 'TODO' },
        // TODO: medir ojos sobre el PNG cuando se disponga del arte definitivo.
        ojo_izquierdo: { x: 'TODO', y: 'TODO' },
        ojo_derecho: { x: 'TODO', y: 'TODO' },
        // = CONFIG.characterAnchorXRatio.idle / CONFIG.characterWaistRatio.idle
        cintura: { x: 0.48, y: 0.52 },
        // TODO: medir pies sobre el PNG cuando se disponga del arte definitivo.
        pie_izquierdo: { x: 'TODO', y: 'TODO' },
        pie_derecho: { x: 'TODO', y: 'TODO' }
      }
    },
    sonriendo: {
      archivo: 'sonriendo.png', // nueva expresión, sin equivalente en raulito.js
      // Dimensiones verificadas sobre el PNG entregado en esta ejecución.
      // La escala sigue sin fuente de verdad en raulito.js y se conserva como TODO.
      ancho: 372,
      alto: 1195,
      escala: 'TODO',
      anclas: {
        cabeza_superior: { x: 'TODO', y: 'TODO' }, // TODO: medir sobre sonriendo.png.
        ojo_izquierdo: { x: 'TODO', y: 'TODO' },
        ojo_derecho: { x: 'TODO', y: 'TODO' },
        cintura: { x: 'TODO', y: 'TODO' },
        pie_izquierdo: { x: 'TODO', y: 'TODO' },
        pie_derecho: { x: 'TODO', y: 'TODO' }
      }
    },
    guinio: {
      archivo: 'guinio.png', // reservada: aún no la usa ningún módulo
      // TODO: no hay dato de origen en raulito.js para ancho/alto/escala de guinio.png.
      ancho: 'TODO',
      alto: 'TODO',
      escala: 'TODO',
      anclas: {
        cabeza_superior: { x: 'TODO', y: 'TODO' }, // TODO: medir sobre guinio.png.
        ojo_izquierdo: { x: 'TODO', y: 'TODO' },
        ojo_derecho: { x: 'TODO', y: 'TODO' },
        cintura: { x: 'TODO', y: 'TODO' },
        pie_izquierdo: { x: 'TODO', y: 'TODO' },
        pie_derecho: { x: 'TODO', y: 'TODO' }
      }
    }
    // Expresiones negativas futuras (pesar, dolor, melancolia...) se agregan
    // acá con el mismo criterio cuando exista el arte. pose04.png
    // (CONFIG.poses.fail) queda disponible como posible base para una de
    // ellas, pero NO se registra automáticamente como expresión negativa
    // (ver decisión F del plan): 'negativo' sigue apuntando a 'sereno'.
  },

  diccionarioExpresiones: {
    neutral: 'sereno',
    positivo: 'sonriendo',
    complice: 'guinio',
    negativo: 'sereno' // hasta que exista una expresión negativa propia
  },

  // Fondos donde este personaje puede aparecer. raulito.js no contiene
  // configuración de escenarios/fondos (no hay CONFIG.escenarios ni
  // equivalente), así que no se pudo confirmar aquí ningún nombre ni
  // dimensión propios del código fuente.
  // TODO: confirmar el set de escenarios y sus dimensiones; se deja el
  // objeto vacío por no encontrarse fuente de verdad en raulito.js.
  escenarios: {},

  overridesPorModulo: {
    archery: {
      images: {
        apuntar: {
          archivo: 'apuntar.png', // = CONFIG.poses.aim (pose01.png)
          ancho: 848,  // pose01/pose02 miden 848×1264 (raulito.js, comentario scales.character)
          alto: 1264,
          escala: 1.1, // = CONFIG.scales.character.aim
          anclas: {
            // = CONFIG.characterAnchorXRatio.aim / CONFIG.characterWaistRatio.aim
            cintura: { x: 0.57, y: 0.58 },
            cabeza_superior: { x: 'TODO', y: 'TODO' }, // TODO: medir sobre apuntar.png.
            ojo_izquierdo: { x: 'TODO', y: 'TODO' },
            ojo_derecho: { x: 'TODO', y: 'TODO' },
            pie_izquierdo: { x: 'TODO', y: 'TODO' },
            pie_derecho: { x: 'TODO', y: 'TODO' }
          }
        },
        liberar_flecha: {
          archivo: 'liberar_flecha.png', // = CONFIG.poses.fire (pose02.png)
          ancho: 848,  // mismo encuadre que pose01 (raulito.js, comentario scales.character)
          alto: 1264,
          escala: 1.1, // = CONFIG.scales.character.fire
          anclas: {
            // = CONFIG.characterAnchorXRatio.fire / CONFIG.characterWaistRatio.fire
            cintura: { x: 0.57, y: 0.58 },
            cabeza_superior: { x: 'TODO', y: 'TODO' }, // TODO: medir sobre liberar_flecha.png.
            ojo_izquierdo: { x: 'TODO', y: 'TODO' },
            ojo_derecho: { x: 'TODO', y: 'TODO' },
            pie_izquierdo: { x: 'TODO', y: 'TODO' },
            pie_derecho: { x: 'TODO', y: 'TODO' }
          }
        },
        // Sin "diana": raulito.js no identifica un asset de diana propio de
        // Raulito dentro del mapeo obligatorio de la Fase 1 (CONFIG.targetImage
        // = 'logo.png' es un logo genérico de repuesto, no está en la tabla
        // de mapeo de la sección 4.1). Sin archivo propio, este módulo cae en
        // el default de archery (regla de override, decisión D del plan).
        mira: {
          archivo: 'mira.png' // = CONFIG.miraImage
        },
        // = CONFIG.arrowImages, renombrado según Fase 0 (f0N.png -> flechaN.png)
        flechas: ['flecha01.png', 'flecha02.png', 'flecha03.png', 'flecha04.png']
      },
      sounds: {
        disparar: 'disparar.mp3', // = CONFIG.shotSound ('disparo.mp3'), renombrado según Fase 0
        impacto: 'impacto.mp3',   // = CONFIG.hitSound ('golpe.mp3'), renombrado según Fase 0
        tensar: 'tensar.mp3'      // = CONFIG.tensSound
      }
    },
    says: {}
  }
};

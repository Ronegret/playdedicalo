import { useEffect } from 'react';
import { vigilarFluidez } from '../services/rendimiento';

/**
 * CALIDAD ADAPTATIVA EN EL MÓVIL
 *
 * Esto ya existía —y bien hecho— pero solo lo usaba la televisión. El móvil,
 * que es donde juega todo el mundo y donde el abanico de aparatos es
 * infinitamente más ancho (de un iPhone reciente a un Android de 90 €),
 * corría siempre a calidad máxima y se atascaba sin que nadie se enterara.
 *
 * Es exactamente lo que hace cualquier juego: medir los fotogramas REALES en
 * el aparato REAL y bajar la calidad si no llega. Vale más una pantalla
 * quieta y legible que una animada a trompicones — lo segundo se lee como
 * "esto está roto", que es justo la sensación que queremos quitar.
 *
 * Dos capas:
 *   1. Una sospecha inicial por las características del aparato, para no
 *      pasar los primeros segundos —los más visibles, los de la primera
 *      impresión— dando tirones antes de la primera medición.
 *   2. La medición real, que manda sobre la sospecha en cuanto llega.
 */

/**
 * ¿Pinta que este aparato va justo?
 *
 * `deviceMemory` y `hardwareConcurrency` no son exactos y en Safari ni
 * existen, pero cuando SÍ contestan y contestan bajo, aciertan. Ante la duda
 * se asume que el aparato va bien: penalizar a un móvil bueno por si acaso
 * sería peor que dejar que la medición haga su trabajo dos segundos después.
 */
function sospechaDeAparatoLento() {
  try {
    const memoria = navigator.deviceMemory;
    const nucleos = navigator.hardwareConcurrency;
    if (typeof memoria === 'number' && memoria <= 2) return true;
    if (typeof nucleos === 'number' && nucleos <= 4 && typeof memoria === 'number' && memoria <= 4) return true;
  } catch { /* no soportado */ }
  return false;
}

function prefiereMenosMovimiento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

export function useModoLigero() {
  useEffect(() => {
    const raiz = document.documentElement;

    // Quien pide menos movimiento en los ajustes del sistema lo pide siempre:
    // no hay nada que medir ni que reconsiderar.
    if (prefiereMenosMovimiento()) {
      raiz.classList.add('app-ligero');
      return undefined;
    }

    if (sospechaDeAparatoLento()) raiz.classList.add('app-ligero');

    const parar = vigilarFluidez((ligero) => {
      raiz.classList.toggle('app-ligero', ligero);
    });

    return () => {
      parar();
      raiz.classList.remove('app-ligero');
    };
  }, []);
}

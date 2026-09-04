import { useCallback, useEffect, useState } from 'react';

/**
 * ORIENTACIÓN DE JUEGO
 *
 * La ruta de años es una línea de tiempo horizontal: en apaisado le cabe más
 * del doble de ancho, así que se recorre mucho menos para colocar la canción.
 * Por eso la orientación no es un detalle estético aquí, es jugabilidad.
 *
 * Tres modos:
 *   auto       sigue al teléfono (por defecto)
 *   vertical   se queda en vertical aunque gires
 *   horizontal pide apaisado
 *
 * Sobre "forzar" el giro: la web NO puede rotar la pantalla de nadie. La API
 * `screen.orientation.lock()` solo funciona a pantalla completa y en Safari
 * de iPhone no existe. Así que en modo horizontal se intenta el bloqueo
 * nativo donde el navegador lo permita y, donde no, se pide girar el móvil.
 * Es lo honesto: mejor un aviso claro que una rotación falsa con CSS que
 * rompe los menús y el desplazamiento.
 */

const STORAGE_KEY = 'dedicalo_orientation';
export const ORIENTATION_MODES = ['auto', 'vertical', 'horizontal'];

export const ORIENTATION_LABELS = {
  auto: 'Automático',
  vertical: 'Vertical',
  horizontal: 'Apaisado'
};

export const ORIENTATION_HINTS = {
  auto: 'Sigue al teléfono',
  vertical: 'Siempre en vertical',
  horizontal: 'La ruta se ve mucho mejor'
};

function leerModo() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    return ORIENTATION_MODES.includes(guardado) ? guardado : 'auto';
  } catch {
    return 'auto';
  }
}

// Apaisado de verdad: se mira la proporción de la ventana y no
// `screen.orientation`, porque en un portátil o una tablet con teclado la
// ventana puede ser ancha sin que el dispositivo esté "girado".
function midiendoApaisado() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
}

/**
 * Marca <html class="play-landscape"> para que el CSS ensanche el contenedor
 * y encoja la decoración. Lo llama SOLO App: si lo hiciera el hook, con
 * varios componentes montados la limpieza de uno quitaría la clase que otro
 * sigue necesitando (su efecto no se vuelve a ejecutar y nadie la repone).
 */
export function useLandscapeBodyClass() {
  const { layout, isLandscape } = useOrientation();
  useEffect(() => {
    const raiz = document.documentElement;
    // Solo cuando hay ancho de verdad: pedir "apaisado" con el móvil de pie
    // no crea espacio de la nada.
    raiz.classList.toggle('play-landscape', layout === 'horizontal' && isLandscape);
  }, [layout, isLandscape]);
}

export function useOrientation() {
  const [mode, setModeState] = useState(leerModo);
  const [isLandscape, setIsLandscape] = useState(midiendoApaisado);

  useEffect(() => {
    const alCambiar = () => setIsLandscape(midiendoApaisado());
    window.addEventListener('resize', alCambiar);
    // orientationchange llega antes de que se asienten las medidas en algunos
    // navegadores; el resize posterior corrige, pero escuchar los dos hace
    // que el cambio se note al instante.
    window.addEventListener('orientationchange', alCambiar);
    return () => {
      window.removeEventListener('resize', alCambiar);
      window.removeEventListener('orientationchange', alCambiar);
    };
  }, []);

  const setMode = useCallback((siguiente) => {
    if (!ORIENTATION_MODES.includes(siguiente)) return;
    try {
      localStorage.setItem(STORAGE_KEY, siguiente);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el modo vale para
      // esta partida igualmente, solo no se recuerda para la próxima.
    }
    setModeState(siguiente);

    // Donde el navegador deja (Android a pantalla completa, apps instaladas)
    // se pide el giro de verdad. Donde no, falla en silencio y el aviso de
    // "gira el móvil" se encarga.
    const orientacion = window.screen?.orientation;
    if (!orientacion?.lock) return;
    if (siguiente === 'auto') {
      try { orientacion.unlock?.(); } catch { /* no soportado */ }
      return;
    }
    orientacion
      .lock(siguiente === 'horizontal' ? 'landscape' : 'portrait')
      .catch(() => { /* requiere pantalla completa o no está soportado */ });
  }, []);

  // Lo que de verdad debe pintar la interfaz.
  const layout = mode === 'auto' ? (isLandscape ? 'horizontal' : 'vertical') : mode;

  // Pidió apaisado pero el teléfono sigue de pie: hay que avisarle, porque
  // no podemos girarlo nosotros.
  const waitingForRotation = mode === 'horizontal' && !isLandscape;

  return { mode, setMode, layout, isLandscape, waitingForRotation, modes: ORIENTATION_MODES };
}

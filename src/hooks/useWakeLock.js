import { useEffect } from 'react';

/**
 * MANTENER LA PANTALLA ENCENDIDA
 *
 * Dos momentos en los que el móvil apagándose solo estropea el juego:
 *
 *  1. ENSEÑANDO EL QR. Alguien levanta el móvil para que los demás lo
 *     escaneen y, como nadie está TOCANDO esa pantalla, a los treinta
 *     segundos el sistema la atenúa y luego la apaga. Atenuada, la cámara del
 *     otro ya no lee el código. Es probablemente la mitad de las veces que
 *     "el QR no se escanea": no era el código, era el brillo.
 *
 *  2. ESCUCHANDO UNA CANCIÓN. Treinta segundos de música sin tocar nada son
 *     justo los que tarda la pantalla en apagarse.
 *
 * El bloqueo se PIERDE solo cuando la app pasa a segundo plano, y no vuelve
 * por su cuenta: por eso se vuelve a pedir al regresar.
 *
 * @param {boolean} activo
 */
export function useWakeLock(activo) {
  useEffect(() => {
    if (!activo) return undefined;
    if (!('wakeLock' in navigator)) return undefined;

    let bloqueo = null;
    let cancelado = false;

    const pedir = async () => {
      try {
        bloqueo = await navigator.wakeLock.request('screen');
      } catch {
        // Lo rechaza si la pestaña no está visible o si el móvil está en
        // ahorro de energía. No es un error que haya que contar a nadie: la
        // pantalla se apagará como antes y ya está.
      }
    };

    const alVolver = () => {
      if (!cancelado && document.visibilityState === 'visible') pedir();
    };

    pedir();
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alVolver);
      bloqueo?.release?.().catch(() => {});
    };
  }, [activo]);
}

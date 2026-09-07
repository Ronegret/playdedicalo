/**
 * LA TELE SE MIDE A SÍ MISMA
 *
 * El problema de fondo: una caja de Android TV de 40 € y un televisor
 * reciente de gama alta ejecutan el mismo código y no se parecen en nada. En
 * el ordenador de desarrollo todo va a 60 fps aunque se pongan veinte discos
 * girando; en el aparato del salón, los mismos veinte discos se quedan
 * pegados. No hay forma de acertar el ajuste "correcto" desde aquí, porque
 * depende de un aparato que no tengo delante.
 *
 * Así que se hace lo que hace cualquier juego: detectar la potencia real y
 * bajar la calidad si hace falta. Se miden los fotogramas de verdad, en la
 * tele de verdad, y si no llega se apagan las animaciones que no aportan
 * información — las ondas, el ecualizador, el disco girando. La pantalla
 * sigue diciendo exactamente lo mismo; simplemente deja de moverse.
 *
 * Vale más una pantalla quieta y legible que una animada que va a trompicones:
 * lo segundo se lee como "esto está roto".
 *
 * Se vuelve a medir cada cierto tiempo porque la carga cambia sola: no cuesta
 * lo mismo la sala de espera que una ronda con doce jugadores.
 */

// Por debajo de esto no se puede llamar fluido. 22 ms es ~45 fps: hay margen
// respecto a los 16,7 ms ideales para no castigar a un aparato que solo va
// justo, pero un fotograma de 22 ms ya se nota en algo que gira.
const MS_ACEPTABLE = 22;
// Un parón suelto lo tiene cualquiera (recolección de basura, una imagen que
// entra). Se mira cuántos hay, no si hubo alguno.
const MS_PARON = 60;
const PARONES_ACEPTABLES = 2;

const MUESTRA_MS = 2200;
const REVISAR_CADA_MS = 45000;

/**
 * Mide una tanda de fotogramas.
 * @returns {Promise<{medianaMs: number, parones: number}>}
 */
function medirUnaVez() {
  return new Promise((resolve) => {
    const tiempos = [];
    let anterior = performance.now();
    const fin = anterior + MUESTRA_MS;

    const paso = (ahora) => {
      tiempos.push(ahora - anterior);
      anterior = ahora;
      if (ahora < fin) {
        requestAnimationFrame(paso);
        return;
      }
      // Se tiran los primeros: el arranque siempre trae fotogramas sucios
      // (imágenes entrando, tipografías, el primer pintado).
      const utiles = tiempos.slice(8).sort((a, b) => a - b);
      if (!utiles.length) { resolve({ medianaMs: 0, parones: 0 }); return; }
      resolve({
        medianaMs: utiles[Math.floor(utiles.length / 2)],
        parones: utiles.filter((t) => t > MS_PARON).length
      });
    };
    requestAnimationFrame(paso);
  });
}

/**
 * Vigila la fluidez y avisa cuando hay que bajar (o subir) la calidad.
 *
 * @param {(ligero: boolean, datos: {medianaMs: number, parones: number}) => void} alCambiar
 * @returns {() => void} para dejar de vigilar
 */
export function vigilarFluidez(alCambiar) {
  let vivo = true;
  let ligero = null;
  let temporizador = null;

  const ronda = async () => {
    if (!vivo) return;
    // Con la pestaña oculta los fotogramas se paran y la medida sale absurda.
    if (document.visibilityState !== 'visible') {
      temporizador = window.setTimeout(ronda, REVISAR_CADA_MS);
      return;
    }

    const datos = await medirUnaVez();
    if (!vivo) return;

    const vaMal = datos.medianaMs > MS_ACEPTABLE || datos.parones > PARONES_ACEPTABLES;

    // Para volver a la versión con animaciones hace falta ir claramente bien,
    // no solo un pelo mejor que el listón. Si no, la pantalla estaría todo el
    // rato encendiendo y apagando efectos, que es peor que cualquiera de los
    // dos estados.
    const siguiente = ligero === true
      ? !(datos.medianaMs < MS_ACEPTABLE * 0.7 && datos.parones === 0)
      : vaMal;

    if (siguiente !== ligero) {
      ligero = siguiente;
      alCambiar(ligero, datos);
    }
    temporizador = window.setTimeout(ronda, REVISAR_CADA_MS);
  };

  // Un respiro antes de la primera medida: recién abierta, la pantalla está
  // cargando imágenes y cualquier medida saldría mal por motivos que pasan.
  temporizador = window.setTimeout(ronda, 2500);

  return () => {
    vivo = false;
    if (temporizador) window.clearTimeout(temporizador);
  };
}

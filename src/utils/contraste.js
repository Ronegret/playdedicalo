/**
 * Elige texto negro o blanco sobre un fondo de color, según cuál de los dos
 * contrasta mejor.
 *
 * Existe porque los colores de las playlists se eligen por estética y luego
 * se les pone un texto encima. Con `text-black` fijo, la pastilla "CHILE"
 * (#0039a6) quedaba en 2,14:1 — WCAG AA pide 4,5:1 para texto normal. Con
 * este cálculo sube a 9,83:1 sin tocar la paleta, y cualquier color que se
 * añada en el futuro queda cubierto sin que nadie tenga que acordarse.
 */

function luminanciaRelativa(hex) {
  const limpio = String(hex || '').replace('#', '');
  if (limpio.length !== 6) return 0;
  const canales = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255);
  const lineal = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
}

/** Razón de contraste entre dos luminancias relativas (1:1 a 21:1). */
function razon(l1, l2) {
  const [claro, oscuro] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Devuelve '#000000' o '#ffffff', el que más contraste dé sobre `fondoHex`. */
export function tintaSobre(fondoHex) {
  const l = luminanciaRelativa(fondoHex);
  return razon(l, 0) >= razon(l, 1) ? '#000000' : '#ffffff';
}

/** Igual que `tintaSobre`, pero devuelve la clase de Tailwind. */
export function claseTintaSobre(fondoHex) {
  return tintaSobre(fondoHex) === '#000000' ? 'text-black' : 'text-white';
}

export { luminanciaRelativa, razon };

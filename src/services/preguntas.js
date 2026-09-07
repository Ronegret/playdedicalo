/**
 * ARMAR LA PREGUNTA DE CADA RONDA
 *
 * Vivía dentro de services/spotify.js, pero nunca tuvo nada que ver con
 * Spotify: solo mira el año de la canción y la ruta del jugador. Se saca
 * aquí para poder borrar el archivo de Spotify entero.
 *
 * El juego tiene un único modo (AÑOS LOCOS): suena una canción, se corta, y
 * cada jugador coloca el año donde cree que encaja en su propia ruta.
 */

const AÑOS_MAXIMOS = 20;

/**
 * La ruta que ve el jugador esta ronda. Si ya tiene años ganados, esos son
 * su ruta. Si acaba de empezar, se le arma una de arranque alrededor del año
 * de la canción para que la primera jugada tenga sentido.
 */
function rutaDeArranque(añoCancion, ronda) {
  const base = Number(añoCancion) || 2000;
  // Una sola referencia al principio y va creciendo con las rondas: colocar
  // entre dos años es imposible si todavía no tienes ninguno.
  const cuantos = Math.min(1 + Math.floor((ronda - 1) / 3), 4);
  const años = [];
  for (let i = 0; i < cuantos; i += 1) {
    const desplazamiento = (i - Math.floor(cuantos / 2)) * 9;
    const año = base + desplazamiento + (desplazamiento === 0 ? 7 : 0);
    años.push(Math.max(1930, Math.min(new Date().getFullYear(), año)));
  }
  return [...new Set(años)].sort((a, b) => a - b);
}

function rutaDelJugador(añoCancion, ronda, añosGuardados = []) {
  const propios = [...(añosGuardados || []).map(Number).filter(Boolean)]
    .sort((a, b) => a - b)
    .slice(0, AÑOS_MAXIMOS);

  if (propios.length) return propios;
  return rutaDeArranque(añoCancion, ronda).slice(0, AÑOS_MAXIMOS);
}

/**
 * @param {{releaseYear:number|null}} cancion  la que acaba de sonar
 * @param {string} modo                        siempre 'timeline' hoy
 * @param {number} ronda
 * @param {number[]} añosDelJugador            su ruta actual
 */
export function crearPreguntaDeCancion(cancion, modo, ronda = 1, añosDelJugador = []) {
  const año = cancion?.releaseYear || 2016;
  const ruta = rutaDelJugador(año, ronda, añosDelJugador);

  // El hueco correcto: cuántos años de su ruta son anteriores o iguales.
  const correcta = ruta.filter((suyo) => suyo <= año).length;

  return {
    mode: 'timeline',
    answerType: 'timeline-placement',
    type: 'Años Locos',
    text: '¿De qué año es?',
    timelineYears: ruta,
    songYear: año,
    options: Array.from({ length: ruta.length + 1 }, (_, i) => String(i)),
    correct: correcta
  };
}

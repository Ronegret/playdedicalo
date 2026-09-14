/**
 * HÁPTICA
 *
 * La vibración es de las señales más fuertes de "esto es una app" que existe,
 * y hasta ahora estaba repartida por el código con valores improvisados —12,
 * 18, 35, [18,30,18]— sin que nadie pudiera decir qué significaba cada uno.
 * Aquí se convierte en un vocabulario: se pide `toque` o `error`, no un
 * número de milisegundos.
 *
 * AVISO IMPORTANTE SOBRE IPHONE
 * Safari NO implementa navigator.vibrate. No es que funcione mal: no existe,
 * y Apple no ha dado señales de ir a añadirlo. Así que en iPhone todas estas
 * llamadas no hacen nada hoy.
 *
 * Por eso el módulo busca primero un puente nativo (Capacitor). El día que la
 * app se empaquete —que es la única forma de tener háptica en iPhone— la
 * vibración empieza a funcionar en todas las pantallas sin tocar ni un
 * componente, porque todos pasan por aquí.
 *
 * Esa es justamente la razón de centralizarlo antes de necesitarlo.
 */

const CLAVE = 'dedicalo_vibracion';

/** Vocabulario. Los patrones son [vibra, pausa, vibra, …] en milisegundos. */
const PATRONES = {
  /** Tocar un botón. Lo más corto que se percibe. */
  toque: 10,
  /** Selección dentro de una lista (elegir avatar, cambiar opción). */
  seleccion: 14,
  /** Confirmado: dos pulsos. Se siente como un "sí". */
  confirmar: [16, 34, 16],
  /** Algo salió mal. Tres pulsos largos: se siente como un "no". */
  error: [38, 58, 38],
  /** Acierto en la ronda. */
  acierto: [14, 26, 14, 26, 40],
  /** Fallo en la ronda. Un pulso largo y sordo. */
  fallo: 60,
  /** Empieza la cuenta atrás. */
  tic: 8,
  /** Te han saboteado. Tiene que dar un susto pequeño. */
  sabotaje: [50, 40, 30, 40, 70],
  /** Revelación del año. */
  revelar: [20, 50, 30],
  /** Has ganado la partida. Lo más largo que se permite. */
  victoria: [40, 60, 40, 60, 40, 60, 120]
};

let activa = leerPreferencia();
let puente = null;
let puenteBuscado = false;
let estilos = null;

function leerPreferencia() {
  try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; }
}

/**
 * ¿Hay un puente nativo? Solo se mira una vez.
 *
 * En web no habrá ninguno y se cae a navigator.vibrate, que funciona en
 * Android y no existe en iOS.
 */
function esNativo() {
  try { return Boolean(window.Capacitor?.isNativePlatform?.()); } catch { return false; }
}

function obtenerPuente() {
  if (puenteBuscado) return puente;
  puenteBuscado = true;
  if (!esNativo()) return null;

  // Importación DINÁMICA a propósito: en web el plugin no se descarga nunca.
  // Meterlo con un `import` normal arriba lo metería en el bundle de todos
  // los invitados, que entran por QR y a los que no les sirve de nada.
  //
  // Llega tarde (es asíncrona), así que las primerísimas vibraciones caen a
  // navigator.vibrate. En Android funciona igual; en iPhone se pierden dos o
  // tres toques del arranque, que es un precio ridículo comparado con cargar
  // el plugin a todo el mundo.
  import('@capacitor/haptics')
    .then((m) => { puente = m.Haptics; estilos = m; })
    .catch(() => { puente = null; });

  return null;
}

/**
 * Traduce nuestro vocabulario al del plugin nativo, que no habla de
 * milisegundos sino de intensidades (esa es la forma correcta en iOS: el
 * Taptic Engine no se controla por duración).
 */
function nativo(p, nombre) {
  const impactos = { toque: 'Light', seleccion: 'Light', tic: 'Light', fallo: 'Heavy', sabotaje: 'Heavy' };
  const avisos = { confirmar: 'SUCCESS', error: 'ERROR', acierto: 'SUCCESS', revelar: 'WARNING', victoria: 'SUCCESS' };
  try {
    if (avisos[nombre]) {
      p.notification({ type: estilos?.NotificationType?.[avisos[nombre]] ?? avisos[nombre] });
    } else {
      const clave = impactos[nombre] || 'Medium';
      p.impact({ style: estilos?.ImpactStyle?.[clave] ?? clave });
    }
    return true;
  } catch { return false; }
}

/**
 * Dispara una vibración del vocabulario.
 * Nunca lanza y nunca bloquea: si no se puede vibrar, no pasa nada.
 *
 * @param {keyof PATRONES} nombre
 */
export function vibrar(nombre) {
  if (!activa) return;
  const patron = PATRONES[nombre];
  if (patron === undefined) return;

  const p = obtenerPuente();
  if (p && nativo(p, nombre)) return;

  try {
    // En iPhone esto es siempre undefined: no hay vibración posible en web.
    navigator.vibrate?.(patron);
  } catch { /* algunos navegadores lo bloquean sin interacción previa */ }
}

export function vibracionActiva() {
  return activa;
}

export function activarVibracion(valor) {
  activa = Boolean(valor);
  try { localStorage.setItem(CLAVE, activa ? '1' : '0'); } catch { /* ignorar */ }
  if (!activa) { try { navigator.vibrate?.(0); } catch { /* ignorar */ } }
}

/**
 * ¿Puede este aparato vibrar siquiera? Sirve para no enseñar un ajuste de
 * vibración en un iPhone, donde no haría absolutamente nada — un interruptor
 * que no hace nada es peor que no tener interruptor.
 */
export function hayVibracion() {
  // En nativo siempre hay, aunque el plugin aún no haya terminado de cargar.
  return esNativo() || typeof navigator.vibrate === 'function';
}

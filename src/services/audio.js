/**
 * BUS DE AUDIO
 *
 * Una sola mesa de mezclas para todo lo que suena en el juego. Existe por dos
 * motivos, y el primero no es estético:
 *
 * 1. EL INTERRUPTOR DE SILENCIO DEL IPHONE.
 *    Un <audio> suelto en iOS obedece al interruptor lateral. El anfitrión
 *    casi siempre lleva el móvil en silencio, así que la sala se quedaba muda
 *    y nadie entendía por qué. Pasando el mismo elemento por Web Audio —y
 *    declarando la sesión como 'playback'— el sistema lo trata como
 *    reproducción de medios y suena aunque el interruptor esté puesto.
 *
 * 2. CAPAS.
 *    Con una mesa se puede bajar la música sin cortarla mientras suena un
 *    efecto (eso es el "ducking"), que es la diferencia entre un juego y una
 *    web que reproduce archivos.
 *
 * Los efectos se SINTETIZAN aquí, con osciladores. Ni un archivo que
 * descargar, ni un sprite de sonido que mantener, ni un byte más de peso: un
 * tick son treinta líneas de código y pesa cero. Para los sonidos cortos de
 * interfaz de un juego musical sobra.
 *
 * Nada de esto puede impedir jugar: si el navegador no trae Web Audio, todas
 * las funciones se vuelven inocuas y la música sigue por el camino de antes.
 */

const CLAVE_SILENCIO = 'dedicalo_sfx_silenciado';

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let fuenteMusica = null;
let silenciado = leerSilenciado();
let desduplicar = new Map();

function leerSilenciado() {
  try { return localStorage.getItem(CLAVE_SILENCIO) === '1'; } catch { return false; }
}

/**
 * Declara al sistema que esto es reproducción de medios, no un pitido de
 * interfaz. En iOS 16.4+ es lo que hace que el interruptor de silencio deje
 * de aplicarse. Donde no existe, no pasa nada.
 */
function declararSesionDeMedios() {
  try {
    if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
  } catch { /* no soportado */ }
}

/**
 * Crea la mesa. Debe llamarse desde un gesto real del usuario (el mismo botón
 * que ya desbloquea la música), porque hasta entonces el navegador deja el
 * contexto suspendido.
 */
export function iniciarAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  try {
    declararSesionDeMedios();
    ctx = new AC({ latencyHint: 'interactive' });

    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = silenciado ? 0 : 0.85;
    sfxGain.connect(masterGain);
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * Mete el <audio> de la música dentro de la mesa.
 *
 * Solo se puede hacer UNA vez por elemento — de ahí que musica.js reutilice
 * siempre el mismo. A partir de aquí ese elemento suena EXCLUSIVAMENTE por
 * este camino, que es justo lo que arregla el interruptor de silencio.
 *
 * Requiere que el elemento tenga crossOrigin='anonymous' (ya lo tiene): sin
 * eso, el navegador enmudece la salida de un audio de otro origen por
 * política de seguridad.
 */
export function conectarMusica(elemento) {
  if (!elemento || fuenteMusica) return;
  const c = iniciarAudio();
  if (!c) return;
  try {
    fuenteMusica = c.createMediaElementSource(elemento);
    fuenteMusica.connect(musicGain);
  } catch {
    // Si falla (elemento ya conectado, origen sin CORS), se deja como estaba:
    // la música sigue sonando por la ruta normal del elemento.
    fuenteMusica = null;
  }
}

/** El contexto se suspende solo al volver de segundo plano. Hay que despertarlo. */
export function despertarAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/* ─── Ducking ──────────────────────────────────────────────────────────────
   Bajar la música en vez de cortarla. Lo hace cualquier juego y cualquier
   radio, y es lo que permite que un efecto se oiga sin pelearse con la
   canción. Las rampas son exponenciales porque el oído percibe el volumen
   así; una rampa lineal se oye como un salto.
────────────────────────────────────────────────────────────────────────── */

export function agacharMusica(nivel = 0.25, ms = 120) {
  if (!musicGain || !ctx) return;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
  musicGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, nivel), t + ms / 1000);
}

export function recuperarMusica(ms = 320) {
  if (!musicGain || !ctx) return;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
  musicGain.gain.exponentialRampToValueAtTime(1, t + ms / 1000);
}

/** Fundido de salida de verdad, para cortar el fragmento sin el "clack". */
export function fundirMusica(ms = 400) {
  if (!musicGain || !ctx) return Promise.resolve();
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), t);
  musicGain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  return new Promise((r) => setTimeout(r, ms));
}

/** Devuelve el volumen a tope de golpe (tras un fundido, antes de la siguiente). */
export function restaurarMusica() {
  if (!musicGain || !ctx) return;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.value = 1;
}

/* ─── Silenciar los efectos ─────────────────────────────────────────────── */

export function silenciarEfectos(valor) {
  silenciado = Boolean(valor);
  try { localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0'); } catch { /* ignorar */ }
  if (sfxGain && ctx) {
    sfxGain.gain.setTargetAtTime(silenciado ? 0 : 0.85, ctx.currentTime, 0.02);
  }
}

export function efectosSilenciados() {
  return silenciado;
}

/* ─── Síntesis ─────────────────────────────────────────────────────────────
   Un ayudante y ya. Todo lo de abajo es una envolvente sobre un oscilador:
   ataque muy corto, caída exponencial. Sin envolvente, un oscilador que
   arranca y para produce un chasquido —el famoso "click"— porque la onda se
   corta a media altura.
────────────────────────────────────────────────────────────────────────── */

function tono({ freq, tipo = 'sine', dur = 0.12, vol = 0.3, retardo = 0, barridoA = null }) {
  if (!ctx || silenciado) return;
  const t0 = ctx.currentTime + retardo;

  const osc = ctx.createOscillator();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (barridoA) osc.frequency.exponentialRampToValueAtTime(barridoA, t0 + dur);

  const g = ctx.createGain();
  // Ataque de 8 ms: suficiente para que no chasque, corto para que sea seco.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Ruido filtrado: la base de los "whoosh" y del confeti. */
function ruido({ dur = 0.3, vol = 0.2, retardo = 0, desde = 400, hasta = 4000, q = 1 }) {
  if (!ctx || silenciado) return;
  const t0 = ctx.currentTime + retardo;
  const muestras = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = q;
  filtro.frequency.setValueAtTime(desde, t0);
  filtro.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filtro);
  filtro.connect(g);
  g.connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/**
 * Evita que el mismo efecto se dispare dos veces en el mismo fotograma.
 * Con estado que llega por la red y React redibujando, pasa más de lo que
 * parece, y dos copias del mismo tono suenan al doble de volumen.
 */
function unaVez(clave, ms = 60) {
  const ahora = performance.now();
  const previo = desduplicar.get(clave) || 0;
  if (ahora - previo < ms) return false;
  desduplicar.set(clave, ahora);
  return true;
}

/* ─── El vocabulario del juego ─────────────────────────────────────────────
   Cada sonido tiene un trabajo. Si no se distingue con los ojos cerrados,
   sobra.
────────────────────────────────────────────────────────────────────────── */

export const sfx = {
  /** Toque de interfaz. Corto y neutro: suena cien veces por partida. */
  toque() {
    if (!unaVez('toque', 40)) return;
    tono({ freq: 880, tipo: 'triangle', dur: 0.05, vol: 0.12 });
  },

  /** Confirmación: dos notas que suben. "Hecho". */
  confirmar() {
    if (!unaVez('confirmar')) return;
    tono({ freq: 660, tipo: 'triangle', dur: 0.09, vol: 0.2 });
    tono({ freq: 990, tipo: 'triangle', dur: 0.12, vol: 0.18, retardo: 0.07 });
  },

  /** Algo no se puede hacer. Grave y corto, sin dramatismo. */
  denegar() {
    if (!unaVez('denegar')) return;
    tono({ freq: 200, tipo: 'square', dur: 0.14, vol: 0.14, barridoA: 120 });
  },

  /**
   * Tic de cuenta atrás. El tono SUBE con la urgencia — 3, 2, 1 no suenan
   * igual. Es el truco más viejo y más eficaz para crear tensión sin decir
   * nada.
   */
  tic(restantes = 3) {
    const freqs = { 3: 660, 2: 780, 1: 990 };
    tono({ freq: freqs[restantes] || 660, tipo: 'square', dur: 0.07, vol: 0.16 });
  },

  /** Empieza la ronda. Golpe con cuerpo. */
  arranque() {
    if (!unaVez('arranque', 300)) return;
    tono({ freq: 320, tipo: 'sawtooth', dur: 0.25, vol: 0.22, barridoA: 640 });
    ruido({ dur: 0.35, vol: 0.12, desde: 300, hasta: 3000 });
  },

  /**
   * Rampa de tensión para los últimos segundos. Una nota que sube despacio
   * durante casi un segundo: el cuerpo la reconoce como "va a pasar algo".
   */
  tension(dur = 1.4) {
    if (!unaVez('tension', 800)) return;
    tono({ freq: 180, tipo: 'sawtooth', dur, vol: 0.14, barridoA: 900 });
    ruido({ dur, vol: 0.08, desde: 200, hasta: 6000, q: 0.7 });
  },

  /** Justo antes de revelar: golpe de tambor seco que reclama la mirada. */
  redoble() {
    if (!unaVez('redoble', 400)) return;
    ruido({ dur: 0.18, vol: 0.22, desde: 1200, hasta: 200, q: 0.5 });
    tono({ freq: 90, tipo: 'sine', dur: 0.22, vol: 0.28, barridoA: 45 });
  },

  /** Acierto: acorde mayor ascendente. Inequívocamente bueno. */
  acierto() {
    if (!unaVez('acierto', 200)) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tono({ freq: f, tipo: 'triangle', dur: 0.3, vol: 0.2, retardo: i * 0.055 });
    });
  },

  /** Fallo: segunda menor descendente. Suena "mal" sin ser desagradable. */
  fallo() {
    if (!unaVez('fallo', 200)) return;
    tono({ freq: 330, tipo: 'sawtooth', dur: 0.18, vol: 0.16 });
    tono({ freq: 311, tipo: 'sawtooth', dur: 0.3, vol: 0.14, retardo: 0.09, barridoA: 180 });
  },

  /** Sabotaje entrante. Sirena descendente: la señal universal de "cuidado". */
  sabotaje() {
    if (!unaVez('sabotaje', 400)) return;
    tono({ freq: 880, tipo: 'sawtooth', dur: 0.45, vol: 0.2, barridoA: 180 });
    ruido({ dur: 0.5, vol: 0.14, desde: 3000, hasta: 300, q: 0.8 });
  },

  /** Alguien avanza en la ruta. Un saltito. */
  avanzar() {
    if (!unaVez('avanzar', 120)) return;
    tono({ freq: 520, tipo: 'triangle', dur: 0.1, vol: 0.16, barridoA: 780 });
  },

  /** Victoria. Fanfarria de cinco notas: lo único que dura casi un segundo. */
  victoria() {
    if (!unaVez('victoria', 1500)) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      tono({ freq: f, tipo: 'triangle', dur: 0.45, vol: 0.22, retardo: i * 0.11 });
    });
    ruido({ dur: 0.9, vol: 0.1, retardo: 0.4, desde: 2000, hasta: 8000 });
  },

  /** Transición entre pantallas. Tan sutil que casi no se oye — a propósito. */
  paso() {
    ruido({ dur: 0.18, vol: 0.07, desde: 800, hasta: 4000, q: 0.6 });
  }
};

/** Para los ajustes: saber si hay mesa de mezclas o seguimos en modo simple. */
export function audioDisponible() {
  return Boolean(ctx);
}

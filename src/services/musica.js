/**
 * REPRODUCTOR DE MÚSICA SIN SPOTIFY
 *
 * Sustituye al Web Playback SDK. Reproduce los fragmentos de 30 segundos que
 * `npm run resolver-previews` dejó guardados en el catálogo, con una simple
 * etiqueta de audio.
 *
 * Qué desaparece al usar esto:
 *
 *   - El anfitrión ya NO necesita cuenta de Spotify ni Premium.
 *   - Se acaba el techo de 5 usuarios del modo desarrollo.
 *   - No hay tokens que caduquen a mitad de partida ni reconexiones.
 *   - Se deja de incumplir la política de Spotify, que prohíbe expresamente
 *     los juegos y prohíbe cobrar en apps que reproducen.
 *
 * Ver docs/decisiones/0002-dependencia-de-spotify.md.
 *
 * Los 30 segundos sobran: el juego corta la música y pregunta el año.
 */

const CATALOGO_URL = '/data/dedicalo-song-catalog.full.clean.json';
const CLAVE_CANCION = 'dedicalo_cancion_oculta';
const CLAVE_TOCADAS = 'dedicalo_tocadas_v2';

let promesaCatalogo = null;
let audio = null;
let listaActual = null;

/** Audio único y reutilizado: crear uno por canción deja instancias colgando
 *  en iOS y acaba sin sonido tras unas cuantas rondas. */
function obtenerAudio() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    // Los fragmentos de Apple vienen con permiso de origen abierto, pero
    // marcarlo explícitamente evita sorpresas si algún día se analiza la
    // onda para el visualizador.
    audio.crossOrigin = 'anonymous';
  }
  return audio;
}

// Fragmento de silencio en WAV. Hace falta una fuente DE VERDAD para
// desbloquear: llamar a play() sobre un audio sin `src` no desbloquea nada y
// además la promesa se queda colgada para siempre en algunos navegadores.
// Eso es exactamente lo que impedía empezar la partida — el lobby esperaba a
// que resolviera y nunca lo hacía.
const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/**
 * Desbloquea el audio del navegador. Hay que llamarlo desde un toque real
 * del usuario (un botón): si no, el navegador no deja sonar nada después y el
 * juego se queda mudo sin decir por qué.
 *
 * Nunca tarda más de lo previsto ni lanza: si algo va mal devuelve false y el
 * juego sigue. Que el audio no se desbloquee no puede impedir jugar.
 */
export async function desbloquearAudio() {
  const a = obtenerAudio();
  try {
    const previo = a.src;
    a.muted = true;
    a.src = SILENCIO;

    // Vallado de seguridad: pase lo que pase, esto termina.
    await Promise.race([
      a.play().catch(() => {}),
      new Promise((r) => setTimeout(r, 1200))
    ]);

    a.pause();
    try { a.currentTime = 0; } catch { /* algunos navegadores se quejan */ }
    a.muted = false;
    // Se devuelve la canción anterior si la había, para no cortar nada.
    if (previo && previo !== SILENCIO) a.src = previo;
    return true;
  } catch {
    return false;
  }
}

async function cargarCatalogo() {
  if (!promesaCatalogo) {
    promesaCatalogo = fetch(CATALOGO_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Catálogo no disponible: ${r.status}`);
        return r.json();
      })
      .catch((error) => {
        promesaCatalogo = null;
        throw error;
      });
  }
  return promesaCatalogo;
}

function idDeLista(url) {
  const m = String(url || '').match(/playlist\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

function cancionDesdeFila(fila) {
  return {
    uri: fila.spotify_uri || `spotify:track:${fila.spotify_track_id}`,
    id: fila.spotify_track_id,
    name: fila.title,
    artist: fila.artist_main || 'Artista sorpresa',
    releaseYear: Number(fila.release_year) || null,
    previewUrl: fila.preview_url || null,
    coverUrl: fila.cover_url || null,
    // Mismo dato con el nombre que espera la pantalla de resultado del móvil.
    albumImage: fila.cover_url || null
  };
}

/** Canciones jugables de una lista: solo las que tienen fragmento. Una sin
 *  fragmento no es que suene mal, es que no suena — así que ni se ofrece. */
export async function cancionesDeLista(playlistUrl) {
  const id = idDeLista(playlistUrl);
  const catalogo = await cargarCatalogo();
  return catalogo
    .filter((fila) => fila.playlist_id === id && fila.preview_url)
    .map(cancionDesdeFila);
}

/** Cobertura de una lista, para poder avisar antes de empezar la partida. */
export async function coberturaDeLista(playlistUrl) {
  const id = idDeLista(playlistUrl);
  const catalogo = await cargarCatalogo();
  const dela = catalogo.filter((f) => f.playlist_id === id);
  const con = dela.filter((f) => f.preview_url).length;
  return { total: dela.length, jugables: con, porcentaje: dela.length ? con / dela.length : 0 };
}

function leerTocadas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_TOCADAS) || '{}'); } catch { return {}; }
}
function guardarTocadas(v) {
  try { localStorage.setItem(CLAVE_TOCADAS, JSON.stringify(v)); } catch { /* almacenamiento lleno o bloqueado */ }
}

function elegirSinRepetir(playlistUrl, canciones) {
  const id = idDeLista(playlistUrl) || 'default';
  if (id !== listaActual) listaActual = id;

  const tocadas = leerTocadas();
  const yaSonaron = new Set(tocadas[id] || []);
  let disponibles = canciones.filter((c) => !yaSonaron.has(c.uri));

  // Se acabó la lista: vuelta a empezar en vez de dejar la partida sin música.
  if (!disponibles.length) {
    disponibles = canciones;
    yaSonaron.clear();
  }

  const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
  yaSonaron.add(elegida.uri);
  tocadas[id] = Array.from(yaSonaron);
  guardarTocadas(tocadas);
  return elegida;
}

/** Arranca una canción al azar de la lista y devuelve cuál fue. */
export async function sonarCancionAleatoria(playlistUrl) {
  const canciones = await cancionesDeLista(playlistUrl);
  if (!canciones.length) {
    throw new Error('Esa lista no tiene canciones con fragmento disponible todavía.');
  }

  const cancion = elegirSinRepetir(playlistUrl, canciones);
  try {
    sessionStorage.setItem(CLAVE_CANCION, JSON.stringify(cancion));
  } catch { /* modo privado */ }

  const a = obtenerAudio();
  a.src = cancion.previewUrl;
  a.currentTime = 0;
  a.volume = 1;
  await a.play();
  return cancion;
}

export function pararMusica() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

export function reanudarMusica() {
  if (!audio || !audio.src) return Promise.resolve();
  return audio.play().catch(() => {});
}

export function estaSonando() {
  return Boolean(audio && !audio.paused && audio.currentTime > 0);
}

/** Segundos restantes del fragmento, para poder avisar antes de que acabe. */
export function segundosRestantes() {
  if (!audio || !audio.duration) return 0;
  return Math.max(0, audio.duration - audio.currentTime);
}

/**
 * Duración del fragmento cargado, para poder publicarla.
 *
 * Los fragmentos de Apple son de 30 s casi siempre, pero "casi" no basta:
 * si se anuncia 30 y dura 28, la cuenta atrás de la tele se queda clavada en
 * 2 y parece rota. Se lee la de verdad y solo se cae a 30 si el navegador
 * aún no la sabe.
 */
export function duracionFragmento() {
  return audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
}

export function getCancionOculta() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_CANCION) || 'null'); } catch { return null; }
}

export function olvidarCancionOculta() {
  try { sessionStorage.removeItem(CLAVE_CANCION); } catch { /* ignorar */ }
}

/**
 * Aviso cuando el fragmento se acaba solo. Con 30 segundos el anfitrión casi
 * siempre corta antes, pero si no lo hace hay que enterarse en vez de quedar
 * la sala en silencio esperando.
 */
export function alTerminarFragmento(callback) {
  const a = obtenerAudio();
  const manejar = () => callback?.();
  a.addEventListener('ended', manejar);
  return () => a.removeEventListener('ended', manejar);
}

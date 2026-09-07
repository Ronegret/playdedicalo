import { create } from 'zustand';
import { ref, onValue, onDisconnect, get, set, update, remove, serverTimestamp } from 'firebase/database';
import { database, ensureAuthenticated } from '../firebase';

// Cuánto tiempo se muestra a un jugador como "Reconectando" antes de darlo
// por perdido en la UI. No lo saca de la sala — solo cambia el indicador de
// 🟡 a 🔴 — así que volver dentro de este margen (llamada, pantalla
// bloqueada, cambio de app) no le hace perder su sitio ni su progreso.
export const RECONNECT_GRACE_MS = 30000;

const SESSION_STORAGE_KEYS = ['dedicalo_player_id', 'dedicalo_room_pin', 'dedicalo_role'];
const PROFILE_STORAGE_KEYS = {
  name: 'dedicalo_profile_name',
  avatar: 'dedicalo_profile_avatar',
  uid: 'dedicalo_profile_uid'
};

function persistSession(role, pin, playerId) {
  localStorage.setItem('dedicalo_player_id', playerId);
  localStorage.setItem('dedicalo_room_pin', pin);
  localStorage.setItem('dedicalo_role', role);
}

function clearPersistedSession() {
  SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function cleanProfileName(value, fallback = 'Jugador') {
  return String(value || fallback).trim().slice(0, 18) || fallback;
}

function cleanProfileAvatar(value, fallback = 'DJ') {
  return String(value || fallback).trim().slice(0, 120) || fallback;
}

function getLocalProfile(user = {}) {
  return {
    name: localStorage.getItem(PROFILE_STORAGE_KEYS.name) || user?.displayName || '',
    avatar: localStorage.getItem(PROFILE_STORAGE_KEYS.avatar) || user?.photoURL || '',
    uid: localStorage.getItem(PROFILE_STORAGE_KEYS.uid) || user?.uid || ''
  };
}

function persistProfile(profile = {}) {
  if (profile.name) localStorage.setItem(PROFILE_STORAGE_KEYS.name, profile.name);
  if (profile.avatar) localStorage.setItem(PROFILE_STORAGE_KEYS.avatar, profile.avatar);
  if (profile.uid) localStorage.setItem(PROFILE_STORAGE_KEYS.uid, profile.uid);
}

// Registra el handler de "se cayó la conexión" para el jugador actual. Cada
// conexión websocket tiene su propia cola de onDisconnect: si el socket se
// reconecta (visibilitychange, wifi que va y viene), hay que volver a
// registrar el handler o un corte real ya no marcaría a nadie como offline.
function armPresenceDisconnect(pin, playerId) {
  onDisconnect(ref(database, `rooms/${pin}/players/${playerId}`))
    .update({ status: 'offline', lastSeenAt: serverTimestamp(), offlineSince: serverTimestamp() })
    .catch(() => {});
}

// Los puntos de acierto (+5/-3) nunca ganan la partida por sí solos — solo
// sirven para dos cosas: sabotear (ATTACK_COST) o canjearlos por progreso
// real hacia la meta (REDEEM_YEAR_COST). Con puntos ahorrados, un jugador
// puede comprar directamente una "canción" de progreso sin tener que
// acertarla, para quien vaya atrás en el conteo de canciones.
// Punto extra para quien acierta PRIMERO en la ronda. Solo uno por
// ronda: premia la decision rapida sin desequilibrar (un acierto normal
// vale 5).
export const SPEED_BONUS_POINTS = 1;

export const ATTACK_COST = 8;
// 30 y no 40: los jugadores arrancan con 10 puntos y el mas rapido de cada
// ronda se lleva otro, asi que a 40 solo llegaba quien ya iba ganando —
// medido, cuando por fin podia canjear llevaba 10,6 de 12 canciones y ya no
// le hacia falta. A 30, el jugador medio lo alcanza sobre la ronda 12
// llevando ~8/12, que es cuando la remontada todavia significa algo.
export const REDEEM_YEAR_COST = 30;

// Un jugador que entra con la partida empezada arrancaba con la ruta vacia
// mientras el resto podia llevar 8 de 12: no tenia ninguna opcion real. Se
// le da de salida la media del grupo menos este margen, para que entre por
// detras pero dentro de la partida.
export const LATE_JOIN_HANDICAP = 2;

// El sabotaje tiene consecuencia real en la ruta de años, no solo un efecto
// visual — a pedido explícito del usuario:
//  - block_vote: el objetivo queda bloqueado y no puede responder esta
//    ronda. Cuenta como fallo (igual que no contestar a tiempo).
//  - year_steal: el objetivo sigue respondiendo normal. Si acierta, el año
//    que hubiera ganado se lo lleva quien lo saboteó, y además pierde uno
//    de los años que ya tenía en su ruta — un robo de verdad, no solo
//    presión visual. Se avisa antes de responder para que decida si igual
//    quiere arriesgarse a acertar.
export const ATTACK_TYPES = {
  block_vote: {
    id: 'block_vote',
    icon: 'block',
    name: 'Bloqueo',
    short: 'No puede responder esta ronda',
    description: 'Queda bloqueado y no puede votar en esta ronda — cuenta como fallo.'
  },
  year_steal: {
    id: 'year_steal',
    icon: 'move_down',
    name: 'Robo de año',
    short: 'Si acierta, te regala un año',
    description: 'Si acierta esta ronda, ese año pasa a ti y él pierde uno de los que ya tenía.'
  }
};

// El sabotaje es OPCIONAL: el anfitrion decide si su partida lo incluye y
// que tipos permite. Sin esto, todas las salas lo tenian a la fuerza.
// Se normaliza siempre contra ATTACK_TYPES para que un valor corrupto o de
// una version vieja no rompa la partida.
export function normalizeSabotageTypes(types) {
  const valid = Object.keys(ATTACK_TYPES);
  const list = Array.isArray(types) ? types.filter((t) => valid.includes(t)) : [];
  return list.length ? list : valid;
}

export const TIMELINE_GOAL_YEARS = 12;
export const MIN_TIMELINE_GOAL_YEARS = 6;
export const MAX_TIMELINE_GOAL_YEARS = 20;
export const DEDICALO_PLAYLISTS = [
  { id: 'espanol-100', icon: 'stadium', name: 'ESPAÑOL 100%', mood: 'Solo temazos en español para cantar rápido.', url: 'https://open.spotify.com/playlist/1C3NDNNfg6c0SlPhyikGVU' },
  { id: 'temazos', icon: 'local_fire_department', name: 'TEMAZOS', mood: 'Canciones grandes para grupos competitivos.', url: 'https://open.spotify.com/playlist/0i8fEuY6ffN6Ou53BeIcxY' },
  { id: 'espanol-summer-party', icon: 'wb_sunny', name: 'ESPAÑOL SUMMER', mood: 'Fiesta luminosa, verano y energía alta.', url: 'https://open.spotify.com/playlist/0UY3oVANXRqflE5QjHhaH4' },
  { id: 'hits-todo-tiempo', icon: 'public', name: 'HITS DE SIEMPRE', mood: 'Hits reconocibles para cualquier mesa.', url: 'https://open.spotify.com/playlist/5TOMoP3KEWtRASGeFsksUY' },
  { id: 'hits-rock-espanol', icon: 'electric_bolt', name: 'HITS ROCK ESPAÑOL', mood: 'Guitarras, himnos y memoria colectiva.', url: 'https://open.spotify.com/playlist/2cT61hYCfIkwHAyVMwej9D' },
  { id: 'fiesta-mayor-verbena', icon: 'celebration', name: 'FIESTA MAYOR', mood: 'Verbena, pueblo y canciones para gritar.', url: 'https://open.spotify.com/playlist/7xcdrzs58PmLIZa4P5Qk3s' },
  { id: 'chileno-100', icon: 'public', name: 'CHILENO 100%', mood: 'De Víctor Jara a hoy: himnos de Chile.', url: 'https://open.spotify.com/playlist/4WwElfdU1VTTUD48yZrbNv' }
];
export const DEFAULT_SPOTIFY_PLAYLIST_URL = DEDICALO_PLAYLISTS[0].url;

// Vibra visual de cada playlist (color/acento/formato) — compartida entre
// la pantalla de creación de sala y el selector de "jugar otra vez" del
// lobby, así ambos pintan la misma identidad por playlist.
export const PLAYLIST_META = {
  'espanol-100': { icon: 'stadium', color: '#ff3d77', accent: '#ffd000', format: 'VINILO POP' },
  'temazos': { icon: 'local_fire_department', color: '#ff5500', accent: '#39ff14', format: 'CD HITS' },
  'espanol-summer-party': { icon: 'wb_sunny', color: '#ffd000', accent: '#00c8ff', format: 'SUN MIX' },
  'hits-todo-tiempo': { icon: 'public', color: '#00c8ff', accent: '#ff7a1a', format: 'GLOBAL' },
  'hits-rock-espanol': { icon: 'electric_bolt', color: '#ffcc00', accent: '#ff3d77', format: 'ROCK CD' },
  'fiesta-mayor-verbena': { icon: 'celebration', color: '#dd44ff', accent: '#ffd000', format: 'VERBENA' },
  'chileno-100': { icon: 'public', color: '#d52b1e', accent: '#0039a6', format: 'CHILE' }
};

export const GAME_MODES = {
  timeline: {
    id: 'timeline',
    name: 'AÑOS LOCOS',
    short: 'Ordena canciones por año',
    description: `Cada jugador arma su propia ruta musical y gana quien completa primero ${TIMELINE_GOAL_YEARS} canciones.`,
    rhythm: 'Memoria, intuición y nostalgia: coloca cada canción donde crees que pertenece.'
  }
};


// These questions are fallbacks shown only when no Spotify track is available.
// All answers must be objectively correct for any song/situation.
const MUSIC_QUESTIONS = [
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Años Locos', text: '¿De qué año es?', timelineYears: [2000], songYear: 2014, options: ['0', '1'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Años Locos', text: '¿De qué año es?', timelineYears: [1995, 2005], songYear: 2001, options: ['0', '1', '2'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Años Locos', text: '¿De qué año es?', timelineYears: [1990, 2000, 2010], songYear: 2020, options: ['0', '1', '2', '3'], correct: 3 }
];


// Firebase SDK wrappers (kept as readData/writeData/patchData/deleteData so every
// call site below stays unchanged). Using the SDK instead of raw REST fetch means
// requests carry the signed-in user's auth token automatically, which the database
// rules can rely on instead of trusting anyone who can guess a 4-digit room PIN.
async function readData(path) {
  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? snapshot.val() : null;
}

async function writeData(path, data) {
  await set(ref(database, path), data);
}

async function patchData(path, data) {
  await update(ref(database, path), data);
}

async function deleteData(path) {
  await remove(ref(database, path));
}

export function normalizeSpotifyPlaylistUrl(value) {
  const text = (value || '').trim();
  if (!text) return DEFAULT_SPOTIFY_PLAYLIST_URL;

  const playlistMatch = text.match(/(?:open\.spotify\.com\/playlist\/|spotify:playlist:)([A-Za-z0-9]+)/);
  if (playlistMatch?.[1]) {
    return `https://open.spotify.com/playlist/${playlistMatch[1]}`;
  }

  if (/^[A-Za-z0-9]{16,}$/.test(text)) {
    return `https://open.spotify.com/playlist/${text}`;
  }

  return text;
}

function sortPlayers(players) {
  if (!Array.isArray(players)) return [];
  return [...players].sort((a, b) => {
    const progressA = getTimelineProgress(a);
    const progressB = getTimelineProgress(b);
    if (progressB !== progressA) {
      return progressB - progressA;
    }
    return Number(b.points || 0) - Number(a.points || 0);
  });
}

function clampPoints(value) {
  return Math.max(0, Number(value || 0));
}

function hashString(text = '') {
  return String(text)
    .split('')
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function getTimelineBaseYear(seed = '') {
  return 1990 + (hashString(seed) % 21);
}

function clampTimelineGoal(value) {
  return Math.min(MAX_TIMELINE_GOAL_YEARS, Math.max(MIN_TIMELINE_GOAL_YEARS, Number(value || TIMELINE_GOAL_YEARS)));
}

export function getPlayerPresence(player, now = Date.now()) {
  if (!player) return { status: 'offline', remainingMs: 0, elapsedMs: RECONNECT_GRACE_MS };
  if (player.status === 'kicked' || player.kicked) {
    return { status: 'kicked', remainingMs: 0, elapsedMs: RECONNECT_GRACE_MS };
  }
  if (player.status !== 'offline') {
    return { status: 'online', remainingMs: RECONNECT_GRACE_MS, elapsedMs: 0 };
  }
  const offlineAt = Number(player.offlineSince || player.lastSeenAt || now);
  const elapsedMs = Math.max(0, now - offlineAt);
  const remainingMs = Math.max(0, RECONNECT_GRACE_MS - elapsedMs);
  return {
    status: remainingMs > 0 ? 'reconnecting' : 'kicked',
    remainingMs,
    elapsedMs
  };
}

function normalizeTimelineYears(years = [], limit = MAX_TIMELINE_GOAL_YEARS) {
  return [...(years || []).map(Number).filter(Boolean)]
    .sort((a, b) => a - b)
    .slice(0, clampTimelineGoal(limit));
}

export function getCombinedTimelineYears(player) {
  const p = player || {};
  const baseYear = Number(p.timelineBaseYear || 2000);
  return normalizeTimelineYears([baseYear, ...(p.timelineYears || [])], MAX_TIMELINE_GOAL_YEARS);
}

// Progreso real hacia la meta: canciones acertadas + comodines canjeados con
// puntos (ver REDEEM_YEAR_COST). Es lo único que decide quién gana — los
// puntos por sí solos NUNCA ganan la partida, solo sirven para sabotear o
// para comprar este progreso.
export function getTimelineProgress(player) {
  return getCombinedTimelineYears(player).length + Number(player?.wildcards || 0);
}

// Con cuanto progreso arranca quien se suma con la partida empezada: la
// media del grupo menos LATE_JOIN_HANDICAP. Se cuenta como comodines (no
// como años concretos) porque no tiene sentido inventarle canciones que no
// ha acertado; para la meta valen igual. Nunca por debajo de 0, y nunca por
// encima de lo que lleva el grupo.
export function lateJoinWildcards(players = []) {
  const rivales = (players || []).filter((p) => p && !p.isHost);
  if (!rivales.length) return 0;
  const media = rivales.reduce((suma, p) => suma + getTimelineProgress(p), 0) / rivales.length;
  // -1 porque todos arrancan ya con el año base contado en su progreso.
  return Math.max(0, Math.round(media) - LATE_JOIN_HANDICAP - 1);
}



export const useGameStore = create((setStore, getStore) => ({
  role: null,
  pin: null,
  players: [],
  phase: 'lobby',
  round: 1,
  gameMode: 'timeline',
  targetScore: 70,
  targetYears: TIMELINE_GOAL_YEARS,
  // Sabotaje opcional (ver normalizeSabotageTypes). Por defecto activado
  // para no cambiar el juego de quien ya lo conoce, pero el anfitrion
  // puede apagarlo entero o dejar solo un tipo.
  sabotageEnabled: true,
  sabotageTypes: Object.keys(ATTACK_TYPES),
  currentQuestion: null,
  guestId: null,
  guestAvatar: null,
  guestName: null,
  profileName: getLocalProfile().name,
  profileAvatar: getLocalProfile().avatar,
  profileUid: getLocalProfile().uid,
  lastResultType: null,
  lastPointDelta: 0,
  roundAnswers: {},
  revealResults: {},
  roomError: null,
  currentTrack: null,
  timelineYears: [],
  roomSubscription: null,
  lastDisconnectedPlayer: null,
  // Pedidos de ingreso a mitad de partida: `joinRequests` es la lista que ve
  // el anfitrión (pendientes de aceptar/rechazar); `pendingJoinStatus` es el
  // estado del invitado que está esperando esa respuesta.
  joinRequests: [],
  pendingJoinStatus: null,
  joinRequestSubscription: null,

  isAudioPlaying: false,
  isAudioMuted: false,
  spotifyPlaylistUrl: DEFAULT_SPOTIFY_PLAYLIST_URL,

  setSpotifyPlaylistUrl: (url) => setStore({ spotifyPlaylistUrl: normalizeSpotifyPlaylistUrl(url) }),
  hostSetSpotifyPlaylistUrl: async (url) => {
    const playlistUrl = normalizeSpotifyPlaylistUrl(url);
    const { pin, role } = getStore();
    setStore({ spotifyPlaylistUrl: playlistUrl });

    if (role === 'host' && pin) {
      await patchData(`rooms/${pin}/audio`, { playlistUrl });
    }
  },
  setRole: (role) => setStore({ role }),

  // Defensa extra: una sesión anónima (la que arma Firebase automáticamente
  // solo para cumplir las reglas de la base de datos) nunca debe tratarse
  // como un perfil registrado — no tiene nombre/avatar reales y su uid ni
  // siquiera es estable en todos los dispositivos. Las pantallas ya filtran
  // esto antes de llamar aquí, pero se repite el chequeo por si algún otro
  // caller pasa un usuario sin filtrar.
  loadUserProfile: async (user = {}) => {
    const isRealUser = Boolean(user?.uid) && !user.isAnonymous;
    const localProfile = getLocalProfile(user);
    const remoteProfile = isRealUser ? await readData(`users/${user.uid}`).catch(() => null) : null;
    const profile = {
      uid: isRealUser ? user.uid : localProfile.uid,
      name: cleanProfileName(remoteProfile?.name || localProfile.name || (isRealUser ? user.displayName : ''), 'Jugador'),
      avatar: cleanProfileAvatar(remoteProfile?.avatar || localProfile.avatar || (isRealUser ? user.photoURL : ''), 'DJ'),
      email: (isRealUser ? user.email : '') || remoteProfile?.email || ''
    };
    persistProfile(profile);
    setStore({
      profileName: profile.name,
      profileAvatar: profile.avatar,
      profileUid: profile.uid
    });
    if (isRealUser) {
      await patchData(`users/${profile.uid}`, {
        ...profile,
        updatedAt: Date.now()
      }).catch(() => {});
    }
    return profile;
  },

  setGameSettings: async ({ targetScore, targetYears, sabotageEnabled, sabotageTypes }) => {
    const pin = getStore().pin;
    if (getStore().round > 1 || getStore().phase !== 'lobby') return;
    const nextSettings = {
      gameMode: 'timeline',
      targetScore: Number(targetScore || getStore().targetScore),
      targetYears: clampTimelineGoal(targetYears || getStore().targetYears),
      sabotageEnabled: typeof sabotageEnabled === 'boolean' ? sabotageEnabled : getStore().sabotageEnabled,
      sabotageTypes: normalizeSabotageTypes(sabotageTypes || getStore().sabotageTypes)
    };

    setStore(nextSettings);
    if (pin && getStore().role === 'host') {
      await patchData(`rooms/${pin}`, { settings: nextSettings });
    }
  },

  hostCreateRoom: async (hostUser = {}) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    const profile = hostUser?.uid
      ? await getStore().loadUserProfile(hostUser)
      : { name: getStore().profileName, avatar: getStore().profileAvatar };
    let hostId = hostUser?.uid || localStorage.getItem('dedicalo_player_id');
    if (!hostId) hostId = `host_${Math.random().toString(36).slice(2, 11)}`;
    persistSession('host', newPin, hostId);

    const hostPlayer = {
      id: hostId,
      authUid: hostUser?.uid || null,
      email: hostUser?.email || null,
      name: profile?.name || hostUser?.displayName || 'Anfitrión',
      avatar: profile?.avatar || hostUser?.photoURL || 'DJ',
      points: 10,
      isHost: true,
      status: 'online',
      lastSeenAt: Date.now(),
      offlineSince: null,
      kicked: false,
      timelineBaseYear: getTimelineBaseYear(hostId),
      timelineYears: [],
      wildcards: 0
    };

    const roomData = {
      phase: 'lobby',
      round: 1,
      settings: {
        gameMode: 'timeline',
        targetScore: getStore().targetScore,
        targetYears: clampTimelineGoal(getStore().targetYears),
        sabotageEnabled: getStore().sabotageEnabled !== false,
        sabotageTypes: normalizeSabotageTypes(getStore().sabotageTypes)
      },
      players: { [hostId]: hostPlayer },
      audio: {
        isPlaying: false,
        isMuted: false,
        playlistUrl: normalizeSpotifyPlaylistUrl(getStore().spotifyPlaylistUrl)
      },
      timelineYears: []
    };

    try {
      // Asegura la sesión (anónima o Google) antes de escribir — si el
      // listener de fondo todavía no terminó de autenticar (frecuente
      // cuando muchos dispositivos entran a la vez desde la misma red),
      // esto reintenta en vez de fallar directo con "permiso denegado".
      await ensureAuthenticated();
      await writeData(`rooms/${newPin}`, roomData);
      armPresenceDisconnect(newPin, hostId);

      setStore({
        pin: newPin,
        role: 'host',
        phase: 'lobby',
        round: 1,
        guestId: hostId,
        players: [hostPlayer],
        gameMode: 'timeline',
        targetScore: roomData.settings.targetScore,
        targetYears: roomData.settings.targetYears,
        spotifyPlaylistUrl: roomData.audio.playlistUrl,
        lastResultType: null,
        lastPointDelta: 0,
        roundAnswers: {},
        revealResults: {},
        timelineYears: []
      });
      getStore()._subscribeToRoom(newPin);
    } catch (error) {
      console.error('Error al crear la sala:', error);
      const message = /auth|permission/i.test(error?.code || error?.message || '')
        ? 'Hay mucha gente conectándose a la vez. Espera unos segundos y vuelve a intentarlo.'
        : 'No pudimos crear la sala. Intentalo otra vez.';
      throw new Error(message, { cause: error });
    }
  },

  hostStartGame: async () => {
    const { pin } = getStore();
    if (!pin) return;

    await patchData(`rooms/${pin}`, { phase: 'countdown', currentQuestion: null });

    setTimeout(() => {
      const state = getStore();
      if (state.pin === pin && state.phase === 'countdown') {
        patchData(`rooms/${pin}`, { phase: 'listen' }).catch((error) => console.error('Error al iniciar ronda:', error));
      }
    }, 3000);
  },



  hostTriggerBlackout: async (questionOverride = null, trackInfo = null) => {
    const { pin, gameMode } = getStore();
    if (!pin) return;

    const pool = MUSIC_QUESTIONS.filter((question) => question.mode === gameMode);
    const questions = pool.length ? pool : MUSIC_QUESTIONS;
    const question = questionOverride || questions[Math.floor(Math.random() * questions.length)];

    await Promise.all([
      patchData(`rooms/${pin}`, {
        phase: 'blackout',
        currentQuestion: question,
        currentTrack: trackInfo || null,
        roundAnswers: null,
        revealResults: null
      }),
      patchData(`rooms/${pin}/audio`, { isPlaying: false })
    ]);
  },

  hostRevealResults: async () => {
    const { pin } = getStore();
    if (!pin) return;

    const room = await readData(`rooms/${pin}`);
    const playersById = room?.players || {};
    const answers = room?.roundAnswers || {};
    const currentQuestion = room?.currentQuestion || {};
    const remoteUpdates = {};
    const revealResults = {};

    const goalYears = room?.settings?.targetYears || getStore().targetYears;

    // ── Bonus por contestar primero ──────────────────────────────────────
    // Gana el punto extra quien ACIERTA antes que nadie en la ronda. Se
    // ordena por la marca del servidor (serverAt); si un cliente viejo no
    // la trae, cae a su hora local para no quedar excluido. Un empate
    // exacto se resuelve por id, para que sea determinista y no dependa
    // del orden en que Firebase devuelva las claves.
    const speedWinnerId = Object.values(playersById)
      .filter((player) => {
        const answer = answers[player.id];
        const isBlocked = player.activeAttack?.type === 'block_vote';
        return !isBlocked && Boolean(answer?.isCorrect);
      })
      .map((player) => ({
        id: player.id,
        t: Number(answers[player.id]?.serverAt ?? answers[player.id]?.at ?? Infinity)
      }))
      .sort((a, b) => (a.t - b.t) || String(a.id).localeCompare(String(b.id)))[0]?.id || null;

    const speedWinnerName = speedWinnerId ? (playersById[speedWinnerId]?.name || null) : null;

    Object.values(playersById).forEach((player) => {
      const answer = answers[player.id];
      // Bloqueado por sabotaje: no puede responder esta ronda, cuenta como
      // fallo aunque hubiera alcanzado a tocar algo antes de enterarse.
      const isBlocked = player.activeAttack?.type === 'block_vote';
      const isCorrect = !isBlocked && Boolean(answer?.isCorrect);
      const isSpeedWinner = isCorrect && player.id === speedWinnerId;
      const speedBonus = isSpeedWinner ? SPEED_BONUS_POINTS : 0;
      const delta = ((!isBlocked && answer) ? (isCorrect ? 5 : -3) : (player.isHost ? 0 : -3)) + speedBonus;
      const nextPoints = clampPoints(Number(player.points || 0) + delta);
      // Robo de año: si acertó y lo saboteó un "year_steal", el año no se le
      // suma a él — se resuelve en el segundo paso, junto con quitarle uno
      // de los que ya tenía.
      const isStolen = isCorrect && player.activeAttack?.type === 'year_steal';

      remoteUpdates[`players/${player.id}/points`] = nextPoints;
      revealResults[player.id] = {
        resultType: isBlocked ? 'blocked' : (isCorrect ? 'success' : 'fail'),
        isCorrect,
        answered: Boolean(answer) && !isBlocked,
        blocked: isBlocked,
        stolen: isStolen,
        stolenBy: isStolen ? (player.activeAttack.from || null) : null,
        delta,
        speedBonus,
        // Nombre del mas rapido en TODOS los resultados, no solo en el del
        // ganador: asi el resto tambien se entera de quien se llevo el
        // punto extra.
        speedWinnerName,
        points: nextPoints
      };

      if (currentQuestion?.answerType === 'timeline-placement' && isCorrect && !isStolen) {
        remoteUpdates[`players/${player.id}/timelineYears`] = normalizeTimelineYears([
          ...(player.timelineYears || []),
          currentQuestion.songYear
        ], goalYears);
      }
    });

    // Robo de año — se resuelve aparte porque mueve progreso entre DOS
    // jugadores a la vez: el atacante nunca respondió esta ronda, pero de
    // todas formas gana un año, y el objetivo pierde uno de los suyos.
    if (currentQuestion?.answerType === 'timeline-placement') {
      Object.values(playersById).forEach((player) => {
        if (player.activeAttack?.type !== 'year_steal') return;
        if (!revealResults[player.id]?.stolen) return;
        const attackerId = player.activeAttack.attackerId;
        const attacker = attackerId ? playersById[attackerId] : null;
        if (!attacker) return;

        const targetYearsLeft = normalizeTimelineYears(player.timelineYears || [], goalYears).slice(0, -1);
        remoteUpdates[`players/${player.id}/timelineYears`] = targetYearsLeft;

        remoteUpdates[`players/${attackerId}/timelineYears`] = normalizeTimelineYears([
          ...(attacker.timelineYears || []),
          currentQuestion.songYear
        ], goalYears);
      });
    }

    const nextPlayers = sortPlayers(Object.values(playersById).map((player) => ({
      ...player,
      points: remoteUpdates[`players/${player.id}/points`] ?? player.points,
      timelineYears: remoteUpdates[`players/${player.id}/timelineYears`] ?? normalizeTimelineYears(player.timelineYears || [], goalYears)
    })));
    const targetYears = clampTimelineGoal(room?.settings?.targetYears || getStore().targetYears);
    const timelineComplete = nextPlayers.some((player) => getTimelineProgress(player) >= targetYears);
    remoteUpdates.phase = timelineComplete ? 'final' : 'result';
    remoteUpdates.revealResults = revealResults;
    remoteUpdates.currentQuestion = timelineComplete ? null : room.currentQuestion || null;

    await patchData(`rooms/${pin}`, remoteUpdates);

    const ownResult = revealResults[getStore().guestId] || null;
    setStore({
      phase: remoteUpdates.phase,
      players: nextPlayers,
      revealResults,
      lastResultType: ownResult?.resultType || getStore().lastResultType,
      lastPointDelta: ownResult?.delta || 0
    });
  },

  hostNextRound: async () => {
    const { pin, round, players } = getStore();
    if (!pin) return;

    const remoteUpdates = {
      round: round + 1,
      currentQuestion: null,
      currentTrack: null,
      roundAnswers: null,
      revealResults: null,
      phase: 'countdown'
    };

    // Un sabotaje solo dura la ronda en la que se lanzo.
    players.forEach((player) => {
      if (player.activeAttack) {
        remoteUpdates[`players/${player.id}/activeAttack`] = null;
      }
    });

    await patchData(`rooms/${pin}`, remoteUpdates);

    setTimeout(() => {
      const state = getStore();
      if (state.pin === pin && state.round === round + 1 && state.phase === 'countdown') {
        patchData(`rooms/${pin}`, { phase: 'listen' }).catch((error) => console.error('Error al continuar la ronda:', error));
      }
    }, 3000);
  },

  // Sabotaje: solo se puede lanzar durante la fase "listen" (antes de que
  // aparezca la pregunta), así el objetivo entra a su ronda con los años
  // revueltos visualmente en vez de que le cambien las reglas a mitad de
  // respuesta. Cuesta puntos, nunca años — no puede decidir la partida por
  // sí solo, solo complica el ranking del rival por una ronda.
  attackOpponent: async (targetPlayerId, attackTypeId = 'block_vote') => {
    const { pin, guestId, players, phase, sabotageEnabled, sabotageTypes } = getStore();
    if (!pin || !guestId) return;
    // El sabotaje es opcional: si esta sala lo tiene apagado, se rechaza
    // aqui y no solo escondiendo el boton — asi una pestaña vieja o un
    // estado desincronizado tampoco puede colar un ataque.
    if (sabotageEnabled === false) {
      throw new Error('El anfitrion desactivo el sabotaje en esta partida.');
    }
    if (phase !== 'listen') {
      throw new Error('Solo puedes sabotear antes de que salga la pregunta.');
    }

    const allowed = normalizeSabotageTypes(sabotageTypes);
    if (!allowed.includes(attackTypeId)) {
      throw new Error('Ese tipo de sabotaje no esta permitido en esta partida.');
    }

    const me = players.find((player) => player.id === guestId);
    const target = players.find((player) => player.id === targetPlayerId);
    const attackType = ATTACK_TYPES[attackTypeId] || ATTACK_TYPES.block_vote;
    if (!me || !target || me.id === target.id) return;
    if (getPlayerPresence(target).status !== 'online') {
      throw new Error('Ese jugador no esta disponible ahora mismo.');
    }
    if (target.activeAttack) {
      throw new Error('Ya esta saboteado en esta ronda.');
    }
    if (Number(me.points || 0) < ATTACK_COST) {
      throw new Error(`Necesitas ${ATTACK_COST} puntos para sabotear.`);
    }

    const nextPoints = clampPoints(Number(me.points || 0) - ATTACK_COST);
    await patchData(`rooms/${pin}`, {
      [`players/${targetPlayerId}/activeAttack`]: {
        type: attackType.id,
        title: attackType.name,
        description: attackType.description,
        from: me.name || 'Un rival',
        // Se guarda junto al nombre (no se busca por attackerId al mostrar)
        // para que la pantalla de ataque siga mostrando el avatar correcto
        // aunque el atacante cambie el suyo después o se desconecte.
        fromAvatar: me.avatar || null,
        attackerId: me.id,
        round: getStore().round,
        at: Date.now()
      },
      [`players/${guestId}/points`]: nextPoints
    });
  },

  // Único otro uso de los puntos: cambiarlos por progreso real hacia la
  // meta. No apunta a nadie ni depende de acertar una pregunta — por eso se
  // permite en cualquier momento de la partida excepto durante una ronda ya
  // en marcha (fase "blackout"), para no tentar a nadie a comprar la
  // respuesta a mitad de pregunta.
  redeemPointsForYear: async () => {
    const { pin, guestId, players, phase, targetYears } = getStore();
    if (!pin || !guestId) return;
    if (phase === 'blackout') {
      throw new Error('Espera a que termine esta ronda para canjear puntos.');
    }

    const me = players.find((player) => player.id === guestId);
    if (!me) return;
    if (Number(me.points || 0) < REDEEM_YEAR_COST) {
      throw new Error(`Necesitas ${REDEEM_YEAR_COST} puntos para canjear una canción.`);
    }

    const nextPoints = clampPoints(Number(me.points || 0) - REDEEM_YEAR_COST);
    const nextWildcards = Number(me.wildcards || 0) + 1;
    const nextPlayer = { ...me, points: nextPoints, wildcards: nextWildcards };
    const remoteUpdates = {
      [`players/${guestId}/points`]: nextPoints,
      [`players/${guestId}/wildcards`]: nextWildcards
    };

    if (getTimelineProgress(nextPlayer) >= clampTimelineGoal(targetYears)) {
      remoteUpdates.phase = 'final';
      remoteUpdates.currentQuestion = null;
    }

    await patchData(`rooms/${pin}`, remoteUpdates);
  },

  hostEndGame: async () => {
    const pin = getStore().pin;
    if (!pin) return;

    await Promise.all([
      patchData(`rooms/${pin}`, { phase: 'final', currentQuestion: null }),
      patchData(`rooms/${pin}/audio`, { isPlaying: false })
    ]);
  },

  hostCloseRoom: () => {
    const { pin, roomSubscription } = getStore();
    if (typeof roomSubscription === 'function') roomSubscription();
    if (pin) {
      Promise.all([
        patchData(`rooms/${pin}`, { phase: 'final', currentQuestion: null, currentTrack: null }),
        patchData(`rooms/${pin}/audio`, { isPlaying: false })
      ]).catch((error) => console.error('Error al cerrar la sala:', error));
    }
    clearPersistedSession();
    setStore({
      role: null,
      pin: null,
      guestId: null,
      players: [],
      phase: 'lobby',
      currentQuestion: null,
      currentTrack: null,
      lastResultType: null,
      lastPointDelta: 0,
      roundAnswers: {},
      revealResults: {},
      timelineYears: [],
      roomSubscription: null
    });
  },

  // "Jugar otra vez" desde el ranking final — vuelve al lobby con el MISMO
  // pin y el mismo grupo (nadie tiene que volver a escanear el QR), pero
  // con el progreso de todos en cero. El anfitrión puede tocar ronda 1 de
  // la sala normal (fija el estilo de playlist y la meta de años) antes de
  // arrancar de nuevo.
  hostRestartGame: async () => {
    const { pin, role, players } = getStore();
    if (role !== 'host' || !pin) return;

    const remoteUpdates = {
      phase: 'lobby',
      round: 1,
      currentQuestion: null,
      currentTrack: null,
      roundAnswers: null,
      revealResults: null,
      timelineYears: []
    };
    players.forEach((player) => {
      remoteUpdates[`players/${player.id}/points`] = 10;
      remoteUpdates[`players/${player.id}/timelineYears`] = [];
      remoteUpdates[`players/${player.id}/wildcards`] = 0;
      remoteUpdates[`players/${player.id}/activeAttack`] = null;
    });

    await Promise.all([
      patchData(`rooms/${pin}`, remoteUpdates),
      patchData(`rooms/${pin}/audio`, { isPlaying: false })
    ]);

    setStore({
      phase: 'lobby',
      round: 1,
      currentQuestion: null,
      currentTrack: null,
      roundAnswers: {},
      revealResults: {},
      timelineYears: [],
      lastResultType: null,
      lastPointDelta: 0
    });
  },

  updatePlayerProfile: async ({ name, avatar }) => {
    const { pin, guestId, players, profileUid } = getStore();

    const currentPlayer = players.find((player) => player.id === guestId) || {};
    const cleanName = String(name || currentPlayer.name || 'Jugador').trim().slice(0, 18) || 'Jugador';
    const cleanAvatar = String(avatar || currentPlayer.avatar || 'DJ').trim().slice(0, 80) || 'DJ';
    const authUid = currentPlayer.authUid || profileUid;

    persistProfile({ uid: authUid, name: cleanName, avatar: cleanAvatar });

    if (authUid) {
      await patchData(`users/${authUid}`, {
        name: cleanName,
        avatar: cleanAvatar,
        updatedAt: Date.now()
      }).catch(() => {});
    }

    if (pin && guestId) {
      await patchData(`rooms/${pin}/players/${guestId}`, {
        name: cleanName,
        avatar: cleanAvatar,
        profileUpdatedAt: Date.now()
      });
    }

    setStore({
      profileName: cleanName,
      profileAvatar: cleanAvatar,
      profileUid: authUid || profileUid,
      guestName: cleanName,
      guestAvatar: cleanAvatar,
      players: players.map((player) => (
        player.id === guestId ? { ...player, name: cleanName, avatar: cleanAvatar } : player
      ))
    });
  },

  guestJoinRoom: async (enteredPin, guestName, guestAvatar, authUser = null) => {
    const cleanPin = String(enteredPin || '').replace(/\D/g, '').slice(0, 4);

    // Igual que en hostCreateRoom: si la sesión anónima todavía no terminó
    // de armarse (carga de red, muchos dispositivos a la vez), esto
    // reintenta antes de leer la sala en vez de fallar con un mensaje que
    // parece "PIN incorrecto" sin serlo.
    try {
      await ensureAuthenticated();
    } catch (error) {
      throw new Error('Hay mucha gente conectándose a la vez. Espera unos segundos y vuelve a intentarlo.', { cause: error });
    }

    let room;
    try {
      room = await readData(`rooms/${cleanPin}`);
    } catch (error) {
      throw new Error('No pudimos conectar con la sala. Revisa tu conexión e intenta de nuevo.', { cause: error });
    }

    if (!room) {
      throw new Error('PIN incorrecto o sala no existe.');
    }

    const registeredProfile = authUser?.uid ? await getStore().loadUserProfile(authUser) : null;
    let guestId = authUser?.uid || localStorage.getItem('dedicalo_player_id');
    if (!guestId) guestId = `guest_${Math.random().toString(36).slice(2, 11)}`;
    const existingPlayer = room.players?.[guestId];

    // La partida ya empezó y esta persona todavía no es jugador de esta
    // sala: en vez de bloquearla, se manda un pedido de ingreso que el
    // anfitrión acepta o rechaza desde el juego — así sí puede sumarse a
    // mitad de partida. Si ya era jugador (se le cortó y vuelve a entrar),
    // no hace falta pedir permiso de nuevo.
    if (room.phase && room.phase !== 'lobby' && !existingPlayer) {
      try {
        const nextName = cleanProfileName(registeredProfile?.name || guestName, 'Invitado');
        const nextAvatar = cleanProfileAvatar(registeredProfile?.avatar || guestAvatar, 'DJ');
        persistSession('guest', cleanPin, guestId);
        await writeData(`rooms/${cleanPin}/joinRequests/${guestId}`, {
          id: guestId,
          authUid: authUser?.uid || null,
          email: authUser?.email || null,
          name: nextName,
          avatar: nextAvatar,
          requestedAt: Date.now(),
          status: 'pending'
        });
        setStore({
          role: 'guest',
          pin: cleanPin,
          guestId,
          guestName: nextName,
          guestAvatar: nextAvatar,
          pendingJoinStatus: 'pending'
        });
        getStore()._subscribeToJoinRequest(cleanPin, guestId);
      } catch (error) {
        console.error('Error al pedir ingreso a la sala:', error);
        throw new Error('No pudimos enviar tu pedido de ingreso. Intentalo otra vez.', { cause: error });
      }
      return;
    }

    try {
      persistSession('guest', cleanPin, guestId);

      // Restore existing data if any, else create a new player
      const nextName = cleanProfileName(existingPlayer?.name || registeredProfile?.name || guestName, 'Invitado');
      const nextAvatar = cleanProfileAvatar(existingPlayer?.avatar || registeredProfile?.avatar || guestAvatar, 'DJ');
      const newPlayer = {
        id: guestId,
        authUid: authUser?.uid || existingPlayer?.authUid || null,
        email: authUser?.email || existingPlayer?.email || null,
        name: nextName,
        avatar: nextAvatar,
        points: existingPlayer ? existingPlayer.points : 10,
        isHost: false,
        status: 'online',
        lastSeenAt: Date.now(),
        offlineSince: null,
        kicked: false,
        timelineBaseYear: existingPlayer ? existingPlayer.timelineBaseYear : getTimelineBaseYear(guestId),
        timelineYears: existingPlayer ? (existingPlayer.timelineYears || []) : [],
        wildcards: existingPlayer ? Number(existingPlayer.wildcards || 0) : 0
      };

      await writeData(`rooms/${cleanPin}/players/${guestId}`, newPlayer);
      if (authUser?.uid) {
        await patchData(`users/${authUser.uid}`, {
          uid: authUser.uid,
          email: authUser.email || '',
          name: nextName,
          avatar: nextAvatar,
          updatedAt: Date.now()
        }).catch(() => {});
      } else {
        persistProfile({ name: nextName, avatar: nextAvatar });
      }
      armPresenceDisconnect(cleanPin, guestId);

      setStore({
        role: 'guest',
        pin: cleanPin,
        guestId,
        guestAvatar: newPlayer.avatar,
        guestName: newPlayer.name,
        profileName: newPlayer.name,
        profileAvatar: newPlayer.avatar,
        profileUid: authUser?.uid || getStore().profileUid,
        gameMode: 'timeline',
        targetScore: Number(room.settings?.targetScore || 70),
        targetYears: clampTimelineGoal(room.settings?.targetYears || TIMELINE_GOAL_YEARS),
        sabotageEnabled: room.settings?.sabotageEnabled !== false,
        sabotageTypes: normalizeSabotageTypes(room.settings?.sabotageTypes),
        lastResultType: null,
        lastPointDelta: 0,
        timelineYears: room.timelineYears || []
      });
      getStore()._subscribeToRoom(cleanPin);
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      throw new Error('No pudimos unirte a la sala. Intentalo otra vez.', { cause: error });
    }
  },

  guestAnswer: async (answerInput) => {
    const { pin, guestId, guestName, round } = getStore();
    if (!pin || !guestId) return;
    const isTimelineAnswer = typeof answerInput === 'object';

    const answer = {
      playerId: guestId,
      playerName: guestName || getStore().players.find((player) => player.id === guestId)?.name || 'Jugador',
      isCorrect: Boolean(isTimelineAnswer ? answerInput.isCorrect : answerInput),
      ...(isTimelineAnswer ? { timelineSlot: answerInput.timelineSlot } : {}),
      round,
      at: Date.now(),
      // El bonus por contestar primero se decide con la hora del SERVIDOR,
      // no con Date.now() del movil: los relojes de los telefonos van
      // desviados entre si (a veces minutos), asi que ordenar por hora
      // local regalaria el bonus siempre al mismo aparato.
      serverAt: serverTimestamp()
    };
    await writeData(`rooms/${pin}/roundAnswers/${guestId}`, answer);
    setStore({
      roundAnswers: { ...getStore().roundAnswers, [guestId]: answer }
    });
  },

  hostCancelRound: async () => {
    const { pin } = getStore();
    if (!pin) return;
    await patchData(`rooms/${pin}`, { phase: 'lobby', currentQuestion: null, roundAnswers: null, revealResults: null });
  },

  guestGoToLobby: () => {
    setStore({ phase: 'lobby', lastResultType: null, lastPointDelta: 0 });
  },

  guestLeaveRoom: () => {
    const { pin, guestId, roomSubscription } = getStore();
    if (typeof roomSubscription === 'function') roomSubscription();
    if (pin && guestId) {
      deleteData(`rooms/${pin}/players/${guestId}`).catch((error) => console.error('Error al salir de la sala:', error));
    }
    clearPersistedSession();
    setStore({
      role: null,
      pin: null,
      guestId: null,
      guestAvatar: null,
      guestName: null,
      phase: 'lobby',
      currentTrack: null,
      lastResultType: null,
      lastPointDelta: 0,
      roundAnswers: {},
      revealResults: {},
      timelineYears: [],
      roomSubscription: null
    });
  },

  clearRoomError: () => setStore({ roomError: null }),

  // Comprueba que un PIN corresponde a una sala real ANTES de dejar avanzar
  // al invitado por el resto del formulario. Sin esto, alguien con un PIN
  // mal escrito llenaba nombre y personaje y recién se enteraba del error
  // al final, teniendo que rehacer todo.
  // Devuelve { ok: true } o { ok: false, message } — nunca lanza, para que
  // la pantalla solo tenga que decidir si muestra el aviso.
  checkRoomPin: async (enteredPin) => {
    const cleanPin = String(enteredPin || '').replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) {
      return { ok: false, message: 'El PIN tiene que tener 4 dígitos.' };
    }

    try {
      await ensureAuthenticated();
    } catch {
      return { ok: false, message: 'Hay mucha gente conectándose a la vez. Espera unos segundos y vuelve a intentarlo.' };
    }

    let room;
    try {
      room = await readData(`rooms/${cleanPin}`);
    } catch {
      return { ok: false, message: 'No pudimos comprobar el PIN. Revisa tu conexión e inténtalo otra vez.' };
    }

    if (!room) {
      return { ok: false, message: `No existe ninguna sala con el PIN ${cleanPin}. Revísalo con el anfitrión.` };
    }
    return { ok: true, phase: room.phase || 'lobby' };
  },

  // Se llama al volver a primer plano (pantalla desbloqueada, app recuperada
  // de una llamada, wifi que vuelve). Re-marca al jugador como online y
  // vuelve a armar el onDisconnect, porque cada conexión de socket nueva
  // pierde el handler de la anterior.
  markPresenceOnline: () => {
    const { pin, guestId } = getStore();
    if (!pin || !guestId) return;
    patchData(`rooms/${pin}/players/${guestId}`, { status: 'online', lastSeenAt: Date.now(), offlineSince: null, kicked: false }).catch(() => {});
    armPresenceDisconnect(pin, guestId);
  },

  // Reanuda una sesión guardada en localStorage tras un reinicio completo de
  // la pestaña (no solo un backgrounding, que ya cubre markPresenceOnline).
  // Devuelve true si había una sala válida y se restauró.
  resumeSession: async () => {
    const pin = localStorage.getItem('dedicalo_room_pin');
    const playerId = localStorage.getItem('dedicalo_player_id');
    const role = localStorage.getItem('dedicalo_role');
    if (!pin || !playerId || !role) return false;

    try {
      const room = await readData(`rooms/${pin}`);
      const player = room?.players?.[playerId];
      if (!room || !player || room.phase === 'final') {
        clearPersistedSession();
        return false;
      }

      await patchData(`rooms/${pin}/players/${playerId}`, { status: 'online', lastSeenAt: Date.now(), offlineSince: null, kicked: false });
      armPresenceDisconnect(pin, playerId);

      setStore({
        role,
        pin,
        guestId: playerId,
        guestAvatar: player.avatar,
        guestName: player.name,
        gameMode: 'timeline',
        targetScore: Number(room.settings?.targetScore || 70),
        targetYears: clampTimelineGoal(room.settings?.targetYears || TIMELINE_GOAL_YEARS),
        sabotageEnabled: room.settings?.sabotageEnabled !== false,
        sabotageTypes: normalizeSabotageTypes(room.settings?.sabotageTypes),
        lastResultType: null,
        lastPointDelta: 0,
        timelineYears: room.timelineYears || []
      });
      getStore()._subscribeToRoom(pin);
      return true;
    } catch (error) {
      console.error('No se pudo reanudar la sesión:', error);
      return false;
    }
  },

  togglePlay: () => {
    const { pin, role, isAudioPlaying } = getStore();
    const playing = !isAudioPlaying;
    setStore({ isAudioPlaying: playing });

    if (role === 'host' && pin) {
      patchData(`rooms/${pin}/audio`, { isPlaying: playing }).catch((error) => console.error('Error al cambiar audio:', error));
    }
  },

  toggleMute: () => {
    const { pin, role, isAudioMuted } = getStore();
    const muted = !isAudioMuted;
    setStore({ isAudioMuted: muted });

    if (role === 'host' && pin) {
      patchData(`rooms/${pin}/audio`, { isMuted: muted }).catch((error) => console.error('Error al cambiar mute:', error));
    }
  },

  setAudioPlaying: (playing) => {
    const { pin, role } = getStore();
    setStore({ isAudioPlaying: Boolean(playing) });

    if (role === 'host' && pin) {
      patchData(`rooms/${pin}/audio`, { isPlaying: Boolean(playing) }).catch((error) => console.error('Error al sincronizar audio:', error));
    }
  },

  getRanking: () => sortPlayers(getStore().players),

  _subscribeToRoom: (pin) => {
    const existingSubscription = getStore().roomSubscription;
    if (typeof existingSubscription === 'function') existingSubscription();

    let knownPlayerIds = null;

    const roomRef = ref(database, `rooms/${pin}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      const current = getStore();

      if (!data) {
        if (current.role === 'guest') {
          getStore().guestLeaveRoom();
          setStore({ roomError: 'La sala ha sido cerrada por el anfitrión.' });
        } else if (current.role === 'host') {
          setStore({ roomError: null });
        }
        return;
      }

      const newPlayerIds = new Set(Object.keys(data.players || {}));
      if (knownPlayerIds !== null) {
        const lostIds = [...knownPlayerIds].filter((id) => !newPlayerIds.has(id));
        if (lostIds.length > 0) {
          const lostName = current.players.find((p) => p.id === lostIds[0])?.name || 'Un jugador';
          setStore({ lastDisconnectedPlayer: lostName });
        }
      }
      knownPlayerIds = newPlayerIds;

      const remoteRound = Number(data.round || 1);
      const remotePhase = data.phase || 'lobby';
      const now = Date.now();
      const normalizedPlayers = data.players
        ? sortPlayers(Object.values(data.players).map((player) => {
          const presence = getPlayerPresence(player, now);
          if (current.role === 'host' && presence.status === 'kicked' && player.status === 'offline') {
            patchData(`rooms/${pin}/players/${player.id}`, { status: 'kicked', kicked: true }).catch(() => {});
          }
          return {
            ...player,
            status: presence.status === 'kicked' ? 'kicked' : player.status,
            reconnectRemainingMs: presence.remainingMs,
            timelineBaseYear: Number(player.timelineBaseYear || getTimelineBaseYear(player.id))
          };
        }))
        : [];
      const keepGuestResult = current.role === 'guest'
        && current.phase === 'result'
        && current.lastResultType
        && current.round === remoteRound
        && remotePhase === 'lobby';

      setStore({
        phase: keepGuestResult ? 'result' : remotePhase,
        round: remoteRound,
        gameMode: 'timeline',
        targetScore: Number(data.settings?.targetScore || data.targetScore || 70),
        targetYears: clampTimelineGoal(data.settings?.targetYears || TIMELINE_GOAL_YEARS),
        sabotageEnabled: data.settings?.sabotageEnabled !== false,
        sabotageTypes: normalizeSabotageTypes(data.settings?.sabotageTypes),
        players: normalizedPlayers,
        currentQuestion: data.currentQuestion || null,
        currentTrack: data.currentTrack || null,
        roundAnswers: data.roundAnswers || {},
        revealResults: data.revealResults || {},
        timelineYears: data.timelineYears || [],
        joinRequests: data.joinRequests ? Object.values(data.joinRequests) : []
      });

      if (data.audio) {
        setStore({
          isAudioPlaying: Boolean(data.audio.isPlaying),
          isAudioMuted: Boolean(data.audio.isMuted),
          spotifyPlaylistUrl: normalizeSpotifyPlaylistUrl(data.audio.playlistUrl || data.audio.playlistId)
        });
      }
    }, (error) => {
      console.error('Error en la suscripción de sala:', error);
    });

    setStore({ roomSubscription: unsubscribe });
  },

  // Escucha SOLO el pedido de ingreso propio mientras se espera respuesta
  // del anfitrión — a propósito no usa _subscribeToRoom todavía: esta
  // persona no es jugador de la sala aún, así que no debe ver pantallas de
  // juego ni el estado de la ronda en curso.
  _subscribeToJoinRequest: (pin, guestId) => {
    const existingSubscription = getStore().joinRequestSubscription;
    if (typeof existingSubscription === 'function') existingSubscription();

    const reqRef = ref(database, `rooms/${pin}/joinRequests/${guestId}`);
    const unsubscribe = onValue(reqRef, async (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        // El pedido desapareció: si ya existe como jugador, el anfitrión lo
        // aceptó y creó su ficha — completar el ingreso normal. Si no,
        // fue rechazado y limpiado, o la sala cerró.
        let player = null;
        try {
          player = await readData(`rooms/${pin}/players/${guestId}`);
        } catch {
          // ignore — se trata como "no es jugador" más abajo
        }

        if (player) {
          const currentUnsub = getStore().joinRequestSubscription;
          if (currentUnsub) currentUnsub();
          armPresenceDisconnect(pin, guestId);
          setStore({
            role: 'guest',
            pin,
            guestId,
            guestAvatar: player.avatar,
            guestName: player.name,
            profileName: player.name,
            profileAvatar: player.avatar,
            gameMode: 'timeline',
            lastResultType: null,
            lastPointDelta: 0,
            pendingJoinStatus: null,
            joinRequestSubscription: null
          });
          getStore()._subscribeToRoom(pin);
        } else {
          setStore({ pendingJoinStatus: 'expired' });
        }
        return;
      }

      setStore({ pendingJoinStatus: data.status === 'denied' ? 'denied' : 'pending' });
    }, (error) => {
      console.error('Error en la suscripción de pedido de ingreso:', error);
    });

    setStore({ joinRequestSubscription: unsubscribe });
  },

  // El invitado cancela su propio pedido (se arrepiente, o quiere reintentar
  // tras un rechazo) y vuelve a la pantalla de entrada limpia.
  cancelJoinRequest: async () => {
    const { pin, guestId, joinRequestSubscription } = getStore();
    if (typeof joinRequestSubscription === 'function') joinRequestSubscription();
    if (pin && guestId) {
      await deleteData(`rooms/${pin}/joinRequests/${guestId}`).catch(() => {});
    }
    clearPersistedSession();
    setStore({
      role: null,
      pin: null,
      guestId: null,
      pendingJoinStatus: null,
      joinRequestSubscription: null
    });
  },

  // El anfitrión acepta a alguien que pidió entrar a mitad de partida: crea
  // su ficha de jugador (arranca con la misma base que un jugador nuevo) y
  // borra el pedido — eso es lo que el listener del invitado detecta como
  // "me aceptaron".
  approveJoinRequest: async (requestId) => {
    const { pin, joinRequests } = getStore();
    if (!pin) return;
    const request = joinRequests.find((entry) => entry.id === requestId);
    if (!request) return;

    try {
      const room = await readData(`rooms/${pin}`);
      const existingPlayer = room?.players?.[requestId];
      const nextName = cleanProfileName(existingPlayer?.name || request.name, 'Invitado');
      const nextAvatar = cleanProfileAvatar(existingPlayer?.avatar || request.avatar, 'DJ');
      const newPlayer = {
        id: requestId,
        authUid: request.authUid || existingPlayer?.authUid || null,
        email: request.email || existingPlayer?.email || null,
        name: nextName,
        avatar: nextAvatar,
        points: existingPlayer ? existingPlayer.points : 10,
        isHost: false,
        status: 'online',
        lastSeenAt: Date.now(),
        offlineSince: null,
        kicked: false,
        timelineBaseYear: existingPlayer ? existingPlayer.timelineBaseYear : getTimelineBaseYear(requestId),
        timelineYears: existingPlayer ? (existingPlayer.timelineYears || []) : [],
        // Entra con la partida en marcha: sin esto arrancaria en 1/12
        // mientras el resto puede llevar 8/12, sin ninguna opcion real.
        wildcards: existingPlayer
          ? Number(existingPlayer.wildcards || 0)
          : lateJoinWildcards(Object.values(room?.players || {}))
      };
      await writeData(`rooms/${pin}/players/${requestId}`, newPlayer);
      await deleteData(`rooms/${pin}/joinRequests/${requestId}`);
    } catch (error) {
      console.error('Error al aceptar el pedido de ingreso:', error);
      throw new Error('No pudimos aceptar a ese jugador. Intentalo otra vez.', { cause: error });
    }
  },

  // El anfitrión rechaza el pedido — se marca como rechazado (para que el
  // invitado que está escuchando lo vea) y se borra unos segundos después.
  denyJoinRequest: async (requestId) => {
    const { pin } = getStore();
    if (!pin) return;
    try {
      await patchData(`rooms/${pin}/joinRequests/${requestId}`, { status: 'denied' });
      window.setTimeout(() => {
        deleteData(`rooms/${pin}/joinRequests/${requestId}`).catch(() => {});
      }, 6000);
    } catch (error) {
      console.error('Error al rechazar el pedido de ingreso:', error);
    }
  }
}));

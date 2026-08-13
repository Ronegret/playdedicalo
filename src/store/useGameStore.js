import { create } from 'zustand';
import { ref, onValue, onDisconnect, get, set, update, remove, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';

// Cuánto tiempo se muestra a un jugador como "Reconectando" antes de darlo
// por perdido en la UI. No lo saca de la sala — solo cambia el indicador de
// 🟡 a 🔴 — así que volver dentro de este margen (llamada, pantalla
// bloqueada, cambio de app) no le hace perder su sitio ni su progreso.
export const RECONNECT_GRACE_MS = 30000;

const SESSION_STORAGE_KEYS = ['dedicalo_player_id', 'dedicalo_room_pin', 'dedicalo_role'];

function persistSession(role, pin, playerId) {
  localStorage.setItem('dedicalo_player_id', playerId);
  localStorage.setItem('dedicalo_room_pin', pin);
  localStorage.setItem('dedicalo_role', role);
}

function clearPersistedSession() {
  SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
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

// Cuesta puntos, no progreso: el sabotaje nunca toca los años ya conseguidos
// de nadie, solo le complica la próxima ronda al objetivo. Así se mantiene
// el filo competitivo sin arriesgar la condición de victoria de nadie.
export const ATTACK_COST = 8;
export const ATTACK_TYPES = {
  reverse_order: {
    id: 'reverse_order',
    icon: 'swap_vert',
    name: 'Modo espejo',
    short: 'Ruta de mayor a menor',
    description: 'Sus discos se muestran al reves durante una ronda.'
  },
  mirror_year: {
    id: 'mirror_year',
    icon: 'flip',
    name: 'Ano remix',
    short: 'Digitos cambiados',
    description: 'Los anos se ven con los digitos revueltos para distraer.'
  },
  slippery_tap: {
    id: 'slippery_tap',
    icon: 'ads_click',
    name: 'Toque falso',
    short: 'El boton vecino responde',
    description: 'Al tocar un hueco, la seleccion se puede mover al hueco de al lado.'
  }
};

export const TIMELINE_GOAL_YEARS = 12;
export const MIN_TIMELINE_GOAL_YEARS = 6;
export const MAX_TIMELINE_GOAL_YEARS = 20;
export const DEDICALO_PLAYLISTS = [
  { id: 'reggaeton-historia', icon: 'local_fire_department', name: 'REGGAETON', mood: 'Clasicos para reconocer al instante.', url: 'https://open.spotify.com/playlist/64B6t8la0Rf3JTTaBXiNcm' },
  { id: 'hits-todos-los-tiempos', icon: 'public', name: 'HITS', mood: 'Exitos para todos los gustos.', url: 'https://open.spotify.com/playlist/0f3YRJO2HyZTpCLCVxzBt0' },
  { id: 'rock-latino', icon: 'electric_bolt', name: 'ROCK LATINO', mood: 'Guitarras, nostalgia y coros.', url: 'https://open.spotify.com/playlist/07iEAd20wfnMh8VfbmovYG' },
  { id: 'mix-latino', icon: 'shuffle', name: 'MIX LATINO', mood: 'Rondas rapidas y energia alta.', url: 'https://open.spotify.com/playlist/2UBikaEIZWV9LOAjE0dBgx' },
  { id: 'bailable-todos-los-tiempos', icon: 'nightlife', name: 'BAILABLE', mood: 'Facil de reconocer y bailar.', url: 'https://open.spotify.com/playlist/7FnGVaOj5s9JvAUtvZENfC' },
  { id: 'romanticos', icon: 'favorite', name: 'ROMANTICAS', mood: 'Baladas y recuerdos.', url: 'https://open.spotify.com/playlist/3dmrZtJOYx1naGoLtyHFOk' },
  { id: 'perreo-clasico', icon: 'whatshot', name: 'PERREO CLASICO', mood: 'Perreo clasico de memoria colectiva.', url: 'https://open.spotify.com/playlist/2aatYbsZb0ZiY3aQjcVSw2' },
  { id: 'temazos-espanoles', icon: 'stadium', name: 'TEMAZOS ES', mood: 'Musica espanola de siempre.', url: 'https://open.spotify.com/playlist/7bsAMCUlTcMTGzG1RzxWTX' },
  { id: 'rock-ska-espanolisimo', icon: 'music_note', name: 'ROCK Y SKA', mood: 'Rock, ska y clasicos con identidad.', url: 'https://open.spotify.com/playlist/6ZcRMfq1UCg0QzC2KkopvV' },
  { id: 'de-to2', icon: 'apps', name: 'DE TODO', mood: 'Mezcla abierta para cualquier grupo.', url: 'https://open.spotify.com/playlist/0Pn8mtBmo8HDfuKiky5tNj' },
  { id: 'fiestas-en-el-pueblo', icon: 'celebration', name: 'FIESTA PUEBLO', mood: 'Fiesta para cantar y reconocer rapido.', url: 'https://open.spotify.com/playlist/5kkHb7jc3WocICRywvY6Yz' },
  { id: 'just-go', icon: 'rocket_launch', name: 'JUST GO', mood: 'Energia directa y ritmo alto.', url: 'https://open.spotify.com/playlist/0yUgOnkSswjzWwNxI2QjNC' }
];
export const DEFAULT_SPOTIFY_PLAYLIST_URL = DEDICALO_PLAYLISTS[0].url;

export const GAME_MODES = {
  timeline: {
    id: 'timeline',
    name: 'ANOS LOCOS',
    short: 'Ordena canciones por ano',
    description: `Cada jugador arma su propia ruta musical y gana quien completa primero ${TIMELINE_GOAL_YEARS} canciones.`,
    rhythm: 'Memoria, intuicion y nostalgia: coloca cada cancion donde crees que pertenece.'
  }
};


// These questions are fallbacks shown only when no Spotify track is available.
// All answers must be objectively correct for any song/situation.
const MUSIC_QUESTIONS = [
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Anos Locos', text: 'Donde encaja esta cancion en tu ruta de anos?', timelineYears: [2000], songYear: 2014, options: ['0', '1'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Anos Locos', text: 'Donde pondrias esta cancion?', timelineYears: [1995, 2005], songYear: 2001, options: ['0', '1', '2'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Anos Locos', text: 'Escucha y colocala por ano.', timelineYears: [1990, 2000, 2010], songYear: 2020, options: ['0', '1', '2', '3'], correct: 3 }
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
    const yearsA = getCombinedTimelineYears(a).length;
    const yearsB = getCombinedTimelineYears(b).length;
    if (yearsB !== yearsA) {
      return yearsB - yearsA;
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



export const useGameStore = create((setStore, getStore) => ({
  role: null,
  pin: null,
  players: [],
  phase: 'lobby',
  round: 1,
  gameMode: 'timeline',
  targetScore: 70,
  targetYears: TIMELINE_GOAL_YEARS,
  currentQuestion: null,
  guestId: null,
  guestAvatar: null,
  guestName: null,
  lastResultType: null,
  lastPointDelta: 0,
  roundAnswers: {},
  revealResults: {},
  roomError: null,
  currentTrack: null,
  timelineYears: [],
  roomSubscription: null,
  lastDisconnectedPlayer: null,

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

  setGameSettings: async ({ targetScore, targetYears }) => {
    const pin = getStore().pin;
    if (getStore().round > 1 || getStore().phase !== 'lobby') return;
    const nextSettings = {
      gameMode: 'timeline',
      targetScore: Number(targetScore || getStore().targetScore),
      targetYears: clampTimelineGoal(targetYears || getStore().targetYears)
    };

    setStore(nextSettings);
    if (pin && getStore().role === 'host') {
      await patchData(`rooms/${pin}`, { settings: nextSettings });
    }
  },

  hostCreateRoom: async (hostUser = {}) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    let hostId = localStorage.getItem('dedicalo_player_id');
    if (!hostId) {
      hostId = hostUser?.uid || `host_${Math.random().toString(36).slice(2, 11)}`;
    }
    persistSession('host', newPin, hostId);

    const hostPlayer = {
      id: hostId,
      name: hostUser?.displayName || 'Anfitrion',
      avatar: hostUser?.photoURL || 'La Consola Maestra',
      points: 10,
      isHost: true,
      status: 'online',
      lastSeenAt: Date.now(),
      offlineSince: null,
      kicked: false,
      timelineBaseYear: getTimelineBaseYear(hostId),
      timelineYears: []
    };

    const roomData = {
      phase: 'lobby',
      round: 1,
      settings: {
        gameMode: 'timeline',
        targetScore: getStore().targetScore,
        targetYears: clampTimelineGoal(getStore().targetYears)
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
      throw new Error('No pudimos crear la sala. Intentalo otra vez.', { cause: error });
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

    Object.values(playersById).forEach((player) => {
      const answer = answers[player.id];
      const isCorrect = Boolean(answer?.isCorrect);
      const delta = answer ? (isCorrect ? 5 : -3) : (player.isHost ? 0 : -3);
      const nextPoints = clampPoints(Number(player.points || 0) + delta);

      remoteUpdates[`players/${player.id}/points`] = nextPoints;
      revealResults[player.id] = {
        resultType: isCorrect ? 'success' : 'fail',
        isCorrect,
        answered: Boolean(answer),
        delta,
        points: nextPoints
      };

      if (currentQuestion?.answerType === 'timeline-placement' && isCorrect) {
        remoteUpdates[`players/${player.id}/timelineYears`] = normalizeTimelineYears([
          ...(player.timelineYears || []),
          currentQuestion.songYear
        ], room?.settings?.targetYears || getStore().targetYears);
      }
    });

    const nextPlayers = sortPlayers(Object.values(playersById).map((player) => ({
      ...player,
      points: remoteUpdates[`players/${player.id}/points`] ?? player.points,
      timelineYears: remoteUpdates[`players/${player.id}/timelineYears`] ?? normalizeTimelineYears(player.timelineYears || [], room?.settings?.targetYears || getStore().targetYears)
    })));
    const targetYears = clampTimelineGoal(room?.settings?.targetYears || getStore().targetYears);
    const timelineComplete = nextPlayers.some((player) => getCombinedTimelineYears(player).length >= targetYears);
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
  attackOpponent: async (targetPlayerId, attackTypeId = 'reverse_order') => {
    const { pin, guestId, players, phase } = getStore();
    if (!pin || !guestId) return;
    if (phase !== 'listen') {
      throw new Error('Solo puedes sabotear antes de que salga la pregunta.');
    }

    const me = players.find((player) => player.id === guestId);
    const target = players.find((player) => player.id === targetPlayerId);
    const attackType = ATTACK_TYPES[attackTypeId] || ATTACK_TYPES.reverse_order;
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
        round: getStore().round,
        at: Date.now()
      },
      [`players/${guestId}/points`]: nextPoints
    });
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

  updatePlayerProfile: async ({ name, avatar }) => {
    const { pin, guestId, players } = getStore();
    if (!pin || !guestId) return;

    const currentPlayer = players.find((player) => player.id === guestId) || {};
    const cleanName = String(name || currentPlayer.name || 'Jugador').trim().slice(0, 18) || 'Jugador';
    const cleanAvatar = String(avatar || currentPlayer.avatar || 'DJ').trim().slice(0, 80) || 'DJ';

    await patchData(`rooms/${pin}/players/${guestId}`, {
      name: cleanName,
      avatar: cleanAvatar,
      profileUpdatedAt: Date.now()
    });

    setStore({
      guestName: cleanName,
      guestAvatar: cleanAvatar,
      players: players.map((player) => (
        player.id === guestId ? { ...player, name: cleanName, avatar: cleanAvatar } : player
      ))
    });
  },

  guestJoinRoom: async (enteredPin, guestName, guestAvatar) => {
    const cleanPin = String(enteredPin || '').replace(/\D/g, '').slice(0, 4);
    const room = await readData(`rooms/${cleanPin}`);

    if (!room) {
      throw new Error('PIN incorrecto o sala no existe.');
    }

    if (room.phase && room.phase !== 'lobby') {
      throw new Error('La partida ya comenzó. Pide al anfitrión que abra una nueva sala.');
    }

    try {
      let guestId = localStorage.getItem('dedicalo_player_id');
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).slice(2, 11)}`;
      }
      persistSession('guest', cleanPin, guestId);

      // Restore existing data if any, else create a new player
      const existingPlayer = room.players?.[guestId];
      const newPlayer = {
        id: guestId,
        name: existingPlayer ? existingPlayer.name : (guestName.trim().slice(0, 12) || 'Invitado'),
        avatar: existingPlayer ? existingPlayer.avatar : guestAvatar,
        points: existingPlayer ? existingPlayer.points : 10,
        isHost: false,
        status: 'online',
        lastSeenAt: Date.now(),
        offlineSince: null,
        kicked: false,
        timelineBaseYear: existingPlayer ? existingPlayer.timelineBaseYear : getTimelineBaseYear(guestId),
        timelineYears: existingPlayer ? (existingPlayer.timelineYears || []) : []
      };

      await writeData(`rooms/${cleanPin}/players/${guestId}`, newPlayer);
      armPresenceDisconnect(cleanPin, guestId);

      setStore({
        role: 'guest',
        pin: cleanPin,
        guestId,
        guestAvatar: newPlayer.avatar,
        guestName: newPlayer.name,
        gameMode: 'timeline',
        targetScore: Number(room.settings?.targetScore || 70),
        targetYears: clampTimelineGoal(room.settings?.targetYears || TIMELINE_GOAL_YEARS),
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
      at: Date.now()
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
        players: normalizedPlayers,
        currentQuestion: data.currentQuestion || null,
        currentTrack: data.currentTrack || null,
        roundAnswers: data.roundAnswers || {},
        revealResults: data.revealResults || {},
        timelineYears: data.timelineYears || []
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
  }
}));

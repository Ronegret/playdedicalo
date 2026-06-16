import { create } from 'zustand';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';

const DATABASE_URL = 'https://dedicalo-play-trivia-7-default-rtdb.europe-west1.firebasedatabase.app';
export const TIMELINE_GOAL_YEARS = 12;
export const DEDICALO_PLAYLISTS = [
  {
    id: 'reggaeton-historia',
    icon: '🔥',
    name: 'REGGAETON',
    mood: 'Clásicos para reconocer al instante.',
    url: 'https://open.spotify.com/playlist/64B6t8la0Rf3JTTaBXiNcm'
  },
  {
    id: 'hits-todos-los-tiempos',
    icon: '🌍',
    name: 'HITS',
    mood: 'Éxitos para todos los gustos.',
    url: 'https://open.spotify.com/playlist/0f3YRJO2HyZTpCLCVxzBt0'
  },
  {
    id: 'rock-latino',
    icon: '🎸',
    name: 'ROCK LATINO',
    mood: 'Guitarras, nostalgia y coros.',
    url: 'https://open.spotify.com/playlist/07iEAd20wfnMh8VfbmovYG'
  },
  {
    id: 'mix-latino',
    icon: '⚡',
    name: 'MIX LATINO',
    mood: 'Rondas rápidas y energía alta.',
    url: 'https://open.spotify.com/playlist/2UBikaEIZWV9LOAjE0dBgx'
  },
  {
    id: 'bailable-todos-los-tiempos',
    icon: '💃',
    name: 'BAILABLE',
    mood: 'Fácil de reconocer y bailar.',
    url: 'https://open.spotify.com/playlist/7FnGVaOj5s9JvAUtvZENfC'
  },
  {
    id: 'romanticos',
    icon: '💜',
    name: 'ROMÁNTICAS',
    mood: 'Baladas y recuerdos.',
    url: 'https://open.spotify.com/playlist/3dmrZtJOYx1naGoLtyHFOk'
  },
  {
    id: 'perreo-clasico',
    icon: '🕺',
    name: 'PERREO CLÁSICO',
    mood: 'Perreo clásico de memoria colectiva.',
    url: 'https://open.spotify.com/playlist/2aatYbsZb0ZiY3aQjcVSw2'
  },
  {
    id: 'temazos-espanoles',
    icon: '🇪🇸',
    name: 'TEMAZOS ES',
    mood: 'Música española de siempre.',
    url: 'https://open.spotify.com/playlist/7bsAMCUlTcMTGzG1RzxWTX'
  },
  {
    id: 'rock-ska-espanolisimo',
    icon: '🎺',
    name: 'ROCK Y SKA',
    mood: 'Rock, ska y clásicos con identidad.',
    url: 'https://open.spotify.com/playlist/6ZcRMfq1UCg0QzC2KkopvV'
  },
  {
    id: 'de-to2',
    icon: '🎲',
    name: 'DE TODO',
    mood: 'Mezcla abierta para cualquier grupo.',
    url: 'https://open.spotify.com/playlist/0Pn8mtBmo8HDfuKiky5tNj'
  },
  {
    id: 'fiestas-en-el-pueblo',
    icon: '🎉',
    name: 'FIESTA PUEBLO',
    mood: 'Fiesta para cantar y reconocer rápido.',
    url: 'https://open.spotify.com/playlist/5kkHb7jc3WocICRywvY6Yz'
  },
  {
    id: 'just-go',
    icon: '🚀',
    name: 'JUST GO',
    mood: 'Energía directa y ritmo alto.',
    url: 'https://open.spotify.com/playlist/0yUgOnkSswjzWwNxI2QjNC'
  }
];
export const DEFAULT_SPOTIFY_PLAYLIST_URL = DEDICALO_PLAYLISTS[0].url;

export const GAME_MODES = {
  pulse: {
    id: 'pulse',
    name: 'PULSO',
    short: 'Escucha y responde',
    description: 'Suena un fragmento, se corta y todos responden una pregunta clara.',
    rhythm: 'Ideal para empezar rápido y sin explicar mucho.'
  },
  timeline: {
    id: 'timeline',
    name: 'LÍNEA',
    short: 'Ordena la música',
    description: `Cada jugador tiene un año base distinto y gana quien completa primero ${TIMELINE_GOAL_YEARS} años en su línea.`,
    rhythm: `Perfecto para comparar épocas y construir una línea de ${TIMELINE_GOAL_YEARS} años.`
  },
  chaos: {
    id: 'chaos',
    name: 'REMIX',
    short: 'Música con sabotajes',
    description: 'La música sigue, pero ahora también mandan los ataques y la estrategia.',
    rhythm: 'Más tensión, más bromas y más remontadas.'
  }
};

export const VICTORY_MODES = [
  {
    targetScore: 70,
    name: 'RÁPIDA',
    short: 'Rápida',
    description: 'Disponible para Pulso y Remix. Gana quien llega primero a 70 puntos.'
  },
  {
    targetScore: 120,
    name: 'EQUILIBRADA',
    short: 'Equilibrada',
    description: 'Disponible para Pulso y Remix. Meta de 120 puntos con más remontadas.'
  },
  {
    targetScore: 200,
    name: 'LARGA',
    short: 'Larga',
    description: 'Disponible para Pulso y Remix. Meta de 200 puntos para partidas largas.'
  }
];

export const SABOTAGE_OPTIONS = [
  {
    id: 'point_lock',
    name: 'Bloqueo',
    icon: 'block',
    cost: 5,
    effect: 'El jugador en primer puesto no suma puntos si acierta la próxima ronda.',
    color: 'red'
  },
  {
    id: 'steal',
    name: 'El Ladrón',
    icon: 'remove_circle',
    cost: 6,
    effect: 'Roba 7 puntos al instante al jugador en primer puesto.',
    color: 'red'
  },
  {
    id: 'swap_points',
    name: 'El Cambio',
    icon: 'swap_horiz',
    cost: 8,
    effect: 'Intercambia tus puntos con los del líder. Puede ser una remontada épica.',
    color: 'purple'
  },
  {
    id: 'shield',
    name: 'El Escudo',
    icon: 'shield',
    cost: 3,
    effect: 'Bloquea el próximo ataque que recibas este turno o el siguiente.',
    color: 'green'
  },
  {
    id: 'shared_prize',
    name: 'Dueto',
    icon: 'group',
    cost: 4,
    effect: 'Si el líder acierta la próxima ronda, comparte sus puntos contigo (+2 pts extra para ti).',
    color: 'green'
  },
  {
    id: 'trap',
    name: 'La Trampa',
    icon: 'crisis_alert',
    cost: 4,
    effect: 'Si el líder falla la próxima ronda, pierde 6 pts en vez de 3.',
    color: 'red'
  }
];

const MUSIC_QUESTIONS = [
  { mode: 'pulse', type: 'Letra incompleta', text: "Completa la letra: 'Yo te lo...'", options: ['Dije', 'Juro', 'Dedícalo', 'Doy'], correct: 2 },
  { mode: 'pulse', type: 'Identidad', text: '¿Cómo se llama el artista principal?', options: ['Bad Bunny', 'Rauw Alejandro', 'El artista sorpresa', 'Feid'], correct: 2 },
  { mode: 'pulse', type: 'Título exacto', text: '¿Qué palabra aparece en el título?', options: ['Noche', 'Corazón', 'Dedícalo', 'Perreo'], correct: 2 },
  { mode: 'pulse', type: 'Colaboración', text: '¿Qué papel tiene la voz invitada en esta canción?', options: ['Coro principal', 'Verso invitado', 'Intro hablada', 'No hay invitado'], correct: 1 },
  { mode: 'pulse', type: 'Cultura pop', text: '¿Dónde sonaría mejor esta canción?', options: ['Final de fiesta', 'Escena triste', 'Entrenamiento', 'Créditos finales'], correct: 0 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Línea del Ritmo', text: '¿Dónde encaja esta canción en la línea?', timelineYears: [2000], songYear: 2014, options: ['0', '1'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Línea del Ritmo', text: '¿Dónde pondrías esta canción?', timelineYears: [1995, 2005], songYear: 2001, options: ['0', '1', '2'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Línea del Ritmo', text: 'Escucha y colócala por año.', timelineYears: [1990, 2000, 2010], songYear: 2020, options: ['0', '1', '2', '3'], correct: 3 },
  { mode: 'chaos', type: 'Remix', text: '¿Qué jugada conviene ahora?', options: ['Guardar puntos', 'Activar sabotaje', 'Cambiar de avatar', 'Salir de la sala'], correct: 1 },
  { mode: 'chaos', type: 'Colaboración', text: 'Si aparece un dueto, ¿qué conviene escuchar primero?', options: ['Quién entra después', 'El volumen del móvil', 'El color del botón', 'La posición del ranking'], correct: 0 },
  { mode: 'chaos', type: 'Remix', text: '¿Qué color anuncia sabotaje?', options: ['Verde', 'Rojo', 'Lila', 'Azul'], correct: 2 }
];

function databasePath(path) {
  return `${DATABASE_URL}/${path}.json`;
}

async function readData(path) {
  const response = await fetch(databasePath(path));
  if (!response.ok) throw new Error(`Firebase read failed: ${response.status}`);
  return response.json();
}

async function writeData(path, data) {
  const response = await fetch(databasePath(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Firebase write failed: ${response.status}`);
  return response.json();
}

async function patchData(path, data) {
  const response = await fetch(databasePath(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Firebase update failed: ${response.status}`);
  return response.json();
}

async function deleteData(path) {
  const response = await fetch(databasePath(path), { method: 'DELETE' });
  if (!response.ok) throw new Error(`Firebase delete failed: ${response.status}`);
  return response.json();
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
  return [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
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

function findWinner(players, targetScore) {
  return sortPlayers(players).find((player) => Number(player.points || 0) >= Number(targetScore || 70));
}

function normalizeTimelineYears(years = []) {
  return [...new Set((years || []).map(Number).filter(Boolean))]
    .sort((a, b) => a - b)
    .slice(0, 12);
}

export function getCombinedTimelineYears(player) {
  const p = player || {};
  const baseYear = Number(p.timelineBaseYear || 2000);
  return normalizeTimelineYears([baseYear, ...(p.timelineYears || [])]);
}

function reverseReadableText(text) {
  return String(text || '').split('').reverse().join('');
}

export const useGameStore = create((setStore, getStore) => ({
  role: null,
  pin: null,
  players: [],
  phase: 'lobby',
  round: 1,
  gameMode: 'pulse',
  targetScore: 70,
  currentQuestion: null,
  guestId: null,
  guestAvatar: null,
  guestName: null,
  lastResultType: null,
  lastPointDelta: 0,
  lastSabotage: null,
  roundAnswers: {},
  revealResults: {},
  pointLocks: {},
  sharedPrize: null,
  pendingQuestionEffect: null,
  shields: {},
  pendingAttacks: {},
  traps: {},
  roomError: null,
  currentTrack: null,
  timelineYears: [],
  roomSubscription: null,

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

  setGameSettings: async ({ gameMode, targetScore }) => {
    const pin = getStore().pin;
    if (getStore().round > 1 || getStore().phase !== 'lobby') return;
    const currentGameMode = getStore().gameMode;
    const nextSettings = {
      gameMode: gameMode || getStore().gameMode,
      targetScore: Number(targetScore || getStore().targetScore)
    };
    const modeChanged = nextSettings.gameMode !== currentGameMode;

    setStore({ ...nextSettings, ...(modeChanged ? { timelineYears: [] } : {}) });
    if (pin && getStore().role === 'host') {
      await patchData(`rooms/${pin}`, {
        settings: nextSettings,
        ...(modeChanged ? { timelineYears: [] } : {})
      });
    }
  },

  hostCreateRoom: async (hostUser = {}) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    const hostId = hostUser?.uid || `host_${Math.random().toString(36).slice(2, 11)}`;

    const hostPlayer = {
      id: hostId,
      name: hostUser?.displayName || 'Anfitrión',
      avatar: hostUser?.photoURL || 'La Consola Maestra',
      points: 10,
      isHost: true,
      timelineBaseYear: getTimelineBaseYear(hostId),
      timelineYears: []
    };

    const roomData = {
      phase: 'lobby',
      round: 1,
      settings: {
        gameMode: getStore().gameMode,
        targetScore: getStore().targetScore
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
      setStore({
        pin: newPin,
        role: 'host',
        phase: 'lobby',
        round: 1,
        guestId: hostId,
        players: [hostPlayer],
        gameMode: roomData.settings.gameMode,
        targetScore: roomData.settings.targetScore,
        spotifyPlaylistUrl: roomData.audio.playlistUrl,
        lastResultType: null,
        lastPointDelta: 0,
        lastSabotage: null,
        roundAnswers: {},
        revealResults: {},
        pointLocks: {},
        sharedPrize: null,
        pendingQuestionEffect: null,
        shields: {},
        pendingAttacks: {},
        traps: {},
        timelineYears: []
      });
      getStore()._subscribeToRoom(newPin);
    } catch (error) {
      console.error('Error al crear la sala:', error);
      throw new Error('No pudimos crear la sala. Inténtalo otra vez.', { cause: error });
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

    const room = await readData(`rooms/${pin}`);
    const pendingEffect = room?.pendingQuestionEffect || null;
    const forceWildQuestion = pendingEffect?.id === 'wild_question';
    const pool = forceWildQuestion ? MUSIC_QUESTIONS : MUSIC_QUESTIONS.filter((question) => question.mode === gameMode);
    const questions = pool.length ? pool : MUSIC_QUESTIONS;
    const baseQuestion = questions[Math.floor(Math.random() * questions.length)];
    const questionBase = questionOverride || baseQuestion;
    const question = pendingEffect?.id === 'reverse_lyrics'
      ? {
        ...questionBase,
        text: reverseReadableText(questionBase.text),
        type: `${questionBase.type} al revés`
      }
      : questionBase;

    await Promise.all([
      patchData(`rooms/${pin}`, {
        phase: 'blackout',
        currentQuestion: question,
        currentTrack: trackInfo || null,
        pendingQuestionEffect: null,
        roundAnswers: null,
        revealResults: null
      }),
      patchData(`rooms/${pin}/audio`, { isPlaying: false })
    ]);
  },

  hostRevealResults: async () => {
    const { pin, targetScore, gameMode } = getStore();
    if (!pin) return;

    const room = await readData(`rooms/${pin}`);
    const playersById = room?.players || {};
    const answers = room?.roundAnswers || {};
    const pointLocks = room?.pointLocks || {};
    const sharedPrize = room?.sharedPrize || null;
    const traps = room?.traps || {};
    const currentQuestion = room?.currentQuestion || {};
    const remoteUpdates = {};
    const revealResults = {};

    Object.values(playersById).forEach((player) => {
      const answer = answers[player.id];
      const isCorrect = Boolean(answer?.isCorrect);
      const pointLock = pointLocks[player.id] || null;
      const trap = traps[player.id] || null;
      const isLocked = Boolean(isCorrect && pointLock);
      const isTrap = Boolean(!isCorrect && trap);
      const sharesWithBuyer = Boolean(isCorrect && sharedPrize?.buyerId && sharedPrize.buyerId !== player.id);
      let delta;
      if (answer) {
        if (isCorrect) {
          delta = isLocked ? 0 : sharesWithBuyer ? 3 : 5;
        } else {
          delta = isTrap ? -6 : -3;
        }
      } else {
        delta = player.isHost ? 0 : (isTrap ? -6 : -3);
      }
      const nextPoints = clampPoints(Number(player.points || 0) + delta);
      const sabotage = isLocked
        ? { name: 'Silencio al líder', by: pointLock.by, effect: `${pointLock.by} intentó bloquear tu acierto. Tus puntos quedan en 0 esta ronda.` }
        : isTrap
          ? { name: 'La Trampa', by: trap.by, effect: `${trap.by} activó una trampa. Pierdes 6 pts por fallar.` }
          : sharesWithBuyer
            ? { name: 'Dueto dividido', by: sharedPrize.buyerName, effect: `${sharedPrize.buyerName} activó un dueto y compartió tu acierto.` }
            : null;

      remoteUpdates[`players/${player.id}/points`] = nextPoints;
      revealResults[player.id] = {
        resultType: sabotage ? 'sabotage' : isCorrect ? 'success' : 'fail',
        isCorrect,
        answered: Boolean(answer),
        delta,
        points: nextPoints,
        sabotage
      };

      if (isLocked) {
        remoteUpdates[`pointLocks/${player.id}`] = null;
      }

      if (isTrap) {
        remoteUpdates[`traps/${player.id}`] = null;
      }

      if (currentQuestion?.answerType === 'timeline-placement' && isCorrect) {
        remoteUpdates[`players/${player.id}/timelineYears`] = normalizeTimelineYears([
          ...(player.timelineYears || []),
          currentQuestion.songYear
        ]);
      }
    });

    if (sharedPrize?.buyerId && playersById[sharedPrize.buyerId]) {
      const buyer = playersById[sharedPrize.buyerId];
      const buyerNextPoints = clampPoints(Number(remoteUpdates[`players/${buyer.id}/points`] ?? buyer.points ?? 0) + 2);
      remoteUpdates[`players/${buyer.id}/points`] = buyerNextPoints;
      revealResults[buyer.id] = {
        ...(revealResults[buyer.id] || {}),
        resultType: 'sabotage',
        delta: Number(revealResults[buyer.id]?.delta || 0) + 2,
        points: buyerNextPoints,
        sabotage: { name: 'Dueto dividido', by: buyer.name, effect: 'Tu sabotaje sumó 2 puntos por compartir un acierto.' }
      };
      remoteUpdates.sharedPrize = null;
    }

      const nextPlayers = sortPlayers(Object.values(playersById).map((player) => ({
      ...player,
      points: remoteUpdates[`players/${player.id}/points`] ?? player.points,
      timelineYears: remoteUpdates[`players/${player.id}/timelineYears`] ?? normalizeTimelineYears(player.timelineYears || [])
    })));
    const timelineComplete = gameMode === 'timeline'
      && nextPlayers.some((player) => getCombinedTimelineYears(player).length >= TIMELINE_GOAL_YEARS);
    const winner = gameMode === 'timeline' ? null : findWinner(nextPlayers, targetScore);
    remoteUpdates.phase = timelineComplete ? 'final' : (winner ? 'final' : 'result');
    remoteUpdates.revealResults = revealResults;
    remoteUpdates.lastSabotage = Object.values(revealResults).find((result) => result.sabotage)?.sabotage || null;
    remoteUpdates.currentQuestion = (winner || timelineComplete) ? null : room.currentQuestion || null;

    await patchData(`rooms/${pin}`, remoteUpdates);

    const ownResult = revealResults[getStore().guestId] || null;
    setStore({
      phase: remoteUpdates.phase,
      players: nextPlayers,
      revealResults,
      lastResultType: ownResult?.resultType || getStore().lastResultType,
      lastPointDelta: ownResult?.delta || 0,
      lastSabotage: ownResult?.sabotage || remoteUpdates.lastSabotage
    });
  },

  hostNextRound: async () => {
    const { pin, round, players, targetScore, gameMode } = getStore();
    if (!pin) return;

    if (gameMode !== 'timeline' && findWinner(players, targetScore)) {
      await getStore().hostEndGame();
      return;
    }

    const room = await readData(`rooms/${pin}`);
    const patchUpdates = {};
    Object.entries(room?.pendingAttacks || {}).forEach(([targetId, attack]) => {
      if (attack.sabotageId === 'point_lock') {
        patchUpdates[`pointLocks/${targetId}`] = { by: attack.by, byId: attack.byId, round: round + 1 };
      } else if (attack.sabotageId === 'trap') {
        patchUpdates[`traps/${targetId}`] = { by: attack.by, byId: attack.byId, round: round + 1 };
      }
      patchUpdates[`pendingAttacks/${targetId}`] = null;
    });

    await patchData(`rooms/${pin}`, {
      ...patchUpdates,
      round: round + 1,
      currentQuestion: null,
      currentTrack: null,
      roundAnswers: null,
      revealResults: null,
      lastSabotage: null,
      phase: 'countdown'
    });

    setTimeout(() => {
      const state = getStore();
      if (state.pin === pin && state.round === round + 1 && state.phase === 'countdown') {
        patchData(`rooms/${pin}`, { phase: 'listen' }).catch((error) => console.error('Error al continuar la ronda:', error));
      }
    }, 3000);
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
      lastSabotage: null,
      roundAnswers: {},
      revealResults: {},
      pointLocks: {},
      sharedPrize: null,
      pendingQuestionEffect: null,
      shields: {},
      pendingAttacks: {},
      traps: {},
      timelineYears: [],
      roomSubscription: null
    });
  },

  guestJoinRoom: async (enteredPin, guestName, guestAvatar) => {
    const cleanPin = String(enteredPin || '').replace(/\D/g, '').slice(0, 4);
    const room = await readData(`rooms/${cleanPin}`);

    if (!room) {
      throw new Error('PIN incorrecto o sala no existe.');
    }

    try {
      const guestId = `guest_${Math.random().toString(36).slice(2, 11)}`;
      const newPlayer = {
        id: guestId,
        name: guestName.trim().slice(0, 12) || 'Invitado',
        avatar: guestAvatar,
        points: 10,
        isHost: false,
        timelineBaseYear: getTimelineBaseYear(guestId),
        timelineYears: []
      };

      await writeData(`rooms/${cleanPin}/players/${guestId}`, newPlayer);
      setStore({
        role: 'guest',
        pin: cleanPin,
        guestId,
        guestAvatar,
        guestName: newPlayer.name,
        gameMode: room.settings?.gameMode || 'pulse',
        targetScore: Number(room.settings?.targetScore || 70),
        lastResultType: null,
        lastPointDelta: 0,
        lastSabotage: null,
        pointLocks: room.pointLocks || {},
        sharedPrize: room.sharedPrize || null,
        pendingQuestionEffect: room.pendingQuestionEffect || null,
        timelineYears: room.timelineYears || []
      });
      getStore()._subscribeToRoom(cleanPin);
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      throw new Error('No pudimos unirte a la sala. Inténtalo otra vez.', { cause: error });
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

  guestUseSabotage: async (sabotageId) => {
    const { pin, guestId } = getStore();
    const sabotage = SABOTAGE_OPTIONS.find((option) => option.id === sabotageId);
    if (!pin || !guestId || !sabotage) return;

    const room = await readData(`rooms/${pin}`);
    const player = await readData(`rooms/${pin}/players/${guestId}`);
    if (!player || Number(player.points || 0) < sabotage.cost) {
      setStore({ lastResultType: 'sabotage', lastSabotage: { ...sabotage, blocked: true }, lastPointDelta: 0 });
      return;
    }

    const currentPlayers = getStore().players;
    const leader = sortPlayers(currentPlayers).find((playerItem) => playerItem.id !== guestId);
    const round = getStore().round;
    let playerDelta = -sabotage.cost;
    let remoteUpdates = {};
    let appliedSabotage = { ...sabotage, by: player.name };
    let localShields = getStore().shields;
    let localPendingAttacks = getStore().pendingAttacks;
    let localTraps = getStore().traps;
    let localPointLocks = getStore().pointLocks;
    let leaderPointsDelta = 0;

    if (sabotage.id === 'steal') {
      if (leader) {
        if (room?.shields?.[leader.id]) {
          remoteUpdates[`shields/${leader.id}`] = null;
          localShields = { ...localShields, [leader.id]: null };
          appliedSabotage = { ...appliedSabotage, target: leader.name, blocked: true };
        } else {
          const stolenAmount = Math.min(7, Number(leader.points || 0));
          leaderPointsDelta = -stolenAmount;
          playerDelta = stolenAmount - sabotage.cost;
          remoteUpdates[`players/${leader.id}/points`] = clampPoints(Number(leader.points || 0) - stolenAmount);
          appliedSabotage = { ...appliedSabotage, target: leader.name, deferred: false };
        }
      }
    } else if (sabotage.id === 'swap_points') {
      if (leader) {
        if (room?.shields?.[leader.id]) {
          remoteUpdates[`shields/${leader.id}`] = null;
          localShields = { ...localShields, [leader.id]: null };
          appliedSabotage = { ...appliedSabotage, target: leader.name, blocked: true };
        } else {
          const leaderPoints = Number(leader.points || 0);
          const buyerOriginalPoints = Number(player.points || 0);
          playerDelta = leaderPoints - buyerOriginalPoints - sabotage.cost;
          remoteUpdates[`players/${leader.id}/points`] = clampPoints(buyerOriginalPoints);
          leaderPointsDelta = clampPoints(buyerOriginalPoints) - leaderPoints;
          appliedSabotage = { ...appliedSabotage, target: leader.name, deferred: false };
        }
      }
    } else if (sabotage.id === 'point_lock') {
      if (leader) {
        if (room?.shields?.[leader.id]) {
          remoteUpdates[`shields/${leader.id}`] = null;
          localShields = { ...localShields, [leader.id]: null };
          appliedSabotage = { ...appliedSabotage, target: leader.name, blocked: true };
        } else if (room?.pointLocks?.[leader.id] || room?.pendingAttacks?.[leader.id]) {
          remoteUpdates[`pendingAttacks/${leader.id}`] = { sabotageId: 'point_lock', by: player.name, byId: guestId, round };
          localPendingAttacks = { ...localPendingAttacks, [leader.id]: { sabotageId: 'point_lock', by: player.name, byId: guestId, round } };
          appliedSabotage = { ...appliedSabotage, target: leader.name, deferred: true };
        } else {
          remoteUpdates[`pointLocks/${leader.id}`] = { by: player.name, byId: guestId, round };
          localPointLocks = { ...localPointLocks, [leader.id]: { by: player.name, byId: guestId, round } };
          appliedSabotage = { ...appliedSabotage, target: leader.name, deferred: true };
        }
      }
    } else if (sabotage.id === 'shield') {
      if (!room?.shields?.[guestId]) {
        remoteUpdates[`shields/${guestId}`] = { byId: guestId, round };
        localShields = { ...localShields, [guestId]: { byId: guestId, round } };
        appliedSabotage = { ...appliedSabotage, deferred: false };
      }
    } else if (sabotage.id === 'shared_prize') {
      if (!room?.sharedPrize) {
        remoteUpdates.sharedPrize = { buyerId: guestId, buyerName: player.name, round };
        appliedSabotage = { ...appliedSabotage, deferred: true };
      }
    } else if (sabotage.id === 'trap') {
      if (leader) {
        if (room?.shields?.[leader.id]) {
          remoteUpdates[`shields/${leader.id}`] = null;
          localShields = { ...localShields, [leader.id]: null };
          appliedSabotage = { ...appliedSabotage, target: leader.name, blocked: true };
        } else if (room?.traps?.[leader.id] || room?.pendingAttacks?.[leader.id]) {
          remoteUpdates[`pendingAttacks/${leader.id}`] = { sabotageId: 'trap', by: player.name, byId: guestId, round };
          localPendingAttacks = { ...localPendingAttacks, [leader.id]: { sabotageId: 'trap', by: player.name, byId: guestId, round } };
          appliedSabotage = { ...appliedSabotage, target: leader.name, deferred: true };
        } else {
          remoteUpdates[`traps/${leader.id}`] = { by: player.name, byId: guestId, round };
          localTraps = { ...localTraps, [leader.id]: { by: player.name, byId: guestId, round } };
          appliedSabotage = { ...appliedSabotage, target: leader.name, deferred: true };
        }
      }
    }

    const nextPoints = clampPoints(Number(player.points || 0) + playerDelta);
    remoteUpdates[`players/${guestId}/points`] = nextPoints;
    remoteUpdates.lastSabotage = appliedSabotage;

    await patchData(`rooms/${pin}`, remoteUpdates);

    const players = sortPlayers(currentPlayers.map((playerItem) => {
      if (playerItem.id === guestId) return { ...playerItem, points: nextPoints };
      if (leader && playerItem.id === leader.id && leaderPointsDelta !== 0) {
        return { ...playerItem, points: clampPoints(Number(playerItem.points || 0) + leaderPointsDelta) };
      }
      return playerItem;
    }));

    setStore({
      players,
      pointLocks: localPointLocks,
      shields: localShields,
      pendingAttacks: localPendingAttacks,
      traps: localTraps,
      sharedPrize: remoteUpdates.sharedPrize || getStore().sharedPrize,
      lastSabotage: appliedSabotage,
      lastPointDelta: playerDelta
    });
  },

  hostCancelRound: async () => {
    const { pin } = getStore();
    if (!pin) return;
    await patchData(`rooms/${pin}`, { phase: 'lobby', currentQuestion: null, roundAnswers: null, revealResults: null });
  },

  guestGoToLobby: () => {
    setStore({ phase: 'lobby', lastResultType: null, lastPointDelta: 0, lastSabotage: null });
  },

  guestLeaveRoom: () => {
    const { pin, guestId, roomSubscription } = getStore();
    if (typeof roomSubscription === 'function') roomSubscription();
    if (pin && guestId) {
      deleteData(`rooms/${pin}/players/${guestId}`).catch((error) => console.error('Error al salir de la sala:', error));
    }
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
      lastSabotage: null,
      roundAnswers: {},
      revealResults: {},
      pointLocks: {},
      sharedPrize: null,
      pendingQuestionEffect: null,
      shields: {},
      pendingAttacks: {},
      traps: {},
      timelineYears: [],
      roomSubscription: null
    });
  },

  clearRoomError: () => setStore({ roomError: null }),

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

    const roomRef = ref(database, `rooms/${pin}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      const current = getStore();

      if (!data) {
        if (current.role === 'guest') {
          getStore().guestLeaveRoom();
          setStore({ roomError: 'La sala ha sido cerrada por el anfitrión.' });
        }
        return;
      }

      const remoteRound = Number(data.round || 1);
      const remotePhase = data.phase || 'lobby';
      const keepGuestResult = current.role === 'guest'
        && current.phase === 'result'
        && current.lastResultType
        && current.round === remoteRound
        && remotePhase === 'lobby';

      setStore({
        phase: keepGuestResult ? 'result' : remotePhase,
        round: remoteRound,
        gameMode: data.settings?.gameMode || data.gameMode || 'pulse',
        targetScore: Number(data.settings?.targetScore || data.targetScore || 70),
        players: data.players
          ? sortPlayers(Object.values(data.players).map((player) => ({
            ...player,
            timelineBaseYear: Number(player.timelineBaseYear || getTimelineBaseYear(player.id))
          })))
          : [],
        currentQuestion: data.currentQuestion || null,
        currentTrack: data.currentTrack || null,
        roundAnswers: data.roundAnswers || {},
        revealResults: data.revealResults || {},
        lastSabotage: data.lastSabotage || getStore().lastSabotage,
        pointLocks: data.pointLocks || {},
        sharedPrize: data.sharedPrize || null,
        pendingQuestionEffect: data.pendingQuestionEffect || null,
        shields: data.shields || {},
        pendingAttacks: data.pendingAttacks || {},
        traps: data.traps || {},
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


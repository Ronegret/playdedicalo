import { create } from 'zustand';
import { ref, onValue, onDisconnect, get, set, update, remove } from 'firebase/database';
import { database } from '../firebase';

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
    name: 'CORTE MAESTRO',
    short: 'Escucha, corta y responde',
    description: 'La música suena, el anfitrión la corta y todos responden antes que el resto.',
    rhythm: 'Directo, rápido y perfecto para calentar la sala desde la primera canción.'
  },
  timeline: {
    id: 'timeline',
    name: 'AÑOS LOCOS',
    short: 'Ordena canciones por año',
    description: `Cada jugador arma su propia ruta musical y gana quien completa primero ${TIMELINE_GOAL_YEARS} años.`,
    rhythm: 'Memoria, intuición y nostalgia: coloca cada canción donde crees que pertenece.'
  },
  bingo: {
    id: 'bingo',
    name: 'BINGO MUSICAL',
    short: 'Gira, responde y completa tu cartón',
    description: 'Cada ronda gira la ruleta de categorías, suena una canción y todos responden antes de que se acabe el tiempo. Si aciertas, se marca sola una casilla de tu cartón.',
    rhythm: 'Por rondas con cronómetro, como el Bingo de Hitster: todos esperan la misma canción y compiten por cantar ¡LÍNEA!'
  }
};

export const VICTORY_MODES = [
  {
    targetScore: 70,
    name: 'RÁPIDA',
    short: 'Rápida',
    description: 'Disponible para Corte Maestro. Gana quien llega primero a 70 puntos.'
  },
  {
    targetScore: 120,
    name: 'EQUILIBRADA',
    short: 'Equilibrada',
    description: 'Disponible para Corte Maestro. Meta de 120 puntos con más remontadas.'
  },
  {
    targetScore: 200,
    name: 'LARGA',
    short: 'Larga',
    description: 'Disponible para Corte Maestro. Meta de 200 puntos para partidas largas.'
  }
];

// These questions are fallbacks shown only when no Spotify track is available.
// All answers must be objectively correct for any song/situation.
const MUSIC_QUESTIONS = [
  { mode: 'pulse', type: 'Trivia', text: '¿Cuántos puntos se ganan al acertar una respuesta?', options: ['+3 pts', '+4 pts', '+5 pts', '+7 pts'], correct: 2 },
  { mode: 'pulse', type: 'Trivia', text: '¿Cuántos puntos se pierden al fallar?', options: ['-1 pts', '-2 pts', '-3 pts', '-5 pts'], correct: 2 },
  { mode: 'pulse', type: 'Trivia', text: '¿Cómo se llama el modo de cartones musicales de Dedícalo?', options: ['Caos DJ', 'Bingo Musical', 'Años Locos', 'Corte Maestro'], correct: 1 },
  { mode: 'pulse', type: 'Trivia', text: '¿Qué necesita el anfitrión para reproducir música en Dedícalo?', options: ['Spotify Premium', 'Una radio', 'Un micrófono', 'Nada'], correct: 0 },
  { mode: 'pulse', type: 'Trivia', text: '¿Cuántos modos de juego tiene Dedícalo?', options: ['1', '2', '3', '4'], correct: 2 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Años Locos', text: '¿Dónde encaja esta canción en tu ruta de años?', timelineYears: [2000], songYear: 2014, options: ['0', '1'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Años Locos', text: '¿Dónde pondrías esta canción?', timelineYears: [1995, 2005], songYear: 2001, options: ['0', '1', '2'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Años Locos', text: 'Escucha y colócala por año.', timelineYears: [1990, 2000, 2010], songYear: 2020, options: ['0', '1', '2', '3'], correct: 3 }
];

// ---------------------------------------------------------------------------
// Bingo Musical — clon del Bingo de Hitster: ruleta de categorías por ronda,
// todos responden contrarreloj, y quien acierta marca sola una casilla de su
// cartón del color de esa categoría. Ver hitstergame.com/es-es/como-jugar-bingo/
// ---------------------------------------------------------------------------

export const BINGO_GRID_SIZE = 25;
export const BINGO_FREE_INDEX = 12;
const BINGO_CELLS_NEEDED = BINGO_GRID_SIZE - 1;
export const BINGO_ROUND_DURATION_MS = 25000;
export const BINGO_SPIN_DURATION_MS = 1800;

// 5 filas + 5 columnas + 2 diagonales del cartón 5x5.
export const BINGO_WINNING_LINES = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
];

// Las 5 secciones de la ruleta (mismo número que la ruleta física de Hitster).
// "Grupo o solista" de Hitster se dejó fuera: la Web API de Spotify no tiene ese
// dato de forma confiable, así que no se puede juzgar la respuesta con certeza.
export const BINGO_CATEGORIES = [
  { id: 'decade', label: 'DÉCADA', color: '#39ff14' },
  { id: 'year', label: 'AÑO EXACTO', color: '#ff7a1a' },
  { id: 'before2000', label: 'ANTES/DESPUÉS DE 2000', color: '#3f78ff' },
  { id: 'song', label: 'NOMBRE DE LA CANCIÓN', color: '#a855f7' },
  { id: 'artist', label: 'ARTISTA', color: '#ff6b8b' }
];

export const BINGO_WIN_MODES = [
  { id: 'line', label: 'LÍNEA', description: 'Gana quien complete primero una fila, columna o diagonal. Partidas cortas, como el Hitster real.' },
  { id: 'fullcard', label: 'CARTÓN COMPLETO', description: 'La línea es solo un logro a mitad de camino. Gana quien complete las 24 casillas.' }
];

function shuffleArray(items = []) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Genera el cartón de un jugador (25 celdas, índice BINGO_FREE_INDEX = libre).
// Cada celda no-libre queda asignada a una de las BINGO_CATEGORIES, repartidas
// ~parejo (24/5) y barajadas para que cada jugador tenga un arreglo distinto.
export function generateBingoCard(seedKey) {
  const pool = [];
  for (let i = 0; i < BINGO_CELLS_NEEDED; i += 1) {
    pool.push(BINGO_CATEGORIES[i % BINGO_CATEGORIES.length]);
  }
  const shuffled = shuffleArray(pool);

  const cells = [];
  let cursor = 0;
  for (let i = 0; i < BINGO_GRID_SIZE; i += 1) {
    if (i === BINGO_FREE_INDEX) {
      cells.push({ id: `${seedKey}_free`, kind: 'free', label: 'DEDÍCALO' });
    } else {
      const category = shuffled[cursor];
      cells.push({ id: `${seedKey}_${i}`, kind: 'category', categoryId: category.id });
      cursor += 1;
    }
  }
  return cells;
}

// Progreso de un cartón: casillas que faltan para la mejor línea y para el cartón completo.
export function getBingoProgress(marked = []) {
  let missingForLine = BINGO_GRID_SIZE;
  let bestLineIndex = -1;
  BINGO_WINNING_LINES.forEach((line, lineIndex) => {
    const missing = line.filter((cellIndex) => !marked[cellIndex]).length;
    if (missing < missingForLine) {
      missingForLine = missing;
      bestLineIndex = lineIndex;
    }
  });
  let missingForFullCard = 0;
  for (let i = 0; i < BINGO_GRID_SIZE; i += 1) {
    if (!marked[i]) missingForFullCard += 1;
  }
  return {
    missingForLine,
    bestLineIndex,
    missingForFullCard,
    hasLine: missingForLine === 0,
    hasBingo: missingForFullCard === 0
  };
}

// Ranking del Bingo: NO usa puntos, solo cercanía a Línea y a Cartón completo.
function computeBingoRanking(players = []) {
  return [...players]
    .map((player) => ({ ...player, bingoProgress: getBingoProgress(player.bingoMarked || []) }))
    .sort((a, b) => {
      if (a.bingoProgress.missingForLine !== b.bingoProgress.missingForLine) {
        return a.bingoProgress.missingForLine - b.bingoProgress.missingForLine;
      }
      return a.bingoProgress.missingForFullCard - b.bingoProgress.missingForFullCard;
    });
}

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

// Etiqueta corta de progreso de Bingo para listas compactas (ej. Lobby).
export function getBingoProgressLabel(player) {
  if (!player?.bingoMarked) return null;
  const { missingForLine, missingForFullCard, hasLine } = getBingoProgress(player.bingoMarked);
  if (hasLine) return `¡LÍNEA! Faltan ${missingForFullCard} para Bingo`;
  return `Faltan ${missingForLine} para Línea`;
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
  roundAnswers: {},
  revealResults: {},
  roomError: null,
  currentTrack: null,
  timelineYears: [],
  roomSubscription: null,
  lastDisconnectedPlayer: null,

  // Bingo Musical
  playedTracks: {},
  bingoWinnerId: null,
  bingoWinMode: 'line',
  bingoStage: 'idle',
  bingoRound: null,
  bingoRoundAnswers: {},

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

  setGameSettings: async ({ gameMode, targetScore, bingoWinMode }) => {
    const pin = getStore().pin;
    if (getStore().round > 1 || getStore().phase !== 'lobby') return;
    const currentGameMode = getStore().gameMode;
    const nextSettings = {
      gameMode: gameMode || getStore().gameMode,
      targetScore: Number(targetScore || getStore().targetScore),
      bingoWinMode: bingoWinMode || getStore().bingoWinMode || 'line'
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
        targetScore: getStore().targetScore,
        bingoWinMode: getStore().bingoWinMode || 'line'
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
      onDisconnect(ref(database, `rooms/${newPin}`))
        .update({ phase: 'final', currentQuestion: null })
        .catch(() => {});
      setStore({
        pin: newPin,
        role: 'host',
        phase: 'lobby',
        round: 1,
        guestId: hostId,
        players: [hostPlayer],
        gameMode: roomData.settings.gameMode,
        targetScore: roomData.settings.targetScore,
        bingoWinMode: roomData.settings.bingoWinMode,
        spotifyPlaylistUrl: roomData.audio.playlistUrl,
        lastResultType: null,
        lastPointDelta: 0,
        roundAnswers: {},
        revealResults: {},
        timelineYears: [],
        playedTracks: {},
        bingoWinnerId: null,
        bingoStage: 'idle',
        bingoRound: null,
        bingoRoundAnswers: {}
      });
      getStore()._subscribeToRoom(newPin);
    } catch (error) {
      console.error('Error al crear la sala:', error);
      throw new Error('No pudimos crear la sala. Inténtalo otra vez.', { cause: error });
    }
  },

  hostStartGame: async () => {
    const { pin, gameMode, players, bingoWinMode } = getStore();
    if (!pin) return;

    if (gameMode === 'bingo') {
      const cardUpdates = {};
      players.forEach((player) => {
        const card = generateBingoCard(player.id);
        cardUpdates[`players/${player.id}/bingoCard`] = card;
        cardUpdates[`players/${player.id}/bingoMarked`] = card.map((cell) => cell.kind === 'free');
      });
      await patchData(`rooms/${pin}`, {
        ...cardUpdates,
        playedTracks: null,
        bingoWinnerId: null,
        bingoStage: 'idle',
        bingoRound: null,
        bingoRoundAnswers: null,
        'settings/bingoWinMode': bingoWinMode || 'line'
      });
      setStore({ playedTracks: {}, bingoWinnerId: null, bingoStage: 'idle', bingoRound: null, bingoRoundAnswers: {} });
    }

    await patchData(`rooms/${pin}`, { phase: 'countdown', currentQuestion: null });

    setTimeout(() => {
      const state = getStore();
      if (state.pin === pin && state.phase === 'countdown') {
        patchData(`rooms/${pin}`, { phase: 'listen' }).catch((error) => console.error('Error al iniciar ronda:', error));
      }
    }, 3000);
  },

  // Bingo Musical, paso 1 de la ronda: se anuncia la categoría elegida y todos ven
  // girar la ruleta al mismo tiempo, antes de que suene ninguna canción.
  hostBeginBingoSpin: async (category) => {
    const { pin } = getStore();
    if (!pin || !category) return;
    await patchData(`rooms/${pin}`, { bingoStage: 'spinning', bingoRound: { categoryId: category.id }, bingoRoundAnswers: null });
    setStore({ bingoStage: 'spinning', bingoRound: { categoryId: category.id }, bingoRoundAnswers: {} });
  },

  // Paso 2: ya se eligió la canción y se armó la pregunta (services/spotify.js),
  // arranca el cronómetro de la ronda y todos pueden responder.
  hostStartBingoRound: async ({ category, question, track }) => {
    const { pin } = getStore();
    if (!pin) return;

    const key = `t${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const trackInfo = {
      uri: track.uri || null,
      name: track.name || null,
      artist: track.artist || null,
      releaseYear: track.releaseYear || null,
      albumImage: track.albumImage || null
    };
    const bingoRound = {
      categoryId: category.id,
      question,
      track: trackInfo,
      startedAt: Date.now(),
      durationMs: BINGO_ROUND_DURATION_MS
    };

    await patchData(`rooms/${pin}`, {
      bingoStage: 'answering',
      bingoRound,
      bingoRoundAnswers: null,
      currentTrack: trackInfo,
      [`playedTracks/${key}`]: { ...trackInfo, playedAt: Date.now() }
    });
    setStore({ bingoStage: 'answering', bingoRound, bingoRoundAnswers: {}, currentTrack: trackInfo });
  },

  guestAnswerBingoRound: async (optionIndex) => {
    const { pin, guestId, bingoRound } = getStore();
    if (!pin || !guestId || !bingoRound?.question) return;

    const answer = {
      optionIndex,
      isCorrect: optionIndex === bingoRound.question.correct,
      at: Date.now()
    };
    await writeData(`rooms/${pin}/bingoRoundAnswers/${guestId}`, answer);
    setStore({
      bingoRoundAnswers: { ...getStore().bingoRoundAnswers, [guestId]: answer }
    });
  },

  // Paso 3: se acabó el tiempo (o el anfitrión revela antes). Quien acertó marca
  // sola una casilla sin marcar de su cartón del color de la categoría de la
  // ronda. Si alguien completa la condición de victoria elegida (línea o cartón
  // completo), la partida termina ahí mismo.
  hostRevealBingoRound: async () => {
    const { pin, bingoWinMode } = getStore();
    if (!pin) return;

    const room = await readData(`rooms/${pin}`);
    if (!room?.bingoRound || room.bingoStage !== 'answering') return;

    const playersById = room.players || {};
    const answers = room.bingoRoundAnswers || {};
    const categoryId = room.bingoRound.categoryId;
    const winMode = room.settings?.bingoWinMode || bingoWinMode || 'line';

    // Se procesa en orden de quién respondió primero: si dos jugadores completan
    // la condición de victoria en la misma ronda, gana quien contestó más rápido.
    const orderedPlayers = Object.values(playersById).sort((a, b) => (
      (answers[a.id]?.at ?? Infinity) - (answers[b.id]?.at ?? Infinity)
    ));

    const remoteUpdates = {};
    const nextMarkedByPlayer = {};
    let winnerId = null;

    orderedPlayers.forEach((player) => {
      if (!answers[player.id]?.isCorrect) return;
      const marked = [...(player.bingoMarked || [])];
      const card = player.bingoCard || [];
      const targetIndex = card.findIndex((cell, index) => (
        cell?.kind === 'category' && cell.categoryId === categoryId && !marked[index]
      ));
      if (targetIndex === -1) return;

      marked[targetIndex] = true;
      nextMarkedByPlayer[player.id] = marked;
      remoteUpdates[`players/${player.id}/bingoMarked`] = marked;

      if (!winnerId) {
        const progress = getBingoProgress(marked);
        const won = winMode === 'fullcard' ? progress.hasBingo : progress.hasLine;
        if (won) winnerId = player.id;
      }
    });

    remoteUpdates.bingoStage = 'revealed';
    if (winnerId) {
      remoteUpdates.bingoWinnerId = winnerId;
      remoteUpdates.phase = 'final';
    }

    await patchData(`rooms/${pin}`, remoteUpdates);
    if (winnerId) {
      await patchData(`rooms/${pin}/audio`, { isPlaying: false });
    }

    setStore({
      bingoStage: 'revealed',
      players: getStore().players.map((p) => (
        nextMarkedByPlayer[p.id] ? { ...p, bingoMarked: nextMarkedByPlayer[p.id] } : p
      )),
      ...(winnerId ? { bingoWinnerId: winnerId, phase: 'final' } : {})
    });
  },

  getBingoRanking: () => computeBingoRanking(getStore().players),

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
    const { pin, targetScore, gameMode } = getStore();
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
        ]);
      }
    });

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
    remoteUpdates.currentQuestion = (winner || timelineComplete) ? null : room.currentQuestion || null;

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
    const { pin, round, players, targetScore, gameMode } = getStore();
    if (!pin) return;

    if (gameMode !== 'timeline' && findWinner(players, targetScore)) {
      await getStore().hostEndGame();
      return;
    }

    await patchData(`rooms/${pin}`, {
      round: round + 1,
      currentQuestion: null,
      currentTrack: null,
      roundAnswers: null,
      revealResults: null,
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
      roundAnswers: {},
      revealResults: {},
      timelineYears: [],
      playedTracks: {},
      bingoWinnerId: null,
      bingoStage: 'idle',
      bingoRound: null,
      bingoRoundAnswers: {},
      roomSubscription: null
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
      onDisconnect(ref(database, `rooms/${cleanPin}/players/${guestId}`))
        .remove()
        .catch(() => {});
      setStore({
        role: 'guest',
        pin: cleanPin,
        guestId,
        guestAvatar,
        guestName: newPlayer.name,
        gameMode: room.settings?.gameMode || 'pulse',
        targetScore: Number(room.settings?.targetScore || 70),
        bingoWinMode: room.settings?.bingoWinMode || 'line',
        lastResultType: null,
        lastPointDelta: 0,
        timelineYears: room.timelineYears || [],
        playedTracks: room.playedTracks || {},
        bingoWinnerId: room.bingoWinnerId || null,
        bingoStage: room.bingoStage || 'idle',
        bingoRound: room.bingoRound || null,
        bingoRoundAnswers: room.bingoRoundAnswers || {}
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
      playedTracks: {},
      bingoWinnerId: null,
      bingoStage: 'idle',
      bingoRound: null,
      bingoRoundAnswers: {},
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
        bingoWinMode: data.settings?.bingoWinMode || 'line',
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
        timelineYears: data.timelineYears || [],
        playedTracks: data.playedTracks || {},
        bingoWinnerId: data.bingoWinnerId || null,
        bingoStage: data.bingoStage || 'idle',
        bingoRound: data.bingoRound || null,
        bingoRoundAnswers: data.bingoRoundAnswers || {}
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

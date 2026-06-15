import { create } from 'zustand';

const DATABASE_URL = 'https://dedicalo-play-trivia-7-default-rtdb.europe-west1.firebasedatabase.app';
export const DEDICALO_PLAYLISTS = [
  {
    id: 'reggaeton-historia',
    name: 'Los mejores reggetones de la historia',
    mood: 'Reggaeton histórico para reconocer hits al instante.',
    url: 'https://open.spotify.com/playlist/64B6t8la0Rf3JTTaBXiNcm'
  },
  {
    id: 'hits-todos-los-tiempos',
    name: 'Las mejores canciones de todos los tiempos',
    mood: 'Hits globales para partidas con todos los gustos.',
    url: 'https://open.spotify.com/playlist/0f3YRJO2HyZTpCLCVxzBt0'
  },
  {
    id: 'rock-latino',
    name: 'Rock Latino',
    mood: 'Guitarras, nostalgia y coros para cantar fuerte.',
    url: 'https://open.spotify.com/playlist/07iEAd20wfnMh8VfbmovYG'
  },
  {
    id: 'mix-latino',
    name: 'Latino Mix 2026',
    mood: 'Latino actual para rondas rapidas y energia alta.',
    url: 'https://open.spotify.com/playlist/2UBikaEIZWV9LOAjE0dBgx'
  },
  {
    id: 'bailable-todos-los-tiempos',
    name: 'Bailables todos los tiempos',
    mood: 'Fiesta transversal: canciones fáciles de reconocer.',
    url: 'https://open.spotify.com/playlist/7FnGVaOj5s9JvAUtvZENfC'
  },
  {
    id: 'romanticos',
    name: 'Éxitos románticos en español',
    mood: 'Baladas y recuerdos para jugar por artista y época.',
    url: 'https://open.spotify.com/playlist/3dmrZtJOYx1naGoLtyHFOk'
  },
  {
    id: 'perreo-clasico',
    name: 'Mix temazos de paradero',
    mood: 'Perreo clasico y reggaeton de memoria colectiva.',
    url: 'https://open.spotify.com/playlist/2aatYbsZb0ZiY3aQjcVSw2'
  },
  {
    id: 'temazos-espanoles',
    name: 'Temazos Españoles',
    mood: 'Música española de siempre para rondas nostálgicas.',
    url: 'https://open.spotify.com/playlist/7bsAMCUlTcMTGzG1RzxWTX'
  },
  {
    id: 'rock-ska-espanolisimo',
    name: 'Españolísimos',
    mood: 'Rock, ska y clásicos españoles con mucha identidad.',
    url: 'https://open.spotify.com/playlist/6ZcRMfq1UCg0QzC2KkopvV'
  },
  {
    id: 'de-to2',
    name: 'De To2',
    mood: 'Mezcla abierta para partidas variadas.',
    url: 'https://open.spotify.com/playlist/0Pn8mtBmo8HDfuKiky5tNj'
  }
];
export const DEFAULT_SPOTIFY_PLAYLIST_URL = DEDICALO_PLAYLISTS[0].url;

export const GAME_MODES = {
  pulse: {
    id: 'pulse',
    name: 'Pulso Dedicalo',
    short: 'Escucha y responde',
    description: 'El modo principal. Suena un fragmento, se corta la musica y todos responden una pregunta clara sobre artista, titulo, letra, energia o contexto.',
    rhythm: 'Es el mas facil de explicar: ideal para primeras partidas, grupos nuevos y gente que solo quiere entrar rapido a jugar.'
  },
  timeline: {
    id: 'timeline',
    name: 'Linea del Ritmo',
    short: 'Ordena la musica',
    description: 'La partida gira alrededor de epocas, anos, modas y momentos musicales. No hace falta saber la fecha exacta: hay que ubicar la cancion en la linea correcta.',
    rhythm: 'Da conversacion y risas: perfecto para nostalgia, comparaciones entre generaciones y debates de "esto era de antes o de ahora?".'
  },
  chaos: {
    id: 'chaos',
    name: 'Remix Salvaje',
    short: 'Musica con sabotajes',
    description: 'La dinamica sigue siendo musical, pero la estrategia pesa mas. Los jugadores gastan puntos para bloquear, arriesgar o provocar remontadas.',
    rhythm: 'Para grupos competitivos: mas tension, mas bromas y mas posibilidades de que el ultimo le robe la noche al lider.'
  }
};

export const VICTORY_MODES = [
  {
    targetScore: 40,
    name: 'Hit Express',
    short: 'Rapida',
    description: 'Gana quien llega primero a 40 puntos. Ideal para una partida corta antes de salir.'
  },
  {
    targetScore: 70,
    name: 'Fiesta Principal',
    short: 'Equilibrada',
    description: 'Meta a 70 puntos. Da tiempo a remontadas, sabotajes y cambios de lider.'
  },
  {
    targetScore: 100,
    name: 'Sesion Legendaria',
    short: 'Larga',
    description: 'Meta a 100 puntos. Para grupos grandes o noches donde la musica manda.'
  }
];

export const SABOTAGE_OPTIONS = [
  {
    id: 'point_lock',
    name: 'Silencio al lider',
    cost: 5,
    effect: 'El lider queda bloqueado: si acierta en la proxima vuelta, no gana puntos.',
    color: 'red'
  },
  {
    id: 'reverse_lyrics',
    name: 'Letra al reves',
    cost: 4,
    effect: 'La proxima pregunta aparece escrita al reves para subir la presion del blackout.',
    color: 'purple'
  },
  {
    id: 'shared_prize',
    name: 'Dueto dividido',
    cost: 4,
    effect: 'Si otro jugador acierta la proxima, esa persona gana 3 puntos y tu robas 2 por la jugada.',
    color: 'green'
  },
  {
    id: 'wild_question',
    name: 'Cambio de aguja',
    cost: 3,
    effect: 'La proxima pregunta salta a una categoria sorpresa, aunque el host haya elegido otro estilo.',
    color: 'purple'
  }
];

const MUSIC_QUESTIONS = [
  { mode: 'pulse', type: 'Letra incompleta', text: "Completa la letra: 'Yo te lo...'", options: ['Dije', 'Juro', 'Dedicalo', 'Doy'], correct: 2 },
  { mode: 'pulse', type: 'Identidad', text: 'Como se llama el artista principal?', options: ['Bad Bunny', 'Rauw Alejandro', 'El artista sorpresa', 'Feid'], correct: 2 },
  { mode: 'pulse', type: 'Titulo exacto', text: 'Que palabra aparece en el titulo?', options: ['Noche', 'Corazon', 'Dedicalo', 'Perreo'], correct: 2 },
  { mode: 'pulse', type: 'Colaboracion', text: 'Que papel tiene la voz invitada en este corte?', options: ['Coro principal', 'Verso invitado', 'Intro hablada', 'No hay invitado'], correct: 1 },
  { mode: 'pulse', type: 'Cultura pop', text: 'Donde sonaria mejor este corte?', options: ['Final de fiesta', 'Escena triste', 'Entrenamiento', 'Creditos finales'], correct: 0 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Línea del Ritmo', text: '¿Dónde encaja esta canción en la línea?', timelineYears: [2000], songYear: 2014, options: ['0', '1'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Línea del Ritmo', text: '¿Dónde pondrías este corte?', timelineYears: [1995, 2005], songYear: 2001, options: ['0', '1', '2'], correct: 1 },
  { mode: 'timeline', answerType: 'timeline-placement', type: 'Línea del Ritmo', text: 'Escucha y colócala por año.', timelineYears: [1990, 2000, 2010], songYear: 2020, options: ['0', '1', '2', '3'], correct: 3 },
  { mode: 'chaos', type: 'Remix Salvaje', text: 'Que jugada conviene ahora?', options: ['Guardar puntos', 'Activar sabotaje', 'Cambiar de avatar', 'Salir de la sala'], correct: 1 },
  { mode: 'chaos', type: 'Colaboracion', text: 'Si aparece un dueto, que conviene escuchar primero?', options: ['Quien entra despues', 'El volumen del movil', 'El color del boton', 'La posicion del ranking'], correct: 0 },
  { mode: 'chaos', type: 'Remix Salvaje', text: 'Que color anuncia sabotaje?', options: ['Verde', 'Rojo', 'Lila', 'Azul'], correct: 2 }
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
  return [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
}

function clampPoints(value) {
  return Math.max(0, Number(value || 0));
}

function findWinner(players, targetScore) {
  return sortPlayers(players).find((player) => Number(player.points || 0) >= Number(targetScore || 70));
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
    const nextSettings = {
      gameMode: gameMode || getStore().gameMode,
      targetScore: Number(targetScore || getStore().targetScore)
    };

    setStore(nextSettings);
    if (pin && getStore().role === 'host') {
      await patchData(`rooms/${pin}/settings`, nextSettings);
    }
  },

  hostCreateRoom: async (hostUser = {}) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    const hostId = hostUser?.uid || `host_${Math.random().toString(36).slice(2, 11)}`;

    const hostPlayer = {
      id: hostId,
      name: hostUser?.displayName || 'DJ Host',
      avatar: hostUser?.photoURL || 'La Consola Maestra',
      points: 10,
      isHost: true
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
      }
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
        pendingQuestionEffect: null
      });
      getStore()._subscribeToRoom(newPin);
    } catch (error) {
      console.error('Error al crear la sala:', error);
      throw new Error('No se pudo conectar a Firebase. Revisa los permisos de Realtime Database.', { cause: error });
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

  hostTriggerBlackout: async (questionOverride = null) => {
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
        type: `${questionBase.type} al reves`
      }
      : questionBase;

    await Promise.all([
      patchData(`rooms/${pin}`, { phase: 'blackout', currentQuestion: question, pendingQuestionEffect: null, roundAnswers: null, revealResults: null }),
      patchData(`rooms/${pin}/audio`, { isPlaying: false })
    ]);
  },

  hostRevealResults: async () => {
    const { pin, targetScore } = getStore();
    if (!pin) return;

    const room = await readData(`rooms/${pin}`);
    const playersById = room?.players || {};
    const answers = room?.roundAnswers || {};
    const pointLocks = room?.pointLocks || {};
    const sharedPrize = room?.sharedPrize || null;
    const remoteUpdates = {};
    const revealResults = {};

    Object.values(playersById).forEach((player) => {
      const answer = answers[player.id];
      const isCorrect = Boolean(answer?.isCorrect);
      const pointLock = pointLocks[player.id] || null;
      const isLocked = Boolean(isCorrect && pointLock);
      const sharesWithBuyer = Boolean(isCorrect && sharedPrize?.buyerId && sharedPrize.buyerId !== player.id);
      const delta = answer ? (isCorrect ? (isLocked ? 0 : sharesWithBuyer ? 3 : 5) : -3) : player.isHost ? 0 : -3;
      const nextPoints = clampPoints(Number(player.points || 0) + delta);
      const sabotage = isLocked
        ? { name: 'Silencio al lider', by: pointLock.by, effect: `${pointLock.by} intentó bloquear tu acierto. Tus puntos quedan en 0 esta ronda.` }
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
      points: remoteUpdates[`players/${player.id}/points`] ?? player.points
    })));
    const winner = findWinner(nextPlayers, targetScore);
    remoteUpdates.phase = winner ? 'final' : 'result';
    remoteUpdates.revealResults = revealResults;
    remoteUpdates.lastSabotage = Object.values(revealResults).find((result) => result.sabotage)?.sabotage || null;
    remoteUpdates.currentQuestion = winner ? null : room.currentQuestion || null;

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
    const { pin, round, players, targetScore } = getStore();
    if (!pin) return;

    if (findWinner(players, targetScore)) {
      await getStore().hostEndGame();
      return;
    }

    await patchData(`rooms/${pin}`, {
      phase: 'lobby',
      round: round + 1,
      currentQuestion: null,
      roundAnswers: null,
      revealResults: null,
      lastSabotage: null
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
    if (roomSubscription) window.clearInterval(roomSubscription);
    if (pin) {
      deleteData(`rooms/${pin}`).catch((error) => console.error('Error al cerrar la sala:', error));
    }
    setStore({
      role: null,
      pin: null,
      guestId: null,
      players: [],
      phase: 'lobby',
      currentQuestion: null,
      lastResultType: null,
      lastPointDelta: 0,
      lastSabotage: null,
      roundAnswers: {},
      revealResults: {},
      pointLocks: {},
      sharedPrize: null,
      pendingQuestionEffect: null,
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
        isHost: false
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
        pendingQuestionEffect: room.pendingQuestionEffect || null
      });
      getStore()._subscribeToRoom(cleanPin);
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      throw new Error('Error al unirse a la base de datos.', { cause: error });
    }
  },

  guestAnswer: async (isCorrect) => {
    const { pin, guestId, guestName, round } = getStore();
    if (!pin || !guestId) return;

    const answer = {
      playerId: guestId,
      playerName: guestName || getStore().players.find((player) => player.id === guestId)?.name || 'Jugador',
      isCorrect: Boolean(isCorrect),
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
    let playerDelta = -sabotage.cost;
    let remoteUpdates = {};
    let appliedSabotage = { ...sabotage, by: player.name };

    if (sabotage.id === 'point_lock' && leader && !room?.pointLocks?.[leader.id]) {
      remoteUpdates[`pointLocks/${leader.id}`] = { by: player.name, byId: guestId, round: getStore().round };
      appliedSabotage = { ...appliedSabotage, target: leader.name };
    }

    if ((sabotage.id === 'reverse_lyrics' || sabotage.id === 'wild_question') && !room?.pendingQuestionEffect) {
      remoteUpdates.pendingQuestionEffect = { id: sabotage.id, by: player.name, byId: guestId };
    }

    if (sabotage.id === 'shared_prize' && !room?.sharedPrize) {
      remoteUpdates.sharedPrize = { buyerId: guestId, buyerName: player.name, round: getStore().round };
    }

    const nextPoints = clampPoints(Number(player.points || 0) + playerDelta);
    remoteUpdates = {
      ...remoteUpdates,
      [`players/${guestId}/points`]: nextPoints,
      lastSabotage: appliedSabotage
    };

    await patchData(`rooms/${pin}`, remoteUpdates);

    const players = sortPlayers(currentPlayers.map((playerItem) => {
      if (playerItem.id === guestId) return { ...playerItem, points: nextPoints };
      return playerItem;
    }));

    setStore({
      players,
      pointLocks: sabotage.id === 'point_lock' && leader && remoteUpdates[`pointLocks/${leader.id}`]
        ? { ...getStore().pointLocks, [leader.id]: { by: player.name, byId: guestId, round: getStore().round } }
        : getStore().pointLocks,
      sharedPrize: remoteUpdates.sharedPrize || getStore().sharedPrize,
      pendingQuestionEffect: remoteUpdates.pendingQuestionEffect || getStore().pendingQuestionEffect,
      lastSabotage: appliedSabotage,
      lastPointDelta: playerDelta
    });
  },

  guestGoToLobby: () => {
    setStore({ phase: 'lobby', lastResultType: null, lastPointDelta: 0, lastSabotage: null });
  },

  guestLeaveRoom: () => {
    const { pin, guestId, roomSubscription } = getStore();
    if (roomSubscription) window.clearInterval(roomSubscription);
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
        lastResultType: null,
        lastPointDelta: 0,
        lastSabotage: null,
        roundAnswers: {},
        revealResults: {},
        pointLocks: {},
      sharedPrize: null,
      pendingQuestionEffect: null,
      roomSubscription: null
    });
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
    if (existingSubscription) window.clearInterval(existingSubscription);

    const syncRoom = async () => {
      const data = await readData(`rooms/${pin}`);
      const current = getStore();

      if (!data) {
        if (current.role === 'guest') {
          alert('La sala ha sido cerrada.');
          getStore().guestLeaveRoom();
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
        players: data.players ? sortPlayers(Object.values(data.players)) : [],
        currentQuestion: data.currentQuestion || null,
        roundAnswers: data.roundAnswers || {},
        revealResults: data.revealResults || {},
        lastSabotage: data.lastSabotage || getStore().lastSabotage,
        pointLocks: data.pointLocks || {},
        sharedPrize: data.sharedPrize || null,
        pendingQuestionEffect: data.pendingQuestionEffect || null
      });

      if (data.audio) {
        setStore({
          isAudioPlaying: Boolean(data.audio.isPlaying),
          isAudioMuted: Boolean(data.audio.isMuted),
          spotifyPlaylistUrl: normalizeSpotifyPlaylistUrl(data.audio.playlistUrl || data.audio.playlistId)
        });
      }
    };

    syncRoom().catch((error) => console.error('Error al sincronizar sala:', error));
    const subscription = window.setInterval(() => {
      syncRoom().catch((error) => console.error('Error al sincronizar sala:', error));
    }, 1200);

    setStore({ roomSubscription: subscription });
  }
}));

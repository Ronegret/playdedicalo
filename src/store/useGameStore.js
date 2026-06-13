import { create } from 'zustand';

const DATABASE_URL = 'https://dedicalo-play-trivia-7-default-rtdb.europe-west1.firebasedatabase.app';
export const DEFAULT_SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';

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
  { mode: 'timeline', type: 'Linea del Ritmo', text: 'Donde pondrias este tema en la linea del tiempo?', options: ['Antes de 2000', '2000-2009', '2010-2019', '2020 en adelante'], correct: 2 },
  { mode: 'timeline', type: 'Linea del Ritmo', text: 'Que momento musical encaja mejor con este sonido?', options: ['Era CD', 'Boom de YouTube', 'Playlists virales', 'TikTok global'], correct: 2 },
  { mode: 'timeline', type: 'Colaboracion', text: 'Que tipo de colaboracion se volvio mas comun con la era de playlists?', options: ['Featuring entre generos', 'Cancion oculta', 'Solo instrumental', 'Album sin singles'], correct: 0 },
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
  pointLocks: {},
  sharedPrize: null,
  pendingQuestionEffect: null,
  roomSubscription: null,

  isAudioPlaying: false,
  isAudioMuted: false,
  spotifyPlaylistUrl: DEFAULT_SPOTIFY_PLAYLIST_URL,

  setSpotifyPlaylistUrl: (url) => setStore({ spotifyPlaylistUrl: normalizeSpotifyPlaylistUrl(url) }),
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
        Promise.all([
          patchData(`rooms/${pin}`, { phase: 'listen' }),
          patchData(`rooms/${pin}/audio`, { isPlaying: true })
        ]).catch((error) => console.error('Error al iniciar audio:', error));
      }
    }, 3000);
  },

  hostTriggerBlackout: async () => {
    const { pin, gameMode } = getStore();
    if (!pin) return;

    const room = await readData(`rooms/${pin}`);
    const pendingEffect = room?.pendingQuestionEffect || null;
    const forceWildQuestion = pendingEffect?.id === 'wild_question';
    const pool = forceWildQuestion ? MUSIC_QUESTIONS : MUSIC_QUESTIONS.filter((question) => question.mode === gameMode);
    const questions = pool.length ? pool : MUSIC_QUESTIONS;
    const baseQuestion = questions[Math.floor(Math.random() * questions.length)];
    const question = pendingEffect?.id === 'reverse_lyrics'
      ? {
        ...baseQuestion,
        text: reverseReadableText(baseQuestion.text),
        type: `${baseQuestion.type} al reves`
      }
      : baseQuestion;

    await Promise.all([
      patchData(`rooms/${pin}`, { phase: 'blackout', currentQuestion: question, pendingQuestionEffect: null }),
      patchData(`rooms/${pin}/audio`, { isPlaying: false })
    ]);
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
    const { pin, guestId, targetScore } = getStore();
    if (!pin || !guestId) return;

    const room = await readData(`rooms/${pin}`);
    const player = await readData(`rooms/${pin}/players/${guestId}`);
    const pointLock = room?.pointLocks?.[guestId] || null;
    const sharedPrize = room?.sharedPrize || null;
    const isLocked = Boolean(isCorrect && pointLock);
    const sharesWithBuyer = Boolean(isCorrect && sharedPrize?.buyerId && sharedPrize.buyerId !== guestId);
    const delta = isCorrect ? (isLocked ? 0 : sharesWithBuyer ? 3 : 5) : -3;
    let nextPoints = null;
    const remoteUpdates = {};

    if (player) {
      nextPoints = clampPoints(Number(player.points || 0) + delta);
      remoteUpdates[`players/${guestId}/points`] = nextPoints;
    }

    if (isLocked) {
      remoteUpdates[`pointLocks/${guestId}`] = null;
    }

    if (sharesWithBuyer) {
      const buyer = await readData(`rooms/${pin}/players/${sharedPrize.buyerId}`);
      if (buyer) {
        remoteUpdates[`players/${sharedPrize.buyerId}/points`] = clampPoints(Number(buyer.points || 0) + 2);
      }
      remoteUpdates.sharedPrize = null;
    }

    if (Object.keys(remoteUpdates).length > 0) {
      await patchData(`rooms/${pin}`, remoteUpdates);
    }

    const players = nextPoints === null
      ? getStore().players
      : sortPlayers(getStore().players.map((playerItem) => {
        if (playerItem.id === guestId) return { ...playerItem, points: nextPoints };
        if (sharesWithBuyer && playerItem.id === sharedPrize.buyerId) {
          return { ...playerItem, points: clampPoints(Number(playerItem.points || 0) + 2) };
        }
        return playerItem;
      }));

    if (findWinner(players, targetScore)) {
      await Promise.all([
        patchData(`rooms/${pin}`, { phase: 'final', currentQuestion: null }),
        patchData(`rooms/${pin}/audio`, { isPlaying: false })
      ]);
    }

    setStore({
      phase: findWinner(players, targetScore) ? 'final' : 'result',
      players,
      lastResultType: isLocked || sharesWithBuyer ? 'sabotage' : isCorrect ? 'success' : 'fail',
      lastPointDelta: delta,
      lastSabotage: isLocked
        ? { name: 'Silencio al lider', effect: 'Acertaste, pero el sabotaje bloqueo tus puntos esta vuelta.' }
        : sharesWithBuyer
          ? { name: 'Dueto dividido', effect: `${sharedPrize.buyerName} activo un dueto: compartieron los puntos de tu acierto.` }
          : null
    });
  },

  guestUseSabotage: async (sabotageId) => {
    const { pin, guestId } = getStore();
    const sabotage = SABOTAGE_OPTIONS.find((option) => option.id === sabotageId);
    if (!pin || !guestId || !sabotage) return;

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

    if (sabotage.id === 'point_lock' && leader) {
      remoteUpdates[`pointLocks/${leader.id}`] = { by: player.name, byId: guestId, round: getStore().round };
      appliedSabotage = { ...appliedSabotage, target: leader.name };
    }

    if (sabotage.id === 'reverse_lyrics' || sabotage.id === 'wild_question') {
      remoteUpdates.pendingQuestionEffect = { id: sabotage.id, by: player.name, byId: guestId };
    }

    if (sabotage.id === 'shared_prize') {
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
      phase: 'result',
      players,
      pointLocks: sabotage.id === 'point_lock' && leader
        ? { ...getStore().pointLocks, [leader.id]: { by: player.name, byId: guestId, round: getStore().round } }
        : getStore().pointLocks,
      sharedPrize: sabotage.id === 'shared_prize' ? remoteUpdates.sharedPrize : getStore().sharedPrize,
      pendingQuestionEffect: sabotage.id === 'reverse_lyrics' || sabotage.id === 'wild_question' ? remoteUpdates.pendingQuestionEffect : getStore().pendingQuestionEffect,
      lastResultType: 'sabotage',
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

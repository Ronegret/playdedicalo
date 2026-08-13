const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '8d753e32e5c34713baa3cee821bb85ad';
const TOKEN_KEY = 'dedicalo_spotify_token';
const VERIFIER_KEY = 'dedicalo_spotify_verifier';
const TRACK_KEY = 'dedicalo_current_spotify_track';
const PLAYED_TRACKS_KEY = 'dedicalo_played_spotify_tracks';
const CATALOG_URL = '/data/dedicalo-song-catalog.full.clean.json';
const PLAYER_NAME = 'Dedicalo Anfitrion';

const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative'
];

let spotifyPlayerPromise = null;
let spotifyDeviceId = null;
let lastSpotifySdkError = '';
let catalogPromise = null;
let tokenRefreshPromise = null;

// Tracks which artists have appeared (correct or distractor) since the current game playlist started.
// Cleared when the active playlist changes (= new game) or when all playlist tracks are exhausted.
let usedArtistsThisGame = new Set();
let currentGamePlaylistId = null;

function getRedirectUri() {
  return `${window.location.origin}/spotify/callback`;
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data);
}

function saveToken(token) {
  const expiresIn = Number(token.expires_in || 3600);
  const nextToken = {
    ...token,
    expires_at: Date.now() + expiresIn * 1000 - 60000
  };
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(nextToken));
  return nextToken;
}

function readToken() {
  try {
    const token = JSON.parse(window.localStorage.getItem(TOKEN_KEY) || 'null');
    return token?.access_token ? token : null;
  } catch {
    return null;
  }
}

async function requestToken(body) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });

  if (!response.ok) {
    const text = await response.text();
    let isInvalidGrant = false;
    try {
      const data = JSON.parse(text);
      if (data.error === 'invalid_grant') {
        isInvalidGrant = true;
      }
    } catch {
      if (text.includes('invalid_grant')) {
        isInvalidGrant = true;
      }
    }

    if (isInvalidGrant) {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    throw new Error(`Spotify token error ${response.status}: ${text}`);
  }

  return saveToken(await response.json());
}

export function resetSpotifyConnection() {
  window.localStorage.removeItem(TOKEN_KEY);
  spotifyPlayerPromise = null;
  spotifyDeviceId = null;
}

export function getSpotifyStatus() {
  const token = readToken();
  return {
    connected: Boolean(token?.access_token),
    expiresAt: token?.expires_at || null,
    premiumRequired: true
  };
}

export async function connectSpotify() {
  const verifier = randomString();
  const challenge = base64UrlEncode(await sha256(verifier));
  window.localStorage.setItem(VERIFIER_KEY, verifier);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES.join(' '));
  authUrl.searchParams.set('redirect_uri', getRedirectUri());
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);
  window.location.assign(authUrl.toString());
}

export async function completeSpotifyLogin(code) {
  const verifier = window.localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Falta el verificador de Spotify. Vuelve a conectar Spotify.');

  const token = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier
  });
  window.localStorage.removeItem(VERIFIER_KEY);
  return token;
}

export async function getSpotifyAccessToken() {
  const token = readToken();
  if (!token) throw new Error('Spotify no está conectado.');
  if (Date.now() < Number(token.expires_at || 0)) return token.access_token;
  if (!token.refresh_token) throw new Error('La sesión de Spotify expiró. Vuelve a conectar Spotify.');

  // Deduplicate concurrent refresh calls — only one in-flight at a time.
  if (!tokenRefreshPromise) {
    tokenRefreshPromise = requestToken({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: SPOTIFY_CLIENT_ID
    }).then((refreshed) => {
      if (!refreshed.refresh_token) {
        refreshed.refresh_token = token.refresh_token;
        saveToken(refreshed);
      }
      return refreshed;
    }).finally(() => {
      tokenRefreshPromise = null;
    });
  }

  const refreshed = await tokenRefreshPromise;
  return refreshed.access_token;
}

async function spotifyFetch(url, options = {}) {
  const accessToken = await getSpotifyAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    if (response.status === 401) {
      // Access token rejected — discard it and reset the player so the next
      // connectSpotify() starts fresh instead of reusing a broken session.
      window.localStorage.removeItem(TOKEN_KEY);
      spotifyPlayerPromise = null;
      spotifyDeviceId = null;
    }
    throw new Error(`Spotify error ${response.status}: ${text}`);
  }

  return response.status === 204 ? null : response.json();
}

function setSpotifySdkError(prefix, message) {
  lastSpotifySdkError = `${prefix}: ${message}`;
}

function loadSpotifySdk() {
  if (window.Spotify) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
    const timeout = window.setTimeout(() => reject(new Error('Spotify tardó demasiado en cargar.')), 10000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => reject(new Error('No pudimos cargar Spotify.'));
    document.body.appendChild(script);
  });
}

async function getSpotifyPlayer() {
  if (spotifyPlayerPromise) return spotifyPlayerPromise;

  spotifyPlayerPromise = (async () => {
    await loadSpotifySdk();
    const player = new window.Spotify.Player({
      name: PLAYER_NAME,
      getOAuthToken: async (callback) => {
        try {
          callback(await getSpotifyAccessToken());
        } catch {
          // Refresh failed (e.g. invalid_grant after 6-month token expiry).
          // Reset module state so the next connectSpotify() starts fresh,
          // then disconnect this player so it doesn't compete with the new one.
          spotifyPlayerPromise = null;
          spotifyDeviceId = null;
          try { player.disconnect(); } catch { /* ignore */ }
          // Do not call callback — SDK will emit authentication_error.
        }
      },
      volume: 0.75
    });

    player.addListener('ready', ({ device_id }) => {
      spotifyDeviceId = device_id;
    });

    player.addListener('not_ready', () => {
      spotifyDeviceId = null;
    });

    player.addListener('initialization_error', ({ message }) => {
      setSpotifySdkError('Inicio', message);
      console.error('Spotify initialization_error:', message);
    });
    player.addListener('authentication_error', ({ message }) => {
      setSpotifySdkError('Conexión', message);
      console.error('Spotify authentication_error:', message);
    });
    player.addListener('account_error', ({ message }) => {
      setSpotifySdkError('Cuenta', message);
      console.error('Spotify account_error:', message);
    });
    player.addListener('playback_error', ({ message }) => {
      setSpotifySdkError('Reproducción', message);
      console.error('Spotify playback_error:', message);
    });
    player.addListener('autoplay_failed', () => {
      setSpotifySdkError('Reproducción', 'El navegador bloqueó el inicio automático. Pulsa PLAY en el vinilo.');
    });

    const connected = await player.connect();
    if (!connected) throw new Error('Spotify no aceptó la conexión.');
    return player;
  })();

  return spotifyPlayerPromise;
}

// Pre-loads SDK and connects the player in the background (no user gesture needed).
// Call this as early as possible so prepareSpotifyPlayback() is fast when user clicks.
export async function preWarmSpotifyPlayer() {
  try {
    await getSpotifyPlayer();
    for (let i = 0; i < 20; i++) {
      if (spotifyDeviceId) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  } catch {
    // Silent — will retry on user click
  }
}

export async function prepareSpotifyPlayback() {
  const player = await getSpotifyPlayer(); // instant if pre-warmed
  // activateElement() must be called as close to the user gesture as possible
  if (typeof player.activateElement === 'function') {
    await player.activateElement();
  }
  await ensureSpotifyDevice();
  return true;
}

export async function getSpotifyDiagnostics() {
  const token = readToken();
  if (!token?.access_token) {
    return {
      ok: false,
      message: 'Spotify no está conectado.'
    };
  }

  try {
    const [profile, devices] = await Promise.all([
      spotifyFetch('https://api.spotify.com/v1/me'),
      spotifyFetch('https://api.spotify.com/v1/me/player/devices')
    ]);
    const product = profile?.product || 'unknown';
    const hasPremium = product === 'premium';

    return {
      ok: hasPremium,
      product,
      devices: devices?.devices || [],
      deviceId: spotifyDeviceId,
      sdkError: lastSpotifySdkError,
      message: hasPremium
        ? 'Cuenta Premium detectada. Ya puedes probar sonido.'
        : 'Esta cuenta no aparece como Premium. Para sonar dentro del juego necesita Premium completo.'
    };
  } catch (error) {
    return {
      ok: false,
      sdkError: lastSpotifySdkError,
      message: error.message
    };
  }
}

export function explainSpotifyError(error) {
  const message = String(error?.message || error || '');
  if (message.includes('invalid_grant')) return 'La conexión con Spotify expiró. Pulsa Reconectar e inicia sesión otra vez.';
  if (message.includes('403')) return 'Spotify necesita una cuenta Premium para sonar dentro del juego.';
  if (message.includes('404')) return 'No encontramos un dispositivo de reproducción. Pulsa Probar sonido otra vez.';
  if (message.includes('401')) return 'La sesión de Spotify expiró. Pulsa Reconectar.';
  if (message.includes('429')) return 'Spotify recibió demasiados intentos. Espera unos segundos y vuelve a probar.';
  if (message.includes('Premium')) return message;
  if (message.includes('bloqueó') || message.includes('bloqueo')) return 'El navegador bloqueó el audio. Toca el vinilo de play una vez más.';
  if (lastSpotifySdkError) return 'Spotify no pudo sonar ahora. Revisa tu cuenta Premium y prueba otra vez.';
  return 'Spotify no pudo iniciar la música. Revisa tu conexión y vuelve a probar.';
}

async function waitForDevice(ms = 250, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (spotifyDeviceId) return true;
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  return false;
}

async function ensureSpotifyDevice() {
  const player = await getSpotifyPlayer();

  if (await waitForDevice()) {
    await spotifyFetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false })
    });
    return spotifyDeviceId;
  }

  // Device didn't appear — SDK may have disconnected mid-session.
  // Disconnect cleanly, reset state, and reconnect once before giving up.
  try { player.disconnect(); } catch { /* ignore */ }
  spotifyPlayerPromise = null;
  spotifyDeviceId = null;

  await getSpotifyPlayer();

  if (await waitForDevice()) {
    await spotifyFetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false })
    });
    return spotifyDeviceId;
  }

  throw new Error('Spotify no entregó un dispositivo de reproducción. Revisa Premium y prueba de nuevo.');
}

export function getPlaylistId(playlistUrl) {
  const match = String(playlistUrl || '').match(/(?:playlist\/|spotify:playlist:)([A-Za-z0-9]+)/);
  if (match?.[1]) return match[1];
  if (/^[A-Za-z0-9]{16,}$/.test(String(playlistUrl || '').trim())) return String(playlistUrl).trim();
  return null;
}

function readPlayedTracks() {
  try {
    return JSON.parse(window.sessionStorage.getItem(PLAYED_TRACKS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePlayedTracks(value) {
  window.sessionStorage.setItem(PLAYED_TRACKS_KEY, JSON.stringify(value));
}

function trackFromCatalogRow(row) {
  return {
    uri: row.spotify_uri || `spotify:track:${row.spotify_track_id}`,
    name: row.title,
    artist: row.artist_main || 'Artista sorpresa',
    releaseYear: Number(row.release_year) || null,
    albumImage: row.cover_url || null,
    coverUrl: row.cover_url || '',
    spotifyUrl: row.spotify_url || ''
  };
}

async function loadSongCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Catalogo no disponible: ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

async function getCatalogTracks(playlistId) {
  try {
    const catalog = await loadSongCatalog();
    return catalog
      .filter((row) => row.playlist_id === playlistId && (row.spotify_uri || row.spotify_track_id))
      .map(trackFromCatalogRow);
  } catch (error) {
    console.warn('No se pudo usar el catalogo local:', error);
    return [];
  }
}

function pickTrackWithoutRepeating(playlistUrl, tracks) {
  const playlistId = getPlaylistId(playlistUrl) || 'default';

  if (playlistId !== currentGamePlaylistId) {
    currentGamePlaylistId = playlistId;
    usedArtistsThisGame = new Set();
  }

  const played = readPlayedTracks();
  const alreadyPlayed = new Set(played[playlistId] || []);
  let availableTracks = tracks.filter((track) => !alreadyPlayed.has(track.uri));

  if (!availableTracks.length) {
    availableTracks = tracks;
    alreadyPlayed.clear();
    usedArtistsThisGame = new Set();
  }

  const track = availableTracks[Math.floor(Math.random() * availableTracks.length)];
  alreadyPlayed.add(track.uri);
  played[playlistId] = Array.from(alreadyPlayed);
  savePlayedTracks(played);
  return track;
}

export async function getPlaylistTracks(playlistUrl) {
  const playlistId = getPlaylistId(playlistUrl);
  if (!playlistId) throw new Error('El enlace de Spotify no parece una playlist válida.');

  const catalogTracks = await getCatalogTracks(playlistId);
  if (catalogTracks.length) return catalogTracks;

  return fetchPlaylistTracksFromSpotify(playlistId);
}


async function fetchPlaylistTracksFromSpotify(playlistId) {
  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(uri,type,name,artists(name),album(release_date,images))),next`;

  while (url) {
    const data = await spotifyFetch(url);
    tracks.push(
      ...data.items
        .map((item) => item.track)
        .filter((track) => track?.type === 'track' && track.uri)
        .map((track) => ({
          uri: track.uri,
          name: track.name,
          artist: track.artists?.[0]?.name || 'Artista sorpresa',
          releaseYear: Number(String(track.album?.release_date || '').slice(0, 4)) || null,
          albumImage: track.album?.images?.[0]?.url || null
        }))
    );
    url = data.next;
  }

  if (!tracks.length) throw new Error('No encontre canciones reproducibles en esta playlist.');
  return tracks;
}

function buildTimelineYears(songYear, round = 1) {
  const anchorSets = [
    [2000],
    [1995, 2005],
    [1990, 2000, 2010],
    [1985, 1995, 2005, 2015],
    [1980, 1990, 2000, 2010, 2020]
  ];
  const years = anchorSets[Math.min(anchorSets.length - 1, Math.max(0, Number(round || 1) - 1))];
  return [...years].sort((a, b) => a - b);
}

function getTimelineYearsForRound(songYear, round, timelineYears = []) {
  const savedYears = [...(timelineYears || []).map(Number).filter(Boolean)]
    .sort((a, b) => a - b)
    .slice(0, 20);

  if (savedYears.length) return savedYears;
  return buildTimelineYears(songYear, round).slice(0, 20);
}

const ARTIST_DISTRACTORS = [
  'Bad Bunny', 'Rosalía', 'J Balvin', 'Ozuna', 'Shakira', 'Maluma',
  'Anuel AA', 'Karol G', 'Rauw Alejandro', 'Daddy Yankee', 'Nicky Jam',
  'Feid', 'Myke Towers', 'Jhay Cortez', 'Sech', 'Lunay', 'Bizarrap',
  'C. Tangana', 'Dua Lipa', 'The Weeknd', 'Drake', 'Ed Sheeran',
  'Becky G', 'Sebastian Yatra', 'Luis Fonsi', 'Enrique Iglesias'
];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function buildArtistQuestion(track, text, type = 'Identidad') {
  let pool = [];

  if (currentGamePlaylistId) {
    try {
      const catalog = await loadSongCatalog();
      const genreArtists = catalog
        .filter((row) => row.playlist_id === currentGamePlaylistId && row.artist_main && row.artist_main !== track.artist)
        .map((row) => row.artist_main);
      const unique = [...new Set(genreArtists)];
      const fresh = unique.filter((a) => !usedArtistsThisGame.has(a));
      pool = fresh.length >= 3 ? fresh : unique;
    } catch {
      // fall through to default
    }
  }

  if (pool.length < 3) {
    pool = ARTIST_DISTRACTORS.filter((a) => a !== track.artist);
  }

  const distractors = shuffleArray(pool).slice(0, 3);
  usedArtistsThisGame.add(track.artist);
  distractors.forEach((a) => usedArtistsThisGame.add(a));

  const options = shuffleArray([track.artist, ...distractors]);
  return {
    mode: 'pulse',
    type,
    text,
    options,
    correct: options.indexOf(track.artist)
  };
}

const YEAR_QUESTION_TEXTS = [
  'En que ano salio esta cancion?',
  'De que ano es este temazo?',
  'Cuando se lanzo esta cancion?',
];

function buildYearQuestion(track) {
  if (!track.releaseYear) return null;
  const year = track.releaseYear;
  const offsets = shuffleArray([-6, -4, -2, 2, 4, 6, 8, -8]).slice(0, 3);
  const options = shuffleArray([String(year), ...offsets.map((off) => String(year + off))]);
  const text = YEAR_QUESTION_TEXTS[Math.floor(Math.random() * YEAR_QUESTION_TEXTS.length)];
  return {
    mode: 'pulse',
    type: 'Año',
    text,
    options,
    correct: options.indexOf(String(year))
  };
}

function buildDecadeQuestion(track) {
  if (!track.releaseYear) return null;
  const year = track.releaseYear;
  const decade = Math.floor(year / 10) * 10;
  const decadeStr = (d) => `Años ${d}`;
  const allDecades = [1980, 1990, 2000, 2010, 2020].map(decadeStr);
  const correctLabel = decadeStr(decade);
  if (!allDecades.includes(correctLabel)) return null;
  return {
    mode: 'pulse',
    type: 'Epoca',
    text: 'En que epoca salio esta cancion?',
    options: allDecades,
    correct: allDecades.indexOf(correctLabel)
  };
}

const SONG_QUESTION_TEXTS = [
  'Cual es el titulo de esta cancion?',
  'Como se llama esta cancion?',
  'Cual es el nombre de este tema?',
];

async function buildSongNameQuestion(track) {
  if (!track.name) return null;

  let pool = [];
  if (currentGamePlaylistId) {
    try {
      const catalog = await loadSongCatalog();
      const others = catalog
        .filter((row) => row.playlist_id === currentGamePlaylistId && row.title && row.title !== track.name)
        .map((row) => row.title);
      pool = [...new Set(others)];
    } catch { /* fall through to null */ }
  }

  if (pool.length < 3) return null;

  const distractors = shuffleArray(pool).slice(0, 3);
  const options = shuffleArray([track.name, ...distractors]);
  const text = SONG_QUESTION_TEXTS[Math.floor(Math.random() * SONG_QUESTION_TEXTS.length)];
  return {
    mode: 'pulse',
    type: 'Cancion',
    text,
    options,
    correct: options.indexOf(track.name)
  };
}

const ARTIST_QUESTION_TEXTS = [
  ['Quien canta principalmente esta cancion?', 'Identidad'],
  ['A que artista pertenece esta voz?', 'Reconoce la voz'],
  ['Quien es el interprete de esta cancion?', 'Interprete'],
  ['Quien firma este temazo?', 'Artista'],
];

// Structured cycle: guarantees variety across rounds.
// Falls back to the next available type if the preferred one can't be built.
const PULSE_CYCLE = ['artist', 'song', 'year', 'artist', 'decade', 'song', 'year', 'artist'];

export async function createQuestionFromTrack(track, gameMode, round = 1, timelineYears = []) {
  const year = track.releaseYear || 2016;

  if (gameMode === 'timeline') {
    const roundTimelineYears = getTimelineYearsForRound(year, round, timelineYears);
    const correct = roundTimelineYears.filter((timelineYear) => timelineYear <= year).length;

    return {
      mode: 'timeline',
      answerType: 'timeline-placement',
      type: 'Años Locos',
      text: '¿Dónde encaja esta canción en tu ruta de años?',
      timelineYears: roundTimelineYears,
      songYear: year,
      options: Array.from({ length: roundTimelineYears.length + 1 }, (_, index) => String(index)),
      correct
    };
  }

  // Pulse mode: pick question type from the cycle, fall back if unavailable.
  const [qText, qType] = ARTIST_QUESTION_TEXTS[Math.floor(Math.random() * ARTIST_QUESTION_TEXTS.length)];

  const build = async (type) => {
    if (type === 'artist') return buildArtistQuestion(track, qText, qType);
    if (type === 'song')   return buildSongNameQuestion(track);
    if (type === 'year')   return buildYearQuestion(track);
    if (type === 'decade') return buildDecadeQuestion(track);
    return null;
  };

  const preferred = PULSE_CYCLE[(round - 1) % PULSE_CYCLE.length];
  const q = await build(preferred);
  if (q) return q;

  // Fallback: try remaining types in a sensible priority order.
  const fallbacks = ['artist', 'song', 'year', 'decade'].filter((t) => t !== preferred);
  for (const type of fallbacks) {
    const fallback = await build(type);
    if (fallback) return fallback;
  }

  return buildArtistQuestion(track, qText, qType);
}

// Reproduce una pista ya elegida (a diferencia de startRandomPlaylistTrack, que
// además la escoge al azar).
async function playChosenTrack(track) {
  const deviceId = await ensureSpotifyDevice();
  window.sessionStorage.setItem(TRACK_KEY, JSON.stringify(track));

  await spotifyFetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [track.uri], position_ms: 0 })
  });

  return track;
}

export async function startRandomPlaylistTrack(playlistUrl) {
  const tracks = await getPlaylistTracks(playlistUrl);
  const track = pickTrackWithoutRepeating(playlistUrl, tracks);
  return playChosenTrack(track);
}

export function getCurrentHiddenTrack() {
  try {
    return JSON.parse(window.sessionStorage.getItem(TRACK_KEY) || 'null');
  } catch {
    return null;
  }
}

export async function pauseSpotifyPlayback() {
  await spotifyFetch('https://api.spotify.com/v1/me/player/pause', { method: 'PUT' });
}

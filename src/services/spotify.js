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
    throw new Error(`Spotify token error ${response.status}: ${text}`);
  }

  return saveToken(await response.json());
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

  const refreshed = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
    client_id: SPOTIFY_CLIENT_ID
  });

  if (!refreshed.refresh_token) {
    refreshed.refresh_token = token.refresh_token;
    saveToken(refreshed);
  }

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
      getOAuthToken: async (callback) => callback(await getSpotifyAccessToken()),
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

export async function prepareSpotifyPlayback() {
  const player = await getSpotifyPlayer();
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
  if (message.includes('403')) return 'Spotify no dejó iniciar la música. Revisa que la cuenta sea Premium y vuelve a conectar.';
  if (message.includes('404')) return 'No encontramos donde reproducir. Pulsa Conectar Spotify y luego Probar.';
  if (message.includes('401')) return 'La sesión de Spotify expiró. Pulsa Reconectar.';
  if (lastSpotifySdkError) return lastSpotifySdkError;
  return message || 'Spotify no pudo iniciar la reproducción.';
}

async function ensureSpotifyDevice() {
  await getSpotifyPlayer();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (spotifyDeviceId) {
      await spotifyFetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false })
      });
      return spotifyDeviceId;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
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
  const played = readPlayedTracks();
  const alreadyPlayed = new Set(played[playlistId] || []);
  let availableTracks = tracks.filter((track) => !alreadyPlayed.has(track.uri));

  if (!availableTracks.length) {
    availableTracks = tracks;
    alreadyPlayed.clear();
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

  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(uri,type,name,artists(name),album(release_date))),next`;

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
          releaseYear: Number(String(track.album?.release_date || '').slice(0, 4)) || null
        }))
    );
    url = data.next;
  }

  if (!tracks.length) throw new Error('No encontré canciones reproducibles en esta playlist.');
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
  return [...new Set(years.filter((year) => year !== songYear))].sort((a, b) => a - b);
}

function getTimelineYearsForRound(songYear, round, timelineYears = []) {
  const savedYears = [...new Set((timelineYears || []).map(Number).filter(Boolean))]
    .filter((timelineYear) => timelineYear !== songYear)
    .sort((a, b) => a - b)
    .slice(0, 12);

  if (savedYears.length) return savedYears;
  return buildTimelineYears(songYear, round).slice(0, 12);
}

export function createQuestionFromTrack(track, gameMode, round = 1, timelineYears = []) {
  const year = track.releaseYear || 2016;

  if (gameMode === 'timeline') {
    const roundTimelineYears = getTimelineYearsForRound(year, round, timelineYears);
    const correct = roundTimelineYears.filter((timelineYear) => timelineYear < year).length;

    return {
      mode: 'timeline',
      answerType: 'timeline-placement',
      type: 'Línea del Ritmo',
      text: '¿Dónde encaja esta canción en la línea?',
      timelineYears: roundTimelineYears,
      songYear: year,
      options: Array.from({ length: roundTimelineYears.length + 1 }, (_, index) => String(index)),
      correct
    };
  }

  if (gameMode === 'chaos') {
    return {
      mode: 'chaos',
      type: 'Remix Salvaje',
      text: '¿Qué jugada conviene después de escuchar este corte?',
      options: ['Guardar puntos', 'Activar sabotaje', 'Arriesgar respuesta', 'Cambiar playlist'],
      correct: 2
    };
  }

  const artistOptions = [track.artist, 'Bad Bunny', 'Rosalia', 'Shakira'];
  const uniqueOptions = [...new Set(artistOptions)].slice(0, 4);

  return {
    mode: 'pulse',
    type: 'Identidad',
    text: '¿Quién canta principalmente este corte?',
    options: uniqueOptions,
    correct: uniqueOptions.indexOf(track.artist)
  };
}

export async function startRandomPlaylistTrack(playlistUrl) {
  const deviceId = await ensureSpotifyDevice();
  const tracks = await getPlaylistTracks(playlistUrl);
  const track = pickTrackWithoutRepeating(playlistUrl, tracks);
  window.sessionStorage.setItem(TRACK_KEY, JSON.stringify(track));

  await spotifyFetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [track.uri], position_ms: 0 })
  });

  return track;
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


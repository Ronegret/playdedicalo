const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '8d753e32e5c34713baa3cee821bb85ad';
const TOKEN_KEY = 'dedicalo_spotify_token';
const VERIFIER_KEY = 'dedicalo_spotify_verifier';
const TRACK_KEY = 'dedicalo_current_spotify_track';
const PLAYER_NAME = 'Dedicalo Host Player';

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
  if (!token) throw new Error('Spotify no esta conectado.');
  if (Date.now() < Number(token.expires_at || 0)) return token.access_token;
  if (!token.refresh_token) throw new Error('La sesion de Spotify expiro. Vuelve a conectar Spotify.');

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
    throw new Error(`Spotify API error ${response.status}: ${text}`);
  }

  return response.status === 204 ? null : response.json();
}

function loadSpotifySdk() {
  if (window.Spotify) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
    const timeout = window.setTimeout(() => reject(new Error('Spotify Web Playback SDK tardo demasiado en cargar.')), 10000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => reject(new Error('No se pudo cargar Spotify Web Playback SDK.'));
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
      console.error('Spotify initialization_error:', message);
    });
    player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify authentication_error:', message);
    });
    player.addListener('account_error', ({ message }) => {
      console.error('Spotify account_error:', message);
    });
    player.addListener('playback_error', ({ message }) => {
      console.error('Spotify playback_error:', message);
    });

    await player.connect();
    return player;
  })();

  return spotifyPlayerPromise;
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

  throw new Error('Spotify no entrego un dispositivo de reproduccion. Revisa Premium y prueba de nuevo.');
}

export function getPlaylistId(playlistUrl) {
  const match = String(playlistUrl || '').match(/(?:playlist\/|spotify:playlist:)([A-Za-z0-9]+)/);
  if (match?.[1]) return match[1];
  if (/^[A-Za-z0-9]{16,}$/.test(String(playlistUrl || '').trim())) return String(playlistUrl).trim();
  return null;
}

export async function getPlaylistTracks(playlistUrl) {
  const playlistId = getPlaylistId(playlistUrl);
  if (!playlistId) throw new Error('El enlace de Spotify no parece una playlist valida.');

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

  if (!tracks.length) throw new Error('No encontre canciones reproducibles en esta playlist.');
  return tracks;
}

export function createQuestionFromTrack(track, gameMode) {
  const year = track.releaseYear || 2016;

  if (gameMode === 'timeline') {
    const years = [year - 8, year - 2, year, year + 5]
      .map((value) => Math.max(1950, value))
      .sort((a, b) => a - b);
    const correct = years.indexOf(year);

    return {
      mode: 'timeline',
      type: 'Linea del Ritmo',
      text: 'Coloca esta cancion en la linea de anos.',
      options: years.map(String),
      correct: correct >= 0 ? correct : 2
    };
  }

  if (gameMode === 'chaos') {
    return {
      mode: 'chaos',
      type: 'Remix Salvaje',
      text: 'Que jugada conviene despues de escuchar este corte?',
      options: ['Guardar puntos', 'Activar sabotaje', 'Arriesgar respuesta', 'Cambiar playlist'],
      correct: 2
    };
  }

  const artistOptions = [track.artist, 'Bad Bunny', 'Rosalia', 'Shakira'];
  const uniqueOptions = [...new Set(artistOptions)].slice(0, 4);

  return {
    mode: 'pulse',
    type: 'Identidad',
    text: 'Quien canta principalmente este corte?',
    options: uniqueOptions,
    correct: uniqueOptions.indexOf(track.artist)
  };
}

export async function startRandomPlaylistTrack(playlistUrl) {
  const deviceId = await ensureSpotifyDevice();
  const tracks = await getPlaylistTracks(playlistUrl);
  const track = tracks[Math.floor(Math.random() * tracks.length)];
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

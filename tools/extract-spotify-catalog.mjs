import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const PLAYLISTS = [
  {
    style: 'Los Mejores Reggaeton de la Historia',
    slug: 'reggaeton-historia',
    url: 'https://open.spotify.com/playlist/64B6t8la0Rf3JTTaBXiNcm'
  },
  {
    style: 'HITS de todos los tiempos',
    slug: 'hits-todos-los-tiempos',
    url: 'https://open.spotify.com/playlist/0f3YRJO2HyZTpCLCVxzBt0'
  },
  {
    style: 'Rock Latino',
    slug: 'rock-latino',
    url: 'https://open.spotify.com/playlist/07iEAd20wfnMh8VfbmovYG'
  },
  {
    style: 'Mix Latino',
    slug: 'mix-latino',
    url: 'https://open.spotify.com/playlist/2UBikaEIZWV9LOAjE0dBgx'
  },
  {
    style: 'Bailable de todos los tiempos',
    slug: 'bailable-todos-los-tiempos',
    url: 'https://open.spotify.com/playlist/7FnGVaOj5s9JvAUtvZENfC'
  },
  {
    style: 'Romanticos',
    slug: 'romanticos',
    url: 'https://open.spotify.com/playlist/3dmrZtJOYx1naGoLtyHFOk'
  },
  {
    style: 'Perreo Clasico',
    slug: 'perreo-clasico',
    url: 'https://open.spotify.com/playlist/2aatYbsZb0ZiY3aQjcVSw2'
  },
  {
    style: 'Temazos Espanoles',
    slug: 'temazos-espanoles',
    url: 'https://open.spotify.com/playlist/7bsAMCUlTcMTGzG1RzxWTX'
  },
  {
    style: 'Rock Ska Espanolisimo',
    slug: 'rock-ska-espanolisimo',
    url: 'https://open.spotify.com/playlist/6ZcRMfq1UCg0QzC2KkopvV'
  },
  {
    style: 'De To2',
    slug: 'de-to2',
    url: 'https://open.spotify.com/playlist/0Pn8mtBmo8HDfuKiky5tNj'
  },
  {
    style: 'Fiestas en el Pueblo',
    slug: 'fiestas-en-el-pueblo',
    url: 'https://open.spotify.com/playlist/5kkHb7jc3WocICRywvY6Yz'
  },
  {
    style: 'Just Go',
    slug: 'just-go',
    url: 'https://open.spotify.com/playlist/0yUgOnkSswjzWwNxI2QjNC'
  }
];

const OUTPUT_DIR = path.resolve('catalog-output');
const USER_TOKEN_PATH = path.resolve('.spotify-user-token.json');
const REDIRECT_URI = 'http://127.0.0.1:5173/spotify/callback';
const CSV_COLUMNS = [
  'playlist_source',
  'playlist_id',
  'style',
  'style_slug',
  'spotify_track_id',
  'spotify_url',
  'title',
  'artist_main',
  'artists_all',
  'release_year',
  'release_date',
  'album',
  'duration_ms',
  'duration_seconds',
  'cover_url',
  'preview_url',
  'popularity',
  'explicit',
  'difficulty',
  'tags',
  'question_artist',
  'question_year',
  'question_timeline_year',
  'question_title',
  'needs_review',
  'notes'
];

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data);
}

function getPlaylistId(url) {
  const match = String(url).match(/playlist\/([A-Za-z0-9]+)/);
  if (!match) throw new Error(`No pude leer el ID de playlist: ${url}`);
  return match[1];
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function getDifficulty(popularity, releaseYear) {
  if (popularity >= 70) return 'easy';
  if (popularity >= 45 || releaseYear >= 2018) return 'medium';
  return 'hard';
}

function getTags(styleSlug, releaseYear, popularity) {
  const tags = [styleSlug];
  if (releaseYear) {
    tags.push(`${Math.floor(releaseYear / 10) * 10}s`);
    if (releaseYear < 2000) tags.push('clasico');
    if (releaseYear >= 2020) tags.push('actual');
  }
  if (popularity >= 70) tags.push('reconocible');
  return [...new Set(tags)];
}

function buildQuestions(track) {
  const artistOptions = [track.artist_main, 'Bad Bunny', 'Shakira', 'Daddy Yankee']
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);
  while (artistOptions.length < 4) artistOptions.push(`Opcion ${artistOptions.length + 1}`);

  const year = Number(track.release_year || 0);
  const yearOptions = year
    ? [year - 2, year, year + 2, year + 5].map(String)
    : ['', '', '', ''];

  return {
    question_artist: JSON.stringify({
      text: 'Quien canta principalmente este tema?',
      options: artistOptions,
      correct: artistOptions.indexOf(track.artist_main)
    }),
    question_year: JSON.stringify({
      text: 'En que ano salio esta cancion?',
      options: yearOptions,
      correct: year ? yearOptions.indexOf(String(year)) : -1
    }),
    question_timeline_year: year ? String(year) : '',
    question_title: JSON.stringify({
      text: 'Cual es el titulo de este tema?',
      answer: track.title
    })
  };
}

async function getAccessToken() {
  try {
    const savedToken = JSON.parse(await fs.readFile(USER_TOKEN_PATH, 'utf8'));
    if (savedToken?.access_token && Date.now() < Number(savedToken.expires_at || 0)) {
      return savedToken.access_token;
    }
    if (savedToken?.refresh_token) {
      const env = parseEnv(await fs.readFile('.env', 'utf8'));
      const refreshed = await requestSpotifyToken({
        grant_type: 'refresh_token',
        refresh_token: savedToken.refresh_token,
        client_id: env.VITE_SPOTIFY_CLIENT_ID
      });
      const nextToken = saveUserToken({ ...refreshed, refresh_token: refreshed.refresh_token || savedToken.refresh_token });
      return nextToken.access_token;
    }
  } catch {
    // No saved user token yet.
  }

  const env = parseEnv(await fs.readFile('.env', 'utf8'));
  const clientId = env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = env.VITE_SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Faltan VITE_SPOTIFY_CLIENT_ID y/o VITE_SPOTIFY_CLIENT_SECRET en .env');

  const token = await requestSpotifyToken(
    { grant_type: 'client_credentials' },
    {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    }
  );
  return token.access_token;
}

async function requestSpotifyToken(body, extraHeaders = {}) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...extraHeaders
    },
    body: new URLSearchParams(body)
  });
  if (!response.ok) throw new Error(`Spotify token error ${response.status}: ${await response.text()}`);
  return response.json();
}

function saveUserToken(token) {
  const expiresIn = Number(token.expires_in || 3600);
  const nextToken = {
    ...token,
    expires_at: Date.now() + expiresIn * 1000 - 60000
  };
  return fs.writeFile(USER_TOKEN_PATH, JSON.stringify(nextToken, null, 2), 'utf8').then(() => nextToken);
}

async function runOAuth() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const env = parseEnv(await fs.readFile('.env', 'utf8'));
  const clientId = env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error('Falta VITE_SPOTIFY_CLIENT_ID en .env');

  const verifier = randomString();
  const challenge = base64UrlEncode(await sha256(verifier));
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', 'playlist-read-private playlist-read-collaborative user-read-private');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);

  await fs.writeFile(path.join(OUTPUT_DIR, 'spotify-auth-url.txt'), authUrl.toString(), 'utf8');
  console.log(`Abre esta URL para autorizar Spotify:\n${authUrl}`);

  const code = await new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const callbackUrl = new URL(request.url || '/', REDIRECT_URI);
      if (callbackUrl.pathname !== '/spotify/callback') {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      const error = callbackUrl.searchParams.get('error');
      if (error) {
        response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(`<h1>Spotify error</h1><p>${error}</p>`);
        reject(new Error(error));
        server.close();
        return;
      }
      const authCode = callbackUrl.searchParams.get('code');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<h1>Spotify autorizado</h1><p>Ya puedes volver a Codex.</p>');
      resolve(authCode);
      server.close();
    });
    server.listen(5173, '127.0.0.1');
  });

  if (!code) throw new Error('Spotify no devolvio codigo de autorizacion.');
  const token = await requestSpotifyToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier
  });
  await saveUserToken(token);
  console.log(`Token guardado en ${USER_TOKEN_PATH}`);
}

async function spotifyGet(url, accessToken, attempt = 0) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 429 && attempt < 5) {
    const retryAfter = Number(response.headers.get('retry-after') || 2);
    await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
    return spotifyGet(url, accessToken, attempt + 1);
  }
  if (!response.ok) throw new Error(`Spotify API error ${response.status}: ${await response.text()}`);
  return response.json();
}

async function fetchPublicPreviewTrackIds(playlistId) {
  const response = await fetch(`https://open.spotify.com/playlist/${playlistId}`);
  if (!response.ok) throw new Error(`Spotify public page error ${response.status}: ${await response.text()}`);
  const html = await response.text();
  return [
    ...new Set(
      [...html.matchAll(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/g)].map((match) => match[1])
    )
  ];
}

async function fetchTrackById(trackId, accessToken) {
  return spotifyGet(`https://api.spotify.com/v1/tracks/${trackId}`, accessToken);
}

function rowFromTrack(track, playlist, playlistId, extractionMode) {
  const releaseDate = track.album?.release_date || '';
  const releaseYear = Number(releaseDate.slice(0, 4)) || '';
  const artistMain = track.artists?.[0]?.name || '';
  const artistsAll = (track.artists || []).map((artist) => artist.name).join(', ');
  const popularity = Number(track.popularity || 0);
  const base = {
    playlist_source: playlist.style,
    playlist_id: playlistId,
    style: playlist.style,
    style_slug: playlist.slug,
    spotify_track_id: track.id,
    spotify_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    title: track.name || '',
    artist_main: artistMain,
    artists_all: artistsAll,
    release_year: releaseYear,
    release_date: releaseDate,
    album: track.album?.name || '',
    duration_ms: track.duration_ms || '',
    duration_seconds: track.duration_ms ? Math.round(track.duration_ms / 1000) : '',
    cover_url: track.album?.images?.[0]?.url || '',
    preview_url: track.preview_url || '',
    popularity,
    explicit: Boolean(track.explicit),
    difficulty: getDifficulty(popularity, releaseYear),
    tags: getTags(playlist.slug, releaseYear, popularity),
    needs_review: extractionMode !== 'spotify_api_full' || !releaseYear || releaseDate.length < 4 || popularity < 20,
    notes: extractionMode === 'public_preview_limited' ? 'public preview extraction; playlist may contain more tracks' : ''
  };
  return { ...base, ...buildQuestions(base) };
}

async function fetchPlaylistTracks(playlist, accessToken) {
  const playlistId = getPlaylistId(playlist.url);
  const rows = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,type,name,artists(name),album(name,release_date,images),duration_ms,external_urls,preview_url,popularity,explicit)),next,total`;

  try {
    while (url) {
      const data = await spotifyGet(url, accessToken);
      for (const item of data.items || []) {
        const track = item.track;
        if (!track || track.type !== 'track' || !track.id) continue;
        rows.push(rowFromTrack(track, playlist, playlistId, 'spotify_api_full'));
      }
      url = data.next;
    }
    return rows;
  } catch (error) {
    if (!String(error.message).includes('403')) throw error;
    console.warn(`  API bloqueada para tracks. Usando preview publico limitado: ${playlist.style}`);
    const trackIds = await fetchPublicPreviewTrackIds(playlistId);
    for (const trackId of trackIds) {
      const track = await fetchTrackById(trackId, accessToken);
      rows.push(rowFromTrack(track, playlist, playlistId, 'public_preview_limited'));
    }
    return rows;
  }
}

async function main() {
  if (process.argv.includes('--oauth')) {
    await runOAuth();
    return;
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const accessToken = await getAccessToken();
  const allRows = [];
  const playlistSummary = [];

  for (const playlist of PLAYLISTS) {
    console.log(`Extrayendo: ${playlist.style}`);
    const rows = await fetchPlaylistTracks(playlist, accessToken);
    playlistSummary.push({
      style: playlist.style,
      style_slug: playlist.slug,
      playlist_url: playlist.url,
      tracks_found: rows.length
    });
    allRows.push(...rows);
  }

  const byTrackId = new Map();
  const duplicates = [];
  for (const row of allRows) {
    if (byTrackId.has(row.spotify_track_id)) {
      const original = byTrackId.get(row.spotify_track_id);
      duplicates.push({
        spotify_track_id: row.spotify_track_id,
        title: row.title,
        artist_main: row.artist_main,
        original_style: original.style,
        duplicate_style: row.style
      });
      original.tags = [...new Set([...original.tags, row.style_slug])];
      original.notes = original.notes ? `${original.notes}; also in ${row.style}` : `also in ${row.style}`;
      continue;
    }
    byTrackId.set(row.spotify_track_id, row);
  }

  const cleanRows = [...byTrackId.values()].map((row, index) => ({
    id: `${slugify(row.artist_main)}-${slugify(row.title)}-${row.spotify_track_id.slice(0, 6)}`,
    catalog_index: index + 1,
    ...row,
    tags: row.tags.join('|')
  }));

  const csv = [
    ['id', 'catalog_index', ...CSV_COLUMNS].join(','),
    ...cleanRows.map((row) => ['id', 'catalog_index', ...CSV_COLUMNS].map((column) => csvEscape(row[column])).join(','))
  ].join('\n');

  await fs.writeFile(path.join(OUTPUT_DIR, 'dedicalo-song-catalog.clean.json'), JSON.stringify(cleanRows, null, 2), 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'dedicalo-song-catalog.raw.json'), JSON.stringify(allRows, null, 2), 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'dedicalo-song-catalog.csv'), csv, 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'dedicalo-song-catalog.playlists.json'), JSON.stringify(playlistSummary, null, 2), 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'dedicalo-song-catalog.duplicates.json'), JSON.stringify(duplicates, null, 2), 'utf8');

  console.log(JSON.stringify({
    playlists: playlistSummary.length,
    raw_tracks: allRows.length,
    unique_tracks: cleanRows.length,
    duplicates: duplicates.length,
    output_dir: OUTPUT_DIR
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

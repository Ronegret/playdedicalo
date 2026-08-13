import fs from 'node:fs/promises';
import path from 'node:path';

const CATALOG_PATH = 'public/data/dedicalo-song-catalog.full.clean.json';
const CAPTURE_DIR = path.resolve('catalog-output', 'captured-playlists');

const PLAYLIST_IMPORTS = [
  {
    playlist_source: 'HITSTER - 100% Espanol',
    playlist_id: '1C3NDNNfg6c0SlPhyikGVU',
    playlist_owner: 'HITSTER',
    style: 'Espanol 100%',
    style_slug: 'espanol-100',
    minimum_rows: 101
  },
  {
    playlist_source: 'HITSTER - Espanol Temazos',
    playlist_id: '0i8fEuY6ffN6Ou53BeIcxY',
    playlist_owner: 'HITSTER',
    style: 'Temazos',
    style_slug: 'temazos',
    minimum_rows: 101
  },
  {
    playlist_source: 'HITSTER - Espanol Summer Party',
    playlist_id: '0UY3oVANXRqflE5QjHhaH4',
    playlist_owner: 'HITSTER',
    style: 'Espanol Summer Party',
    style_slug: 'espanol-summer-party',
    minimum_rows: 101
  },
  {
    playlist_source: 'HITSTER - Espanol',
    playlist_id: '5TOMoP3KEWtRASGeFsksUY',
    playlist_owner: 'HITSTER',
    style: 'Hits de todo el tiempo',
    style_slug: 'hits-todo-tiempo',
    minimum_rows: 101
  },
  {
    playlist_source: 'HITSTER - Espanol Rock',
    playlist_id: '2cT61hYCfIkwHAyVMwej9D',
    playlist_owner: 'HITSTER',
    style: 'Hits Rock Espanol',
    style_slug: 'hits-rock-espanol',
    minimum_rows: 101
  },
  {
    playlist_source: 'LAS MEJORES CANCIONES DE TODOS LOS TIEMPOS',
    playlist_id: '0f3YRJO2HyZTpCLCVxzBt0',
    playlist_owner: 'Emiliano Palomo',
    style: 'Mejores de todos los tiempos',
    style_slug: 'mejores-todos-tiempos',
    minimum_rows: 500
  },
  {
    playlist_source: 'FIESTAS DE PUEBLO : Temazos de Fiesta Mayor & Verbenas',
    playlist_id: '7xcdrzs58PmLIZa4P5Qk3s',
    playlist_owner: 'Filtr Exitos',
    style: 'Temazos Fiesta Mayor y Verbena',
    style_slug: 'fiesta-mayor-verbena',
    minimum_rows: 101
  },
  {
    playlist_source: 'FIESTAS DE PUEBLO',
    playlist_id: '4OoS8qoueVgm5PpuDUlOwH',
    playlist_owner: 'Erigarmar',
    style: 'Fiesta del Pueblo',
    style_slug: 'fiesta-del-pueblo',
    minimum_rows: 101
  }
];

const selectedSlug = process.argv.find((arg) => arg.startsWith('--playlist='))?.split('=')[1];
const selected = selectedSlug
  ? PLAYLIST_IMPORTS.filter((playlist) => playlist.style_slug === selectedSlug || playlist.playlist_id === selectedSlug)
  : PLAYLIST_IMPORTS;

if (!selected.length) {
  throw new Error(`Playlist no reconocida: ${selectedSlug}`);
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

function parseDurationSeconds(value) {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseRowText(rowText) {
  const parts = String(rowText || '').split('\n').map((part) => part.trim()).filter(Boolean);
  const duration = parts.findLast((part) => /^\d{1,2}:\d{2}$/.test(part)) || '';
  const withoutDecorations = parts.filter((part) => ![
    'E',
    'Video musical',
    'Vídeo musical',
    '•',
    'Añadir a lista',
    'Anadir a lista'
  ].includes(part));

  return {
    title: withoutDecorations[1] || withoutDecorations[0] || '',
    artists_all: withoutDecorations[2] || '',
    artist_main: (withoutDecorations[2] || '').split(',')[0]?.trim() || '',
    album: withoutDecorations[3] || '',
    duration_seconds: parseDurationSeconds(duration)
  };
}

async function fetchPublicTrackMetadata(trackId, attempt = 0) {
  fetchPublicTrackMetadata.cache ||= new Map();
  if (fetchPublicTrackMetadata.cache.has(trackId)) {
    return fetchPublicTrackMetadata.cache.get(trackId);
  }

  const response = await fetch(`https://open.spotify.com/track/${trackId}`);
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 1500 + attempt * 500));
    return fetchPublicTrackMetadata(trackId, attempt + 1);
  }
  if (!response.ok) throw new Error(`Spotify public track error ${response.status}: ${trackId}`);
  const html = await response.text();
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
  const jsonLd = jsonLdMatch ? JSON.parse(jsonLdMatch[1]) : {};

  const metadata = {
    title: jsonLd.name || '',
    release_date: jsonLd.datePublished || html.match(/release_date" content="([^"]+)"/)?.[1] || '',
    cover_url: jsonLd.image || html.match(/property="og:image" content="([^"]+)"/)?.[1] || '',
    description: jsonLd.description || ''
  };
  fetchPublicTrackMetadata.cache.set(trackId, metadata);
  return metadata;
}

function artistFromDescription(description) {
  const match = String(description || '').match(/Song .*? (.*?) .*? \d{4}/);
  return match?.[1] || '';
}

function buildQuestions(row) {
  const year = Number(row.release_year || 0);
  const artistOptions = [row.artist_main, 'Shakira', 'Dani Martin', 'Raffaella Carra']
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);
  while (artistOptions.length < 4) artistOptions.push(`Opcion ${artistOptions.length + 1}`);

  const yearOptions = year ? [year - 2, year, year + 2, year + 5].map(String) : ['', '', '', ''];

  return {
    question_artist: JSON.stringify({
      text: 'Quien canta principalmente este tema?',
      options: artistOptions,
      correct: artistOptions.indexOf(row.artist_main)
    }),
    question_year: JSON.stringify({
      text: 'En que ano salio esta cancion?',
      options: yearOptions,
      correct: year ? yearOptions.indexOf(String(year)) : -1
    }),
    question_timeline_year: year ? String(year) : '',
    question_title: JSON.stringify({
      text: 'Cual es el titulo de este tema?',
      answer: row.title
    })
  };
}

function rowFromTrack(track, playlist, position) {
  const releaseDate = track.release_date || '';
  const releaseYear = Number(releaseDate.slice(0, 4)) || '';
  const durationSeconds = Number(track.duration_seconds || 0);
  const base = {
    id: `${playlist.style_slug}-${String(position).padStart(3, '0')}-${slugify(track.artist_main)}-${slugify(track.title)}-${track.id.slice(0, 6)}`,
    playlist_source: playlist.playlist_source,
    playlist_id: playlist.playlist_id,
    playlist_owner: playlist.playlist_owner,
    playlist_total: '',
    playlist_position: position,
    style: playlist.style,
    style_slug: playlist.style_slug,
    spotify_track_id: track.id,
    spotify_uri: `spotify:track:${track.id}`,
    spotify_url: `https://open.spotify.com/track/${track.id}`,
    title: track.title || '',
    artist_main: track.artist_main || '',
    artists_all: track.artists_all || track.artist_main || '',
    release_year: releaseYear,
    release_date: releaseDate,
    album: track.album || '',
    duration_ms: durationSeconds ? durationSeconds * 1000 : '',
    duration_seconds: durationSeconds || '',
    cover_url: track.cover_url || '',
    preview_url: '',
    popularity: '',
    explicit: '',
    difficulty: 'medium',
    tags: playlist.style_slug,
    needs_review: !releaseYear,
    notes: 'captured from Spotify web playlist rows'
  };

  return { ...base, ...buildQuestions(base) };
}

async function loadRows(playlist) {
  const rowsPath = path.join(CAPTURE_DIR, `${playlist.style_slug}-rows.json`);
  const rows = JSON.parse(await fs.readFile(rowsPath, 'utf8'));
  const playlistRows = rows
    .filter((row) => row.id)
    .sort((a, b) => Number(a.position || 999999) - Number(b.position || 999999));

  if (playlistRows.length < playlist.minimum_rows) {
    throw new Error(`${playlist.style} tiene ${playlistRows.length} filas; minimo esperado ${playlist.minimum_rows}. No importo catalogos incompletos.`);
  }

  return playlistRows;
}

const existingCatalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
const selectedIds = new Set(selected.map((playlist) => playlist.playlist_id));
const nextCatalog = existingCatalog.filter((row) => !selectedIds.has(row.playlist_id));
const summary = [];

for (const playlist of selected) {
  const rows = await loadRows(playlist);
  const importedRows = [];

  console.log(`Importando ${playlist.style}: ${rows.length} filas`);
  for (const row of rows) {
    const rowFields = parseRowText(row.rowText);
    const publicMetadata = await fetchPublicTrackMetadata(row.id);
    const artistFromPublic = artistFromDescription(publicMetadata.description);

    importedRows.push(rowFromTrack({
      id: row.id,
      title: publicMetadata.title || rowFields.title || row.title,
      artist_main: rowFields.artist_main || artistFromPublic,
      artists_all: rowFields.artists_all || artistFromPublic,
      album: rowFields.album,
      duration_seconds: rowFields.duration_seconds,
      release_date: publicMetadata.release_date,
      cover_url: publicMetadata.cover_url
    }, playlist, row.position || importedRows.length + 1));
  }

  nextCatalog.push(...importedRows);
  summary.push({
    playlist: playlist.style,
    playlist_id: playlist.playlist_id,
    rows: importedRows.length
  });
}

const withIndex = nextCatalog.map((row, index) => ({ ...row, catalog_index: index + 1 }));

await fs.writeFile(CATALOG_PATH, `${JSON.stringify(withIndex, null, 2)}\n`, 'utf8');
await fs.writeFile(
  path.join(CAPTURE_DIR, 'import-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
  'utf8'
);

console.log(JSON.stringify({
  imported: summary,
  total_rows: withIndex.length
}, null, 2));

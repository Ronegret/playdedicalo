import fs from 'node:fs/promises';

const CATALOG_PATH = 'public/data/dedicalo-song-catalog.full.clean.json';

const PLAYLIST_IMPORTS = [
  {
    rowsPath: 'catalog-output/fiestas-pueblo-rows.json',
    playlist_source: 'MI PUEBLO EN FIESTAS',
    playlist_id: '5kkHb7jc3WocICRywvY6Yz',
    playlist_owner: 'Yeray G',
    playlist_total: 393,
    style: 'Fiestas en el Pueblo',
    style_slug: 'fiestas-en-el-pueblo'
  },
  {
    rowsPath: 'catalog-output/just-go-rows.json',
    playlist_source: 'Just Go',
    playlist_id: '0yUgOnkSswjzWwNxI2QjNC',
    playlist_owner: 'Rod Negrete',
    playlist_total: 135,
    style: 'Just Go',
    style_slug: 'just-go',
    fallbackIds: {
      24: '68nZjz3bLH1MM0cURT1YVH'
    }
  }
];

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
    'Vídeo musical',
    '•',
    'Añadir a lista'
  ].includes(part));

  return {
    title: withoutDecorations[1] || '',
    artists_all: withoutDecorations[2] || '',
    artist_main: (withoutDecorations[2] || '').split(',')[0]?.trim() || '',
    album: withoutDecorations[3] || '',
    duration_seconds: parseDurationSeconds(duration)
  };
}

async function fetchPublicTrackMetadata(trackId, attempt = 0) {
  const response = await fetch(`https://open.spotify.com/track/${trackId}`);
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 1500 + attempt * 500));
    return fetchPublicTrackMetadata(trackId, attempt + 1);
  }
  if (!response.ok) throw new Error(`Spotify public track error ${response.status}: ${trackId}`);
  const html = await response.text();
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
  const jsonLd = jsonLdMatch ? JSON.parse(jsonLdMatch[1]) : {};

  return {
    title: jsonLd.name || '',
    release_date: jsonLd.datePublished || html.match(/release_date" content="([^"]+)"/)?.[1] || '',
    cover_url: jsonLd.image || html.match(/property="og:image" content="([^"]+)"/)?.[1] || '',
    description: jsonLd.description || ''
  };
}

function artistFromDescription(description) {
  const match = String(description || '').match(/Song · (.*?) · \d{4}/);
  return match?.[1] || '';
}

function rowFromTrack(track, playlist, position) {
  const releaseDate = track.release_date || '';
  const releaseYear = Number(releaseDate.slice(0, 4)) || '';
  const durationSeconds = Number(track.duration_seconds || 0);

  return {
    playlist_source: playlist.playlist_source,
    playlist_id: playlist.playlist_id,
    playlist_owner: playlist.playlist_owner,
    playlist_total: playlist.playlist_total,
    playlist_position: position,
    style: playlist.style,
    style_slug: playlist.style_slug,
    spotify_track_id: track.id,
    spotify_uri: `spotify:track:${track.id}`,
    spotify_url: `https://open.spotify.com/track/${track.id}`,
    title: track.name || '',
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
    is_playable: '',
    added_at: '',
    added_by: playlist.playlist_owner
  };
}

async function loadImportRows(playlist) {
  const rows = JSON.parse(await fs.readFile(playlist.rowsPath, 'utf8'));
  const byPosition = new Map(rows.map((row) => [Number(row.position), row]));
  for (const [position, id] of Object.entries(playlist.fallbackIds || {})) {
    if (!byPosition.has(Number(position))) byPosition.set(Number(position), { position: Number(position), id, rowText: '' });
  }
  return [...byPosition.entries()]
    .map(([position, row]) => ({ position, id: row.id, rowText: row.rowText || '' }))
    .filter((row) => row.position >= 1 && row.position <= playlist.playlist_total)
    .sort((a, b) => a.position - b.position);
}

async function main() {
  const existingCatalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
  const nextCatalog = existingCatalog.filter((row) => !PLAYLIST_IMPORTS.some((playlist) => playlist.playlist_id === row.playlist_id));
  const importedRows = [];
  const summary = [];

  for (const playlist of PLAYLIST_IMPORTS) {
    const importRows = await loadImportRows(playlist);
    const missingPositions = Array.from({ length: playlist.playlist_total }, (_, index) => index + 1)
      .filter((position) => !importRows.some((row) => row.position === position));

    if (missingPositions.length) {
      throw new Error(`${playlist.style} tiene posiciones faltantes: ${missingPositions.join(', ')}`);
    }

    const playlistRows = [];
    for (const { id, position, rowText } of importRows) {
      const rowFields = parseRowText(rowText);
      const publicMetadata = await fetchPublicTrackMetadata(id);
      const artistFromPublic = artistFromDescription(publicMetadata.description);
      playlistRows.push(rowFromTrack({
        id,
        name: publicMetadata.title || rowFields.title,
        artist_main: rowFields.artist_main || artistFromPublic,
        artists_all: rowFields.artists_all || artistFromPublic,
        album: rowFields.album,
        duration_seconds: rowFields.duration_seconds,
        release_date: publicMetadata.release_date,
        cover_url: publicMetadata.cover_url
      }, playlist, position));
    }

    importedRows.push(...playlistRows);
    summary.push({
      playlist: playlist.style,
      playlist_id: playlist.playlist_id,
      rows: playlistRows.length
    });
  }

  nextCatalog.push(...importedRows);
  await fs.writeFile(CATALOG_PATH, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
  await fs.writeFile('catalog-output/imported-playlists-summary.json', `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    previous_rows: existingCatalog.length,
    imported_rows: importedRows.length,
    next_rows: nextCatalog.length,
    summary
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

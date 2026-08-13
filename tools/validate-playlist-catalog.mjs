import fs from 'node:fs/promises';

const CATALOG_PATH = 'public/data/dedicalo-song-catalog.full.clean.json';

const PLAYLISTS = [
  { name: 'Espanol 100%', id: '1C3NDNNfg6c0SlPhyikGVU', minimum: 101 },
  { name: 'Temazos', id: '0i8fEuY6ffN6Ou53BeIcxY', minimum: 101 },
  { name: 'Espanol Summer Party', id: '0UY3oVANXRqflE5QjHhaH4', minimum: 101 },
  { name: 'Hits de todo el tiempo', id: '5TOMoP3KEWtRASGeFsksUY', minimum: 101 },
  { name: 'Hits Rock Espanol', id: '2cT61hYCfIkwHAyVMwej9D', minimum: 101 },
  { name: 'Mejores de todos los tiempos', id: '0f3YRJO2HyZTpCLCVxzBt0', minimum: 500 },
  { name: 'Temazos Fiesta Mayor y Verbena', id: '7xcdrzs58PmLIZa4P5Qk3s', minimum: 101 },
  { name: 'Fiesta del Pueblo', id: '4OoS8qoueVgm5PpuDUlOwH', minimum: 101 }
];

const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
const summary = PLAYLISTS.map((playlist) => {
  const rows = catalog.filter((row) => row.playlist_id === playlist.id);
  const positions = rows.map((row) => Number(row.playlist_position)).filter(Boolean);
  const missingPositions = positions.length
    ? Array.from({ length: Math.max(...positions) }, (_, index) => index + 1)
      .filter((position) => !positions.includes(position))
    : [];

  return {
    name: playlist.name,
    id: playlist.id,
    tracks: rows.length,
    minimum: playlist.minimum,
    status: rows.length >= playlist.minimum ? 'ok' : 'incomplete',
    position_gaps_after_dedup: missingPositions.slice(0, 25)
  };
});

console.log(JSON.stringify(summary, null, 2));

const incomplete = summary.filter((playlist) => playlist.status !== 'ok');
if (incomplete.length) {
  process.exitCode = 1;
}

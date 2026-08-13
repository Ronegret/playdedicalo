import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const workspaceNodeModules = 'C:/Users/rodri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;

try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(workspaceNodeModules, 'playwright')));
}

const PLAYLISTS = [
  { style: 'Espanol 100%', slug: 'espanol-100', id: '1C3NDNNfg6c0SlPhyikGVU' },
  { style: 'Temazos', slug: 'temazos', id: '0i8fEuY6ffN6Ou53BeIcxY' },
  { style: 'Espanol Summer Party', slug: 'espanol-summer-party', id: '0UY3oVANXRqflE5QjHhaH4' },
  { style: 'Hits de todo el tiempo', slug: 'hits-todo-tiempo', id: '5TOMoP3KEWtRASGeFsksUY' },
  { style: 'Hits Rock Espanol', slug: 'hits-rock-espanol', id: '2cT61hYCfIkwHAyVMwej9D' },
  { style: 'Mejores de todos los tiempos', slug: 'mejores-todos-tiempos', id: '0f3YRJO2HyZTpCLCVxzBt0' },
  { style: 'Temazos Fiesta Mayor y Verbena', slug: 'fiesta-mayor-verbena', id: '7xcdrzs58PmLIZa4P5Qk3s' },
  { style: 'Fiesta del Pueblo', slug: 'fiesta-del-pueblo', id: '4OoS8qoueVgm5PpuDUlOwH' }
];

const selectedSlug = process.argv.find((arg) => arg.startsWith('--playlist='))?.split('=')[1];
const loginWaitMs = Number(process.argv.find((arg) => arg.startsWith('--login-wait-ms='))?.split('=')[1] || 0);
const selected = selectedSlug
  ? PLAYLISTS.filter((playlist) => playlist.slug === selectedSlug || playlist.id === selectedSlug)
  : PLAYLISTS;

if (!selected.length) {
  throw new Error(`Playlist no reconocida: ${selectedSlug}`);
}

const outputDir = path.resolve('catalog-output', 'captured-playlists');
const userDataDir = path.resolve('.spotify-capture-browser');

function parsePosition(text) {
  const match = String(text || '').trim().match(/^(\d{1,5})\b/);
  return match ? Number(match[1]) : null;
}

function parsePlaylistTotal(text) {
  const match = String(text || '').match(/(\d{1,5})\s+canciones/i);
  return match ? Number(match[1]) : null;
}

async function collectVisibleRows(page) {
  return page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a[href*="/track/"]')];
    return anchors
      .map((anchor) => {
        const id = anchor.href.match(/track\/([A-Za-z0-9]+)/)?.[1];
        const row = anchor.closest('[data-testid="track-row"], [role="row"]') || anchor.closest('div');
        const rowText = (row?.innerText || anchor.innerText || '').trim();
        return {
          id,
          title: anchor.innerText.trim(),
          rowText
        };
      })
      .filter((row) => row.id && row.rowText);
  });
}

async function scrollTrackContainer(page, amount = 1800) {
  await page.evaluate((delta) => {
    const candidates = [...document.querySelectorAll('main, .main-view-container__scroll-node-child, div')]
      .filter((element) => element.scrollHeight > element.clientHeight + 200)
      .sort((a, b) => b.scrollHeight - a.scrollHeight);
    const target = candidates[0] || document.scrollingElement || document.documentElement;
    target.scrollTop += delta;
  }, amount);
}

async function capturePlaylist(page, playlist) {
  console.log(`\nAbriendo ${playlist.style}...`);
  await page.goto(`https://open.spotify.com/playlist/${playlist.id}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(5000);

  const seen = new Map();
  let stableRounds = 0;
  let previousCount = 0;
  let captureOrder = 0;
  let playlistTotal = await page.evaluate(() => {
    const match = document.body.innerText.match(/(\d{1,5})\s+canciones/i);
    return match ? Number(match[1]) : null;
  });

  for (let round = 0; round < 260 && stableRounds < 18; round += 1) {
    const rows = await collectVisibleRows(page);
    for (const row of rows) {
      const position = parsePosition(row.rowText);
      const key = position ? `${position}:${row.id}` : row.id;
      if (!seen.has(key)) {
        seen.set(key, {
          id: row.id,
          position,
          captureOrder,
          rowText: row.rowText,
          title: row.title
        });
        captureOrder += 1;
      }
    }

    const count = seen.size;
    stableRounds = count === previousCount ? stableRounds + 1 : 0;
    previousCount = count;

    if (round % 10 === 0) {
      console.log(`  ${playlist.style}: ${count}${playlistTotal ? `/${playlistTotal}` : ''} filas capturadas`);
    }

    await scrollTrackContainer(page);
    await page.waitForTimeout(450);

    if (playlistTotal && count >= playlistTotal) break;
  }

  const rowsByCaptureOrder = [...seen.values()]
    .filter((row) => row.id)
    .sort((a, b) => a.captureOrder - b.captureOrder);

  for (let index = 0; index < rowsByCaptureOrder.length; index += 1) {
    if (rowsByCaptureOrder[index].position) continue;
    const previousPosition = rowsByCaptureOrder
      .slice(0, index)
      .findLast((row) => row.position)?.position;
    const nextPosition = rowsByCaptureOrder
      .slice(index + 1)
      .find((row) => row.position)?.position;
    const missingRun = rowsByCaptureOrder
      .slice(index)
      .findIndex((row) => row.position);
    const runLength = missingRun === -1 ? rowsByCaptureOrder.length - index : missingRun;

    if (previousPosition && nextPosition && nextPosition - previousPosition - 1 === runLength) {
      for (let offset = 0; offset < runLength; offset += 1) {
        rowsByCaptureOrder[index + offset].position = previousPosition + offset + 1;
      }
      index += runLength - 1;
    }
  }

  let rows = rowsByCaptureOrder
    .sort((a, b) => (a.position || a.captureOrder + 100000) - (b.position || b.captureOrder + 100000))
    .map(({ captureOrder: _captureOrder, ...row }) => row);

  playlistTotal = playlistTotal || parsePlaylistTotal(await page.evaluate(() => document.body.innerText));
  if (playlistTotal) {
    const positionedRows = rows.filter((row) => Number(row.position) >= 1 && Number(row.position) <= playlistTotal);
    const uniquePositions = new Set(positionedRows.map((row) => Number(row.position)));
    if (uniquePositions.size >= playlistTotal) {
      rows = positionedRows
        .filter((row, index, array) => array.findIndex((candidate) => candidate.position === row.position) === index)
        .sort((a, b) => Number(a.position) - Number(b.position));
    }
  }

  const maxPosition = Math.max(0, ...rows.map((row) => Number(row.position || 0)));
  const missingPositions = maxPosition
    ? Array.from({ length: maxPosition }, (_, index) => index + 1)
      .filter((position) => !rows.some((row) => row.position === position))
    : [];

  const outputPath = path.join(outputDir, `${playlist.slug}-rows.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  console.log(`  Guardado ${outputPath}`);
  console.log(`  Total capturado: ${rows.length}${playlistTotal ? `/${playlistTotal}` : ''}. Ultima posicion: ${maxPosition || 'sin posicion'}.`);
  if (missingPositions.length) {
    console.warn(`  Posiciones faltantes: ${missingPositions.slice(0, 40).join(', ')}`);
  }

  return {
    ...playlist,
    rows: rows.length,
    expectedRows: playlistTotal,
    maxPosition,
    missingPositions
  };
}

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1440, height: 950 },
  locale: 'es-ES'
});

try {
  const page = browser.pages()[0] || await browser.newPage();
  if (loginWaitMs > 0) {
    console.log(`Abriendo Spotify. Tienes ${Math.round(loginWaitMs / 1000)} segundos para iniciar sesion si hace falta...`);
    await page.goto('https://open.spotify.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(loginWaitMs);
  }

  const summary = [];

  for (const playlist of selected) {
    summary.push(await capturePlaylist(page, playlist));
  }

  await fs.writeFile(
    path.join(outputDir, 'capture-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  );

  console.log('\nResumen:');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}

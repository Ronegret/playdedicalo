#!/usr/bin/env node
/**
 * IMPORTAR UNA PLAYLIST DE SPOTIFY AL CATÁLOGO
 *
 *   npm run importar-playlist -- <url> <id-interno> "<NOMBRE VISIBLE>" [--dry]
 *
 * Por qué con navegador y no con la API: Spotify responde 403 en
 * /playlists/{id}/tracks tanto con credenciales de app como con el token de
 * usuario guardado — es el techo de "modo desarrollo" descrito en
 * docs/decisiones/0002-dependencia-de-spotify.md. La página pública sí
 * muestra la lista entera, así que se lee de ahí, que es el mismo método con
 * el que se importaron las listas anteriores (ver catalog-output/).
 *
 * Del año: NO se da por bueno el de Spotify. Es la fecha del álbum enlazado
 * y viene mal muy a menudo (recopilatorios, remasters). Se importa tal cual
 * y después hay que pasar `npm run auditar-anos` y verificar lo que marque,
 * igual que con el resto del catálogo.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const RAIZ = process.cwd();
const CATALOGO = join(RAIZ, 'public', 'data', 'dedicalo-song-catalog.full.clean.json');

const args = process.argv.slice(2);
const soloPrueba = args.includes('--dry');
const [url, idInterno, nombreVisible] = args.filter((a) => !a.startsWith('--'));

if (!url || !idInterno) {
  console.error('Uso: npm run importar-playlist -- <url> <id-interno> "<NOMBRE>" [--dry]');
  process.exit(1);
}

const playlistId = (url.match(/playlist\/([A-Za-z0-9]+)/) || [])[1];
if (!playlistId) {
  console.error('No reconozco esa URL de playlist.');
  process.exit(1);
}

function slug(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function duracionAMs(txt) {
  const m = String(txt || '').match(/(\d+):(\d{2})/);
  if (!m) return null;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}

const navegador = await chromium.launch({ headless: true });
const contexto = await navegador.newContext({
  viewport: { width: 1400, height: 1000 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'es-ES'
});
const pagina = await contexto.newPage();

console.log('Abriendo la playlist...');
await pagina.goto(`https://open.spotify.com/playlist/${playlistId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await pagina.waitForTimeout(4000);

// Nada de tocar el banner de cookies: pulsarlo abría un diálogo que dejaba
// la lista congelada en las primeras 29 filas. Sin tocarlo, el contenedor
// se desplaza igual.

// La lista está virtualizada: solo existen en el DOM las filas visibles, así
// que hay que bajar poco a poco e ir acumulando lo que aparece.
//
// El scroll NO va en la ventana sino en un contenedor interno, así que
// mover la rueda del ratón no hace nada: hay que desplazar ese elemento a
// mano. Se localiza como el único que desborda de verdad.
const filasVistas = new Map();
let sinNovedades = 0;

const hayScroller = await pagina.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((n) => {
    const s = getComputedStyle(n);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 200;
  });
  if (!el) return null;
  return { alto: el.scrollHeight, visible: el.clientHeight };
});
if (!hayScroller) {
  console.error('No encuentro el contenedor desplazable de la lista.');
  process.exit(1);
}
console.log(`Lista de ${hayScroller.alto}px (ventana de ${hayScroller.visible}px)`);

for (let vuelta = 0; vuelta < 400 && sinNovedades < 10; vuelta += 1) {
  const lote = await pagina.evaluate(() => {
    const salida = [];
    for (const fila of document.querySelectorAll('[data-testid="tracklist-row"], [role="row"]')) {
      // Los href llevan prefijo de idioma: /intl-es/track/... , no /track/...
      const enlace = fila.querySelector('a[href*="/track/"]');
      if (!enlace) continue;
      const id = enlace.getAttribute('href').split('/track/')[1]?.split('?')[0];
      if (!id) continue;
      const enlaces = [...fila.querySelectorAll('a[href*="/artist/"]')].map((a) => a.textContent.trim());
      const album = fila.querySelector('a[href*="/album/"]')?.textContent?.trim() || '';
      salida.push({
        id,
        title: enlace.textContent.trim(),
        artists: enlaces,
        album,
        texto: fila.innerText
      });
    }
    return salida;
  });

  const antes = filasVistas.size;
  for (const f of lote) if (!filasVistas.has(f.id)) filasVistas.set(f.id, f);
  sinNovedades = filasVistas.size === antes ? sinNovedades + 1 : 0;

  process.stdout.write(`\r  ${filasVistas.size} canciones leídas...`);

  // La rueda del ratón no mueve este contenedor: hay que empujar su
  // scrollTop. Y se vuelve a buscar en cada vuelta porque guardarlo en una
  // variable de la página no sobrevive a los re-render de la lista.
  const alFinal = await pagina.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => {
      const s = getComputedStyle(n);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 200;
    });
    if (!el) return true;
    el.scrollTop += el.clientHeight * 0.7;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
  });
  await pagina.waitForTimeout(450);
  if (alFinal) sinNovedades += 1;
}
process.stdout.write('\n');

await navegador.close();

const leidas = [...filasVistas.values()];
console.log(`Leídas de la página: ${leidas.length}`);

if (!leidas.length) {
  console.error('No se pudo leer ninguna fila. ¿Cambió la página de Spotify?');
  process.exit(1);
}

// El año hay que pedirlo pista a pista. Se usa el token de usuario guardado
// (.spotify-user-token.json), renovándolo si hace falta.
const env = Object.fromEntries(
  readFileSync(join(RAIZ, '.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);

async function tokenDeApp() {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${env.VITE_SPOTIFY_CLIENT_ID}:${env.VITE_SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });
  return r.ok ? (await r.json()).access_token : null;
}

const tk = await tokenDeApp();
const porId = new Map();
if (tk) {
  console.log('Pidiendo álbum y fecha a la API (de 50 en 50)...');
  const ids = leidas.map((f) => f.id);
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const r = await fetch(`https://api.spotify.com/v1/tracks?ids=${lote.join(',')}&market=ES`, {
      headers: { Authorization: `Bearer ${tk}` }
    });
    if (!r.ok) { console.log(`  (la API respondió ${r.status}; se sigue con lo leído de la página)`); break; }
    for (const t of (await r.json()).tracks || []) if (t?.id) porId.set(t.id, t);
    process.stdout.write(`\r  ${porId.size}/${ids.length}`);
  }
  process.stdout.write('\n');
}

const filas = [];
const sinAno = [];
for (const f of leidas) {
  const api = porId.get(f.id);
  const ano = Number(String(api?.album?.release_date || '').slice(0, 4)) || null;
  if (!ano) { sinAno.push(`${f.artists[0] || '?'} — ${f.title}`); continue; }
  filas.push({
    id: `${idInterno}-${filas.length}-${slug(`${f.artists[0]}-${f.title}`)}`,
    playlist_id: playlistId,
    playlist_name: playlistId,
    title: api?.name || f.title,
    artist_main: api?.artists?.[0]?.name || f.artists[0] || '',
    artists: (api?.artists || []).map((a) => a.name).join(', ') || f.artists.join(', '),
    album: api?.album?.name || f.album,
    release_year: ano,
    duration_ms: api?.duration_ms || duracionAMs(f.texto),
    spotify_track_id: f.id,
    spotify_uri: api?.uri || `spotify:track:${f.id}`
  });
}

console.log(`\nCon año: ${filas.length}   Sin año: ${sinAno.length}`);
sinAno.slice(0, 15).forEach((s) => console.log(`   ? ${s}`));

const SALIDA = join(RAIZ, 'docs', 'evidencias');
mkdirSync(SALIDA, { recursive: true });
writeFileSync(
  join(SALIDA, `import-${idInterno}-${new Date().toISOString().slice(0, 10)}.json`),
  JSON.stringify({
    nombreVisible,
    playlistId,
    idInterno,
    // Todas las leídas, con año o sin él: el año lo pone después
    // `npm run anos-itunes` porque Spotify no nos lo da (403).
    leidas: leidas.map((f) => ({
      spotify_track_id: f.id,
      spotify_uri: `spotify:track:${f.id}`,
      title: f.title,
      artist_main: f.artists[0] || '',
      artists: f.artists.join(', '),
      album: f.album,
      duration_ms: duracionAMs(f.texto),
      release_year: porId.get(f.id)
        ? Number(String(porId.get(f.id).album?.release_date || '').slice(0, 4)) || null
        : null
    })),
    filas,
    sinAno
  }, null, 2),
  'utf8'
);

if (soloPrueba) {
  console.log('--dry: no se ha tocado el catálogo.');
  process.exit(0);
}

const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));
writeFileSync(CATALOGO, JSON.stringify([...catalogo, ...filas], null, 2) + '\n', 'utf8');
console.log(`Catálogo: ${catalogo.length} -> ${catalogo.length + filas.length} filas`);
console.log('SIGUIENTE: npm run auditar-anos  (Spotify da la fecha del álbum, no la del original)');

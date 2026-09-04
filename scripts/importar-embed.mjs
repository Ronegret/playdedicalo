#!/usr/bin/env node
/**
 * IMPORTAR UNA PLAYLIST DESDE EL REPRODUCTOR PÚBLICO DE SPOTIFY
 *
 *   npm run importar-embed -- <url> <id-interno> [--dry]
 *
 * Por qué no la API: desde 2024 Spotify bloquea /playlists/{id}/tracks y
 * /tracks para tokens de credenciales de cliente (403). Con las nuestras
 * solo responde el nombre de la lista. El reproductor incrustado que
 * cualquiera puede pegar en una web sí devuelve las pistas, así que se leen
 * de ahí. Límite conocido: el embed sirve como mucho 100 canciones.
 *
 * El embed NO trae año: da uri, título, artista y duración. Y mejor así,
 * porque el año de Spotify es el del álbum enlazado y viene mal muy a
 * menudo (ver docs/evidencias/anos-pendientes.md). Los años se sacan de
 * MusicBrainz, que sí modela la fecha del PRIMER lanzamiento, que es justo
 * lo que el juego pregunta.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();

const args = process.argv.slice(2);
const [url, idInterno] = args.filter((a) => !a.startsWith('--'));
const soloPrueba = args.includes('--dry');

if (!url || !idInterno) {
  console.error('Uso: npm run importar-embed -- <url> <id-interno> [--dry]');
  process.exit(1);
}

const playlistId = (url.match(/playlist\/([A-Za-z0-9]+)/) || [])[1];
if (!playlistId) {
  console.error('No reconozco esa URL de playlist.');
  process.exit(1);
}

const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
// MusicBrainz exige identificarse y admite 1 petición por segundo.
const MB_AGENT = 'DedicaloPlay/0.4 (https://play.dedicalo.es)';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizar(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*[-–—]\s*(remaster|remasterizado|remastered|version|versión|en vivo|live|edit)\b.*$/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(txt) {
  return normalizar(txt).replace(/ /g, '-').slice(0, 48);
}

async function traerDelEmbed() {
  const r = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
    headers: { 'User-Agent': NAVEGADOR }
  });
  if (!r.ok) throw new Error(`Embed: ${r.status}`);
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!m) throw new Error('El embed no trae __NEXT_DATA__ (¿cambió el formato?).');
  const entidad = JSON.parse(m[1]).props.pageProps.state.data.entity;
  return { nombre: entidad.name, pistas: entidad.trackList || [] };
}

// Año del PRIMER lanzamiento según MusicBrainz. Se busca la grabación por
// artista + título y se toma la fecha más antigua de todas sus ediciones:
// es lo más cercano a "de qué año es esta canción".
async function anoMusicBrainz(titulo, artista) {
  const consulta = `recording:"${normalizar(titulo)}" AND artist:"${normalizar(artista)}"`;
  const u = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(consulta)}&limit=8&fmt=json`;
  const r = await fetch(u, { headers: { 'User-Agent': MB_AGENT } });
  if (!r.ok) return { ano: null, motivo: `mb ${r.status}` };
  const data = await r.json();
  const candidatos = (data.recordings || []).filter((rec) => (rec.score ?? 0) >= 85);
  if (!candidatos.length) return { ano: null, motivo: 'sin coincidencia' };

  let mejor = null;
  for (const rec of candidatos) {
    const fechas = [];
    if (rec['first-release-date']) fechas.push(rec['first-release-date']);
    for (const rel of rec.releases || []) {
      if (rel.date) fechas.push(rel.date);
      if (rel['release-group']?.['first-release-date']) fechas.push(rel['release-group']['first-release-date']);
    }
    for (const f of fechas) {
      const ano = Number(String(f).slice(0, 4));
      if (ano > 1900 && ano <= new Date().getFullYear() + 1) {
        if (mejor === null || ano < mejor) mejor = ano;
      }
    }
  }
  return mejor ? { ano: mejor, motivo: 'ok' } : { ano: null, motivo: 'sin fecha' };
}

const { nombre, pistas } = await traerDelEmbed();
console.log(`Playlist: ${nombre}`);
console.log(`Pistas en el embed: ${pistas.length}${pistas.length === 100 ? '  (tope del embed: puede haber más)' : ''}\n`);

// Duplicados DENTRO de la lista: si sale dos veces, el juego repite pregunta.
const vistos = new Set();
const limpias = [];
const repetidas = [];
for (const t of pistas) {
  const id = String(t.uri || '').split(':').pop();
  if (!id) continue;
  if (vistos.has(id)) { repetidas.push(`${t.subtitle} — ${t.title}`); continue; }
  vistos.add(id);
  limpias.push({ id, uri: t.uri, title: t.title, artist: t.subtitle, duration_ms: t.duration });
}
console.log(`Únicas: ${limpias.length}   Repetidas descartadas: ${repetidas.length}`);
repetidas.forEach((d) => console.log(`   - ${d}`));

console.log('\nBuscando el año de primer lanzamiento en MusicBrainz (1 por segundo)...');
const resultados = [];
for (let i = 0; i < limpias.length; i += 1) {
  const t = limpias[i];
  let res;
  try {
    res = await anoMusicBrainz(t.title, t.artist);
  } catch (e) {
    res = { ano: null, motivo: `error ${e.message}` };
  }
  resultados.push({ ...t, ...res });
  process.stdout.write(`\r  ${i + 1}/${limpias.length}  ${res.ano ? res.ano : '----'}  ${t.artist} — ${t.title}`.slice(0, 110).padEnd(112));
  await dormir(1100);
}
process.stdout.write('\n');

const conAno = resultados.filter((r) => r.ano);
const sinAno = resultados.filter((r) => !r.ano);
console.log(`\nCon año: ${conAno.length}   Sin año: ${sinAno.length}`);
sinAno.forEach((r) => console.log(`   ? ${r.artist} — ${r.title}  (${r.motivo})`));

const SALIDA = join(RAIZ, 'docs', 'evidencias');
mkdirSync(SALIDA, { recursive: true });
const destino = join(SALIDA, `import-${idInterno}-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(destino, JSON.stringify({ nombre, playlistId, resultados }, null, 2), 'utf8');
console.log(`\nGuardado el detalle en ${destino.replace(RAIZ, '.')}`);

if (soloPrueba) {
  console.log('--dry: no se ha tocado el catálogo.');
  process.exit(0);
}

const CATALOGO = join(RAIZ, 'public', 'data', 'dedicalo-song-catalog.full.clean.json');
const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));
const filas = conAno.map((t, index) => ({
  id: `${idInterno}-${index}-${slug(`${t.artist}-${t.title}`)}`,
  playlist_id: playlistId,
  playlist_name: playlistId,
  title: t.title,
  artist_main: t.artist,
  artists: t.artist,
  album: '',
  release_year: t.ano,
  duration_ms: t.duration_ms,
  spotify_track_id: t.id,
  spotify_uri: t.uri
}));
writeFileSync(CATALOGO, JSON.stringify([...catalogo, ...filas], null, 2) + '\n', 'utf8');
console.log(`Catálogo: ${catalogo.length} -> ${catalogo.length + filas.length} filas`);
console.log('SIGUIENTE: npm run auditar-anos  (y verificar lo que marque)');

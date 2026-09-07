#!/usr/bin/env node
/**
 * RESOLVER LOS FRAGMENTOS DE AUDIO DEL CATÁLOGO
 *
 *   npm run resolver-previews            todo lo que falte
 *   npm run resolver-previews -- --limite 200
 *
 * Escribe `preview_url` en cada canción del catálogo, buscándolo en la API
 * pública de Apple. Es el paso que permite quitar Spotify: con la URL ya
 * guardada, el juego solo tiene que reproducir un archivo, sin SDK, sin
 * iniciar sesión y sin que nadie —tampoco el anfitrión— necesite Premium.
 *
 * Se resuelve AQUÍ y no durante la partida a propósito: Apple corta sobre
 * las 20 peticiones por minuto, así que pedirlo en caliente dejaría el juego
 * sin música a mitad de fiesta. Aquí se hace una vez, despacio, y queda.
 *
 * El emparejamiento es estricto (título + artista + duración ±7 s) porque un
 * fallo aquí no es un hueco: es el juego poniendo otra canción y dando por
 * mala la respuesta correcta.
 *
 * Guarda cada pocas canciones: si se corta, relanzar retoma donde iba.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const CATALOGO = join(RAIZ, 'public', 'data', 'dedicalo-song-catalog.full.clean.json');

const args = process.argv.slice(2);
const limite = Number((args.find((a) => a.startsWith('--limite')) || '').split('=')[1]
  || args[args.indexOf('--limite') + 1] || 0) || Infinity;

// 1,2 s medidos sin un solo bloqueo. Se probó también a 1,8 y 3,2: Apple
// aguanta 1,2 igual de bien, y con 2.000 canciones la diferencia es de 44
// minutos frente a casi dos horas. Si algún día empieza a devolver 429, el
// reintento con espera creciente lo absorbe; subir esta pausa es el primer
// ajuste que probar.
const PAUSA_MS = 1200;
const GUARDA_CADA = 15;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*[-–—]\s*(remaster|remasterizado|remastered|version|versi[oó]n|en vivo|live|single|radio edit|edit|album version|mono|stereo).*$/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mismo criterio que la prueba de cobertura que dio el 94,2 %.
function emparejaBien(cancion, resultado) {
  const mismoTitulo = normalizar(resultado.trackName) === normalizar(cancion.title);
  const a = normalizar(cancion.artist_main);
  const b = normalizar(resultado.artistName);
  const mismoArtista = a && b && (b.includes(a) || a.includes(b));
  if (!mismoTitulo || !mismoArtista) return false;

  const durCat = Number(cancion.duration_ms || 0);
  const durRes = Number(resultado.trackTimeMillis || 0);
  if (durCat && durRes && Math.abs(durCat - durRes) > 7000) return false;
  return true;
}

async function buscar(cancion) {
  const term = `${cancion.artist_main} ${cancion.title}`.slice(0, 190);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}`
            + '&media=music&entity=song&limit=10&country=ES';

  for (let intento = 0; intento < 4; intento += 1) {
    let res;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'DedicaloPlay/0.4' } });
      clearTimeout(t);
    } catch {
      await dormir(4000 * (intento + 1));
      continue;
    }
    if (res.status === 429 || res.status === 403) {
      await dormir(20000 * (intento + 1));
      continue;
    }
    if (!res.ok) return { estado: `http ${res.status}` };

    let datos;
    try { datos = await res.json(); } catch { return { estado: 'respuesta ilegible' }; }

    const exacto = (datos.results || []).find((r) => emparejaBien(cancion, r) && r.previewUrl);
    if (exacto) {
      return {
        estado: 'ok',
        url: exacto.previewUrl,
        apple_id: exacto.trackId,
        // Se guarda para poder auditar después si un emparejamiento fue malo.
        apple_title: exacto.trackName,
        apple_artist: exacto.artistName
      };
    }
    // Hubo respuesta pero ninguna coincidencia lo bastante buena. Mejor
    // dejarla sin fragmento que arriesgarse a poner otra canción.
    return { estado: 'sin coincidencia' };
  }
  return { estado: 'limitado tras 4 intentos' };
}

const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));
// Se atienden primero las listas con menos canciones listas: una lista a
// cero deja el juego sin música, y una lista casi completa ya funciona.
const listasPorUrgencia = {};
for (const s of catalogo) {
  const k = s.playlist_id;
  listasPorUrgencia[k] = listasPorUrgencia[k] || { total: 0, con: 0 };
  listasPorUrgencia[k].total += 1;
  if (s.preview_url) listasPorUrgencia[k].con += 1;
}
const pendientes = catalogo
  .filter((s) => !s.preview_url && s.preview_estado !== 'sin coincidencia')
  .sort((a, b) => {
    const ra = listasPorUrgencia[a.playlist_id].con / listasPorUrgencia[a.playlist_id].total;
    const rb = listasPorUrgencia[b.playlist_id].con / listasPorUrgencia[b.playlist_id].total;
    return ra - rb;
  });
const yaResueltas = catalogo.filter((s) => s.preview_url).length;

console.log(`Catálogo        : ${catalogo.length}`);
console.log(`Ya con fragmento: ${yaResueltas}`);
console.log(`Por resolver    : ${pendientes.length}`);
console.log(`Ritmo           : una cada ${PAUSA_MS / 1000}s  (~${Math.round(pendientes.length * PAUSA_MS / 60000)} min)\n`);

let hechas = 0;
let ok = yaResueltas;
let sin = 0;

for (const cancion of pendientes) {
  if (hechas >= limite) break;
  const r = await buscar(cancion);
  hechas += 1;

  if (r.estado === 'ok') {
    cancion.preview_url = r.url;
    cancion.apple_track_id = r.apple_id;
    cancion.preview_estado = 'ok';
    ok += 1;
  } else {
    cancion.preview_estado = r.estado;
    sin += 1;
  }

  const pct = ((ok / (ok + sin)) * 100).toFixed(1);
  process.stdout.write(
    `\r  ${hechas}/${Math.min(pendientes.length, limite)}  cobertura ${pct}%  ${r.estado === 'ok' ? '✓' : '·'} ${cancion.artist_main} — ${cancion.title}`
      .slice(0, 110).padEnd(112)
  );

  if (hechas % GUARDA_CADA === 0) {
    writeFileSync(CATALOGO, JSON.stringify(catalogo, null, 2) + '\n', 'utf8');
  }
  await dormir(PAUSA_MS);
}
process.stdout.write('\n');

writeFileSync(CATALOGO, JSON.stringify(catalogo, null, 2) + '\n', 'utf8');

const conUrl = catalogo.filter((s) => s.preview_url).length;
console.log(`\nCon fragmento: ${conUrl}/${catalogo.length}  (${(conUrl / catalogo.length * 100).toFixed(1)}%)`);

const porLista = {};
for (const s of catalogo) {
  const k = s.playlist_id;
  porLista[k] = porLista[k] || { total: 0, con: 0 };
  porLista[k].total += 1;
  if (s.preview_url) porLista[k].con += 1;
}
console.log('\nPor lista:');
for (const [k, v] of Object.entries(porLista)) {
  console.log(`  ${String(v.con).padStart(4)}/${String(v.total).padEnd(4)} ${(v.con / v.total * 100).toFixed(0).padStart(3)}%  ${k}`);
}

#!/usr/bin/env node
/**
 * CARÁTULAS DEL CATÁLOGO, DESDE APPLE
 *
 *   npm run caratulas
 *
 * Rellena `cover_url` con la portada que devuelve Apple para la misma pista
 * de la que ya sacamos el fragmento (`apple_track_id`).
 *
 * Por qué hacía falta, habiendo ya 1.771 carátulas guardadas: esas apuntan
 * al CDN de Spotify, que es justo la dependencia que quitamos del juego. Con
 * el fragmento viniendo de Apple y la portada de Spotify, el reveal
 * dependería de dos servicios en vez de uno, y uno de ellos ya no pinta nada
 * aquí. Además las 410 canciones chilenas no tienen portada ninguna, porque
 * llegaron raspando la web y no por API.
 *
 * Esto NO va a un `search` por canción: `lookup` admite hasta 200 ids de
 * golpe, así que el catálogo entero se resuelve en unas quince peticiones en
 * lugar de dos mil. Nada de esperas de cuarenta minutos.
 *
 * Se pide la portada a 600 px: en una tele de 1080p el disco ocupa unos 250
 * px de lado, y a 4K el doble; 600 llega de sobra y pesa poco.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const CATALOGO = join(RAIZ, 'public', 'data', 'dedicalo-song-catalog.full.clean.json');

const POR_LOTE = 150;      // el techo son 200; se deja aire
const PAUSA_MS = 1500;
const LADO = 600;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** La URL que da Apple es de 100 px. El tamaño va en el nombre del archivo,
 *  así que se cambia ahí mismo — es la forma admitida de pedirla más grande. */
function aTamano(url, lado) {
  return String(url || '').replace(/\/\d+x\d+bb\.(jpg|png)$/i, `/${lado}x${lado}bb.jpg`);
}

async function lote(ids) {
  const url = `https://itunes.apple.com/lookup?id=${ids.join(',')}&entity=song&country=ES`;
  for (let intento = 0; intento < 4; intento += 1) {
    let res;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
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
    if (!res.ok) return null;
    try {
      const datos = await res.json();
      return datos.results || [];
    } catch { return null; }
  }
  return null;
}

// Mismo cerrojo que el resolvedor de fragmentos, y por el mismo motivo: los
// dos guardan el catálogo entero desde su copia en memoria, así que dos
// procesos a la vez se borran el trabajo el uno al otro.
const CERROJO = join(RAIZ, '.caratulas.lock');
if (existsSync(CERROJO)) {
  console.error(`Ya hay un proceso de carátulas en marcha (arrancó ${readFileSync(CERROJO, 'utf8').trim()}).`);
  console.error(`Si estás seguro de que no, borra ${CERROJO}`);
  process.exit(1);
}
writeFileSync(CERROJO, new Date().toISOString(), 'utf8');
const soltar = () => { try { unlinkSync(CERROJO); } catch { /* ya no está */ } };
process.on('exit', soltar);
process.on('SIGINT', () => { soltar(); process.exit(130); });
process.on('SIGTERM', () => { soltar(); process.exit(143); });

const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));

// Solo las que se pueden jugar: una canción sin fragmento no suena, así que
// su portada no la ve nadie.
const conApple = catalogo.filter((s) => s.apple_track_id && s.preview_url);
const yaDeApple = catalogo.filter((s) => String(s.cover_url || '').includes('mzstatic')).length;

console.log(`Catálogo             : ${catalogo.length}`);
console.log(`Jugables con id Apple: ${conApple.length}`);
console.log(`Ya con portada Apple : ${yaDeApple}`);
console.log(`Peticiones           : ${Math.ceil(conApple.length / POR_LOTE)}\n`);

const porId = new Map(conApple.map((s) => [String(s.apple_track_id), s]));
const ids = [...porId.keys()];

let puestas = 0;
let fallos = 0;

for (let i = 0; i < ids.length; i += POR_LOTE) {
  const trozo = ids.slice(i, i + POR_LOTE);
  const resultados = await lote(trozo);

  if (!resultados) {
    fallos += trozo.length;
    console.log(`  lote ${i / POR_LOTE + 1}: sin respuesta`);
  } else {
    for (const r of resultados) {
      const cancion = porId.get(String(r.trackId));
      if (!cancion) continue;
      const arte = r.artworkUrl100 || r.artworkUrl60 || r.artworkUrl30;
      if (!arte) continue;
      cancion.cover_url = aTamano(arte, LADO);
      puestas += 1;
    }
    console.log(`  lote ${i / POR_LOTE + 1}/${Math.ceil(ids.length / POR_LOTE)}: ${puestas} portadas`);
  }

  writeFileSync(CATALOGO, JSON.stringify(catalogo, null, 2) + '\n', 'utf8');
  if (i + POR_LOTE < ids.length) await dormir(PAUSA_MS);
}

const conPortada = catalogo.filter((s) => s.cover_url).length;
const deApple = catalogo.filter((s) => String(s.cover_url || '').includes('mzstatic')).length;
const jugables = catalogo.filter((s) => s.preview_url).length;
const jugablesConPortada = catalogo.filter((s) => s.preview_url && s.cover_url).length;

console.log(`\nPortadas puestas       : ${puestas}${fallos ? `  (${fallos} sin respuesta)` : ''}`);
console.log(`Con portada            : ${conPortada}/${catalogo.length}`);
console.log(`  de Apple             : ${deApple}`);
console.log(`Jugables con portada   : ${jugablesConPortada}/${jugables}`
  + `  (${(jugablesConPortada / jugables * 100).toFixed(1)}%)`);

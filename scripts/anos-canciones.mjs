#!/usr/bin/env node
/**
 * FECHAR LAS CANCIONES DE UNA IMPORTACIÓN
 *
 *   npm run anos-canciones -- docs/evidencias/import-<id>-<fecha>.json
 *
 * De dónde sale el año, y por qué de ahí:
 *
 *   - La API de Spotify (/v1/tracks) responde 403 con nuestras credenciales,
 *     tanto de app como de usuario: es el techo de "modo desarrollo" del
 *     ADR-0002.
 *   - iTunes sirve, pero corta sobre las 20 peticiones por minuto y después
 *     bloquea por IP un buen rato. Con 500 canciones no es viable.
 *   - El reproductor incrustado público de cada canción SÍ trae la fecha
 *     (`releaseDate`), no pide credenciales y aguanta el ritmo.
 *
 * Ojo: esa fecha es la del ÁLBUM enlazado, así que hereda el problema de
 * siempre — un recopilatorio la dispara décadas hacia delante. Por eso al
 * terminar hay que pasar `npm run auditar-anos` y verificar lo que marque.
 * Este script no da ningún año por bueno.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ruta = process.argv[2];
if (!ruta) {
  console.error('Uso: npm run anos-canciones -- <archivo de importación>');
  process.exit(1);
}

const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const EN_PARALELO = 4;

const datos = JSON.parse(readFileSync(ruta, 'utf8'));
const canciones = datos.leidas || [];
if (!canciones.length) {
  console.error('Ese archivo no trae canciones.');
  process.exit(1);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function fechaDe(id) {
  for (let intento = 0; intento < 3; intento += 1) {
    try {
      const r = await fetch(`https://open.spotify.com/embed/track/${id}`, {
        headers: { 'User-Agent': NAVEGADOR }
      });
      if (!r.ok) { await dormir(700 * (intento + 1)); continue; }
      const html = await r.text();
      const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (!m) { await dormir(700 * (intento + 1)); continue; }

      // La forma del blob cambia según el tipo de página, así que en vez de
      // navegar una ruta fija se busca el primer releaseDate que aparezca.
      const iso = JSON.parse(m[1], (k, v) => v);
      const encontrado = buscarFecha(iso);
      if (encontrado) return { ano: Number(encontrado.slice(0, 4)), motivo: 'ok' };
      return { ano: null, motivo: 'sin fecha en el embed' };
    } catch (e) {
      await dormir(700 * (intento + 1));
    }
  }
  return { ano: null, motivo: 'no responde' };
}

function buscarFecha(nodo) {
  if (!nodo || typeof nodo !== 'object') return null;
  if (nodo.releaseDate?.isoString) return nodo.releaseDate.isoString;
  if (typeof nodo.releaseDate === 'string' && /^\d{4}/.test(nodo.releaseDate)) return nodo.releaseDate;
  for (const v of Object.values(nodo)) {
    const r = buscarFecha(v);
    if (r) return r;
  }
  return null;
}

const pendientes = canciones.filter((c) => !c.release_year);
console.log(`Total: ${canciones.length}   Ya fechadas: ${canciones.length - pendientes.length}   Por fechar: ${pendientes.length}\n`);

let hechas = 0;
let conAno = canciones.length - pendientes.length;

// En tandas pequeñas: rápido sin parecer un ataque.
for (let i = 0; i < pendientes.length; i += EN_PARALELO) {
  const tanda = pendientes.slice(i, i + EN_PARALELO);
  const res = await Promise.all(tanda.map((c) => fechaDe(c.spotify_track_id)));
  tanda.forEach((c, j) => {
    c.release_year = res[j].ano;
    c.motivo_ano = res[j].motivo;
    c.fuente_ano = 'spotify-embed';
    if (res[j].ano) conAno += 1;
  });
  hechas += tanda.length;
  process.stdout.write(`\r  ${hechas}/${pendientes.length}   con año: ${conAno}`.padEnd(60));

  // Guardado incremental: un corte a mitad no tira el trabajo, y relanzar
  // retoma donde se quedó.
  if (hechas % 40 < EN_PARALELO) {
    writeFileSync(ruta, JSON.stringify({ ...datos, leidas: canciones }, null, 2), 'utf8');
  }
  await dormir(220);
}
process.stdout.write('\n');

writeFileSync(ruta, JSON.stringify({ ...datos, leidas: canciones }, null, 2), 'utf8');

const sin = canciones.filter((c) => !c.release_year);
console.log(`\nCon año: ${conAno}   Sin año: ${sin.length}`);
sin.slice(0, 20).forEach((s) => console.log(`   ? ${s.artist_main} — ${s.title}  (${s.motivo_ano})`));
if (sin.length > 20) console.log(`   ... y ${sin.length - 20} más`);
console.log(`\nActualizado ${ruta}`);

#!/usr/bin/env node
/**
 * PRUEBA DE COBERTURA DE PREVIEWS — decide el futuro de la base musical.
 *
 * Contexto: ver docs/decisiones/0002-dependencia-de-spotify.md
 *
 * La politica de Spotify prohibe expresamente los juegos de trivia y prohibe
 * monetizar apps que reproducen su musica. La alternativa mas prometedora es
 * reproducir previews de 30 segundos del catalogo de Apple, que no exigen
 * cuenta al usuario.
 *
 * Antes de replantear nada hay UNA pregunta que decide todo lo demas:
 *   ¿cuantas de nuestras 2.932 canciones tienen preview disponible?
 *
 * Este script la responde. NO toca la app: solo lee el catalogo y consulta
 * la API publica de busqueda de iTunes (sin clave, sin cuenta).
 *
 * Uso:
 *   node scripts/probar-cobertura-previews.mjs             # muestra ~300 (rapido)
 *   node scripts/probar-cobertura-previews.mjs --todas     # las 2.932 (lento)
 *   node scripts/probar-cobertura-previews.mjs --muestra=500
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const CATALOGO = join(RAIZ, 'public', 'data', 'dedicalo-song-catalog.full.clean.json');
const SALIDA = join(RAIZ, 'docs', 'evidencias');

const args = process.argv.slice(2);
const TODAS = args.includes('--todas');
const MUESTRA = Number((args.find((a) => a.startsWith('--muestra=')) || '').split('=')[1]) || 300;

// La API publica de iTunes limita a ~20 peticiones/minuto por IP. Se va
// despacio a proposito: reventarla daria falsos negativos y ensuciaria el
// dato, que es justo lo que no queremos de una prueba que decide una
// estrategia.
const PAUSA_MS = 3100;
const TIMEOUT_MS = 12000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Normaliza para comparar: quita acentos, parentesis de version
// ("- Remastered 2011", "(feat. X)") y signos.
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s*[-–—]\s*(remaster|remastered|remasterizado|version|single version|mono|stereo).*$/i, '')
    .replace(/\s*\((feat|con|with|remaster|remastered|remasterizado|version|en vivo|live)[^)]*\)/gi, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sin ISRC en el catalogo, el emparejamiento es por texto. La duracion es el
// desempate fiable: dos grabaciones distintas de la misma cancion rara vez
// coinciden en +-7 s. Sin esa comprobacion contariamos como "encontradas"
// versiones que en realidad son otra grabacion.
function emparejaBien(cancion, resultado) {
  const mismoTitulo = normalizar(resultado.trackName) === normalizar(cancion.title);
  const mismoArtista = normalizar(resultado.artistName).includes(normalizar(cancion.artist_main))
    || normalizar(cancion.artist_main).includes(normalizar(resultado.artistName));
  if (!mismoTitulo || !mismoArtista) return false;

  const durCat = Number(cancion.duration_ms || 0);
  const durRes = Number(resultado.trackTimeMillis || 0);
  if (durCat && durRes && Math.abs(durCat - durRes) > 7000) return false;
  return true;
}

async function buscar(cancion) {
  const term = `${cancion.artist_main} ${cancion.title}`.slice(0, 190);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}`
            + `&entity=song&limit=8&country=ES`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 403 || res.status === 429) return { estado: 'limitado' };
    if (!res.ok) return { estado: 'error', detalle: `HTTP ${res.status}` };
    const datos = await res.json();
    const candidatos = datos.results || [];
    const exacto = candidatos.find((r) => emparejaBien(cancion, r));
    if (!exacto) {
      return { estado: candidatos.length ? 'sin-coincidencia' : 'no-encontrada' };
    }
    if (!exacto.previewUrl) return { estado: 'sin-preview', anoApple: (exacto.releaseDate || '').slice(0, 4) };
    return {
      estado: 'ok',
      previewUrl: exacto.previewUrl,
      anoApple: (exacto.releaseDate || '').slice(0, 4)
    };
  } catch (e) {
    return { estado: 'error', detalle: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
}

// ── Ejecucion ────────────────────────────────────────────────────────────
const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));
console.log(`Catalogo: ${catalogo.length} canciones`);

// Muestra estratificada: proporcional por playlist, para que el porcentaje
// sea representativo del catalogo real y no de un trozo. Importa mucho:
// las playlists espanolas antiguas son las que mas riesgo tienen.
const porPlaylist = new Map();
for (const c of catalogo) {
  const k = c.playlist_source || 'sin-playlist';
  if (!porPlaylist.has(k)) porPlaylist.set(k, []);
  porPlaylist.get(k).push(c);
}

let seleccion = [];
if (TODAS) {
  seleccion = catalogo;
} else {
  for (const [, lista] of porPlaylist) {
    const cuota = Math.max(1, Math.round((lista.length / catalogo.length) * MUESTRA));
    const paso = Math.max(1, Math.floor(lista.length / cuota));
    for (let i = 0; i < lista.length && seleccion.length < MUESTRA + porPlaylist.size; i += paso) {
      seleccion.push(lista[i]);
    }
  }
}

const minutos = Math.ceil((seleccion.length * PAUSA_MS) / 60000);
console.log(`Comprobando ${seleccion.length} canciones (~${minutos} min por los limites de la API)\n`);

const resultados = [];
const conteo = {};
let hechas = 0;

for (const cancion of seleccion) {
  const r = await buscar(cancion);
  conteo[r.estado] = (conteo[r.estado] || 0) + 1;
  resultados.push({
    id: cancion.id,
    playlist: cancion.playlist_source,
    title: cancion.title,
    artist: cancion.artist_main,
    anoCatalogo: cancion.release_year,
    ...r
  });
  hechas++;
  if (hechas % 10 === 0 || hechas === seleccion.length) {
    const ok = conteo.ok || 0;
    process.stdout.write(`\r  ${hechas}/${seleccion.length}  con preview: ${ok} (${((ok / hechas) * 100).toFixed(1)}%)   `);
  }
  if (r.estado === 'limitado') {
    console.log('\n\n  La API esta limitando las peticiones. Parando para no ensuciar el dato.');
    console.log('  Vuelve a ejecutarlo dentro de un rato o con una muestra menor.\n');
    break;
  }
  await dormir(PAUSA_MS);
}

// ── Informe ──────────────────────────────────────────────────────────────
const total = resultados.length;
const ok = conteo.ok || 0;
const pct = total ? (ok / total) * 100 : 0;

const porLista = {};
for (const r of resultados) {
  const k = r.playlist || 'sin-playlist';
  porLista[k] = porLista[k] || { total: 0, ok: 0 };
  porLista[k].total++;
  if (r.estado === 'ok') porLista[k].ok++;
}

// Cuantos anos de Apple discrepan del catalogo ya corregido: si son muchos,
// migrar a Apple obligaria a re-auditar los anos otra vez.
const conAmbos = resultados.filter((r) => r.estado === 'ok' && r.anoApple && r.anoCatalogo);
const discrepan = conAmbos.filter((r) => Number(r.anoApple) !== Number(r.anoCatalogo));

const lineas = [];
lineas.push('PRUEBA DE COBERTURA DE PREVIEWS (Apple / iTunes)');
lineas.push('='.repeat(64));
lineas.push('');
lineas.push(`Fecha           : ${new Date().toISOString()}`);
lineas.push(`Catalogo total  : ${catalogo.length} canciones`);
lineas.push(`Comprobadas     : ${total}${TODAS ? ' (todas)' : ' (muestra estratificada por playlist)'}`);
lineas.push('');
lineas.push('RESULTADO GLOBAL');
lineas.push('-'.repeat(64));
lineas.push(`Con preview disponible : ${ok}/${total}  =  ${pct.toFixed(1)}%`);
lineas.push('');
lineas.push('Desglose por estado:');
for (const [k, v] of Object.entries(conteo).sort((a, b) => b[1] - a[1])) {
  lineas.push(`  ${k.padEnd(18)} ${String(v).padStart(5)}  (${((v / total) * 100).toFixed(1)}%)`);
}
lineas.push('');
lineas.push('POR PLAYLIST');
lineas.push('-'.repeat(64));
for (const [k, v] of Object.entries(porLista).sort((a, b) => (a[1].ok / a[1].total) - (b[1].ok / b[1].total))) {
  const p = (v.ok / v.total) * 100;
  lineas.push(`  ${p.toFixed(0).padStart(3)}%  ${String(v.ok).padStart(3)}/${String(v.total).padEnd(3)}  ${k}`);
}
lineas.push('');
lineas.push('COHERENCIA DE ANOS (Apple vs nuestro catalogo ya auditado)');
lineas.push('-'.repeat(64));
lineas.push(`Comparables     : ${conAmbos.length}`);
lineas.push(`Discrepan       : ${discrepan.length} (${conAmbos.length ? ((discrepan.length / conAmbos.length) * 100).toFixed(1) : 0}%)`);
lineas.push('  Si el porcentaje es alto, migrar a Apple obligaria a repetir la');
lineas.push('  auditoria de anos: sus fechas tienen el mismo problema de');
lineas.push('  recopilatorios que tenia Spotify.');
lineas.push('');
lineas.push('LECTURA');
lineas.push('-'.repeat(64));
if (pct >= 85) {
  lineas.push('  >= 85%  VIABLE. La cobertura da para sostener el juego.');
  lineas.push('          Siguiente paso: prototipo de reproduccion (Fase 1 del roadmap).');
} else if (pct >= 70) {
  lineas.push('  70-85%  JUSTO. Viable solo recortando o sustituyendo las canciones');
  lineas.push('          sin preview. Revisar el desglose por playlist: si el');
  lineas.push('          agujero se concentra en una lista, se puede retirar esa.');
} else {
  lineas.push('  < 70%   NO VIABLE tal cual. El catalogo actual no se sostiene');
  lineas.push('          sobre previews de Apple. Hay que replantear el catalogo');
  lineas.push('          o la via musical entera (ver ADR-0002).');
}
lineas.push('');
lineas.push('='.repeat(64));

const informe = lineas.join('\n');
console.log('\n\n' + informe);

mkdirSync(SALIDA, { recursive: true });
const fecha = new Date().toISOString().slice(0, 10);
writeFileSync(join(SALIDA, `cobertura-previews-${fecha}.txt`), informe + '\n', 'utf8');
writeFileSync(join(SALIDA, `cobertura-previews-${fecha}.json`), JSON.stringify(resultados, null, 2), 'utf8');
console.log(`\nGuardado en docs/evidencias/cobertura-previews-${fecha}.{txt,json}`);

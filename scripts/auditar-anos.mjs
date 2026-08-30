#!/usr/bin/env node
/**
 * AUDITORIA DE ANOS DEL CATALOGO
 *
 * Busca canciones cuyo `release_year` es probablemente incorrecto.
 *
 * Contexto: Spotify devuelve la fecha del ALBUM al que apunta la pista, no
 * la del lanzamiento original. Si esa pista cuelga de un recopilatorio, una
 * reedicion o un remaster, el ano sale disparado decadas hacia delante
 * ("Stayin Alive" como 2020). En un juego que consiste en adivinar el ano,
 * eso es un fallo grave.
 *
 * La auditoria de agosto de 2026 uso UNA sola senal (nombre de album con
 * pinta de recopilatorio) y corrigio 138 filas, pero se dejo fuera toda una
 * clase de errores: recopilatorios con nombre no evidente
 * ("Temazos y Hitazos: 70's"), reediciones de single, ediciones de
 * aniversario y bandas sonoras.
 *
 * Este script cruza VARIAS senales independientes para no depender de una
 * sola heuristica.
 *
 * Uso:  npm run auditar-anos
 * Salida: docs/evidencias/anos-sospechosos-FECHA.json  (para verificar)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const CATALOGO = join(RAIZ, 'public', 'data', 'dedicalo-song-catalog.full.clean.json');
const SALIDA = join(RAIZ, 'docs', 'evidencias');

const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));

// Una remezcla o version nueva SI tiene legitimamente un ano posterior: no
// es un error. Se excluyen para no llenar la lista de falsos positivos.
const ES_VERSION_NUEVA = /\b(remix|rmx|rework|radio edit|club mix|extended mix)\b/i;

const SENALES = {
  recopilatorio: /greatest hits|best of|grandes exitos|grandes éxitos|the collection|anthology|remaster|exitos|éxitos|hits|coleccion|colección|classics|megamix|the ultimate|essential|complete recordings|deluxe|lo mejor|antologia|antología|temazos|hitazos|\bvol\.? ?\d/i,
  aniversario: /\b(aniversario|anniversary|edicion especial|edición especial|reedicion|reedición|remasteriz|\d{2}th)\b/i,
  directo: /\b(en directo|en vivo|live at|unplugged|acustico|acústico|concierto)\b/i,
  bandaSonora: /\b(soundtrack|banda sonora|b\.?s\.?o\.?|original motion picture|música de la película)\b/i
};

// Mediana de ano por artista: si un artista tiene varias canciones agrupadas
// en una epoca y UNA se va muchos anos por delante, esa es sospechosa de
// llevar fecha de reedicion. Es la senal mas potente porque no depende de
// como se llame el album.
const porArtista = new Map();
for (const s of catalogo) {
  const k = (s.artist_main || '').toLowerCase().trim();
  if (!k) continue;
  if (!porArtista.has(k)) porArtista.set(k, []);
  porArtista.get(k).push(s);
}
const medianaPorArtista = new Map();
for (const [artista, canciones] of porArtista) {
  if (canciones.length < 3) continue;
  const anos = canciones.map((s) => Number(s.release_year)).sort((a, b) => a - b);
  medianaPorArtista.set(artista, anos[Math.floor(anos.length / 2)]);
}

const UMBRAL_OUTLIER = 12;

const sospechosas = new Map(); // por spotify_track_id, para no duplicar

for (const s of catalogo) {
  const motivos = [];
  const album = s.album || '';
  const titulo = s.title || '';
  const ano = Number(s.release_year);

  for (const [nombre, patron] of Object.entries(SENALES)) {
    if (patron.test(album) || patron.test(titulo)) motivos.push(nombre);
  }

  const artista = (s.artist_main || '').toLowerCase().trim();
  const mediana = medianaPorArtista.get(artista);
  if (mediana && ano - mediana >= UMBRAL_OUTLIER && !ES_VERSION_NUEVA.test(titulo)) {
    motivos.push(`outlier(+${ano - mediana} sobre ~${mediana} de su artista)`);
  }

  if (!motivos.length) continue;

  const clave = s.spotify_track_id || `${titulo}|${s.artist_main}`;
  if (sospechosas.has(clave)) {
    sospechosas.get(clave).ids.push(s.id);
    continue;
  }
  sospechosas.set(clave, {
    ids: [s.id],
    title: titulo,
    artist: s.artist_main,
    album,
    current_release_year: ano,
    duration_ms: s.duration_ms,
    motivos,
    // Cuantas senales distintas -> mas probable que este mal de verdad
    fuerza: motivos.length
  });
}

const lista = [...sospechosas.values()].sort((a, b) => b.fuerza - a.fuerza);
const filas = lista.reduce((n, s) => n + s.ids.length, 0);

console.log(`Catalogo            : ${catalogo.length} filas`);
console.log(`Canciones unicas    : ${sospechosas.size} sospechosas (${filas} filas del catalogo)`);
console.log('');
const porMotivo = {};
for (const s of lista) for (const m of s.motivos) {
  const clave = m.startsWith('outlier') ? 'outlier por artista' : m;
  porMotivo[clave] = (porMotivo[clave] || 0) + 1;
}
console.log('Por senal:');
for (const [m, n] of Object.entries(porMotivo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(24)} ${n}`);
}
console.log('');
console.log('Las 15 mas sospechosas (mas senales coincidiendo):');
for (const s of lista.slice(0, 15)) {
  console.log(`  ${s.current_release_year}  ${s.artist} - ${s.title}`);
  console.log(`         album: ${s.album}`);
  console.log(`         senales: ${s.motivos.join(', ')}`);
}

mkdirSync(SALIDA, { recursive: true });
const fecha = new Date().toISOString().slice(0, 10);
const destino = join(SALIDA, `anos-sospechosos-${fecha}.json`);
writeFileSync(destino, JSON.stringify(lista, null, 2), 'utf8');
console.log(`\nGuardado: docs/evidencias/anos-sospechosos-${fecha}.json`);
console.log('Siguiente paso: verificar cada una contra fuente fiable y aplicar correcciones.');

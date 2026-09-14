#!/usr/bin/env node
/**
 * PARTIR EL CATÁLOGO POR LISTA
 *
 * `dedicalo-song-catalog.full.clean.json` pesa 3,4 MB y lo descarga ENTERO
 * cada persona que entra a jugar — en una fiesta, seis móviles a la vez, con
 * el wifi del bar. Es de lejos la descarga más grande del juego, más que todo
 * el JavaScript junto.
 *
 * Y se descarga entero para nada, por dos motivos:
 *
 *   1. CAMPOS QUE NADIE LEE. Cada fila trae 34 campos (playlist_owner,
 *      duration_ms, popularity, explicit, tags, needs_review, notes,
 *      question_artist, catalog_index…). El juego usa OCHO. El resto son
 *      datos de trabajo del propio catálogo, útiles para los scripts que lo
 *      mantienen, inútiles para jugar.
 *
 *   2. SEIS LISTAS QUE NO SE VAN A TOCAR. Una partida se juega con UNA lista.
 *      Hay siete, de unas 300 canciones cada una. Bajar las otras seis es
 *      tirar el 86% de la descarga.
 *
 * Aquí se genera un archivo por lista, con solo los campos que se usan y solo
 * las canciones que de verdad tienen fragmento. El catálogo completo se queda
 * donde está: lo siguen usando los scripts de mantenimiento, y `musica.js`
 * recurre a él si una lista partida no existiera.
 *
 *   node scripts/partir-catalogo.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const ENTRADA = join(RAIZ, 'public/data/dedicalo-song-catalog.full.clean.json');
const SALIDA = join(RAIZ, 'public/data/listas');

/** Lo único que `cancionDesdeFila` de musica.js llega a leer. */
const CAMPOS = [
  'spotify_uri',
  'spotify_track_id',
  'title',
  'artist_main',
  'release_year',
  'preview_url',
  'cover_url'
];

const catalogo = JSON.parse(readFileSync(ENTRADA, 'utf8'));
mkdirSync(SALIDA, { recursive: true });

const porLista = new Map();
for (const fila of catalogo) {
  if (!fila.playlist_id) continue;
  if (!porLista.has(fila.playlist_id)) porLista.set(fila.playlist_id, []);
  porLista.get(fila.playlist_id).push(fila);
}

const kb = (b) => (b / 1024).toFixed(0).padStart(5);
const pesoOriginal = statSync(ENTRADA).size;
let pesoTotal = 0;

console.log(`\n  Catálogo completo: ${kb(pesoOriginal)} KB — ${catalogo.length} canciones\n`);
console.log('  lista                       canciones  jugables    peso');
console.log('  ' + '─'.repeat(58));

for (const [id, filas] of porLista) {
  const jugables = filas.filter((f) => f.preview_url);

  const canciones = jugables.map((f) => {
    const o = {};
    for (const c of CAMPOS) if (f[c] != null && f[c] !== '') o[c] = f[c];
    return o;
  });

  // `total` viaja aparte para que `coberturaDeLista` siga pudiendo avisar de
  // cuántas canciones de la lista no tienen fragmento — el dato que permite
  // advertir ANTES de empezar la partida, no a mitad.
  const documento = { total: filas.length, canciones };
  const destino = join(SALIDA, `${id}.json`);
  writeFileSync(destino, JSON.stringify(documento));

  const peso = statSync(destino).size;
  pesoTotal += peso;
  console.log(`  ${id.padEnd(26)} ${String(filas.length).padStart(7)} ${String(jugables.length).padStart(9)}  ${kb(peso)} KB`);
}

console.log('  ' + '─'.repeat(58));
console.log(`\n  Una partida descargaba ${kb(pesoOriginal)} KB.`);
console.log(`  Ahora descarga una sola lista: ~${kb(pesoTotal / porLista.size)} KB.`);
console.log(`  Reducción por partida: ${(100 - (pesoTotal / porLista.size / pesoOriginal) * 100).toFixed(0)}%\n`);

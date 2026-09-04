#!/usr/bin/env node
/**
 * SEGUNDA OPINIÓN SOBRE LOS AÑOS SOSPECHOSOS
 *
 *   npm run anos-musicbrainz -- <archivo de sospechosas.json>
 *
 * El año que trae Spotify es el del ÁLBUM enlazado, así que un recopilatorio
 * o un remaster lo disparan décadas hacia delante. MusicBrainz sí modela la
 * fecha de PRIMER lanzamiento de una grabación, que es justo lo que el juego
 * pregunta ("¿de qué año es esta canción?").
 *
 * Aquí no se aplica nada: se propone y se deja por escrito para revisar.
 * Las heurísticas dan dos falsos positivos de cada tres (ver
 * docs/evidencias/anos-pendientes.md), así que nunca se corrige a ciegas.
 *
 * MusicBrainz pide identificarse y admite 1 petición por segundo.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ruta = process.argv[2];
if (!ruta) {
  console.error('Uso: npm run anos-musicbrainz -- <archivo.json>');
  process.exit(1);
}

const AGENTE = 'DedicaloPlay/0.4 (https://play.dedicalo.es)';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function limpiar(txt) {
  return String(txt || '')
    .replace(/\s*[-–—]\s*(remaster|remasterizado|remastered|en vivo|live|version|versi[oó]n|single|radio edit|edit|album version)\b.*$/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/["\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function primerLanzamiento(titulo, artista) {
  const q = `recording:"${limpiar(titulo)}" AND artist:"${limpiar(artista)}"`;
  const u = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&limit=10&fmt=json`;

  for (let intento = 0; intento < 4; intento += 1) {
    let r;
    try {
      r = await fetch(u, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' } });
    } catch {
      await dormir(2500 * (intento + 1));
      continue;
    }
    if (r.status === 503 || r.status === 429) { await dormir(3000 * (intento + 1)); continue; }
    if (!r.ok) return { ano: null, motivo: `http ${r.status}` };

    const data = await r.json();
    const buenos = (data.recordings || []).filter((rec) => (rec.score ?? 0) >= 88);
    if (!buenos.length) return { ano: null, motivo: 'sin coincidencia' };

    // De todas las ediciones de esa grabación, la fecha más antigua.
    let min = null;
    for (const rec of buenos) {
      const fechas = [rec['first-release-date']];
      for (const rel of rec.releases || []) {
        fechas.push(rel.date, rel['release-group']?.['first-release-date']);
      }
      for (const f of fechas) {
        const a = Number(String(f || '').slice(0, 4));
        if (a > 1900 && a <= new Date().getFullYear() + 1 && (min === null || a < min)) min = a;
      }
    }
    return min ? { ano: min, motivo: 'ok' } : { ano: null, motivo: 'sin fecha' };
  }
  return { ano: null, motivo: 'no responde' };
}

const lista = JSON.parse(readFileSync(ruta, 'utf8'));
console.log(`Consultando MusicBrainz para ${lista.length} canciones (1 por segundo)...\n`);

const salida = [];
for (let i = 0; i < lista.length; i += 1) {
  const s = lista[i];
  const res = await primerLanzamiento(s.title, s.artist);
  const cambia = res.ano && res.ano !== s.current_release_year;
  salida.push({
    ids: s.ids,
    title: s.title,
    artist: s.artist,
    album: s.album,
    current_release_year: s.current_release_year,
    musicbrainz_year: res.ano,
    diferencia: res.ano ? res.ano - s.current_release_year : null,
    motivo: res.motivo,
    propone_cambio: Boolean(cambia)
  });
  process.stdout.write(
    `\r  ${i + 1}/${lista.length}  ${String(res.ano || '----')}  ${s.artist} — ${s.title}`.slice(0, 105).padEnd(107)
  );
  if (i % 15 === 0) writeFileSync(ruta.replace(/\.json$/, '-musicbrainz.json'), JSON.stringify(salida, null, 2), 'utf8');
  await dormir(1150);
}
process.stdout.write('\n');

const destino = ruta.replace(/\.json$/, '-musicbrainz.json');
writeFileSync(destino, JSON.stringify(salida, null, 2), 'utf8');

const proponen = salida.filter((s) => s.propone_cambio);
const sinDato = salida.filter((s) => !s.musicbrainz_year);
console.log(`\nCon dato de MusicBrainz: ${salida.length - sinDato.length}   Sin dato: ${sinDato.length}`);
console.log(`Proponen un año distinto: ${proponen.length}\n`);
proponen
  .sort((a, b) => a.diferencia - b.diferencia)
  .slice(0, 30)
  .forEach((s) => console.log(`  ${s.current_release_year} -> ${s.musicbrainz_year}  (${s.diferencia})  ${s.artist} — ${s.title}`));
console.log(`\nGuardado en ${destino}`);
console.log('NO se ha tocado el catálogo: revisa antes de aplicar.');

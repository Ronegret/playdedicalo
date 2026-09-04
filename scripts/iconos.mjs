#!/usr/bin/env node
/**
 * ICONOS: mantiene el subconjunto de Material Symbols de index.html
 *
 * Por defecto Google sirve la fuente de iconos ENTERA: 1,1 MB para dibujar
 * unas decenas. Es el 85% de lo que descarga un invitado al abrir el enlace,
 * y bloquea el dibujado. Pidiendo solo los que se usan baja a unos 10 KB.
 *
 * El riesgo de un subconjunto es olvidarse uno: si un icono no viaja en la
 * fuente, el navegador dibuja su NOMBRE en texto plano en mitad de la
 * pantalla. Y aquí muchos iconos no son literales en el JSX — salen de
 * constantes (`icon: 'bolt'`), de ternarios (`copied ? 'check' : ...`) y de
 * props. Por eso esto es un script y no una lista escrita a mano: se vuelve
 * a derivar del código cada vez.
 *
 *   npm run iconos            actualiza index.html
 *   npm run iconos -- --check falla si index.html no está al día (para CI)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';

const RAIZ = process.cwd();
const INDEX = join(RAIZ, 'index.html');

const fuentes = globSync('src/**/*.{jsx,js}', { cwd: RAIZ }).map((f) => join(RAIZ, f));

// Nombre de icono válido de Material Symbols: minúsculas y guiones bajos.
const NOMBRE = /^[a-z][a-z0-9_]*$/;

// Palabras que pasan el filtro de forma pero NO son iconos: variables,
// props y valores sueltos que aparecen en los mismos contextos.
const NO_SON_ICONOS = new Set([
  'icon', 'true', 'false', 'null', 'undefined', 'default', 'className',
  'fallback', 'nextIcon', 'prev', 'next', 'index', 'text', 'title', 'name',
  'color', 'accent', 'format', 'type', 'short', 'description', 'mode',
  'timeline', 'album'
]);

const iconos = new Set();
const anadir = (v) => {
  if (v && NOMBRE.test(v) && !NO_SON_ICONOS.has(v) && v.length > 2) iconos.add(v);
};

for (const archivo of fuentes) {
  const src = readFileSync(archivo, 'utf8');

  // 1) Literales dentro de un <span class="material-symbols-outlined">…</span>
  for (const m of src.matchAll(/material-symbols-outlined[^>]*>\s*([a-z_]+)\s*</g)) anadir(m[1]);

  // 2) Ternarios y expresiones dentro de esos spans: {a ? 'check' : 'close'}
  for (const m of src.matchAll(/material-symbols-outlined[^>]*>\{([^}]*)\}/g)) {
    for (const s of m[1].matchAll(/'([a-z_]+)'/g)) anadir(s[1]);
  }

  // 3) Iconos declarados en datos: { icon: 'bolt', … }
  for (const m of src.matchAll(/\bicon:\s*'([a-z_]+)'/g)) anadir(m[1]);

  // 4) Iconos pasados como prop: icon="bolt" / nextIcon="arrow_forward"
  for (const m of src.matchAll(/\b(?:icon|nextIcon|fallbackIcon)=["']([a-z_]+)["']/g)) anadir(m[1]);
  for (const m of src.matchAll(/\b(?:icon|nextIcon|fallback)\s*=\s*\{?\s*'([a-z_]+)'/g)) anadir(m[1]);
}

const lista = [...iconos].sort();

// Se piden con los mismos ejes variables que ya usaba la URL original
// (peso 100..700 y relleno 0..1) para no cambiar cómo se ven.
const URL_ICONOS = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=${lista.join(',')}&display=block`;

const html = readFileSync(INDEX, 'utf8');
const LINEA = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols[^"]*" rel="stylesheet">/;

if (!LINEA.test(html)) {
  console.error('No encuentro la línea de Material Symbols en index.html.');
  process.exit(1);
}

const nuevo = html.replace(LINEA, `<link href="${URL_ICONOS}" rel="stylesheet">`);
const comprobar = process.argv.includes('--check');

console.log(`Iconos usados en el código: ${lista.length}`);
console.log(lista.join(', '));

if (comprobar) {
  if (nuevo !== html) {
    console.error('\nindex.html NO está al día. Ejecuta: npm run iconos');
    process.exit(1);
  }
  console.log('\nindex.html está al día.');
} else if (nuevo === html) {
  console.log('\nindex.html ya estaba al día.');
} else {
  writeFileSync(INDEX, nuevo, 'utf8');
  console.log('\nindex.html actualizado.');
}

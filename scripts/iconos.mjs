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
  'color', 'accent', 'format', 'type', 'short', 'description', 'mode'
  // OJO: aquí estuvieron 'album' y 'timeline', y era un FALLO. Los dos son
  // iconos de verdad y el código los usa: 'album' dos veces en
  // ShaderBackground (que es GLOBAL, así que salía en todas las pantallas) y
  // 'timeline' en HowToPlayScreen. Al estar en esta lista no viajaban en el
  // subconjunto, y el navegador dibujaba las palabras "ALBUM" y "TIMELINE" en
  // grande sobre el fondo. Justo el fallo que este script existe para evitar,
  // causado por el propio script.
  //
  // Antes de meter una palabra aquí: comprueba que NO es un nombre válido de
  // Material Symbols. Un falso positivo solo añade unos bytes; un icono de
  // verdad en esta lista se publica como texto en mitad de la pantalla.
]);

const iconos = new Set();
const anadir = (v) => {
  // 2 caracteres es un nombre válido: 'tv' existe y se estaba descartando,
  // que es justo el fallo que este script tiene que evitar. Un falso
  // positivo solo añade unos bytes a la fuente; un icono que falta se dibuja
  // como una palabra en mitad de la pantalla.
  if (v && NOMBRE.test(v) && !NO_SON_ICONOS.has(v) && v.length >= 2) iconos.add(v);
};

for (const archivo of fuentes) {
  const src = readFileSync(archivo, 'utf8');

  // 1) Literales dentro de un <span class="material-symbols-outlined">…</span>
  for (const m of src.matchAll(/material-symbols-outlined[^>]*>\s*([a-z_]+)\s*</g)) anadir(m[1]);

  // 2) Ternarios y expresiones dentro de esos spans: {a ? 'check' : 'close'}
  // El \s* después del > es imprescindible: cuando el JSX se parte en varias
  // líneas la llave no va pegada al cierre de etiqueta, y sin esto el
  // extractor no veía esos iconos. Pasó de verdad con el interruptor de
  // "dónde suena", que habría publicado las palabras "tv" y "smartphone"
  // escritas en pantalla en vez de los dibujos.
  for (const m of src.matchAll(/material-symbols-outlined[^>]*>\s*\{([^}]*)\}/g)) {
    for (const s of m[1].matchAll(/'([a-z_]+)'/g)) anadir(s[1]);
  }

  // 3) Iconos declarados en datos: { icon: 'bolt', … } o { icono: 'bolt', … }
  //
  // El nombre en castellano hace falta de verdad: el código nuevo se escribe
  // en castellano, y buscando solo `icon:` se colaron `library_music` y
  // `sports_esports` en la pantalla de televisión — dibujados como esas dos
  // palabras enormes en mitad del televisor. Es exactamente el fallo que
  // este script existe para evitar, y se escapó por el idioma.
  for (const m of src.matchAll(/\b(?:icon|icono):\s*'([a-z_]+)'/g)) anadir(m[1]);

  // 4) Iconos pasados como prop: icon="bolt" / nextIcon="arrow_forward"
  for (const m of src.matchAll(/\b(?:icon|nextIcon|fallbackIcon)=["']([a-z_]+)["']/g)) anadir(m[1]);
  for (const m of src.matchAll(/\b(?:icon|nextIcon|fallback)\s*=\s*\{?\s*'([a-z_]+)'/g)) anadir(m[1]);

  // 5) Mapas de iconos: const ICONO = { auto: 'screen_rotation', … }, que
  //    luego se usan como {ICONO[modo]}. Ahí no hay literal en el JSX, así
  //    que sin esto se quedarían fuera del subconjunto y se dibujarían como
  //    palabras sueltas. Pasó de verdad al añadir el control de orientación.
  for (const m of src.matchAll(/\b(?:const|let)\s+\w*[Ii][Cc][Oo][Nn]\w*\s*=\s*\{([^}]*)\}/g)) {
    for (const v of m[1].matchAll(/:\s*'([a-z_]+)'/g)) anadir(v[1]);
  }
}

const lista = [...iconos].sort();

// La lista ya NO se escribe como un <link> a Google: la fuente de iconos se
// sirve desde el propio dominio (ver scripts/fuentes.mjs), así que el
// navegador de quien juega no se conecta a ningún tercero.
//
// Pero la lista sigue haciendo falta, porque es el parámetro con el que
// Google arma el subconjunto al descargarlo. Vive aquí, en un <meta>, y
// `fuentes.mjs` la lee de aquí. Así este script sigue siendo la única fuente
// de verdad de qué iconos usa el juego.
const META = /<meta name="dedicalo-iconos" content="[^"]*"\s*\/?>/;

const html = readFileSync(INDEX, 'utf8');

if (!META.test(html)) {
  console.error('No encuentro <meta name="dedicalo-iconos"> en index.html.');
  process.exit(1);
}

const nuevo = html.replace(META, `<meta name="dedicalo-iconos" content="${lista.join(',')}" />`);
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

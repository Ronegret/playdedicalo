#!/usr/bin/env node
/**
 * AUTOALOJAR LAS TIPOGRAFÍAS
 *
 * index.html pedía cuatro familias al CDN de Google. Para una app instalada
 * eso es un problema de verdad, no de purismo:
 *
 *   1. ARRANQUE ATADO A LA RED. Antes de poder pintar bien una sola palabra
 *      hay que resolver un DNS, negociar TLS, bajar un CSS y bajar los
 *      archivos que ese CSS nombre. Son dos viajes encadenados a un servidor
 *      ajeno. Una app instalada no puede depender de internet para dibujar su
 *      propia letra — y esta app se abre en fiestas, con el wifi del bar.
 *
 *   2. EL TEXTO SALTA. `display=swap` pinta primero con la letra del sistema
 *      y la cambia al llegar la buena: el texto se mueve delante de los ojos.
 *      Es de las cosas que más gritan "esto es una página web".
 *
 *   3. COPIAS DEL MISMO ARCHIVO. Google Fonts sirve tipos VARIABLES: un solo
 *      archivo contiene todos los pesos de 400 a 900. Bajándolo peso a peso
 *      salían cuatro copias byte a byte idénticas de cada familia. Aquí se
 *      deduplica por contenido y se declara UNA vez con rango de pesos, que
 *      además es como hay que declarar un tipo variable.
 *
 *   4. ALFABETOS QUE NO SE USAN. Google sirve el mismo tipo troceado en
 *      cirílico, griego, vietnamita y latín extendido. El juego está en
 *      castellano: con latin y latin-ext sobra. Lo demás son descargas que no
 *      dibujan nada.
 *
 * Este script baja los archivos, se queda con los alfabetos útiles y escribe
 * un CSS local. A partir de ahí el arranque no depende de ningún tercero, y
 * de paso desaparece la conexión a Google desde el navegador de quien juega,
 * que es un dato menos que declarar en la política de privacidad.
 *
 *   node scripts/fuentes.mjs
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const RAIZ = process.cwd();
const DIR = join(RAIZ, 'public/fonts');

// Un navegador de escritorio moderno: si Google cree que hablamos con algo
// viejo, devuelve TTF en vez de WOFF2 y pesaría el triple.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Solo lo que el castellano necesita. */
const ALFABETOS = new Set(['latin', 'latin-ext']);

/** Los mismos pesos que ya pedía index.html, ni uno más. */
const FAMILIAS = [
  'Montserrat:ital,wght@0,400;0,700;0,800;0,900;1,800',
  'Hanken+Grotesk:wght@400;500;600;700',
  'Space+Mono:ital,wght@0,400;0,700;1,400',
  'Barlow+Condensed:wght@600;700;800;900'
];

mkdirSync(DIR, { recursive: true });

async function bajar(url, binario = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} en ${url}`);
  return binario ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const trozos = [];
const vistos = new Map();
let duplicados = 0;
let total = 0;
let descargados = 0;
let omitidos = 0;

for (const familia of FAMILIAS) {
  const nombre = familia.split(':')[0].replace(/\+/g, ' ');
  // `display=block` en vez de `swap`: en vez de pintar con otra letra y
  // cambiarla a la vista (el "salto"), espera un momento y pinta ya con la
  // definitiva. Sirviéndola desde el mismo origen esa espera es de unos
  // milisegundos, así que no se percibe — y el salto desaparece.
  const css = await bajar(`https://fonts.googleapis.com/css2?family=${familia}&display=block`);

  /* El CSS de Google viene así:
   *
   *     |/* latin-ext *\|
   *     @font-face { ... }
   *     |/* latin *\|
   *     @font-face { ... }
   *
   * El comentario que ETIQUETA un bloque va SIEMPRE justo antes de él. Si se
   * parte el texto por '@font-face', ese comentario queda al FINAL del trozo
   * anterior, no dentro del suyo — y leerlo desde dentro etiqueta cada tipo
   * con el nombre del SIGUIENTE. Ese desplazamiento de uno es lo que dejó a
   * Montserrat y Barlow Condensed sin el subconjunto que contiene la Ñ y las
   * vocales acentuadas: el juego entero se dibujaba con la letra de respaldo.
   *
   * Se captura el par comentario+bloque de una vez, que no se puede desalinear.
   */
  const BLOQUE = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;

  for (const [, alfabeto, cuerpo] of css.matchAll(BLOQUE)) {
    if (!ALFABETOS.has(alfabeto)) { omitidos++; continue; }

    const src = cuerpo.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!src) continue;

    const peso = (cuerpo.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
    const estilo = (cuerpo.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
    const rango = (cuerpo.match(/unicode-range:\s*([^;]+);?/) || [])[1];

    const datos = await bajar(src[1], true);
    const huella = createHash('sha1').update(datos).digest('hex').slice(0, 8);

    // La clave NO lleva la huella: los distintos pesos de una familia
    // devuelven el mismo archivo variable y tienen que agruparse en una sola
    // declaración. Metiendo la huella en la clave salían declaraciones
    // duplicadas que se pisaban entre sí.
    const clave = `${nombre}|${estilo}|${alfabeto}`;
    if (vistos.has(clave)) {
      vistos.get(clave).pesos.push(Number(peso));
      duplicados++;
      continue;
    }

    const archivo = `${nombre.toLowerCase().replace(/\s+/g, '-')}-${estilo}-${alfabeto}-${huella}.woff2`;
    if (!existsSync(join(DIR, archivo))) writeFileSync(join(DIR, archivo), datos);
    descargados++;
    total += datos.length;

    vistos.set(clave, { nombre, estilo, alfabeto, archivo, rango, pesos: [Number(peso)] });
  }
  console.log(`  ${nombre}`);
}

for (const f of vistos.values()) {
  // Un tipo variable se declara con RANGO de pesos, no con un peso suelto:
  // así el navegador interpola cualquier grosor intermedio a partir del
  // único archivo, en vez de fingir la negrita engordando los trazos.
  const min = Math.min(...f.pesos);
  const max = Math.max(...f.pesos);
  const peso = min === max ? String(min) : `${min} ${max}`;
  trozos.push(
    `@font-face{font-family:'${f.nombre}';font-style:${f.estilo};font-weight:${peso};` +
    `font-display:block;src:url('/fonts/${f.archivo}') format('woff2');` +
    (f.rango ? `unicode-range:${f.rango.trim()};` : '') + '}'
  );
}

/* -- Material Symbols ------------------------------------------------------
   La fuente de iconos tambien venia de Google, y era la ultima conexion a un
   tercero que le quedaba al navegador de quien juega.

   Tiene una particularidad: el subconjunto lo arma Google en el servidor a
   partir del parametro `icon_names` de la URL. Asi que aqui se lee esa lista
   del propio index.html -la que mantiene scripts/iconos.mjs- y se baja el
   archivo YA recortado. Mientras ese script siga siendo la fuente de verdad
   de que iconos se usan, esto no se puede desincronizar.

   IMPORTANTE: al anadir un icono nuevo hay que volver a pasar por aqui
   (`npm run iconos && npm run fuentes`), o el icono nuevo no estara en el
   archivo local y se dibujara como su nombre en texto.
-------------------------------------------------------------------------- */
const indexHtml = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const nombresIconos = (indexHtml.match(/name="dedicalo-iconos" content="([^"]+)"/) || [])[1];

if (nombresIconos) {
  const urlIconos = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=${nombresIconos}&display=block`;
  const cssIconos = await bajar(urlIconos);
  const srcIconos = cssIconos.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);

  if (srcIconos) {
    const datosIconos = await bajar(srcIconos[1], true);
    const huellaIconos = createHash('sha1').update(datosIconos).digest('hex').slice(0, 8);
    const archivoIconos = `material-symbols-${huellaIconos}.woff2`;
    writeFileSync(join(DIR, archivoIconos), datosIconos);
    total += datosIconos.length;

    // Se conservan las variaciones que declara Google (wght y FILL): son las
    // que permiten que un icono se rellene o engorde sin otro archivo.
    const variaciones = (cssIconos.match(/font-variation-settings:[^;]+;/) || [''])[0];
    trozos.push(
      `@font-face{font-family:'Material Symbols Outlined';font-style:normal;` +
      `font-weight:100 700;font-display:block;` +
      `src:url('/fonts/${archivoIconos}') format('woff2');${variaciones}}`
    );
    console.log(`  Material Symbols (${(datosIconos.length / 1024).toFixed(0)} KB, ${nombresIconos.split(',').length} iconos)`);
  }
}

writeFileSync(join(DIR, 'fuentes.css'), trozos.join('\n') + '\n');

console.log(`\n  ${descargados} archivos nuevos, ${omitidos} alfabetos omitidos (cirílico, griego, vietnamita…)`);
console.log(`  ${trozos.length} declaraciones · ${(total / 1024).toFixed(0)} KB en total\n`);
console.log('  index.html ya apunta a /fonts/fuentes.css — no hay nada que tocar a mano.');
console.log('  y añadir  <link rel="stylesheet" href="/fonts/fuentes.css">\n');

#!/usr/bin/env node
/**
 * OPTIMIZAR IMÁGENES
 *
 * public/images pesaba 9,9 MB en PNG. Para una app que se abre escaneando un
 * QR en una fiesta, con el wifi del bar y seis móviles a la vez, eso no es un
 * detalle: es la diferencia entre entrar y no entrar.
 *
 * Tres cosas mal, por orden de gravedad:
 *
 *   1. PESO MUERTO. hero-home.png (1,9 MB) y logo-horizontal.png (1,15 MB)
 *      no los referencia NADIE en src/. Tres megas que viajaban al build sin
 *      que ninguna pantalla los pintara.
 *   2. FORMATO. PNG para fotografías y degradados es el peor caso posible:
 *      está pensado para dibujos con pocos colores. En WebP la misma imagen
 *      baja un 85-95% sin diferencia visible.
 *   3. TAMAÑO. Los fondos son de 1672×941 y se pintan en un móvil de 400 px
 *      de ancho. El móvil descarga cuatro veces los píxeles que puede
 *      enseñar, y además gasta memoria y tiempo en reescalarlos.
 *
 * Los PNG originales NO se borran: se quedan como fuente para poder volver a
 * generar. Lo que cambia es a qué apunta el código.
 *
 *   node scripts/optimizar-imagenes.mjs
 *   node scripts/optimizar-imagenes.mjs --limpiar   (además borra los huérfanos)
 */

import sharp from 'sharp';
import { readdirSync, statSync, existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';

const RAIZ = process.cwd();
const DIR = join(RAIZ, 'public/images');
const limpiar = process.argv.includes('--limpiar');

/**
 * Ancho máximo por imagen.
 *
 * No hay ninguna que se pinte a más de 900 px reales en el móvil, y las que
 * van a la tele se dibujan con CSS, no con un PNG gigante. Se deja algo de
 * margen para pantallas de densidad 2x.
 */
const ANCHOS = {
  'background-dark': 1280,
  'hero-how-to-play': 1024,
  'logo-main': 512,
  'vinilo': 512,
  'icon-app': 512,
  'hero-home': 1024,
  'logo-horizontal': 1024
};

const CALIDAD = 82;

/**
 * Imágenes que se usan de FONDO, detrás de texto.
 *
 * `hero-how-to-play` es una captura del propio juego, con sus propios textos
 * dentro ("Únete y escucha", "Sala 873216"…). Puesta detrás de un titular,
 * esos textos se leen por debajo del texto de verdad y la pantalla queda
 * ilegible: no hay velo que arregle eso, porque el problema no es el brillo
 * sino que compiten dos textos.
 *
 * Desenfocarla en el propio archivo la convierte en lo que debía ser: color,
 * luz y ambiente. Además baja bastante de peso, porque el desenfoque quita
 * justo el detalle fino que más le cuesta comprimir a WebP.
 */
const DESENFOCAR = { 'hero-how-to-play': 18 };

/** ¿Lo referencia alguien en el código? */
function estaEnUso(base) {
  const fuentes = [
    ...globSync('src/**/*.{jsx,js,css}', { cwd: RAIZ }),
    'index.html',
    'public/manifest.json',
    'public/sw.js'
  ];
  return fuentes.some((f) => {
    const ruta = join(RAIZ, f);
    if (!existsSync(ruta)) return false;
    return readFileSync(ruta, 'utf8').includes(base);
  });
}

const kb = (b) => (b / 1024).toFixed(0).padStart(5);

let antes = 0;
let despues = 0;
const huerfanos = [];

console.log('\n  archivo                      antes    después   ahorro');
console.log('  ' + '─'.repeat(58));

for (const nombre of readdirSync(DIR)) {
  if (!/\.(png|jpe?g)$/i.test(nombre)) continue;

  const base = nombre.replace(/\.(png|jpe?g)$/i, '');
  const entrada = join(DIR, nombre);
  const pesoAntes = statSync(entrada).size;

  if (!estaEnUso(base)) {
    huerfanos.push({ nombre, entrada, peso: pesoAntes });
    continue;
  }

  const salida = join(DIR, `${base}.webp`);
  const ancho = ANCHOS[base] || 1024;

  const meta = await sharp(entrada).metadata();
  const desenfoque = DESENFOCAR[base];
  let tuberia = sharp(entrada);
  if (desenfoque) tuberia = tuberia.blur(desenfoque);
  await tuberia
    // `withoutEnlargement` para no inflar una imagen que ya era pequeña:
    // reescalar hacia arriba solo añade peso y la deja borrosa.
    .resize({ width: Math.min(ancho, meta.width), withoutEnlargement: true })
    .webp({ quality: CALIDAD, effort: 6 })
    .toFile(salida);

  const pesoDespues = statSync(salida).size;
  antes += pesoAntes;
  despues += pesoDespues;

  const pct = (100 - (pesoDespues / pesoAntes) * 100).toFixed(0);
  console.log(`  ${base.padEnd(24)} ${kb(pesoAntes)} KB ${kb(pesoDespues)} KB    -${pct}%`);
}

console.log('  ' + '─'.repeat(58));
console.log(`  ${'TOTAL'.padEnd(24)} ${kb(antes)} KB ${kb(despues)} KB    -${(100 - (despues / antes) * 100).toFixed(0)}%`);

if (huerfanos.length) {
  const peso = huerfanos.reduce((s, h) => s + h.peso, 0);
  console.log(`\n  Sin usar en el código (${kb(peso)} KB):`);
  for (const h of huerfanos) console.log(`    ${h.nombre.padEnd(24)} ${kb(h.peso)} KB`);
  if (limpiar) {
    for (const h of huerfanos) unlinkSync(h.entrada);
    console.log('  → borrados (--limpiar).');
  } else {
    console.log('  → repasa la lista y, si sobran, vuelve con --limpiar.');
  }
}

console.log('\n  Recuerda apuntar el código a los .webp.\n');

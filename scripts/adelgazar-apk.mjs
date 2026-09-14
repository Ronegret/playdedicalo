#!/usr/bin/env node
/**
 * QUITAR DEL APK LO QUE SOLO HACE FALTA EN LA WEB
 *
 * `npx cap sync` copia la carpeta `dist` ENTERA dentro de la app nativa. Eso
 * está bien para casi todo, pero hay tres cosas que la app de móvil no abre
 * nunca y que engordan la descarga 8,5 MB:
 *
 *   · `tv.apk` (1,7 MB) — el instalador de la app de televisión. La web lo
 *     ofrece para descargar; meter un instalador DENTRO de otro instalador no
 *     tiene ningún sentido.
 *   · Los PNG originales (~5 MB) — el código apunta a los `.webp`. Estos solo
 *     están en el repo para poder regenerarlos.
 *   · El catálogo completo (3,4 MB) — desde que se parte por listas, el juego
 *     pide `data/listas/*.json`. El completo es solo el plan B por si falta
 *     una lista, y dentro del APK las listas nunca faltan.
 *
 * La diferencia importa más aquí que en la web: la web se cachea y se olvida,
 * pero el APK se descarga entero, se instala y ocupa sitio en el móvil para
 * siempre. Y en la ficha de Google Play el tamaño se ve antes de instalar.
 *
 * Se ejecuta solo, después de `cap sync` (ver el script `movil` de package.json).
 */

import { rmSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = join(process.cwd(), 'android/app/src/main/assets/public');

if (!existsSync(ASSETS)) {
  console.log('  (no hay proyecto android todavía: nada que adelgazar)');
  process.exit(0);
}

const kb = (b) => (b / 1024).toFixed(0).padStart(6);
let liberado = 0;

const borrar = (rel, motivo) => {
  const ruta = join(ASSETS, rel);
  if (!existsSync(ruta)) return;
  const peso = statSync(ruta).size;
  rmSync(ruta, { force: true });
  liberado += peso;
  console.log(`  ${kb(peso)} KB  ${rel.padEnd(46)} ${motivo}`);
};

console.log('\n  Quitando del APK lo que solo usa la web:\n');

borrar('tv.apk', 'lo descarga la web, no la app');
borrar('data/dedicalo-song-catalog.full.clean.json', 'se usan las listas partidas');

// Las 20 pantallas de arranque de iOS. Existen porque Safari exige una imagen
// por tamaño exacto de pantalla para no abrir la PWA en blanco. Dentro de un
// APK de Android no las mira nadie: Android usa su propio splash nativo,
// configurado en capacitor.config.json. Son 2,8 MB de puro lastre.
rmSync(join(ASSETS, 'images/splash'), { recursive: true, force: true });
console.log('  ~2800 KB  images/splash/                                solo las usa iOS en web');
liberado += 2800 * 1024;

// Los PNG de los que salen los WebP. Se comprueba que exista el .webp antes de
// borrar: si alguno no se hubiera convertido, quitar el PNG dejaría un hueco.
const imgs = join(ASSETS, 'images');
if (existsSync(imgs)) {
  for (const n of readdirSync(imgs)) {
    if (!n.endsWith('.png')) continue;
    if (!existsSync(join(imgs, n.replace(/\.png$/, '.webp')))) continue;
    borrar(`images/${n}`, 'existe su .webp');
  }
}

console.log(`\n  ${kb(liberado)} KB menos en la app instalada.\n`);

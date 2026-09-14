#!/usr/bin/env node
/**
 * ICONOS DE LA APP Y PANTALLAS DE ARRANQUE
 *
 * (No confundir con `iconos.mjs`, que recorta la fuente de Material Symbols.
 * Este genera el icono que queda en la pantalla de inicio del móvil.)
 *
 * QUÉ ESTABA MAL
 *
 * Había UN solo archivo, `icon-app.png`, de 500×500, declarado en el
 * manifest como 192 Y como 512 a la vez, y con `purpose: "any maskable"`.
 * Tres problemas, y el primero es el peor:
 *
 *   1. MASKABLE recorta. Android aplica su propia máscara (círculo, cuadrado
 *      redondeado, gota — depende del lanzador) y se come hasta un 20% del
 *      borde. Un icono dibujado para "any", que llega hasta el filo, sale
 *      cortado. Es literalmente lo PRIMERO que ve alguien de la app
 *      instalada, y estaba mal.
 *   2. 500 NO ES 512 ni 192. El navegador reescala, y un icono reescalado a
 *      mano se ve blando al lado de los de al lado.
 *   3. iOS ignora en buena parte los iconos del manifest y usa
 *      `apple-touch-icon`, que quiere 180×180 y SIN transparencia: donde hay
 *      alfa, iOS pinta negro.
 *
 * Y las PANTALLAS DE ARRANQUE: sin `apple-touch-startup-image`, un iPhone
 * abre la app instalada en BLANCO hasta que React arranca. Una app de verdad
 * no hace eso nunca. iOS exige una imagen por tamaño exacto de pantalla, con
 * su media query; por eso hay que generarlas.
 *
 *   node scripts/iconos-app.mjs
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const ORIGEN = join(RAIZ, 'public/images/icon-app.png');
const LOGO = join(RAIZ, 'public/images/logo-main.png');
const SALIDA = join(RAIZ, 'public/images/app');
const SPLASH = join(RAIZ, 'public/images/splash');

// Fondo de marca. Sólido a propósito: tanto la máscara de Android como el
// icono de iOS necesitan opacidad completa, y un degradado se vería en franjas
// al reescalar a 60×60 en la pantalla de inicio.
// Mismo gris que el `background` de tailwind.config.js y que el theme-color.
// Si no coinciden, se ve un salto de color entre la pantalla de arranque y la
// app — una franja de otro tono justo al abrir.
const FONDO = { r: 5, g: 8, b: 22, alpha: 1 };

if (!existsSync(ORIGEN)) {
  console.error(`No encuentro ${ORIGEN}`);
  process.exit(1);
}
mkdirSync(SALIDA, { recursive: true });
mkdirSync(SPLASH, { recursive: true });

/** Icono normal: el dibujo ocupa todo el lienzo. */
async function iconoAny(tam, nombre) {
  await sharp(ORIGEN)
    .resize(tam, tam, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(SALIDA, nombre));
  console.log(`  ${nombre.padEnd(28)} ${tam}×${tam}`);
}

/**
 * Icono maskable: el dibujo se encoge al 60% y se centra sobre fondo sólido.
 *
 * La especificación reserva un círculo de seguridad del 80% del ancho; lo que
 * quede fuera puede desaparecer. Al 60% el logo entra entero en ese círculo
 * con margen, salga la máscara que salga.
 */
async function iconoMaskable(tam, nombre) {
  const interior = Math.round(tam * 0.6);
  const dibujo = await sharp(ORIGEN)
    .resize(interior, interior, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: tam, height: tam, channels: 4, background: FONDO } })
    .composite([{ input: dibujo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(join(SALIDA, nombre));
  console.log(`  ${nombre.padEnd(28)} ${tam}×${tam} (zona segura 60%)`);
}

/** Icono de iOS: opaco obligatoriamente, y iOS ya le pone él las esquinas. */
async function iconoApple(tam, nombre) {
  const interior = Math.round(tam * 0.78);
  const dibujo = await sharp(ORIGEN)
    .resize(interior, interior, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: tam, height: tam, channels: 4, background: FONDO } })
    .composite([{ input: dibujo, gravity: 'center' }])
    .flatten({ background: FONDO })
    .png({ compressionLevel: 9 })
    .toFile(join(SALIDA, nombre));
  console.log(`  ${nombre.padEnd(28)} ${tam}×${tam} (opaco)`);
}

/**
 * Pantallas de arranque de iOS.
 *
 * Tamaños en píxeles reales de los iPhone que siguen en circulación. Se
 * generan en vertical y en apaisado porque el juego se puede girar, y iOS
 * escoge por media query exacta: si no hay coincidencia, vuelve el blanco.
 */
const PANTALLAS = [
  { w: 1179, h: 2556, dppx: 3, nombre: 'iphone-15-14pro' },
  { w: 1284, h: 2778, dppx: 3, nombre: 'iphone-14plus-13promax' },
  { w: 1170, h: 2532, dppx: 3, nombre: 'iphone-14-13-12' },
  { w: 1125, h: 2436, dppx: 3, nombre: 'iphone-x-xs-11pro' },
  { w: 1242, h: 2688, dppx: 3, nombre: 'iphone-xsmax-11promax' },
  { w: 828, h: 1792, dppx: 2, nombre: 'iphone-xr-11' },
  { w: 750, h: 1334, dppx: 2, nombre: 'iphone-8-se' },
  { w: 1242, h: 2208, dppx: 3, nombre: 'iphone-8plus' },
  { w: 1206, h: 2622, dppx: 3, nombre: 'iphone-16pro' },
  { w: 1320, h: 2868, dppx: 3, nombre: 'iphone-16promax' }
];

async function pantallaArranque(w, h, nombre) {
  // El logo ocupa un tercio del lado corto: igual que la pantalla de carga de
  // dentro de la app, para que el paso de una a otra no dé un salto de tamaño.
  const lado = Math.round(Math.min(w, h) * 0.34);
  const fuente = existsSync(LOGO) ? LOGO : ORIGEN;
  const dibujo = await sharp(fuente)
    .resize(lado, lado, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: w, height: h, channels: 4, background: FONDO } })
    .composite([{ input: dibujo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(join(SPLASH, `${nombre}.png`));
}

console.log('\nIconos de la app:');
await iconoAny(192, 'icon-192.png');
await iconoAny(512, 'icon-512.png');
await iconoMaskable(512, 'icon-maskable-512.png');
await iconoMaskable(192, 'icon-maskable-192.png');
await iconoApple(180, 'apple-touch-icon.png');

console.log('\nPantallas de arranque de iOS:');
for (const p of PANTALLAS) {
  await pantallaArranque(p.w, p.h, `${p.nombre}-portrait`);
  await pantallaArranque(p.h, p.w, `${p.nombre}-landscape`);
  console.log(`  ${p.nombre.padEnd(28)} ${p.w}×${p.h} + apaisada`);
}

/* Las etiquetas <link> que hay que pegar en index.html. Se imprimen en vez de
   escribirse solas: son muchas y conviene verlas antes de meterlas. */
console.log('\n--- para index.html ---\n');
for (const p of PANTALLAS) {
  const wCss = Math.round(p.w / p.dppx);
  const hCss = Math.round(p.h / p.dppx);
  console.log(
    `<link rel="apple-touch-startup-image" href="/images/splash/${p.nombre}-portrait.png" ` +
    `media="(device-width: ${wCss}px) and (device-height: ${hCss}px) and (-webkit-device-pixel-ratio: ${p.dppx}) and (orientation: portrait)">`
  );
  console.log(
    `<link rel="apple-touch-startup-image" href="/images/splash/${p.nombre}-landscape.png" ` +
    `media="(device-width: ${wCss}px) and (device-height: ${hCss}px) and (-webkit-device-pixel-ratio: ${p.dppx}) and (orientation: landscape)">`
  );
}
console.log('\nListo.\n');

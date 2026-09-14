#!/usr/bin/env node
/**
 * REVISAR PANTALLAS
 *
 * Abre la app en un navegador de verdad, a tamaño de iPhone, y busca los
 * fallos que NO se ven leyendo el código y que sí se ven de un vistazo en la
 * pantalla. Nació porque se publicaron dos:
 *
 *   · La palabra "ALBUM" escrita en grande sobre el fondo de TODAS las
 *     pantallas. Era un icono de Material Symbols que no viajaba en el
 *     subconjunto de la fuente, así que el navegador dibujaba su nombre. El
 *     fondo es global, o sea que salía en todo el juego.
 *   · Lo mismo con "TIMELINE" en el manual.
 *
 * Un icono que falta no rompe nada, no sale en la consola y no falla el
 * build: solo se ve. Por eso hace falta mirar.
 *
 * Requiere el servidor de desarrollo levantado (`npm run dev`).
 *
 *   node scripts/revisar-pantallas.mjs
 */

import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:5173';
const RUTAS = ['/', '/role-selection', '/how-to-play', '/guest/join', '/legal'];

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },   // iPhone 14
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});
const pagina = await contexto.newPage();

let problemas = 0;

for (const ruta of RUTAS) {
  const consola = [];
  pagina.on('pageerror', (e) => consola.push(e.message));

  await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(1200);

  const r = await pagina.evaluate(() => {
    const vw = innerWidth;
    const iconosRotos = [];
    let desbordeX = document.documentElement.scrollWidth > vw + 1;

    document.querySelectorAll('.material-symbols-outlined').forEach((el) => {
      const c = el.getBoundingClientRect();
      // Un icono es cuadrado y estrecho. Si mide mucho más ancho que alto, lo
      // que hay dentro es una PALABRA, no un dibujo: la ligadura no resolvió
      // porque ese icono no viaja en la fuente.
      if (c.width > c.height * 2 && c.width > 40) {
        iconosRotos.push(el.textContent.trim().slice(0, 24));
      }
    });

    return { iconosRotos, desbordeX };
  });

  const fallos = [];
  if (r.iconosRotos.length) fallos.push(`iconos dibujados como texto: ${[...new Set(r.iconosRotos)].join(', ')}`);
  if (r.desbordeX) fallos.push('la página se desplaza en horizontal');
  if (consola.length) fallos.push(`errores JS: ${consola[0].slice(0, 80)}`);

  problemas += fallos.length;
  console.log(`${fallos.length ? '  FALLO' : '     ok'}  ${ruta}`);
  fallos.forEach((f) => console.log(`          · ${f}`));

  pagina.removeAllListeners('pageerror');
}

await navegador.close();
console.log(problemas ? `\n${problemas} problema(s).\n` : '\nTodo limpio.\n');
process.exit(problemas ? 1 : 0);

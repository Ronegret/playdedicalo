#!/usr/bin/env node
/**
 * REVISAR EL LAYOUT EN TODOS LOS TAMAÑOS
 *
 * "Que se vea bien" no es una pantalla: son muchas. El mismo diseño tiene que
 * aguantar un iPhone SE de 320 px, un móvil normal, uno grande, el apaisado, y
 * además los tres tamaños de letra del ajuste de accesibilidad — que multiplican
 * cada uno de los anteriores.
 *
 * Mirar eso a mano es imposible, y los fallos que salen son siempre los mismos
 * tres:
 *
 *   1. COSAS QUE SE PISAN. Dos textos ocupando el mismo sitio. Pasa cuando algo
 *      crece (una palabra más larga, la letra más grande) y el hueco no.
 *   2. COSAS TAPADAS POR LA BARRA FIJA. El botón de abajo flota sobre el
 *      contenido; si nadie reserva ese espacio, se come la última tarjeta.
 *   3. DESBORDE HORIZONTAL. La pantalla se mueve de lado, que en un móvil se
 *      siente roto.
 *
 * Los tres los encuentra el navegador solo, midiendo. Esto es eso.
 *
 * Requiere `npm run dev`.
 *
 *   node scripts/revisar-layout.mjs
 */

import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:5173';

const TAMANOS = [
  { nombre: 'iPhone SE',     w: 320, h: 568 },
  { nombre: 'iPhone 14',     w: 390, h: 844 },
  { nombre: 'iPhone Pro Max', w: 430, h: 932 },
  { nombre: 'apaisado',      w: 844, h: 390 }
];

const LETRAS = ['', 'fs-large', 'fs-xl'];

const RUTAS = ['/', '/role-selection', '/how-to-play', '/guest/join', '/lobby', '/legal'];

/**
 * Se ejecuta DENTRO del navegador. Devuelve los tres tipos de fallo.
 */
function medir() {
  const vw = innerWidth;
  const vh = innerHeight;

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  };

  // Solo hojas con texto propio o controles: comparar contenedores entre sí
  // daría solapes falsos constantemente (un padre siempre "solapa" a su hijo).
  // ¿Está dentro de algo que flota? Una barra fija pasa POR ENCIMA del
  // contenido por definición; comparar a sus hijos con la página de debajo
  // marca como fallo justo lo que la barra tiene que hacer.
  const enCapaFlotante = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const pos = getComputedStyle(n).position;
      if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  };

  const hojas = [...document.querySelectorAll('p,h1,h2,h3,h4,span,button,a,input,label')]
    .filter((el) => {
      if (!visible(el)) return false;
      if (enCapaFlotante(el)) return false;
      const c = el.getBoundingClientRect();
      if (c.width < 8 || c.height < 8) return false;
      if (c.bottom < 0 || c.top > vh) return false;       // fuera de vista
      const hijos = [...el.children].filter(visible);
      if (hijos.length && !el.matches('button,a,input')) return false;
      return (el.textContent || '').trim().length > 0 || el.matches('input,button');
    });

  const solapes = [];
  for (let i = 0; i < hojas.length; i++) {
    for (let j = i + 1; j < hojas.length; j++) {
      const a = hojas[i], bEl = hojas[j];
      if (a.contains(bEl) || bEl.contains(a)) continue;
      // Elementos colocados a mano uno sobre otro (insignias, overlays) son
      // intencionados; solo interesan los que comparten flujo normal.
      const ca = getComputedStyle(a), cb = getComputedStyle(bEl);
      if (ca.position === 'absolute' || cb.position === 'absolute') continue;
      if (ca.position === 'fixed' || cb.position === 'fixed') continue;

      // Un elemento EN LÍNEA que se parte en varias líneas devuelve un
      // rectángulo que abarca el bloque entero, no las líneas reales. Dos
      // <span> seguidos dentro de un <p> parecen entonces pisarse aunque
      // estén uno detrás del otro. Se descartan: para saber si de verdad se
      // solapan habría que comparar getClientRects() línea a línea, y eso
      // nunca es un fallo de layout, solo texto fluyendo.
      const enLinea = (cs, el) => cs.display.startsWith('inline') && el.getClientRects().length > 1;
      if (enLinea(ca, a) || enLinea(cb, bEl)) continue;

      const ra = a.getBoundingClientRect(), rb = bEl.getBoundingClientRect();
      const solapeX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const solapeY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      // 4 px de tolerancia: el redondeo subpíxel crea solapes de 1 px sin parar.
      if (solapeX > 4 && solapeY > 4) {
        solapes.push({
          a: (a.textContent || a.tagName).trim().slice(0, 26),
          b: (bEl.textContent || bEl.tagName).trim().slice(0, 26),
          px: Math.round(solapeY)
        });
      }
    }
  }

  // Lo que tape una barra fija de abajo.
  const barras = [...document.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || !visible(el)) return false;
    const c = el.getBoundingClientRect();
    return c.bottom > vh - 8 && c.height < vh * 0.35 && c.width > vw * 0.5;
  });

  // Que algo pase por debajo de la barra A MITAD de la página es lo normal:
  // se desplaza y aparece. El fallo es que NO SE PUEDA sacar de ahí, es decir,
  // que al final del recorrido siga tapado. Eso ocurre cuando el contenedor no
  // reserva tanto hueco como mide la barra.
  const tapados = [];
  for (const barra of barras) {
    const alturaBarra = barra.getBoundingClientRect().height + (vh - barra.getBoundingClientRect().bottom);
    const cont = document.querySelector('.safe-bottom-action, .app-screen');
    if (!cont) continue;
    const reservado = parseFloat(getComputedStyle(cont).paddingBottom) || 0;
    if (reservado + 4 < alturaBarra) {
      tapados.push({
        txt: `hueco reservado ${Math.round(reservado)}px para una barra de ${Math.round(alturaBarra)}px`,
        px: Math.round(alturaBarra - reservado)
      });
    }
  }

  return {
    solapes: solapes.slice(0, 5),
    tapados: tapados.slice(0, 5),
    desbordeX: document.documentElement.scrollWidth > vw + 1
  };
}

const navegador = await chromium.launch();
let fallos = 0;

for (const t of TAMANOS) {
  const ctx = await navegador.newContext({
    viewport: { width: t.w, height: t.h },
    deviceScaleFactor: 2,
    isMobile: t.w < 500,
    hasTouch: true
  });
  const pagina = await ctx.newPage();

  for (const letra of LETRAS) {
    for (const ruta of RUTAS) {
      await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
      if (letra) await pagina.evaluate((c) => document.documentElement.classList.add(c), letra);
      await pagina.waitForTimeout(letra ? 700 : 500);

      const r = await pagina.evaluate(medir);
      const lineas = [];
      if (r.desbordeX) lineas.push('se desplaza en horizontal');
      r.solapes.forEach((s) => lineas.push(`se pisan (${s.px}px): "${s.a}" / "${s.b}"`));
      r.tapados.forEach((s) => lineas.push(`tapado por la barra fija (${s.px}px): "${s.txt}"`));

      if (lineas.length) {
        fallos += lineas.length;
        console.log(`\n  ${t.nombre} ${letra ? '· ' + letra : ''}  ${ruta}`);
        lineas.forEach((l) => console.log(`     · ${l}`));
      }
    }
  }
  await ctx.close();
  process.stdout.write(`  ${t.nombre} revisado\n`);
}

await navegador.close();
console.log(fallos ? `\n${fallos} problema(s) de layout.\n` : '\nLayout limpio en todos los tamaños.\n');
process.exit(fallos ? 1 : 0);

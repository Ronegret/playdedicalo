#!/usr/bin/env node
/**
 * AUDITORÍA COMPLETA: TAMAÑO, ROTACIÓN, ESCALA DE LETRA Y ACCESIBILIDAD
 *
 * "Que se vea bien" no es una pantalla. Es el producto de:
 *
 *     4 tamaños  ×  2 orientaciones  ×  3 escalas de letra  ×  cada ruta
 *
 * Más de cien combinaciones. Ninguna app se revisa así a mano, y por eso los
 * fallos de layout aparecen siempre en producción: no en el móvil de quien
 * programa, sino en el iPhone SE de alguien que tiene la letra grande y acaba
 * de girar el teléfono.
 *
 * Además del layout se comprueba ACCESIBILIDAD, que en este juego no es un
 * extra de buena conducta: se juega en fiestas, con poca luz, con gente de 20
 * y de 60 años, y con el móvil a un brazo de distancia.
 *
 *   · Zonas táctiles por debajo de 44 px — lo que recomiendan Apple y Google.
 *     Un botón más pequeño se falla, y fallarlo a mitad de ronda cuesta puntos.
 *   · Botones que son solo un icono y no tienen texto alternativo: con lector
 *     de pantalla se oyen como "botón", sin más.
 *   · Texto por debajo de 11 px: ilegible en una fiesta.
 *
 *   node scripts/auditar-todo.mjs
 */

import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://localhost:5173';

const TAMANOS = [
  { nombre: 'SE', w: 320, h: 568 },
  { nombre: '14', w: 390, h: 844 },
  { nombre: 'ProMax', w: 430, h: 932 },
  { nombre: 'tablet', w: 768, h: 1024 }
];
const LETRAS = ['', 'fs-large', 'fs-xl'];
const RUTAS = ['/', '/role-selection', '/how-to-play', '/guest/join', '/legal'];

/** Se ejecuta DENTRO del navegador. */
function auditar() {
  const vw = innerWidth, vh = innerHeight;
  const fallos = [];
  const texto = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
    const c = el.getBoundingClientRect();
    return c.width > 0 && c.height > 0 && c.bottom > 0 && c.top < vh;
  };

  const flotante = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };

  if (document.documentElement.scrollWidth > vw + 1) {
    fallos.push('la pantalla se desplaza en horizontal');
  }

  for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select')) {
    if (!visible(el) || el.disabled) continue;
    const c = el.getBoundingClientRect();

    if (c.height < 43.5 && c.width < 43.5) {
      const nom = texto(el) || el.getAttribute('aria-label') || el.tagName;
      fallos.push(`zona tactil ${Math.round(c.width)}x${Math.round(c.height)} (minimo 44): "${nom}"`);
    }

    const icono = el.querySelector('.material-symbols-outlined');
    const propio = texto(el);
    const soloIcono = icono && propio.length < 25 && propio.replace(/[a-z_]/g, '').trim().length === 0;
    const nombre = el.getAttribute('aria-label') || el.getAttribute('title');
    if (soloIcono && !nombre) {
      fallos.push(`boton solo con icono y sin aria-label: "${propio}"`);
    }
  }

  for (const el of document.querySelectorAll('p, span, button, a, h1, h2, h3, li')) {
    if (!visible(el) || el.children.length) continue;
    if (!texto(el)) continue;
    if (el.closest('.material-symbols-outlined')) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px && px < 11) fallos.push(`texto de ${px.toFixed(1)}px: "${texto(el)}"`);
  }

  const hojas = [...document.querySelectorAll('p,h1,h2,h3,h4,span,button,a,input,label')].filter((el) => {
    if (!visible(el) || flotante(el)) return false;
    const c = el.getBoundingClientRect();
    if (c.width < 8 || c.height < 8) return false;
    const hijos = [...el.children].filter(visible);
    if (hijos.length && !el.matches('button,a,input')) return false;
    return texto(el).length > 0 || el.matches('input,button');
  });

  for (let i = 0; i < hojas.length; i++) {
    for (let j = i + 1; j < hojas.length; j++) {
      const a = hojas[i], b = hojas[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ca = getComputedStyle(a), cb = getComputedStyle(b);
      if (ca.position === 'absolute' || ca.position === 'fixed') continue;
      if (cb.position === 'absolute' || cb.position === 'fixed') continue;
      const enLinea = (cs, el) => cs.display.startsWith('inline') && el.getClientRects().length > 1;
      if (enLinea(ca, a) || enLinea(cb, b)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const sx = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const sy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (sx > 4 && sy > 4) fallos.push(`se pisan ${Math.round(sy)}px: "${texto(a)}" / "${texto(b)}"`);
    }
  }

  const barra = [...document.querySelectorAll('*')].find((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || !visible(el)) return false;
    const c = el.getBoundingClientRect();
    return c.bottom > vh - 8 && c.height < vh * 0.4 && c.width > vw * 0.5;
  });
  if (barra) {
    const cont = document.querySelector('.safe-bottom-action');
    if (cont) {
      const rb = barra.getBoundingClientRect();
      const necesario = rb.height + (vh - rb.bottom);
      const reservado = parseFloat(getComputedStyle(cont).paddingBottom) || 0;
      if (reservado + 4 < necesario) {
        fallos.push(`barra fija de ${Math.round(necesario)}px con solo ${Math.round(reservado)}px reservados`);
      }
    }
  }

  return [...new Set(fallos)].slice(0, 6);
}

const navegador = await chromium.launch();
let total = 0;

for (const t of TAMANOS) {
  for (const girado of [false, true]) {
    if (girado && t.nombre === 'tablet') continue;
    const w = girado ? t.h : t.w;
    const h = girado ? t.w : t.h;

    const ctx = await navegador.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
      isMobile: t.w < 500,
      hasTouch: true
    });
    const pagina = await ctx.newPage();

    for (const letra of LETRAS) {
      for (const ruta of RUTAS) {
        await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
        if (letra) await pagina.evaluate((c) => document.documentElement.classList.add(c), letra);
        await pagina.waitForTimeout(letra ? 650 : 450);
        const f = await pagina.evaluate(auditar);
        if (f.length) {
          total += f.length;
          console.log(`\n  ${t.nombre}${girado ? ' girado' : ''} ${letra ? '· ' + letra : ''}  ${ruta}`);
          f.forEach((x) => console.log(`     · ${x}`));
        }
      }
    }
    await ctx.close();
    process.stdout.write(`  ${t.nombre}${girado ? ' girado' : ''} revisado\n`);
  }
}

await navegador.close();
console.log(total ? `\n${total} incidencia(s).\n` : '\nCorrecto en todos los tamanos, giros y escalas.\n');
process.exit(total ? 1 : 0);

#!/usr/bin/env node
/**
 * AUDITAR LA PARTIDA FASE POR FASE, DE PIE Y GIRADA
 *
 * Las pantallas públicas (portada, manual, legal) se revisan con
 * `auditar-todo.mjs`. Pero donde se juega de verdad no se llega con una URL:
 * hace falta una sala con gente dentro y una partida en marcha.
 *
 * Aquí se crea una sala REAL contra Firebase con dos navegadores —anfitrión e
 * invitado—, se empuja la partida por cada una de sus seis fases, y en cada
 * una se mide de pie y girada.
 *
 * QUÉ SE MIDE, Y POR QUÉ ESO
 *
 * No basta con "no se rompe". Una pantalla puede no romperse y ser inútil: si
 * lo que hay que TOCAR queda por debajo del borde, el juego no se puede jugar
 * sin desplazarse, y nadie se desplaza a mitad de ronda con una canción
 * sonando.
 *
 * Así que lo que se busca es:
 *
 *   · CUÁNTO SOBRESALE. Contenido frente a pantalla. Si sobresale poco, se
 *     desplaza y ya. Si sobresale el doble, está mal repartido.
 *   · SI LO IMPORTANTE SE VE. Se localiza el elemento principal de cada fase
 *     —el botón que hay que pulsar, la ruta donde hay que colocar— y se
 *     comprueba que entra en pantalla sin desplazar.
 *   · CUÁNTO SE DESPERDICIA. Un hueco vacío enorme en horizontal significa
 *     que no se está usando el ancho que acaba de aparecer.
 *
 *   node scripts/auditar-partida.mjs
 */

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5173';
const CAPTURAS = process.env.CAPTURAS === '1';
if (CAPTURAS) mkdirSync('.caps', { recursive: true });

/** Las seis fases por las que pasa una partida. */
const FASES = ['lobby', 'countdown', 'listen', 'blackout', 'result', 'final'];

const VISTAS = [
  { nombre: 'de pie', w: 390, h: 844 },
  { nombre: 'girado', w: 844, h: 390 },
  { nombre: 'SE de pie', w: 320, h: 568 },
  { nombre: 'SE girado', w: 568, h: 320 }
];

/**
 * Se ejecuta DENTRO del navegador.
 * Devuelve el reparto real de la pantalla en esta fase y orientación.
 */
function medirReparto() {
  const vh = innerHeight, vw = innerWidth;

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
    const c = el.getBoundingClientRect();
    return c.width > 0 && c.height > 0;
  };

  // El contenedor que se desplaza de esta pantalla.
  const cont = document.querySelector('.app-screen') || document.body;
  const alto = cont.scrollHeight;

  // Lo que hay que TOCAR en esta fase. Se busca el control más grande que no
  // sea de la cabecera: en la práctica es siempre la acción principal.
  const controles = [...document.querySelectorAll('button, [role="button"], input')]
    .filter((el) => visible(el) && !el.closest('header'))
    .map((el) => ({ el, c: el.getBoundingClientRect() }))
    .filter((x) => x.c.width * x.c.height > 2000)
    .sort((a, b) => (b.c.width * b.c.height) - (a.c.width * a.c.height));

  const principal = controles[0];
  const fueraDePantalla = controles.filter((x) => x.c.top > vh - 8).length;

  // Hueco vertical más grande entre bloques hermanos visibles: delata el
  // espacio desaprovechado cuando aparece ancho de golpe.
  let huecoMax = 0;
  const pila = cont.querySelector('.app-shell, .fase-escucha') || cont;
  const hijos = [...pila.children].filter(visible)
    .map((c) => c.getBoundingClientRect())
    .filter((r) => r.height > 4)
    .sort((a, b) => a.top - b.top);
  for (let i = 1; i < hijos.length; i++) {
    huecoMax = Math.max(huecoMax, hijos[i].top - hijos[i - 1].bottom);
  }

  return {
    pantalla: vh,
    contenido: Math.round(alto),
    desborde: Math.round(alto - vh),
    principal: principal ? {
      txt: (principal.el.textContent || principal.el.getAttribute('aria-label') || '').trim().slice(0, 28),
      top: Math.round(principal.c.top),
      visible: principal.c.top < vh - 8 && principal.c.bottom > 0
    } : null,
    controlesFuera: fueraDePantalla,
    huecoMax: Math.round(huecoMax),
    anchoUsado: Math.round((pila.getBoundingClientRect().width / vw) * 100)
  };
}

const navegador = await chromium.launch();
const movil = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const ctxH = await navegador.newContext({ viewport: { width: 390, height: 844 }, ...movil });
const anfitrion = await ctxH.newPage();
const ctxG = await navegador.newContext({ viewport: { width: 390, height: 844 }, ...movil });
const invitado = await ctxG.newPage();

const errores = [];
anfitrion.on('pageerror', (e) => errores.push('anfitrión: ' + e.message.slice(0, 90)));
invitado.on('pageerror', (e) => errores.push('invitado: ' + e.message.slice(0, 90)));

await anfitrion.goto(BASE + '/role-selection', { waitUntil: 'networkidle' });
await invitado.goto(BASE + '/role-selection', { waitUntil: 'networkidle' });
await anfitrion.waitForTimeout(2200);

const pin = await anfitrion.evaluate(async () => {
  const m = await import('/src/store/useGameStore.js');
  await m.useGameStore.getState().hostCreateRoom({ displayName: 'Rodrigo', photoURL: '/images/avatars/alberto.webp' });
  return m.useGameStore.getState().pin;
});
if (!pin) { console.error('No se pudo crear la sala.'); await navegador.close(); process.exit(1); }

await invitado.evaluate(async (p) => {
  const m = await import('/src/store/useGameStore.js');
  await m.useGameStore.getState().guestJoinRoom(p, 'Noe', '/images/avatars/andaluza.webp');
}, pin);
await anfitrion.waitForTimeout(1200);

console.log(`\n  Sala ${pin} · anfitrión + 1 invitado\n`);
console.log('  fase        vista        pantalla  contenido  desborde  accion principal        hueco');
console.log('  ' + '─'.repeat(92));

let problemas = 0;

for (const fase of FASES) {
  // Se lleva la partida a la fase. `listen` se alcanza de verdad arrancando,
  // porque necesita cancion y reloj; las demas se fuerzan en el estado.
  if (fase === 'listen') {
    await anfitrion.evaluate(async () => {
      const m = await import('/src/store/useGameStore.js');
      if (m.useGameStore.getState().phase !== 'listen') {
        try { await m.useGameStore.getState().hostStartGame(); } catch { /* ya en marcha */ }
      }
    });
    await anfitrion.waitForTimeout(4200);
  } else {
    await anfitrion.evaluate((f) => import('/src/store/useGameStore.js')
      .then((m) => m.useGameStore.setState({ phase: f })), fase);
    await anfitrion.waitForTimeout(900);
  }

  const ruta = ['result', 'final'].includes(fase) ? '/game/result' : fase === 'lobby' ? '/lobby' : '/game';
  if (!anfitrion.url().endsWith(ruta)) {
    await anfitrion.goto(BASE + ruta, { waitUntil: 'networkidle' });
    await anfitrion.evaluate((f) => import('/src/store/useGameStore.js')
      .then((m) => m.useGameStore.setState({ phase: f })), fase);
    await anfitrion.waitForTimeout(1100);
  }

  for (const v of VISTAS) {
    await anfitrion.setViewportSize({ width: v.w, height: v.h });
    await anfitrion.waitForTimeout(950);
    const r = await anfitrion.evaluate(medirReparto);

    const acc = r.principal
      ? `${r.principal.visible ? 'ok ' : 'FUERA'} "${r.principal.txt}"`.slice(0, 23)
      : '(ninguna)';
    const aviso = [];
    if (r.principal && !r.principal.visible) aviso.push('la acción principal no se ve');
    if (r.desborde > r.pantalla) aviso.push(`sobresale ${Math.round(r.desborde / r.pantalla * 100)}% de una pantalla`);
    if (r.huecoMax > r.pantalla * 0.25) aviso.push(`hueco vacío de ${r.huecoMax}px`);
    if (v.w > v.h && r.anchoUsado < 70) aviso.push(`solo usa el ${r.anchoUsado}% del ancho`);
    problemas += aviso.length;

    console.log(
      `  ${fase.padEnd(11)} ${v.nombre.padEnd(11)} ${String(r.pantalla).padStart(7)}  ${String(r.contenido).padStart(8)}  ${String(r.desborde).padStart(7)}  ${acc.padEnd(23)} ${String(r.huecoMax).padStart(4)}px` +
      (aviso.length ? `\n              → ${aviso.join(' · ')}` : '')
    );

    if (CAPTURAS) await anfitrion.screenshot({ path: `.caps/${fase}-${v.nombre.replace(/ /g, '')}.png` });
  }
  console.log('');
}

await anfitrion.evaluate(async () => {
  const m = await import('/src/store/useGameStore.js');
  try { await m.useGameStore.getState().hostCloseRoom(); } catch { /* ya cerrada */ }
});
await navegador.close();

if (errores.length) {
  console.log('  Errores de JavaScript:');
  [...new Set(errores)].slice(0, 5).forEach((e) => console.log('   · ' + e));
}
console.log(problemas ? `\n  ${problemas} aviso(s) de reparto.\n` : '\n  Reparto correcto en todas las fases y orientaciones.\n');

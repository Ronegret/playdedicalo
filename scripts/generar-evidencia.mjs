#!/usr/bin/env node
/**
 * Genera un manifiesto de evidencia fechado para la versión actual.
 *
 * Produce un archivo de texto con:
 *   - fecha y hora de generación (UTC e ISO)
 *   - versión, commit exacto y estado del repositorio
 *   - hash SHA-256 de cada archivo relevante del proyecto
 *   - un hash global del conjunto
 *
 * Para qué sirve: el hash global identifica de forma única el estado completo
 * del proyecto en un instante. Sellando SOLO ese archivo con un servicio de
 * sello de tiempo (p. ej. OpenTimestamps, gratuito) queda demostrado que todo
 * el contenido existía antes de esa fecha, sin publicar el código.
 *
 * Uso:  npm run evidencia
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = process.cwd();
const SALIDA = join(RAIZ, 'docs', 'evidencias');

// Carpetas que nunca entran: dependencias, artefactos de build y secretos.
const EXCLUIR_DIR = new Set(['node_modules', '.git', 'dist', '.vercel', '.firebase', 'catalog-output']);
const EXCLUIR_ARCHIVO = /(^\.env|\.env$|token\.json$|\.ots$)/i;

function git(cmd, porDefecto = '(no disponible)') {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return porDefecto;
  }
}

function listarArchivos(dir, acc = []) {
  for (const entrada of readdirSync(dir)) {
    if (EXCLUIR_DIR.has(entrada)) continue;
    const ruta = join(dir, entrada);
    const info = statSync(ruta);
    if (info.isDirectory()) listarArchivos(ruta, acc);
    else if (!EXCLUIR_ARCHIVO.test(entrada)) acc.push(ruta);
  }
  return acc;
}

const version = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version;
const ahora = new Date();

const archivos = listarArchivos(RAIZ)
  // Ruta relativa con separadores normalizados: así el manifiesto es
  // idéntico en Windows, macOS y Linux y se puede comparar entre máquinas.
  .map((ruta) => ({ rel: relative(RAIZ, ruta).split(sep).join('/'), abs: ruta }))
  .sort((a, b) => a.rel.localeCompare(b.rel));

const lineas = [];
const acumulado = createHash('sha256');
let bytesTotales = 0;

for (const { rel, abs } of archivos) {
  const contenido = readFileSync(abs);
  const hash = createHash('sha256').update(contenido).digest('hex');
  bytesTotales += contenido.length;
  acumulado.update(`${rel}:${hash}\n`);
  lineas.push(`${hash}  ${rel}`);
}

const hashGlobal = acumulado.digest('hex');

const manifiesto = `MANIFIESTO DE EVIDENCIA — DEDICALO PLAY
================================================================

Proyecto      : Dedicalo Play
Autor         : ${git('config user.name', 'Rodrigo Negrete Aros')}
Version       : v${version}
Generado      : ${ahora.toISOString()}  (UTC)
Local         : ${ahora.toString()}

ESTADO DEL REPOSITORIO
----------------------------------------------------------------
Commit        : ${git('rev-parse HEAD')}
Rama          : ${git('rev-parse --abbrev-ref HEAD')}
Fecha commit  : ${git('log -1 --format=%cI')}
Autor commit  : ${git('log -1 --format=%an <%ae>')}
Total commits : ${git('rev-list --count HEAD')}
Primer commit : ${git('log --reverse --format=%cI | head -1', '(no disponible)')}
Remoto        : ${git('config --get remote.origin.url')}
Sin cambios   : ${git('status --porcelain') === '' ? 'SI (arbol limpio)' : 'NO — hay cambios sin commitear'}

CONTENIDO
----------------------------------------------------------------
Archivos      : ${archivos.length}
Tamano total  : ${(bytesTotales / 1024 / 1024).toFixed(2)} MB

HASH GLOBAL DEL PROYECTO (SHA-256)
----------------------------------------------------------------
${hashGlobal}

  Este hash identifica de forma unica el estado completo del
  proyecto en la fecha indicada. Cualquier modificacion de
  cualquier archivo produce un hash distinto.

  Para dejar constancia con sello de tiempo independiente y
  gratuito, sellar ESTE archivo:

      ots stamp <este-archivo>

HASHES POR ARCHIVO (SHA-256)
----------------------------------------------------------------
${lineas.join('\n')}

================================================================
Fin del manifiesto — v${version} — ${ahora.toISOString()}
`;

mkdirSync(SALIDA, { recursive: true });
const nombre = `manifiesto-v${version}-${ahora.toISOString().slice(0, 10)}.txt`;
const destino = join(SALIDA, nombre);
writeFileSync(destino, manifiesto, 'utf8');

console.log(`Manifiesto generado: docs/evidencias/${nombre}`);
console.log(`  Archivos    : ${archivos.length}`);
console.log(`  Hash global : ${hashGlobal}`);
if (git('status --porcelain') !== '') {
  console.log('\n  AVISO: hay cambios sin commitear. Para que el manifiesto');
  console.log('  corresponda a un estado publicado, commitea antes.');
}

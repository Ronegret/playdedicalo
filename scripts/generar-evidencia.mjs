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
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const SALIDA = join(RAIZ, 'docs', 'evidencias');

// Carpetas que nunca entran: dependencias, artefactos de build y secretos.
const EXCLUIR_ARCHIVO = /(^\.env|\.env$|token\.json$|\.ots$)/i;

function git(cmd, porDefecto = '(no disponible)') {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return porDefecto;
  }
}

// Se listan SOLO los archivos versionados en git (git ls-files), no todo lo
// que hay en el disco. Dos razones: el manifiesto queda reproducible por
// cualquiera que clone el repositorio, y no se cuelan artefactos locales ni
// las fuentes sin optimizar de los avatares (~150 MB que no se versionan).
function listarArchivos() {
  const salida = git('ls-files', '');
  if (!salida) throw new Error('No se pudo listar los archivos versionados (git ls-files).');
  return salida
    .split(/\r?\n/)
    .map((rel) => rel.trim())
    .filter((rel) => rel && !EXCLUIR_ARCHIVO.test(rel.split('/').pop()))
    .map((rel) => ({ rel, abs: join(RAIZ, rel) }));
}

const version = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version;
const ahora = new Date();

// git ls-files ya devuelve rutas con '/', idénticas en Windows, macOS y
// Linux: el manifiesto se puede comparar entre máquinas.
const archivos = listarArchivos().sort((a, b) => a.rel.localeCompare(b.rel));

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
// Se captura ANTES de escribir el manifiesto: si se consultara despues, el
// propio archivo recien creado apareceria como cambio pendiente.
const arbolLimpio = git('status --porcelain') === '';

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
Autor commit  : ${`${git('log -1 --format=%an')} <${git('log -1 --format=%ae')}>`}
Total commits : ${git('rev-list --count HEAD')}
Primer commit : ${git('log --reverse --format=%cI | head -1', '(no disponible)')}
Remoto        : ${git('config --get remote.origin.url')}
Sin cambios   : ${arbolLimpio ? 'SI (arbol limpio)' : 'NO — hay cambios sin commitear'}

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
if (!arbolLimpio) {
  console.log('\n  AVISO: hay cambios sin commitear. Para que el manifiesto');
  console.log('  corresponda a un estado publicado, commitea antes.');
}

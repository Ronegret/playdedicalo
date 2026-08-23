// Procesa los 73 retratos "PERSONAJES" que llegan como PNG/JPEG cuadrados
// de ~2MB con un círculo con borde blanco centrado sobre fondo negro
// (assets-source/personajes-original/*). Cada imagen:
//   1. Se recorta de forma ajustada al círculo real (el margen negro varía
//      un poco de una imagen a otra, así que se detecta por imagen en vez
//      de usar un recorte fijo) para que el círculo CSS (border-radius:50%)
//      con el que se muestra en la app coincida exactamente con el borde
//      blanco del arte — sin anillo negro residual alrededor.
//   2. Se exporta en dos tamaños WebP: uno grande (para verse "grande" en
//      juego) y uno miniatura (para que el selector cargue 73 fotos rápido).
//
// Los originales viven FUERA de public/ a propósito: todo lo que hay bajo
// public/ se sube tal cual al hosting, y los 73 PNG de ~2MB (~150MB en
// total) no aportan nada ahí — solo los WebP optimizados de salida deben
// desplegarse. Si agregas personajes nuevos, suelta los PNG en
// assets-source/personajes-original/, agrégalos a CHARACTER_AVATARS en
// src/data/characterAvatars.js y a SOURCE_FILE_BY_SLUG más abajo, y vuelve
// a correr: node scripts/process-avatars.mjs
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { CHARACTER_AVATARS } from '../src/data/characterAvatars.js';

const SRC_DIR = path.resolve('assets-source/personajes-original');
const OUT_DIR = path.resolve('public/images/avatars');
const OUT_THUMB_DIR = path.join(OUT_DIR, 'thumb');

const LARGE_SIZE = 320;
const THUMB_SIZE = 128;
const SCAN_SIZE = 300; // downsample used only to detect the circle's bounding box, not for output quality
const BLACK_THRESHOLD = 25; // per-channel — anything darker counts as "background"

// El nombre de archivo fuente (mayúsculas, tal como llegó en PERSONAJES/)
// no siempre coincide 1:1 con el slug — se mapea a mano una sola vez acá,
// el catálogo real (slug/nombre/categoría) vive en characterAvatars.js.
const SOURCE_FILE_BY_SLUG = {
  'athletic-bilbao': 'ABILBAO', 'aguacate': 'AGUACATE', 'alemana': 'ALEMANA',
  'atletico-madrid': 'AMADRID', 'andaluza': 'ANDALUZA', 'argentino': 'ARGENTINO',
  'banana': 'BANANA', 'barcelona': 'BARCELONA', 'betis': 'BETIS',
  'bola-disco': 'BOLADISCO', 'bola-disco-retro': 'BOLDADISCO', 'brocoli': 'BROCOLI',
  'cactus': 'CACTUS', 'cassette': 'CASSETTE', 'catalan': 'CATALAN', 'checa': 'CHECA',
  'huaso': 'CHILEHUASO', 'chilena': 'CHILENA', 'chileno': 'CHILENO', 'cafe': 'COFFE',
  'colombia': 'COLOMBIA', 'croqueta': 'CROQUETA', 'croissant': 'CROSSANT',
  'cubata': 'CUBATA', 'donuts': 'DONUTS', 'dorito': 'DORITO', 'einstein': 'EINSTEIN',
  'espanol': 'ESPANOL', 'espanola': 'ESPAÑOLA', 'espanolete': 'ESPAÑOLETE',
  'fantasma': 'FANTASMA', 'flamenco': 'FLAMENCO', 'frances': 'FRANCES',
  'frankfurt': 'FRANKFURT', 'gallo': 'GALLO', 'gata': 'GATA', 'huevo': 'HUEVO',
  'inter-miami': 'INTERMIAMI', 'italiano': 'ITALIANO', 'kiwi': 'KIWI', 'llama': 'LLAMA',
  'marruecos': 'MARRUECOS', 'mexico': 'MEXICO', 'muffin': 'MUFFIN', 'noe': 'NOE',
  'oso': 'OSO', 'palomitas': 'PALOMITAS', 'panda': 'PANDA', 'papel': 'PAPEL',
  'pato': 'PATO', 'pere': 'PERE', 'perro': 'PERRO', 'peru': 'PERU',
  'pimiento': 'PIMIENTO', 'pina': 'PINA', 'pinguino': 'PINGUINO', 'pizza': 'PIZZA',
  'pretzel': 'PRETZEL', 'psg': 'PSG', 'pulpo': 'PULPO', 'real-madrid': 'REALMADRID',
  'rodri': 'RODRI', 'rusa': 'RUSA', 'sandia': 'SANDIA', 'sevilla': 'SEVILLA',
  'taco': 'TACO', 'tiburon': 'TIBURON', 'uk': 'UK', 'unicornio': 'UNICORNIO',
  'usa': 'USA', 'usam': 'USAM', 'vasca': 'VASCA', 'zorro': 'ZORRO',
  // Segunda tanda (NUEVOS1)
  'alberto': 'ALBERTO', 'alex': 'ALEX', 'angeles': 'ANGELES', 'armando': 'ARMANDO',
  'carol': 'CAROL', 'dani': 'DANI', 'frank': 'FRANK', 'juanpi': 'JUANPI',
  'miguel': 'MIGUEL', 'noe-2': 'NOE 2', 'nora': 'NORA', 'pau': 'PAU',
  'rodri-2': 'RODRI 2', 'roger': 'ROGER', 'rosa': 'ROSA', 'teresa': 'TERESA',
  'toni': 'TONI', 'yone': 'YONE',
  // Tercera tanda (nuevos) — estos archivos llegaron con nombre en
  // mayúscula/minúscula mixta, no en MAYÚSCULAS como el resto.
  'alfonso': 'Alfonso', 'erick': 'Erick', 'isa': 'Isa', 'lucia': 'Lucia',
  'luisi': 'Luisi', 'matias': 'Matias', 'noa': 'Noa',
  'don-dj': 'Retrato DJ neón con auriculares y ecualizador'
};

const CATALOG = CHARACTER_AVATARS.map((entry) => ({
  ...entry,
  file: SOURCE_FILE_BY_SLUG[entry.slug]
}));

async function findSourceFile(baseName) {
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const candidate = path.join(SRC_DIR, baseName + ext);
    try {
      await sharp(candidate).metadata();
      return candidate;
    } catch { /* try next extension */ }
  }
  throw new Error(`No se encontró archivo fuente para ${baseName}`);
}

// Detecta el bounding box del círculo (todo lo que NO es fondo negro)
// sobre una copia reducida de la imagen, por velocidad, y escala el
// resultado de vuelta a la resolución original.
async function detectCircleBBox(srcPath) {
  const full = sharp(srcPath);
  const meta = await full.metadata();
  const scale = SCAN_SIZE / Math.max(meta.width, meta.height);

  const { data, info } = await full
    .clone()
    .resize(SCAN_SIZE, SCAN_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels: ch } = info;
  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * ch;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > BLACK_THRESHOLD || g > BLACK_THRESHOLD || b > BLACK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Vuelve a la escala original y agrega ~1.5% de margen para no comerse
  // el borde blanco antialiaseado del círculo.
  const pad = Math.round(Math.max(meta.width, meta.height) * 0.015);
  const origMinX = Math.max(0, Math.round(minX / scale) - pad);
  const origMinY = Math.max(0, Math.round(minY / scale) - pad);
  const origMaxX = Math.min(meta.width, Math.round(maxX / scale) + pad);
  const origMaxY = Math.min(meta.height, Math.round(maxY / scale) + pad);

  // Cuadrado centrado en el bbox detectado, usando el lado más grande —
  // así el círculo nunca queda ovalado ni recortado por un costado.
  const boxW = origMaxX - origMinX;
  const boxH = origMaxY - origMinY;
  const side = Math.min(meta.width, meta.height, Math.max(boxW, boxH));
  const cx = origMinX + boxW / 2;
  const cy = origMinY + boxH / 2;
  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);
  left = Math.max(0, Math.min(meta.width - side, left));
  top = Math.max(0, Math.min(meta.height - side, top));

  return { left, top, width: side, height: side };
}

async function processOne(entry) {
  const srcPath = await findSourceFile(entry.file);
  const bbox = await detectCircleBBox(srcPath);

  const cropped = sharp(srcPath).extract(bbox);

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(OUT_THUMB_DIR, { recursive: true });

  await cropped.clone()
    .resize(LARGE_SIZE, LARGE_SIZE)
    .webp({ quality: 82 })
    .toFile(path.join(OUT_DIR, `${entry.slug}.webp`));

  await cropped.clone()
    .resize(THUMB_SIZE, THUMB_SIZE)
    .webp({ quality: 76 })
    .toFile(path.join(OUT_THUMB_DIR, `${entry.slug}.webp`));

  return entry.slug;
}

async function main() {
  const files = await readdir(SRC_DIR);
  console.log(`Fuente: ${files.length} archivos en PERSONAJES/, catálogo define ${CATALOG.length} entradas.`);

  let done = 0;
  const failures = [];
  for (const entry of CATALOG) {
    try {
      await processOne(entry);
      done += 1;
      process.stdout.write(`\r${done}/${CATALOG.length} procesados...`);
    } catch (error) {
      failures.push({ entry: entry.file, error: error.message });
    }
  }
  console.log(`\nListo: ${done}/${CATALOG.length} avatares generados en public/images/avatars/`);
  if (failures.length) {
    console.error('Fallos:', failures);
    process.exitCode = 1;
  }
}

main();

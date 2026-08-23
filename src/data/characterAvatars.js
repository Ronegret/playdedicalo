// Catálogo de los 73 personajes ilustrados (public/images/PERSONAJES) ya
// procesados y optimizados por scripts/process-avatars.mjs en
// public/images/avatars/{slug}.webp (grande, para verse bien en juego) y
// public/images/avatars/thumb/{slug}.webp (miniatura, para el selector).
// Es la ÚNICA fuente de verdad: el script de procesamiento importa este
// mismo archivo, así el catálogo nunca se desincroniza de los assets.
//
// Lo que se guarda en Firebase por jugador (campo `avatar`) es solo la ruta
// grande como string, p. ej. "/images/avatars/panda.webp" — nunca los
// bytes de la imagen. La imagen en sí vive como archivo estático servido
// por el CDN de Vercel (rápido, cacheado, gratis), igual que ya se hacía
// con las fotos de perfil de Google.

export const AVATAR_CATEGORIES = [
  { id: 'especiales', label: 'Especiales', icon: 'auto_awesome' },
  { id: 'animales', label: 'Animales', icon: 'pets' },
  { id: 'comida', label: 'Comida y bebida', icon: 'restaurant' },
  { id: 'futbol', label: 'Equipos', icon: 'sports_soccer' },
  { id: 'paises', label: 'Países y cultura', icon: 'public' }
];

export const CHARACTER_AVATARS = [
  { slug: 'athletic-bilbao', name: 'Athletic Bilbao', category: 'futbol' },
  { slug: 'aguacate', name: 'Aguacate', category: 'comida' },
  { slug: 'alemana', name: 'Alemana', category: 'paises' },
  { slug: 'atletico-madrid', name: 'Atlético Madrid', category: 'futbol' },
  { slug: 'andaluza', name: 'Andaluza', category: 'paises' },
  { slug: 'argentino', name: 'Argentino', category: 'paises' },
  { slug: 'banana', name: 'Banana', category: 'comida' },
  { slug: 'barcelona', name: 'Barcelona', category: 'futbol' },
  { slug: 'betis', name: 'Betis', category: 'futbol' },
  { slug: 'bola-disco', name: 'Bola Disco', category: 'especiales' },
  { slug: 'bola-disco-retro', name: 'Bola Disco Retro', category: 'especiales' },
  { slug: 'brocoli', name: 'Brócoli', category: 'comida' },
  { slug: 'cactus', name: 'Cactus', category: 'especiales' },
  { slug: 'cassette', name: 'Cassette', category: 'especiales' },
  { slug: 'catalan', name: 'Catalán', category: 'paises' },
  { slug: 'checa', name: 'Checa', category: 'paises' },
  { slug: 'huaso', name: 'Huaso', category: 'paises' },
  { slug: 'chilena', name: 'Chilena', category: 'paises' },
  { slug: 'chileno', name: 'Chileno', category: 'paises' },
  { slug: 'cafe', name: 'Café', category: 'comida' },
  { slug: 'colombia', name: 'Colombia', category: 'paises' },
  { slug: 'croqueta', name: 'Croqueta', category: 'comida' },
  { slug: 'croissant', name: 'Croissant', category: 'comida' },
  { slug: 'cubata', name: 'Cubata', category: 'comida' },
  { slug: 'donuts', name: 'Donuts', category: 'comida' },
  { slug: 'dorito', name: 'Dorito', category: 'comida' },
  { slug: 'einstein', name: 'Einstein', category: 'especiales' },
  { slug: 'espanol', name: 'Español', category: 'paises' },
  { slug: 'espanola', name: 'Española', category: 'paises' },
  { slug: 'espanolete', name: 'Españolete', category: 'paises' },
  { slug: 'fantasma', name: 'Fantasma', category: 'especiales' },
  { slug: 'flamenco', name: 'Flamenco', category: 'paises' },
  { slug: 'frances', name: 'Francés', category: 'paises' },
  { slug: 'frankfurt', name: 'Frankfurt', category: 'comida' },
  { slug: 'gallo', name: 'Gallo', category: 'animales' },
  { slug: 'gata', name: 'Gata', category: 'animales' },
  { slug: 'huevo', name: 'Huevo', category: 'comida' },
  { slug: 'inter-miami', name: 'Inter Miami', category: 'futbol' },
  { slug: 'italiano', name: 'Italiano', category: 'paises' },
  { slug: 'kiwi', name: 'Kiwi', category: 'comida' },
  { slug: 'llama', name: 'Llama', category: 'animales' },
  { slug: 'marruecos', name: 'Marruecos', category: 'paises' },
  { slug: 'mexico', name: 'México', category: 'paises' },
  { slug: 'muffin', name: 'Muffin', category: 'comida' },
  { slug: 'noe', name: 'Noé', category: 'especiales' },
  { slug: 'oso', name: 'Oso', category: 'animales' },
  { slug: 'palomitas', name: 'Palomitas', category: 'comida' },
  { slug: 'panda', name: 'Panda', category: 'animales' },
  { slug: 'papel', name: 'Soy Tu Papel', category: 'especiales' },
  { slug: 'pato', name: 'Pato', category: 'animales' },
  { slug: 'pere', name: 'Peré', category: 'especiales' },
  { slug: 'perro', name: 'Perro', category: 'animales' },
  { slug: 'peru', name: 'Perú', category: 'paises' },
  { slug: 'pimiento', name: 'Pimiento', category: 'comida' },
  { slug: 'pina', name: 'Piña', category: 'comida' },
  { slug: 'pinguino', name: 'Pingüino', category: 'animales' },
  { slug: 'pizza', name: 'Pizza', category: 'comida' },
  { slug: 'pretzel', name: 'Pretzel', category: 'comida' },
  { slug: 'psg', name: 'PSG', category: 'futbol' },
  { slug: 'pulpo', name: 'Pulpo', category: 'animales' },
  { slug: 'real-madrid', name: 'Real Madrid', category: 'futbol' },
  { slug: 'rodri', name: 'Rodri', category: 'especiales' },
  { slug: 'rusa', name: 'Rusa', category: 'paises' },
  { slug: 'sandia', name: 'Sandía', category: 'comida' },
  { slug: 'sevilla', name: 'Sevilla', category: 'futbol' },
  { slug: 'taco', name: 'Taco', category: 'comida' },
  { slug: 'tiburon', name: 'Tiburón', category: 'animales' },
  { slug: 'uk', name: 'UK', category: 'paises' },
  { slug: 'unicornio', name: 'Unicornio', category: 'animales' },
  { slug: 'usa', name: 'USA', category: 'paises' },
  { slug: 'usam', name: 'USA M', category: 'paises' },
  { slug: 'vasca', name: 'Vasca', category: 'paises' },
  { slug: 'zorro', name: 'Zorro', category: 'animales' },

  // Segunda tanda (NUEVOS1) — mismo estilo de retrato DJ, todos con nombre
  // propio, así que van a "especiales" junto con Rodri/Peré/Noé.
  { slug: 'alberto', name: 'Alberto', category: 'especiales' },
  { slug: 'alex', name: 'Álex', category: 'especiales' },
  { slug: 'angeles', name: 'Ángeles', category: 'especiales' },
  { slug: 'armando', name: 'Armando', category: 'especiales' },
  { slug: 'carol', name: 'Carol', category: 'especiales' },
  { slug: 'dani', name: 'Dani', category: 'especiales' },
  { slug: 'frank', name: 'Frank', category: 'especiales' },
  { slug: 'juanpi', name: 'Juanpi', category: 'especiales' },
  { slug: 'miguel', name: 'Miguel', category: 'especiales' },
  { slug: 'noe-2', name: 'Noé II', category: 'especiales' },
  { slug: 'nora', name: 'Nora', category: 'especiales' },
  { slug: 'pau', name: 'Pau', category: 'especiales' },
  { slug: 'rodri-2', name: 'Rodri II', category: 'especiales' },
  { slug: 'roger', name: 'Roger', category: 'especiales' },
  { slug: 'rosa', name: 'Rosa', category: 'especiales' },
  { slug: 'teresa', name: 'Teresa', category: 'especiales' },
  { slug: 'toni', name: 'Toni', category: 'especiales' },
  { slug: 'yone', name: 'Yone', category: 'especiales' },

  // Tercera tanda (nuevos)
  { slug: 'alfonso', name: 'Alfonso', category: 'especiales' },
  { slug: 'erick', name: 'Erick', category: 'especiales' },
  { slug: 'isa', name: 'Isa', category: 'especiales' },
  { slug: 'lucia', name: 'Lucía', category: 'especiales' },
  { slug: 'luisi', name: 'Luisi', category: 'especiales' },
  { slug: 'matias', name: 'Matías', category: 'especiales' },
  { slug: 'noa', name: 'Noa', category: 'especiales' },
  { slug: 'don-dj', name: 'Don DJ', category: 'especiales' }
];

const AVATAR_BY_SLUG = new Map(CHARACTER_AVATARS.map((entry) => [entry.slug, entry]));

export function getCharacterAvatarLargeUrl(slug) {
  return `/images/avatars/${slug}.webp`;
}

export function getCharacterAvatarThumbUrl(slug) {
  return `/images/avatars/thumb/${slug}.webp`;
}

export function findCharacterAvatarBySlug(slug) {
  return AVATAR_BY_SLUG.get(slug) || null;
}

// El campo `avatar` de un jugador puede ser: un emoji/texto corto, una URL
// de foto de Google (https://...), o la ruta local a uno de estos
// personajes (/images/avatars/slug.webp). Los dos últimos casos se
// renderizan como <img>; solo el emoji/texto se muestra como texto plano.
export function isImageAvatar(avatar) {
  return typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('/'));
}

export function findCharacterAvatarByUrl(avatar) {
  if (typeof avatar !== 'string') return null;
  const match = avatar.match(/\/images\/avatars\/([a-z0-9-]+)\.webp$/);
  return match ? findCharacterAvatarBySlug(match[1]) : null;
}

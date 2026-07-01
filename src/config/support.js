export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'dedicalo.es@gmail.com';
export const PLAYLIST_REQUEST_EMAIL = import.meta.env.VITE_PLAYLIST_REQUEST_EMAIL || 'dedicalo.es@gmail.com';

// Bizum doesn't have a universal cross-bank payment link, so the reliable option
// is showing the number for people to enter manually in their own banking app.
export const BIZUM_PHONE_RAW = (import.meta.env.VITE_BIZUM_PHONE || '653567610').replace(/\D/g, '');
export const BIZUM_PHONE_DISPLAY = BIZUM_PHONE_RAW.replace(/(\d{3})(?=\d)/g, '$1 ').trim();

// mailto: links are unreliable via window.open() (blocked or leave a blank tab
// in several browsers). Navigate the current tab instead, which is what every
// browser expects for mailto/tel links.
export function openMailto(url) {
  window.location.href = url;
}

export function getPlaylistRequestUrl() {
  const subject = encodeURIComponent('Quiero incluir mi playlist en Dedícalo');
  const body = encodeURIComponent([
    'Hola, ya hice una donación voluntaria y quiero incluir mi propia playlist en Dedícalo Play.',
    '',
    'Comprobante de la donación: (adjunta la captura aquí)',
    'Link de mi playlist de Spotify:',
    'Nombre de la playlist:',
    'Estilo musical:',
    'Mi nombre:',
  ].join('\n'));
  return `mailto:${PLAYLIST_REQUEST_EMAIL}?subject=${subject}&body=${body}`;
}

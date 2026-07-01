export const DONATION_URL = import.meta.env.VITE_BIZUM_DONATION_URL || import.meta.env.VITE_DONATION_URL || '';
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'dedicalo.es@gmail.com';
export const PLAYLIST_REQUEST_EMAIL = import.meta.env.VITE_PLAYLIST_REQUEST_EMAIL || 'dedicalo.es@gmail.com';

export function getSupportUrl() {
  if (DONATION_URL) return DONATION_URL;

  const subject = encodeURIComponent('Quiero apoyar Dedícalo Play por Bizum');
  const body = encodeURIComponent('Hola, quiero apoyar el proyecto Dedícalo Play por Bizum. ¿Me pasas el enlace o la forma de hacerlo?');
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
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

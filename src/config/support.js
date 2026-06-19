export const DONATION_URL = import.meta.env.VITE_BIZUM_DONATION_URL || import.meta.env.VITE_DONATION_URL || '';
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'rodrigo.negrete.aros@gmail.com';

export function getSupportUrl() {
  if (DONATION_URL) return DONATION_URL;

  const subject = encodeURIComponent('Quiero apoyar Dedícalo Play por Bizum');
  const body = encodeURIComponent('Hola, quiero apoyar el proyecto Dedícalo Play por Bizum. ¿Me pasas el enlace o la forma de hacerlo?');
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export const DONATION_URL = import.meta.env.VITE_DONATION_URL || '';
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'rodrigo.negrete.aros@gmail.com';

export function getSupportUrl() {
  if (DONATION_URL) return DONATION_URL;

  const subject = encodeURIComponent('Quiero apoyar Dedícalo Play');
  const body = encodeURIComponent('Hola, quiero saber cómo apoyar el proyecto Dedícalo Play.');
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}


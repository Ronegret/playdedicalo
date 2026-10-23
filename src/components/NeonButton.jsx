import { motion } from 'framer-motion';
import { useRef } from 'react';
import { sfx } from '../services/audio';
import { vibrar } from '../services/haptics';

// Fuera del componente: es una tabla fija, no hay motivo para reconstruirla
// en cada render.
const PALETA = {
  'electric-purple': '#a855f7',
  'vinyl-orange': '#ff7a1a',
  white: '#ffffff',
  'intense-red': '#ff6b8b',
};

export default function NeonButton({
  children,
  onClick,
  icon,
  color = 'electric-purple',
  className = '',
  primary = false,
  disabled = false,
  loading = false,
}) {
  const buttonRef = useRef(null);
  const estaBloqueado = disabled || loading;

  const accent = PALETA[color] || PALETA['electric-purple'];
  const accentBorder = primary ? `${accent}88` : 'rgba(255,255,255,0.12)';

  const handleClick = (e) => {
    if (estaBloqueado) return;

    // Respuesta inmediata, ANTES de cualquier trabajo: el toque tiene que
    // notarse en el mismo fotograma. Los dos canales van juntos a propósito
    // —en iPhone no hay vibración posible en web, y en una fiesta con ruido
    // no se oye nada— así que cada uno cubre el hueco del otro.
    sfx.toque();
    vibrar('toque');

    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      // Con teclado (Enter/Espacio) no hay coordenadas de puntero: clientX/Y
      // llegan a 0 y la onda nacía en la esquina. Sin puntero, se centra.
      const vieneDePuntero = e.clientX || e.clientY;
      const cx = vieneDePuntero ? e.clientX - rect.left : rect.width / 2;
      const cy = vieneDePuntero ? e.clientY - rect.top : rect.height / 2;
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position:absolute;
        left:${cx - 5}px;
        top:${cy - 5}px;
        width:10px; height:10px;
        border-radius:50%;
        background:${accent}55;
        pointer-events:none;
        animation:ripple-expand 0.55s ease-out forwards;
        z-index:0;
      `;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    onClick?.(e);
  };

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      whileHover={estaBloqueado ? undefined : { scale: 1.02, y: -2 }}
      whileTap={estaBloqueado ? undefined : { scale: 0.97 }}
      onClick={handleClick}
      disabled={estaBloqueado}
      aria-busy={loading || undefined}
      className={`w-full min-h-14 border rounded-2xl flex items-center justify-center gap-3 group overflow-hidden relative disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
      style={{
        borderColor: accentBorder,
        backgroundColor: primary ? accent : 'rgba(255,255,255,0.04)',
        boxShadow: primary
          ? `0 0 0 1px ${accent}22, 0 8px 28px ${accent}30, 0 0 50px ${accent}12`
          : '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Shimmer sweep */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.13] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

      {/* Hover glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: `${accent}18` }}
      />

      {loading && (
        <span
          aria-hidden="true"
          className="relative z-10 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}

      {!loading && icon && <span className="relative z-10 flex items-center justify-center">{icon}</span>}

      {/*
        Texto negro sobre el color de acento cuando es primario: blanco sobre
        #ff7a1a da 2,6:1 y sobre #a855f7 da 4,0:1 — los dos por debajo del
        4,5:1 que pide WCAG AA. Negro sobre naranja sube a 8:1. Es el botón
        principal de toda la app, así que aquí el contraste no es opcional.
        El tamaño sube de 0.82rem a 0.95rem: era el texto más importante de
        la interfaz y el más pequeño.
      */}
      <span
        className={`relative z-10 select-none text-center font-label-caps text-[0.95rem] uppercase tracking-[0.12em] sm:text-base sm:tracking-[0.18em] ${primary ? 'text-black' : 'text-white'}`}
      >
        {children}
      </span>
    </motion.button>
  );
}

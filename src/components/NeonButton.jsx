import { motion } from 'framer-motion';
import { useRef } from 'react';

export default function NeonButton({
  children,
  onClick,
  icon,
  color = 'electric-purple',
  className = '',
  primary = false,
  disabled = false,
}) {
  const buttonRef = useRef(null);

  const palette = {
    'electric-purple': '#a855f7',
    'vinyl-orange': '#ff7a1a',
    white: '#ffffff',
    'intense-red': '#ff6b8b',
  };
  const accent = palette[color] || palette['electric-purple'];
  const accentBorder = primary ? `${accent}88` : 'rgba(255,255,255,0.12)';

  const handleClick = (e) => {
    if (disabled) return;

    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position:absolute;
        left:${e.clientX - rect.left - 5}px;
        top:${e.clientY - rect.top - 5}px;
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
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      disabled={disabled}
      className={`w-full min-h-14 border rounded-2xl flex items-center justify-center gap-3 group overflow-hidden relative disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
      style={{
        borderColor: accentBorder,
        backgroundColor: primary ? accent : 'rgba(255,255,255,0.04)',
        boxShadow: primary
          ? `0 0 0 1px ${accent}22, 0 8px 28px ${accent}30, 0 0 50px ${accent}12`
          : '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.13] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

      {/* Hover glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: `${accent}18` }}
      />

      {icon && <span className="relative z-10 flex items-center justify-center">{icon}</span>}

      <span className="relative z-10 select-none text-center font-label-caps text-[0.82rem] uppercase tracking-[0.12em] text-white sm:text-base sm:tracking-[0.18em]">
        {children}
      </span>
    </motion.button>
  );
}

import { motion } from 'framer-motion';

export default function NeonButton({ 
  children, 
  onClick, 
  icon, 
  color = 'electric-purple',
  className = '',
  primary = false,
  disabled = false
}) {
  const palette = {
    'electric-purple': '#ff4fd8',
    'vinyl-orange': '#ff7a1a',
    white: '#ffffff',
    'intense-red': '#ff6b8b'
  };
  const accent = palette[color] || palette['electric-purple'];
  const accentSoft = primary
    ? `${accent}22`
    : 'rgba(255,255,255,0.08)';
  const accentBorder = primary ? `${accent}88` : 'rgba(255,255,255,0.12)';
  
  return (
    <motion.button 
      type="button"
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-14 bg-glass-surface border rounded-2xl flex items-center justify-center gap-3 group overflow-hidden relative disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.2)] ${className}`}
      style={{
        borderColor: accentBorder,
        backgroundColor: primary ? accent : 'rgba(255, 255, 255, 0.04)',
        boxShadow: primary ? `0 0 0 1px ${accent}22, 0 16px 36px rgba(0,0,0,0.2)` : '0 16px 36px rgba(0,0,0,0.18)'
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: accentSoft }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700" />
      
      {icon && (
        <span className="relative z-10 flex items-center justify-center">
          {icon}
        </span>
      )}
      
      <span className="font-label-caps text-sm sm:text-base text-white relative z-10 uppercase tracking-[0.18em] text-center">
        {children}
      </span>
    </motion.button>
  );
}


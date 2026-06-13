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
  const borderColorClass = primary ? `border-${color}/50` : 'border-surface-container-highest';
  const bgHoverClass = primary ? `bg-${color}/10` : 'bg-white/5';
  
  return (
    <motion.button 
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-14 bg-glass-surface glass-blur border-2 ${borderColorClass} rounded-xl flex items-center justify-center gap-3 group overflow-hidden relative disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <div className={`absolute inset-0 pointer-events-none ${bgHoverClass} translate-y-full group-hover:translate-y-0 transition-transform`}></div>
      
      {icon && (
        <span className="relative z-10 flex items-center justify-center">
          {icon}
        </span>
      )}
      
      <span className="font-label-caps text-label-caps text-on-surface relative z-10 uppercase tracking-widest">
        {children}
      </span>
    </motion.button>
  );
}

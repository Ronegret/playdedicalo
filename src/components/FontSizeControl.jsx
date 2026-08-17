import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFontScale } from '../hooks/useFontScale';

// Cada botón se dibuja a su propio tamaño real (16px / 20px / 30px) en vez
// de depender de una etiqueta chica ("A+", "A++") que alguien con poca
// visión tendría que leer para entender qué hace — el tamaño ES la
// explicación.
const OPTIONS = [
  { id: 'normal', title: 'Letra normal', textClass: 'text-base' },
  { id: 'large', title: 'Letra grande', textClass: 'text-xl' },
  { id: 'xl', title: 'Letra muy grande', textClass: 'text-3xl' }
];

// Colapsado por defecto — solo un ícono discreto, del mismo tamaño y peso
// visual que cualquier otro botón secundario del header. Al tocarlo se abre
// un panel chico con las 3 opciones, en vez de mostrar siempre 4 botones
// grandes con borde propio (se veía pesado en pantallas que ya tienen
// bastante encima). Reutilizado en el menú de perfil y en las pantallas de
// entrada (Bienvenida, Selección de rol, Unirse, Anfitrión).
export default function FontSizeControl({ className = '' }) {
  const { scale, setScale } = useFontScale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Tamaño de letra"
        aria-expanded={open}
        className="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-on-surface-variant transition-colors active:scale-95 hover:text-white"
      >
        <span className="material-symbols-outlined text-xl">text_fields</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-surface-container/95 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            role="group"
            aria-label="Elegir tamaño de letra"
          >
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { setScale(option.id); setOpen(false); }}
                aria-pressed={scale === option.id}
                aria-label={option.title}
                title={option.title}
                className={`flex min-w-touch min-h-touch items-center justify-center rounded-xl border font-black leading-none transition-all active:scale-95 ${option.textClass} ${
                  scale === option.id
                    ? 'border-neon-green bg-neon-green/15 text-neon-green'
                    : 'border-white/12 bg-white/5 text-white/70'
                }`}
              >
                A
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

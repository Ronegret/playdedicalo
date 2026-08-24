import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFontScale } from '../hooks/useFontScale';

// Cada botón se dibuja a su propio tamaño real (16px / 20px / 30px) en vez
// de depender de una etiqueta chica ("A+", "A++") que alguien con poca
// visión tendría que leer para entender qué hace — el tamaño ES la
// explicación.
const OPTIONS = [
  { id: 'normal', title: 'Letra normal', label: 'NORMAL', textClass: 'text-base' },
  { id: 'large', title: 'Letra grande', label: 'GRANDE', textClass: 'text-xl' },
  { id: 'xl', title: 'Letra muy grande', label: 'MUY GRANDE', textClass: 'text-3xl' }
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
      {/* Antes era solo un icono "T" suelto — nadie sabía qué hacía. Ahora
          lleva la etiqueta "LETRA" al lado (se oculta solo en pantallas muy
          angostas, donde el aria-label sigue explicándolo). */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Cambiar tamaño de letra"
        aria-expanded={open}
        className="flex min-h-touch items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-2.5 text-on-surface-variant transition-colors active:scale-95 hover:text-white"
      >
        <span className="material-symbols-outlined text-xl">format_size</span>
        <span className="font-label-caps text-xs font-bold tracking-wide">LETRA</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-[13.5rem] rounded-2xl border border-white/10 bg-surface-container/95 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            role="group"
            aria-label="Elegir tamaño de letra"
          >
            <p className="px-2 pb-1.5 pt-1 font-label-caps text-[11px] tracking-[0.16em] text-on-surface-variant">
              TAMAÑO DE LETRA
            </p>
            <div className="flex flex-col gap-1">
              {OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { setScale(option.id); setOpen(false); }}
                  aria-pressed={scale === option.id}
                  title={option.title}
                  className={`flex min-h-touch items-center gap-2.5 rounded-xl border px-3 transition-all active:scale-95 ${
                    scale === option.id
                      ? 'border-neon-green bg-neon-green/15 text-neon-green'
                      : 'border-white/12 bg-white/5 text-white/70'
                  }`}
                >
                  {/* La "A" se dibuja al tamaño real de cada opción: el
                      tamaño ES la explicación, y ahora además va con su
                      nombre escrito al lado. */}
                  <span className={`w-7 shrink-0 text-center font-black leading-none ${option.textClass}`}>A</span>
                  <span className="font-label-caps text-xs font-bold">{option.label}</span>
                  {scale === option.id && (
                    <span className="material-symbols-outlined ml-auto text-base">check</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const MENU_WIDTH = 216; // px — coincide con el ancho fijo del panel abajo

export default function FontSizeControl({ className = '' }) {
  const { scale, setScale } = useFontScale();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // El panel se dibuja en un portal a <body> con posición fija calculada a
  // partir del botón. Antes era `absolute` dentro del contenedor, y al
  // usarse desde el menú de perfil (que tiene max-height + overflow-y-auto)
  // quedaba recortado: solo se veía "NORMAL" y media "GRANDE". Un portal
  // también lo saca de los headers con backdrop-blur, que de lo contrario
  // atraparían cualquier position:fixed.
  const updatePosition = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    // Alineado a la derecha del botón, pero sin salirse de la pantalla.
    const left = Math.min(
      Math.max(margin, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - margin
    );
    setMenuPos({ top: rect.bottom + margin, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      const insideTrigger = ref.current?.contains(event.target);
      const insideMenu = menuRef.current?.contains(event.target);
      if (!insideTrigger && !insideMenu) setOpen(false);
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
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Cambiar tamaño de letra"
        aria-expanded={open}
        className="flex min-h-touch items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-2.5 text-on-surface-variant transition-colors active:scale-95 hover:text-white"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-xl">format_size</span>
        <span className="font-label-caps text-xs font-bold tracking-wide">LETRA</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && menuPos && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[420] rounded-2xl border border-white/10 bg-surface-container p-2 shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
              style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
              role="group"
              aria-label="Elegir tamaño de letra"
            >
            <p className="px-2 pb-1.5 pt-1 font-label-caps text-[0.65rem] tracking-[0.16em] text-on-surface-variant">
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
                    <span aria-hidden="true" className="material-symbols-outlined ml-auto text-base">check</span>
                  )}
                </button>
              ))}
            </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

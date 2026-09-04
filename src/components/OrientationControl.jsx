import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ORIENTATION_HINTS, ORIENTATION_LABELS, useOrientation } from '../hooks/useOrientation';

const ICONO = {
  auto: 'screen_rotation',
  vertical: 'stay_current_portrait',
  horizontal: 'stay_current_landscape'
};

/**
 * Elegir cómo se juega: siguiendo al teléfono, siempre vertical o apaisado.
 *
 * El menú se pinta con portal a <body> por la misma razón que el de tamaño
 * de letra: la cabecera lleva backdrop-filter, y cualquier ancestro con
 * backdrop-filter se convierte en el bloque contenedor de sus hijos
 * `position: fixed`, así que un menú fijo dentro de ella se recortaría.
 */
export default function OrientationControl({ compact = false }) {
  const { mode, setMode, modes, waitingForRotation } = useOrientation();
  const [abierto, setAbierto] = useState(false);
  const [rect, setRect] = useState(null);
  const botonRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = (evento) => {
      if (botonRef.current?.contains(evento.target)) return;
      setAbierto(false);
    };
    const conTecla = (evento) => { if (evento.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', conTecla);
    return () => {
      document.removeEventListener('pointerdown', cerrar);
      document.removeEventListener('keydown', conTecla);
    };
  }, [abierto]);

  const alternar = () => {
    const caja = botonRef.current?.getBoundingClientRect();
    if (caja) setRect({ top: caja.bottom + 8, right: window.innerWidth - caja.right });
    setAbierto((previo) => !previo);
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        aria-label="Orientación de la pantalla"
        aria-expanded={abierto}
        className={`relative flex min-h-touch items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 text-white transition-colors active:scale-95 ${compact ? 'w-12' : 'px-3'}`}
      >
        <span className="material-symbols-outlined">{ICONO[mode]}</span>
        {!compact && (
          <span className="font-label-caps text-[0.65rem] font-bold tracking-wide">
            {ORIENTATION_LABELS[mode].toUpperCase()}
          </span>
        )}
        {waitingForRotation && (
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-surface bg-chaos-gold" />
        )}
      </button>

      {abierto && rect && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ top: rect.top, right: rect.right }}
            className="fixed z-[320] w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl border border-white/12 bg-surface-container/97 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <p className="px-2 py-1.5 font-label-caps text-[0.65rem] tracking-[0.14em] text-on-surface-variant">
              CÓMO SE VE EL JUEGO
            </p>
            {modes.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => { setMode(opcion); setAbierto(false); }}
                className={`flex w-full min-h-touch items-center gap-3 rounded-xl px-3 text-left transition-colors ${
                  mode === opcion ? 'bg-neon-green/15 text-neon-green' : 'text-white hover:bg-white/6'
                }`}
              >
                <span className="material-symbols-outlined shrink-0">{ICONO[opcion]}</span>
                <span className="flex-1">
                  <span className="block font-bold leading-tight">{ORIENTATION_LABELS[opcion]}</span>
                  <span className="block text-[0.78rem] leading-tight text-on-surface-variant">
                    {ORIENTATION_HINTS[opcion]}
                  </span>
                </span>
                {mode === opcion && <span className="material-symbols-outlined shrink-0">check</span>}
              </button>
            ))}
            <p className="px-3 py-2 text-[0.78rem] leading-snug text-on-surface-variant">
              En apaisado la ruta de años se ve casi el doble de larga.
            </p>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

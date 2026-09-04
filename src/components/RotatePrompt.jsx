import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useOrientation } from '../hooks/useOrientation';

/**
 * Aviso para cuando alguien elige apaisado pero el móvil sigue de pie.
 *
 * La web no puede girar la pantalla de nadie: `screen.orientation.lock()`
 * exige pantalla completa y en Safari de iPhone ni existe. Se intenta el
 * bloqueo nativo donde se pueda (ver useOrientation) y, si no cuela, esto
 * pide el giro. Es preferible a rotar el contenido con CSS, que descuadra
 * los menús y el desplazamiento.
 *
 * Nunca bloquea la partida: se puede cerrar y seguir jugando en vertical.
 */
export default function RotatePrompt() {
  const { waitingForRotation, setMode } = useOrientation();
  if (!waitingForRotation) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-3 z-[310] rounded-2xl border border-chaos-gold/40 bg-surface-container/97 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      role="status"
    >
      <div className="flex items-center gap-3">
        <motion.span
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.35, 0.75, 1] }}
          className="material-symbols-outlined shrink-0 text-3xl text-chaos-gold"
        >
          stay_current_landscape
        </motion.span>
        <div className="flex-1">
          <p className="font-bold leading-tight text-white">Gira el móvil</p>
          <p className="mt-0.5 text-[0.85rem] leading-snug text-on-surface-variant">
            Si tienes el giro bloqueado, desactívalo en los ajustes del teléfono.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setMode('auto')}
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 font-label-caps text-sm font-bold text-white active:scale-[0.98]"
      >
        SEGUIR EN VERTICAL
      </button>
    </motion.div>,
    document.body
  );
}

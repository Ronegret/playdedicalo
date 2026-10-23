import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const TONES = {
  error: {
    icon: 'error',
    color: '#ff6b8b',
    border: 'border-intense-red/50',
    glow: '0 0 60px rgba(255,107,139,0.28)'
  },
  warning: {
    icon: 'warning',
    color: '#ffbf4d',
    border: 'border-chaos-gold/50',
    glow: '0 0 60px rgba(255,191,77,0.25)'
  },
  info: {
    icon: 'info',
    color: '#39ff14',
    border: 'border-neon-green/45',
    glow: '0 0 60px rgba(57,255,20,0.22)'
  }
};

// Aviso emergente para errores y datos que faltan. Antes estos mensajes
// aparecían como texto chico dentro del formulario y se pasaban por alto
// (o quedaban fuera de pantalla si había que scrollear) — a pedido
// explícito, ahora interrumpen con un cartel que hay que reconocer.
//
// Va en un portal a <body> por la misma razón que el editor de perfil: se
// invoca desde pantallas cuyo header tiene backdrop-blur, y cualquier
// ancestro con backdrop-filter/transform atraparía un position:fixed.
export default function AlertDialog({
  open,
  tone = 'error',
  title,
  message,
  confirmLabel = 'ENTENDIDO',
  onClose,
  // Con `onConfirm` el cartel pasa de "enterarse" a "decidir": aparece un
  // segundo boton para cancelar y el de confirmar toma el color del tono.
  // Hace falta para acciones que destruyen algo (cerrar una sala acaba la
  // partida de todos) donde un solo boton de "ENTENDIDO" no pregunta nada.
  onConfirm,
  cancelLabel = 'CANCELAR',
  destructive = false
}) {
  const style = TONES[tone] || TONES.error;
  const esDecision = typeof onConfirm === 'function';

  // Escape cierra. Un cartel modal sin salida por teclado es una trampa de
  // foco, y aqui ademas la salida segura es siempre "no hagas nada".
  useEffect(() => {
    if (!open) return undefined;
    const alPulsar = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 px-5"
          onClick={onClose}
          role="alertdialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 24, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className={`w-full max-w-sm rounded-3xl border-2 ${style.border} bg-surface-container p-6 text-center`}
            style={{ boxShadow: style.glow }}
            onClick={(event) => event.stopPropagation()}
          >
            <span aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: '3.25rem', color: style.color }}
            >
              {style.icon}
            </span>
            {title && (
              <h3 className="mt-2 font-headline-lg text-xl font-black leading-tight text-white">{title}</h3>
            )}
            <p className="mt-2 text-base leading-relaxed text-on-surface-variant">{message}</p>
            <div className={`mt-6 ${esDecision ? 'flex flex-col gap-2' : ''}`}>
              {esDecision && (
                <button
                  type="button"
                  onClick={onClose}
                  autoFocus
                  className="flex min-h-touch w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 font-label-caps text-base font-black text-white transition-transform active:scale-95"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={esDecision ? onConfirm : onClose}
                autoFocus={!esDecision}
                className={`flex min-h-touch w-full items-center justify-center rounded-2xl border font-label-caps text-base font-black transition-transform active:scale-95 ${
                  destructive
                    ? 'border-transparent bg-intense-red text-black'
                    : 'border-white/15 bg-white/10 text-white'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

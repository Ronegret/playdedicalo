import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { BIZUM_PHONE_DISPLAY, BIZUM_PHONE_RAW } from '../config/support';

export default function SupportButton({ compact = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(BIZUM_PHONE_RAW)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative overflow-hidden rounded-2xl border border-vinyl-orange/35 bg-vinyl-orange/10 text-white active:scale-95 transition-all ${compact ? 'h-11 px-4 text-xs' : 'min-h-14 px-5 py-3 text-sm'} ${className}`}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <span className="relative flex items-center justify-center gap-2 font-label-caps tracking-[0.16em]">
          <span className="material-symbols-outlined text-vinyl-orange text-base">payments</span>
          Apoyar con Bizum
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/92 px-4 pb-6 sm:pb-0"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-vinyl-orange/40 bg-surface-container p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-label-caps text-[0.706rem] text-vinyl-orange tracking-widest">APOYA CON BIZUM</p>
              <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">
                Abre la app de tu banco, elige Bizum y envía tu aporte a este número:
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                <span className="text-2xl font-black text-white tracking-wide">{BIZUM_PHONE_DISPLAY}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 min-h-touch px-3 rounded-lg border border-vinyl-orange/40 bg-vinyl-orange/15 text-vinyl-orange font-label-caps text-[0.65rem] font-bold active:scale-95 transition-transform flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'COPIADO' : 'COPIAR'}
                </button>
              </div>

              <p className="mt-3 text-[0.65rem] text-on-surface-variant leading-relaxed">
                Cualquier monto ayuda a mantener el proyecto. ¡Gracias!
              </p>

              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-transform"
              >
                CERRAR
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

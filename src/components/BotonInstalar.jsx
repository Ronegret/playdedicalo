import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { vibrar } from '../services/haptics';
import { sfx } from '../services/audio';

/**
 * INSTALAR LA APP
 *
 * EL PROBLEMA QUE RESUELVE
 *
 * El botón anterior dependía de `beforeinstallprompt`, que es un evento que
 * Safari NO implementa y que Apple no ha dado señales de ir a implementar.
 * Resultado: en iPhone la variable era `null` para siempre, el botón no se
 * pintaba nunca y NADIE con un iPhone llegaba a enterarse de que la app se
 * puede instalar. Justo la mitad del público, y la mitad a la que peor le
 * sienta jugar en el navegador.
 *
 * En iOS sí se puede instalar, pero solo a mano: Compartir → Añadir a
 * pantalla de inicio. Como no hay API, lo único que cabe hacer es enseñar la
 * instrucción — que es exactamente lo que hacen todas las apps web que se
 * toman esto en serio.
 *
 * Tres caminos, entonces:
 *   · Android/Chrome  → el diálogo nativo de siempre.
 *   · iPhone/iPad     → la instrucción, con el icono de Compartir de verdad.
 *   · Ya instalada    → nada. Ofrecer instalar algo ya instalado confunde.
 */

/** ¿Estamos ya dentro de la app instalada? */
function yaInstalada() {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // El propietario de Apple, anterior al estándar y el único fiable en iOS.
    if (window.navigator.standalone === true) return true;
  } catch { /* ignorar */ }
  return false;
}

/**
 * ¿Es iOS?
 *
 * El iPad moderno miente y dice ser un Mac, así que hace falta la segunda
 * comprobación: un Mac con pantalla táctil no existe, pero un iPad que se
 * hace pasar por Mac sí.
 */
function esIOS() {
  try {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  } catch { return false; }
}

export default function BotonInstalar() {
  const [prompt, setPrompt] = useState(null);
  const [instrucciones, setInstrucciones] = useState(false);
  const [instalada] = useState(yaInstalada);
  const ios = esIOS();

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (instalada) return null;
  // Ni evento nativo ni iOS: un navegador de escritorio, o uno que no permite
  // instalar. Un botón que no lleva a ninguna parte es peor que ningún botón.
  if (!prompt && !ios) return null;

  const alPulsar = () => {
    vibrar('toque');
    sfx.toque();
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then(() => setPrompt(null));
      return;
    }
    setInstrucciones(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={alPulsar}
        className="app-pulsable min-h-touch w-full rounded-2xl border border-electric-purple/30 bg-electric-purple/8 text-electric-purple/80 text-xs font-semibold uppercase tracking-[0.18em] flex items-center justify-center gap-2 hover:bg-electric-purple/15 transition-colors"
      >
        <span className="material-symbols-outlined text-base">{ios ? 'ios_share' : 'download'}</span>
        Instalar app
      </button>

      <AnimatePresence>
        {instrucciones && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInstrucciones(false)}
            className="app-velo fixed inset-0 z-[300] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="app-carta-alta w-full max-w-sm rounded-3xl p-6 text-center"
            >
              <span className="material-symbols-outlined text-3xl text-neon-green">smartphone</span>
              <h2 className="app-titular mt-3 text-2xl text-on-surface">Añadir a tu iPhone</h2>
              <p className="copy-readable mt-2 text-on-surface-variant">
                Safari no permite instalarla sola. Son dos toques:
              </p>

              {/* Los iconos van como `icono: '…'` y no dentro de una tupla a
                  propósito: es la forma que scripts/iconos.mjs sabe leer para
                  meterlos en el subconjunto de la fuente. Un icono que no
                  viaja en la fuente se dibuja como SU NOMBRE en texto plano
                  en mitad de la pantalla. */}
              <ol className="mt-5 space-y-3 text-left">
                {[
                  { icono: 'ios_share', texto: <>Toca <strong className="text-on-surface">Compartir</strong> en la barra de Safari.</> },
                  { icono: 'add_box', texto: <>Elige <strong className="text-on-surface">Añadir a pantalla de inicio</strong>.</> },
                  { icono: 'check_circle', texto: <>Listo: Dedícalo queda como una app más.</> }
                ].map(({ icono, texto }, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-purple/20 text-xs font-bold text-electric-purple">
                      {i + 1}
                    </span>
                    <span className="copy-readable text-on-surface-variant">
                      <span className="material-symbols-outlined mr-1 align-[-4px] text-base text-neon-green">{icono}</span>
                      {texto}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 text-xs text-on-surface-variant/70">
                Instalada suena mejor: la música no se corta con el interruptor de silencio.
              </p>

              <button
                type="button"
                onClick={() => { vibrar('toque'); setInstrucciones(false); }}
                className="app-pulsable mt-5 min-h-touch w-full rounded-2xl bg-electric-purple/90 text-sm font-bold uppercase tracking-[0.18em] text-white"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

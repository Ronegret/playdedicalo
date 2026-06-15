import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center px-margin-mobile py-10 gap-5 overflow-hidden text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75 }}
        className="w-full flex flex-col items-center gap-4"
      >
        <p
          className="font-black italic uppercase tracking-[0.34em] text-electric-purple text-[11px] sm:text-xs"
          style={{ fontFamily: 'Space Mono, monospace' }}
        >
          PARTY GAME MUSICAL
        </p>

        <div className="w-full max-w-[340px] rounded-[2rem] border border-white/10 bg-surface-container/80 p-4 shadow-[0_26px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="rounded-[1.75rem] border border-white/10 bg-surface-container-lowest/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-[1.5rem] border border-white/10 bg-black/15 p-3">
                <img
                  src="/images/logo-main.png"
                  alt="Dedícalo"
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="shrink-0 w-14 h-14 rounded-full bg-vinyl-orange text-black flex items-center justify-center shadow-[0_0_22px_rgba(255,122,26,0.35)]">
                <span className="material-symbols-outlined text-3xl">play_arrow</span>
              </div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-vinyl-orange via-electric-purple to-vinyl-orange" />
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">
              <span>DEDICALO.ES</span>
              <span>spotify style</span>
            </div>
          </div>
        </div>
      </motion.div>

      <section className="flex flex-col gap-4 text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.75 }}
          className="space-y-3"
        >
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-black leading-tight uppercase tracking-tight">
            Convierte la música en una <span className="text-animated-gradient">batalla de amigos</span>.
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed px-2 max-w-md mx-auto">
            Escucha una playlist, responde antes que el resto, usa sabotajes y gana llegando primero a la meta.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.75 }}
          className="flex flex-col gap-3"
        >
          <NeonButton primary={true} onClick={() => navigate('/how-to-play')}>
            Cómo se juega
          </NeonButton>
          <button
            type="button"
            onClick={() => navigate('/role-selection')}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white font-label-caps text-xs tracking-[0.22em] hover:bg-white/10 transition-colors"
          >
            Ya sé jugar
          </button>
        </motion.div>
      </section>
    </motion.main>
  );
}

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import VinylVisualizer from '../components/VinylVisualizer';
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
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.08, duration: 0.8 }}
        className="w-full flex flex-col items-center gap-4"
      >
        <div className="w-full max-w-[260px] rounded-[2rem] border border-white/10 bg-surface-container-lowest/55 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <img
            src="/images/logo-main.png"
            alt="Dedícalo"
            className="w-full h-auto rounded-[1.35rem] object-contain"
          />
        </div>
        <img
          src="/images/logo-horizontal.png"
          alt="Dedícalo"
          className="w-[240px] max-w-[80vw] h-auto drop-shadow-[0_12px_34px_rgba(255,122,26,0.18)]"
        />
        <VinylVisualizer size="compact" logoSrc="/images/icon-app.png" />
      </motion.div>

      <section className="flex flex-col gap-5 text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="space-y-3"
        >
          <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">PARTY GAME MUSICAL</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-black leading-tight uppercase">
            Convierte la música en una <span className="text-animated-gradient">batalla de amigos</span>.
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed px-2 max-w-md mx-auto">
            Escucha una playlist, responde antes que el resto, usa sabotajes y gana llegando primero a la meta.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.8 }}
          className="flex flex-col gap-3"
        >
          <NeonButton primary={true} onClick={() => navigate('/how-to-play')}>
            Cómo se juega
          </NeonButton>
          <button
            type="button"
            onClick={() => navigate('/role-selection')}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 text-on-surface-variant font-label-caps text-xs tracking-[0.22em] hover:bg-white/10 transition-colors"
          >
            Ya sé jugar, entrar
          </button>
        </motion.div>
      </section>
    </motion.main>
  );
}

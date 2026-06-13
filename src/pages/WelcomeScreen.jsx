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
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center px-margin-mobile py-stack-lg gap-5 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        className="-mt-8"
      >
        <VinylVisualizer size="hero" logoSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuB1RetzBF8-HbJ_i7Z6O1UPQS8ck_ja3otVu2iIyd4o_Cq-iPO3jcy3HzeHus2OgNrAqGpw-5kaptsja_BLeBDv9niT9sRzGrVce6M25VLz2-9kQd8JLQd6UzLMgPCTqwi4RfkLWGrOldT9Hqu-clEDN6jee11qj92BfYUGbJqzGa_4wJlPl3AdRTs3jb0zaRFQvULdNZs9l3-LVE73Up7TfFmbyEcftbA4JcRRNwpMhGEp-ihBGQYgTla_m0l50IAIhYk-_PjzHbsB" />
      </motion.div>

      <section className="flex flex-col gap-5 text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="space-y-3"
        >
          <p className="font-label-caps text-neon-green text-xs tracking-widest">INTERACCION MUSICAL SOCIAL</p>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-black leading-tight uppercase">
            Convierte la musica en una <span className="text-animated-gradient">batalla de amigos</span>.
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed px-2">
            Escucha una playlist, responde antes que el resto, usa sabotajes y gana llegando primero a 40, 70 o 100 puntos.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.8 }}
          className="flex flex-col gap-3"
        >
          <NeonButton primary={true} onClick={() => navigate('/how-to-play')}>
            Como se juega
          </NeonButton>
          <button
            type="button"
            onClick={() => navigate('/role-selection')}
            className="h-12 rounded-xl border border-white/10 bg-white/5 text-on-surface-variant font-label-caps text-xs tracking-widest hover:bg-white/10 transition-colors"
          >
            Ya se jugar, entrar
          </button>
        </motion.div>
      </section>
    </motion.main>
  );
}

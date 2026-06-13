import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';

export default function RoleSelectionScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col px-margin-mobile pt-24 pb-10"
    >
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-margin-mobile h-16 left-0 bg-surface/80 backdrop-blur-xl border-b border-white/10">
        <button onClick={() => navigate('/how-to-play')} className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs">
          <span className="material-symbols-outlined text-sm">arrow_back</span> REGLAS
        </button>
        <button onClick={() => navigate('/')} className="text-on-surface-variant hover:text-white transition-colors font-label-caps text-xs">
          INICIO
        </button>
      </header>

      <section className="text-left">
        <p className="font-label-caps text-neon-green text-xs tracking-widest">ENTRAR A LA PARTIDA</p>
        <h1 className="mt-2 font-headline-lg text-4xl font-black uppercase tracking-tight text-on-surface leading-tight">
          Elige como vas a jugar
        </h1>
        <p className="mt-3 text-on-surface-variant text-base leading-relaxed">
          Dedicalo tiene dos entradas. El anfitrion crea la sala y tambien compite. Los invitados entran con PIN o QR.
        </p>
      </section>

      <section className="mt-7 flex flex-col gap-4 w-full">
        <article className="rounded-2xl border border-neon-green/40 bg-neon-green/10 p-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-neon-green text-4xl">headphones</span>
            <div>
              <h2 className="font-headline-lg-mobile text-2xl text-white">Anfitrion jugador</h2>
              <p className="text-sm text-on-surface-variant mt-1">Crea la sala, muestra el QR, controla el corte y responde como todos.</p>
            </div>
          </div>
          <div className="mt-4">
            <NeonButton primary={true} onClick={() => navigate('/host/sync')}>
              Crear sala
            </NeonButton>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-electric-purple text-4xl">person_add</span>
            <div>
              <h2 className="font-headline-lg-mobile text-2xl text-white">Invitado</h2>
              <p className="text-sm text-on-surface-variant mt-1">Entra con el PIN de 4 digitos o escanea el QR del anfitrion.</p>
            </div>
          </div>
          <div className="mt-4">
            <NeonButton onClick={() => navigate('/guest/join')}>
              Unirme a sala
            </NeonButton>
          </div>
        </article>
      </section>
    </motion.main>
  );
}

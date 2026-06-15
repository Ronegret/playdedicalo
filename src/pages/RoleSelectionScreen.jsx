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
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col items-center px-margin-mobile pt-20 pb-10 text-center"
    >
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-margin-mobile bg-background/78 backdrop-blur-xl border-b border-white/8">
        <button
          onClick={() => navigate('/how-to-play')}
          className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          VOLVER
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-on-surface-variant hover:text-white transition-colors font-label-caps text-xs tracking-[0.18em]"
        >
          INICIO
        </button>
      </header>

      <section className="w-full flex flex-col items-center gap-4">
        <img
          src="/images/logo-main.png"
          alt="Dedícalo"
          className="w-[220px] max-w-[70vw] h-auto drop-shadow-[0_10px_28px_rgba(255,122,26,0.18)]"
        />
        <div className="space-y-3 max-w-md">
          <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">ELIGE TU ROL</p>
          <h1 className="font-headline-lg text-4xl font-black uppercase tracking-tight text-on-surface leading-tight">
            Todos juegan, incluso el anfitrión
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            Crea la sala o entra con el PIN. La partida es para todo el mundo y el anfitrión también suma puntos.
          </p>
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-4 w-full">
        <article className="rounded-[1.75rem] border border-vinyl-orange/35 bg-surface-container/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-center gap-3">
            <span className="material-symbols-outlined text-vinyl-orange text-4xl">headphones</span>
            <div className="text-left">
              <h2 className="font-headline-lg-mobile text-2xl text-white">Anfitrión jugador</h2>
              <p className="text-sm text-on-surface-variant mt-1">Crea la sala, comparte el PIN y juega en la misma partida.</p>
            </div>
          </div>
          <div className="mt-4">
            <NeonButton primary={true} onClick={() => navigate('/host/sync')}>
              Crear sala
            </NeonButton>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-center gap-3">
            <span className="material-symbols-outlined text-electric-purple text-4xl">person_add</span>
            <div className="text-left">
              <h2 className="font-headline-lg-mobile text-2xl text-white">Invitado</h2>
              <p className="text-sm text-on-surface-variant mt-1">Entra con el PIN de 4 dígitos o escanea el QR.</p>
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

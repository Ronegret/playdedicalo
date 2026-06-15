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
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-on-surface-variant hover:text-white transition-colors font-label-caps text-xs tracking-[0.18em]"
        >
          INICIO
        </button>
      </header>

      <section className="w-full flex flex-col items-center gap-3 mb-8">
        <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">¿CÓMO ENTRAS?</p>
        <h1 className="font-headline-lg text-4xl font-black uppercase tracking-tight text-on-surface leading-tight">
          Elige tu rol
        </h1>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs">
          Todos juegan. El anfitrión crea la sala y también suma puntos.
        </p>
      </section>

      <section className="flex flex-col gap-4 w-full">
        {/* Host card */}
        <motion.article
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="rounded-[2rem] border border-vinyl-orange/45 bg-gradient-to-br from-vinyl-orange/12 via-transparent to-transparent p-6 text-center relative overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,122,26,0.18), 0 24px 60px rgba(255,122,26,0.14)' }}
        >
          {/* Ambient glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-vinyl-orange/15 blur-3xl rounded-full pointer-events-none" />

          {/* Musical note decorations */}
          <div className="absolute top-3 right-5 text-vinyl-orange/20 text-2xl select-none">♪</div>
          <div className="absolute bottom-4 left-4 text-vinyl-orange/15 text-xl select-none">♫</div>

          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-vinyl-orange/15 border border-vinyl-orange/35 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,122,26,0.25)]">
              <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '3rem' }}>headphones</span>
            </div>
            <h2 className="mt-4 text-2xl font-black text-white leading-tight">Anfitrión jugador</h2>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed max-w-xs mx-auto">
              Crea la sala, comparte el PIN con tus amigos y juega en la misma partida.
            </p>
            <div className="mt-5">
              <NeonButton primary color="vinyl-orange" onClick={() => navigate('/host/sync')}>
                Crear sala
              </NeonButton>
            </div>
          </div>
        </motion.article>

        {/* Guest card */}
        <motion.article
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="rounded-[2rem] border border-electric-purple/45 bg-gradient-to-br from-electric-purple/10 via-transparent to-transparent p-6 text-center relative overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(168,85,247,0.18), 0 24px 60px rgba(168,85,247,0.12)' }}
        >
          {/* Ambient glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-electric-purple/12 blur-3xl rounded-full pointer-events-none" />

          <div className="absolute top-3 right-5 text-electric-purple/20 text-2xl select-none">♬</div>
          <div className="absolute bottom-4 left-4 text-electric-purple/15 text-xl select-none">♩</div>

          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-electric-purple/12 border border-electric-purple/35 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(168,85,247,0.22)]">
              <span className="material-symbols-outlined text-electric-purple" style={{ fontSize: '3rem' }}>person_add</span>
            </div>
            <h2 className="mt-4 text-2xl font-black text-white leading-tight">Invitado</h2>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed max-w-xs mx-auto">
              Entra con el PIN de 4 dígitos o escanea el QR del anfitrión.
            </p>
            <div className="mt-5">
              <NeonButton onClick={() => navigate('/guest/join')}>
                Unirme a sala
              </NeonButton>
            </div>
          </div>
        </motion.article>
      </section>
    </motion.main>
  );
}

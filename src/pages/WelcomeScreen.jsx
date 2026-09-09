import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import FontSizeControl from '../components/FontSizeControl';
import { useBgMusic } from '../hooks/useBgMusic';

const EQ_BARS = [0.4, 0.7, 0.55, 0.9, 0.45, 0.8, 0.6, 0.35, 0.75, 0.5];

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const { paused: bgPaused, toggle: toggleBg } = useBgMusic();
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="app-screen relative z-10 flex flex-col items-center justify-start overflow-y-auto py-6 sm:justify-center md:px-10 md:py-12 lg:px-20"
    >
      {/* Siempre visible desde la primera pantalla — antes el tamaño de
          letra solo se podía cambiar desde el menú de perfil, que no
          aparece hasta estar dentro de una sala. Ahora es solo un ícono
          discreto (sin caja propia) que despliega las opciones al tocarlo. */}
      <div
        className="fixed right-3 z-20"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <FontSizeControl />
      </div>

      <div className="app-shell-wide flex flex-col items-center gap-4 md:flex-row md:gap-14 lg:gap-20">

        {/* Vinyl + EQ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3 shrink-0"
        >
          {/* Single vinyl — clickable to pause/resume background music */}
          <div
            role="button"
            tabIndex={0}
            onClick={toggleBg}
            onKeyDown={(e) => e.key === 'Enter' && toggleBg()}
            aria-label={bgPaused ? 'Reproducir cancion de Dedicalo' : 'Pausar cancion de Dedicalo'}
            className="relative cursor-pointer"
            style={{
              width: 'min(clamp(132px, 28svh, 340px), calc(100vw - 72px))',
              aspectRatio: '1',
            }}
          >
            {/* Pulse rings */}
            {[0, 0.9, 1.8].map((delay) => (
              <div
                key={delay}
                className="absolute inset-[-18%] rounded-full border border-vinyl-orange/18 ring-expand-anim"
                style={{ animationDelay: `${delay}s`, animationDuration: '3.5s' }}
              />
            ))}

            {/* Ambient glow */}
            <div className="absolute -inset-10 rounded-full bg-vinyl-orange/18 blur-3xl pointer-events-none" />
            <div className="absolute -inset-12 rounded-full bg-electric-purple/10 blur-[70px] pointer-events-none" />

            {/* Spinning disc — conic arc makes rotation clearly visible */}
            <motion.div
              animate={bgPaused ? { rotate: 0 } : { rotate: 360 }}
              transition={bgPaused ? { duration: 0.2 } : { repeat: Infinity, duration: 5, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                background: [
                  'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.10) 7%, rgba(255,255,255,0.03) 12%, transparent 20%)',
                  'repeating-radial-gradient(circle, #0b0b0b 0px, #0b0b0b 2px, #191919 3px, #191919 5px, #0b0b0b 6px, #0b0b0b 9px)',
                ].join(', '),
                boxShadow: '0 0 0 2px rgba(255,255,255,0.07), 0 20px 70px rgba(0,0,0,0.85)',
              }}
            />

            {/* Static logo label in center */}
            <div
              className="absolute rounded-full bg-white overflow-hidden flex items-center justify-center"
              style={{
                inset: '12%',
                boxShadow: '0 0 0 6px rgba(0,0,0,0.62), 0 0 0 9px rgba(255,122,26,0.28), 0 0 48px rgba(255,122,26,0.58)',
              }}
            >
              <img
                src="/images/logo-main.png"
                alt="Dedícalo"
                className="w-[92%] h-[92%] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)]"
                draggable={false}
              />
            </div>

            {/* Pause overlay — visible when bg music is paused */}
            {bgPaused && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-white/90" style={{ fontSize: '3rem' }}>play_arrow</span>
                  <span className="font-label-caps text-[0.529rem] tracking-[0.18em] text-white/80">TOCA PARA SONAR</span>
                </div>
              </div>
            )}
          </div>

          {/* Mini EQ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`flex items-end gap-[3px] h-5 md:h-7 ${bgPaused ? 'opacity-35' : 'opacity-100'}`}
          >
            {EQ_BARS.map((h, i) => (
              <div
                key={i}
                className="w-[5px] rounded-full eq-bar"
                style={{
                  height: `${h * 100}%`,
                  background: i % 3 === 0 ? '#ff7a1a' : i % 3 === 1 ? '#a855f7' : '#3f78ff',
                  opacity: 0.6,
                  animationDelay: `${i * 0.09}s`,
                  animationDuration: `${0.6 + (i % 4) * 0.18}s`,
                }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Text + CTAs */}
        <div className="flex flex-col items-center md:items-start gap-3 md:gap-5 text-center md:text-left">

          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[0.588rem] font-bold uppercase tracking-[0.3em] text-vinyl-orange"
          >
            Party Game Musical
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="max-w-[21rem] space-y-2 md:max-w-md lg:max-w-lg"
          >
            <h1 className="heading-impact font-black uppercase text-white">
              Junta a tu gente y que{' '}
              <span className="text-animated-gradient">suene la fiesta</span>
            </h1>
            <p className="copy-readable text-on-surface-variant">
              Suena una canción, ustedes adivinan el año y arman su ruta musical en Años Locos. Se entiende en una ronda, se disfruta toda la noche.
            </p>
          </motion.div>

          {/* Desktop-only stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="hidden md:flex items-center gap-8"
          >
            {[
              ['6-20', 'canciones por partida'],
              ['+5', 'pts por acierto'],
              ['-3', 'pts por fallo'],
            ].map(([val, label]) => (
              <div key={label}>
                <p className="font-stats-xl text-2xl text-vinyl-orange font-black leading-none">{val}</p>
                <p className="font-label-caps text-[0.588rem] text-on-surface-variant mt-1">{label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex w-full max-w-xs flex-col gap-2"
          >
            <NeonButton primary color="vinyl-orange" onClick={() => navigate('/role-selection')}>
              Entrar a jugar
            </NeonButton>
            <button
              type="button"
              onClick={() => navigate('/how-to-play')}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-white/80 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-white/8 hover:border-white/20 active:scale-95 transition-all"
            >
              Cómo se juega
            </button>
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                className="min-h-touch rounded-2xl border border-electric-purple/30 bg-electric-purple/8 text-electric-purple/80 text-xs font-semibold uppercase tracking-[0.18em] flex items-center justify-center gap-2 hover:bg-electric-purple/15 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Instalar app
              </button>
            )}
          </motion.div>

          {/* Pie legal. Va en la portada porque es la única pantalla por la
              que pasa todo el mundo, y porque una política de privacidad que
              no se encuentra desde ningún sitio no cumple nada. */}
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[['/legal/privacidad', 'Privacidad'],
              ['/legal/cookies', 'Cookies'],
              ['/legal/terminos', 'Condiciones'],
              ['/legal/aviso-legal', 'Aviso legal']].map(([ruta, texto]) => (
              <button
                key={ruta}
                type="button"
                onClick={() => navigate(ruta)}
                className="py-2 text-[0.7rem] uppercase tracking-[0.14em] text-white/35 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
              >
                {texto}
              </button>
            ))}
          </nav>
        </div>

      </div>
    </motion.main>
  );
}

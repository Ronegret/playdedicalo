import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';

const EQ_BARS = [0.4, 0.7, 0.55, 0.9, 0.45, 0.8, 0.6, 0.35, 0.75, 0.5];

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 w-full h-screen md:min-h-screen md:h-auto overflow-hidden md:overflow-visible flex items-center justify-center px-5 md:px-10 lg:px-20 py-0 md:py-16"
    >
      <div className="w-full max-w-[430px] md:max-w-5xl lg:max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-16 lg:gap-24">

        {/* ── Vinyl + EQ ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3 shrink-0"
        >
          {/* Single vinyl — size formula: responsive on mobile, large on desktop */}
          <div
            className="relative"
            style={{
              /* Mobile: min(34vh, screen-minus-padding). Desktop: up to 360px via vh */
              width: 'min(clamp(150px, 34vh, 360px), calc(100vw - 80px))',
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
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
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
                inset: '18%',
                boxShadow: '0 0 0 4px rgba(0,0,0,0.55), 0 0 36px rgba(255,122,26,0.45)',
              }}
            >
              <img
                src="/images/logo-main.png"
                alt="Dedícalo"
                className="w-[78%] h-[78%] object-contain"
                draggable={false}
              />
            </div>

            {/* Spindle hole */}
            <div className="absolute rounded-full bg-black" style={{ inset: '47.5%' }} />
          </div>

          {/* Mini EQ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-end gap-[3px] h-5 md:h-7"
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

        {/* ── Text + CTAs ── */}
        <div className="flex flex-col items-center md:items-start gap-3 md:gap-5 text-center md:text-left">

          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-vinyl-orange"
          >
            Party Game Musical
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="space-y-2 max-w-xs md:max-w-md lg:max-w-lg"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight uppercase tracking-tight">
              La música como nunca{' '}
              <span className="text-animated-gradient">la habías jugado</span>
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
              Adivina canciones, sabotea a tus amigos y gana llegando primero a la meta.
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
              ['3', 'modos de juego'],
              ['4', 'sabotajes'],
              ['+5', 'por acierto'],
            ].map(([val, label]) => (
              <div key={label}>
                <p className="font-stats-xl text-2xl text-vinyl-orange font-black leading-none">{val}</p>
                <p className="font-label-caps text-[10px] text-on-surface-variant mt-1">{label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="w-full max-w-xs flex flex-col gap-2"
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
          </motion.div>
        </div>

      </div>
    </motion.main>
  );
}

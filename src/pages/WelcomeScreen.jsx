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
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center px-5 py-10 gap-6 text-center overflow-hidden"
    >
      {/* Label */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-[10px] font-bold uppercase tracking-[0.3em] text-vinyl-orange"
      >
        Party Game Musical
      </motion.p>

      {/* Vinyl Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ width: 'min(300px, calc(100vw - 40px))', aspectRatio: '1' }}
      >
        {/* Outer pulse rings */}
        {[0, 0.8, 1.6].map((delay) => (
          <div
            key={delay}
            className="absolute inset-[-18%] rounded-full border border-vinyl-orange/18 ring-expand-anim"
            style={{ animationDelay: `${delay}s`, animationDuration: '3.5s' }}
          />
        ))}

        {/* Ambient glow */}
        <div className="absolute -inset-8 rounded-full bg-vinyl-orange/15 blur-3xl pointer-events-none" />
        <div className="absolute -inset-10 rounded-full bg-electric-purple/8 blur-[70px] pointer-events-none" />

        {/* Spinning disc */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `repeating-radial-gradient(
              circle,
              #0b0b0b 0px, #0b0b0b 2px,
              #191919 3px, #191919 5px,
              #0b0b0b 6px, #0b0b0b 9px
            )`,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 20px 70px rgba(0,0,0,0.85)',
          }}
        />

        {/* Highlight sheen on disc */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'conic-gradient(from 200deg, transparent 0deg, rgba(255,255,255,0.04) 30deg, transparent 60deg)',
          }}
        />

        {/* Logo label — static */}
        <div
          className="absolute rounded-full bg-white overflow-hidden flex items-center justify-center"
          style={{
            inset: '18%',
            boxShadow: '0 0 0 4px rgba(0,0,0,0.5), 0 0 32px rgba(255,122,26,0.4)',
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
      </motion.div>

      {/* Mini equalizer below vinyl */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-end gap-[3px] h-8"
      >
        {EQ_BARS.map((h, i) => (
          <div
            key={i}
            className="w-[5px] rounded-full eq-bar"
            style={{
              height: `${h * 100}%`,
              background: i % 3 === 0 ? '#ff7a1a' : i % 3 === 1 ? '#a855f7' : '#3f78ff',
              opacity: 0.55,
              animationDelay: `${i * 0.09}s`,
              animationDuration: `${0.6 + (i % 4) * 0.18}s`,
            }}
          />
        ))}
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.65 }}
        className="space-y-2 max-w-xs"
      >
        <h1 className="text-3xl sm:text-[1.9rem] font-black text-white leading-tight uppercase tracking-tight">
          La música como nunca{' '}
          <span className="text-animated-gradient">la habías jugado</span>
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Adivina canciones, sabotea a tus amigos y gana llegando primero a la meta.
        </p>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="w-full flex flex-col gap-3"
      >
        <NeonButton primary color="vinyl-orange" onClick={() => navigate('/how-to-play')}>
          Cómo se juega
        </NeonButton>
        <button
          type="button"
          onClick={() => navigate('/role-selection')}
          className="h-14 rounded-2xl border border-white/10 bg-white/[0.04] text-white/80 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-white/8 hover:border-white/20 active:scale-95 transition-all"
        >
          Ya sé jugar — Entrar
        </button>
      </motion.div>
    </motion.main>
  );
}

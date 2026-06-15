import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import { SABOTAGE_OPTIONS, TIMELINE_GOAL_YEARS, VICTORY_MODES } from '../store/useGameStore';

const STEPS = [
  { icon: 'groups', color: '#ff7a1a', title: 'Entran todos', text: 'El anfitrión crea la sala y comparte el PIN. Él también juega.' },
  { icon: 'album', color: '#a855f7', title: 'Suena la música', text: 'La playlist está oculta. Nadie sabe qué canción está sonando.' },
  { icon: 'content_cut', color: '#ff6b8b', title: 'Para la música', text: 'El anfitrión decide cuándo parar y aparece la pregunta.' },
  { icon: 'touch_app', color: '#3f78ff', title: 'Todos responden', text: 'Cada jugador vota antes de que se revele el resultado.' },
  { icon: 'emoji_events', color: '#39ff14', title: 'Gana el primero', text: 'Llega a la meta de puntos o de años antes que los demás.' }
];

const MODES = [
  {
    id: 'pulse',
    icon: 'flash_on',
    color: '#ff7a1a',
    title: 'PULSO',
    subtitle: 'Responde rápido',
    body: 'Suena un fragmento, el anfitrión corta y todos responden una pregunta sobre la canción. Elige una meta de puntos.'
  },
  {
    id: 'timeline',
    icon: 'timeline',
    color: '#a855f7',
    title: 'LÍNEA',
    subtitle: `${TIMELINE_GOAL_YEARS} años primero`,
    body: `Cada jugador tiene su propia línea del tiempo. Gana quien la complete con ${TIMELINE_GOAL_YEARS} años antes que los demás.`
  },
  {
    id: 'remix',
    icon: 'auto_awesome',
    color: '#39ff14',
    title: 'REMIX',
    subtitle: 'Puntos + ataques',
    body: 'Como Pulso pero mientras suena la música puedes gastar puntos para sabotear a otros jugadores.'
  }
];

const SABOTAGE_STYLES = {
  red: { border: 'border-intense-red/50', bg: 'bg-intense-red/10', text: 'text-intense-red' },
  green: { border: 'border-neon-green/45', bg: 'bg-neon-green/10', text: 'text-neon-green' },
  purple: { border: 'border-electric-purple/60', bg: 'bg-electric-purple/12', text: 'text-electric-purple' }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 18 } }
};

export default function HowToPlayScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="relative z-10 w-full max-w-2xl mx-auto min-h-screen px-margin-mobile pt-20 pb-12"
    >
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-white/8 flex items-center px-margin-mobile">
        <button
          onClick={() => navigate('/')}
          className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
      </header>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col items-center gap-4 text-center pt-2"
      >
        <div className="relative" style={{ width: 108, height: 108 }}>
          {[0, 1.3].map((delay) => (
            <div
              key={delay}
              className="absolute inset-[-22%] rounded-full border border-vinyl-orange/18 ring-expand-anim"
              style={{ animationDelay: `${delay}s`, animationDuration: '3.6s' }}
            />
          ))}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'repeating-radial-gradient(circle, #0b0b0b 0px, #0b0b0b 2px, #1a1a1a 3px, #1a1a1a 5px, #0b0b0b 6px, #0b0b0b 9px)',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.7)'
            }}
          />
          <div
            className="absolute rounded-full bg-white overflow-hidden flex items-center justify-center"
            style={{ inset: '22%', boxShadow: '0 0 0 2px rgba(0,0,0,0.5), 0 0 16px rgba(255,122,26,0.3)' }}
          >
            <img src="/images/logo-main.png" alt="Dedícalo" className="w-[76%] h-[76%] object-contain" draggable={false} />
          </div>
          <div className="absolute rounded-full bg-black" style={{ inset: '47%' }} />
        </div>

        <div>
          <p className="font-label-caps text-neon-green text-xs tracking-[0.22em]">GUÍA RÁPIDA</p>
          <h1 className="mt-2 font-headline-lg text-4xl sm:text-5xl text-white font-black leading-tight">Así se juega</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant max-w-xs mx-auto">
            Música, pausa, respuesta y puntos. El primero en llegar a la meta gana.
          </p>
        </div>
      </motion.section>

      {/* Scoring callout */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 130 }}
        className="mt-7 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5"
      >
        <p className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.22em] text-center mb-4">PUNTOS POR RONDA</p>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 rounded-xl border border-neon-green/35 bg-neon-green/10 p-4 text-center">
            <motion.p
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="font-stats-xl text-4xl text-neon-green font-black leading-none"
            >
              +5
            </motion.p>
            <p className="font-label-caps text-[10px] text-neon-green/70 mt-2">POR ACIERTO</p>
          </div>
          <div className="flex-1 rounded-xl border border-intense-red/35 bg-intense-red/10 p-4 text-center">
            <motion.p
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: 0.6, ease: 'easeInOut' }}
              className="font-stats-xl text-4xl text-intense-red font-black leading-none"
            >
              -3
            </motion.p>
            <p className="font-label-caps text-[10px] text-intense-red/70 mt-2">POR FALLO</p>
          </div>
          <div className="flex-1 rounded-xl border border-electric-purple/30 bg-electric-purple/10 p-4 text-center">
            <p className="font-stats-xl text-4xl text-white font-black leading-none">10</p>
            <p className="font-label-caps text-[10px] text-on-surface-variant mt-2">DE INICIO</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant text-center leading-relaxed">
          Los sabotajes pueden modificar puntos ganados o protegerte de los ataques.
        </p>
      </motion.section>

      {/* Steps */}
      <section className="mt-8">
        <p className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.22em] text-center mb-4">CÓMO FUNCIONA</p>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {STEPS.map((step, index) => (
            <motion.article
              key={step.title}
              variants={fadeUp}
              whileHover={{ scale: 1.02, x: 5 }}
              className="rounded-2xl border border-white/10 bg-surface-container/60 p-4 flex items-center gap-4 relative overflow-hidden"
            >
              <div
                className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none select-none flex items-center justify-end pr-4"
                style={{ background: `linear-gradient(to right, transparent, ${step.color}06)` }}
              >
                <span className="font-black text-white opacity-[0.06]" style={{ fontSize: '5rem', lineHeight: 1 }}>{index + 1}</span>
              </div>
              <div
                className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${step.color}1A`, border: `1.5px solid ${step.color}40` }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '2.2rem', color: step.color }}>{step.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-label-caps text-[10px]" style={{ color: step.color }}>PASO {index + 1}</span>
                <h2 className="text-white font-black text-base leading-tight">{step.title}</h2>
                <p className="mt-1 text-xs text-on-surface-variant leading-snug">{step.text}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* Modes */}
      <section className="mt-8">
        <p className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.22em] text-center mb-4">MODOS DE JUEGO</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((mode, index) => (
            <motion.article
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.1, type: 'spring', stiffness: 130 }}
              whileHover={{ scale: 1.04, y: -4 }}
              className="rounded-2xl border border-white/10 bg-surface-container/60 p-5 text-center"
              style={{ borderColor: `${mode.color}20` }}
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                style={{ backgroundColor: `${mode.color}1A`, border: `1.5px solid ${mode.color}45` }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: mode.color }}>{mode.icon}</span>
              </div>
              <h3 className="mt-3 font-headline-lg text-xl text-white font-black">{mode.title}</h3>
              <p className="font-label-caps text-[10px] mt-0.5" style={{ color: mode.color }}>{mode.subtitle}</p>
              <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">{mode.body}</p>
            </motion.article>
          ))}
        </div>

        {/* Victory targets */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <p className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.22em] text-center mb-3">METAS · PULSO & REMIX</p>
          <div className="grid grid-cols-3 gap-2">
            {VICTORY_MODES.map((mode, index) => (
              <div
                key={mode.targetScore}
                className={`rounded-xl border p-3 text-center transition-all ${index === 1 ? 'border-neon-green/40 bg-neon-green/10' : 'border-white/10 bg-white/5'}`}
              >
                <p className="font-stats-xl text-2xl text-white font-black">{mode.targetScore}</p>
                <p className="font-label-caps text-[9px] text-on-surface-variant mt-1">{mode.short.toUpperCase()}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-on-surface-variant text-center">
            En Línea la meta son siempre <span className="text-electric-purple font-bold">{TIMELINE_GOAL_YEARS} años</span> completados.
          </p>
        </motion.div>
      </section>

      {/* Sabotages */}
      <section className="mt-8">
        <p className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.22em] text-center mb-1">SABOTAJES</p>
        <p className="text-xs text-on-surface-variant text-center mb-4">Disponibles desde la ronda 2 mientras suena la música.</p>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3"
        >
          {SABOTAGE_OPTIONS.map((option) => {
            const s = SABOTAGE_STYLES[option.color] || SABOTAGE_STYLES.purple;
            return (
              <motion.div
                key={option.id}
                variants={fadeUp}
                whileHover={{ scale: 1.04 }}
                className={`rounded-2xl border ${s.border} ${s.bg} p-4`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                    <span className={`material-symbols-outlined text-2xl ${s.text}`}>{option.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm leading-tight">{option.name}</h3>
                    <p className={`font-label-caps text-[10px] ${s.text}`}>{option.cost} pts</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-snug">{option.effect}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        className="mt-10"
      >
        <NeonButton primary color="electric-purple" onClick={() => navigate('/role-selection')}>
          Elegir mi rol
        </NeonButton>
      </motion.div>
    </motion.main>
  );
}

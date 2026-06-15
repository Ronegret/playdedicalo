import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import { SABOTAGE_OPTIONS, TIMELINE_GOAL_YEARS, VICTORY_MODES } from '../store/useGameStore';

const STEPS = [
  { icon: 'groups', title: 'Entran todos', text: 'El anfitrión crea la sala, comparte el PIN y también juega.' },
  { icon: 'album', title: 'Suena la música', text: 'La playlist se mantiene oculta mientras la canción está sonando.' },
  { icon: 'offline_bolt', title: 'Corte sorpresa', text: 'El anfitrión corta la música y aparece el reto.' },
  { icon: 'touch_app', title: 'Responden rápido', text: 'Cada jugador actúa a tiempo y la ronda sigue.' },
  { icon: 'emoji_events', title: 'Suma y gana', text: 'Gana quien llegue primero a la meta de la partida.' }
];

const MODES = [
  {
    id: 'pulse',
    icon: 'flash_on',
    title: 'Pulso',
    subtitle: 'Puntos',
    body: 'Suena un corte y se responde rápido. La meta de puntos se elige en 40, 70 o 100.',
    visual: (
      <div className="grid gap-2">
        {['40', '70', '100'].map((score, index) => (
          <div
            key={score}
            className={`rounded-xl border px-3 py-3 text-sm font-black ${
              index === 1
                ? 'border-neon-green bg-neon-green/12 text-white'
                : 'border-white/10 bg-white/5 text-white'
            }`}
          >
            META {score}
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'timeline',
    icon: 'timeline',
    title: 'Línea',
    subtitle: 'Años',
    body: `Cada jugador empieza con un año base distinto y completa una línea de ${TIMELINE_GOAL_YEARS} años.`,
    visual: (
      <div className="grid grid-cols-5 gap-1">
        {['1990', '1998', '2004', '2011', 'META'].map((item) => (
          <div
            key={item}
            className={`h-12 min-w-0 rounded-xl border flex items-center justify-center px-1 text-center font-black ${
              item === 'META'
                ? 'border-dashed border-vinyl-orange/55 bg-vinyl-orange/10 text-vinyl-orange text-[8px]'
                : 'border-white/10 bg-white/10 text-white text-sm'
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'remix',
    icon: 'auto_awesome',
    title: 'Remix',
    subtitle: 'Ataques',
    body: 'Mientras suena la música puedes gastar puntos para preparar sabotajes y cambiar la ronda.',
    visual: (
      <div className="grid grid-cols-4 gap-2">
        {SABOTAGE_OPTIONS.map((option) => (
          <div
            key={option.id}
            className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 ${
              option.color === 'red'
                ? 'border-intense-red/60 bg-intense-red/10 text-intense-red'
                : option.color === 'green'
                  ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
                  : 'border-electric-purple/60 bg-electric-purple/15 text-electric-purple'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{option.icon}</span>
            <span className="text-[9px] font-label-caps">{option.cost} pts</span>
          </div>
        ))}
      </div>
    )
  }
];

function GuideSection({ icon, title, subtitle, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="group rounded-[1.5rem] border border-white/10 bg-surface-container/60 overflow-hidden">
      <summary className="list-none cursor-pointer p-4 flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-vinyl-orange/70">
        <span className="w-10 h-10 rounded-2xl bg-vinyl-orange/12 text-vinyl-orange flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">{icon}</span>
        </span>
        <div className="min-w-0 flex-1 text-left">
          <h2 className="text-white font-black leading-tight">{title}</h2>
          <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
      </summary>
      <div className="px-4 pb-4 text-left">
        {children}
      </div>
    </details>
  );
}

function ScoreGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-[1.4rem] border border-neon-green/40 bg-neon-green/8 p-4 text-center">
        <p className="font-label-caps text-neon-green text-[10px] tracking-[0.22em]">PULSO / REMIX</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {VICTORY_MODES.map((mode) => (
            <div key={mode.targetScore} className="rounded-xl bg-black/18 border border-white/10 p-3">
              <span className="block text-2xl text-vinyl-orange font-black">{mode.targetScore}</span>
              <span className="text-[10px] text-on-surface-variant">puntos</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-electric-purple/45 bg-electric-purple/10 p-4 text-center">
        <p className="font-label-caps text-electric-purple text-[10px] tracking-[0.22em]">LÍNEA</p>
        <div className="mt-3 rounded-xl bg-black/18 border border-white/10 p-4">
          <span className="block text-4xl text-vinyl-orange font-black">{TIMELINE_GOAL_YEARS}</span>
          <span className="text-xs text-on-surface-variant">años para completar la línea</span>
        </div>
      </div>
    </div>
  );
}

export default function HowToPlayScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="relative z-10 w-full max-w-4xl mx-auto min-h-screen px-margin-mobile pt-20 pb-10 text-center"
    >
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-white/8 flex items-center px-margin-mobile">
        <button
          onClick={() => navigate('/')}
          className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          VOLVER
        </button>
      </header>

      <section className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(255,122,26,0.3),0_0_0_2px_rgba(255,122,26,0.2)]">
          <img
            src="/images/icon-app.png"
            alt="Dedícalo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <p className="font-label-caps text-neon-green text-xs tracking-[0.22em]">GUÍA RÁPIDA</p>
          <h1 className="mt-2 font-headline-lg text-4xl text-white font-black leading-tight">Así se juega</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant max-w-xl mx-auto">
            Suena una canción, el anfitrión corta, todos responden y la partida continúa ronda tras ronda hasta que alguien llega a la meta.
          </p>
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <motion.article
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-[1.4rem] border border-white/10 bg-surface-container/55 p-4 text-center"
          >
            <span className="material-symbols-outlined text-vinyl-orange text-3xl">{step.icon}</span>
            <h2 className="mt-3 text-white font-black leading-tight">{step.title}</h2>
            <p className="mt-1 text-xs text-on-surface-variant leading-snug">{step.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="mt-7 grid gap-3">
        <GuideSection icon="play_circle" title="La ronda" subtitle="Lo básico para jugar sin leer mucho" defaultOpen>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-vinyl-orange/35 bg-vinyl-orange/10 p-4 text-center">
              <p className="font-label-caps text-vinyl-orange text-[10px] tracking-[0.22em]">1. ESCUCHA</p>
              <p className="mt-2 text-sm text-white">Suena la playlist elegida. Nadie ve el título.</p>
            </div>
            <div className="rounded-xl border border-intense-red/35 bg-intense-red/10 p-4 text-center">
              <p className="font-label-caps text-intense-red text-[10px] tracking-[0.22em]">2. CORTE</p>
              <p className="mt-2 text-sm text-white">El anfitrión pulsa corte y aparece el reto.</p>
            </div>
            <div className="rounded-xl border border-electric-purple/50 bg-electric-purple/14 p-4 text-center">
              <p className="font-label-caps text-electric-purple text-[10px] tracking-[0.22em]">3. RESPONDE</p>
              <p className="mt-2 text-sm text-white">Todos votan. El anfitrión también juega.</p>
            </div>
          </div>
        </GuideSection>

        <GuideSection icon="sports_esports" title="Tipos de juego" subtitle="Cada modo se juega distinto">
          <div className="grid gap-3 md:grid-cols-3">
            {MODES.map((mode) => (
              <article key={mode.id} className="rounded-[1.4rem] border border-white/10 bg-surface-container/55 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-vinyl-orange">{mode.icon}</span>
                  <div>
                    <h3 className="text-white font-black leading-tight">{mode.title}</h3>
                    <p className="text-[10px] font-label-caps text-electric-purple tracking-[0.18em]">{mode.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant leading-relaxed">{mode.body}</p>
                <div className="mt-4">{mode.visual}</div>
              </article>
            ))}
          </div>
        </GuideSection>

        <GuideSection icon="emoji_events" title="Metas" subtitle="Pulso y Remix usan puntos; Línea usa años">
          <ScoreGrid />
          <p className="mt-3 text-sm text-on-surface-variant leading-relaxed text-center">
            En Pulso y Remix gana quien llegue primero a la meta de puntos. En Línea gana quien complete primero {TIMELINE_GOAL_YEARS} años en su propia línea.
          </p>
        </GuideSection>

        <GuideSection icon="auto_awesome" title="Sabotajes" subtitle="Ataques durante la música">
          <p className="text-sm text-on-surface-variant leading-relaxed text-center">
            Desde la ronda 2 puedes gastar puntos mientras la canción está sonando. Los ataques preparan efectos para el corte.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SABOTAGE_OPTIONS.map((option) => (
              <div
                key={option.id}
                className={`rounded-[1.4rem] border p-4 text-center ${
                  option.color === 'red'
                    ? 'border-intense-red/50 bg-intense-red/10'
                    : option.color === 'green'
                      ? 'border-neon-green/45 bg-neon-green/10'
                      : 'border-electric-purple/60 bg-electric-purple/14'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-black/18 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">{option.icon}</span>
                  </span>
                  <div className="text-left">
                    <h3 className="text-white font-black">{option.name}</h3>
                    <p className="font-label-caps text-[10px] text-vinyl-orange tracking-[0.18em]">{option.cost} puntos</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant leading-relaxed">{option.effect}</p>
              </div>
            ))}
          </div>
        </GuideSection>
      </section>

      <div className="mt-8">
        <NeonButton primary={true} onClick={() => navigate('/role-selection')}>
          Elegir mi rol
        </NeonButton>
      </div>
    </motion.main>
  );
}

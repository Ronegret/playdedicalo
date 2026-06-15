import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import { SABOTAGE_OPTIONS } from '../store/useGameStore';

const STEPS = [
  { icon: 'groups', title: 'Entran todos', text: 'El anfitrión crea la sala, comparte el PIN y también juega.' },
  { icon: 'album', title: 'Suena la música', text: 'La playlist se mantiene oculta mientras la canción está sonando.' },
  { icon: 'offline_bolt', title: 'Corte sorpresa', text: 'El anfitrión corta la música y aparece el reto.' },
  { icon: 'touch_app', title: 'Responden rápido', text: 'Cada jugador elige o coloca la canción en su línea de tiempo.' },
  { icon: 'emoji_events', title: 'Sube el ranking', text: 'Gana quien llegue primero a la meta elegida.' }
];

const MODES = [
  {
    id: 'pulse',
    icon: 'flash_on',
    title: 'Pulso',
    subtitle: 'Pregunta rápida',
    body: 'Escuchas un fragmento y respondes algo simple: artista, palabra, título, energía o contexto.',
    visual: (
      <div className="grid gap-2">
        {['A  NOCHE', 'B  CORAZÓN', 'C  DEDÍCALO'].map((answer, index) => (
          <div key={answer} className={`rounded-xl border px-3 py-3 text-sm font-bold ${index === 2 ? 'border-vinyl-orange bg-vinyl-orange/12 text-white' : 'border-white/10 bg-white/5 text-white'}`}>
            {answer}
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'timeline',
    icon: 'timeline',
    title: 'Línea',
    subtitle: 'Ordena por años',
    body: 'Cada jugador crea su propia línea de años. Los demás pueden verla y la partida sigue hasta completar la meta.',
    visual: (
      <div className="grid grid-cols-5 gap-1">
        {['ANTES', '1998', 'ENTRE', '2006', 'DESPUÉS'].map((item) => (
          <div key={item} className={`h-12 min-w-0 rounded-xl border flex items-center justify-center px-1 text-center font-black ${/^\d/.test(item) ? 'border-white/10 bg-white/10 text-white text-sm' : 'border-dashed border-vinyl-orange/55 bg-vinyl-orange/10 text-vinyl-orange text-[8px]'}`}>
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
    subtitle: 'Ataques y jugadas',
    body: 'Mientras suena la música puedes gastar puntos para preparar sabotajes. Se ven como cuadrados de colores.',
    visual: (
      <div className="grid grid-cols-4 gap-2">
        {SABOTAGE_OPTIONS.map((option) => (
          <div
            key={option.id}
            className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 ${
              option.color === 'red'
                ? 'border-intense-red/60 bg-intense-red/10 text-intense-red'
                : option.color === 'green'
                  ? 'border-vinyl-orange/50 bg-vinyl-orange/10 text-vinyl-orange'
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

      <section className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="justify-self-center sm:justify-self-start w-full max-w-[220px] rounded-[1.75rem] border border-white/10 bg-surface-container-lowest/60 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
          <img
            src="/images/hero-how-to-play.png"
            alt="Cómo se juega"
            className="w-full h-auto rounded-[1.25rem] object-cover"
          />
        </div>
        <div className="text-center">
          <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">GUÍA RÁPIDA</p>
          <h1 className="mt-2 font-headline-lg text-4xl text-white font-black leading-tight">Así se juega</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant max-w-xl mx-auto">
            Se escucha una canción, el anfitrión corta la música, todos responden y la partida continúa ronda tras ronda.
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

        <GuideSection icon="sports_esports" title="Tipos de juego" subtitle="Ejemplos de lo que vas a ver">
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

        <GuideSection icon="auto_awesome" title="Sabotajes" subtitle="Ataques durante la música">
          <p className="text-sm text-on-surface-variant leading-relaxed text-center">
            Desde la ronda 2 puedes gastar puntos mientras la canción está sonando. Los ataques preparan efectos para el corte.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SABOTAGE_OPTIONS.map((option) => (
              <div key={option.id} className={`rounded-[1.4rem] border p-4 text-center ${
                option.color === 'red'
                  ? 'border-intense-red/50 bg-intense-red/10'
                  : option.color === 'green'
                    ? 'border-vinyl-orange/45 bg-vinyl-orange/10'
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

        <GuideSection icon="emoji_events" title="Puntos y meta" subtitle="Cómo se gana">
          <div className="grid grid-cols-3 gap-2">
            {[40, 70, 100].map((score) => (
              <div key={score} className="rounded-xl bg-surface-container-lowest/50 border border-white/10 p-4 text-center">
                <span className="block text-3xl text-vinyl-orange font-black">{score}</span>
                <span className="text-[10px] text-on-surface-variant">puntos</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-on-surface-variant leading-relaxed text-center">
            Gana la primera persona que llegue a la meta elegida y quede #1 en el ranking.
          </p>
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

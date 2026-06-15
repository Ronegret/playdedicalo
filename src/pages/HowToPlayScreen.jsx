import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import VinylVisualizer from '../components/VinylVisualizer';
import { SABOTAGE_OPTIONS } from '../store/useGameStore';

const STEPS = [
  { icon: 'groups', title: 'Entran todos', text: 'El anfitrión crea sala, comparte PIN y también juega.' },
  { icon: 'album', title: 'Suena la música', text: 'Nadie ve el nombre de la canción. Solo se escucha.' },
  { icon: 'offline_bolt', title: 'Corte sorpresa', text: 'El anfitrión corta la música y aparece una pregunta.' },
  { icon: 'touch_app', title: 'Responden rápido', text: 'Cada jugador elige una opción o coloca la canción en la línea.' },
  { icon: 'emoji_events', title: 'Sube el ranking', text: 'Gana quien llegue primero a 40, 70 o 100 puntos.' }
];

const MODES = [
  {
    id: 'pulse',
    icon: 'flash_on',
    title: 'Pulso Dedicalo',
    subtitle: 'Pregunta rapida',
    body: 'Escuchas un fragmento y respondes algo simple: artista, palabra, título, energía o contexto.',
    visual: (
      <div className="grid gap-2">
        {['A  NOCHE', 'B  CORAZON', 'C  DEDICALO'].map((answer, index) => (
          <div key={answer} className={`rounded-xl border px-3 py-3 text-sm font-bold ${index === 2 ? 'border-neon-green bg-neon-green/10 text-neon-green' : 'border-white/10 bg-white/5 text-white'}`}>
            {answer}
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'timeline',
    icon: 'timeline',
    title: 'Linea del Ritmo',
    subtitle: 'Ordena por años',
    body: 'No se usan meses. Solo decides si la canción va antes, después o entre años.',
    visual: (
      <div className="grid grid-cols-5 gap-1">
        {['ANTES', '1998', 'ENTRE', '2006', 'DESPUES'].map((item) => (
          <div key={item} className={`h-12 min-w-0 rounded-xl border flex items-center justify-center px-1 text-center font-black ${/^\d/.test(item) ? 'border-white/10 bg-white/10 text-white text-sm' : 'border-dashed border-neon-green/50 bg-neon-green/10 text-neon-green text-[8px]'}`}>
            {item}
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'remix',
    icon: 'auto_awesome',
    title: 'Remix Salvaje',
    subtitle: 'Ataques y jugadas',
    body: 'Mientras suena la música puedes gastar puntos para preparar sabotajes. Se ven como cuadrados de colores.',
    visual: (
      <div className="grid grid-cols-4 gap-2">
        {SABOTAGE_OPTIONS.map((option) => (
          <div key={option.id} className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 ${
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
    <details open={defaultOpen} className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <summary className="list-none cursor-pointer p-4 flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-neon-green/70">
        <span className="w-10 h-10 rounded-xl bg-neon-green/10 text-neon-green flex items-center justify-center shrink-0">
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
      className="relative z-10 w-full max-w-4xl mx-auto min-h-screen px-margin-mobile pt-20 pb-10"
    >
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-surface/85 backdrop-blur-xl border-b border-white/10 flex items-center px-margin-mobile">
        <button onClick={() => navigate('/')} className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs">
          <span className="material-symbols-outlined text-sm">arrow_back</span> VOLVER
        </button>
      </header>

      <section className="grid gap-5 sm:grid-cols-[176px_1fr] sm:items-center">
        <div className="justify-self-start">
          <VinylVisualizer rotating={true} size="compact" />
        </div>
        <div className="text-left">
          <p className="font-label-caps text-neon-green text-xs tracking-widest">GUIA RAPIDA</p>
          <h1 className="mt-2 font-headline-lg text-4xl text-white font-black leading-tight">Cómo se juega Dedícalo</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant max-w-xl">
            Escuchan una canción, el anfitrión corta la música, todos responden y el ranking decide quién gana.
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
            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left"
          >
            <span className="material-symbols-outlined text-neon-green text-3xl">{step.icon}</span>
            <h2 className="mt-3 text-white font-black leading-tight">{step.title}</h2>
            <p className="mt-1 text-xs text-on-surface-variant leading-snug">{step.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="mt-7 grid gap-3">
        <GuideSection icon="play_circle" title="La ronda" subtitle="Lo básico para jugar sin leer mucho" defaultOpen>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-neon-green/40 bg-neon-green/10 p-4">
              <p className="font-label-caps text-neon-green text-[10px]">1. ESCUCHA</p>
              <p className="mt-2 text-sm text-white">Suena la playlist elegida. Nadie ve el título.</p>
            </div>
            <div className="rounded-xl border border-intense-red/40 bg-intense-red/10 p-4">
              <p className="font-label-caps text-intense-red text-[10px]">2. CORTE</p>
              <p className="mt-2 text-sm text-white">El anfitrión pulsa corte y aparece el reto.</p>
            </div>
            <div className="rounded-xl border border-electric-purple/50 bg-electric-purple/15 p-4">
              <p className="font-label-caps text-electric-purple text-[10px]">3. RESPONDE</p>
              <p className="mt-2 text-sm text-white">Todos votan. El anfitrión también juega.</p>
            </div>
          </div>
        </GuideSection>

        <GuideSection icon="sports_esports" title="Tipos de juego" subtitle="Ejemplos de lo que vas a ver">
          <div className="grid gap-3 md:grid-cols-3">
            {MODES.map((mode) => (
              <article key={mode.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-neon-green">{mode.icon}</span>
                  <div>
                    <h3 className="text-white font-black leading-tight">{mode.title}</h3>
                    <p className="text-[10px] font-label-caps text-electric-purple">{mode.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant leading-relaxed">{mode.body}</p>
                <div className="mt-4">{mode.visual}</div>
              </article>
            ))}
          </div>
        </GuideSection>

        <GuideSection icon="auto_awesome" title="Sabotajes" subtitle="Ataques durante la música">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Desde la ronda 2 puedes gastar puntos mientras la canción está sonando. Los ataques preparan efectos para el corte.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SABOTAGE_OPTIONS.map((option) => (
              <div key={option.id} className={`rounded-2xl border p-4 ${
                option.color === 'red'
                  ? 'border-intense-red/50 bg-intense-red/10'
                  : option.color === 'green'
                    ? 'border-neon-green/50 bg-neon-green/10'
                    : 'border-electric-purple/60 bg-electric-purple/15'
              }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-black/25 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">{option.icon}</span>
                  </span>
                  <div>
                    <h3 className="text-white font-black">{option.name}</h3>
                    <p className="font-label-caps text-[10px] text-neon-green">{option.cost} puntos</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant leading-relaxed">{option.effect}</p>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection icon="emoji_events" title="Puntos y meta" subtitle="Como se gana">
          <div className="grid grid-cols-3 gap-2">
            {[40, 70, 100].map((score) => (
              <div key={score} className="rounded-xl bg-black/20 border border-white/10 p-4 text-center">
                <span className="block text-3xl text-neon-green font-black">{score}</span>
                <span className="text-[10px] text-on-surface-variant">puntos</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
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

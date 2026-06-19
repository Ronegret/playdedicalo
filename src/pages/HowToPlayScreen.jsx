import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import { SABOTAGE_OPTIONS, TIMELINE_GOAL_YEARS, VICTORY_MODES } from '../store/useGameStore';

const QUICK_FLOW = [
  { icon: 'person_add', title: '1. Crea o entra', text: 'El anfitrión crea la sala. Los demás entran con PIN o QR.' },
  { icon: 'album', title: '2. Suena la música', text: 'La canción se escucha, pero el título no se muestra.' },
  { icon: 'front_hand', title: '3. Se corta y responden', text: 'El anfitrión para la música y todos votan desde su móvil.' },
  { icon: 'emoji_events', title: '4. Suman y siguen', text: 'La partida continúa hasta que alguien llega a la meta.' },
];

const HOST_STEPS = [
  ['Entra como anfitrión', 'Pulsa “Ya sé jugar” y elige “Anfitrión”.'],
  ['Inicia sesión con Google', 'Esto permite guardar la sala y mantener la partida conectada.'],
  ['Conecta Spotify Premium', 'Solo el anfitrión necesita Spotify Premium. Los invitados no tienen que conectarlo.'],
  ['Elige un estilo musical', 'Selecciona una playlist sugerida: Reggaeton, Hits, Rock Latino, Bailable y más.'],
  ['Prueba el sonido', 'Pulsa el vinilo de prueba. Si suena, ya puedes crear la sala.'],
  ['Comparte el PIN o QR', 'Los jugadores entran desde su móvil. El anfitrión también juega y responde como todos.'],
];

const GUEST_STEPS = [
  ['Elige “Invitado”', 'No necesitas Google ni Spotify. Solo entra a la sala.'],
  ['Escribe el PIN o escanea el QR', 'El anfitrión lo muestra en pantalla al crear la sala.'],
  ['Elige tu nombre e identidad', 'Así todos te reconocen en el ranking.'],
  ['Escucha, vota y espera el resultado', 'Cuando votas, tu pantalla queda lista hasta que el anfitrión revela la ronda.'],
];

const SPOTIFY_STEPS = [
  ['Google primero', 'El anfitrión inicia sesión con Google para preparar la sala.'],
  ['Spotify después', 'Pulsa “Conectar Spotify” e inicia sesión con una cuenta Premium.'],
  ['Prueba antes de crear', 'Toca “Probar sonido”. Si escuchas música, todo está listo.'],
  ['Durante la partida', 'El anfitrión controla cuándo suena y cuándo se pausa. Nadie ve el nombre de la canción.'],
];

const ROUND_FLOW = [
  { icon: 'play_arrow', title: 'Play', text: 'Empieza una canción aleatoria del estilo elegido.' },
  { icon: 'casino', title: 'Ataques', text: 'En Caos DJ puedes usar sabotajes mientras suena la música.' },
  { icon: 'pause', title: 'Pausa', text: 'El anfitrión corta la música y aparece la pregunta.' },
  { icon: 'how_to_vote', title: 'Voto', text: 'Todos responden, incluido el anfitrión.' },
  { icon: 'celebration', title: 'Resultado', text: 'Pantalla verde si aciertas, roja si fallas y lila si recibes sabotaje.' },
];

const POINT_RULES = [
  {
    icon: 'play_circle',
    title: 'Todos parten con 10 pts',
    value: '10',
    label: 'INICIO',
    color: '#ffffff',
    text: 'Así nadie empieza desde cero y los sabotajes tienen valor desde el comienzo.'
  },
  {
    icon: 'check_circle',
    title: 'Respuesta correcta',
    value: '+5',
    label: 'ACIERTO',
    color: '#39ff14',
    text: 'Si respondes bien, subes 5 puntos cuando el anfitrión revela el resultado.'
  },
  {
    icon: 'cancel',
    title: 'Respuesta incorrecta',
    value: '-3',
    label: 'FALLO',
    color: '#ff6b8b',
    text: 'Si fallas, pierdes 3 puntos. Si no respondes, también cuenta como fallo.'
  },
  {
    icon: 'warning',
    title: 'Con La Trampa',
    value: '-6',
    label: 'TRAMPA',
    color: '#ff7a1a',
    text: 'Si tenías una trampa encima y fallas, pierdes 6 puntos en vez de 3.'
  }
];

const POINT_EXAMPLES = [
  ['Laura acierta', '10 + 5', '15 pts'],
  ['Diego falla', '10 - 3', '7 pts'],
  ['Marta acierta, pero estaba bloqueada', '10 + 0', '10 pts'],
  ['Carlos falla con trampa', '10 - 6', '4 pts'],
];

const MODES = [
  {
    icon: 'bolt',
    color: '#ff7a1a',
    title: 'Corte Maestro',
    goal: `Meta de ${VICTORY_MODES.map((mode) => mode.targetScore).join(', ')} puntos`,
    text: 'La canción suena, el anfitrión la corta y todos responden. Rápido, simple y con tensión desde el primer corte.'
  },
  {
    icon: 'timeline',
    color: '#a855f7',
    title: 'Años Locos',
    goal: `${TIMELINE_GOAL_YEARS} años para ganar`,
    text: 'Cada jugador arma su propia ruta musical. Coloca cada canción antes, después o entre los años que ya tengas.'
  },
  {
    icon: 'auto_awesome',
    color: '#39ff14',
    title: 'Caos DJ',
    goal: `Meta de ${VICTORY_MODES.map((mode) => mode.targetScore).join(', ')} puntos`,
    text: 'Como Corte Maestro, pero con sabotajes. Aquí gana quien responde bien y también sabe jugar con estrategia.'
  },
];

const FAQ = [
  ['¿El anfitrión también juega?', 'Sí. El anfitrión controla la música, pero responde y suma puntos igual que todos.'],
  ['¿Todos necesitan Spotify Premium?', 'No. Solo el anfitrión necesita conectar Spotify Premium. Los invitados solo escuchan el sonido del lugar.'],
  ['¿Se ve la canción que está sonando?', 'No. La canción debe permanecer oculta para todos, incluido el anfitrión.'],
  ['¿Cuándo termina la partida?', 'Corte Maestro y Caos DJ terminan cuando alguien llega a la meta de puntos. Años Locos termina cuando alguien completa su ruta de 12 años.'],
  ['¿Puedo cambiar de estilo a mitad de partida?', 'No. El estilo se elige al crear la sala y se mantiene hasta terminar la partida.'],
  ['¿Qué pasa si fallo?', 'Pierdes 3 puntos. Si aciertas, ganas 5 puntos. En Caos DJ algunos sabotajes pueden cambiar el resultado.'],
  ['¿Cuándo gasto puntos en sabotajes?', 'Los puntos se descuentan al usar el sabotaje. Si no tienes suficientes puntos, no puedes activarlo.'],
  ['¿Qué pasa cuando ya voté?', 'Tu pantalla queda esperando. Cuando el anfitrión revela, verás verde, rojo o lila según lo que ocurrió.'],
  ['¿Qué hago si Spotify no suena?', 'Reconecta Spotify, verifica que la cuenta sea Premium, sube el volumen del dispositivo y vuelve a probar sonido antes de crear la sala.'],
];

const SABOTAGE_RULES = [
  ['Cuándo aparecen', 'Desde la ronda 2, mientras la canción todavía está sonando.'],
  ['Quién puede usarlos', 'Cualquier jugador con puntos suficientes, incluido el anfitrión.'],
  ['A quién atacan', 'La mayoría apunta al jugador que va primero. El Escudo te protege a ti.'],
  ['Cuándo se pagan', 'El coste se descuenta en el momento de activar el sabotaje.'],
  ['Qué pasa si hay escudo', 'El escudo absorbe el ataque y se gasta. El atacante igualmente pagó el sabotaje.'],
  ['Qué pasa si llegan varios ataques', 'El juego prioriza el ataque activo de la ronda. Los demás quedan como intención visible para que se entienda quién intentó atacar.'],
];

const SABOTAGE_STYLES = {
  red: { border: 'border-intense-red/45', bg: 'bg-intense-red/10', text: 'text-intense-red' },
  green: { border: 'border-neon-green/40', bg: 'bg-neon-green/10', text: 'text-neon-green' },
  purple: { border: 'border-electric-purple/50', bg: 'bg-electric-purple/10', text: 'text-electric-purple' }
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 18 } }
};

function ManualSection({ icon, title, subtitle, children, defaultOpen = false }) {
  return (
    <motion.details
      variants={fadeUp}
      initial="hidden"
      animate="show"
      open={defaultOpen}
      className="group rounded-2xl border border-white/10 bg-[#071025]/80 backdrop-blur-xl overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
    >
      <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 flex items-center gap-3 text-left">
        <span className="w-11 h-11 rounded-xl bg-vinyl-orange/15 border border-vinyl-orange/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-vinyl-orange text-2xl">{icon}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-white font-black text-base sm:text-lg leading-tight">{title}</span>
          {subtitle && <span className="block mt-1 text-xs text-on-surface-variant leading-snug">{subtitle}</span>}
        </span>
        <span className="material-symbols-outlined chevron text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
      </summary>
      <div className="px-4 pb-5 sm:px-5 border-t border-white/8">
        {children}
      </div>
    </motion.details>
  );
}

function StepList({ items }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map(([title, text], index) => (
        <li key={title} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
          <span className="w-8 h-8 rounded-lg bg-neon-green text-black font-black flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span>
            <span className="block text-sm font-black text-white">{title}</span>
            <span className="block mt-0.5 text-xs leading-relaxed text-on-surface-variant">{text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function HowToPlayScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="relative z-10 w-full min-h-screen px-4 sm:px-6 lg:px-10 pt-safe-header pb-24"
    >
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-white/8 flex items-center px-4 sm:px-6">
        <button
          onClick={() => navigate('/')}
          className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
      </header>

      <div className="max-w-5xl mx-auto">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#071025] min-h-[420px] flex items-end mt-2">
          <img
            src="/images/hero-how-to-play.png"
            alt="Así se juega Dedícalo"
            className="absolute inset-0 w-full h-full object-cover opacity-45"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050814] via-[#050814]/75 to-[#050814]/25" />
          <div className="relative p-5 sm:p-8 lg:p-10 max-w-3xl">
            <p className="font-label-caps text-neon-green text-xs tracking-[0.25em]">MANUAL DE JUEGO</p>
            <h1 className="mt-3 font-headline-lg text-4xl sm:text-6xl text-white font-black leading-[0.95]">
              Aprende rápido. Que empiece la fiesta.
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl">
              Dedícalo es un party game musical: una canción suena, el anfitrión la corta, todos responden y la partida sigue hasta que alguien gana.
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_FLOW.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-black/35 p-3 text-center">
                  <span className="material-symbols-outlined text-vinyl-orange text-2xl">{item.icon}</span>
                  <p className="mt-2 text-xs font-black text-white leading-tight">{item.title}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {MODES.map((mode) => (
            <motion.article
              key={mode.title}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-2xl border bg-[#071025]/80 p-5"
              style={{ borderColor: `${mode.color}44`, boxShadow: `0 0 32px ${mode.color}12` }}
            >
              <span className="material-symbols-outlined text-3xl" style={{ color: mode.color }}>{mode.icon}</span>
              <h2 className="mt-3 font-headline-lg text-2xl font-black text-white">{mode.title}</h2>
              <p className="font-label-caps text-[10px] tracking-[0.18em]" style={{ color: mode.color }}>{mode.goal}</p>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{mode.text}</p>
            </motion.article>
          ))}
        </section>

        <section className="mt-6 space-y-3">
          <ManualSection
            icon="route"
            title="Resumen rápido de una partida"
            subtitle="El flujo que todos deben entender antes de empezar."
            defaultOpen
          >
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {ROUND_FLOW.map((item, index) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
                  <span className="inline-flex w-9 h-9 rounded-xl bg-vinyl-orange/15 border border-vinyl-orange/30 items-center justify-center">
                    <span className="material-symbols-outlined text-vinyl-orange">{item.icon}</span>
                  </span>
                  <p className="mt-2 text-[10px] font-label-caps text-neon-green">Paso {index + 1}</p>
                  <h3 className="text-sm font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-on-surface-variant leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
          </ManualSection>

          <ManualSection
            icon="scoreboard"
            title="Cómo funcionan los puntos"
            subtitle="Qué suma, qué resta y cuándo termina la partida."
            defaultOpen
          >
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {POINT_RULES.map((rule) => (
                <article
                  key={rule.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center"
                  style={{ boxShadow: `inset 0 0 24px ${rule.color}10` }}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ color: rule.color }}
                  >
                    {rule.icon}
                  </span>
                  <p className="mt-2 font-stats-xl text-4xl font-black leading-none" style={{ color: rule.color }}>
                    {rule.value}
                  </p>
                  <p className="mt-1 font-label-caps text-[10px] tracking-[0.18em]" style={{ color: rule.color }}>
                    {rule.label}
                  </p>
                  <h3 className="mt-3 text-sm font-black text-white">{rule.title}</h3>
                  <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">{rule.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-black text-white">Ejemplos rápidos</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {POINT_EXAMPLES.map(([title, formula, result]) => (
                  <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                    <p className="text-xs font-black text-white">{title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-label-caps text-[10px] text-on-surface-variant">{formula}</span>
                      <span className="rounded-lg bg-neon-green/15 px-2 py-1 text-xs font-black text-neon-green">{result}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-vinyl-orange/30 bg-vinyl-orange/10 p-4">
                <p className="text-sm font-black text-white">Corte Maestro y Caos DJ</p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  Gana quien llega primero a la meta elegida por el anfitrión: {VICTORY_MODES.map((mode) => mode.targetScore).join(', ')} puntos.
                </p>
              </div>
              <div className="rounded-2xl border border-electric-purple/35 bg-electric-purple/10 p-4">
                <p className="text-sm font-black text-white">Años Locos</p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  Los puntos ayudan al ranking, pero la victoria principal es completar {TIMELINE_GOAL_YEARS} años en tu propia ruta musical.
                </p>
              </div>
            </div>
          </ManualSection>

          <ManualSection
            icon="headphones"
            title="Cómo crea la sala el anfitrión"
            subtitle="El anfitrión pone la música, pero también juega y suma puntos."
          >
            <StepList items={HOST_STEPS} />
          </ManualSection>

          <ManualSection
            icon="groups"
            title="Cómo entra un invitado"
            subtitle="Los invitados no necesitan cuenta ni Spotify."
          >
            <StepList items={GUEST_STEPS} />
          </ManualSection>

          <ManualSection
            icon="graphic_eq"
            title="Spotify explicado fácil"
            subtitle="Qué se conecta, quién lo conecta y cómo evitar problemas de sonido."
          >
            <StepList items={SPOTIFY_STEPS} />
            <div className="mt-4 rounded-2xl border border-vinyl-orange/30 bg-vinyl-orange/10 p-4">
              <p className="text-sm font-black text-white">Regla de oro</p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                Antes de crear sala, el anfitrión debe pulsar “Probar sonido”. Si se escucha, la partida puede empezar. Si no se escucha, reconecta Spotify y prueba otra vez.
              </p>
            </div>
          </ManualSection>

          <ManualSection
            icon="timeline"
            title="Cómo se juega Años Locos"
            subtitle="Cada jugador construye su propia ruta musical por años."
          >
            <div className="mt-4 rounded-2xl border border-electric-purple/40 bg-electric-purple/10 p-4">
              <p className="text-sm font-black text-white">Ejemplo visual</p>
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                {['Antes', '1998', 'Entre', '2006', 'Entre', '2019', 'Después'].map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`min-w-20 rounded-xl border px-3 py-3 text-center font-black text-sm ${
                      Number(item)
                        ? 'border-white/15 bg-white/10 text-white'
                        : 'border-dashed border-neon-green/40 bg-neon-green/10 text-neon-green'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
                Si crees que la canción salió entre 2006 y 2019, tocas ese espacio. Si aciertas, ese año entra en tu ruta. Gana quien complete {TIMELINE_GOAL_YEARS} años.
              </p>
            </div>
          </ManualSection>

          <ManualSection
            icon="casino"
            title="Sabotajes en Caos DJ"
            subtitle="Ataques con coste de puntos. Úsalos antes de que el anfitrión pare la canción."
          >
            <div className="mt-4 rounded-2xl border border-electric-purple/35 bg-electric-purple/10 p-4">
              <p className="text-sm font-black text-white">Idea principal</p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                Un sabotaje es una jugada estratégica: pagas puntos para protegerte, atacar al líder o cambiar lo que pasará al revelar la ronda. No es obligatorio usarlos, pero pueden cambiar una partida.
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SABOTAGE_RULES.map(([title, text]) => (
                <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                  <p className="text-xs font-black text-white">{title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SABOTAGE_OPTIONS.map((option) => {
                const s = SABOTAGE_STYLES[option.color] || SABOTAGE_STYLES.purple;
                return (
                  <article key={option.id} className={`rounded-2xl border ${s.border} ${s.bg} p-4`}>
                    <div className="flex items-start gap-3">
                      <span className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                        <span className={`material-symbols-outlined text-2xl ${s.text}`}>{option.icon}</span>
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-white">{option.name}</h3>
                        <p className={`font-label-caps text-[10px] ${s.text}`}>{option.cost} pts</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{option.effect}</p>
                    <div className="mt-3 rounded-xl bg-black/20 px-3 py-2">
                      <p className="font-label-caps text-[10px] text-on-surface-variant">Cómo leerlo</p>
                      <p className="mt-1 text-[11px] leading-snug text-white/80">
                        Pagas {option.cost} puntos al activarlo. Si el ataque se aplica, verás el aviso lila en el resultado.
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-4">
              <p className="text-sm font-black text-white">Ejemplo de ronda con sabotaje</p>
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-on-surface-variant">
                <li><span className="font-black text-neon-green">1.</span> Va ganando Laura con 40 pts.</li>
                <li><span className="font-black text-neon-green">2.</span> Diego usa Bloqueo y paga 5 pts.</li>
                <li><span className="font-black text-neon-green">3.</span> Laura acierta la pregunta, pero estaba bloqueada.</li>
                <li><span className="font-black text-neon-green">4.</span> En vez de sumar +5, Laura suma 0 en esa ronda y la pantalla avisa el sabotaje.</li>
              </ol>
            </div>
          </ManualSection>

          <ManualSection
            icon="help"
            title="Preguntas frecuentes"
            subtitle="Respuestas rápidas para que nadie se quede con dudas."
          >
            <div className="mt-4 space-y-2">
              {FAQ.map(([question, answer]) => (
                <details key={question} className="group rounded-xl border border-white/8 bg-white/[0.035]">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-neon-green text-lg">question_mark</span>
                    <span className="flex-1 text-sm font-black text-white">{question}</span>
                    <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="px-4 pb-4 pl-12 text-xs leading-relaxed text-on-surface-variant">{answer}</p>
                </details>
              ))}
            </div>
          </ManualSection>
        </section>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <NeonButton primary color="vinyl-orange" onClick={() => navigate('/role-selection')}>
            Ya sé jugar
          </NeonButton>
          <NeonButton color="white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Volver arriba
          </NeonButton>
        </div>
      </div>
    </motion.main>
  );
}

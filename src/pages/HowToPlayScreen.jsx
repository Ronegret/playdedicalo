import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import SupportButton from '../components/SupportButton';
import { getPlaylistRequestUrl, openMailto, SUPPORT_EMAIL } from '../config/support';
import { TIMELINE_GOAL_YEARS } from '../store/useGameStore';

const QUICK_FLOW = [
  { icon: 'person_add', title: 'Sala', text: 'El anfitrión crea la sala. Los demás entran con PIN o QR.' },
  { icon: 'album', title: 'Música', text: 'Suena una canción y debes adivinar su época.' },
  { icon: 'timeline', title: 'Años Locos', text: 'Coloca cada canción antes, después o entre tus años acumulados.' },
  { icon: 'emoji_events', title: 'Victoria', text: `El primero en acumular ${TIMELINE_GOAL_YEARS} años en su ruta personal gana.` },
];

const GOLDEN_RULES = [
  ['El anfitrión también juega', 'Controla la música, pero participa igual que todos.'],
  ['La canción siempre va oculta', 'No se muestra título ni artista antes de revelar el resultado.'],
  ['Modo único oficial', 'Toda la partida transcurre bajo la regla oficial de Años Locos.'],
];

const HOST_STEPS = [
  ['Entra como anfitrión', 'Pulsa “Ya sé jugar” y elige “Anfitrión”.'],
  ['Inicia sesión con Google', 'Esto permite guardar la sala y mantener la partida conectada.'],
  ['Conecta Spotify Premium', 'Solo el anfitrión necesita Spotify Premium. Los invitados no tienen que conectarlo.'],
  ['Elige un estilo musical', 'Selecciona una playlist sugerida: Reggaeton, Hits, Rock Latino, Bailable y más.'],
  ['Prueba el sonido', 'Pulsa el vinilo de prueba. Si suena, ya puedes crear la sala.'],
  ['Comparte el PIN o QR', 'Los jugadores entran desde su móvil. El anfitrión también juega como todos.'],
];

const GUEST_STEPS = [
  ['Elige “Invitado”', 'No necesitas Google ni Spotify. Solo entra a la sala.'],
  ['Escribe el PIN o escanea el QR', 'El anfitrión lo muestra en pantalla al crear la sala.'],
  ['Elige tu nombre e identidad', 'Así todos te reconocen en el ranking.'],
  ['Escucha y participa', 'Responde y completa tu ruta de años en el modo Años Locos.'],
];

const SPOTIFY_STEPS = [
  ['Google primero', 'El anfitrión inicia sesión con Google para preparar la sala.'],
  ['Spotify después', 'Pulsa “Conectar Spotify” e inicia sesión con una cuenta Premium.'],
  ['Prueba antes de crear', 'Toca “Probar sonido”. Si escuchas música, todo está listo.'],
  ['Durante la partida', 'El anfitrión controla cuándo suena la música. Nadie ve el nombre de la canción.'],
];

const TIMELINE_STEPS = [
  ['Tu ruta personal', 'Cada jugador arranca con un año base distinto — tu ruta es solo tuya, nadie más la ve.'],
  ['Suena una canción', 'Escuchas un fragmento sin saber el título ni el año todavía.'],
  ['Eliges dónde va', 'Tocas el hueco donde crees que encaja: antes de tu año más viejo, después del más nuevo, o entre dos que ya tengas.'],
  ['Si aciertas, suma', `El año entra en tu ruta. Sigue sonando música hasta que alguien complete ${TIMELINE_GOAL_YEARS} años.`],
];

const TIMELINE_EXAMPLE = [
  'Noelia ya tiene 1998 y 2006 en su ruta.',
  'Suena una canción nueva y Noelia cree que es más reciente que sus dos años, así que la coloca "Después de 2006".',
  'Acierta: la canción es de 2014, así que ahora tiene 1998, 2006 y 2014 en su ruta.',
  `Sigue sonando música hasta que Noelia (o alguien más) complete ${TIMELINE_GOAL_YEARS} años y gane la partida.`,
];

const POINT_RULES = [
  {
    icon: 'play_circle',
    title: 'Todos parten con 10 pts',
    value: '10',
    label: 'INICIO',
    color: '#ffffff',
    text: 'Puntos iniciales asignados a cada jugador al comenzar la partida.'
  },
  {
    icon: 'check_circle',
    title: 'Respuesta correcta',
    value: '+5',
    label: 'ACIERTO',
    color: '#39ff14',
    text: 'Si respondes bien la colocación en la línea de tiempo, ganas 5 puntos.'
  },
  {
    icon: 'cancel',
    title: 'Respuesta incorrecta',
    value: '-3',
    label: 'FALLO',
    color: '#ff6b8b',
    text: 'Si fallas la colocación, pierdes 3 puntos.'
  }
];

const POINT_EXAMPLES = [
  ['Rodrigo acierta', '10 + 5', '15 pts'],
  ['Noelia falla', '10 - 3', '7 pts'],
];

const FAQ = [
  ['¿El anfitrión también juega?', 'Sí. El anfitrión controla la música, pero participa igual que todos.'],
  ['¿Todos necesitan Spotify Premium?', 'No. Solo el anfitrión necesita conectar Spotify Premium. Los invitados solo escuchan el sonido del lugar.'],
  ['¿Se ve la canción que está sonando?', 'No, queda oculta hasta que el anfitrión revela el resultado.'],
  ['¿Cuándo termina la partida?', `Años Locos termina cuando el primer jugador logra completar sus ${TIMELINE_GOAL_YEARS} años acumulados.`],
  ['¿Qué pasa si fallo al colocar la canción?', 'Pierdes 3 puntos. Si aciertas, ganas 5 puntos y sumas el año a tu ruta.'],
  ['¿Qué pasa si pierdo la conexión a mitad de partida?', 'Tienes hasta 30 segundos para reconectar (llamada, pantalla bloqueada o cambio de app). Tu sitio en la sala se mantiene y sigues desde donde estabas.'],
  ['¿Qué hago si Spotify no suena?', 'Reconecta Spotify, verifica que la cuenta sea Premium, sube el volumen del dispositivo y vuelve a probar sonido antes de crear la sala.'],
];

const LEGAL_NOTES = [
  ['Dedícalo no es Spotify', 'Es un proyecto independiente hecho por fans. No está afiliado, respaldado ni operado por Spotify AB.'],
  ['Reproducción vía Spotify oficial', 'La música se reproduce con la cuenta Premium del propio anfitrión a través de la API oficial de Spotify. Dedícalo no descarga, guarda ni redistribuye audio.'],
  ['Sin cookies de rastreo ni analítica', 'No usamos cookies publicitarias ni de seguimiento. Solo guardamos en el almacenamiento local del navegador lo necesario para mantener tu sesión de Google/Spotify activa.'],
  ['Tus datos en la partida', 'El nombre y avatar del invitado se usan solo mientras dura la sala y se eliminan al salir. El anfitrión inicia sesión con Google únicamente para conectar Spotify.'],
  ['Fuentes e iconos', 'Usamos Google Fonts (Montserrat, Hanken Grotesk, Space Mono) y Material Symbols, ambos de uso libre bajo licencia abierta.'],
  ['Contacto', `¿Dudas sobre privacidad o datos? Escríbenos a ${SUPPORT_EMAIL}.`],
];

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
      <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 flex items-center gap-3 text-left min-h-touch">
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

function ExampleList({ items, color = '#39ff14' }) {
  return (
    <ol className="mt-3 space-y-2 text-xs leading-relaxed text-on-surface-variant">
      {items.map((text, index) => (
        <li key={text} className="flex gap-2">
          <span className="font-black shrink-0" style={{ color }}>{index + 1}.</span>
          {text}
        </li>
      ))}
    </ol>
  );
}

function ModeIntro({ color, text }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${color}45`, backgroundColor: `${color}12` }}>
      <p className="font-label-caps text-[10px] tracking-widest" style={{ color }}>IDEA EN 1 LÍNEA</p>
      <p className="mt-1 text-sm font-bold text-white leading-snug">{text}</p>
    </div>
  );
}

function ModeVictory({ color, title, text }) {
  return (
    <div className="mt-4 rounded-xl border p-3" style={{ borderColor: `${color}45`, backgroundColor: `${color}12` }}>
      <p className="font-label-caps text-[10px] tracking-widest" style={{ color }}>PUNTOS Y VICTORIA</p>
      <p className="mt-1 text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{text}</p>
    </div>
  );
}

function ModeExample({ color, items }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="font-label-caps text-[10px] tracking-widest text-white">EJEMPLO DE PARTIDA</p>
      <ExampleList items={items} color={color} />
    </div>
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

  const openPlaylistRequest = () => {
    openMailto(getPlaylistRequestUrl());
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="relative z-10 w-full min-h-dvh px-4 sm:px-6 lg:px-10 pt-safe-header pb-24"
    >
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-white/8 flex items-center px-4 sm:px-6">
        <button
          onClick={() => navigate('/')}
          className="min-h-touch text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
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
              Un solo modo, fácil de aprender: arma tu ruta de años con cada canción que suena.
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

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {GOLDEN_RULES.map(([title, text], index) => (
            <motion.article
              key={title}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-vinyl-orange/20 bg-vinyl-orange/10 p-4 text-center"
            >
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-vinyl-orange/15 text-vinyl-orange">
                <span className="material-symbols-outlined text-xl">{index === 0 ? 'sports_esports' : index === 1 ? 'visibility_off' : 'lock'}</span>
              </span>
              <h2 className="mt-3 text-sm font-black text-white">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{text}</p>
            </motion.article>
          ))}
        </section>

        <section className="mt-6 space-y-3">
          <ManualSection
            icon="scoreboard"
            title="Cómo funcionan los puntos"
            subtitle="Todos parten igual y suman o restan según cada ronda."
            defaultOpen
          >
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
          </ManualSection>

          <ManualSection
            icon="timeline"
            title="Cómo se juega: Años Locos"
            subtitle="Arma tu propia ruta musical colocando canciones por año."
            defaultOpen
          >
            <ModeIntro color="#a855f7" text="Cada jugador construye su propia línea de tiempo: escuchas una canción y adivinas si es antes, después o entre los años que ya tienes." />
            <div className="mt-4">
              <p className="font-label-caps text-[10px] tracking-widest text-white">CÓMO SE JUEGA</p>
              <StepList items={TIMELINE_STEPS} />
            </div>

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
                Si crees que la canción salió entre 2006 y 2019, tocas ese espacio.
              </p>
            </div>

            <ModeVictory
              color="#a855f7"
              title={`Gana quien complete primero ${TIMELINE_GOAL_YEARS} años en su ruta.`}
              text="Los aciertos también usan el sistema de puntos de arriba (+5/-3), pero eso solo ayuda al ranking: lo que decide la partida es completar tu ruta de años."
            />
            <ModeExample color="#a855f7" items={TIMELINE_EXAMPLE} />
          </ManualSection>

          <ManualSection
            icon="headphones"
            title="Cómo crea la sala el anfitrión"
            subtitle="El anfitrión pone la música, pero también juega."
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
            icon="wifi_off"
            title="Si se corta la conexión a mitad de partida"
            subtitle="Llamadas, pantalla bloqueada o cambio de app no te sacan de la sala."
          >
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                <p className="text-xs font-black text-white">Tienes 30 segundos de gracia</p>
                <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">Si tu pantalla se bloquea o recibes una llamada, el juego te marca como "Reconectando" y guarda tu sitio en la sala.</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                <p className="text-xs font-black text-white">Vuelves donde estabas</p>
                <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">Al reabrir Dedícalo, se reconecta solo a tu sala y tu ronda, sin perder puntos ni tu ruta de años.</p>
              </div>
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
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 min-h-touch">
                    <span className="material-symbols-outlined text-neon-green text-lg">question_mark</span>
                    <span className="flex-1 text-sm font-black text-white">{question}</span>
                    <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="px-4 pb-4 pl-12 text-xs leading-relaxed text-on-surface-variant">{answer}</p>
                </details>
              ))}
            </div>
          </ManualSection>

          <ManualSection
            icon="privacy_tip"
            title="Legal, privacidad y cookies"
            subtitle="Cómo usamos Spotify, tus datos y el almacenamiento del navegador."
          >
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {LEGAL_NOTES.map(([title, text]) => (
                <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                  <p className="text-xs font-black text-white">{title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">{text}</p>
                </div>
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

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
          <p className="text-xs font-label-caps tracking-[0.18em] text-on-surface-variant">Opcional</p>
          <p className="mt-1 text-sm font-black text-white">¿Quieres jugar con tu propia playlist?</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-on-surface-variant">
            Las playlists de la app son gratis y no requieren nada. Incluir una playlist propia es un servicio aparte:
            1) haz una donación voluntaria, 2) escríbenos con el comprobante y el link de tu playlist.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <SupportButton compact className="w-full border-white/10 bg-black/20 text-white/85" />
            <button
              type="button"
              onClick={openPlaylistRequest}
              className="group relative min-h-touch overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-4 text-xs text-white/85 active:scale-95 transition-all"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2 font-label-caps tracking-[0.16em]">
                <span className="material-symbols-outlined text-vinyl-orange text-base">playlist_add</span>
                Enviar comprobante y playlist
              </span>
            </button>
          </div>
          <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-on-surface-variant">
            El envío no aparece al instante en el juego: se revisa para cuidar calidad, años, canciones repetidas y estilo.
          </p>
        </div>
      </div>
    </motion.main>
  );
}

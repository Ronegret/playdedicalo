import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import SupportButton from '../components/SupportButton';
import { getPlaylistRequestUrl, openMailto, SUPPORT_EMAIL } from '../config/support';
import { ATTACK_COST, TIMELINE_GOAL_YEARS } from '../store/useGameStore';

const HOW_TO_STEPS = [
  {
    icon: 'meeting_room',
    title: '1. Crea la sala',
    text: 'El anfitrión conecta Spotify Premium, elige playlist y enseña el PIN o QR.'
  },
  {
    icon: 'groups',
    title: '2. Entran tus amigos',
    text: 'Cada invitado pone su nombre, elige avatar y entra desde su móvil.'
  },
  {
    icon: 'graphic_eq',
    title: '3. Suena la canción',
    text: 'Se escucha música, pero nadie ve el título, artista ni año.'
  },
  {
    icon: 'timeline',
    title: '4. Coloca el año',
    text: 'Toca si la canción va antes, después o entre los años que ya tienes.'
  },
  {
    icon: 'emoji_events',
    title: '5. Sube en el ranking',
    text: 'Si aciertas sumas puntos y tu ruta musical crece. Si fallas, pierdes un poco.'
  },
  {
    icon: 'bolt',
    title: '6. Sabotea con estilo',
    text: `Gasta ${ATTACK_COST} pts para complicarle la siguiente ronda a un rival.`
  }
];

const PLAYER_RULES = [
  ['Anfitrión', 'Crea la sala, conecta Spotify, prueba el sonido y también juega.'],
  ['Invitados', 'Solo necesitan PIN o QR. No hace falta Spotify ni cuenta premium.'],
  ['Todos', 'Escuchan, responden, suben en el ranking y pueden recibir sabotajes.']
];

const SCORE_RULES = [
  { value: '10', label: 'Inicio', text: 'Todos empiezan con los mismos puntos.', color: '#ffffff' },
  { value: '+5', label: 'Acierto', text: 'Colocaste bien el año de la canción.', color: '#39ff14' },
  { value: '-3', label: 'Fallo', text: 'La canción iba en otro lugar de tu ruta.', color: '#ff4f8b' },
  { value: `${ATTACK_COST}`, label: 'Sabotaje', text: 'Coste para atacar a otro jugador.', color: '#b96cff' }
];

const SABOTAGE_CARDS = [
  {
    icon: 'swap_vert',
    title: 'Orden cambiado',
    text: 'Los años pueden verse de mayor a menor o al revés para despistar.'
  },
  {
    icon: 'shuffle',
    title: 'Años revueltos',
    text: 'Los dígitos se mezclan visualmente. El año real no cambia.'
  },
  {
    icon: 'ads_click',
    title: 'Toque traicionero',
    text: 'La pantalla puede intentar confundirte justo cuando vas a responder.'
  }
];

const FAQ = [
  ['¿Cuándo termina?', `Cuando alguien completa la meta de canciones. ${TIMELINE_GOAL_YEARS} es lo recomendado, pero el anfitrión puede subir o bajar la duración.`],
  ['¿Qué pasa si dos canciones son del mismo año?', 'Está bien. Si el año correcto coincide con un año que ya tienes, la respuesta se acepta como válida.'],
  ['¿Se ve el ranking?', 'Sí. Durante la partida puedes revisar quién va ganando y al final aparece el ranking completo.'],
  ['¿Y si alguien se desconecta?', 'Tiene 30 segundos para volver antes de salir de la partida. Su sitio se mantiene durante ese tiempo.'],
  ['¿La canción se reproduce sola al inicio?', 'No. En la pantalla principal la música de Dedícalo solo suena cuando tocas el botón de reproducir.']
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 19 } }
};

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mb-4">
      <p className="font-label-caps text-sm tracking-[0.18em] text-neon-green">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">{title}</h2>
      {text && <p className="mt-2 text-base leading-relaxed text-on-surface-variant">{text}</p>}
    </div>
  );
}

function StepCard({ step, index }) {
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-vinyl-orange/35 bg-vinyl-orange/15 text-vinyl-orange">
          <span className="material-symbols-outlined text-3xl">{step.icon}</span>
        </span>
        <div>
          <h3 className="text-lg font-black leading-tight text-white">{step.title}</h3>
          <p className="mt-1 text-base leading-relaxed text-on-surface-variant">{step.text}</p>
        </div>
      </div>
    </motion.article>
  );
}

function TimelineDemo() {
  const chips = [
    { label: 'Antes', open: true },
    { label: '1998' },
    { label: 'Entre', open: true },
    { label: '2006' },
    { label: 'Entre', open: true },
    { label: '2019' },
    { label: 'Después', open: true }
  ];

  return (
    <div className="rounded-[24px] border border-electric-purple/35 bg-electric-purple/10 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-purple text-white">
          <span className="material-symbols-outlined text-3xl">touch_app</span>
        </span>
        <div>
          <h3 className="text-xl font-black text-white">Tu misión en cada ronda</h3>
          <p className="text-base text-on-surface-variant">Escucha y toca el hueco correcto.</p>
        </div>
      </div>

      <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-2">
        {chips.map((chip, index) => (
          <div
            key={`${chip.label}-${index}`}
            className={`min-w-24 snap-center rounded-2xl border px-4 py-4 text-center text-lg font-black ${
              chip.open
                ? 'border-dashed border-neon-green/55 bg-neon-green/12 text-neon-green'
                : 'border-white/15 bg-black/30 text-white'
            }`}
          >
            {chip.label}
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-base leading-relaxed text-white">
        Ejemplo: si crees que la canción salió entre 2006 y 2019, tocas ese espacio. Simple, rápido y con tensión de fiesta.
      </p>
    </div>
  );
}

function ScoreCard({ rule }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
      <p className="font-stats-xl text-5xl font-black leading-none" style={{ color: rule.color }}>
        {rule.value}
      </p>
      <p className="mt-2 font-label-caps text-sm tracking-[0.16em]" style={{ color: rule.color }}>
        {rule.label}
      </p>
      <p className="mt-2 text-base leading-snug text-on-surface-variant">{rule.text}</p>
    </article>
  );
}

function SabotageCard({ item }) {
  return (
    <article className="rounded-2xl border border-[#b96cff]/35 bg-[#b96cff]/12 p-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b96cff] text-white">
        <span className="material-symbols-outlined text-3xl">{item.icon}</span>
      </span>
      <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
      <p className="mt-2 text-base leading-relaxed text-on-surface-variant">{item.text}</p>
    </article>
  );
}

export default function HowToPlayScreen() {
  const navigate = useNavigate();
  const screenRef = useRef(null);

  const openPlaylistRequest = () => {
    openMailto(getPlaylistRequestUrl());
  };

  const scrollTop = () => {
    screenRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.main
      ref={screenRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="app-screen relative z-10 overflow-y-auto pt-safe-header sm:px-6 lg:px-10"
    >
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-white/8 bg-background/85 px-4 backdrop-blur-xl sm:px-6">
        <button
          onClick={() => navigate('/')}
          className="flex min-h-touch items-center gap-2 font-label-caps text-sm tracking-[0.16em] text-on-surface-variant transition-colors hover:text-white"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
          Volver
        </button>
      </header>

      <div className="mx-auto max-w-5xl pb-8">
        <section className="relative mt-3 min-h-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-[#070917] sm:min-h-[520px]">
          <img
            src="/images/hero-how-to-play.png"
            alt="Grupo jugando Dedícalo con música"
            className="absolute inset-0 h-full w-full object-cover opacity-50"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060f] via-[#05060f]/75 to-[#05060f]/20" />
          <div className="relative flex min-h-[420px] items-end p-5 sm:min-h-[520px] sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="font-label-caps text-sm tracking-[0.22em] text-neon-green">Cómo se juega</p>
              <h1 className="heading-impact mt-3 font-headline-lg font-black text-white">
                Dedícalo es música, memoria y risas rápidas.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/82">
                Escuchas una canción, adivinas dónde encaja su año y miras cómo subes en el ranking. Se aprende en una ronda. Se pica en dos.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {PLAYER_RULES.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/12 bg-black/35 p-4">
                    <p className="text-lg font-black text-white">{title}</p>
                    <p className="mt-1 text-base leading-snug text-on-surface-variant">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#071025]/80 p-4 sm:p-6">
          <SectionTitle
            eyebrow="La partida en 6 pasos"
            title="Sin líos, sin manual eterno"
            text="Esto es lo que necesita entender cualquier persona antes de jugar, incluso si nunca ha probado Dedícalo."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_TO_STEPS.map((step, index) => (
              <StepCard key={step.title} step={step} index={index} />
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <TimelineDemo />

          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4 sm:p-5">
            <SectionTitle
              eyebrow="Puntos"
              title="El ranking se entiende de un vistazo"
              text="Los números son grandes porque en una fiesta nadie quiere leer pequeño."
            />
            <div className="grid grid-cols-2 gap-3">
              {SCORE_RULES.map((rule) => (
                <ScoreCard key={rule.label} rule={rule} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-[#b96cff]/35 bg-[#20072f]/75 p-4 shadow-[0_22px_60px_rgba(185,108,255,0.16)] sm:p-6">
          <SectionTitle
            eyebrow="Sabotajes"
            title="Cuando alguien te ataca, se tiene que notar"
            text={`El sabotaje cuesta ${ATTACK_COST} pts. No borra años ni destruye progreso: solo mete presión visual para que la ronda sea más épica.`}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {SABOTAGE_CARDS.map((item) => (
              <SabotageCard key={item.title} item={item} />
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/12 bg-black/25 p-4">
            <p className="text-lg font-black text-white">Pantalla de ataque</p>
            <p className="mt-1 text-base leading-relaxed text-on-surface-variant">
              Cuando recibes un sabotaje, la app muestra una alerta grande en lila: quién te atacó, qué te hizo y qué pasará en tu siguiente respuesta.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#071025]/80 p-4 sm:p-6">
          <SectionTitle
            eyebrow="Dudas rápidas"
            title="Respuestas claras para jugar sin parar"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-white/10 bg-white/[0.045]">
                <summary className="flex min-h-touch cursor-pointer list-none items-center gap-3 px-4 py-4">
                  <span className="material-symbols-outlined text-2xl text-neon-green">help</span>
                  <span className="flex-1 text-lg font-black leading-tight text-white">{question}</span>
                  <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <p className="px-4 pb-5 pl-14 text-base leading-relaxed text-on-surface-variant">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.045] p-4 text-center sm:p-6">
          <p className="font-label-caps text-sm tracking-[0.18em] text-on-surface-variant">Opcional</p>
          <h2 className="mt-2 text-2xl font-black text-white">¿Quieres jugar con tu propia playlist?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-base leading-relaxed text-on-surface-variant">
            Las playlists oficiales ya vienen listas. Si quieres añadir una propia, escríbenos con el link y la revisamos para cuidar años, repetidas y calidad.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SupportButton compact className="w-full border-white/10 bg-black/20 text-white/85" />
            <button
              type="button"
              onClick={openPlaylistRequest}
              className="group relative min-h-touch overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/85 transition-all active:scale-95"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative flex items-center justify-center gap-2 font-label-caps tracking-[0.14em]">
                <span className="material-symbols-outlined text-xl text-vinyl-orange">playlist_add</span>
                Enviar playlist
              </span>
            </button>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Contacto: {SUPPORT_EMAIL}. Dedícalo reproduce música con la cuenta Premium del anfitrión mediante Spotify. No descarga ni redistribuye audio.
          </p>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <NeonButton primary color="vinyl-orange" onClick={() => navigate('/role-selection')}>
            Ya sé jugar
          </NeonButton>
          <NeonButton color="white" onClick={scrollTop}>
            Volver arriba
          </NeonButton>
        </div>
      </div>
    </motion.main>
  );
}

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import SupportButton from '../components/SupportButton';
import { getPlaylistRequestUrl, openMailto, SUPPORT_EMAIL } from '../config/support';
import { ATTACK_COST, REDEEM_YEAR_COST, TIMELINE_GOAL_YEARS } from '../store/useGameStore';

const HOW_TO_STEPS = [
  {
    icon: 'meeting_room',
    title: '1. Crea la sala',
    text: 'El anfitrión elige la lista y enseña el PIN o el QR. Nadie necesita cuenta de música.'
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
    title: '6. Sabotea o canjea puntos',
    text: `Con ${ATTACK_COST} pts saboteas a un rival. Con ${REDEEM_YEAR_COST} pts te compras una canción de progreso.`
  }
];

const PLAYER_RULES = [
  ['Anfitrión', 'Crea la sala, elige la música, marca el ritmo y también juega.'],
  ['Invitados', 'Solo necesitan el PIN o el QR. Nada que instalar, ninguna cuenta.'],
  ['Todos', 'Escuchan, responden, suben en el ranking y pueden recibir sabotajes.']
];

const SCORE_RULES = [
  { value: '10', label: 'Inicio', text: 'Todos empiezan con los mismos puntos.', color: '#ffffff' },
  { value: '+5', label: 'Acierto', text: 'Colocaste bien el año de la canción.', color: '#39ff14' },
  { value: '-3', label: 'Fallo', text: 'La canción iba en otro lugar de tu ruta.', color: '#ff4f8b' },
  { value: `${ATTACK_COST}`, label: 'Sabotaje', text: 'Coste para atacar a otro jugador.', color: '#b96cff' },
  { value: `${REDEEM_YEAR_COST}`, label: 'Canje', text: 'Coste para comprar una canción de progreso.', color: '#ffbf4d' }
];

const SABOTAGE_CARDS = [
  {
    icon: 'block',
    title: 'Bloqueo',
    text: 'El rival queda bloqueado y no puede responder esta ronda. Cuenta como fallo para él.'
  },
  {
    icon: 'move_down',
    title: 'Robo de año',
    text: 'Si el rival acierta igual, ese año pasa a tu ruta y él pierde uno de los que ya tenía.'
  }
];

const FAQ = [
  ['¿Cuándo termina?', `Cuando alguien completa la meta de canciones. ${TIMELINE_GOAL_YEARS} es lo recomendado, pero el anfitrión puede subir o bajar la duración.`],
  ['¿Qué pasa si dos canciones son del mismo año?', 'Está bien. Si el año correcto coincide con un año que ya tienes, la respuesta se acepta como válida.'],
  ['¿Se ve el ranking?', 'Sí. Durante la partida puedes revisar quién va ganando y al final aparece el ranking completo.'],
  ['¿Y si alguien se desconecta?', 'Tiene 30 segundos para volver antes de salir de la partida. Su sitio se mantiene durante ese tiempo.'],
  ['¿La canción se reproduce sola al inicio?', 'No. En la pantalla principal la música de Dedícalo solo suena cuando tocas el botón de reproducir.'],
  ['¿Para qué sirven los puntos si no ganan la partida?', `Solo para dos cosas: sabotear a un rival (${ATTACK_COST} pts) o canjearlos por una canción de progreso (${REDEEM_YEAR_COST} pts). Lo que decide quién gana es la ruta de años, nunca los puntos por sí solos.`],
  ['¿Puedo elegir a quién sabotear?', 'Sí, y también qué golpe usar: "Bloqueo" (no responde esa ronda) o "Robo de año" (si acierta, te quedas con su año). No puedes sabotear a alguien desconectado ni que ya esté saboteado en esa ronda.']
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 19 } }
};

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mb-5">
      <p className="font-label-caps text-sm tracking-[0.18em] text-neon-green">{eyebrow}</p>
      <h2 className="mt-2 font-black leading-tight text-white" style={{ fontSize: 'min(2.4rem, max(1.4rem, 6vw))' }}>{title}</h2>
      {text && <p className="mt-2 leading-relaxed text-on-surface-variant" style={{ fontSize: 'min(1.15rem, max(0.9rem, 3.4vw))' }}>{text}</p>}
    </div>
  );
}

function StepCard({ step, index }) {
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-vinyl-orange/35 bg-vinyl-orange/15 text-vinyl-orange">
          <span className="material-symbols-outlined text-[2rem]">{step.icon}</span>
        </span>
        <div>
          <h3 className="font-black leading-tight text-white" style={{ fontSize: 'min(1.3rem, max(1rem, 4vw))' }}>{step.title}</h3>
          <p className="mt-1 leading-relaxed text-on-surface-variant" style={{ fontSize: 'min(1.1rem, max(0.9rem, 3.4vw))' }}>{step.text}</p>
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
      className="app-screen relative z-10 overflow-y-auto no-scrollbar sm:px-6 lg:px-10"
      style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center border-b border-white/8 bg-background/85 px-4 backdrop-blur-xl sm:px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', minHeight: 'calc(4rem + env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex min-h-touch items-center gap-2 font-label-caps text-sm tracking-[0.16em] text-on-surface-variant transition-colors hover:text-white active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
          Volver
        </button>
        <span className="ml-3 font-label-caps text-xs tracking-[0.18em] text-on-surface-variant/60">MANUAL</span>
      </header>

      <div className="mx-auto max-w-5xl pb-16">
        {/* Hero — responsive height, no fixed px that clips content */}
        <section className="relative mt-3 overflow-hidden rounded-[28px] border border-white/10 bg-[#070917]">
          <img
            src="/images/hero-how-to-play.png"
            alt="Grupo jugando Dedícalo con música"
            className="absolute inset-0 h-full w-full object-cover opacity-45"
            draggable={false}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {/* Animated background fallback if image missing */}
          <div className="absolute inset-0 animated-mesh" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060f] via-[#05060f]/75 to-[#05060f]/20" />
          <div className="relative px-5 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-14 lg:px-10 lg:pb-14">
            <p className="font-label-caps text-sm tracking-[0.22em] text-neon-green">Cómo se juega</p>
            <h1 className="heading-impact mt-3 font-headline-lg font-black text-white">
              Dedícalo es música, memoria y risas rápidas.
            </h1>
            <p className="mt-4 max-w-2xl text-[min(1.25rem, max(0.95rem, 3.5vw))] leading-relaxed text-white/82">
              Escuchas una canción, adivinas dónde encaja su año y miras cómo subes en el ranking. Se aprende en una ronda. Se pica en dos.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLAYER_RULES.map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/12 bg-black/40 p-4">
                  <p className="text-[min(1.2rem, max(0.95rem, 3.5vw))] font-black text-white">{title}</p>
                  <p className="mt-1 text-[min(1.08rem, max(0.88rem, 3.2vw))] leading-snug text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#071025]/80 p-4 sm:p-6">
          <SectionTitle
            eyebrow="La partida en 6 pasos"
            title="Sin líos, sin manual eterno"
            text="Esto es lo que necesita entender cualquier persona antes de jugar, incluso si nunca ha probado Dedícalo."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_TO_STEPS.map((step, index) => (
              <StepCard key={step.title} step={step} index={index} />
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
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
            title="Cuando alguien te ataca, sí se nota"
            text={`Antes de que suene la pregunta, por ${ATTACK_COST} pts puedes sabotear a un rival conectado. Elige uno de los dos golpes — sí tienen consecuencia real en su ruta de años, no es solo un susto visual.`}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SABOTAGE_CARDS.map((item) => (
              <SabotageCard key={item.title} item={item} />
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/12 bg-black/25 p-4">
            <p className="text-lg font-black text-white">Pantalla de ataque</p>
            <p className="mt-1 text-base leading-relaxed text-on-surface-variant">
              Cuando recibes un sabotaje, la app muestra una alerta grande: quién te atacó, cuál de los dos golpes usó y qué pasará en tu siguiente respuesta. Con "Bloqueo" ya sabes que no podrás jugar esa ronda. Con "Robo de año" puedes intentarlo igual, solo que si aciertas, el año se lo lleva quien te saboteó.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-chaos-gold/35 bg-[#2a1c05]/75 p-4 shadow-[0_22px_60px_rgba(255,191,77,0.14)] sm:p-6">
          <SectionTitle
            eyebrow="Canjear puntos"
            title="Los puntos también se pueden gastar en progreso"
            text={`Los puntos de acierto (+5/-3) nunca ganan la partida por sí solos — solo sirven para sabotear o para esto: con ${REDEEM_YEAR_COST} pts ahorrados, compras directamente una canción de progreso hacia la meta, sin tener que acertarla de oído.`}
          />
          <div className="rounded-2xl border border-white/12 bg-black/25 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chaos-gold text-black">
                <span className="material-symbols-outlined text-2xl">star</span>
              </span>
              <div>
                <p className="text-lg font-black text-white">Botón "CANJEAR"</p>
                <p className="text-base text-on-surface-variant">Aparece junto a "SABOTEAR" mientras suena la música.</p>
              </div>
            </div>
            <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
              La canción canjeada se ve en tu ruta como un círculo dorado con una estrella, en vez de un año — así todos ven de un vistazo cuánto de tu progreso es "de oído" y cuánto compraste. Cuenta igual para llegar a la meta.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#071025]/80 p-4 sm:p-6">
          <SectionTitle
            eyebrow="Dudas rápidas"
            title="Respuestas claras para jugar sin parar"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-white/10 bg-white/[0.045]">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-5" style={{ minHeight: '3.5rem' }}>
                  <span className="material-symbols-outlined text-2xl text-neon-green shrink-0">help</span>
                  <span className="flex-1 font-black leading-snug text-white" style={{ fontSize: 'min(1.2rem, max(0.95rem, 3.8vw))' }}>{question}</span>
                  <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180 shrink-0">expand_more</span>
                </summary>
                <p className="px-4 pb-6 pl-14 leading-relaxed text-on-surface-variant" style={{ fontSize: 'min(1.08rem, max(0.9rem, 3.4vw))' }}>{answer}</p>
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
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            Contacto: {SUPPORT_EMAIL}. Dedícalo reproduce fragmentos de vista previa de 30 segundos servidos públicamente por sus proveedores. No aloja, descarga ni redistribuye audio.
          </p>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NeonButton primary color="vinyl-orange" onClick={() => navigate('/role-selection')}>
            ¡Ya sé jugar!
          </NeonButton>
          <NeonButton color="white" onClick={scrollTop}>
            Volver arriba
          </NeonButton>
        </div>

        {/* Extra bottom breathing room so last item never hides behind safe-area */}
        <div style={{ height: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }} />
      </div>
    </motion.main>
  );
}

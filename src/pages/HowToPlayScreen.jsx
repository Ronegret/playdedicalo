import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import SupportButton from '../components/SupportButton';
import {
  IlustracionEscucha,
  IlustracionPoderes,
  IlustracionPuntos,
  IlustracionRuta,
  IlustracionSala
} from '../components/tutorial/TutorialIlustraciones';
import { getPlaylistRequestUrl, openMailto, SUPPORT_EMAIL } from '../config/support';
import { ATTACK_COST, REDEEM_YEAR_COST, SPEED_BONUS_POINTS, TIMELINE_GOAL_YEARS } from '../store/useGameStore';

/* ── Cómo se juega, en modo tutorial ───────────────────────────────────────
   Antes era un manual de ~6000px que nadie leía. Ahora son 5 "niveles" que
   se pasan como cartas (deslizar, flechas del teclado o botones), cada uno
   con un dibujo animado y dos frases. Las reglas completas siguen aquí, pero
   plegadas debajo para quien las quiera consultar.
─────────────────────────────────────────────────────────────────────────── */

const NIVELES = [
  {
    id: 'sala',
    corto: 'Sala',
    titulo: 'Junta a tu gente',
    lineas: [
      'El anfitrión crea la sala, elige la música y enseña el PIN o el QR.',
      'Tus amigos entran desde su móvil, con nombre y avatar.'
    ],
    color: '#a855f7',
    Ilustracion: IlustracionSala
  },
  {
    id: 'escucha',
    corto: 'Escucha',
    titulo: 'Escucha sin mirar',
    lineas: [
      'Suena una canción, pero nadie ve el título, el artista ni el año.',
      'El anfitrión marca el ritmo… y también juega.'
    ],
    color: '#ff7a1a',
    Ilustracion: IlustracionEscucha
  },
  {
    id: 'ruta',
    corto: 'Ruta',
    titulo: 'Coloca el año en tu ruta',
    lineas: [
      'Toca el hueco donde encaja: antes, después o entre los años que ya tienes.',
      '¿Coincide con un año tuyo? También vale.'
    ],
    color: '#39ff14',
    Ilustracion: IlustracionRuta
  },
  {
    id: 'puntos',
    corto: 'Puntos',
    titulo: 'Acierta y llega a la meta',
    lineas: [
      `Empiezas con 10 pts. Acierto +5, fallo −3 y +${SPEED_BONUS_POINTS} al más rápido.`,
      `Pero gana la ruta: el primero en completar ${TIMELINE_GOAL_YEARS} canciones.`
    ],
    color: '#ffbf4d',
    Ilustracion: IlustracionPuntos
  },
  {
    id: 'poderes',
    corto: 'Poderes',
    titulo: 'Sabotea o canjea',
    lineas: [
      `Con ${ATTACK_COST} pts saboteas a un rival: Bloqueo o Robo de año.`,
      `Con ${REDEEM_YEAR_COST} pts te compras una canción de progreso.`
    ],
    color: '#ff6b8b',
    Ilustracion: IlustracionPoderes
  }
];

const ULTIMO = NIVELES.length - 1;

const ROLES = [
  ['Anfitrión', 'Crea la sala, elige la música, marca el ritmo y también juega.'],
  ['Invitados', 'Solo necesitan el PIN o el QR. Nada que instalar.'],
  ['Todos', 'Escuchan, responden, suben en el ranking y pueden recibir sabotajes.']
];

const PUNTOS = [
  { valor: '10', etiqueta: 'Inicio', color: '#ffffff' },
  { valor: '+5', etiqueta: 'Acierto', color: '#39ff14' },
  { valor: '−3', etiqueta: 'Fallo', color: '#ff6b8b' },
  { valor: `+${SPEED_BONUS_POINTS}`, etiqueta: 'Más rápido', color: '#ffbf4d' },
  { valor: `${ATTACK_COST}`, etiqueta: 'Sabotaje', color: '#a855f7' },
  { valor: `${REDEEM_YEAR_COST}`, etiqueta: 'Canje', color: '#ffbf4d' }
];

const SABOTAJES = [
  { icono: 'block', titulo: 'Bloqueo', texto: 'El rival no puede responder esta ronda. Cuenta como fallo para él.' },
  { icono: 'move_down', titulo: 'Robo de año', texto: 'Si el rival acierta igual, ese año pasa a tu ruta y él pierde uno de los suyos.' }
];

const FAQ = [
  ['¿Cuándo termina?', `Cuando alguien completa la meta de canciones. Se recomiendan ${TIMELINE_GOAL_YEARS}, pero el anfitrión puede subir o bajar la duración.`],
  ['¿Y si dos canciones son del mismo año?', 'Sin problema: si el año correcto coincide con uno que ya tienes, la respuesta vale.'],
  ['¿Se ve el ranking?', 'Sí. Puedes revisarlo durante la partida y al final aparece completo.'],
  ['¿Y si alguien se desconecta?', 'Tiene 30 segundos para volver. Mientras tanto, su sitio se guarda.'],
  ['¿La música suena sola al inicio?', 'No. En la pantalla principal la música de Dedícalo solo suena cuando tocas reproducir.'],
  ['¿Para qué sirven los puntos?', `Solo para sabotear a un rival (${ATTACK_COST} pts) o canjear una canción de progreso (${REDEEM_YEAR_COST} pts). Quién gana lo decide la ruta de años, nunca los puntos por sí solos.`],
  ['¿Puedo elegir a quién sabotear?', 'Sí, y qué golpe usar: Bloqueo (no responde esa ronda) o Robo de año (si acierta, te quedas su año). No puedes sabotear a alguien desconectado ni a quien ya han saboteado esa ronda.']
];

// Anillo de foco común: visible con teclado, invisible al tocar.
const FOCO = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-neon-green';

/* Tres formas de pantalla, medidas en JS porque el escritorio también es
   "apaisado" (la app pone play-landscape siempre que sobra ancho) y lo que
   importa aquí es si falta ALTO:
   - 'apaisado': móvil girado, poco alto → dibujo a la izquierda, texto a la derecha, sin scroll.
   - 'ancho': tablet girada / escritorio → igual en dos columnas, pero a lo grande.
   - 'vertical': móvil o tablet de pie → dibujo arriba, texto debajo. */
function leerModo() {
  if (typeof window === 'undefined') return 'vertical';
  const { innerWidth: w, innerHeight: h } = window;
  if (w > h && h < 600) return 'apaisado';
  if (w >= 1024 && w > h) return 'ancho';
  return 'vertical';
}

function suscribirResize(aviso) {
  window.addEventListener('resize', aviso);
  return () => window.removeEventListener('resize', aviso);
}

function useModoPantalla() {
  return useSyncExternalStore(suscribirResize, leerModo, () => 'vertical');
}

// Medidas por modo. El texto va en rem para que crezca con fs-large / fs-xl;
// el dibujo, en alto de pantalla, porque es lo que se puede sacrificar.
const ESTILO = {
  vertical: {
    tarjeta: 'grid-cols-1 max-w-[40rem]',
    dibujo: { height: 'clamp(150px, min(36svh, calc(100svh - 24rem)), 440px)', borderRadius: 'calc(1.75rem - 1px) calc(1.75rem - 1px) 0 0' },
    titulo: 'text-[min(2rem,8.6vw)] sm:text-[2.6rem]',
    texto: 'text-[1rem] sm:text-[1.2rem]',
    cuerpo: 'p-4 sm:p-7 gap-3 sm:gap-5'
  },
  apaisado: {
    tarjeta: 'grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] max-w-[60rem]',
    dibujo: { height: '100%', minHeight: '180px', borderRadius: 'calc(1.75rem - 1px) 0 0 calc(1.75rem - 1px)' },
    titulo: 'text-[1.55rem]',
    texto: 'text-[1rem]',
    cuerpo: 'px-5 py-3 gap-2.5'
  },
  ancho: {
    tarjeta: 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-w-[60rem]',
    dibujo: { height: 'clamp(320px, 58vh, 500px)', borderRadius: 'calc(1.75rem - 1px) 0 0 calc(1.75rem - 1px)' },
    titulo: 'text-[2.8rem]',
    texto: 'text-[1.22rem]',
    cuerpo: 'p-10 gap-6'
  }
};

function Seccion({ titulo, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
      <h3 className="mb-3 font-label-caps text-label-caps uppercase text-neon-green">{titulo}</h3>
      {children}
    </section>
  );
}

export default function HowToPlayScreen() {
  const navigate = useNavigate();
  const reducir = useReducedMotion();
  const modo = useModoPantalla();
  const estilo = ESTILO[modo];

  const [actual, setActual] = useState(0);
  // Dirección del último cambio, para que la carta entre por el lado correcto.
  const [direccion, setDireccion] = useState(1);
  const [reglasAbiertas, setReglasAbiertas] = useState(false);

  const pantallaRef = useRef(null);
  const reglasRef = useRef(null);
  const idReglas = useId();

  const irA = useCallback((indice) => {
    const destino = Math.max(0, Math.min(ULTIMO, indice));
    if (destino === actual) return;
    setDireccion(destino > actual ? 1 : -1);
    setActual(destino);
  }, [actual]);

  const siguiente = useCallback(() => irA(actual + 1), [irA, actual]);
  const anterior = useCallback(() => irA(actual - 1), [irA, actual]);

  // Flechas del teclado en toda la pantalla, salvo si se está escribiendo.
  useEffect(() => {
    const alPulsar = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const objetivo = e.target;
      if (objetivo instanceof HTMLElement && (objetivo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(objetivo.tagName))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [siguiente, anterior]);

  // Deslizar con el dedo: solo cuenta si el gesto es claramente horizontal,
  // para no robarle el scroll vertical a la página.
  const alSoltarGesto = (_evento, info) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) < Math.abs(offset.y)) return;
    if (offset.x < -50 || velocity.x < -400) siguiente();
    else if (offset.x > 50 || velocity.x > 400) anterior();
  };

  const alternarReglas = () => {
    const abrir = !reglasAbiertas;
    setReglasAbiertas(abrir);
    if (abrir) {
      // Al abrir, se lleva la vista hasta las reglas (después de pintarlas).
      requestAnimationFrame(() => {
        reglasRef.current?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
      });
    }
  };

  const volverArriba = () => {
    pantallaRef.current?.scrollTo({ top: 0, behavior: reducir ? 'auto' : 'smooth' });
  };

  const nivel = NIVELES[actual];
  const esUltimo = actual === ULTIMO;
  const { Ilustracion } = nivel;
  const desplazamiento = reducir ? 0 : 60;
  const apaisado = modo === 'apaisado';

  return (
    <motion.main
      ref={pantallaRef}
      lang="es"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="app-screen relative z-10 overflow-y-auto no-scrollbar"
      // En apaisado la app quita el margen derecho de .app-screen (lo reserva
      // para una barra que esta pantalla no tiene): se repone aquí.
      style={{ paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
    >
      {/* Cabecera: volver y saltar. Pegada arriba mientras se hace scroll. */}
      <header
        className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-2 bg-background/90 px-4 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`flex min-h-touch items-center gap-1.5 rounded-xl pr-2 font-label-caps text-label-caps uppercase text-on-surface-variant transition-colors hover:text-white ${FOCO}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[1.5rem]">arrow_back</span>
          Volver
        </button>
        <p className="hidden min-w-0 truncate font-label-caps text-micro-caps uppercase text-on-surface-variant/70 sm:block">Tutorial</p>
        <button
          type="button"
          onClick={() => irA(ULTIMO)}
          disabled={esUltimo}
          aria-label="Saltar al último paso"
          className={`flex min-h-touch items-center gap-1 rounded-xl pl-2 font-label-caps text-label-caps uppercase text-white transition-opacity hover:text-neon-green disabled:pointer-events-none disabled:opacity-0 ${FOCO}`}
        >
          Saltar
          <span aria-hidden="true" className="material-symbols-outlined text-[1.5rem]">arrow_forward</span>
        </button>
      </header>

      {/* ── El tutorial ─────────────────────────────────────────────── */}
      <section
        aria-roledescription="carrusel"
        aria-label="Tutorial: cómo se juega"
        // De pie y en escritorio, el tutorial se centra en el alto que queda
        // libre; si no cabe (móvil pequeño, letra XL) simplemente empieza arriba.
        className={apaisado ? 'pb-2 pt-1' : 'flex min-h-[calc(100svh-52px-env(safe-area-inset-top,0px))] flex-col justify-center pb-4 pt-2 sm:pt-6'}
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`Paso ${actual + 1} de ${NIVELES.length}: ${nivel.titulo}`}
        </p>

        <div
          className={`mx-auto grid w-full rounded-[1.75rem] border bg-[#0a0f24] ${estilo.tarjeta}`}
          style={{
            borderColor: `${nivel.color}55`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 24px 70px rgba(0,0,0,0.5), 0 0 60px ${nivel.color}22`,
            transition: 'border-color 300ms, box-shadow 300ms',
            // Girado: la carta ocupa justo el alto que queda bajo la cabecera.
            height: apaisado ? 'calc(100svh - 52px - env(safe-area-inset-top, 0px) - 1.25rem)' : undefined
          }}
        >
          {/* Escenario del dibujo. Se desliza con el dedo. */}
          <motion.div
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${actual + 1} de ${NIVELES.length}`}
            onPanEnd={alSoltarGesto}
            className="relative overflow-hidden"
            style={{
              ...estilo.dibujo,
              containerType: 'size',
              touchAction: 'pan-y',
              background: `radial-gradient(ellipse at 50% 60%, ${nivel.color}2e, transparent 65%), linear-gradient(180deg, #0d1330, #070a1c)`,
              transition: 'background 300ms'
            }}
          >
            {/* Suelo de "escenario": rejilla en perspectiva muy tenue */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-40"
              style={{
                backgroundImage: `linear-gradient(${nivel.color}33 1px, transparent 1px), linear-gradient(90deg, ${nivel.color}33 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
                maskImage: 'linear-gradient(to top, black, transparent)',
                WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
                transform: 'perspective(200px) rotateX(55deg)',
                transformOrigin: 'bottom'
              }}
            />
            <AnimatePresence initial={false} custom={direccion}>
              <motion.div
                key={nivel.id}
                aria-hidden="true"
                className="absolute inset-0"
                custom={direccion}
                variants={{
                  entra: (d) => ({ x: d * desplazamiento, opacity: 0, scale: reducir ? 1 : 0.94 }),
                  centro: { x: 0, opacity: 1, scale: 1 },
                  sale: (d) => ({ x: -d * desplazamiento, opacity: 0, scale: reducir ? 1 : 0.94 })
                }}
                initial="entra"
                animate="centro"
                exit="sale"
                transition={{ duration: reducir ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <Ilustracion
                  animar={!reducir}
                  meta={TIMELINE_GOAL_YEARS}
                  costeSabotaje={ATTACK_COST}
                  costeCanje={REDEEM_YEAR_COST}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Texto + controles */}
          <div className={`flex min-h-0 min-w-0 flex-col ${estilo.cuerpo} ${apaisado ? 'overflow-y-auto no-scrollbar' : ''} ${modo === 'ancho' ? 'justify-center' : ''}`}>
            {/* Barra de progreso por segmentos: también sirve para saltar */}
            <div className="flex items-center gap-1.5">
              {NIVELES.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => irA(i)}
                  aria-label={`Ir al paso ${i + 1}: ${n.titulo}`}
                  aria-current={i === actual ? 'step' : undefined}
                  className={`group flex h-6 flex-1 items-center rounded-full ${FOCO}`}
                >
                  <span
                    className="block h-1.5 w-full rounded-full transition-colors duration-300"
                    style={{
                      background: i <= actual ? nivel.color : 'rgba(255,255,255,0.14)',
                      boxShadow: i === actual ? `0 0 12px ${nivel.color}` : 'none'
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Todas las cartas de texto apiladas en la misma celda: la más
                alta fija la altura y los botones no bailan al cambiar. */}
            <motion.div className="grid min-w-0 flex-1" onPanEnd={alSoltarGesto} style={{ touchAction: 'pan-y' }}>
              {NIVELES.map((n, i) => {
                const activo = i === actual;
                return (
                  <motion.div
                    key={n.id}
                    aria-hidden={!activo}
                    className={`min-w-0 [grid-area:1/1] ${activo ? '' : 'invisible'}`}
                    initial={false}
                    animate={{ opacity: activo ? 1 : 0, x: activo ? 0 : (i < actual ? -1 : 1) * (reducir ? 0 : 24) }}
                    transition={{ duration: reducir ? 0.01 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="font-label-caps text-label-caps uppercase" style={{ color: n.color }}>
                      Nivel {i + 1}/{NIVELES.length} · {n.corto}
                    </p>
                    <h1
                      className={`mt-1 font-headline-lg font-black leading-[1.05] tracking-[-0.02em] text-white [overflow-wrap:anywhere] [text-wrap:balance] ${estilo.titulo}`}
                    >
                      {n.titulo}
                    </h1>
                    <div className={`${apaisado ? 'mt-1.5 space-y-1' : 'mt-3 space-y-2'} leading-snug text-on-surface-variant ${estilo.texto}`}>
                      {n.lineas.map((linea) => <p key={linea}>{linea}</p>)}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Anterior / Siguiente. En el último nivel el mismo botón se
                convierte en "¡A JUGAR!" (mismo elemento: el foco no se pierde). */}
            <div
              className={`flex items-stretch gap-3 ${modo === 'vertical' ? 'sticky bottom-0 z-10 -mx-4 -mb-4 rounded-b-[1.75rem] bg-[#0a0f24] px-4 shadow-[0_-18px_16px_-6px_#0a0f24] pb-4 pt-2 sm:-mx-7 sm:-mb-7 sm:px-7 sm:pb-7' : ''}`}
              // El sticky se mide contra el borde interior de <main>, que tiene su
              // propio padding inferior: se baja esa misma cantidad para pegarse
              // al borde real de la pantalla y no dejar ver texto por debajo.
              style={modo === 'vertical' ? {
                bottom: 'calc(-1.25rem - env(safe-area-inset-bottom, 0px))',
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
              } : undefined}
            >
              <button
                type="button"
                onClick={anterior}
                disabled={actual === 0}
                aria-label="Anterior"
                className={`flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/[0.12] disabled:opacity-30 ${FOCO}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[1.6rem]">arrow_back</span>
              </button>
              <button
                type="button"
                onClick={esUltimo ? () => navigate('/role-selection') : siguiente}
                className={
                  esUltimo
                    ? `btn-primario min-w-0 flex-1 !min-h-touch !px-3 whitespace-nowrap !text-[min(1.2rem,5.6vw)] !tracking-[0.1em] ${FOCO} ${apaisado ? '' : 'sm:!min-h-[4rem]'}`
                    : `flex min-h-touch min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border px-3 font-label-caps text-[min(1.05rem,5.2vw)] font-black uppercase tracking-[0.1em] text-white transition-colors ${FOCO}`
                }
                style={esUltimo ? undefined : { borderColor: `${nivel.color}99`, background: `${nivel.color}1f` }}
              >
                {esUltimo ? '¡A jugar!' : 'Siguiente'}
                <span aria-hidden="true" className="material-symbols-outlined text-[1.5rem]">
                  {esUltimo ? 'play_arrow' : 'arrow_forward'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Reglas completas: plegadas, para quien quiera el detalle */}
        <div className={`mx-auto flex w-full justify-center ${apaisado ? 'mt-3' : 'mt-5'} ${estilo.tarjeta.split(' ').find((c) => c.startsWith('max-w'))}`}>
          <button
            type="button"
            onClick={alternarReglas}
            aria-expanded={reglasAbiertas}
            aria-controls={idReglas}
            className={`flex min-h-touch items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 font-label-caps text-label-caps uppercase text-white/85 transition-colors hover:bg-white/[0.09] ${FOCO}`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[1.4rem] text-neon-green">library_music</span>
            Reglas completas
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-[1.4rem] transition-transform ${reglasAbiertas ? 'rotate-180' : ''}`}
            >
              expand_more
            </span>
          </button>
        </div>
      </section>

      {/* ── Referencia ─────────────────────────────────────────────── */}
      <div id={idReglas} ref={reglasRef} hidden={!reglasAbiertas} className="mx-auto w-full max-w-[60rem] scroll-mt-16 pb-6">
        <h2 className="mb-4 mt-2 font-headline-lg text-[1.6rem] font-black leading-tight text-white sm:text-[2rem]">Reglas completas</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Seccion titulo="Quién es quién">
            <ul className="space-y-2">
              {ROLES.map(([rol, texto]) => (
                <li key={rol} className="rounded-2xl bg-black/25 px-4 py-3">
                  <span className="font-black text-white">{rol}. </span>
                  <span className="text-on-surface-variant">{texto}</span>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo="Puntos">
            <ul className="flex flex-wrap gap-2">
              {PUNTOS.map((p) => (
                <li
                  key={p.etiqueta}
                  className="flex items-baseline gap-2 rounded-full border px-3.5 py-1.5"
                  style={{ borderColor: `${p.color}55`, background: `${p.color}14` }}
                >
                  <span className="font-stats-xl text-[1.3rem] font-bold leading-none" style={{ color: p.color }}>{p.valor}</span>
                  <span className="font-label-caps text-[0.95rem] font-bold uppercase tracking-[0.1em] text-white/85">{p.etiqueta}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 leading-snug text-on-surface-variant">
              {`El +${SPEED_BONUS_POINTS} es para quien acierta primero en la ronda. Los puntos nunca ganan solos: gana quien completa la ruta (${TIMELINE_GOAL_YEARS} canciones recomendadas; el anfitrión puede cambiarlo).`}
            </p>
          </Seccion>

          <Seccion titulo={`Sabotajes · ${ATTACK_COST} pts`}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SABOTAJES.map((s) => (
                <article key={s.titulo} className="rounded-2xl border border-electric-purple/35 bg-electric-purple/10 p-3.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[1.5rem] text-electric-purple">{s.icono}</span>
                    <h4 className="font-black text-white">{s.titulo}</h4>
                  </div>
                  <p className="mt-1.5 leading-snug text-on-surface-variant">{s.texto}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 leading-snug text-on-surface-variant">
              Se lanza antes de que suene la pregunta, contra un rival conectado. Quien lo recibe ve una alerta grande: quién le atacó, qué golpe usó y qué pasará en su respuesta.
            </p>
          </Seccion>

          <Seccion titulo={`Canjear · ${REDEEM_YEAR_COST} pts`}>
            <article className="rounded-2xl border border-chaos-gold/35 bg-chaos-gold/10 p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chaos-gold text-black">
                  <span aria-hidden="true" className="material-symbols-outlined text-[1.3rem]">star</span>
                </span>
                <h4 className="font-black text-white">Botón CANJEAR</h4>
              </div>
              <p className="mt-1.5 leading-snug text-on-surface-variant">
                Está junto a SABOTEAR mientras suena la música. Compras una canción de progreso sin acertarla de oído.
              </p>
            </article>
            <p className="mt-3 leading-snug text-on-surface-variant">
              En tu ruta aparece como un círculo dorado con estrella en vez de un año, y cuenta igual para la meta.
            </p>
          </Seccion>
        </div>

        <div className="mt-4">
          <Seccion titulo="Dudas rápidas">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:items-start">
              {FAQ.map(([pregunta, respuesta]) => (
                <details key={pregunta} className="group rounded-2xl border border-white/10 bg-black/25">
                  <summary className={`flex min-h-touch cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-2.5 [&::-webkit-details-marker]:hidden ${FOCO}`}>
                    <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[1.4rem] text-neon-green">help</span>
                    <span className="flex-1 font-black leading-snug text-white">{pregunta}</span>
                    <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="px-4 pb-4 leading-relaxed text-on-surface-variant">{respuesta}</p>
                </details>
              ))}
            </div>
          </Seccion>
        </div>

        <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center sm:p-6">
          <p className="font-label-caps text-micro-caps uppercase text-on-surface-variant">Opcional</p>
          <h3 className="mt-1 text-[1.3rem] font-black leading-tight text-white">¿Quieres jugar con tu propia playlist?</h3>
          <p className="mx-auto mt-2 max-w-2xl leading-relaxed text-on-surface-variant">
            Las playlists oficiales ya vienen listas. Si quieres añadir una propia, escríbenos con el link y la revisamos para cuidar años, repetidas y calidad.
          </p>
          <div className="mx-auto mt-4 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <SupportButton compact className="!h-auto min-h-touch w-full border-white/10 bg-black/20 text-white/85" />
            <button
              type="button"
              onClick={() => openMailto(getPlaylistRequestUrl())}
              className={`flex min-h-touch items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 font-label-caps text-sm tracking-[0.14em] text-white/85 transition-colors hover:bg-white/[0.08] ${FOCO}`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl text-vinyl-orange">playlist_add</span>
              Enviar playlist
            </button>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-[0.85rem] leading-relaxed text-on-surface-variant [overflow-wrap:anywhere]">
            Contacto: {SUPPORT_EMAIL}. Dedícalo reproduce fragmentos de vista previa de 30 segundos servidos públicamente por sus proveedores. No aloja, descarga ni redistribuye audio.
          </p>
        </section>

        <div className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => navigate('/role-selection')} className={`btn-primario ${FOCO}`}>
            ¡Ya sé jugar!
          </button>
          <button
            type="button"
            onClick={volverArriba}
            className={`flex min-h-touch items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-4 font-label-caps text-label-caps uppercase text-white ${FOCO}`}
          >
            Volver al tutorial
          </button>
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </motion.main>
  );
}

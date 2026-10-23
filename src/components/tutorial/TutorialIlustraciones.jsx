import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/* ── Ilustraciones del tutorial ────────────────────────────────────────────
   Todo con CSS + framer-motion: nada de imágenes que pesen o se pixelen.

   Las medidas van en `cqmin` (el lado corto del recuadro que las contiene,
   que lleva `container-type: size`). Así la misma ilustración llena igual de
   bien el hueco de 288×200 de un móvil pequeño que el de 480×480 de un
   escritorio, sin un solo breakpoint. El texto de aquí es decorativo (años,
   PIN, cifras): no crece con fs-large / fs-xl a propósito, para que nunca se
   salga del dibujo. Lo que hay que leer de verdad está fuera, en la tarjeta.

   `animar` llega a false con prefers-reduced-motion o si la tarjeta no es la
   activa: entonces se pinta una pose fija que se entiende igual.
─────────────────────────────────────────────────────────────────────────── */

const u = (n) => `${n}cqmin`;

const SURCOS = 'repeating-radial-gradient(circle, #0b0b0b 0px, #0b0b0b 2px, #191919 3px, #191919 5px, #0b0b0b 6px, #0b0b0b 9px)';

// Bucle suave que se repite; si no hay que animar, no se pasa nada.
const bucle = (animar, keyframes, extra = {}) => (animar
  ? { animate: keyframes, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', ...extra } }
  : {});

function Icono({ nombre, tam, color }) {
  return (
    <span aria-hidden="true" className="material-symbols-outlined leading-none" style={{ fontSize: tam, color }}>
      {nombre}
    </span>
  );
}

/* ── 1 · Junta a tu gente: móvil con PIN + QR y avatares que entran ──── */

// QR de mentira pero con pinta de QR: los tres "ojos" de esquina y ruido fijo.
const QR = [
  '1110101',
  '1010011',
  '1110110',
  '0001010',
  '1110011',
  '1010100',
  '1110101'
];

const AVATARES = [
  { emoji: '😎', x: -36, y: -22, color: '#39ff14' },
  { emoji: '🦊', x: 36, y: -24, color: '#ff7a1a' },
  { emoji: '🐼', x: -38, y: 22, color: '#ffbf4d' },
  { emoji: '🎧', x: 37, y: 20, color: '#a855f7' }
];

export function IlustracionSala({ animar }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Ondas de "señal" saliendo del móvil */}
      {animar && [0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-2 border-electric-purple/50"
          style={{ width: u(46), height: u(46) }}
          initial={{ scale: 0.8, opacity: 0.7 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        className="relative flex flex-col items-center justify-center border-white/25 bg-[#0b1022] shadow-[0_0_40px_rgba(168,85,247,0.35)]"
        style={{ width: u(36), height: u(60), borderRadius: u(6), borderWidth: u(0.9), gap: u(2.5) }}
        {...bucle(animar, { y: [0, -4, 0] }, { duration: 3 })}
      >
        <span className="font-label-caps text-electric-purple" style={{ fontSize: u(4.2), letterSpacing: '0.2em' }}>PIN</span>
        <span className="font-stats-xl font-bold text-white" style={{ fontSize: u(6.4), letterSpacing: '0.04em' }}>873 216</span>
        <div
          className="grid bg-white"
          style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: u(20), height: u(20), padding: u(1.4), borderRadius: u(1.6) }}
        >
          {QR.join('').split('').map((bit, i) => (
            <span key={i} style={{ background: bit === '1' ? '#050816' : 'transparent' }} />
          ))}
        </div>
      </motion.div>

      {AVATARES.map((a, i) => (
        <motion.span
          key={a.emoji}
          className="absolute flex items-center justify-center rounded-full bg-[#0b1022]"
          style={{
            width: u(15),
            height: u(15),
            fontSize: u(8),
            left: `calc(50% + ${u(a.x)} - ${u(7.5)})`,
            top: `calc(50% + ${u(a.y)} - ${u(7.5)})`,
            border: `${u(0.8)} solid ${a.color}`,
            boxShadow: `0 0 ${u(4)} ${a.color}66`
          }}
          initial={animar ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.25 + i * 0.22 }}
        >
          <span aria-hidden="true">{a.emoji}</span>
        </motion.span>
      ))}
    </div>
  );
}

/* ── 2 · Escucha: vinilo girando, ecualizador y la ficha oculta ─────────── */

const BARRAS = [0.55, 0.9, 0.4, 0.75];

function Ecualizador({ animar, lado }) {
  return (
    <div className="absolute flex items-end" style={{ [lado]: '7%', top: '50%', height: u(26), marginTop: u(-17), gap: u(1.6) }}>
      {BARRAS.map((h, i) => (
        <motion.span
          key={i}
          className="block origin-bottom rounded-full bg-vinyl-orange"
          style={{ width: u(2.6), height: '100%', scaleY: h, boxShadow: '0 0 10px rgba(255,122,26,0.6)' }}
          {...(animar
            ? { animate: { scaleY: [h, 0.2, 1, h * 0.6, h] }, transition: { duration: 1.1 + i * 0.17, repeat: Infinity, ease: 'easeInOut' } }
            : {})}
        />
      ))}
    </div>
  );
}

export function IlustracionEscucha({ animar }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: u(5) }}>
      <Ecualizador animar={animar} lado="left" />
      <Ecualizador animar={animar} lado="right" />

      <div className="relative" style={{ width: u(60), height: u(60) }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: SURCOS, boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 18px 50px rgba(0,0,0,0.6), 0 0 60px rgba(255,122,26,0.25)' }}
          {...(animar ? { animate: { rotate: 360 }, transition: { duration: 3.2, repeat: Infinity, ease: 'linear' } } : {})}
        >
          {/* Brillo del vinilo: gira con él y delata el movimiento */}
          <span className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 20deg, transparent 0 12%, rgba(255,255,255,0.13) 16%, transparent 22% 62%, rgba(255,255,255,0.09) 66%, transparent 72%)' }} />
          <span
            className="absolute rounded-full bg-vinyl-orange"
            style={{ inset: '32%', boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.25)' }}
          />
        </motion.div>
        <span
          className="absolute inset-0 flex items-center justify-center font-headline-lg font-black text-black"
          style={{ fontSize: u(11) }}
        >
          ?
        </span>
      </div>

      {/* Lo que nadie ve: título, artista y año tapados */}
      <div
        className="flex items-center border border-white/15 bg-black/50 font-stats-xl text-white/80"
        style={{ gap: u(2), padding: `${u(1.6)} ${u(3.4)}`, borderRadius: u(10), fontSize: u(4.4) }}
      >
        <span aria-hidden="true">🎵</span>
        <span className="tracking-widest">???? · ????</span>
      </div>
    </div>
  );
}

/* ── 3 · Coloca el año: ruta 1985 · [+] · 1998 con el hueco brillando ─── */

function ChipAno({ ano }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center border border-white/20 bg-[#0b1022] font-stats-xl font-bold text-white"
      style={{ width: u(23), height: u(15), borderRadius: u(3.5), fontSize: u(6.2) }}
    >
      {ano}
    </span>
  );
}

function HuecoLateral() {
  return (
    <span
      className="flex shrink-0 items-center justify-center border-dashed border-white/20 text-white/35"
      style={{ width: u(9), height: u(15), borderRadius: u(3), borderWidth: u(0.6), fontSize: u(6) }}
    >
      +
    </span>
  );
}

export function IlustracionRuta({ animar }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: u(5) }}>
      {/* La canción misteriosa, cayendo hacia el hueco */}
      <motion.div
        className="flex flex-col items-center justify-center border border-white/25 text-white"
        style={{
          width: u(17),
          height: u(21),
          borderRadius: u(3.5),
          background: 'linear-gradient(160deg, #a855f7, #5b21b6)',
          boxShadow: '0 10px 30px rgba(168,85,247,0.45)',
          fontSize: u(8)
        }}
        {...bucle(animar, { y: [0, 10, 0], rotate: [-4, 2, -4] }, { duration: 1.8 })}
      >
        <span aria-hidden="true">🎵</span>
        <span className="font-headline-lg font-black leading-none" style={{ fontSize: u(6) }}>?</span>
      </motion.div>

      <div className="relative flex items-center" style={{ gap: u(2.2) }}>
        {/* La línea de la ruta, por detrás de los chips */}
        <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-white/15" style={{ height: u(0.7) }} />
        <HuecoLateral />
        <ChipAno ano="1985" />
        <motion.span
          className="relative flex shrink-0 items-center justify-center border-dashed border-neon-green bg-neon-green/15 font-black text-neon-green"
          style={{
            width: u(19),
            height: u(17),
            borderRadius: u(3.5),
            borderWidth: u(0.8),
            fontSize: u(10),
            boxShadow: '0 0 24px rgba(57,255,20,0.55), inset 0 0 18px rgba(57,255,20,0.25)'
          }}
          {...bucle(animar, {
            boxShadow: [
              '0 0 14px rgba(57,255,20,0.35), inset 0 0 10px rgba(57,255,20,0.15)',
              '0 0 34px rgba(57,255,20,0.8), inset 0 0 22px rgba(57,255,20,0.35)',
              '0 0 14px rgba(57,255,20,0.35), inset 0 0 10px rgba(57,255,20,0.15)'
            ],
            scale: [1, 1.06, 1]
          }, { duration: 1.6 })}
        >
          +
        </motion.span>
        <ChipAno ano="1998" />
        <HuecoLateral />
      </div>

      <motion.span
        aria-hidden="true"
        style={{ fontSize: u(10), marginTop: u(-3) }}
        {...bucle(animar, { y: [0, -6, 0], scale: [1, 0.92, 1] }, { duration: 1.6 })}
      >
        👆
      </motion.span>
    </div>
  );
}

/* ── 4 · Gana o pierde: marcador que salta y la ruta hacia la meta ──────── */

// Una pequeña partida en bucle: cada paso es un evento de ronda.
const JUGADAS = [
  { puntos: 10, ruta: 3, delta: null },
  { puntos: 15, ruta: 4, delta: { txt: '+5', color: '#39ff14' } },
  { puntos: 16, ruta: 4, delta: { txt: '+1 ⚡', color: '#ffbf4d' } },
  { puntos: 13, ruta: 4, delta: { txt: '−3', color: '#ff6b8b' } },
  { puntos: 18, ruta: 5, delta: { txt: '+5', color: '#39ff14' } }
];

export function IlustracionPuntos({ animar, meta }) {
  const [paso, setPaso] = useState(1);

  useEffect(() => {
    if (!animar) return undefined;
    const id = setInterval(() => setPaso((p) => (p + 1) % JUGADAS.length), 1500);
    return () => clearInterval(id);
  }, [animar]);

  const jugada = animar ? JUGADAS[paso] : JUGADAS[1];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: u(5) }}>
      <div className="relative flex items-end" style={{ gap: u(2) }}>
        <motion.span
          key={jugada.puntos}
          className="font-stats-xl font-bold leading-none text-white"
          style={{ fontSize: u(26), textShadow: '0 0 30px rgba(255,191,77,0.45)' }}
          initial={animar ? { scale: 1.25 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {jugada.puntos}
        </motion.span>
        <span className="font-label-caps text-chaos-gold" style={{ fontSize: u(6), paddingBottom: u(2.5), letterSpacing: '0.14em' }}>PTS</span>

        {jugada.delta && (
          <motion.span
            key={`d-${paso}`}
            className="absolute whitespace-nowrap font-stats-xl font-bold"
            style={{
              right: u(-20),
              top: u(-4),
              fontSize: u(7.5),
              color: jugada.delta.color,
              padding: `${u(0.6)} ${u(2.4)}`,
              borderRadius: u(6),
              background: `${jugada.delta.color}22`,
              border: `1px solid ${jugada.delta.color}88`
            }}
            initial={animar ? { y: 10, opacity: 0, scale: 0.6 } : false}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
          >
            {jugada.delta.txt}
          </motion.span>
        )}
      </div>

      {/* La ruta: casillas hasta la meta. Es lo que gana, no los puntos. */}
      <div className="flex flex-col items-center" style={{ gap: u(2) }}>
        <div className="flex" style={{ gap: u(1.1) }}>
          {Array.from({ length: meta }, (_, i) => {
            const llena = i < jugada.ruta;
            return (
              <span
                key={i}
                className={llena ? 'bg-neon-green' : 'bg-white/10'}
                style={{
                  width: u(5.2),
                  height: u(7),
                  borderRadius: u(1.2),
                  boxShadow: llena ? '0 0 10px rgba(57,255,20,0.55)' : 'none',
                  transition: 'background-color 300ms, box-shadow 300ms'
                }}
              />
            );
          })}
          <span aria-hidden="true" style={{ fontSize: u(7), marginLeft: u(1), lineHeight: 1 }}>🏆</span>
        </div>
        <span className="font-label-caps text-white/70" style={{ fontSize: u(4.4), letterSpacing: '0.16em' }}>
          RUTA {jugada.ruta}/{meta}
        </span>
      </div>
    </div>
  );
}

/* ── 5 · Sabotea y canjea: las dos fichas de poder ──────────────────────── */

function Ficha({ animar, icono, coste, nombre, sub, color, giro, retraso }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center"
      style={{
        width: u(40),
        height: u(56),
        borderRadius: u(5),
        rotate: giro,
        gap: u(1.4),
        background: `linear-gradient(165deg, ${color}40, #0b1022 70%)`,
        border: `${u(0.7)} solid ${color}`,
        boxShadow: `0 0 34px ${color}55`
      }}
      {...bucle(animar, { y: [0, -8, 0], rotate: [giro, giro * 0.4, giro] }, { duration: 2.6, delay: retraso })}
    >
      <Icono nombre={icono} tam={u(13)} color={color} />
      <span className="font-stats-xl font-bold leading-none text-white" style={{ fontSize: u(9) }}>{coste}</span>
      <span className="font-label-caps font-black" style={{ fontSize: u(4.6), color, letterSpacing: '0.12em' }}>{nombre}</span>
      <span className="font-label-caps text-white/70" style={{ fontSize: u(4.6), letterSpacing: '0.04em', lineHeight: 1.15 }}>{sub}</span>
    </motion.div>
  );
}

export function IlustracionPoderes({ animar, costeSabotaje, costeCanje }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ gap: u(6) }}>
      <Ficha animar={animar} icono="bolt" coste={`${costeSabotaje} pts`} nombre="SABOTAJE" sub={<>Bloqueo<br />Robo de año</>} color="#a855f7" giro={-6} retraso={0} />
      <Ficha animar={animar} icono="star" coste={`${costeCanje} pts`} nombre="CANJE" sub={<>+1 canción<br />de progreso</>} color="#ffbf4d" giro={6} retraso={1.3} />
    </div>
  );
}

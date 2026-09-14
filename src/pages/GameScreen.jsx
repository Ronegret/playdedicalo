import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTACK_COST, ATTACK_TYPES, DEDICALO_PLAYLISTS, GAME_MODES, REDEEM_YEAR_COST, getCombinedTimelineYears, getPlayerPresence, getTimelineProgress, normalizeSabotageTypes, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';
import HeaderHUD from '../components/HeaderHUD';
import RotatePrompt from '../components/RotatePrompt';
import { useOrientation } from '../hooks/useOrientation';
import JoinRequestBanner from '../components/JoinRequestBanner';
import { crearPreguntaDeCancion } from '../services/preguntas';
import { alTerminarFragmento, duracionFragmento, desbloquearAudio, getCancionOculta, pararMusica, segundosRestantes, sonarCancionAleatoria } from '../services/musica';
import { sfx, agacharMusica, recuperarMusica } from '../services/audio';
import { vibrar } from '../services/haptics';

const EQUALIZER_BARS = [0.35, 0.58, 0.42, 0.71, 0.49, 0.64, 0.39];

// Segundos de cortesia una vez que ha respondido la mayoria (ver
// softTimerArmed). Suficiente para que un rezagado termine, corto para que
// la partida no se pare.
const SOFT_TIMER_SECONDS = 10;

// Fila compacta de "quién respondió / está bloqueado" durante la ronda,
// para TODOS los jugadores (antes solo lo veía el anfitrión). A propósito
// chica y en una sola fila deslizable — no la lista grande de avatares del
// anfitrión — para no tapar ni empujar lejos el riel donde tienen que
// colocar su respuesta.
function VoteStatusStrip({ players, roundAnswers, isPlayerBlockedThisRound, answerCount, expectedVotes, guestId, secondsLeft = null }) {
  if (!players.length) return null;
  const corriendo = typeof secondsLeft === 'number';
  return (
    <div className={`w-full max-w-sm rounded-xl border px-3 py-2 transition-colors ${corriendo ? 'border-chaos-gold/60 bg-chaos-gold/10' : 'border-white/10 bg-black/25'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-label-caps text-[0.706rem] tracking-[0.16em] text-on-surface-variant">
          {corriendo ? 'ÚLTIMOS SEGUNDOS' : 'RESPONDIERON'}
        </p>
        <div className="flex items-center gap-2">
          {corriendo && (
            <span className="font-label-caps text-sm font-black tabular-nums text-chaos-gold">{secondsLeft}s</span>
          )}
          <p className="font-label-caps text-[0.706rem] font-black text-neon-green">{answerCount}/{expectedVotes}</p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {players.map((player) => {
          const answered = Boolean(roundAnswers?.[player.id]);
          const blocked = isPlayerBlockedThisRound(player);
          const isMe = player.id === guestId;
          return (
            <div key={player.id} className="relative shrink-0" title={`${player.name}${blocked ? ' · bloqueado' : answered ? ' · respondió' : ' · esperando'}`}>
              {isImageAvatar(player.avatar) ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className={`h-9 w-9 rounded-full object-cover border-2 transition-all ${blocked ? 'border-vinyl-orange opacity-70' : answered ? 'border-neon-green' : 'border-white/15 opacity-40'} ${isMe ? 'ring-2 ring-offset-1 ring-offset-black ring-white/40' : ''}`}
                />
              ) : (
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm bg-black/30 border-2 transition-all ${blocked ? 'border-vinyl-orange opacity-70' : answered ? 'border-neon-green' : 'border-white/15 opacity-40'} ${isMe ? 'ring-2 ring-offset-1 ring-offset-black ring-white/40' : ''}`}>
                  {player.avatar || '•'}
                </div>
              )}
              {blocked ? (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-vinyl-orange">
                  <span className="material-symbols-outlined text-black" style={{ fontSize: '10px', lineHeight: 1 }}>block</span>
                </span>
              ) : answered && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neon-green">
                  <span className="material-symbols-outlined text-black" style={{ fontSize: '10px', lineHeight: 1 }}>check</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingPeek({ players, guestId, targetYears = 12 }) {
  const [rankOpen, setRankOpen] = useState(false);
  if (!players.length) return null;
  // Gana quien más canciones lleva hacia la meta — los puntos son aparte
  // (sirven para sabotear o canjear), así que el ranking ordena y muestra
  // progreso real, no puntos.
  const sorted = [...players].sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a));
  const myRank = sorted.findIndex((p) => p.id === guestId) + 1;
  const leader = sorted[0];
  const ownPlayer = sorted.find((p) => p.id === guestId);
  const myYears = getTimelineProgress(ownPlayer);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/35 text-left overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      {/* Always-visible strip: position + years */}
      <button
        type="button"
        onClick={() => setRankOpen((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3"
        aria-expanded={rankOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Position badge */}
          <div className="flex flex-col items-center shrink-0">
            <span className={`w-10 h-10 rounded-xl text-base font-black flex items-center justify-center ${myRank === 1 ? 'bg-neon-green text-black shadow-[0_0_16px_rgba(57,255,20,0.4)]' : myRank === 2 ? 'bg-white/20 text-white' : 'bg-white/10 text-on-surface-variant'}`}>
              {myRank || '?'}
            </span>
            <span className="mt-0.5 font-label-caps text-[0.65rem] tracking-[0.12em] text-on-surface-variant">POS</span>
          </div>
          {/* Years progress */}
          <div className="min-w-0">
            <p className="font-label-caps text-[0.706rem] tracking-[0.18em] text-neon-green">TUS AÑOS · META</p>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-stats-xl text-2xl font-black text-white leading-none">{myYears}</span>
              <span className="text-sm text-on-surface-variant font-bold">/{targetYears}</span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-green to-electric-purple transition-all duration-500"
                style={{ width: `${Math.min(100, (myYears / targetYears) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-label-caps text-xs text-on-surface-variant hidden sm:inline">RANKING</span>
          <motion.span
            animate={{ rotate: rankOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            className="material-symbols-outlined text-neon-green text-2xl"
          >
            expand_more
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {rankOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/8 px-3 pb-3 pt-2 flex flex-col gap-2">
              {sorted.map((player, index) => {
                const progress = getTimelineProgress(player);
                const missing = Math.max(0, targetYears - progress);
                const isMe = player.id === guestId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${isMe ? 'bg-neon-green/12 border border-neon-green/30' : 'bg-white/5'}`}
                  >
                    <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center shrink-0 ${index === 0 ? 'bg-neon-green text-black' : index === 1 ? 'bg-white/25 text-white' : 'bg-white/10 text-white'}`}>
                      {index + 1}
                    </span>
                    {isImageAvatar(player.avatar) ? (
                      <img src={player.avatar} alt={player.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-14 h-14 rounded-full bg-black/20 flex items-center justify-center text-2xl shrink-0">{player.avatar || '•'}</span>
                    )}
                    <span className="font-label-caps text-lg font-black uppercase tracking-wide text-white truncate flex-1">{player.name}{isMe ? ' (tú)' : ''}</span>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-neon-green leading-none">{progress}/{targetYears}</p>
                      <p className="mt-0.5 text-[0.706rem] font-bold text-on-surface-variant leading-none">
                        {missing === 0 ? '¡Meta!' : player === leader ? 'Lidera' : `Faltan ${missing}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



function getAttackCopy(attack) {
  const fallback = ATTACK_TYPES[attack?.type] || ATTACK_TYPES.block_vote;
  return {
    title: attack?.title || fallback.name,
    short: fallback.short,
    description: attack?.description || fallback.description,
    icon: fallback.icon
  };
}

const BURST_EMOJI = ['🎵', '🎶', '⚡', '💥', '🔊', '🎧', '✨'];

// Ráfaga de partículas que salen disparadas del centro una sola vez al
// aparecer el ataque — la onda expansiva de la "bomba musical". useState
// perezoso (no useMemo) para generar los ángulos/tamaños aleatorios una
// única vez sin violar las reglas de pureza de React.
function MusicBurst() {
  const [particles] = useState(() => Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 110 + Math.random() * 100;
    return {
      id: i,
      icon: BURST_EMOJI[i % BURST_EMOJI.length],
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance),
      rotate: Math.round((Math.random() - 0.5) * 360),
      delay: Math.random() * 0.12,
      size: 18 + Math.round(Math.random() * 16)
    };
  }));

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.2, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0], scale: [0.2, 1.15, 1, 0.6], rotate: p.rotate }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          className="absolute drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
          style={{ fontSize: p.size }}
        >
          {p.icon}
        </motion.span>
      ))}
    </div>
  );
}

// Cuenta atrás de la mecha antes de la detonación: 3 · 2 · 1 · BOOM. Es lo
// que convierte el aviso en un momento de tensión en vez de un cartel que
// aparece de golpe.
const FUSE_TICKS = ['3', '2', '1'];

function MusicBombFuse({ onDetonate }) {
  const [tick, setTick] = useState(0);
  const detonating = tick >= FUSE_TICKS.length;

  useEffect(() => {
    if (detonating) {
      const boom = window.setTimeout(onDetonate, 280);
      return () => window.clearTimeout(boom);
    }
    vibrar('tic');
    // La mecha acelera: el tono sube segun se acerca la detonacion.
    sfx.tic(Math.max(1, 3 - Math.floor(tick / 2)));
    const next = window.setTimeout(() => setTick((prev) => prev + 1), 430);
    return () => window.clearTimeout(next);
  }, [tick, detonating, onDetonate]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-hidden="true">
      {/* La bomba: un vinilo con la mecha encendida, latiendo cada vez más
          fuerte hasta reventar. */}
      <motion.div
        animate={detonating
          ? { scale: [1, 1.7, 0], opacity: [1, 1, 0] }
          : { scale: [1, 1.14, 1] }}
        transition={detonating
          ? { duration: 0.28, ease: 'easeIn' }
          : { repeat: Infinity, duration: 0.42 }}
        className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/85 shadow-[0_0_60px_rgba(255,60,0,0.8),inset_0_0_28px_rgba(0,0,0,0.9)]"
        style={{ background: 'repeating-radial-gradient(circle, #0a0a0a 0 4px, #1c1c1c 5px 6px, #0a0a0a 7px 10px)' }}
      >
        <span className="material-symbols-outlined text-white" style={{ fontSize: '3rem' }}>bomb</span>
        {/* Chispa de la mecha */}
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 0.22 }}
          className="absolute -top-3 -right-1 h-5 w-5 rounded-full bg-chaos-gold shadow-[0_0_18px_8px_rgba(255,191,77,0.9)]"
        />
        {!detonating && (
          <span className="absolute -bottom-12 font-stats-xl text-4xl font-black text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.85)]">
            {FUSE_TICKS[tick]}
          </span>
        )}
      </motion.div>

      {/* Destello blanco de la detonación */}
      {detonating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.45, times: [0, 0.25, 1] }}
          className="absolute inset-0 bg-white"
        />
      )}
    </div>
  );
}

function AttackWarningOverlay({ attack, onClose }) {
  // Dos actos: la mecha (bomba + cuenta atrás) y la revelación. Antes todo
  // aparecía de golpe y se perdía el momento.
  const [detonated, setDetonated] = useState(false);
  const handleDetonate = useCallback(() => setDetonated(true), []);

  useEffect(() => {
    if (!detonated) return undefined;
    vibrar('sabotaje');
    sfx.sabotaje();
    // La musica se AGACHA, no se corta: el sabotaje tiene que oirse por
    // encima sin que la cancion desaparezca y rompa el ambiente de la sala.
    agacharMusica(0.2, 90);
    const volver = window.setTimeout(() => recuperarMusica(420), 900);
    return () => window.clearTimeout(volver);
  }, [detonated]);

  if (!attack) return null;
  const attackCopy = getAttackCopy(attack);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.2 }}
      /* overflow-y-auto: ANTES era overflow-hidden y con la letra grande el
         contenido no cabía — el botón de cerrar quedaba fuera de pantalla y
         el móvil parecía bloqueado, sin nada visible y sin forma de salir.
         Ahora siempre se puede desplazar y salir. */
      className="fixed inset-0 z-[260] overflow-y-auto overscroll-contain text-center text-white"
      style={{
        background: 'linear-gradient(160deg, #4a00b8 0%, #8b00ff 40%, #c0007a 80%, #ff4400 100%)',
        WebkitOverflowScrolling: 'touch'
      }}
      role="alertdialog"
      aria-modal="true"
    >
      {/* Capas de ambiente (fixed para que no se muevan al desplazar) */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.30),transparent_30%),radial-gradient(circle_at_20%_85%,rgba(255,122,26,0.25),transparent_35%)]" />
      <motion.div
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_60%)]"
      />

      {!detonated && <MusicBombFuse onDetonate={handleDetonate} />}

      {detonated && (
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ opacity: 1, scale: 1, x: [0, -10, 9, -7, 5, -2, 0] }}
          transition={{ opacity: { duration: 0.24 }, scale: { duration: 0.24 }, x: { duration: 0.5, ease: 'easeOut' } }}
          className="relative mx-auto flex min-h-full w-full max-w-sm flex-col items-center px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))]"
        >
          {/* Avatar del atacante — quién te atacó tiene que reconocerse al toque */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            {[0, 0.12, 0.24].map((delay) => (
              <motion.div
                key={delay}
                initial={{ scale: 0.5, opacity: 0.85 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 1, delay, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-white/70"
              />
            ))}
            <MusicBurst />
            <motion.div
              animate={{ rotate: [-3, 3, -3], scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 0.65 }}
              className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/80 bg-black/30 shadow-[0_0_80px_rgba(255,255,255,0.50)]"
            >
              {isImageAvatar(attack.fromAvatar) ? (
                <img src={attack.fromAvatar} alt={attack.from || 'Rival'} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">{attackCopy.icon}</span>
              )}
              <span className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-[#6b10e8]">
                <span className="material-symbols-outlined text-2xl text-white">{attackCopy.icon}</span>
              </span>
            </motion.div>
          </div>

          <p className="mt-5 font-label-caps text-xs tracking-[0.3em] text-white/70">BOMBA MUSICAL</p>
          {/* text-display: acotado por el ancho de pantalla, así nunca
              desborda aunque el usuario tenga la letra al máximo. */}
          <h2 className="text-display mt-1 font-headline-lg font-black leading-[0.9] drop-shadow-[0_8px_30px_rgba(0,0,0,0.40)]">
            TE<br />ATACARON
          </h2>

          <div className="mx-auto mt-4 flex h-7 items-end justify-center gap-1" aria-hidden="true">
            {[0.4, 0.85, 0.55, 1, 0.45, 0.9, 0.6, 0.75, 0.35].map((h, i) => (
              <span
                key={i}
                className="eq-bar w-1.5 rounded-full bg-white/85"
                style={{
                  height: `${h * 100}%`,
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: `${0.35 + (i % 3) * 0.1}s`,
                  boxShadow: '0 0 10px rgba(255,255,255,0.6)'
                }}
              />
            ))}
          </div>

          <div className="mt-4 w-full rounded-2xl border border-white/25 bg-black/35 px-4 py-3">
            <p className="text-base font-black leading-snug text-white">
              <span className="text-chaos-gold">{attack.from || 'Un rival'}</span> lanzó:{' '}
              <span className="text-white">{attackCopy.title}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {attackCopy.description}
            </p>
          </div>

          <p className="mt-3 w-full text-sm leading-relaxed text-white/65">
            {attack.type === 'block_vote'
              ? 'No podrás responder esta ronda. Prepárate para la siguiente.'
              : 'Si aciertas igual, respira: puedes intentarlo, solo que el año no se queda contigo.'}
          </p>

          {/* mt-auto empuja el botón al fondo del contenedor: queda siempre
              al alcance del pulgar y nunca fuera de pantalla. */}
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="mt-auto min-h-touch w-full shrink-0 rounded-2xl bg-white px-5 py-4 font-label-caps text-base font-black tracking-[0.18em] text-[#6b10e8] shadow-[0_8px_0_rgba(53,8,118,0.70)] active:translate-y-1 active:shadow-[0_4px_0_rgba(53,8,118,0.70)] transition-all"
          >
            ¡LO TENGO! JUGAR
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Bloqueado por sabotaje: no hay nada que elegir, solo esperar. Se le avisa
// bien claro por qué (para que no piense que la app se congeló) y se
// muestra igual su ruta actual, sin tocar.
function BlockedPlacement({ attackFrom, attackFromAvatar, playerYears = [], wildcards = 0, targetYears = 12, isHost = false }) {
  const years = playerYears.length ? playerYears : [2000];
  return (
    <div className="mt-5">
      <div className="rounded-3xl border border-vinyl-orange/40 bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.16),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.24)_100%)] p-5 text-center shadow-[0_0_30px_rgba(255,122,26,0.1)]">
        {isImageAvatar(attackFromAvatar) ? (
          <img src={attackFromAvatar} alt={attackFrom || 'Rival'} className="mx-auto h-24 w-24 rounded-full border-2 border-vinyl-orange object-cover shadow-[0_0_20px_rgba(255,122,26,0.45)]" />
        ) : (
          <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '3rem' }}>block</span>
        )}
        <h3 className="mt-2 font-headline-lg text-2xl font-black text-white">BLOQUEADO ESTA RONDA</h3>
        <p className="mt-2 text-base leading-relaxed text-on-surface-variant">
          <span className="font-black text-vinyl-orange">{attackFrom || 'Un rival'}</span> te saboteó: no puedes responder. Cuenta como fallo, pero tu ruta no pierde nada.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          {years.slice(0, targetYears).map((year, index) => (
            <span key={`${year}-${index}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-black/25 text-sm font-black text-white/70">
              {String(year).slice(2)}
            </span>
          ))}
          {wildcards > 0 && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-chaos-gold/50 bg-chaos-gold/10">
              <span className="material-symbols-outlined text-chaos-gold text-lg">star</span>
            </span>
          )}
        </div>
        <p className="mt-4 font-label-caps text-sm tracking-[0.16em] text-vinyl-orange">
          {isHost ? 'TÚ SIGUES AL MANDO — REVELA CUANDO QUIERAS' : 'ESPERANDO A QUE TERMINE LA RONDA...'}
        </p>
      </div>
    </div>
  );
}

// Riel de referencia: la ruta completa de un vistazo, SIN poder tocarla.
// Antes esto era el control de respuesta y obligaba a recorrer hasta 12
// pantallas en horizontal para encontrar un hueco. Ahora solo informa, asi
// que los circulos pueden ser pequenos y no crecen con el ajuste de letra
// (por eso 2.75rem fijo y no var(--vinyl-size)): agrandar la letra ya no
// aleja la ruta.
// Disco de vinilo con el año. Vuelve el look de disco (surcos y etiqueta
// central) porque es la identidad del juego: la ruta se lee como una pila de
// discos, no como una lista.
function VinylDisc({ year, wildcard = false, size }) {
  const color = wildcard ? '#ffbf4d' : '#a855f7';
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 50% 50%, #14101f 0 30%, #0a0810 30% 100%)',
        border: `3px solid ${color}`,
        boxShadow: `0 6px 20px rgba(0,0,0,.45), 0 0 18px ${wildcard ? 'rgba(255,191,77,.28)' : 'rgba(168,85,247,.28)'}`
      }}
    >
      {/* Surcos */}
      <span className="pointer-events-none absolute rounded-full border border-white/10" style={{ inset: '11%' }} />
      <span className="pointer-events-none absolute rounded-full border border-white/5" style={{ inset: '20%' }} />
      <span className="pointer-events-none absolute rounded-full border border-white/5" style={{ inset: '29%' }} />
      {/* Etiqueta central: donde se lee el año de un vistazo */}
      <span
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: '62%',
          height: '62%',
          background: wildcard ? 'rgba(255,191,77,.18)' : 'rgba(168,85,247,.20)',
          border: `1px solid ${color}`
        }}
      >
        {wildcard ? (
          <span className="material-symbols-outlined text-chaos-gold" style={{ fontSize: `calc(${size} * 0.3)` }}>star</span>
        ) : (
          <span className="font-black tabular-nums leading-none text-white" style={{ fontSize: `calc(${size} * 0.235)` }}>
            {year}
          </span>
        )}
      </span>
    </div>
  );
}

// Hueco entre dos discos. Se agranda y se enciende cuando queda centrado en
// el riel: el jugador siempre ve cuál va a elegir sin tener que apuntar con
// el dedo a un círculo pequeño.
/**
 * El hueco ES el botón.
 *
 * Antes había que centrar el hueco deslizando y luego bajar la vista y pulsar
 * "COLOCAR AQUÍ": dos gestos y dos sitios distintos de la pantalla para una
 * sola decisión. Ahora se toca donde va el año y ya está, que es lo que
 * cualquiera intenta hacer la primera vez.
 */
function VinylGap({ activo, size, alTocar, etiqueta, disabled }) {
  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={disabled}
      aria-label={etiqueta}
      className="flex shrink-0 items-center justify-center rounded-full border-[3px] border-dashed transition-all duration-200 active:scale-95 disabled:active:scale-100"
      style={{
        width: activo ? size : `calc(${size} * 0.62)`,
        height: activo ? size : `calc(${size} * 0.62)`,
        borderColor: activo ? '#39ff14' : 'rgba(57,255,20,.35)',
        background: activo ? 'rgba(57,255,20,.14)' : 'rgba(57,255,20,.04)',
        boxShadow: activo ? '0 0 24px rgba(57,255,20,.35)' : 'none'
      }}
    >
      <span
        className="material-symbols-outlined text-neon-green transition-transform duration-200"
        style={{ fontSize: `calc(${size} * ${activo ? 0.34 : 0.24})` }}
      >
        add
      </span>
    </button>
  );
}

function etiquetaHueco(from, to) {
  if (from == null) return `Antes de ${to}`;
  if (to == null) return `Después de ${from}`;
  return `Entre ${from} y ${to}`;
}

// `preview` = se ve mientras suena la canción, para buscar el hueco tranquilo
// antes de que corten la música (sin poder confirmar todavía).
function TimelinePlacementQuestion({
  question, playerYears = [], wildcards = 0, disabled, onPick,
  activeAttack, targetYears = 12, preview = false, layout = 'vertical'
}) {
  const years = useMemo(() => (playerYears.length ? playerYears : [2000]), [playerYears]);
  const isStealThreat = activeAttack?.type === 'year_steal';
  const correctSlot = question ? years.filter((year) => year <= question.songYear).length : -1;
  const apaisado = layout === 'horizontal';

  const railRef = useRef(null);
  const gapRefs = useRef([]);
  const [focoIndex, setFocoIndex] = useState(0);

  // Los huecos entre dos años iguales no se ofrecen: colocar ahí nunca puede
  // ser correcto y solo añade ruido ("Entre 2008 y 2008").
  const huecos = useMemo(() => {
    const lista = [];
    for (let slot = 0; slot <= years.length; slot += 1) {
      if (slot > 0 && slot < years.length && years[slot - 1] === years[slot]) continue;
      lista.push({
        slot,
        from: slot === 0 ? null : years[slot - 1],
        to: slot === years.length ? null : years[slot]
      });
    }
    return lista;
  }, [years]);

  // Píxeles y no rem A PROPÓSITO: en rem el disco crecería con el ajuste de
  // letra y poner letra grande volvería a alejar la ruta, que era el fallo
  // del riel viejo (de 6 a 10 pantallas de recorrido). Aquí el riel es la
  // referencia visual y se queda compacto; lo que sí crece con la letra es
  // lo que hay que leer y pulsar de verdad: la etiqueta del hueco elegido y
  // el botón de confirmar, ambos en rem.
  const size = apaisado ? '94px' : '72px';

  // Cuándo fue el último desplazamiento del riel, para no confundir el dedo
  // que frena el carrusel con un dedo que elige.
  const ultimoScrollRef = useRef(0);

  const recalcularFoco = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const centro = rail.scrollLeft + rail.clientWidth / 2;
    let mejor = 0;
    let mejorDist = Infinity;
    gapRefs.current.forEach((el, index) => {
      if (!el) return;
      const c = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(c - centro);
      if (d < mejorDist) { mejorDist = d; mejor = index; }
    });
    setFocoIndex(mejor);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    let pendiente = false;
    const alDesplazar = () => {
      ultimoScrollRef.current = performance.now();
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(() => { pendiente = false; recalcularFoco(); });
    };
    rail.addEventListener('scroll', alDesplazar, { passive: true });
    const inicial = window.setTimeout(recalcularFoco, 0);
    return () => {
      rail.removeEventListener('scroll', alDesplazar);
      window.clearTimeout(inicial);
    };
  }, [recalcularFoco, huecos.length]);

  // Arranca centrado en mitad de la ruta y no en el extremo izquierdo: se
  // recorre la mitad para llegar a cualquier hueco.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const centrar = window.setTimeout(() => {
      const medio = gapRefs.current[Math.floor(huecos.length / 2)];
      if (medio) rail.scrollLeft = medio.offsetLeft + medio.offsetWidth / 2 - rail.clientWidth / 2;
    }, 0);
    return () => window.clearTimeout(centrar);
  }, [huecos.length, layout]);

  const irA = useCallback((index) => {
    const rail = railRef.current;
    const el = gapRefs.current[index];
    if (!rail || !el) return;
    rail.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - rail.clientWidth / 2, behavior: 'smooth' });
  }, []);

  /**
   * Tocar un hueco.
   *
   * Mientras suena la música todavía no se puede colocar, así que el toque
   * solo centra el hueco: sirve para ir mirando dónde encajaría.
   *
   * Ya con la música parada, un toque COLOCA. La única guarda es invisible:
   * se ignoran los toques que llegan justo después de deslizar. Al parar un
   * carrusel con el dedo, ese contacto lo registra el navegador como un clic
   * en lo que hubiera debajo, y aquí colocar donde no era cuesta puntos.
   */
  const tocarHueco = useCallback((index, hueco) => {
    if (performance.now() - ultimoScrollRef.current < 320) {
      irA(index);
      return;
    }
    if (preview || disabled) { irA(index); return; }
    onPick({ isCorrect: hueco.slot === correctSlot, timelineSlot: hueco.slot });
  }, [preview, disabled, onPick, correctSlot, irA]);

  const huecoActivo = huecos[focoIndex] || huecos[0];
  const etiqueta = huecoActivo ? etiquetaHueco(huecoActivo.from, huecoActivo.to) : '';

  return (
    <div className={preview ? 'w-full' : 'mt-4 w-full'}>
      <div className="rounded-3xl border border-neon-green/20 bg-[radial-gradient(circle_at_top,rgba(57,255,20,0.12),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.24)_100%)] p-4 shadow-[0_0_30px_rgba(57,255,20,0.08)]">
        {isStealThreat && !preview && (
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-error/50 bg-error/20 p-2.5">
            {isImageAvatar(activeAttack.fromAvatar) ? (
              <img src={activeAttack.fromAvatar} alt={activeAttack.from || 'Rival'} className="h-12 w-12 shrink-0 rounded-full border-2 border-error object-cover" />
            ) : (
              <span className="material-symbols-outlined shrink-0 animate-pulse text-lg text-error">move_down</span>
            )}
            <p className="text-sm font-bold leading-snug text-error">
              <span className="font-black">{activeAttack.from || 'Un rival'}</span> te sabotó: si aciertas, ese año se lo lleva y pierdes uno de los tuyos.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-label-caps text-sm tracking-[0.16em] text-neon-green">TU RUTA DE AÑOS</p>
            <p className="mt-1 text-base font-bold text-white">
              {preview ? 'Ve buscando dónde encaja' : 'Toca dónde va'}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm font-label-caps text-on-surface-variant">
            {Math.min(years.length + wildcards, targetYears)}/{targetYears}
          </span>
        </div>

        {/* Riel de discos. snap-mandatory sobre los huecos: al soltar el dedo
            siempre queda uno centrado, nunca a medias. */}
        <div
          ref={railRef}
          className="no-scrollbar relative mt-4 overflow-x-auto overflow-y-hidden"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div
            className="relative flex min-w-max items-center gap-2 py-2"
            style={{ paddingLeft: '50%', paddingRight: '50%' }}
          >
            {huecos.map((hueco, index) => (
              <div key={hueco.slot} className="flex items-center gap-2">
                <div
                  ref={(el) => { gapRefs.current[index] = el; }}
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <VinylGap
                    activo={index === focoIndex}
                    size={size}
                    disabled={disabled}
                    etiqueta={etiquetaHueco(hueco.from, hueco.to)}
                    alTocar={() => tocarHueco(index, hueco)}
                  />
                </div>
                {hueco.to != null && <VinylDisc year={hueco.to} size={size} />}
              </div>
            ))}
            {Array.from({ length: wildcards }, (_, index) => (
              <VinylDisc key={`w-${index}`} wildcard size={size} />
            ))}
          </div>
        </div>

        {/* Solo la etiqueta del hueco centrado: dice dónde caería sin tener
            que interpretar la fila de discos. Las flechas se fueron con el
            botón de confirmar — sobran cuando se toca directamente. */}
        <p className="mt-3 text-center text-base font-black leading-tight text-white">{etiqueta}</p>

        {/* En apaisado esta frase se oculta (landscape-oculto): explica algo
            que la propia pantalla ya enseña —los huecos punteados se ven— y
            en horizontal cada renglón cuenta, porque el alto se queda en unos
            390 px. En vertical sobra sitio y ayuda a quien juega por primera
            vez, así que ahí se queda. */}
        <p className="landscape-oculto mt-2 text-center text-sm leading-relaxed text-on-surface-variant">
          {preview
            ? 'Podrás colocarlo cuando pare la música.'
            : 'Toca el hueco donde crees que va'}
        </p>

        {wildcards > 0 && !preview && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-chaos-gold">
            <span className="material-symbols-outlined text-base">star</span>
            {wildcards === 1 ? '1 canción canjeada con puntos' : `${wildcards} canciones canjeadas con puntos`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GameScreen() {
  const navigate = useNavigate();
  const {
    role,
    phase,
    round,
    pin,
    gameMode,
    currentQuestion,
    targetYears,
    spotifyPlaylistUrl,
    hostTriggerBlackout,
    hostRevealResults,
    hostEndGame,
    guestAnswer,
    guestLeaveRoom,
    guestId,
    players,
    roundAnswers,
    lastDisconnectedPlayer,
    setAudioPlaying,
    roomError,
    clearRoomError,
    attackOpponent,
    redeemPointsForYear,
    sabotageEnabled,
    sabotageTypes
  } = useGameStore();
  const [answeredQuestionKey, setAnsweredQuestionKey] = useState(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [softSecondsLeft, setSoftSecondsLeft] = useState(null);
  const [segundosAudio, setSegundosAudio] = useState(null);
  const audioEnTv = useGameStore((state) => state.audioEnTv);
  const cancionRonda = useGameStore((state) => state.cancionRonda);
  const publicarCancionDeRonda = useGameStore((state) => state.publicarCancionDeRonda);
  const audioForzadoEnMovil = useGameStore((state) => state.audioForzadoEnMovil);
  const hostSetAudioOutput = useGameStore((state) => state.hostSetAudioOutput);
  const { layout } = useOrientation();
  const [mensajeAudio, setMensajeAudio] = useState('');
  const [audioListo, setAudioListo] = useState(false);
  // Puede cortar si su propio móvil ya tiene la canción cargada O si la está
  // poniendo la televisión: en ese caso aquí no se carga nada, y esperar a
  // que se cargara dejaba el botón muerto.
  const puedeCortar = audioListo || audioEnTv;
  const [errorAudio, setErrorAudio] = useState(false);
  const [audioNecesitaToque, setAudioNecesitaToque] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [attackError, setAttackError] = useState('');
  const [attackSentTo, setAttackSentTo] = useState('');
  const [selectedAttackType, setSelectedAttackType] = useState('block_vote');
  const [disconnectToast, setDisconnectToast] = useState('');
  const [revealError, setRevealError] = useState('');
  const [isBlackoutPending, setIsBlackoutPending] = useState(false);
  const [dismissedAttackKey, setDismissedAttackKey] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemToast, setRedeemToast] = useState(false);
  const rondaYaSonandoRef = useRef('');
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  // Pause music on unmount (browser back button or any non-graceful exit)
  useEffect(() => {
    return () => {
      if (roleRef.current === 'host') {
        pararMusica();
      }
    };
  }, []);

  // Mismo guard que en ResultScreen: salir de la sala deja phase en 'lobby'
  // con role/pin ya en null, y sin esto el efecto redirigía al lobby en vez
  // de dejar salir.
  useEffect(() => {
    if (!pin || !role) return;
    if (phase === 'result' || phase === 'final') navigate('/game/result');
    if (phase === 'lobby') navigate('/lobby');
  }, [phase, pin, role, navigate]);

  useEffect(() => {
    if (!lastDisconnectedPlayer) return;
    const showToast = window.setTimeout(() => {
      setDisconnectToast(lastDisconnectedPlayer);
      useGameStore.setState({ lastDisconnectedPlayer: null });
    }, 0);
    const hideToast = window.setTimeout(() => setDisconnectToast(''), 5000);
    return () => {
      window.clearTimeout(showToast);
      window.clearTimeout(hideToast);
    };
  }, [lastDisconnectedPlayer]);

  useEffect(() => {
    if (roomError) {
      clearRoomError();
      navigate('/role-selection');
    }
  }, [roomError, clearRoomError, navigate]);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    const startedAt = Date.now();
    // El tic SUBE de tono en cada numero (3, 2, 1). Es el truco mas viejo
    // para crear tension sin decir nada, y el oido lo entiende solo.
    let ultimoTic = null;
    const updateCountdown = () => {
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      const valor = Math.max(1, 3 - Math.floor(elapsedMs / 1000));
      setCountdownValue(valor);
      if (valor !== ultimoTic) {
        ultimoTic = valor;
        sfx.tic(valor);
        vibrar('tic');
      }
    };
    const resetTimeout = window.setTimeout(updateCountdown, 0);
    const interval = window.setInterval(updateCountdown, 120);

    return () => {
      window.clearTimeout(resetTimeout);
      window.clearInterval(interval);
    };
  }, [phase, round]);

  useEffect(() => {
    if (phase !== 'listen') return undefined;
    const reset = window.setTimeout(() => setAudioListo(false), 0);
    return () => window.clearTimeout(reset);
  }, [phase, round]);

  useEffect(() => {
    // Si hay una tele que puede sonar, la música es suya: el móvil se calla.
    // Esto es lo que hace que el traspaso se sienta como un Chromecast —
    // nadie eligió nada, simplemente se mudó.
    if (role !== 'host' || phase !== 'listen' || audioEnTv) return;

    const playKey = `${round}-${spotifyPlaylistUrl}`;
    if (rondaYaSonandoRef.current === playKey) return;
    rondaYaSonandoRef.current = playKey;

    let cancelled = false;
    const preparingTimeout = window.setTimeout(() => {
      if (!cancelled) setMensajeAudio('Preparando la música...');
    }, 0);

    setErrorAudio(false);
    setAudioNecesitaToque(false);
    sonarCancionAleatoria(spotifyPlaylistUrl)
      .then((cancion) => {
        publicarCancionDeRonda(cancion, duracionFragmento());
        if (!cancelled) {
          setMensajeAudio('Música sonando. Para cuando quieras.');
          setErrorAudio(false);
          setAudioPlaying(true);
          setAudioListo(true);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          // Sin sesiones ni tokens, los fallos posibles se reducen a dos:
          // el navegador aún no ha dado permiso para sonar, o esa lista no
          // tiene fragmentos. Ambos se arreglan con un toque.
          setMensajeAudio(
            /fragmento/i.test(error?.message || '')
              ? error.message
              : 'Toca para que empiece la música.'
          );
          setErrorAudio(true);
          setAudioPlaying(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(preparingTimeout);
    };
  }, [role, phase, round, gameMode, spotifyPlaylistUrl, setAudioPlaying, audioEnTv, publicarCancionDeRonda]);

  const questionKey = useMemo(() => {
    if (!currentQuestion) return '';
    return `${currentQuestion.type}-${currentQuestion.text}-${round}`;
  }, [currentQuestion, round]);

  const hasRemoteAnswer = Boolean(guestId && roundAnswers?.[guestId] && roundAnswers[guestId].round === round);
  const hasAnswered = answeredQuestionKey === questionKey || hasRemoteAnswer;
  const answerCount = Object.keys(roundAnswers || {}).length;
  const isPlayerBlockedThisRound = (player) => player.activeAttack?.type === 'block_vote' && player.activeAttack?.round === round;
  // Un jugador bloqueado nunca va a votar esta ronda — si se cuenta en el
  // total, "X/Y votos" se queda pegado para siempre y el anfitrión (o
  // cualquiera) espera un voto que jamás va a llegar.
  const expectedVotes = players.filter((player) => getPlayerPresence(player).status !== 'kicked' && !isPlayerBlockedThisRound(player)).length || players.length;
  // Tiempo blando: con mucha gente basta que uno se distraiga para que el
  // resto espere, y el anfitrion queda de arbitro teniendo que meter prisa a
  // alguien. Cuando ya han respondido tres de cada cuatro arranca una cuenta
  // atras visible para todos; al llegar a cero revela el anfitrion solo. No
  // corta a nadie de golpe: avisa a todos por igual.
  const votesForSoftTimer = Math.max(2, Math.ceil(expectedVotes * 0.75));
  const softTimerArmed = phase === 'blackout' && expectedVotes > 3 && answerCount >= votesForSoftTimer && answerCount < expectedVotes;
  const mode = GAME_MODES[gameMode] || GAME_MODES.timeline;
  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  ));
  const ownPlayer = players.find((player) => player.id === guestId);
  const ownTimelineYears = useMemo(() => getCombinedTimelineYears(ownPlayer), [ownPlayer]);
  const incomingAttack = ownPlayer?.activeAttack?.round === round ? ownPlayer.activeAttack : null;
  const isBlockedThisRound = incomingAttack?.type === 'block_vote';
  const attackKey = incomingAttack ? `${round}-${incomingAttack.from || 'rival'}` : '';
  const showIncomingAttack = Boolean(incomingAttack && dismissedAttackKey !== attackKey && (phase === 'listen' || phase === 'blackout'));
  const attackTargets = players.filter((player) => player.id !== guestId && getPlayerPresence(player).status === 'online' && !player.activeAttack);
  // El sabotaje es opcional: si el anfitrion lo apago, el boton no existe.
  const allowedAttackTypes = normalizeSabotageTypes(sabotageTypes);
  const sabotageOn = sabotageEnabled !== false && allowedAttackTypes.length > 0;
  const canAttack = sabotageOn && phase === 'listen' && Number(ownPlayer?.points || 0) >= ATTACK_COST && attackTargets.length > 0;
  // Si el anfitrion dejo solo un tipo, el seleccionado por defecto puede
  // haber dejado de ser valido — se cae al primero permitido.
  const effectiveAttackType = allowedAttackTypes.includes(selectedAttackType)
    ? selectedAttackType
    : allowedAttackTypes[0];
  const canRedeem = phase === 'listen' && Number(ownPlayer?.points || 0) >= REDEEM_YEAR_COST && getTimelineProgress(ownPlayer) < targetYears;

  const handleRedeem = async () => {
    if (isRedeeming) return;
    setRedeemError('');
    setIsRedeeming(true);
    try {
      await redeemPointsForYear();
      setRedeemToast(true);
      vibrar('confirmar');
      sfx.confirmar();
      window.setTimeout(() => setRedeemToast(false), 3000);
    } catch (error) {
      setRedeemError(error.message || 'No se pudo canjear. Inténtalo de nuevo.');
      window.setTimeout(() => setRedeemError(''), 4000);
    } finally {
      setIsRedeeming(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 130 } }
  };

  // Cuenta atras del tiempo blando. Solo el anfitrion dispara el revelado
  // al llegar a cero — el resto unicamente ve el numero, para que no haya
  // dos clientes revelando la misma ronda.
  useEffect(() => {
    // El estado se toca solo desde callbacks (timeout/interval), nunca en el
    // cuerpo del efecto: evita renders en cascada.
    if (!softTimerArmed) {
      const limpiar = window.setTimeout(() => setSoftSecondsLeft(null), 0);
      return () => window.clearTimeout(limpiar);
    }
    const finalizaEn = Date.now() + SOFT_TIMER_SECONDS * 1000;
    const refrescar = () => {
      const quedan = Math.max(0, Math.ceil((finalizaEn - Date.now()) / 1000));
      setSoftSecondsLeft(quedan);
    };
    const arranque = window.setTimeout(refrescar, 0);
    const tick = window.setInterval(refrescar, 250);
    return () => {
      window.clearTimeout(arranque);
      window.clearInterval(tick);
    };
  }, [softTimerArmed, round]);

  useEffect(() => {
    if (softSecondsLeft !== 0 || role !== 'host' || phase !== 'blackout') return;
    hostRevealResults().catch((error) => {
      console.error('Error al revelar por tiempo:', error);
    });
  }, [softSecondsLeft, role, phase, hostRevealResults]);

  const handleAnswer = (isCorrect) => {
    setAnsweredQuestionKey(questionKey);
    guestAnswer(isCorrect);
    // Patron distinto para acierto y fallo: se juega en sitios con ruido
    // donde no se oye nada, asi que el movil confirma en la mano.
    // (En iPhone la vibracion no existe; por eso el sonido va en paralelo y
    // no como refuerzo opcional.)
    vibrar(isCorrect ? 'acierto' : 'fallo');
    if (isCorrect) sfx.acierto(); else sfx.fallo();
  };

  const handleHostBlackout = useCallback(async () => {
    if (isBlackoutPending) return;
    setIsBlackoutPending(true);
    try {
      // La de la sala manda: es la que ha sonado de verdad, la haya puesto
      // este móvil o la televisión.
      const hiddenTrack = cancionRonda || getCancionOculta();
      const spotifyQuestion = hiddenTrack
        ? await crearPreguntaDeCancion(hiddenTrack, gameMode, round, ownTimelineYears)
        : null;
      pararMusica();
      setAudioPlaying(false);
      await hostTriggerBlackout(spotifyQuestion, hiddenTrack);
    } catch (error) {
      console.error('Error al activar blackout:', error);
      setIsBlackoutPending(false);
    }
  }, [isBlackoutPending, gameMode, round, ownTimelineYears, setAudioPlaying, hostTriggerBlackout, cancionRonda]);

  // La tele acaba de reclamar la música: el móvil calla. El corte automático
  // por fin de fragmento también deja de aplicar, porque quien reproduce
  // ahora es la tele.
  useEffect(() => {
    if (audioEnTv) pararMusica();
  }, [audioEnTv]);

  // El fragmento dura 30 segundos y se acaba solo. Con Spotify la canción
  // sonaba entera y el anfitrión cortaba cuando quería; ahora, si nadie corta
  // a tiempo, la música se para y la sala se queda esperando una pregunta que
  // no llega. Al terminar el fragmento se corta solo.
  useEffect(() => {
    if (role !== 'host' || phase !== 'listen' || audioEnTv) return undefined;
    return alTerminarFragmento(() => {
      handleHostBlackout();
    });
  }, [role, phase, handleHostBlackout, audioEnTv]);

  // Cuenta atrás visible del fragmento: que se vea cuánto queda en vez de
  // que la música desaparezca de golpe.
  useEffect(() => {
    if (phase !== 'listen') {
      const limpiar = window.setTimeout(() => setSegundosAudio(null), 0);
      return () => window.clearTimeout(limpiar);
    }
    const tick = window.setInterval(() => {
      const quedan = segundosRestantes();
      setSegundosAudio(quedan > 0 ? Math.ceil(quedan) : null);
    }, 500);
    return () => window.clearInterval(tick);
  }, [phase, round]);

  // Reset blackout lock when phase changes (new round)
  useEffect(() => {
    if (phase !== 'listen') return undefined;
    const reset = window.setTimeout(() => setIsBlackoutPending(false), 0);
    return () => window.clearTimeout(reset);
  }, [phase, round]);

  // Ya no hay sesión que reconectar ni reproductor remoto que despertar: el
  // único motivo real por el que puede no sonar es que el navegador no haya
  // recibido todavía un toque del usuario. Se desbloquea desde aquí, que ES
  // ese toque, y se vuelve a intentar.
  const reintentarAudio = () => {
    setErrorAudio(false);
    setAudioNecesitaToque(false);
    setMensajeAudio('Reintentando...');
    desbloquearAudio()
      .then(() => sonarCancionAleatoria(spotifyPlaylistUrl))
      .then((cancion) => {
        publicarCancionDeRonda(cancion, duracionFragmento());
        setMensajeAudio('Música sonando. Para cuando quieras.');
        setErrorAudio(false);
        setAudioPlaying(true);
        setAudioListo(true);
      })
      .catch((error) => {
        setMensajeAudio(error?.message || 'No pudimos poner la música. Inténtalo otra vez.');
        setErrorAudio(true);
        setAudioPlaying(false);
      });
  };



  return (
    <div className={`app-screen relative z-10 flex flex-col items-center overflow-y-auto pt-safe-header transition-colors duration-500 ${phase === 'blackout' ? 'bg-black' : 'bg-transparent'}`}>

      <HeaderHUD onExit={() => setShowExitConfirm(true)} />
      <RotatePrompt />

      <AnimatePresence>
        {showIncomingAttack && (
          <AttackWarningOverlay
            attack={incomingAttack}
            onClose={() => setDismissedAttackKey(attackKey)}
          />
        )}
      </AnimatePresence>

      <JoinRequestBanner />

      <AnimatePresence>
        {disconnectToast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed top-20 inset-x-0 z-[290] flex justify-center px-5 pointer-events-none"
          >
            <div className="rounded-2xl border border-vinyl-orange/50 bg-vinyl-orange/15 p-3 flex items-center gap-3 max-w-sm w-full">
              <span className="material-symbols-outlined text-vinyl-orange text-2xl shrink-0">wifi_off</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">{disconnectToast} se desconectó</p>
                <p className="text-xs text-vinyl-orange/85">Tiene 30 segundos para volver antes de quedar fuera.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="app-shell flex flex-col items-center px-1 text-center"
          >
            <p className="font-label-caps text-electric-purple tracking-widest text-sm">PREPARA EL OÍDO</p>

            <div className="relative flex items-center justify-center mt-6 mb-6 w-48 h-48">
              {[0, 0.55, 1.1].map((delay) => (
                <div
                  key={delay}
                  className="absolute inset-0 rounded-full border-2 border-neon-green/25 ring-expand-anim"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
              <motion.div
                key={countdownValue}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.35, ease: 'backOut' }}
                className="font-stats-xl text-numeric-hero text-neon-green drop-shadow-[0_0_40px_rgba(57,255,20,0.6)]"
              >
                {countdownValue}
              </motion.div>
            </div>

            <p className="text-sm text-on-surface-variant">La música empieza al terminar la cuenta.</p>
          </motion.div>
        )}

        {phase === 'listen' && (
          <motion.div
            key="listen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`app-shell fase-escucha flex flex-col items-center gap-3 px-1 text-center sm:gap-4 ${role === 'host' ? 'safe-bottom-action' : ''}`}
          >
            {/* Vinyl listen circle */}
            <div className="landscape-tight relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center">
              {[0, 0.8, 1.6].map((delay) => (
                <div
                  key={delay}
                  className="absolute inset-0 rounded-full border-2 border-neon-green/20 ring-expand-anim"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-neon-green bg-black/30 shadow-[0_0_50px_rgba(57,255,20,0.35),inset_0_0_30px_rgba(0,0,0,0.6)] sm:h-64 sm:w-64">
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-white/5" />
                <div className="relative z-10 text-center">
                  <p className="font-label-caps text-xs text-electric-purple tracking-widest">{mode.name}</p>
                  <span className="mt-2 block font-headline-lg-mobile text-2xl font-black tracking-widest text-neon-green drop-shadow-[0_0_18px_rgba(57,255,20,0.6)] sm:text-4xl">
                    {role === 'host' ? 'SONANDO' : 'ESCUCHA'}
                  </span>
                  <p className="mt-2 font-label-caps text-xs text-white/60 tracking-widest">
                    {segundosAudio !== null
                      ? `${segundosAudio}s`
                      : role === 'host' ? 'PARA CUANDO QUIERAS' : 'EL ANFITRIÓN DECIDE'}
                  </p>
                </div>
              </div>
            </div>

            {/* Equalizer */}
            <div className="landscape-compact flex gap-2 items-end h-10 sm:h-14">
              {EQUALIZER_BARS.map((duration, index) => (
                <motion.div
                  key={`${duration}-${index}`}
                  animate={{ height: ['20%', '100%', '30%'] }}
                  transition={{ repeat: Infinity, duration, delay: index * 0.04 }}
                  className="w-5 bg-neon-green rounded-full shadow-[0_0_14px_rgba(57,255,20,0.4)]"
                />
              ))}
            </div>

            {role === 'host' ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="max-w-xs text-sm text-on-surface-variant">{mensajeAudio || 'Preparando la música...'}</p>
                {errorAudio && (
                  <button
                    onClick={reintentarAudio}
                    className="flex min-h-touch items-center gap-2 rounded-xl border-2 border-vinyl-orange bg-vinyl-orange/20 px-5 py-3 text-base font-label-caps font-black text-vinyl-orange shadow-[0_0_20px_rgba(255,122,26,0.25)] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {audioNecesitaToque ? 'login' : 'refresh'}
                    </span>
                    {/* Ni aquí ni en ninguna pantalla se nombra de dónde
                        sale la música: al jugador no le aporta y ya no es
                        cierto. */}
                    {audioNecesitaToque ? 'TOCA PARA ACTIVAR EL SONIDO' : 'REINTENTAR LA MÚSICA'}
                  </button>
                )}
              </div>
            ) : (
              <p className="max-w-xs text-sm text-on-surface-variant text-center">
                {`${activePlaylist?.name || 'Playlist'} en marcha. Escucha con atención: nadie ve la canción.`}
              </p>
            )}

            {gameMode === 'timeline' && !isBlockedThisRound && (
              <TimelinePlacementQuestion
                playerYears={ownTimelineYears}
                wildcards={Number(ownPlayer?.wildcards || 0)}
                targetYears={targetYears}
                layout={layout}
                preview
              />
            )}

            <RankingPeek players={players} guestId={guestId} targetYears={targetYears} />

            {(canAttack || canRedeem) && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {canAttack && (
                  <motion.button
                    type="button"
                    onClick={() => { setAttackError(''); setShowAttackModal(true); }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ boxShadow: ['0 0 0px rgba(255,90,20,0)', '0 0 28px rgba(255,90,20,0.65)', '0 0 0px rgba(255,90,20,0)'] }}
                    transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
                    className="min-h-[3.25rem] rounded-full border-2 border-vinyl-orange bg-gradient-to-r from-vinyl-orange to-intense-red px-6 flex items-center gap-2.5 text-white font-label-caps text-base font-black"
                  >
                    <motion.span
                      animate={{ rotate: [0, -14, 14, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6, repeatDelay: 0.5 }}
                      className="material-symbols-outlined text-2xl drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
                    >
                      bolt
                    </motion.span>
                    SABOTEAR · {ATTACK_COST} PTS
                  </motion.button>
                )}
                {canRedeem && (
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="min-h-touch rounded-full border border-chaos-gold/50 bg-chaos-gold/10 px-4 flex items-center gap-2 text-chaos-gold font-label-caps text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">star</span>
                    {isRedeeming ? 'CANJEANDO...' : `CANJEAR (${REDEEM_YEAR_COST} PTS)`}
                  </button>
                )}
              </div>
            )}
            {redeemError && (
              <p className="text-sm text-intense-red text-center">{redeemError}</p>
            )}

            {/* Dónde está sonando. Solo aparece si hay una tele en la sala:
                sin tele no hay nada que elegir y sería ruido. */}
            {role === 'host' && (audioEnTv || audioForzadoEnMovil) && (
              <button
                type="button"
                onClick={() => hostSetAudioOutput(audioEnTv ? 'movil' : 'tv')}
                className={`flex min-h-touch items-center gap-2 rounded-full border px-4 font-label-caps text-sm font-bold transition-colors ${
                  audioEnTv
                    ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
                    : 'border-white/20 bg-white/5 text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {audioEnTv ? 'tv' : 'smartphone'}
                </span>
                {audioEnTv ? 'SONANDO EN LA TELE' : 'SONANDO EN ESTE MÓVIL'}
              </button>
            )}

            {role === 'host' && (
              <div
                className="barra-inferior fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto grid max-w-sm gap-2 md:relative md:inset-auto md:z-auto md:mb-8 md:mt-2 md:w-full md:max-w-xs"
              >
                {/* VELO DETRÁS DE LA BARRA.
                    El botón tiene fondo propio, pero la frase de ayuda no: se
                    leía ENCIMA del contenido que pasa por debajo al desplazar
                    ("TUS AÑOS · META" cruzándola por la mitad). Reservar hueco
                    resuelve el final del recorrido; esto resuelve el trayecto.
                    Es un degradado que desvanece lo que pasa por debajo, el
                    gesto estándar de cualquier barra flotante.
                    `-z-10` y sin eventos: no puede robarle el toque al botón. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-6 -bottom-10 -top-14 -z-10 md:hidden"
                  style={{
                    // Parada explícita, no `to-transparent` a secas: con el
                    // degradado por defecto la parte de ARRIBA queda
                    // transparente, y arriba es justo donde vive la frase de
                    // ayuda — así que seguía leyéndose el contenido a través
                    // de ella. Aquí el velo ya está opaco del todo antes de
                    // llegar al texto, y solo se desvanece por encima.
                    background:
                      'linear-gradient(to top, rgb(5 8 22) 0%, rgb(5 8 22) 62%, rgba(5,8,22,0.85) 80%, rgba(5,8,22,0) 100%)'
                  }}
                />
                <p className="text-center text-sm text-on-surface-variant">Para cuando lo veas claro 👇</p>
                <motion.button
                  data-accion="principal"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: (isBlackoutPending || !puedeCortar) ? 1 : 0.94, y: 4 }}
                  onClick={handleHostBlackout}
                  disabled={isBlackoutPending || !puedeCortar}
                  className="w-full h-16 bg-intense-red hover:bg-red-600 text-white font-headline-lg-mobile text-2xl rounded-2xl shadow-[0_10px_0_rgba(90,0,18,0.95),0_0_34px_rgba(255,107,139,0.55)] transition-colors font-black border-2 border-white/15 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-[0_6px_0_rgba(90,0,18,0.65),0_0_20px_rgba(255,107,139,0.25)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black/10 pointer-events-none" />
                  {isBlackoutPending ? 'PARANDO...' : !puedeCortar ? 'CARGANDO...' : 'PARAR MÚSICA'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'blackout' && currentQuestion && (
          <motion.div
            key="blackout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="app-shell flex flex-col gap-4 px-1 py-6 sm:py-12"
          >
            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-label-caps text-intense-red text-sm tracking-widest"
              >
                RESPONDE · {currentQuestion.type}
              </motion.p>
              {/* Antes usaba .heading-page (clamp hasta 3.6rem): con un
                  texto largo ocupaba media pantalla y empujaba la zona de
                  respuesta fuera de vista. Ahora el texto es corto y el
                  tamaño, contenido. */}
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-2 font-headline-lg-mobile text-2xl font-black leading-tight text-white sm:text-3xl"
              >
                {currentQuestion.text}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-1.5"
              >
                <span className="font-label-caps text-[0.65rem] text-neon-green">+5 ACIERTO</span>
                <span className="w-px h-3 bg-white/20" />
                <span className="font-label-caps text-[0.65rem] text-intense-red">-3 FALLO</span>
                <span className="w-px h-3 bg-white/20" />
                {/* La regla del bonus se ensena aqui, dentro del chip que ya
                    existia — no hace falta un cartel aparte. */}
                <span className="flex items-center gap-0.5 font-label-caps text-[0.65rem] text-chaos-gold">
                  <span className="material-symbols-outlined text-sm">bolt</span>+1 AL 1º
                </span>
              </motion.div>
            </div>

            {/* Zona de respuesta PRIMERO: es lo que hay que hacer en esta
                pantalla, así que va arriba del todo, justo debajo de la
                pregunta. El estado de votos (y el panel del anfitrión con
                REVELAR RESULTADOS) va debajo — es información de
                seguimiento, no la acción principal. */}
            {hasAnswered ? (
              <>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`rounded-2xl border p-6 text-center ${role === 'host' ? 'border-electric-purple/40 bg-electric-purple/10' : 'border-neon-green/30 bg-neon-green/10'}`}
                >
                  <span className="material-symbols-outlined text-neon-green" style={{ fontSize: '3.5rem' }}>check_circle</span>
                  <p className="mt-3 text-white font-bold text-lg">¡Respuesta enviada!</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {role === 'host' ? 'Cuando todos estén listos, revela los resultados.' : 'Esperando al anfitrión...'}
                  </p>
                </motion.div>
                <div className="w-full flex flex-col gap-2">
                  <RankingPeek players={players} guestId={guestId} targetYears={targetYears} />
                </div>
              </>
            ) : isBlockedThisRound ? (
              <BlockedPlacement
                attackFrom={incomingAttack?.from}
                attackFromAvatar={incomingAttack?.fromAvatar}
                playerYears={ownTimelineYears}
                wildcards={Number(ownPlayer?.wildcards || 0)}
                targetYears={targetYears}
                isHost={role === 'host'}
              />
            ) : currentQuestion.answerType === 'timeline-placement' ? (
              <TimelinePlacementQuestion
                question={currentQuestion}
                playerYears={ownTimelineYears}
                wildcards={Number(ownPlayer?.wildcards || 0)}
                disabled={hasAnswered}
                onPick={handleAnswer}
                activeAttack={incomingAttack}
                targetYears={targetYears}
                layout={layout}
              />
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <motion.button
                    key={option}
                    variants={itemVariants}
                    onClick={() => handleAnswer(index === currentQuestion.correct)}
                    className="flex w-full min-h-[4.25rem] items-center gap-3 rounded-2xl border border-white/15 bg-white/8 p-3.5 text-left font-body-md text-base text-white transition-all duration-150 hover:border-neon-green/60 hover:bg-neon-green/8 active:scale-[0.97] group sm:min-h-[5rem] sm:gap-4 sm:p-4"
                  >
                    <span className="w-10 h-10 rounded-xl bg-black/30 border border-white/15 text-neon-green group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green flex items-center justify-center font-black text-lg shrink-0 transition-all duration-150">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="leading-snug text-base">{option}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {role !== 'host' && (
              <div className="flex justify-center">
                <VoteStatusStrip
                  players={players}
                  roundAnswers={roundAnswers}
                  isPlayerBlockedThisRound={isPlayerBlockedThisRound}
                  answerCount={answerCount}
                  expectedVotes={expectedVotes}
                  secondsLeft={softSecondsLeft}
                  guestId={guestId}
                />
              </div>
            )}

            {role === 'host' && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="font-label-caps text-neon-green text-sm">VOTOS RECIBIDOS</p>
                <motion.p
                  key={answerCount}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="mt-1 text-5xl font-black text-white"
                >
                  {answerCount}/{expectedVotes}
                </motion.p>

                {players.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-3.5">
                    {players.map((player, index) => {
                      const answered = Boolean(roundAnswers?.[player.id]);
                      const blocked = isPlayerBlockedThisRound(player);
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 10, scale: 0.85 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.05, type: 'spring', stiffness: 220, damping: 18 }}
                          className="relative flex flex-col items-center gap-1"
                        >
                          <motion.div
                            animate={answered && !blocked ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: answered && !blocked ? Infinity : 0, duration: 1.6, ease: 'easeInOut' }}
                          >
                            {isImageAvatar(player.avatar) ? (
                              <img
                                src={player.avatar}
                                alt={player.name}
                                className={`w-[5.5rem] h-[5.5rem] rounded-full object-cover border-2 transition-all ${blocked ? 'border-vinyl-orange opacity-70' : answered ? 'border-neon-green shadow-[0_0_14px_rgba(57,255,20,0.55)]' : 'border-white/15 opacity-35'}`}
                              />
                            ) : (
                              <div className={`w-[5.5rem] h-[5.5rem] rounded-full flex items-center justify-center text-3xl bg-black/20 border-2 transition-all ${blocked ? 'border-vinyl-orange opacity-70' : answered ? 'border-neon-green shadow-[0_0_14px_rgba(57,255,20,0.55)]' : 'border-white/15 opacity-35'}`}>
                                {player.avatar || '•'}
                              </div>
                            )}
                          </motion.div>
                          {blocked ? (
                            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-vinyl-orange">
                              <span className="material-symbols-outlined text-black" style={{ fontSize: '14px', lineHeight: 1 }}>block</span>
                            </span>
                          ) : answered && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neon-green flex items-center justify-center">
                              <span className="material-symbols-outlined text-black" style={{ fontSize: '14px', lineHeight: 1 }}>check</span>
                            </span>
                          )}
                          <span className={`max-w-[5.5rem] truncate font-label-caps text-sm font-bold uppercase tracking-wide ${blocked ? 'text-vinyl-orange' : 'text-white/90'}`}>
                            {blocked ? 'BLOQUEADO' : player.name}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {isBlockedThisRound ? (
                  <p className="mt-2 text-sm text-vinyl-orange">Te sabotearon esta ronda — igual puedes revelar cuando estén los votos.</p>
                ) : !hasAnswered && (
                  <p className="mt-2 text-sm text-on-surface-variant">Responde primero. Tu voto también cuenta.</p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setRevealError('');
                    try {
                      await hostRevealResults();
                    } catch (error) {
                      console.error('Error al revelar resultados:', error);
                      setRevealError('No se pudieron revelar los resultados. Inténtalo de nuevo.');
                    }
                  }}
                  disabled={!hasAnswered && !isBlockedThisRound}
                  className="mt-4 w-full h-14 rounded-xl bg-neon-green text-black font-label-caps text-sm font-bold active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  REVELAR RESULTADOS
                </button>
                {revealError && (
                  <p className="mt-2 text-sm text-intense-red text-center">{revealError}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {attackSentTo && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed top-20 inset-x-0 z-[290] flex justify-center px-5 pointer-events-none"
          >
            <div className="rounded-2xl border border-vinyl-orange/50 bg-vinyl-orange/15 px-4 py-3 flex items-center gap-2 max-w-sm w-full">
              <span className="material-symbols-outlined text-vinyl-orange text-xl shrink-0">bolt</span>
              <p className="text-sm font-black text-white">¡Sabotaje enviado a {attackSentTo}!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {redeemToast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed top-20 inset-x-0 z-[290] flex justify-center px-5 pointer-events-none"
          >
            <div className="rounded-2xl border border-chaos-gold/50 bg-chaos-gold/15 px-4 py-3 flex items-center gap-2 max-w-sm w-full">
              <span className="material-symbols-outlined text-chaos-gold text-xl shrink-0">star</span>
              <p className="text-sm font-black text-white">¡Canjeaste una canción para tu ruta!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAttackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/92 px-4 pb-4 sm:pb-0"
            onClick={() => setShowAttackModal(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="relative w-full max-w-sm max-h-[85dvh] overflow-y-auto overscroll-contain rounded-3xl border border-electric-purple/40 bg-[#160725] p-6 text-center shadow-[0_0_80px_rgba(168,85,247,0.42)]"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.34),transparent_38%),radial-gradient(circle_at_15%_90%,rgba(255,122,26,0.18),transparent_35%)]" />
              <div className="relative">
              <span className="material-symbols-outlined text-electric-purple drop-shadow-[0_0_24px_rgba(168,85,247,0.75)]" style={{ fontSize: '3rem' }}>bolt</span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">SABOTEAR RIVAL</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Por <span className="text-vinyl-orange font-bold">{ATTACK_COST} pts</span>, eliges cómo saboteas su próxima ronda. Esta vez sí tiene consecuencia real en su ruta de años.
              </p>

              {/* Bloqueo y Robo de año tienen la misma importancia — ninguno
                  se dibuja más chico que el otro. Ambos con letra grande. */}
              <div className="mt-4 flex flex-col gap-2.5">
                {allowedAttackTypes.map((typeId) => ATTACK_TYPES[typeId]).filter(Boolean).map((attackType) => (
                  <button
                    key={attackType.id}
                    type="button"
                    onClick={() => setSelectedAttackType(attackType.id)}
                    className={`min-h-[6.5rem] rounded-3xl border-2 px-4 py-3 text-left transition-all active:scale-95 ${
                      effectiveAttackType === attackType.id
                        ? 'border-neon-green bg-neon-green/14 shadow-[0_0_32px_rgba(57,255,20,0.22)]'
                        : 'border-white/15 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`material-symbols-outlined shrink-0 ${effectiveAttackType === attackType.id ? 'text-neon-green' : 'text-electric-purple'}`} style={{ fontSize: '2.75rem' }}>
                        {attackType.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-label-caps text-xl font-black text-white">{attackType.name}</p>
                        <p className="mt-0.5 text-lg leading-snug text-on-surface-variant">{attackType.short}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-4 font-label-caps text-xs tracking-[0.18em] text-on-surface-variant">ELIGE OBJETIVO</p>
              <div className="mt-2 flex flex-col gap-2">
                {attackTargets.length === 0 && (
                  <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-on-surface-variant">
                    No hay rivales disponibles ahora mismo.
                  </p>
                )}
                {attackTargets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={async () => {
                      try {
                        await attackOpponent(target.id, effectiveAttackType);
                        setShowAttackModal(false);
                        setAttackSentTo(target.name);
                        vibrar('confirmar'); sfx.confirmar();
                        window.setTimeout(() => setAttackSentTo(''), 3000);
                      } catch (error) {
                        setAttackError(error.message || 'No se pudo sabotear. Inténtalo de nuevo.');
                      }
                    }}
                    className="min-h-touch rounded-2xl border border-white/12 bg-white/8 pl-2.5 pr-4 py-2 flex items-center gap-3 text-white font-bold text-sm active:scale-95 transition-all hover:border-electric-purple/60 hover:bg-electric-purple/15"
                  >
                    {isImageAvatar(target.avatar) ? (
                      <img src={target.avatar} alt={target.name} className="h-14 w-14 shrink-0 rounded-full border-2 border-white/15 object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/25 text-2xl">{target.avatar || '•'}</span>
                    )}
                    <span className="flex-1 truncate font-label-caps text-lg font-black uppercase tracking-wide">{target.name}</span>
                    <span className="material-symbols-outlined text-vinyl-orange text-lg shrink-0">bolt</span>
                  </button>
                ))}
              </div>

              {attackError && (
                <p className="mt-3 text-sm text-intense-red text-center">{attackError}</p>
              )}

              <button
                type="button"
                onClick={() => setShowAttackModal(false)}
                className="mt-4 w-full min-h-touch rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
              >
                CANCELAR
              </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/92 px-4 pb-4 sm:pb-0"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-container p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '2.5rem' }}>
                {role === 'host' ? 'emoji_events' : 'logout'}
              </span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">
                {role === 'host' ? '¿Terminar la partida' : '¿Salir de la partida'}
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                {role === 'host'
                  ? 'Se mostrará el ranking final a todos, tú incluido. Desde ahí podrás cerrar la sala.'
                  : 'Perderás tu progreso en esta ronda.'}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setShowExitConfirm(false);
                    if (role === 'host') {
                      pararMusica();
                      // No cierra la sala de inmediato — el anfitrión también
                      // tiene que ver el ranking final antes de irse, igual
                      // que los demás. hostEndGame solo marca fase 'final'
                      // (con la puntuación tal cual iba) sin borrar su sesión;
                      // "CERRAR SALA" en esa pantalla es el paso que sí cierra.
                      await hostEndGame();
                      navigate('/game/result');
                    } else {
                      guestLeaveRoom();
                      navigate('/role-selection');
                    }
                  }}
                  className="w-full h-12 rounded-xl bg-intense-red text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  {role === 'host' ? 'SÍ, TERMINAR PARTIDA' : 'SÍ, SALIR'}
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  SEGUIR JUGANDO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

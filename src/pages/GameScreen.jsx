import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTACK_COST, ATTACK_TYPES, DEDICALO_PLAYLISTS, GAME_MODES, REDEEM_YEAR_COST, getCombinedTimelineYears, getPlayerPresence, getTimelineProgress, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';
import HeaderHUD from '../components/HeaderHUD';
import JoinRequestBanner from '../components/JoinRequestBanner';
import { createQuestionFromTrack, explainSpotifyError, getCurrentHiddenTrack, getSpotifyStatus, pauseSpotifyPlayback, startRandomPlaylistTrack } from '../services/spotify';

const EQUALIZER_BARS = [0.35, 0.58, 0.42, 0.71, 0.49, 0.64, 0.39];

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
            <span className="mt-0.5 font-label-caps text-[9px] tracking-[0.12em] text-on-surface-variant">POS</span>
          </div>
          {/* Years progress */}
          <div className="min-w-0">
            <p className="font-label-caps text-[10px] tracking-[0.18em] text-neon-green">TUS AÑOS · META</p>
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
                      <p className="mt-0.5 text-[10px] font-bold text-on-surface-variant leading-none">
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



function getTimelineSlotLabel(years, index) {
  if (index === 0) return `Antes de ${years[0]}`;
  if (index === years.length) return `Después de ${years[years.length - 1]}`;
  return `Entre ${years[index - 1]} y ${years[index]}`;
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

// Círculo simple para un año ya conseguido: nada de textura ni relieve, solo
// el número bien grande — se lee de un vistazo y a distancia. La versión
// anterior (disco de vinilo con surco) se veía bonita pero ocupaba mucho
// espacio por muy poca información real; esto deja ver más ruta a la vez y
// prioriza el número sobre la decoración.
function VinylYearChip({ year }) {
  return (
    <div
      className="relative flex shrink-0 snap-center items-center justify-center rounded-full border-[3px] border-electric-purple bg-electric-purple/20 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
      style={{ width: 'var(--vinyl-size, 4.75rem)', height: 'var(--vinyl-size, 4.75rem)' }}
    >
      <span className="font-stats-xl font-black leading-none text-white" style={{ fontSize: 'clamp(1.1rem, 5.5vw, 1.5rem)' }}>
        {year}
      </span>
    </div>
  );
}

// Igual de simple que un año, pero dorado con una estrella: una canción
// comprada con puntos (ver REDEEM_YEAR_COST), no acertada de oído. Cuenta
// igual para la meta, pero se distingue de un vistazo.
function WildcardChip() {
  return (
    <div
      className="relative flex shrink-0 snap-center items-center justify-center rounded-full border-[3px] border-chaos-gold bg-chaos-gold/20 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
      style={{ width: 'var(--vinyl-size, 4.75rem)', height: 'var(--vinyl-size, 4.75rem)' }}
    >
      <span className="material-symbols-outlined text-chaos-gold" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.1rem)' }}>star</span>
    </div>
  );
}

// Hueco tappable entre dos años: el jugador toca aquí para decir dónde cree
// que va la canción nueva. Mismo círculo simple, pero punteado y con un "+"
// para leerse claramente como interactivo frente a los años ya colocados.
function VinylSlotButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Colocar canción: ${label}`}
      className="group relative shrink-0 snap-center rounded-full border-[3px] border-dashed border-neon-green/60 bg-neon-green/5 text-neon-green flex flex-col items-center justify-center active:scale-90 transition-transform hover:bg-neon-green/15 hover:border-neon-green focus:outline-none focus:ring-2 focus:ring-neon-green disabled:opacity-40"
      style={{ width: 'var(--vinyl-size, 4.75rem)', height: 'var(--vinyl-size, 4.75rem)' }}
    >
      <span className="material-symbols-outlined text-2xl leading-none">add</span>
      <span className="absolute -bottom-9 w-32 text-center text-[clamp(0.72rem,3vw,0.88rem)] font-bold font-label-caps leading-tight text-white group-hover:text-neon-green transition-colors">
        {label}
      </span>
    </button>
  );
}

const BURST_EMOJI = ['🎵', '🎶', '⚡', '💥', '🔊', '🎧', '✨'];

// Ráfaga de partículas que salen disparadas del centro una sola vez al
// aparecer el ataque — la "explosión musical" en sí. useState perezoso
// (no useMemo) para generar los ángulos/tamaños aleatorios una única vez
// sin violar las reglas de pureza de React.
function MusicBurst() {
  const [particles] = useState(() => Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 100 + Math.random() * 90;
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

function AttackWarningOverlay({ attack, onClose }) {
  useEffect(() => {
    if (attack && navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 90]);
  }, [attack]);

  if (!attack) return null;
  const attackCopy = getAttackCopy(attack);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1, x: [0, -10, 9, -7, 5, -2, 0] }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ opacity: { duration: 0.28 }, scale: { duration: 0.28 }, x: { duration: 0.55, ease: 'easeOut' } }}
      className="fixed inset-0 z-[260] flex items-center justify-center overflow-hidden px-5 text-center text-white"
      style={{ background: 'linear-gradient(160deg, #4a00b8 0%, #8b00ff 40%, #c0007a 80%, #ff4400 100%)' }}
    >
      {/* Ambient fx layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.30),transparent_30%),radial-gradient(circle_at_20%_85%,rgba(255,122,26,0.25),transparent_35%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-white/12 blur-3xl" />
      <motion.div
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_60%)]"
      />

      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 160, damping: 18 }}
        className="relative mx-auto w-full max-w-sm"
      >
        {/* Avatar del atacante — quién te atacó tiene que reconocerse al toque */}
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          {/* Ondas de choque — expanden y se apagan una sola vez, como el
              golpe de un bombo al caer el sabotaje */}
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
            className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full border-4 border-white/80 bg-black/30 shadow-[0_0_80px_rgba(255,255,255,0.50),0_0_140px_rgba(200,0,255,0.35)]"
          >
            {isImageAvatar(attack.fromAvatar) ? (
              <img src={attack.fromAvatar} alt={attack.from || 'Rival'} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">{attackCopy.icon}</span>
            )}
            <span className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-[#6b10e8] shadow-[0_0_16px_rgba(0,0,0,0.4)]">
              <span className="material-symbols-outlined text-2xl text-white">{attackCopy.icon}</span>
            </span>
          </motion.div>
        </div>

        {/* Labels */}
        <p className="mt-6 font-label-caps text-xs tracking-[0.36em] text-white/70">⚡ ALERTA DE SABOTAJE ⚡</p>
        <h2
          className="mt-2 font-headline-lg font-black leading-[0.88] drop-shadow-[0_8px_30px_rgba(0,0,0,0.40)]"
          style={{ fontSize: 'clamp(3.2rem, 14vw, 5.5rem)' }}
        >
          TE<br />ATACARON
        </h2>

        {/* Ecualizador de impacto — refuerza el "explosión musical" del golpe */}
        <div className="mx-auto mt-3 flex h-8 items-end justify-center gap-1" aria-hidden="true">
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

        {/* Who & what */}
        <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-white/25 bg-black/30 px-4 py-3 backdrop-blur-sm">
          <p className="text-lg font-black leading-snug text-white">
            <span className="text-chaos-gold">{attack.from || 'Un rival'}</span> lanzó:{' '}
            <span className="text-white">{attackCopy.title}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            {attackCopy.description}
          </p>
        </div>

        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/65">
          {attack.type === 'block_vote'
            ? 'No podrás responder esta ronda. Prepárate para la siguiente.'
            : 'Si aciertas igual, respira: puedes intentarlo, solo que el año no se queda contigo.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-[3.5rem] w-full rounded-2xl bg-white px-5 font-label-caps text-base font-black tracking-[0.18em] text-[#6b10e8] shadow-[0_8px_0_rgba(53,8,118,0.70)] active:translate-y-1 active:shadow-[0_4px_0_rgba(53,8,118,0.70)] transition-all"
        >
          ¡LO TENGO! JUGAR
        </button>
      </motion.div>
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

function TimelinePlacementQuestion({ question, playerYears = [], wildcards = 0, disabled, onPick, activeAttack, targetYears = 12 }) {
  const years = playerYears.length ? playerYears : [2000];
  const isStealThreat = activeAttack?.type === 'year_steal';
  const slots = Array.from({ length: years.length + 1 }, (_, index) => index);
  const correctSlot = years.filter((year) => year <= question.songYear).length;

  return (
    <div className="mt-5">
      <div className="rounded-3xl border border-neon-green/20 bg-[radial-gradient(circle_at_top,rgba(57,255,20,0.12),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.24)_100%)] p-4 shadow-[0_0_30px_rgba(57,255,20,0.08)]">
        {isStealThreat && (
          <div className="mb-3 rounded-xl bg-error/20 border border-error/50 p-2.5 flex items-center gap-2.5">
            {isImageAvatar(activeAttack.fromAvatar) ? (
              <img src={activeAttack.fromAvatar} alt={activeAttack.from || 'Rival'} className="h-12 w-12 shrink-0 rounded-full border-2 border-error object-cover" />
            ) : (
              <span className="material-symbols-outlined text-error text-lg animate-pulse shrink-0">move_down</span>
            )}
            <p className="text-sm font-bold leading-snug text-error">
              <span className="font-black">{activeAttack.from || 'Un rival'}</span> te sabotó: si aciertas, ese año se lo lleva y pierdes uno de los tuyos.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-label-caps text-sm text-neon-green tracking-[0.16em]">TU RUTA DE AÑOS</p>
            <p className="mt-1 text-base text-white font-bold">Elige dónde colocar esta canción</p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm font-label-caps text-on-surface-variant">
            {Math.min(years.length + wildcards, targetYears)}/{targetYears}
          </span>
        </div>

        {/* Fila de años: riel horizontal con snap-scroll, círculos y huecos
            en línea recta para leerse rápido de un vistazo. */}
        <div className="relative mt-6 overflow-x-auto overflow-y-visible pb-12 pt-2 snap-x no-scrollbar sm:mt-8">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="relative min-w-max flex items-center gap-3 px-2">
            {slots.map((slot, index) => (
              <div key={slot} className="flex items-center gap-3">
                <VinylSlotButton
                  label={getTimelineSlotLabel(years, slot)}
                  disabled={disabled}
                  onClick={() => onPick({ isCorrect: slot === correctSlot, timelineSlot: slot })}
                />
                {index < years.length && <VinylYearChip year={years[index]} />}
              </div>
            ))}
            {wildcards > 0 && Array.from({ length: wildcards }, (_, index) => (
              <WildcardChip key={`wildcard-${index}`} />
            ))}
          </div>
        </div>
        {wildcards > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-chaos-gold">
            <span className="material-symbols-outlined text-base">star</span>
            {wildcards === 1 ? '1 canción canjeada con puntos' : `${wildcards} canciones canjeadas con puntos`}
          </p>
        )}
        <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
          Tu ruta es personal. Si no ves todos los discos, desliza la fila hacia los lados.
        </p>
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
    redeemPointsForYear
  } = useGameStore();
  const [answeredQuestionKey, setAnsweredQuestionKey] = useState(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [spotifyMessage, setSpotifyMessage] = useState('');
  const [spotifyTrackReady, setSpotifyTrackReady] = useState(false);
  const [spotifyError, setSpotifyError] = useState(false);
  const [spotifyNeedsReconnect, setSpotifyNeedsReconnect] = useState(false);
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
  const startedSpotifyRoundRef = useRef('');
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  // Pause music on unmount (browser back button or any non-graceful exit)
  useEffect(() => {
    return () => {
      if (roleRef.current === 'host') {
        pauseSpotifyPlayback().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (phase === 'result' || phase === 'final') navigate('/game/result');
    if (phase === 'lobby') navigate('/lobby');
  }, [phase, navigate]);

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
    const updateCountdown = () => {
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      setCountdownValue(Math.max(1, 3 - Math.floor(elapsedMs / 1000)));
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
    const reset = window.setTimeout(() => setSpotifyTrackReady(false), 0);
    return () => window.clearTimeout(reset);
  }, [phase, round]);

  useEffect(() => {
    if (role !== 'host' || phase !== 'listen') return;

    const playKey = `${round}-${spotifyPlaylistUrl}`;
    if (startedSpotifyRoundRef.current === playKey) return;
    startedSpotifyRoundRef.current = playKey;

    let cancelled = false;
    const preparingTimeout = window.setTimeout(() => {
      if (!cancelled) setSpotifyMessage('Preparando Spotify...');
    }, 0);

    setSpotifyError(false);
    setSpotifyNeedsReconnect(false);
    startRandomPlaylistTrack(spotifyPlaylistUrl)
      .then(() => {
        if (!cancelled) {
          setSpotifyMessage('Música sonando. Para cuando quieras.');
          setSpotifyError(false);
          setAudioPlaying(true);
          setSpotifyTrackReady(true);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setSpotifyMessage(explainSpotifyError(error));
          setSpotifyError(true);
          setSpotifyNeedsReconnect(!getSpotifyStatus().connected);
          setAudioPlaying(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(preparingTimeout);
    };
  }, [role, phase, round, gameMode, spotifyPlaylistUrl, setAudioPlaying]);

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
  const mode = GAME_MODES[gameMode] || GAME_MODES.timeline;
  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  ));
  const ownPlayer = players.find((player) => player.id === guestId);
  const ownTimelineYears = getCombinedTimelineYears(ownPlayer);
  const incomingAttack = ownPlayer?.activeAttack?.round === round ? ownPlayer.activeAttack : null;
  const isBlockedThisRound = incomingAttack?.type === 'block_vote';
  const attackKey = incomingAttack ? `${round}-${incomingAttack.from || 'rival'}` : '';
  const showIncomingAttack = Boolean(incomingAttack && dismissedAttackKey !== attackKey && (phase === 'listen' || phase === 'blackout'));
  const attackTargets = players.filter((player) => player.id !== guestId && getPlayerPresence(player).status === 'online' && !player.activeAttack);
  const canAttack = phase === 'listen' && Number(ownPlayer?.points || 0) >= ATTACK_COST && attackTargets.length > 0;
  const canRedeem = phase === 'listen' && Number(ownPlayer?.points || 0) >= REDEEM_YEAR_COST && getTimelineProgress(ownPlayer) < targetYears;

  const handleRedeem = async () => {
    if (isRedeeming) return;
    setRedeemError('');
    setIsRedeeming(true);
    try {
      await redeemPointsForYear();
      setRedeemToast(true);
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
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

  const handleAnswer = (isCorrect) => {
    setAnsweredQuestionKey(questionKey);
    guestAnswer(isCorrect);
    if (navigator.vibrate) navigator.vibrate(isCorrect ? [30] : [100, 30, 100]);
  };

  const handleHostBlackout = async () => {
    if (isBlackoutPending) return;
    setIsBlackoutPending(true);
    try {
      const hiddenTrack = getCurrentHiddenTrack();
      const spotifyQuestion = hiddenTrack
        ? await createQuestionFromTrack(hiddenTrack, gameMode, round, ownTimelineYears)
        : null;
      await pauseSpotifyPlayback().catch((error) => console.warn('No se pudo pausar Spotify:', error));
      setAudioPlaying(false);
      await hostTriggerBlackout(spotifyQuestion, hiddenTrack);
    } catch (error) {
      console.error('Error al activar blackout:', error);
      setIsBlackoutPending(false);
    }
  };

  // Reset blackout lock when phase changes (new round)
  useEffect(() => {
    if (phase !== 'listen') return undefined;
    const reset = window.setTimeout(() => setIsBlackoutPending(false), 0);
    return () => window.clearTimeout(reset);
  }, [phase, round]);

  const handleSpotifyRetry = () => {
    if (spotifyNeedsReconnect) {
      navigate('/host/sync');
      return;
    }
    setSpotifyError(false);
    setSpotifyNeedsReconnect(false);
    setSpotifyMessage('Reintentando...');
    startRandomPlaylistTrack(spotifyPlaylistUrl)
      .then(() => {
        setSpotifyMessage('Música sonando. Para cuando quieras.');
        setAudioPlaying(true);
      })
      .catch((error) => {
        setSpotifyMessage(explainSpotifyError(error));
        setSpotifyError(true);
        setSpotifyNeedsReconnect(!getSpotifyStatus().connected);
        setAudioPlaying(false);
      });
  };



  return (
    <div className={`app-screen relative z-10 flex flex-col items-center overflow-y-auto pt-safe-header transition-colors duration-500 ${phase === 'blackout' ? 'bg-black' : 'bg-transparent'}`}>

      <HeaderHUD onExit={() => setShowExitConfirm(true)} />

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
            <div className="rounded-2xl border border-vinyl-orange/50 bg-vinyl-orange/15 backdrop-blur-lg p-3 flex items-center gap-3 max-w-sm w-full">
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
                className="font-stats-xl text-[clamp(5rem,28vw,8rem)] leading-none text-neon-green drop-shadow-[0_0_40px_rgba(57,255,20,0.6)]"
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
            className={`app-shell flex flex-col items-center gap-3 px-1 text-center sm:gap-4 ${role === 'host' ? 'safe-bottom-action' : ''}`}
          >
            {/* Vinyl listen circle */}
            <div className="relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center">
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
                    {role === 'host' ? 'PARA CUANDO QUIERAS' : 'EL ANFITRIÓN DECIDE'}
                  </p>
                </div>
              </div>
            </div>

            {/* Equalizer */}
            <div className="flex gap-2 items-end h-10 sm:h-14">
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
                <p className="max-w-xs text-sm text-on-surface-variant">{spotifyMessage || 'Preparando Spotify...'}</p>
                {spotifyError && (
                  <button
                    onClick={handleSpotifyRetry}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-vinyl-orange/50 bg-vinyl-orange/15 text-vinyl-orange font-label-caps text-sm font-bold active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {spotifyNeedsReconnect ? 'login' : 'refresh'}
                    </span>
                    {spotifyNeedsReconnect ? 'RECONECTAR SPOTIFY' : 'REINTENTAR SPOTIFY'}
                  </button>
                )}
              </div>
            ) : (
              <p className="max-w-xs text-sm text-on-surface-variant text-center">
                {`${activePlaylist?.name || 'Playlist'} en marcha. Escucha con atención: nadie ve la canción.`}
              </p>
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

            {role === 'host' && (
              <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto grid max-w-sm gap-2 md:relative md:inset-auto md:z-auto md:mb-8 md:mt-2 md:w-full md:max-w-xs">
                <p className="text-center text-sm text-on-surface-variant">Para cuando lo veas claro 👇</p>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: (isBlackoutPending || !spotifyTrackReady) ? 1 : 0.94, y: 4 }}
                  onClick={handleHostBlackout}
                  disabled={isBlackoutPending || !spotifyTrackReady}
                  className="w-full h-16 bg-intense-red hover:bg-red-600 text-white font-headline-lg-mobile text-2xl rounded-2xl shadow-[0_10px_0_rgba(90,0,18,0.95),0_0_34px_rgba(255,107,139,0.55)] transition-colors font-black border-2 border-white/15 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-[0_6px_0_rgba(90,0,18,0.65),0_0_20px_rgba(255,107,139,0.25)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black/10 pointer-events-none" />
                  {isBlackoutPending ? 'PARANDO...' : !spotifyTrackReady ? 'CARGANDO...' : 'PARAR MÚSICA'}
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
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="heading-page mt-3 font-headline-lg-mobile text-white"
              >
                {currentQuestion.text}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-1.5"
              >
                <span className="font-label-caps text-[11px] text-neon-green">+5 ACIERTO</span>
                <span className="w-px h-3 bg-white/20" />
                <span className="font-label-caps text-[11px] text-intense-red">-3 FALLO</span>
              </motion.div>
            </div>

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

            {hasAnswered ? (
              <>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`mt-6 rounded-2xl border p-6 text-center ${role === 'host' ? 'border-electric-purple/40 bg-electric-purple/10' : 'border-neon-green/30 bg-neon-green/10'}`}
                >
                  <span className="material-symbols-outlined text-neon-green" style={{ fontSize: '3.5rem' }}>check_circle</span>
                  <p className="mt-3 text-white font-bold text-lg">¡Respuesta enviada!</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {role === 'host' ? 'Cuando todos estén listos, revela los resultados.' : 'Esperando al anfitrión...'}
                  </p>
                </motion.div>
                <div className="mt-3 w-full flex flex-col gap-2">
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
              />
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="mt-4 flex flex-col gap-3"
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
            <div className="rounded-2xl border border-vinyl-orange/50 bg-vinyl-orange/15 backdrop-blur-lg px-4 py-3 flex items-center gap-2 max-w-sm w-full">
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
            <div className="rounded-2xl border border-chaos-gold/50 bg-chaos-gold/15 backdrop-blur-lg px-4 py-3 flex items-center gap-2 max-w-sm w-full">
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
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-4 sm:pb-0"
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

              <div className="mt-4 grid gap-2">
                {Object.values(ATTACK_TYPES).map((attackType) => (
                  <button
                    key={attackType.id}
                    type="button"
                    onClick={() => setSelectedAttackType(attackType.id)}
                    className={`min-h-[4.25rem] rounded-2xl border px-3 text-left transition-all active:scale-95 ${
                      selectedAttackType === attackType.id
                        ? 'border-neon-green bg-neon-green/12 shadow-[0_0_24px_rgba(57,255,20,0.16)]'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-2xl ${selectedAttackType === attackType.id ? 'text-neon-green' : 'text-electric-purple'}`}>
                        {attackType.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-label-caps text-sm font-black text-white">{attackType.name}</p>
                        <p className="mt-0.5 text-sm leading-snug text-on-surface-variant">{attackType.short}</p>
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
                        await attackOpponent(target.id, selectedAttackType);
                        setShowAttackModal(false);
                        setAttackSentTo(target.name);
                        if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
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
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-4 sm:pb-0"
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
                      await pauseSpotifyPlayback().catch(() => {});
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

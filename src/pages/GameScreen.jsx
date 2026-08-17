import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTACK_COST, ATTACK_TYPES, DEDICALO_PLAYLISTS, GAME_MODES, REDEEM_YEAR_COST, getCombinedTimelineYears, getPlayerPresence, getTimelineProgress, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import HeaderHUD from '../components/HeaderHUD';
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
                    {player.avatar?.startsWith?.('http') ? (
                      <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-base shrink-0">{player.avatar || '•'}</span>
                    )}
                    <span className="text-sm font-bold text-white truncate flex-1">{player.name}{isMe ? ' (tú)' : ''}</span>
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



function getTimelineSlotLabel(years, index, isReversed = false) {
  if (isReversed) {
    if (index === 0) return `Mas reciente que ${years[0]}`;
    if (index === years.length) return `Mas antiguo que ${years[years.length - 1]}`;
    return `Entre ${years[index - 1]} y ${years[index]}`;
  }
  if (index === 0) return `Antes de ${years[0]}`;
  if (index === years.length) return `Después de ${years[years.length - 1]}`;
  return `Entre ${years[index - 1]} y ${years[index]}`;
}

function getAttackCopy(attack) {
  const fallback = ATTACK_TYPES[attack?.type] || ATTACK_TYPES.reverse_order;
  return {
    title: attack?.title || fallback.name,
    short: fallback.short,
    description: attack?.description || fallback.description,
    icon: fallback.icon
  };
}

// El sabotaje nunca borra ni cambia tus años reales — solo los muestra
// desordenados en pantalla durante esta ronda. Si te los sabes de memoria,
// el ataque no te afecta en absoluto; es presión visual, no daño real.
function scrambleYear(year) {
  const str = String(year);
  if (str.length !== 4) return '????';
  return `${str[3]}${str[1]}${str[2]}${str[0]}`;
}

// Disco de vinilo decorativo para un año ya conseguido: surco texturizado +
// etiqueta central de color con el año. Puramente visual, no es tappable —
// solo los huecos entre discos (VinylSlotButton) responden al tacto.
function VinylYearChip({ year, isScrambled, wobble }) {
  const label = isScrambled ? scrambleYear(year) : year;
  return (
    <div
      className="relative shrink-0 snap-center"
      style={{ width: 'var(--vinyl-size, 6.5rem)', height: 'var(--vinyl-size, 6.5rem)', transform: `translateY(${wobble}px)` }}
    >
      <div
        className={`absolute inset-0 rounded-full border-2 shadow-[0_10px_22px_rgba(0,0,0,0.4)] ${isScrambled ? 'border-error/50' : 'border-black/60'}`}
        style={{
          background: isScrambled
            ? 'repeating-radial-gradient(circle, #1a0505 0 3px, #2a0a0a 4px 4.5px, #1a0505 5px 7px)'
            : 'repeating-radial-gradient(circle, #0a0a0a 0 3px, #1c1c1c 4px 4.5px, #0a0a0a 5px 7px)'
        }}
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent_0_20deg,rgba(255,255,255,0.14)_20deg_26deg,transparent_26deg_170deg,rgba(255,255,255,0.08)_170deg_176deg,transparent_176deg_360deg)]" />
      </div>
      <div className={`absolute inset-[15%] rounded-full flex items-center justify-center border-2 border-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] ${isScrambled ? 'bg-error animate-pulse' : 'bg-electric-purple'}`}>
        <span
          className={`font-stats-xl font-black leading-none text-white ${isScrambled ? 'tracking-widest' : ''}`}
          style={{ fontSize: 'clamp(1rem, 4.5vw, 1.35rem)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// Disco dorado = una canción comprada con puntos (ver REDEEM_YEAR_COST), no
// acertada. Cuenta igual para la meta, pero se distingue con una estrella en
// vez de un año — así el jugador ve de un vistazo cuánto de su progreso es
// "de oído" y cuánto es canjeado.
function WildcardChip({ wobble }) {
  return (
    <div
      className="relative shrink-0 snap-center"
      style={{ width: 'var(--vinyl-size, 6.5rem)', height: 'var(--vinyl-size, 6.5rem)', transform: `translateY(${wobble}px)` }}
    >
      <div
        className="absolute inset-0 rounded-full border-2 border-black/60 shadow-[0_10px_22px_rgba(0,0,0,0.4)]"
        style={{ background: 'repeating-radial-gradient(circle, #1a1405 0 3px, #2a2008 4px 4.5px, #1a1405 5px 7px)' }}
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent_0_20deg,rgba(255,255,255,0.14)_20deg_26deg,transparent_26deg_170deg,rgba(255,255,255,0.08)_170deg_176deg,transparent_176deg_360deg)]" />
      </div>
      <div className="absolute inset-[15%] rounded-full flex items-center justify-center border-2 border-black/50 bg-chaos-gold shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]">
        <span className="material-symbols-outlined text-black text-2xl">star</span>
      </div>
    </div>
  );
}

// Hueco tappable entre dos discos: el jugador toca aquí para decir dónde
// cree que va la canción nueva. Mismo lenguaje circular que los vinilos,
// pero como "funda vacía" (anillo punteado) para leerse claramente como
// interactivo frente a los discos ya colocados.
function VinylSlotButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Colocar canción: ${label}`}
      className="group relative shrink-0 snap-center rounded-full border-2 border-dashed border-neon-green/50 bg-neon-green/5 text-neon-green flex flex-col items-center justify-center active:scale-90 transition-transform hover:bg-neon-green/15 hover:border-neon-green focus:outline-none focus:ring-2 focus:ring-neon-green disabled:opacity-40"
      style={{ width: 'var(--vinyl-size, 6.5rem)', height: 'var(--vinyl-size, 6.5rem)' }}
    >
      <span className="material-symbols-outlined text-3xl leading-none">add</span>
      <span className="absolute -bottom-11 w-36 text-center text-[clamp(0.7rem,2.8vw,0.85rem)] font-bold font-label-caps leading-tight text-white group-hover:text-neon-green transition-colors">
        {label}
      </span>
    </button>
  );
}

function AttackWarningOverlay({ attack, onClose }) {
  if (!attack) return null;
  const attackCopy = getAttackCopy(attack);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.28 }}
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
        {/* Icon */}
        <motion.div
          animate={{ rotate: [-3, 3, -3], scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 0.65 }}
          className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/80 bg-black/30 shadow-[0_0_80px_rgba(255,255,255,0.50),0_0_140px_rgba(200,0,255,0.35)]"
        >
          <span className="material-symbols-outlined text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">{attackCopy.icon}</span>
        </motion.div>

        {/* Labels */}
        <p className="mt-6 font-label-caps text-xs tracking-[0.36em] text-white/70">⚡ ALERTA DE SABOTAJE ⚡</p>
        <h2
          className="mt-2 font-headline-lg font-black leading-[0.88] drop-shadow-[0_8px_30px_rgba(0,0,0,0.40)]"
          style={{ fontSize: 'clamp(3.2rem, 14vw, 5.5rem)' }}
        >
          TE<br />ATACARON
        </h2>

        {/* Who & what */}
        <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-white/25 bg-black/30 px-4 py-3 backdrop-blur-sm">
          <p className="text-base font-black leading-snug text-white">
            <span className="text-chaos-gold">{attack.from || 'Un rival'}</span> lanzó:{' '}
            <span className="text-white">{attackCopy.title}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            {attackCopy.description}
          </p>
        </div>

        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/65">
          Respira, mira el ritmo y coloca la canción igual de siempre.
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

function TimelinePlacementQuestion({ question, playerYears = [], wildcards = 0, disabled, onPick, activeAttack, targetYears = 12 }) {
  const years = playerYears.length ? playerYears : [2000];
  const attackType = activeAttack?.type;
  const isReversed = attackType === 'reverse_order';
  const isMirrored = attackType === 'mirror_year';
  const isSlippery = attackType === 'slippery_tap';
  const visibleYears = isReversed ? [...years].reverse() : years;
  const slots = Array.from({ length: visibleYears.length + 1 }, (_, index) => index);
  const correctSlot = isReversed
    ? visibleYears.filter((year) => year >= question.songYear).length
    : visibleYears.filter((year) => year <= question.songYear).length;
  const getEffectiveSlot = (slot) => {
    if (!isSlippery) return slot;
    if (slots.length <= 1) return slot;
    return slot >= slots.length - 1 ? slot - 1 : slot + 1;
  };
  const attackCopy = activeAttack ? getAttackCopy(activeAttack) : null;

  return (
    <div className="mt-5">
      <div className="rounded-3xl border border-neon-green/20 bg-[radial-gradient(circle_at_top,rgba(57,255,20,0.12),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.24)_100%)] p-4 shadow-[0_0_30px_rgba(57,255,20,0.08)]">
        {activeAttack && (
          <div className="mb-3 rounded-xl bg-error/20 border border-error/50 p-2.5 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-error text-lg animate-pulse">bolt</span>
            <p className="text-sm font-bold leading-snug text-error">
              {activeAttack.from || 'Un rival'} activo {attackCopy.title}: {attackCopy.short || attackCopy.description}
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

        {/* Estante de vinilos: riel horizontal con snap-scroll, discos y huecos
            alternados en un leve vaivén vertical para que se lea como una
            colección real y no una grilla rígida. */}
        <div className="relative mt-6 overflow-x-auto overflow-y-visible pb-16 pt-2 snap-x no-scrollbar sm:mt-8">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="relative min-w-max flex items-center gap-3 px-2">
            {slots.map((slot, index) => (
              <div key={slot} className="flex items-center gap-3">
                <VinylSlotButton
                  label={getTimelineSlotLabel(visibleYears, slot, isReversed)}
                  disabled={disabled}
                  onClick={() => {
                    const effectiveSlot = getEffectiveSlot(slot);
                    onPick({
                      isCorrect: effectiveSlot === correctSlot,
                      timelineSlot: slot,
                      effectiveSlot,
                      attackType
                    });
                  }}
                />
                {index < visibleYears.length && (
                  <VinylYearChip
                    year={visibleYears[index]}
                    isScrambled={isMirrored}
                    wobble={index % 2 === 0 ? -6 : 6}
                  />
                )}
              </div>
            ))}
            {wildcards > 0 && Array.from({ length: wildcards }, (_, index) => (
              <WildcardChip key={`wildcard-${index}`} wobble={(visibleYears.length + index) % 2 === 0 ? -6 : 6} />
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
          {isSlippery
            ? 'Ojo: esta ronda el toque puede saltar al hueco vecino. Juega con sangre fria.'
            : 'Tu ruta es personal. Si no ves todos los discos, desliza la fila hacia los lados.'}
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
    hostCloseRoom,
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
  const [selectedAttackType, setSelectedAttackType] = useState('reverse_order');
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
  const expectedVotes = players.filter((player) => getPlayerPresence(player).status !== 'kicked').length || players.length;
  const mode = GAME_MODES[gameMode] || GAME_MODES.timeline;
  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  ));
  const ownPlayer = players.find((player) => player.id === guestId);
  const ownTimelineYears = getCombinedTimelineYears(ownPlayer);
  const incomingAttack = ownPlayer?.activeAttack?.round === round ? ownPlayer.activeAttack : null;
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
              <div className="flex flex-wrap items-center justify-center gap-2">
                {canAttack && (
                  <button
                    type="button"
                    onClick={() => { setAttackError(''); setShowAttackModal(true); }}
                    className="min-h-touch rounded-full border border-vinyl-orange/40 bg-vinyl-orange/10 px-4 flex items-center gap-2 text-vinyl-orange font-label-caps text-sm font-bold active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">bolt</span>
                    SABOTEAR ({ATTACK_COST} PTS)
                  </button>
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
                  <div className="mt-3 flex flex-wrap justify-center gap-3">
                    {players.map((player) => {
                      const answered = Boolean(roundAnswers?.[player.id]);
                      return (
                        <div key={player.id} className="relative flex flex-col items-center gap-1">
                          {player.avatar?.startsWith?.('http') ? (
                            <img
                              src={player.avatar}
                              alt={player.name}
                              className={`w-10 h-10 rounded-full object-cover border-2 transition-all ${answered ? 'border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]' : 'border-white/15 opacity-35'}`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-black/20 border-2 transition-all ${answered ? 'border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]' : 'border-white/15 opacity-35'}`}>
                              {player.avatar || '•'}
                            </div>
                          )}
                          {answered && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-green flex items-center justify-center">
                              <span className="material-symbols-outlined text-black" style={{ fontSize: '10px', lineHeight: 1 }}>check</span>
                            </span>
                          )}
                          <span className="max-w-[3.75rem] truncate font-label-caps text-xs text-on-surface-variant">{player.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!hasAnswered && (
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
                  disabled={!hasAnswered}
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
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-electric-purple/40 bg-[#160725] p-6 text-center shadow-[0_0_80px_rgba(168,85,247,0.42)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.34),transparent_38%),radial-gradient(circle_at_15%_90%,rgba(255,122,26,0.18),transparent_35%)]" />
              <div className="relative">
              <span className="material-symbols-outlined text-electric-purple drop-shadow-[0_0_24px_rgba(168,85,247,0.75)]" style={{ fontSize: '3rem' }}>bolt</span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">SABOTEAR RIVAL</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Por <span className="text-vinyl-orange font-bold">{ATTACK_COST} pts</span>, eliges una trampa visual para la proxima ronda. No borra progreso: solo crea caos divertido.
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
                    className="min-h-touch rounded-2xl border border-white/12 bg-white/8 px-4 flex items-center justify-between gap-2 text-white font-bold text-sm active:scale-95 transition-all hover:border-electric-purple/60 hover:bg-electric-purple/15"
                  >
                    <span className="truncate">{target.name}</span>
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
                  ? 'Se mostrará el ranking final a todos los jugadores. ¿Estás seguro'
                  : 'Perderás tu progreso en esta ronda.'}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setShowExitConfirm(false);
                    if (role === 'host') {
                      await pauseSpotifyPlayback().catch(() => {});
                      hostCloseRoom();
                      navigate('/role-selection');
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

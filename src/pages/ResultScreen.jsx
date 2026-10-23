import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCombinedTimelineYears, getTimelineProgress, useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';
import ProfileMenu from '../components/ProfileMenu';
import JoinRequestBanner from '../components/JoinRequestBanner';
import TimelineYears from '../components/TimelineYears';
import { auth } from '../firebase';
import { sfx } from '../services/audio';
import { vibrar } from '../services/haptics';

const RESULT_STYLES = {
  success: {
    bgColor: '#071a07',
    glowColor: 'rgba(57,255,20,0.4)',
    colorOverlay: 'rgba(57,255,20,0.06)',
    border: 'border-neon-green',
    borderHex: '#39ff14',
    text: 'text-neon-green',
    icon: 'check_circle',
    // Es exactamente lo que se ve en pantalla: antes aquí decía
    // '¡ACERTASTE!' pero el render lo pisaba con 'CORRECTO' (texto muerto).
    title: 'CORRECTO'
  },
  fail: {
    bgColor: '#1a0707',
    glowColor: 'rgba(255,45,45,0.4)',
    colorOverlay: 'rgba(255,45,45,0.08)',
    border: 'border-intense-red',
    borderHex: '#ff2d2d',
    text: 'text-intense-red',
    icon: 'cancel',
    title: 'FALLASTE'
  },
  blocked: {
    bgColor: '#1a0f07',
    glowColor: 'rgba(255,122,26,0.4)',
    colorOverlay: 'rgba(255,122,26,0.08)',
    border: 'border-vinyl-orange',
    borderHex: '#ff7a1a',
    text: 'text-vinyl-orange',
    icon: 'block',
    title: 'BLOQUEADO'
  }
};



function PlayerAvatar({ player, className = 'w-10 h-10 text-xl', style }) {
  return isImageAvatar(player.avatar) ? (
    <img src={player.avatar} alt={player.name} className={`${className} rounded-full object-cover border border-white/10 shrink-0`} style={style} />
  ) : (
    <span className={`${className} rounded-full bg-black/20 flex items-center justify-center shrink-0`} style={style}>
      {player.avatar || '•'}
    </span>
  );
}

// Puesto por años con empates compartidos: 1 + cuántos tienen ESTRICTAMENTE
// más años. Es el mismo criterio que la cabecera; desempatar por puntos
// mandaba al fondo a medio grupo cuando todos iban 1/12.
function rankByYears(players, player) {
  const years = getTimelineProgress(player);
  return 1 + players.filter((other) => getTimelineProgress(other) > years).length;
}

function isTiedOnYears(players, player) {
  const years = getTimelineProgress(player);
  return players.some((other) => other.id !== player.id && getTimelineProgress(other) === years);
}

// Sello "TÚ": en una lista de 6 avatares cuesta encontrarse a uno mismo.
function YouBadge() {
  return (
    <span className="shrink-0 rounded-full bg-electric-purple px-1.5 py-0.5 font-label-caps text-[0.8rem] font-black leading-none text-white">
      TÚ
    </span>
  );
}

// startRank: cuando esta lista muestra solo "el resto" (a partir del 4to
// puesto), el número de cada fila tiene que seguir la numeración real del
// ranking completo, no reiniciar en 1.
function RankingList({ players, final = false, showTimeline = false, goalYears = 12, startRank = 0, muted = false, meId = null }) {
  if (!players.length) return null;
  return (
    <div className="flex flex-col gap-2 w-full">
      {players.map((player, index) => {
        const rank = startRank + index;
        // Oro/plata/bronce iguales que en el podio (#ffbf4d/#e2e8f0/#ff7a1a):
        // el primer puesto es dorado en toda la app, no verde.
        const medalClass = rank === 0
          ? 'bg-chaos-gold text-black'
          : rank === 1 ? 'bg-[#e2e8f0] text-black'
            : rank === 2 ? 'bg-vinyl-orange text-black'
              : 'bg-black/20 text-on-surface-variant';
        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`p-4 rounded-2xl border ${final && rank === 0 ? 'bg-chaos-gold/10 border-chaos-gold/50' : muted ? 'bg-white/[0.03] border-white/5 opacity-70' : 'bg-white/5 border-white/10'}`}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${medalClass}`}>
                  {rank + 1}
                </span>
                <PlayerAvatar player={player} className="w-20 h-20 text-4xl border-2 border-white/15" />
                <span className="font-label-caps text-xl font-black uppercase tracking-wide truncate">{player.name}</span>
                {meId && player.id === meId && <YouBadge />}
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base text-neon-green leading-none tabular-nums">{getTimelineProgress(player)}/{goalYears} <span className="text-sm font-bold">años</span></p>
                <p className="mt-0.5 text-xs text-on-surface-variant leading-none">{player.points} pts</p>
              </div>
            </div>
            {showTimeline && <TimelineYears years={getCombinedTimelineYears(player)} wildcards={Number(player.wildcards || 0)} goalYears={goalYears} className="pl-11" />}
          </motion.div>
        );
      })}
    </div>
  );
}

const CONFETTI_COLORS = ['#39ff14', '#ffbf4d', '#a855f7', '#ff7a1a', '#ff6b8b', '#3f78ff', '#ffffff'];

// Piezas generadas una sola vez (useMemo) para que no se recalculen en cada
// re-render — cada una lleva su propia posición/color/duración vía CSS
// custom properties, así la animación corre en el compositor y no en React.
function ConfettiField({ count = 30 }) {
  // Estado con inicializador perezoso, no useMemo: es el único lugar donde
  // React permite generar un valor aleatorio una sola vez "durante" el
  // render sin violar la regla de pureza (no vuelve a ejecutarse en
  // re-renders posteriores, a diferencia del cuerpo del componente).
  const [pieces] = useState(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.round(Math.random() * 100)}%`,
    size: `${6 + Math.round(Math.random() * 6)}px`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    duration: `${3.5 + Math.random() * 3}s`,
    delay: `${-Math.random() * 6}s`,
    drift: `${Math.round((Math.random() - 0.5) * 160)}px`,
    spin: `${Math.round(320 + Math.random() * 400)}deg`
  })));

  return (
    // z-0 explícito: el bloque del titular va en z-10, así el confeti cae
    // POR DETRÁS del nombre del ganador y no lo tapa.
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            '--left': p.left,
            '--size': p.size,
            '--color': p.color,
            '--duration': p.duration,
            '--delay': p.delay,
            '--drift': p.drift,
            '--spin': p.spin
          }}
        />
      ))}
    </div>
  );
}

// Ondas musicales celebrando — reusa el mismo lenguaje visual del
// ecualizador que ya aparece durante la partida, pero cicla por los colores
// de fiesta en vez de un solo color fijo.
function CelebrationWaves({ className = '' }) {
  const bars = [30, 62, 42, 84, 52, 96, 46, 74, 38, 80, 56, 90, 42];
  return (
    <div className={`flex items-end justify-center gap-1 ${className}`} aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={index}
          className="eq-bar w-1.5 rounded-t-full"
          style={{
            height: `${height}%`,
            maxHeight: '100%',
            backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            boxShadow: `0 0 12px ${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}`,
            animationDelay: `${index * 0.05}s`
          }}
        />
      ))}
    </div>
  );
}

// clamp() en vez de un ancho Tailwind fijo — con 3 columnas flex-1 en un
// viewport angosto (360-390px) un w-32 fijo se desborda de su columna; el
// clamp crece en pantallas más anchas pero nunca pasa del hueco disponible.
const PODIUM_STYLE = {
  0: { order: 'order-2', avatarSize: 'min(9rem, max(4.5rem, 27vw), 36.5vh)', stepHeight: 'h-28', color: '#ffbf4d', label: '1°', ring: '0 0 55px rgba(255,191,77,0.55)' },
  1: { order: 'order-1', avatarSize: 'min(6.75rem, max(3.6rem, 20vw), 27.0vh)', stepHeight: 'h-16', color: '#e2e8f0', label: '2°', ring: '0 0 30px rgba(226,232,240,0.35)' },
  2: { order: 'order-3', avatarSize: 'min(5.75rem, max(3.2rem, 17.5vw), 23.6vh)', stepHeight: 'h-10', color: '#ff7a1a', label: '3°', ring: '0 0 30px rgba(255,122,26,0.35)' }
};

function PodiumSlot({ player, rank, goalYears, isMe = false }) {
  const style = PODIUM_STYLE[rank];
  const isChampion = rank === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: rank === 1 ? 0.1 : rank === 2 ? 0.3 : 0.55, type: 'spring', stiffness: 160, damping: 16 }}
      className={`flex flex-1 flex-col items-center ${style.order}`}
    >
      {isChampion && (
        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="crown-bounce-anim -mb-2 text-4xl drop-shadow-[0_0_16px_rgba(255,191,77,0.8)]"
        >
          👑
        </motion.span>
      )}
      <div className="relative z-10" style={{ filter: `drop-shadow(${style.ring})` }}>
        <PlayerAvatar
          player={player}
          className="border-2"
          style={{ width: style.avatarSize, height: style.avatarSize, fontSize: isChampion ? '3rem' : '2rem' }}
        />
        {isChampion && (
          <>
            <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-lg float-slow">🎶</span>
            <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-lg float-medium">🎵</span>
          </>
        )}
      </div>
      <p className="mt-2 max-w-[7rem] truncate text-center font-label-caps font-black uppercase tracking-wide text-white" style={{ fontSize: isChampion ? '1.2rem' : '1rem' }}>
        {player.name}
      </p>
      {isMe && <YouBadge />}
      {/* Se gana por años: van en blanco y primero; los puntos, debajo. */}
      <p className="mt-0.5 text-base font-black leading-tight text-white tabular-nums">
        {getTimelineProgress(player)}/{goalYears} <span className="text-sm font-bold text-on-surface-variant">años</span>
      </p>
      <p className="text-sm leading-tight text-on-surface-variant tabular-nums">{player.points} pts</p>
      <div
        className={`mt-2 flex w-full items-start justify-center rounded-t-2xl ${style.stepHeight}`}
        style={{ background: `linear-gradient(180deg, ${style.color}33, ${style.color}0d)`, border: `1px solid ${style.color}55` }}
      >
        <span className="mt-2 font-headline-lg text-2xl font-black" style={{ color: style.color }}>{style.label}</span>
      </div>
    </motion.div>
  );
}

function Podium({ podium, goalYears, meId = null }) {
  return (
    <div className="mt-2 flex w-full items-end justify-center gap-2 px-1">
      {podium.map((player, index) => (
        <PodiumSlot key={player.id} player={player} rank={index} goalYears={goalYears} isMe={Boolean(meId) && player.id === meId} />
      ))}
    </div>
  );
}

export default function ResultScreen() {
  const navigate = useNavigate();
  const [shareCopied, setShareCopied] = useState(false);
  const {
    role, phase, players, pin,
    hostNextRound, hostCloseRoom, hostEndGame, hostRestartGame, guestLeaveRoom, guestId,
    lastResultType, lastPointDelta, revealResults, currentTrack, roomError, clearRoomError, guestAvatar,
    targetYears
  } = useGameStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const guestReveal = revealResults?.[guestId] || null;
  const guestPoints = guestReveal?.points ?? players.find((p) => p.id === guestId)?.points ?? 10;
  // Se gana por años, no por puntos: el progreso propio es el número
  // protagonista del resultado de la ronda.
  const ownPlayer = players.find((p) => p.id === guestId) || null;
  const myYears = ownPlayer ? getTimelineProgress(ownPlayer) : null;
  const goalYears = targetYears || 12;
  const isFinal = phase === 'final';
  const winner = Array.isArray(players) && players.length
    ? [...players].sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a))[0]
    : null;
  const resultType = guestReveal?.resultType || lastResultType || 'success';
  const pointDelta = guestReveal?.delta ?? lastPointDelta;
  const wasYearStolen = Boolean(guestReveal?.stolen);
  const style = RESULT_STYLES[resultType] || RESULT_STYLES.success;
  const isSuccess = resultType === 'success';
  const isFail = resultType === 'fail';
  const resultWord = style.title;
  // Acertaste, pero el sabotaje "Robo de año" se llevó el año igual —
  // avisar aparte porque el estilo base sigue siendo "success" (sí sumaste
  // puntos), solo que tu ruta no creció esta vez.
  // Solo se conserva la frase que da información nueva (el robo): las de
  // ánimo genéricas eran relleno que empujaba el año revelado fuera de vista.
  const resultCopy = wasYearStolen
    ? `${guestReveal?.stolenBy || 'Un rival'} te robó el año con su sabotaje. Sumaste puntos, pero tu ruta no creció esta vez.`
    : null;
  // Bonus por contestar primero. La informacion viaja montada en elementos
  // que ya existen (el chip del delta y la linea de copy), no en paneles
  // nuevos: se entera todo el mundo sin meter ruido visual.
  const speedBonus = Number(guestReveal?.speedBonus || 0);
  const speedWinnerName = guestReveal?.speedWinnerName || null;
  const iWasFastest = speedBonus > 0;

  const deltaColor = pointDelta > 0 ? 'text-neon-green' : pointDelta < 0 ? 'text-intense-red' : 'text-white/30';
  const deltaLabel = pointDelta > 0 ? `+${pointDelta}` : pointDelta !== 0 ? String(pointDelta) : null;

  // Sigue a la sala cuando el anfitrión cambia de fase (empieza otra ronda,
  // vuelve al lobby). El guard de pin/role es imprescindible: al SALIR o
  // CERRAR SALA, el store deja phase en 'lobby' con role/pin ya en null, y
  // sin el guard este efecto disparaba navigate('/lobby') pisando el
  // navigate('/role-selection') de handleFinish — el anfitrión terminaba en
  // el lobby viendo "ESPERANDO AL ANFITRIÓN", y el invitado igual.
  useEffect(() => {
    if (!pin || !role) return;
    if (phase === 'lobby') navigate('/lobby');
    if (phase === 'countdown' || phase === 'listen' || phase === 'blackout') navigate('/game');
  }, [phase, pin, role, navigate]);

  // Sonido y vibración del resultado. Este es el ÚNICO sitio donde suenan
  // acierto/fallo: al tocar la respuesta GameScreen ya solo da un sonido
  // neutro, porque el resultado OFICIAL lo decide el anfitrión (puede
  // diferir si hubo bloqueo/robo de año). Solo en la ronda, no en el podio.
  useEffect(() => {
    if (isFinal) return undefined;
    // Primero el "golpe" de revelar el año; el patrón de acierto/fallo va
    // un poco después porque navigator.vibrate cancela el patrón anterior
    // y, lanzados juntos, el de revelar no llegaría a notarse.
    vibrar('revelar');
    // El sonido va SIEMPRE, la vibracion solo donde existe: en iPhone no
    // hay vibracion posible en web, y el resultado de la ronda no puede
    // quedarse sin confirmacion en la mitad de los moviles.
    let patron = null;
    if (resultType === 'success') { sfx.acierto(); patron = 'acierto'; }
    else if (resultType === 'fail') { sfx.fallo(); patron = 'fallo'; }
    if (!patron) return undefined;
    const timer = window.setTimeout(() => vibrar(patron), 220);
    return () => window.clearTimeout(timer);
  }, [isFinal, resultType]);

  // Podio final: antes era completamente mudo. Suena una sola vez por
  // partida — el ref evita que cualquier re-render (llega un jugador, cambia
  // la presencia de alguien) vuelva a lanzar la fanfarria.
  const victoryPlayedRef = useRef(false);
  useEffect(() => {
    if (!isFinal) { victoryPlayedRef.current = false; return; }
    if (victoryPlayedRef.current) return;
    victoryPlayedRef.current = true;
    sfx.victoria();
    vibrar('victoria');
  }, [isFinal]);

  useEffect(() => {
    if (roomError) { clearRoomError(); navigate('/role-selection'); }
  }, [roomError, clearRoomError, navigate]);

  const handleFinish = () => {
    if (role === 'host') hostCloseRoom();
    if (role === 'guest') guestLeaveRoom();
    navigate('/role-selection');
  };

  // Confirmar salida desde el resultado DE RONDA (no el podio final todavía)
  // — el anfitrión también tiene que ver el ranking antes de irse, no
  // saltárselo. hostEndGame solo marca fase 'final' sin cerrar la sesión;
  // como seguimos en esta misma pantalla, el componente re-renderiza solo
  // hacia el podio (isFinal) apenas llega el cambio de fase.
  const handleHostEndFromRound = async () => {
    setShowExitConfirm(false);
    await hostEndGame();
  };

  // Mismo pin, mismo grupo, marcador en cero — el anfitrión puede cambiar
  // playlist y meta de años en el lobby antes de arrancar la revancha.
  const handlePlayAgain = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    try {
      await hostRestartGame();
      navigate('/lobby');
    } catch (error) {
      console.error('Error al reiniciar la partida:', error);
      setIsRestarting(false);
    }
  };

  const handleShare = async () => {
    const text = isFinal && winner
      ? `¡${winner.name} ganó en Dedícalo con ${getTimelineProgress(winner)} años en su ruta! 🎵 ¿Te atreves ${window.location.origin}`
      : `Llevo ${guestPoints} puntos en Dedícalo 🎵 ${window.location.origin}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Dedícalo', text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(text);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      // El usuario canceló el panel de compartir.
    }
  };


  // FINAL screen — Años Locos. Se ve exactamente igual tanto si la partida
  // terminó porque alguien llegó a la meta, como si el anfitrión cerró la
  // sala antes de tiempo (hostCloseRoom ya manda phase:'final' con el
  // ranking tal cual iba en ese momento) — siempre hay podio y celebración.
  if (isFinal) {
    const ranked = [...players].sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a));
    const podium = ranked.slice(0, 3);
    const rest = ranked.slice(3);
    // Línea personal: en el podio solo caben tres y el resto tenía que
    // buscarse en la lista para saber cómo le fue.
    const myFinalRank = ownPlayer ? rankByYears(players, ownPlayer) : 0;
    const myFinalTied = ownPlayer ? isTiedOnYears(players, ownPlayer) : false;

    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-[#0a0616] text-white"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <JoinRequestBanner />
        <div
          className="disco-lights pointer-events-none absolute inset-0"
          style={{
            background: [
              'radial-gradient(circle at 18% 12%, rgba(255,191,77,0.28) 0%, transparent 38%)',
              'radial-gradient(circle at 82% 18%, rgba(168,85,247,0.26) 0%, transparent 40%)',
              'radial-gradient(circle at 50% 85%, rgba(57,255,20,0.18) 0%, transparent 45%)'
            ].join(',')
          }}
        />
        <ConfettiField />

        <div className="podio-final mx-auto flex min-h-full max-w-lg flex-col items-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={handleFinish}
            className="absolute top-safe left-4 z-[100] min-h-touch rounded-xl border border-white/12 bg-black/35 px-3 text-white/75 font-label-caps text-[0.8rem] tracking-[0.16em] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">arrow_back</span>
            {role === 'host' ? 'CERRAR' : 'SALIR'}
          </button>
          <div className="absolute top-safe right-4 z-[100]">
            <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
          </div>

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full text-center"
          >
            <p className="font-label-caps text-electric-purple tracking-widest text-xs">
              META {goalYears} AÑOS
            </p>
            <h1 className="font-headline-lg text-3xl font-black mt-1 mb-1">¡SE ACABÓ LA FIESTA!</h1>
            {/* El nombre del ganador es lo más grande del podio: es lo que
                todo el mundo busca con la mirada (y lo que se fotografía). */}
            {podium[0] && (
              <>
                <p className="mt-2 break-words font-headline-lg text-4xl font-black uppercase leading-none text-chaos-gold drop-shadow-[0_0_18px_rgba(255,191,77,0.45)]">
                  {podium[0].name}
                </p>
                <p className="mt-1 text-base text-on-surface-variant">se queda con la cabina 🎧</p>
              </>
            )}
            {myFinalRank > 0 && (
              <p className="mt-2 font-label-caps text-lg font-black tracking-wide text-white tabular-nums">
                Tú: {myFinalTied ? '=' : ''}{myFinalRank}º · {myYears}/{goalYears} años
              </p>
            )}

            {podium.length > 0 && <Podium podium={podium} goalYears={goalYears} meId={guestId} />}

            <CelebrationWaves className="mt-6 h-14" />

            {rest.length > 0 && (
              <div className="mt-6 w-full text-left">
                <p className="mb-2 flex items-center gap-1.5 font-label-caps text-sm tracking-[0.18em] text-white/75">
                  CASI CASI 😅
                </p>
                <RankingList players={rest} startRank={3} goalYears={goalYears} muted meId={guestId} />
              </div>
            )}

            {/* Barra fina a propósito: una acción principal y dos secundarias
                en una sola fila, para que el podio se vea sin desplazar. */}
            <div className="accion-ronda barra-inferior mt-6 flex flex-col gap-2">
              {role === 'host' && (
                <button
                  type="button"
                  data-accion="principal"
                  onClick={handlePlayAgain}
                  disabled={isRestarting}
                  className="btn-primario"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">{isRestarting ? 'autorenew' : 'replay'}</span>
                  {isRestarting ? 'PREPARANDO REVANCHA...' : 'JUGAR OTRA VEZ'}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {/* Al girar, el carril lateral solo tiene sitio para un botón
                    vertical (unos 300 px): el del anfitrión es JUGAR OTRA VEZ,
                    así que su COMPARTIR se esconde. El invitado no tiene botón
                    principal y conserva COMPARTIR. */}
                <button
                  type="button"
                  data-ocultar-girado={role === 'host' ? '' : undefined}
                  onClick={handleShare}
                  className="flex min-h-[3rem] min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-surface-container px-2 py-1 text-center font-label-caps text-sm font-bold leading-tight text-white active:scale-95 transition-transform"
                >
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-base">share</span>
                  {shareCopied ? 'COPIADO' : 'COMPARTIR RESULTADO'}
                </button>
                {/* Secundario y oculto al girar: arriba a la izquierda ya
                    está "← CERRAR/SALIR", que hace lo mismo. */}
                <button
                  type="button"
                  data-ocultar-girado
                  onClick={handleFinish}
                  className="flex min-h-[3rem] min-w-0 items-center justify-center rounded-xl border border-white/15 bg-surface-container px-2 py-1 text-center font-label-caps text-sm font-bold uppercase leading-tight text-white/90 active:scale-95 transition-transform"
                >
                  {role === 'host' ? 'CERRAR SALA' : 'SALIR'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.main>
    );
  }

  // NON-FINAL screen — diseño compacto
  const sortedPlayers = [...players].sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a));

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto text-white"
      style={{ backgroundColor: style.bgColor, overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
    >
      <JoinRequestBanner />
      {/* Blurred album art backdrop */}
      {currentTrack?.albumImage && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url(${currentTrack.albumImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) saturate(1.4)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            `radial-gradient(circle at 50% 12%, ${style.glowColor} 0%, transparent 34%)`,
            `linear-gradient(180deg, ${style.colorOverlay} 0%, rgba(0,0,0,0.72) 100%)`
          ].join(',')
        }}
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.22, scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="absolute inset-x-0 top-12 mx-auto h-80 w-80 rounded-full pointer-events-none"
        style={{
          border: `2px solid ${style.borderHex}`,
          boxShadow: `0 0 90px ${style.glowColor}, inset 0 0 60px ${style.glowColor}`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none opacity-30">
        <div className="mx-auto flex h-full max-w-lg items-end justify-center gap-1.5 px-6">
          {[28, 56, 36, 78, 48, 90, 42, 68, 34, 72, 50, 84, 38].map((height, index) => (
            <motion.span
              key={`${height}-${index}`}
              animate={{ height: [`${height * 0.45}%`, `${height}%`, `${height * 0.55}%`] }}
              transition={{ repeat: Infinity, duration: 0.55 + index * 0.035, delay: index * 0.025 }}
              className="w-3 rounded-t-full"
              style={{ backgroundColor: style.borderHex, boxShadow: `0 0 18px ${style.glowColor}` }}
            />
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="ronda-resultado relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-safe left-4 z-[100] min-h-touch rounded-xl border border-white/12 bg-black/35 px-3 text-white/75 font-label-caps text-[0.8rem] tracking-[0.16em] flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">arrow_back</span>
          {role === 'host' ? 'CERRAR' : 'SALIR'}
        </button>

        <div className="absolute top-safe right-4 z-[100]">
          <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
        </div>
        {/* Resultado personal */}
        <motion.div
          initial={{ y: -18, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 18 }}
          className={`relative overflow-hidden rounded-[2rem] border ${style.border} bg-black/35 px-5 py-5 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]`}
          style={{ boxShadow: `0 18px 80px rgba(0,0,0,0.45), 0 0 70px ${style.glowColor}` }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              background: `repeating-linear-gradient(90deg, transparent 0 14px, ${style.borderHex}22 14px 16px)`,
            }}
          />
          <motion.div
            initial={{ rotate: -18, scale: 0.6, opacity: 0 }}
            animate={isFail ? { rotate: [0, -6, 6, -4, 4, 0], scale: 1, opacity: 1 } : { rotate: 0, scale: 1, opacity: 1 }}
            transition={isFail
              ? { delay: 0.08, duration: 0.5, ease: 'easeInOut' }
              : { delay: 0.08, type: 'spring', stiffness: 160, damping: 15 }}
            className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[repeating-radial-gradient(circle,#050505_0_4px,#171717_5px_7px,#050505_8px_12px)]"
            style={{ border: `3px solid ${style.borderHex}`, boxShadow: `0 0 45px ${style.glowColor}` }}
          >
            <motion.span
              animate={{ scale: [1, 1.22, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className={`material-symbols-outlined ${style.text}`}
              style={{ fontSize: '2.3rem' }}
            >
              {style.icon}
            </motion.span>

            {/* Ganaste: te pones las gafas de campeón. */}
            {isSuccess && !wasYearStolen && (
              <motion.span
                aria-hidden="true"
                initial={{ y: -46, opacity: 0, rotate: -20, scale: 0.4 }}
                animate={{ y: -10, opacity: 1, rotate: -8, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 12 }}
                className="absolute left-1/2 top-0 -translate-x-1/2 text-2xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
              >
                😎
              </motion.span>
            )}

            {/* Fallaste: el juego se ríe un poco de ti. */}
            {isFail && (
              <>
                <motion.span
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.3, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: [0, -12, 12, -8, 0] }}
                  transition={{ delay: 0.3, duration: 0.9, repeat: Infinity, repeatDelay: 0.6 }}
                  className="absolute -right-2 -top-2 text-2xl"
                >
                  🤣
                </motion.span>
                <motion.span
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.3, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: [0, 10, -10, 6, 0] }}
                  transition={{ delay: 0.55, duration: 0.9, repeat: Infinity, repeatDelay: 0.6 }}
                  className="absolute -left-3 bottom-0 text-xl"
                >
                  😂
                </motion.span>
              </>
            )}
          </motion.div>

          <motion.h1
            initial={{ letterSpacing: '0.04em', scale: 0.92 }}
            animate={{ letterSpacing: '0.02em', scale: 1 }}
            transition={{ delay: 0.16, type: 'spring', stiffness: 160, damping: 14 }}
            className={`relative mx-auto mt-3 max-w-full break-words px-1 font-headline-lg font-black leading-[0.88] ${style.text}`}
            style={{
              fontSize: 'min(5rem, max(1.5rem, 11vw), 15.5vh)',
              letterSpacing: '0.01em',
              textShadow: `0 0 34px ${style.glowColor}`,
              whiteSpace: 'normal'
            }}
          >
            {resultWord}
          </motion.h1>

          {/* EL AÑO va justo después de la palabra de resultado: es lo que
              todo el mundo espera ver. Antes quedaba al final, en una tarjeta
              aparte medio tapada por la barra de acciones. */}
          {currentTrack?.releaseYear && (
            <motion.p
              initial={{ y: 14, scale: 0.7, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ delay: 0.22, type: 'spring', stiffness: 150, damping: 14 }}
              className="relative mt-4 font-stats-xl font-black leading-none text-white tabular-nums"
              style={{ fontSize: 'min(5.5rem, 22vw, 14vh)', textShadow: `0 0 30px ${style.glowColor}` }}
            >
              <span className="sr-only">La canción es de </span>{currentTrack.releaseYear}
            </motion.p>
          )}
          <div className="relative mx-auto mt-2 flex max-w-full items-center justify-center gap-2.5">
            {currentTrack?.albumImage && (
              <img
                src={currentTrack.albumImage}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10"
              />
            )}
            <p className="min-w-0 text-left text-sm leading-snug line-clamp-2 [text-wrap:balance]">
              <span className="font-bold text-white">{currentTrack?.name || 'Canción de esta ronda'}</span>
              {currentTrack?.artist && <span className="text-white/65"> · {currentTrack.artist}</span>}
            </p>
          </div>

          {/* Debajo, cómo queda TU ruta (es lo que gana la partida) y, en
              pequeño, los puntos: solo son moneda para sabotear o canjear. */}
          {myYears !== null && (
            <p className="relative mt-4 flex items-baseline justify-center gap-1.5 leading-none">
              <span className="font-label-caps text-sm font-bold tracking-widest text-white/70">AÑOS</span>
              <span className="font-stats-xl text-3xl font-black text-white tabular-nums">{myYears}</span>
              <span className="-ml-1 text-base font-bold text-on-surface-variant tabular-nums">/{goalYears}</span>
            </p>
          )}

          <div className="relative mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <p className="text-sm text-white/60 tabular-nums">{guestPoints} pts</p>
            {deltaLabel && (
              <motion.span
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 140 }}
                className={`flex items-center gap-0.5 rounded-full border border-current/30 bg-black/30 px-2 py-0.5 text-sm font-black leading-none tabular-nums ${deltaColor}`}
                title={iWasFastest ? 'Incluye +1 por responder primero' : undefined}
              >
                {deltaLabel}
                {iWasFastest && (
                  <span aria-hidden="true" className="material-symbols-outlined text-chaos-gold" style={{ fontSize: '1rem' }}>bolt</span>
                )}
              </motion.span>
            )}
          </div>

          <div className="relative mt-3 mx-auto max-w-sm empty:hidden">
            {resultCopy && <p className="text-sm leading-relaxed text-white/70 [text-wrap:pretty]">{resultCopy}</p>}
            {/* Una linea, sin recuadro ni animacion: quien gano el punto lo
                ve como logro y el resto se entera de quien fue. */}
            {(iWasFastest || speedWinnerName) && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-chaos-gold/90">
                <span aria-hidden="true" className="material-symbols-outlined text-base">bolt</span>
                {iWasFastest
                  ? '+1 por responder primero'
                  : `${speedWinnerName} respondió primero (+1)`}
              </p>
            )}
          </div>
        </motion.div>
        {/* Ranking compacto */}
        {sortedPlayers.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-2.5"
          >
            <p className="font-label-caps text-sm text-white/75 tracking-widest text-center mb-2">
              ASÍ VAN TODOS
            </p>
            <div className="flex flex-col gap-1.5">
              {sortedPlayers.map((player) => {
                const place = rankByYears(sortedPlayers, player);
                return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                    player.id === guestId
                      ? `border ${style.border} bg-white/5`
                      : 'bg-white/5 border border-white/8'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center shrink-0 ${
                    place === 1 ? 'bg-chaos-gold text-black'
                      : place === 2 ? 'bg-[#e2e8f0] text-black'
                        : place === 3 ? 'bg-vinyl-orange text-black'
                          : 'bg-white/10 text-white'
                  }`}>
                    {place}
                  </span>
                  <PlayerAvatar player={player} className="w-12 h-12 text-2xl border-2 border-white/10" />
                  <span className="font-label-caps text-lg font-black uppercase tracking-wide text-white truncate flex-1">{player.name}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-neon-green">
                      {getTimelineProgress(player)}/{goalYears} AÑOS
                    </p>
                    <p className="text-xs font-bold text-white/55">{player.points} pts</p>
                  </div>
                </div>
                );
              })}
            </div>
          </motion.div>
        )}
        {/* Acciones */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="accion-ronda barra-inferior mt-3 flex flex-col gap-2"
        >
          {role === 'host' ? (
            <button
              type="button"
              data-accion="principal"
              onClick={hostNextRound}
              className="btn-primario"
            >
              SIGUIENTE RONDA
            </button>
          ) : (
            // Texto con un punto que late, no una caja: con borde parecía un
            // botón desactivado que el invitado intentaba pulsar.
            <div role="status" className="flex items-center justify-center gap-2 py-2.5">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-neon-green" />
              <p className="font-label-caps text-sm tracking-widest text-white/70">
                ESPERANDO AL ANFITRIÓN…
              </p>
            </div>
          )}
          {/* Compartir vive en el podio final: a mitad de partida solo
              competía con SIGUIENTE RONDA y tapaba el resultado. */}
        </motion.div>

        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] flex items-end justify-center bg-black/92 px-4 pb-4 sm:items-center sm:pb-0"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ y: 32, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 32, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-container p-5 text-center shadow-[0_0_50px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '2.4rem' }}>
                {role === 'host' ? 'emoji_events' : 'logout'}
              </span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">
                {role === 'host' ? '¿Terminar la partida' : '¿Salir de la partida'}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {role === 'host'
                  ? 'Verás el ranking final con todos, y desde ahí podrás cerrar la sala.'
                  : 'Saldrás de la sala y perderás tu lugar en la partida.'}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={role === 'host' ? handleHostEndFromRound : handleFinish}
                  className="h-12 rounded-xl bg-intense-red text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  {role === 'host' ? 'SÍ, TERMINAR' : 'SÍ, SALIR'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="h-12 rounded-xl border border-white/10 bg-white/5 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  SEGUIR JUGANDO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </div>
    </motion.main>
  );
}

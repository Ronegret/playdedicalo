import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCombinedTimelineYears, getTimelineProgress, useGameStore } from '../store/useGameStore';
import ProfileMenu from '../components/ProfileMenu';
import { auth } from '../firebase';

const RESULT_STYLES = {
  success: {
    bgColor: '#071a07',
    glowColor: 'rgba(57,255,20,0.4)',
    colorOverlay: 'rgba(57,255,20,0.06)',
    border: 'border-neon-green',
    borderHex: '#39ff14',
    text: 'text-neon-green',
    icon: 'check_circle',
    title: '¡ACERTASTE!',
    copy: 'Sumaste puntos y mantienes el pulso.'
  },
  fail: {
    bgColor: '#1a0707',
    glowColor: 'rgba(255,45,45,0.4)',
    colorOverlay: 'rgba(255,45,45,0.08)',
    border: 'border-intense-red',
    borderHex: '#ff2d2d',
    text: 'text-intense-red',
    icon: 'cancel',
    title: 'FALLASTE',
    copy: 'Pierdes puntos, pero la siguiente ronda puede cambiarlo todo.'
  },
  blocked: {
    bgColor: '#1a0f07',
    glowColor: 'rgba(255,122,26,0.4)',
    colorOverlay: 'rgba(255,122,26,0.08)',
    border: 'border-vinyl-orange',
    borderHex: '#ff7a1a',
    text: 'text-vinyl-orange',
    icon: 'block',
    title: 'BLOQUEADO',
    copy: 'No pudiste responder esta ronda por el sabotaje. La próxima es toda tuya.'
  }
};



function TimelineYears({ years = [], wildcards = 0, goalYears = 12 }) {
  const progress = Math.min(years.length + wildcards, goalYears);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-11">
      <span className="font-label-caps text-xs text-on-surface-variant">
        {progress}/{goalYears}
      </span>
      {years.slice(0, goalYears).map((year, index) => (
        <span
          key={`${year}-${index}`}
          className="w-9 h-9 rounded-full border-2 border-neon-green/60 bg-black/30 flex items-center justify-center text-[11px] font-black text-neon-green"
          title={year}
        >
          {String(year).slice(2)}
        </span>
      ))}
      {Array.from({ length: Math.max(0, Math.min(wildcards, goalYears - years.length)) }, (_, index) => (
        <span
          key={`wildcard-${index}`}
          className="w-9 h-9 rounded-full border-2 border-chaos-gold/60 bg-chaos-gold/15 flex items-center justify-center"
          title="Canjeada con puntos"
        >
          <span className="material-symbols-outlined text-chaos-gold text-base">star</span>
        </span>
      ))}
    </div>
  );
}

function RankingList({ players, final = false, showTimeline = false, goalYears = 12 }) {
  if (!players.length) return null;
  return (
    <div className="flex flex-col gap-2 w-full">
      {players.map((player, index) => {
        const medalClass = index === 0
          ? 'bg-neon-green text-black'
          : index === 1 ? 'bg-white/20 text-white'
            : index === 2 ? 'bg-electric-purple/30 text-white'
              : 'bg-black/20 text-on-surface-variant';
        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`p-4 rounded-2xl border ${final && index === 0 ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/10'}`}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${medalClass}`}>
                  {index + 1}
                </span>
                {player.avatar?.startsWith?.('http') ? (
                  <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-xl shrink-0">
                    {player.avatar || '•'}
                  </span>
                )}
                <span className="font-bold text-base truncate">{player.name}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base text-neon-green leading-none">{getTimelineProgress(player)}/{goalYears}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant leading-none">{player.points} pts</p>
              </div>
            </div>
            {showTimeline && <TimelineYears years={getCombinedTimelineYears(player)} wildcards={Number(player.wildcards || 0)} goalYears={goalYears} />}
          </motion.div>
        );
      })}
    </div>
  );
}



export default function ResultScreen() {
  const navigate = useNavigate();
  const [shareCopied, setShareCopied] = useState(false);
  const {
    role, phase, players,
    hostNextRound, hostCloseRoom, guestLeaveRoom, guestId,
    lastResultType, lastPointDelta, revealResults, currentTrack, roomError, clearRoomError, guestAvatar,
    targetYears
  } = useGameStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const guestReveal = revealResults?.[guestId] || null;
  const guestPoints = guestReveal?.points ?? players.find((p) => p.id === guestId)?.points ?? 10;
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
  const resultWord = isSuccess ? 'CORRECTO' : isFail ? 'FALLASTE' : style.title;
  // Acertaste, pero el sabotaje "Robo de año" se llevó el año igual —
  // avisar aparte porque el estilo base sigue siendo "success" (sí sumaste
  // puntos), solo que tu ruta no creció esta vez.
  const resultCopy = wasYearStolen
    ? `${guestReveal?.stolenBy || 'Un rival'} te robó el año con su sabotaje. Sumaste puntos, pero tu ruta no creció esta vez.`
    : style.copy;
  const deltaColor = pointDelta > 0 ? 'text-neon-green' : pointDelta < 0 ? 'text-intense-red' : 'text-white/30';
  const deltaLabel = pointDelta > 0 ? `+${pointDelta}` : pointDelta !== 0 ? String(pointDelta) : null;

  useEffect(() => {
    if (phase === 'lobby') navigate('/lobby');
    if (phase === 'countdown' || phase === 'listen' || phase === 'blackout') navigate('/game');
  }, [phase, navigate]);

  useEffect(() => {
    if (roomError) { clearRoomError(); navigate('/role-selection'); }
  }, [roomError, clearRoomError, navigate]);

  const handleFinish = () => {
    if (role === 'host') hostCloseRoom();
    if (role === 'guest') guestLeaveRoom();
    navigate('/role-selection');
  };

  const handleShare = async () => {
    const text = isFinal && winner
      ? `¡${winner.name} ganó en Dedícalo con ${winner.points} puntos! 🎵 ¿Te atreves ${window.location.origin}`
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


  // FINAL screen — Años Locos
  if (isFinal) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-surface text-white"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto flex min-h-full max-w-lg flex-col items-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={handleFinish}
            className="absolute top-4 left-4 z-[100] min-h-touch rounded-xl border border-white/12 bg-black/35 px-3 text-white/75 font-label-caps text-[11px] tracking-[0.16em] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {role === 'host' ? 'CERRAR' : 'SALIR'}
          </button>
          <div className="absolute top-4 right-4 z-[100]">
            <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
          </div>
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full text-center"
          >
            <p className="font-label-caps text-electric-purple tracking-widest text-xs">
              META {targetYears} CANCIONES
            </p>
            <h1 className="font-headline-lg text-3xl font-black mt-1 mb-4">RANKING FINAL</h1>

            {winner && (
              <div className="mb-4 overflow-hidden rounded-3xl border border-neon-green/50 bg-[linear-gradient(145deg,rgba(57,255,20,0.16),rgba(168,85,247,0.12))] p-5 shadow-[0_0_50px_rgba(57,255,20,0.16)]">
                <p className="font-label-caps text-neon-green text-xs tracking-[0.22em]">DUEÑO DE LA CABINA</p>
                <p className="mt-1 font-headline-lg-mobile text-3xl text-white">{winner.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{getTimelineProgress(winner)}/{targetYears} canciones · {winner.points} pts</p>
              </div>
            )}

            <RankingList players={players} final showTimeline goalYears={targetYears} />

            <div className="mt-5 flex flex-col gap-2">
              {role === 'host' && (
                <button
                  onClick={handleFinish}
                  className="w-full h-12 rounded-xl bg-primary text-white font-label-caps text-sm uppercase font-bold border border-white/20 active:scale-95 transition-all"
                >
                  CERRAR SALA
                </button>
              )}
              <button
                onClick={handleShare}
                className="w-full h-10 rounded-xl border border-white/15 bg-white/5 text-white font-label-caps text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">share</span>
                {shareCopied ? 'COPIADO' : 'COMPARTIR RESULTADO'}
              </button>
              {role !== 'host' && (
                <button
                  onClick={handleFinish}
                  className="w-full h-12 rounded-xl font-label-caps uppercase text-sm font-bold border border-white/20 bg-white/5 text-white active:scale-95 transition-all"
                >
                  SALIR
                </button>
              )}
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
      className="fixed inset-0 z-50 overflow-y-auto text-white"
      style={{ backgroundColor: style.bgColor }}
    >
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
      <div
        className="relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.5rem+env(safe-area-inset-top,0px))]"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-4 left-4 z-[100] min-h-touch rounded-xl border border-white/12 bg-black/35 px-3 text-white/75 font-label-caps text-[11px] tracking-[0.16em] flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {role === 'host' ? 'CERRAR' : 'SALIR'}
        </button>

        <div className="absolute top-4 right-4 z-[100]">
          <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
        </div>
        {/* Resultado personal */}
        <motion.div
          initial={{ y: -18, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 18 }}
          className={`relative overflow-hidden rounded-[2rem] border ${style.border} bg-black/35 backdrop-blur-sm px-5 py-7 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]`}
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
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 160, damping: 15 }}
            className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[repeating-radial-gradient(circle,#050505_0_4px,#171717_5px_7px,#050505_8px_12px)]"
            style={{ border: `3px solid ${style.borderHex}`, boxShadow: `0 0 45px ${style.glowColor}` }}
          >
            <motion.span
              animate={{ scale: [1, 1.22, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className={`material-symbols-outlined ${style.text}`}
              style={{ fontSize: '3.4rem' }}
            >
              {style.icon}
            </motion.span>
          </motion.div>

          <p className="relative mt-5 font-label-caps text-[11px] tracking-[0.28em] text-white/55">RESULTADO</p>
          <motion.h1
            initial={{ letterSpacing: '0.04em', scale: 0.92 }}
            animate={{ letterSpacing: '0.02em', scale: 1 }}
            transition={{ delay: 0.16, type: 'spring', stiffness: 160, damping: 14 }}
            className={`relative mx-auto mt-1 max-w-full px-1 font-headline-lg font-black leading-[0.88] ${style.text}`}
            style={{
              fontSize: 'clamp(2.05rem, 11.5vw, 5rem)',
              letterSpacing: '0.01em',
              textShadow: `0 0 34px ${style.glowColor}`,
              whiteSpace: 'normal'
            }}
          >
            {resultWord}
          </motion.h1>

          <div className="relative mt-5 flex items-end justify-center gap-4">
            <div>
              <p className="font-label-caps text-sm text-white/55">TUS PUNTOS</p>
              <motion.p
                initial={{ y: 12, scale: 0.75, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ delay: 0.22, type: 'spring', stiffness: 150 }}
                className={`font-stats-xl font-black leading-none ${style.text}`}
                style={{ fontSize: 'clamp(3.2rem, 17vw, 4.5rem)' }}
              >
                {guestPoints}
              </motion.p>
            </div>
            {deltaLabel && (
              <motion.div
                initial={{ y: 18, opacity: 0, rotate: 8 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 140 }}
                className={`mb-3 rounded-2xl border border-current/30 bg-black/30 px-4 py-2 text-3xl font-black ${deltaColor}`}
              >
                {deltaLabel}
              </motion.div>
            )}
          </div>

          <div className="relative mt-4 mx-auto max-w-sm">
            <p className="text-sm leading-relaxed text-white/70">{resultCopy}</p>
          </div>
        </motion.div>
        {/* Cancion revelada */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm"
        >
          <div
            className="rounded-xl overflow-hidden shrink-0"
            style={{ width: 72, height: 72, boxShadow: `0 6px 24px ${style.glowColor}` }}
          >
            {currentTrack?.albumImage ? (
              <img src={currentTrack.albumImage} alt={currentTrack?.name || 'Canción'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-black/40 flex items-center justify-center">
                <span className={`material-symbols-outlined ${style.text}`} style={{ fontSize: '2rem' }}>{style.icon}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-label-caps text-xs text-white/45 tracking-widest">LA CANCIÓN ERA</p>
            <p className="mt-1 font-black text-white text-base leading-tight line-clamp-2">
              {currentTrack?.name || style.copy}
            </p>
            {currentTrack?.artist && (
              <p className="text-sm text-white/60 mt-0.5 truncate">{currentTrack.artist}</p>
            )}
            {currentTrack?.releaseYear && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.38, type: 'spring', stiffness: 140 }}
                className="mt-1 flex items-baseline gap-1.5"
              >
                <span className="font-label-caps text-xs text-white/40">AÑO</span>
                <span className={`font-black text-4xl leading-none ${style.text}`}>
                  {currentTrack.releaseYear}
                </span>
              </motion.div>
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
            <p className="font-label-caps text-xs text-white/45 tracking-widest text-center mb-2">
              ASÍ VAN TODOS
            </p>
            <div className="flex flex-col gap-1.5">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                    player.id === guestId
                      ? `border ${style.border} bg-white/5`
                      : 'bg-white/5 border border-white/8'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center shrink-0 ${
                    index === 0 ? 'bg-neon-green text-black' : 'bg-white/10 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  {player.avatar?.startsWith?.('http') ? (
                    <img src={player.avatar} alt={player.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center text-lg shrink-0">
                      {player.avatar || '•'}
                    </span>
                  )}
                  <span className="text-base font-bold text-white truncate flex-1">{player.name}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-neon-green">
                      {getTimelineProgress(player)}/{targetYears} CANCIONES
                    </p>
                    <p className="text-xs font-bold text-white/55">{player.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {/* Acciones */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="mt-3 flex flex-col gap-2"
        >
          {role === 'host' ? (
            <button
              onClick={hostNextRound}
              className="w-full h-14 rounded-2xl bg-neon-green text-black font-label-caps text-sm font-bold active:scale-95 transition-transform shadow-[0_8px_0_rgba(16,85,0,0.95),0_0_28px_rgba(57,255,20,0.3)]"
            >
              SIGUIENTE RONDA
            </button>
          ) : (
            <div className="py-3 rounded-xl border border-white/10 bg-white/5 text-center">
              <p className="text-sm text-white/55 font-label-caps tracking-widest animate-pulse">
                ESPERANDO AL ANFITRIÓN...
              </p>
            </div>
          )}
          <button
            onClick={handleShare}
            className="w-full h-12 rounded-xl border border-white/12 bg-white/5 text-white font-label-caps text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">share</span>
            {shareCopied ? 'COPIADO' : 'COMPARTIR'}
          </button>
        </motion.div>

        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
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
              <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '2.4rem' }}>
                {role === 'host' ? 'emoji_events' : 'logout'}
              </span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">
                {role === 'host' ? '¿Cerrar la partida' : '¿Salir de la partida'}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {role === 'host'
                  ? 'Se cerrará la sala y todos volverán al inicio.'
                  : 'Saldrás de la sala y perderás tu lugar en la partida.'}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="h-12 rounded-xl bg-intense-red text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  {role === 'host' ? 'SÍ, CERRAR' : 'SÍ, SALIR'}
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

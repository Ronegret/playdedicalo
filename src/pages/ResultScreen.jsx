import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMELINE_GOAL_YEARS, getCombinedTimelineYears, useGameStore } from '../store/useGameStore';
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
  sabotage: {
    bgColor: '#0d0717',
    glowColor: 'rgba(168,85,247,0.4)',
    colorOverlay: 'rgba(168,85,247,0.08)',
    border: 'border-electric-purple',
    borderHex: '#a855f7',
    text: 'text-electric-purple',
    icon: 'auto_awesome',
    title: 'SABOTAJE',
    copy: 'Alguien jugó una carta.'
  }
};

function TimelineYears({ years = [] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 pl-9">
      <span className="font-label-caps text-[9px] text-on-surface-variant">
        {Math.min(years.length, TIMELINE_GOAL_YEARS)}/{TIMELINE_GOAL_YEARS}
      </span>
      {years.slice(0, TIMELINE_GOAL_YEARS).map((year) => (
        <span key={year} className="rounded border border-neon-green/30 bg-neon-green/10 px-1.5 py-0.5 text-[9px] font-black text-neon-green">
          {year}
        </span>
      ))}
    </div>
  );
}

function RankingList({ players, final = false, showTimeline = false }) {
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
            className={`p-3 rounded-xl border ${final && index === 0 ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/10'}`}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${medalClass}`}>
                  {index + 1}
                </span>
                {player.avatar?.startsWith?.('http') ? (
                  <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-lg shrink-0">
                    {player.avatar || '•'}
                  </span>
                )}
                <span className="font-bold text-sm truncate">{player.name}</span>
              </div>
              <span className="font-black text-sm text-neon-green shrink-0">{player.points} pts</span>
            </div>
            {showTimeline && <TimelineYears years={getCombinedTimelineYears(player)} />}
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
    role, phase, players, gameMode, targetScore,
    hostNextRound, hostCloseRoom, guestLeaveRoom, guestId,
    lastResultType, lastPointDelta, lastSabotage,
    revealResults, currentTrack, roomError, clearRoomError, guestAvatar
  } = useGameStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const guestReveal = revealResults?.[guestId] || null;
  const guestPoints = guestReveal?.points ?? players.find((p) => p.id === guestId)?.points ?? 10;
  const isFinal = phase === 'final';
  const winner = Array.isArray(players) && players.length
    ? [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0))[0]
    : null;
  const resultType = guestReveal?.resultType || lastResultType || 'success';
  const pointDelta = guestReveal?.delta ?? lastPointDelta;
  const sabotage = guestReveal?.sabotage || lastSabotage;
  const style = RESULT_STYLES[resultType];
  const isSuccess = resultType === 'success';
  const isFail = resultType === 'fail';
  const resultWord = sabotage ? 'SABOTAJE' : isSuccess ? 'CORRECTO' : isFail ? 'FALLASTE' : style.title;
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
      ? `¡${winner.name} ganó en Dedícalo con ${winner.points} puntos! 🎵 ¿Te atreves? ${window.location.origin}`
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

  // ── FINAL screen ──
  if (isFinal) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-surface text-white"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="min-h-full max-w-lg mx-auto flex flex-col items-center px-5 py-8">
          <button
            type="button"
            onClick={handleFinish}
            className="absolute top-4 left-4 z-[100] h-10 rounded-xl border border-white/12 bg-black/35 px-3 text-white/75 font-label-caps text-[11px] tracking-[0.16em] flex items-center gap-1.5 active:scale-95 transition-all"
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
              {gameMode === 'timeline' ? `META ${TIMELINE_GOAL_YEARS} AÑOS` : `META ${targetScore} PUNTOS`}
            </p>
            <h1 className="font-headline-lg text-3xl font-black mt-1 mb-4">RANKING FINAL</h1>

            {winner && (
              <div className="mb-4 rounded-2xl border border-neon-green/50 bg-neon-green/10 p-4">
                <p className="font-label-caps text-neon-green text-xs">GANADOR</p>
                <p className="mt-0.5 font-headline-lg-mobile text-2xl text-white">{winner.name}</p>
                <p className="mt-0.5 text-sm text-on-surface-variant">{winner.points} puntos finales</p>
              </div>
            )}

            {lastSabotage && (
              <div className="mb-4 rounded-2xl border border-electric-purple/50 bg-electric-purple/10 p-3 text-left">
                <p className="font-label-caps text-electric-purple text-[10px]">ÚLTIMO SABOTAJE</p>
                <p className="mt-0.5 font-bold text-sm">{lastSabotage.name}</p>
                <p className="text-xs text-on-surface-variant leading-snug">
                  {lastSabotage.by ? `${lastSabotage.by} lo activó. ` : ''}{lastSabotage.effect}
                </p>
              </div>
            )}

            <RankingList players={players} final showTimeline={gameMode === 'timeline'} />

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

  // ── NON-FINAL screen — diseño compacto ──
  const sortedPlayers = [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col text-white overflow-hidden"
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
        className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-4 pt-12 pb-5 overflow-y-auto flex-1"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-4 left-4 z-[100] h-10 rounded-xl border border-white/12 bg-black/35 px-3 text-white/75 font-label-caps text-[11px] tracking-[0.16em] flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {role === 'host' ? 'CERRAR' : 'SALIR'}
        </button>

        <div className="absolute top-4 right-4 z-[100]">
          <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
        </div>

        {/* ① Resultado personal — pantalla protagonista */}
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
              fontSize: 'clamp(2.55rem, 13vw, 5.2rem)',
              textShadow: `0 0 34px ${style.glowColor}`,
              overflowWrap: 'anywhere'
            }}
          >
            {resultWord}
          </motion.h1>

          <div className="relative mt-5 flex items-end justify-center gap-4">
            <div>
              <p className="font-label-caps text-[10px] text-white/45">TUS PUNTOS</p>
              <motion.p
                initial={{ y: 12, scale: 0.75, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ delay: 0.22, type: 'spring', stiffness: 150 }}
                className={`font-stats-xl font-black leading-none ${style.text}`}
                style={{ fontSize: '4.5rem' }}
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
            {sabotage && (
              <div className="rounded-2xl border border-electric-purple/45 bg-electric-purple/15 px-4 py-3">
                <p className="font-label-caps text-[10px] text-electric-purple">SABOTAJE RECIBIDO</p>
                <p className="mt-1 text-sm font-black text-white">{sabotage.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  {sabotage.by ? `${sabotage.by} lo activó. ` : ''}{sabotage.effect}
                </p>
              </div>
            )}
            {!sabotage && (
              <p className="text-sm leading-relaxed text-white/70">{style.copy}</p>
            )}
          </div>
        </motion.div>

        {/* ② Canción revelada — horizontal compacto */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-2.5 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-3 flex items-center gap-3"
        >
          <div
            className="rounded-xl overflow-hidden shrink-0"
            style={{ width: 72, height: 72, boxShadow: `0 6px 24px ${style.glowColor}` }}
          >
            {currentTrack?.albumImage ? (
              <img src={currentTrack.albumImage} alt={currentTrack.name || 'Canción'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-black/40 flex items-center justify-center">
                <span className={`material-symbols-outlined ${style.text}`} style={{ fontSize: '2rem' }}>{style.icon}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-label-caps text-[9px] text-white/35 tracking-widest">LA CANCIÓN ERA</p>
            <p className="mt-0.5 font-black text-white text-sm leading-tight line-clamp-2">
              {currentTrack?.name || style.copy}
            </p>
            {currentTrack?.artist && (
              <p className="text-xs text-white/50 mt-0.5 truncate">{currentTrack.artist}</p>
            )}
            {currentTrack?.releaseYear && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.38, type: 'spring', stiffness: 140 }}
                className="mt-1 flex items-baseline gap-1.5"
              >
                <span className="font-label-caps text-[9px] text-white/30">AÑO</span>
                <span className={`font-black text-2xl leading-none ${style.text}`}>
                  {currentTrack.releaseYear}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ③ Cómo van todos */}
        {sortedPlayers.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-2.5"
          >
            <p className="font-label-caps text-[9px] text-white/30 tracking-widest text-center mb-2">
              ASÍ VAN TODOS
            </p>
            <div className="flex flex-col gap-1.5">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                    player.id === guestId
                      ? `border ${style.border} bg-white/5`
                      : 'bg-white/5 border border-white/8'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                    index === 0 ? 'bg-neon-green text-black' : 'bg-white/10 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  {player.avatar?.startsWith?.('http') ? (
                    <img src={player.avatar} alt={player.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-sm shrink-0">
                      {player.avatar || '•'}
                    </span>
                  )}
                  <span className="text-sm font-bold text-white truncate flex-1">{player.name}</span>
                  <span className="text-sm font-black text-neon-green shrink-0">{player.points} pts</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ④ Acciones */}
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
              <p className="text-xs text-white/45 font-label-caps tracking-widest animate-pulse">
                ESPERANDO AL ANFITRIÓN...
              </p>
            </div>
          )}
          <button
            onClick={handleShare}
            className="w-full h-10 rounded-xl border border-white/12 bg-white/5 text-white font-label-caps text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
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
                {role === 'host' ? '¿Cerrar la partida?' : '¿Salir de la partida?'}
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

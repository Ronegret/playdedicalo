import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMELINE_GOAL_YEARS, getCombinedTimelineYears, useGameStore } from '../store/useGameStore';

const RESULT_STYLES = {
  success: {
    bgColor: '#071a07',
    glowColor: 'rgba(57,255,20,0.45)',
    colorOverlay: 'rgba(57,255,20,0.07)',
    border: 'border-neon-green',
    borderHex: '#39ff14',
    text: 'text-neon-green',
    icon: 'check_circle',
    title: '¡ACERTASTE!',
    copy: 'Sumaste puntos y mantienes el pulso.'
  },
  fail: {
    bgColor: '#1a0707',
    glowColor: 'rgba(255,45,45,0.45)',
    colorOverlay: 'rgba(255,45,45,0.09)',
    border: 'border-intense-red',
    borderHex: '#ff2d2d',
    text: 'text-intense-red',
    icon: 'cancel',
    title: 'FALLASTE LA\nCANCIÓN',
    copy: 'Pierdes puntos, pero la siguiente ronda puede cambiarlo todo.'
  },
  sabotage: {
    bgColor: '#0d0717',
    glowColor: 'rgba(168,85,247,0.45)',
    colorOverlay: 'rgba(168,85,247,0.09)',
    border: 'border-electric-purple',
    borderHex: '#a855f7',
    text: 'text-electric-purple',
    icon: 'auto_awesome',
    title: 'SABOTAJE\nACTIVADO',
    copy: 'Alguien jugó una carta. La partida entra en modo caos.'
  }
};

function TimelineYears({ years = [] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-12">
      <span className="font-label-caps text-[10px] text-on-surface-variant">
        Línea {Math.min(years.length, TIMELINE_GOAL_YEARS)}/{TIMELINE_GOAL_YEARS}
      </span>
      {years.slice(0, TIMELINE_GOAL_YEARS).map((year) => (
        <span key={year} className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1 text-[10px] font-black text-neon-green">
          {year}
        </span>
      ))}
    </div>
  );
}

function RankingList({ players, final = false, showTimeline = false }) {
  if (!players.length) {
    return <p className="text-center text-on-surface-variant">Nadie jugó esta partida.</p>;
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {players.map((player, index) => {
        const medalClass = index === 0
          ? 'bg-neon-green text-black'
          : index === 1
            ? 'bg-white/20 text-white'
            : index === 2
              ? 'bg-electric-purple/30 text-white'
              : 'bg-black/20 text-on-surface-variant';

        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl border ${final && index === 0 ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/10'}`}
          >
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${medalClass}`}>
                  {index + 1}
                </span>
                {player.avatar?.startsWith?.('http') ? (
                  <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-xl shrink-0">
                    {player.avatar || '•'}
                  </span>
                )}
                <span className="font-bold font-body-md truncate">{player.name}</span>
              </div>
              <span className="font-stats-xl text-neon-green shrink-0">{player.points} PTS</span>
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
    role, phase, players, round, gameMode, targetScore,
    hostNextRound, hostCloseRoom, guestId,
    lastResultType, lastPointDelta, lastSabotage,
    revealResults, currentTrack, roomError, clearRoomError
  } = useGameStore();

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

  useEffect(() => {
    if (phase === 'lobby') navigate('/lobby');
    if (phase === 'countdown' || phase === 'listen' || phase === 'blackout') navigate('/game');
  }, [phase, navigate]);

  useEffect(() => {
    if (roomError) { clearRoomError(); navigate('/role-selection'); }
  }, [roomError, clearRoomError, navigate]);

  const handleFinish = () => {
    if (role === 'host') hostCloseRoom();
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
    } catch {}
  };

  // ── FINAL screen ──
  if (isFinal) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-surface text-white px-margin-mobile py-10"
      >
        <div className="min-h-full max-w-lg mx-auto flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full text-center"
          >
            <p className="font-label-caps text-electric-purple tracking-widest text-xs">
              {gameMode === 'timeline' ? `META ${TIMELINE_GOAL_YEARS} AÑOS` : `META ${targetScore} PUNTOS`}
            </p>
            <h1 className="font-headline-lg text-4xl font-black mt-2 mb-6">RANKING FINAL</h1>

            {winner && (
              <div className="mb-5 rounded-2xl border border-neon-green/50 bg-neon-green/10 p-5">
                <p className="font-label-caps text-neon-green text-xs">GANADOR</p>
                <p className="mt-1 font-headline-lg-mobile text-3xl text-white">{winner.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">Llegó a {winner.points} puntos.</p>
              </div>
            )}

            {lastSabotage && (
              <div className="mb-5 rounded-2xl border border-electric-purple/50 bg-electric-purple/10 p-4 text-left">
                <p className="font-label-caps text-electric-purple text-[10px]">ÚLTIMO SABOTAJE</p>
                <p className="mt-1 font-bold">{lastSabotage.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {lastSabotage.by ? `${lastSabotage.by} lo activó. ` : ''}{lastSabotage.effect}
                </p>
              </div>
            )}

            <RankingList players={players} final showTimeline={gameMode === 'timeline'} />

            {role === 'host' && (
              <button
                onClick={handleFinish}
                className="mt-8 w-full h-14 rounded-xl bg-primary text-white font-label-caps uppercase tracking-widest font-bold border border-white/20 active:scale-95 transition-all"
              >
                CERRAR SALA
              </button>
            )}
            <button
              onClick={handleShare}
              className="mt-3 w-full h-11 rounded-xl border border-white/15 bg-white/5 text-white font-label-caps text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              {shareCopied ? 'COPIADO' : 'COMPARTIR RESULTADO'}
            </button>
            {role !== 'host' && (
              <button
                onClick={() => navigate('/role-selection')}
                className="mt-3 w-full h-14 rounded-xl font-label-caps uppercase tracking-widest font-bold border border-white/20 bg-white/5 text-white active:scale-95 transition-all"
              >
                SALIR
              </button>
            )}
          </motion.div>
        </div>
      </motion.main>
    );
  }

  // ── NON-FINAL — diseño centrado, título grande ──
  const deltaColor = pointDelta > 0 ? 'text-neon-green' : pointDelta < 0 ? 'text-intense-red' : 'text-white/30';
  const deltaLabel = pointDelta > 0 ? `+${pointDelta}` : pointDelta !== 0 ? String(pointDelta) : '—';

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
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `url(${currentTrack.albumImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(50px) saturate(1.4)',
            transform: 'scale(1.15)',
          }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${style.colorOverlay} 0%, rgba(0,0,0,0.6) 100%)` }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-5 pt-8 pb-8 overflow-y-auto flex-1 text-center">

        {/* BIG title + icon */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          className="flex flex-col items-center gap-1 mb-5"
        >
          <motion.span
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
            className={`material-symbols-outlined ${style.text}`}
            style={{ fontSize: '3.8rem' }}
          >
            {style.icon}
          </motion.span>
          <h1
            className={`font-headline-lg font-black leading-tight whitespace-pre-line ${style.text}`}
            style={{ fontSize: 'clamp(2rem, 9vw, 2.5rem)' }}
          >
            {style.title}
          </h1>
          {sabotage && (
            <p className="mt-1 text-xs text-white/50 max-w-[260px] leading-snug">{sabotage.effect}</p>
          )}
        </motion.div>

        {/* Album art — Spotify card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 16 }}
          className="rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            width: 'min(190px, 50vw)',
            aspectRatio: '1',
            boxShadow: `0 16px 60px ${style.glowColor}`,
          }}
        >
          {currentTrack?.albumImage ? (
            <img src={currentTrack.albumImage} alt={currentTrack.name || 'Canción'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/40">
              <span className={`material-symbols-outlined ${style.text}`} style={{ fontSize: '5rem' }}>{style.icon}</span>
            </div>
          )}
        </motion.div>

        {/* Song info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          {currentTrack ? (
            <>
              <p className="font-label-caps text-[10px] text-white/35 tracking-widest">LA CANCIÓN ERA</p>
              <p className="mt-1 text-lg font-black text-white leading-tight">{currentTrack.name}</p>
              <p className="text-sm text-white/55 mt-0.5">{currentTrack.artist}</p>
              {currentTrack.releaseYear && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.45, type: 'spring', stiffness: 130 }}
                  className="mt-3"
                >
                  <p className="font-label-caps text-[9px] text-white/35 tracking-widest">AÑO</p>
                  <p className={`text-7xl font-black leading-none mt-0.5 ${style.text}`}>
                    {currentTrack.releaseYear}
                  </p>
                </motion.div>
              )}
            </>
          ) : (
            <p className="text-white/50 text-sm max-w-[260px]">{style.copy}</p>
          )}
        </motion.div>

        {/* Divider */}
        <div className="mt-5 w-12 h-px bg-white/15" />

        {/* Points — centrado */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="mt-5"
        >
          <p className="font-label-caps text-[10px] text-white/35 tracking-widest">TUS PUNTOS</p>
          <motion.p
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 130 }}
            className={`text-7xl font-black leading-none mt-1 ${style.text}`}
          >
            {guestPoints}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className={`mt-2 text-xl font-black ${deltaColor}`}
          >
            {deltaLabel !== '—' ? `${deltaLabel} esta ronda` : 'Sin cambio'}
          </motion.p>
        </motion.div>

        {/* All players scoreboard */}
        {players.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-6 w-full"
          >
            <p className="font-label-caps text-[10px] text-white/35 tracking-widest text-center mb-3">ASÍ VAN TODOS</p>
            <div className="flex flex-col gap-2">
              {[...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${player.id === guestId ? `border ${style.border} bg-white/5` : 'bg-white/5 border border-white/10'}`}
                >
                  <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${index === 0 ? 'bg-neon-green text-black' : 'bg-white/10 text-white'}`}>
                    {index + 1}
                  </span>
                  {player.avatar?.startsWith?.('http') ? (
                    <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-base shrink-0">{player.avatar || '•'}</span>
                  )}
                  <span className="text-sm font-bold text-white truncate flex-1">{player.name}</span>
                  <span className="text-sm font-black text-neon-green shrink-0">{player.points} pts</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 w-full flex flex-col gap-2"
        >
          {role === 'host' && (
            <button
              onClick={hostNextRound}
              className="w-full h-14 rounded-xl bg-neon-green text-black font-label-caps text-sm font-bold active:scale-95 transition-transform"
            >
              SIGUIENTE RONDA
            </button>
          )}
          {role !== 'host' && (
            <div className="py-4 text-center">
              <p className="text-sm text-white/50 font-label-caps tracking-widest animate-pulse">ESPERANDO AL ANFITRIÓN...</p>
              <p className="mt-1 text-xs text-white/25">El anfitrión decide cuándo empieza la siguiente ronda.</p>
            </div>
          )}
          <button
            onClick={handleShare}
            className="w-full h-11 rounded-xl border border-white/12 bg-white/5 text-white font-label-caps text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            {shareCopied ? 'COPIADO' : 'COMPARTIR'}
          </button>
        </motion.div>

      </div>
    </motion.main>
  );
}

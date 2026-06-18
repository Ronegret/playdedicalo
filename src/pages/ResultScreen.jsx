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
    role, phase, players, round, gameMode, targetScore,
    hostNextRound, hostCloseRoom, guestId,
    lastResultType, lastPointDelta, lastSabotage,
    revealResults, currentTrack, roomError, clearRoomError, guestAvatar
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
        className="fixed inset-0 z-50 overflow-y-auto bg-surface text-white"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="min-h-full max-w-lg mx-auto flex flex-col items-center px-5 py-8">
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
                  onClick={() => navigate('/role-selection')}
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
        style={{ background: `linear-gradient(180deg, ${style.colorOverlay} 0%, rgba(0,0,0,0.65) 100%)` }}
      />

      {/* Scrollable content */}
      <div
        className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-4 pt-14 pb-5 overflow-y-auto flex-1"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="absolute top-4 right-4 z-[100]">
          <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
        </div>

        {/* ① Resultado personal — banner compacto */}
        <motion.div
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 18 }}
          className={`rounded-2xl border ${style.border} bg-black/30 backdrop-blur-sm p-3 flex items-center gap-3`}
        >
          <motion.span
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ delay: 0.2, duration: 0.4, ease: 'backOut' }}
            className={`material-symbols-outlined ${style.text} shrink-0`}
            style={{ fontSize: '2.2rem' }}
          >
            {style.icon}
          </motion.span>
          <div className="flex-1 min-w-0">
            <h1 className={`font-headline-lg font-black leading-none ${style.text}`} style={{ fontSize: '1.25rem' }}>
              {style.title}
            </h1>
            {sabotage && (
              <p className="text-[10px] text-white/50 mt-0.5 leading-snug">{sabotage.effect}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-label-caps text-[9px] text-white/35">MIS PTS</p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 140 }}
              className={`font-black leading-none ${style.text}`}
              style={{ fontSize: '2.2rem' }}
            >
              {guestPoints}
            </motion.p>
            {deltaLabel && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`text-xs font-black ${deltaColor}`}
              >
                {deltaLabel}
              </motion.p>
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
              className="w-full h-12 rounded-xl bg-neon-green text-black font-label-caps text-sm font-bold active:scale-95 transition-transform"
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

      </div>
    </motion.main>
  );
}

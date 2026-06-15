import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMELINE_GOAL_YEARS, getCombinedTimelineYears, useGameStore } from '../store/useGameStore';

const RESULT_STYLES = {
  success: {
    bg: 'bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.34),rgba(12,24,18,0.98)_58%,#07100b_100%)]',
    border: 'border-neon-green',
    text: 'text-neon-green',
    icon: 'check_circle',
    title: 'BUENA RESPUESTA',
    copy: 'Sumaste puntos y mantienes el pulso.'
  },
  fail: {
    bg: 'bg-[radial-gradient(circle_at_center,rgba(255,45,45,0.36),rgba(32,8,14,0.98)_58%,#120508_100%)]',
    border: 'border-intense-red',
    text: 'text-intense-red',
    icon: 'cancel',
    title: 'FALLASTE EL CORTE',
    copy: 'Pierdes puntos, pero la siguiente ronda puede cambiarlo todo.'
  },
  sabotage: {
    bg: 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.42),rgba(31,14,55,0.98)_58%,#12051f_100%)]',
    border: 'border-electric-purple',
    text: 'text-electric-purple',
    icon: 'auto_awesome',
    title: 'SABOTAJE ACTIVADO',
    copy: 'La partida entra en modo lila: caos, estrategia y puntos en juego.'
  }
};

function TimelineYears({ years = [] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-12">
      <span className="font-label-caps text-[10px] text-on-surface-variant">Línea {Math.min(years.length, TIMELINE_GOAL_YEARS)}/{TIMELINE_GOAL_YEARS}</span>
      {years.slice(0, TIMELINE_GOAL_YEARS).map((year) => (
        <span key={year} className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1 text-[10px] font-black text-neon-green">
          {year}
        </span>
      ))}
    </div>
  );
}

function RankingList({ players, final = false, showTimeline = false }) {
  if (players.length === 0) {
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
  const {
    role,
    phase,
    players,
    round,
    gameMode,
    targetScore,
    hostNextRound,
    hostCloseRoom,
    guestId,
    lastResultType,
    lastPointDelta,
    lastSabotage,
    revealResults
  } = useGameStore();
  const guestReveal = revealResults?.[guestId] || null;
  const guestPoints = guestReveal?.points ?? players.find((player) => player.id === guestId)?.points ?? 10;
  const isFinal = phase === 'final';
  const winner = [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0))[0];
  const resultType = guestReveal?.resultType || lastResultType || 'success';
  const pointDelta = guestReveal?.delta ?? lastPointDelta;
  const sabotage = guestReveal?.sabotage || lastSabotage;
  const style = RESULT_STYLES[resultType];

  useEffect(() => {
    if (phase === 'lobby') {
      navigate('/lobby');
    }
  }, [phase, navigate]);

  const handleFinish = () => {
    if (role === 'host') hostCloseRoom();
    navigate('/role-selection');
  };

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
              {gameMode === 'timeline'
                ? `META ${TIMELINE_GOAL_YEARS} AÑOS`
                : isFinal
                  ? `META ${targetScore} PUNTOS`
                  : `RONDA ${round} · META ${targetScore}`}
            </p>
            <h1 className="font-headline-lg text-4xl font-black mt-2 mb-6">
              {isFinal ? 'RANKING FINAL' : 'PUNTUACIONES'}
            </h1>

            {isFinal && winner && (
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
                <p className="text-xs text-on-surface-variant">{lastSabotage.by ? `${lastSabotage.by} lo activó. ` : ''}{lastSabotage.effect}</p>
              </div>
            )}

            <RankingList players={players} final={isFinal} showTimeline={gameMode === 'timeline'} />

            {role === 'host' && (
              <button
                onClick={isFinal ? handleFinish : hostNextRound}
                className="mt-8 px-8 py-4 bg-primary text-white rounded-xl font-label-caps uppercase tracking-widest font-bold border border-white/20 active:scale-95 transition-all w-full"
              >
                {isFinal ? 'CERRAR SALA' : 'SIGUIENTE RONDA'}
              </button>
            )}

            {role !== 'host' && isFinal && (
              <button
                onClick={() => navigate('/role-selection')}
                className="mt-8 px-8 py-4 bg-white/10 text-white rounded-xl font-label-caps uppercase tracking-widest font-bold border border-white/20 active:scale-95 transition-all w-full"
              >
                SALIR
              </button>
            )}
          </motion.div>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white px-margin-mobile text-center border-4 ${style.bg} ${style.border}`}
    >
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-sm w-full"
      >
        {/* Burst rings + icon */}
        <div className="relative flex items-center justify-center h-40 mb-2">
          {[0, 0.6, 1.2].map((delay) => (
            <div
              key={delay}
              className={`absolute w-28 h-28 rounded-full border-2 ${style.border} ring-expand-anim`}
              style={{ animationDelay: `${delay}s`, animationDuration: '2.2s' }}
            />
          ))}
          <motion.span
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className={`material-symbols-outlined relative z-10 ${style.text}`}
            style={{ fontSize: '5.5rem' }}
          >
            {style.icon}
          </motion.span>
        </div>

        <h1 className={`font-headline-lg text-5xl font-black ${style.text}`}>
          {style.title}
        </h1>
        <p className="mt-3 text-on-surface leading-relaxed">{sabotage?.effect || style.copy}</p>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 140 }}
          className={`mt-8 rounded-2xl border p-5 ${style.border} bg-black/30 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.4)]`}
        >
          <p className="font-label-caps text-on-surface-variant tracking-widest text-xs">TU CAPITAL ACTUAL</p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
            className={`text-7xl font-stats-xl mt-2 ${style.text}`}
          >
            {guestPoints}
          </motion.p>
          <p className={`mt-2 text-sm font-bold ${pointDelta > 0 ? 'text-neon-green' : pointDelta < 0 ? 'text-intense-red' : 'text-on-surface-variant'}`}>
            {pointDelta > 0 ? `+${pointDelta} puntos` : pointDelta < 0 ? `${pointDelta} puntos` : 'Sin cambio de puntos'}
          </p>
        </motion.div>

        <p className="mt-8 text-sm text-on-surface-variant/80 animate-pulse">ESPERANDO AL ANFITRIÓN...</p>

        {role === 'host' && (
          <button
            onClick={hostNextRound}
            className="mt-6 px-8 py-4 bg-neon-green text-black rounded-xl font-label-caps uppercase tracking-widest font-bold border border-white/20 active:scale-95 transition-all w-full"
          >
            SIGUIENTE RONDA
          </button>
        )}
      </motion.div>
    </motion.main>
  );
}



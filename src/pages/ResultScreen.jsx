import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';

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

function RankingList({ players, final = false }) {
  if (players.length === 0) {
    return <p className="text-center text-on-surface-variant">Ningun invitado jugo esta partida.</p>;
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
            className={`flex justify-between items-center p-4 rounded-xl border gap-4 ${final && index === 0 ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/10'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${medalClass}`}>
                {index + 1}
              </span>
              {player.avatar?.startsWith?.('http') ? (
                <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-xl shrink-0">
                  {player.avatar || '😎'}
                </span>
              )}
              <span className="font-bold font-body-md truncate">{player.name}</span>
            </div>
            <span className="font-stats-xl text-neon-green shrink-0">{player.points} PTS</span>
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
    targetScore,
    hostNextRound,
    hostCloseRoom,
    guestId,
    lastResultType,
    lastPointDelta,
    lastSabotage
  } = useGameStore();
  const guestPoints = players.find((player) => player.id === guestId)?.points ?? 10;
  const isFinal = phase === 'final';
  const winner = [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0))[0];
  const style = RESULT_STYLES[lastResultType || 'success'];

  useEffect(() => {
    if (phase === 'lobby') {
      navigate('/lobby');
    }
  }, [phase, navigate]);

  const handleFinish = () => {
    if (role === 'host') hostCloseRoom();
    navigate('/role-selection');
  };

  if (role === 'host' || isFinal) {
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
              {isFinal ? `META ${targetScore} PUNTOS` : `RONDA ${round} · META ${targetScore}`}
            </p>
            <h1 className="font-headline-lg text-4xl font-black mt-2 mb-6">
              {isFinal ? 'RANKING FINAL' : 'PUNTUACIONES'}
            </h1>

            {isFinal && winner && (
              <div className="mb-5 rounded-2xl border border-neon-green/50 bg-neon-green/10 p-5">
                <p className="font-label-caps text-neon-green text-xs">GANADOR</p>
                <p className="mt-1 font-headline-lg-mobile text-3xl text-white">{winner.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">Llego a {winner.points} puntos.</p>
              </div>
            )}

            {lastSabotage && (
              <div className="mb-5 rounded-2xl border border-electric-purple/50 bg-electric-purple/10 p-4 text-left">
                <p className="font-label-caps text-electric-purple text-[10px]">ULTIMO SABOTAJE</p>
                <p className="mt-1 font-bold">{lastSabotage.name}</p>
                <p className="text-xs text-on-surface-variant">{lastSabotage.by ? `${lastSabotage.by} lo activo. ` : ''}{lastSabotage.effect}</p>
              </div>
            )}

            <RankingList players={players} final={isFinal} />

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
        <motion.span
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`material-symbols-outlined text-7xl ${style.text}`}
        >
          {style.icon}
        </motion.span>

        <h1 className={`mt-4 font-headline-lg text-4xl font-black ${style.text}`}>
          {style.title}
        </h1>
        <p className="mt-3 text-on-surface leading-relaxed">{lastSabotage?.effect || style.copy}</p>

        <div className="mt-8 rounded-2xl border border-white/15 bg-black/20 p-5">
          <p className="font-label-caps text-on-surface-variant tracking-widest text-xs">TU CAPITAL ACTUAL</p>
          <p className={`text-7xl font-stats-xl mt-2 ${style.text}`}>{guestPoints}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {lastPointDelta > 0 ? `+${lastPointDelta} puntos` : lastPointDelta < 0 ? `${lastPointDelta} puntos` : 'Sin cambio de puntos'}
          </p>
        </div>

        <p className="mt-8 text-sm text-on-surface-variant/80 animate-pulse">ESPERANDO AL ANFITRION...</p>
      </motion.div>
    </motion.main>
  );
}

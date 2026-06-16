import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEDICALO_PLAYLISTS, GAME_MODES, SABOTAGE_OPTIONS, getCombinedTimelineYears, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import { createQuestionFromTrack, explainSpotifyError, getCurrentHiddenTrack, pauseSpotifyPlayback, startRandomPlaylistTrack } from '../services/spotify';

const EQUALIZER_BARS = [0.35, 0.58, 0.42, 0.71, 0.49, 0.64, 0.39];

function RankingPeek({ players, guestId }) {
  const [rankOpen, setRankOpen] = useState(false);
  if (!players.length) return null;
  const sorted = [...players].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
  const myRank = sorted.findIndex((p) => p.id === guestId) + 1;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/25 text-left overflow-hidden">
      <button
        type="button"
        onClick={() => setRankOpen((prev) => !prev)}
        className="w-full p-3 flex items-center justify-between gap-3"
      >
        <div>
          <p className="font-label-caps text-neon-green text-[10px] tracking-widest">RANKING</p>
          <p className="text-sm font-bold text-white">
            {myRank ? `Posición ${myRank} de ${sorted.length}` : 'Ver puntuaciones'}
          </p>
        </div>
        <motion.span
          animate={{ rotate: rankOpen ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="material-symbols-outlined text-neon-green text-2xl"
        >
          expand_more
        </motion.span>
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
            <div className="px-3 pb-3 flex flex-col gap-2">
              {sorted.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 ${player.id === guestId ? 'bg-neon-green/10 border border-neon-green/25' : 'bg-white/5'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${index === 0 ? 'bg-neon-green text-black' : 'bg-white/10 text-white'}`}>
                      {index + 1}
                    </span>
                    {player.avatar?.startsWith?.('http') ? (
                      <img src={player.avatar} alt={player.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-sm shrink-0">{player.avatar || '•'}</span>
                    )}
                    <span className="text-sm font-bold text-white truncate">{player.name}</span>
                  </div>
                  <span className="text-sm font-black text-neon-green shrink-0">{player.points} pts</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SABOTAGE_STYLES = {
  red: 'border-intense-red/60 bg-intense-red/10 text-intense-red',
  purple: 'border-electric-purple/60 bg-electric-purple/15 text-electric-purple',
  green: 'border-neon-green/50 bg-neon-green/10 text-neon-green'
};

function SabotageSquares({ options, points, enabled, onUse }) {
  const [sabOpen, setSabOpen] = useState(false);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/25 text-left overflow-hidden">
      <button
        type="button"
        onClick={() => setSabOpen((prev) => !prev)}
        className="w-full p-3 flex items-center justify-between gap-3"
      >
        <div>
          <p className="font-label-caps text-electric-purple text-[10px] tracking-widest">ATAQUES</p>
          <p className="text-sm font-bold text-white">Sabotajes mientras suena</p>
        </div>
        <motion.span
          animate={{ rotate: sabOpen ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="material-symbols-outlined text-electric-purple text-2xl"
        >
          expand_more
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {sabOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {options.map((option) => {
                  const canPay = Number(points || 0) >= option.cost;
                  const canUse = enabled && canPay;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={!canUse}
                      onClick={() => onUse(option)}
                      className={`aspect-square rounded-2xl border p-2 flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed ${SABOTAGE_STYLES[option.color] || SABOTAGE_STYLES.purple}`}
                      aria-label={`Usar ${option.name}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{option.icon}</span>
                      <span className="text-[9px] font-label-caps leading-none">{option.cost} pts</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-on-surface-variant leading-snug">
                {enabled ? 'Toca un cuadrado para preparar el ataque.' : 'Se desbloquean desde la ronda 2.'}
              </p>
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

function TimelinePlacementQuestion({ question, playerYears = [], disabled, onPick }) {
  const years = playerYears.length ? playerYears : [2000];
  const slots = Array.from({ length: years.length + 1 }, (_, index) => index);
  const correctSlot = years.filter((year) => year < question.songYear).length;

  return (
    <div className="mt-5">
      <div className="rounded-3xl border border-neon-green/20 bg-[radial-gradient(circle_at_top,rgba(57,255,20,0.12),rgba(255,255,255,0.04)_42%,rgba(0,0,0,0.24)_100%)] p-4 shadow-[0_0_30px_rgba(57,255,20,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-label-caps text-[10px] text-neon-green tracking-widest">TU LÍNEA MUSICAL</p>
            <p className="mt-1 text-sm text-white font-bold">Elige dónde colocar esta canción</p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-label-caps text-on-surface-variant">
            {Math.min(years.length, 12)}/12
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-2 snap-x">
          <div className="min-w-max flex items-center gap-2 px-1">
            {slots.map((slot, index) => (
              <div key={slot} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick({ isCorrect: slot === correctSlot, timelineSlot: slot })}
                  className="w-24 h-20 snap-center rounded-2xl border border-dashed border-neon-green/50 bg-neon-green/10 text-neon-green active:scale-95 transition-transform flex flex-col items-center justify-center gap-1 hover:bg-neon-green/20 focus:outline-none focus:ring-2 focus:ring-neon-green"
                >
                  <span className="material-symbols-outlined text-xl">add_circle</span>
                  <span className="text-[10px] font-label-caps leading-tight px-1">{getTimelineSlotLabel(years, slot)}</span>
                </button>
                {index < years.length && (
                  <div className="w-20 h-24 snap-center rounded-2xl border border-white/15 bg-black/35 flex flex-col items-center justify-center shadow-[0_0_18px_rgba(0,0,0,0.22)]">
                    <span className="material-symbols-outlined text-sm text-electric-purple">album</span>
                    <span className="mt-1 text-3xl font-black text-white">{years[index]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          Tu línea es personal. Coloca la canción antes, después o entre tus años.
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
    targetScore,
    currentQuestion,
    spotifyPlaylistUrl,
    hostTriggerBlackout,
    hostRevealResults,
    hostCancelRound,
    guestAnswer,
    guestUseSabotage,
    guestId,
    players,
    roundAnswers,
    pendingAttacks,
    setAudioPlaying,
    roomError,
    clearRoomError
  } = useGameStore();
  const [answeredQuestionKey, setAnsweredQuestionKey] = useState(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [spotifyMessage, setSpotifyMessage] = useState('');
  const [spotifyError, setSpotifyError] = useState(false);
  const [sabotageMessage, setSabotageMessage] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const startedSpotifyRoundRef = useRef('');

  useEffect(() => {
    if (phase === 'result' || phase === 'final') navigate('/game/result');
    if (phase === 'lobby') navigate('/lobby');
  }, [phase, navigate]);

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
    if (role !== 'host' || phase !== 'listen') return;

    const playKey = `${round}-${spotifyPlaylistUrl}`;
    if (startedSpotifyRoundRef.current === playKey) return;
    startedSpotifyRoundRef.current = playKey;

    let cancelled = false;
    const preparingTimeout = window.setTimeout(() => {
      if (!cancelled) setSpotifyMessage('Preparando Spotify...');
    }, 0);

    setSpotifyError(false);
    startRandomPlaylistTrack(spotifyPlaylistUrl)
      .then(() => {
        if (!cancelled) {
          setSpotifyMessage('Música sonando. Para cuando quieras.');
          setSpotifyError(false);
          setAudioPlaying(true);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setSpotifyMessage(explainSpotifyError(error));
          setSpotifyError(true);
          setAudioPlaying(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(preparingTimeout);
    };
  }, [role, phase, round, spotifyPlaylistUrl, setAudioPlaying]);

  const questionKey = useMemo(() => {
    if (!currentQuestion) return '';
    return `${currentQuestion.type}-${currentQuestion.text}-${round}`;
  }, [currentQuestion, round]);

  const hasRemoteAnswer = Boolean(guestId && roundAnswers?.[guestId] && roundAnswers[guestId].round === round);
  const hasAnswered = answeredQuestionKey === questionKey || hasRemoteAnswer;
  const answerCount = Object.keys(roundAnswers || {}).length;
  const expectedVotes = players.length;
  const mode = GAME_MODES[gameMode] || GAME_MODES.pulse;
  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  ));
  const ownPlayer = players.find((player) => player.id === guestId);
  const ownTimelineYears = getCombinedTimelineYears(ownPlayer);
  const canUseSabotageNow = Boolean(guestId && phase === 'listen' && round > 1 && players.length > 1);

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
    const myPending = pendingAttacks?.[guestId];
    if (myPending) {
      setSabotageMessage(`⚠️ ¡ALERTA! ¡ALERTA! ${myPending.by} tiene un ataque preparado para ti en la próxima ronda.`);
    }
  };

  const handleHostBlackout = async () => {
    const hiddenTrack = getCurrentHiddenTrack();
    const spotifyQuestion = hiddenTrack ? await createQuestionFromTrack(hiddenTrack, gameMode, round, ownTimelineYears) : null;
    await pauseSpotifyPlayback().catch((error) => console.warn('No se pudo pausar Spotify:', error));
    setAudioPlaying(false);
    await hostTriggerBlackout(spotifyQuestion, hiddenTrack);
  };

  const handleSpotifyRetry = () => {
    setSpotifyError(false);
    setSpotifyMessage('Reintentando...');
    startRandomPlaylistTrack(spotifyPlaylistUrl)
      .then(() => {
        setSpotifyMessage('Música sonando. Para cuando quieras.');
        setAudioPlaying(true);
      })
      .catch((error) => {
        setSpotifyMessage(explainSpotifyError(error));
        setSpotifyError(true);
        setAudioPlaying(false);
      });
  };

  const handleUseSabotage = async (option) => {
    setSabotageMessage('');
    if (!canUseSabotageNow) {
      setSabotageMessage('Los ataques se activan desde la ronda 2.');
      return;
    }
    if (Number(ownPlayer?.points || 0) < option.cost) {
      setSabotageMessage('Te faltan puntos para ese ataque.');
      return;
    }

    await guestUseSabotage(option.id);
    setSabotageMessage(`${option.name} preparado.`);
  };

  return (
    <div className={`relative z-10 min-h-screen w-full flex flex-col items-center justify-center pt-16 transition-colors duration-500 ${phase === 'blackout' ? 'bg-black' : 'bg-transparent'}`}>

      {role === 'host' && (
        <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-margin-mobile z-50 bg-surface/60 backdrop-blur-xl border-b border-white/10">
          <button onClick={() => setShowExitConfirm(true)} className="text-on-surface-variant font-label-caps text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">arrow_back</span> CANCELAR
          </button>
          <div className="text-center">
            <p className="font-label-caps text-xs text-neon-green">RONDA {round}</p>
            <p className="font-label-caps text-[10px] text-on-surface-variant">
              {gameMode === 'timeline' ? 'MODO LÍNEA' : `META ${targetScore} PTS`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-label-caps text-[10px] text-on-surface-variant">TUS PUNTOS</p>
            <p className="font-label-caps text-sm font-black text-neon-green">{ownPlayer?.points ?? 0}</p>
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[430px] px-margin-mobile text-center flex flex-col items-center"
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
                className="font-stats-xl text-[8rem] leading-none text-neon-green drop-shadow-[0_0_40px_rgba(57,255,20,0.6)]"
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
            className="flex flex-col items-center gap-6 w-full max-w-[430px] px-5 text-center"
          >
            {/* Vinyl listen circle */}
            <div className="relative w-72 h-72 flex items-center justify-center">
              {[0, 0.8, 1.6].map((delay) => (
                <div
                  key={delay}
                  className="absolute inset-0 rounded-full border-2 border-neon-green/20 ring-expand-anim"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
              <div className="w-64 h-64 rounded-full border-4 border-neon-green flex items-center justify-center shadow-[0_0_50px_rgba(57,255,20,0.35),inset_0_0_30px_rgba(0,0,0,0.6)] bg-black/30 relative">
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-white/5" />
                <div className="relative z-10 text-center">
                  <p className="font-label-caps text-[10px] text-electric-purple tracking-widest">{mode.name}</p>
                  <span className="block mt-2 font-headline-lg-mobile text-4xl text-neon-green font-black tracking-widest drop-shadow-[0_0_18px_rgba(57,255,20,0.6)]">
                    {role === 'host' ? 'SONANDO' : 'ESCUCHA'}
                  </span>
                  <p className="mt-2 font-label-caps text-[9px] text-white/50 tracking-widest">
                    {role === 'host' ? 'PARA CUANDO QUIERAS' : 'EL ANFITRIÓN DECIDE'}
                  </p>
                </div>
              </div>
            </div>

            {/* Equalizer */}
            <div className="flex gap-2 items-end h-14">
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-vinyl-orange/50 bg-vinyl-orange/15 text-vinyl-orange font-label-caps text-xs font-bold active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    REINTENTAR SPOTIFY
                  </button>
                )}
              </div>
            ) : (
              <p className="max-w-xs text-sm text-on-surface-variant text-center">
                {`${activePlaylist?.icon || '🎵'} Escucha con atención. Nadie ve la canción.`}
              </p>
            )}

            <SabotageSquares
              options={SABOTAGE_OPTIONS}
              points={ownPlayer?.points || 0}
              enabled={canUseSabotageNow}
              onUse={handleUseSabotage}
            />
            {sabotageMessage && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-sm rounded-xl border border-electric-purple/40 bg-electric-purple/10 px-3 py-2 text-xs text-electric-purple"
              >
                {sabotageMessage}
              </motion.p>
            )}

            <RankingPeek players={players} guestId={guestId} />

            {gameMode === 'timeline' && (
              <div className="flex items-start gap-2 rounded-xl border border-neon-green/20 bg-neon-green/5 px-3 py-2 max-w-sm text-left">
                <span className="material-symbols-outlined text-neon-green text-sm shrink-0 mt-px">timeline</span>
                <p className="text-xs text-on-surface-variant leading-snug">
                  Modo Línea: escucha el año y prepárate para colocarla en tu línea musical.
                </p>
              </div>
            )}

            {role === 'host' && (
              <div className="w-full max-w-xs grid gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleHostBlackout}
                  className="w-full h-20 bg-intense-red hover:bg-red-600 text-white font-headline-lg-mobile text-3xl rounded-2xl shadow-[0_0_30px_rgba(255,107,139,0.45)] transition-colors font-black border-2 border-white/15 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  PARAR MÚSICA
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
            className="w-full max-w-[430px] px-margin-mobile py-20 flex flex-col gap-4"
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
                className="mt-3 text-white font-headline-lg-mobile text-3xl leading-tight"
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
                          <span className="text-[9px] text-on-surface-variant font-label-caps max-w-[2.5rem] truncate">{player.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!hasAnswered && (
                  <p className="mt-2 text-xs text-on-surface-variant">Responde primero. Tu voto también cuenta.</p>
                )}
                <button
                  type="button"
                  onClick={hostRevealResults}
                  disabled={!hasAnswered}
                  className="mt-4 w-full h-14 rounded-xl bg-neon-green text-black font-label-caps text-sm font-bold active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  REVELAR RESULTADOS
                </button>
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
                  <p className="mt-3 text-white font-bold text-lg">RESPUESTA ENVIADA</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {role === 'host' ? 'Cuando todos estén listos, revela.' : 'Esperando al anfitrión...'}
                  </p>
                </motion.div>
                <div className="mt-3 w-full flex flex-col gap-2">
                  <RankingPeek players={players} guestId={guestId} />
                </div>
              </>
            ) : currentQuestion.answerType === 'timeline-placement' ? (
              <TimelinePlacementQuestion
                question={currentQuestion}
                playerYears={ownTimelineYears}
                disabled={hasAnswered}
                onPick={handleAnswer}
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
                    className="w-full min-h-[5rem] p-4 bg-white/8 text-white rounded-2xl border border-white/15 hover:border-neon-green/60 hover:bg-neon-green/8 active:scale-[0.97] text-left font-body-md text-base transition-all duration-150 flex items-center gap-4 group"
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
              <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '2.5rem' }}>warning</span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">¿Cancelar la ronda?</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Volverás al lobby. La ronda actual se perderá para todos.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={async () => { setShowExitConfirm(false); await hostCancelRound(); }}
                  className="w-full h-12 rounded-xl bg-intense-red text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  SÍ, CANCELAR RONDA
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

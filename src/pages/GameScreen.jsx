import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEDICALO_PLAYLISTS, GAME_MODES, getCombinedTimelineYears, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import HeaderHUD from '../components/HeaderHUD';
import { createQuestionFromTrack, explainSpotifyError, getCurrentHiddenTrack, getSpotifyStatus, pauseSpotifyPlayback, startRandomPlaylistTrack } from '../services/spotify';

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
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 ${player.id === guestId ? 'bg-neon-green/10 border border-neon-green/25' : 'bg-white/5'}`}
                >
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${index === 0 ? 'bg-neon-green text-black' : 'bg-white/10 text-white'}`}>
                    {index + 1}
                  </span>
                  {player.avatar?.startsWith?.('http') ? (
                    <img src={player.avatar} alt={player.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-sm shrink-0">{player.avatar || '•'}</span>
                  )}
                  <span className="text-sm font-bold text-white truncate flex-1">{player.name}</span>
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
            <p className="font-label-caps text-[10px] text-neon-green tracking-widest">TU RUTA DE AÑOS</p>
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
          Tu ruta es personal. Coloca la canción antes, después o entre tus años.
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
    clearRoomError
  } = useGameStore();
  const [answeredQuestionKey, setAnsweredQuestionKey] = useState(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [spotifyMessage, setSpotifyMessage] = useState('');
  const [spotifyTrackReady, setSpotifyTrackReady] = useState(false);
  const [spotifyError, setSpotifyError] = useState(false);
  const [spotifyNeedsReconnect, setSpotifyNeedsReconnect] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [disconnectToast, setDisconnectToast] = useState('');
  const [revealError, setRevealError] = useState('');
  const [isBlackoutPending, setIsBlackoutPending] = useState(false);
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
  const expectedVotes = players.length;
  const mode = GAME_MODES[gameMode] || GAME_MODES.timeline;
  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  ));
  const ownPlayer = players.find((player) => player.id === guestId);
  const ownTimelineYears = getCombinedTimelineYears(ownPlayer);



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
    <div className={`relative z-10 min-h-dvh w-full flex flex-col items-center justify-center pt-safe-header pb-8 transition-colors duration-500 ${phase === 'blackout' ? 'bg-black' : 'bg-transparent'}`}>

      <HeaderHUD onExit={() => setShowExitConfirm(true)} />

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
                <p className="text-xs font-black text-white">{disconnectToast} se desconectó</p>
                <p className="text-[10px] text-vinyl-orange/80">Ha sido eliminado de la partida.</p>
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
            className={`flex flex-col items-center gap-4 w-full max-w-[430px] px-5 text-center ${role === 'host' ? 'pb-32' : ''}`}
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
              <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 border-neon-green flex items-center justify-center shadow-[0_0_50px_rgba(57,255,20,0.35),inset_0_0_30px_rgba(0,0,0,0.6)] bg-black/30 relative">
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-white/5" />
                <div className="relative z-10 text-center">
                  <p className="font-label-caps text-[10px] text-electric-purple tracking-widest">{mode.name}</p>
                  <span className="block mt-2 font-headline-lg-mobile text-3xl sm:text-4xl text-neon-green font-black tracking-widest drop-shadow-[0_0_18px_rgba(57,255,20,0.6)]">
                    {role === 'host' ? 'SONANDO' : 'ESCUCHA'}
                  </span>
                  <p className="mt-2 font-label-caps text-[9px] text-white/50 tracking-widest">
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-vinyl-orange/50 bg-vinyl-orange/15 text-vinyl-orange font-label-caps text-xs font-bold active:scale-95 transition-all"
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
                {`${activePlaylist?.icon || '🎵'} Escucha con atención. Nadie ve la canción.`}
              </p>
            )}

            <RankingPeek players={players} guestId={guestId} />



            {role === 'host' && (
              <div className="fixed bottom-5 left-4 right-4 z-40 grid gap-2 mx-auto max-w-sm md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:w-full md:max-w-xs md:mt-2 md:mb-8">
                <p className="text-center text-xs text-on-surface-variant">Para cuando lo veas claro 👇</p>
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
                  <p className="mt-2 text-xs text-intense-red text-center">{revealError}</p>
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
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {role === 'host' ? 'Cuando todos estén listos, revela los resultados.' : 'Esperando al anfitrión...'}
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
              <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '2.5rem' }}>
                {role === 'host' ? 'emoji_events' : 'logout'}
              </span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">
                {role === 'host' ? '¿Terminar la partida?' : '¿Salir de la partida?'}
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                {role === 'host'
                  ? 'Se mostrará el ranking final a todos los jugadores. ¿Estás seguro?'
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

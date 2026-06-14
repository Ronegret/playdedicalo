import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEDICALO_PLAYLISTS, GAME_MODES, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import { createQuestionFromTrack, explainSpotifyError, getCurrentHiddenTrack, pauseSpotifyPlayback, startRandomPlaylistTrack } from '../services/spotify';

const EQUALIZER_BARS = [0.35, 0.58, 0.42, 0.71, 0.49, 0.64, 0.39];

function getTimelineSlotLabel(years, index) {
  if (index === 0) return `Antes de ${years[0]}`;
  if (index === years.length) return `Después de ${years[years.length - 1]}`;
  return `Entre ${years[index - 1]} y ${years[index]}`;
}

function TimelinePlacementQuestion({ question, disabled, onPick }) {
  const years = question.timelineYears?.length ? question.timelineYears : [2000];
  const slots = Array.from({ length: years.length + 1 }, (_, index) => index);

  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="font-label-caps text-[10px] text-neon-green tracking-widest">ELIGE EL HUECO</p>
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-max flex items-center gap-2 px-1">
            {slots.map((slot, index) => (
              <div key={slot} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(slot === question.correct)}
                  className="w-24 h-20 rounded-2xl border border-dashed border-neon-green/50 bg-neon-green/10 text-neon-green active:scale-95 transition-transform flex flex-col items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span className="text-[10px] font-label-caps leading-tight px-1">{getTimelineSlotLabel(years, slot)}</span>
                </button>
                {index < years.length && (
                  <div className="w-20 h-24 rounded-2xl border border-white/15 bg-black/30 flex flex-col items-center justify-center shadow-[0_0_18px_rgba(0,0,0,0.22)]">
                    <span className="text-[10px] font-label-caps text-on-surface-variant">Carta</span>
                    <span className="mt-1 text-3xl font-black text-white">{years[index]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          No necesitas saber el día: solo ubica si la canción va antes, después o entre esos años.
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
    guestAnswer,
    guestId,
    players,
    roundAnswers,
    setAudioPlaying
  } = useGameStore();
  const [answeredQuestionKey, setAnsweredQuestionKey] = useState(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [spotifyMessage, setSpotifyMessage] = useState('');
  const startedSpotifyRoundRef = useRef('');

  useEffect(() => {
    if (phase === 'result' || phase === 'final') {
      navigate('/game/result');
    }
    if (phase === 'lobby') {
      navigate('/lobby');
    }
  }, [phase, navigate]);

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

    startRandomPlaylistTrack(spotifyPlaylistUrl)
      .then(() => {
        if (!cancelled) {
          setSpotifyMessage('Sonando en Spotify. No mires el titulo.');
          setAudioPlaying(true);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setSpotifyMessage(explainSpotifyError(error));
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

  const hasRemoteAnswer = Boolean(guestId && roundAnswers?.[guestId]);
  const hasAnswered = answeredQuestionKey === questionKey || hasRemoteAnswer;
  const answerCount = Object.keys(roundAnswers || {}).length;
  const expectedGuestVotes = players.filter((player) => !player.isHost).length;
  const mode = GAME_MODES[gameMode] || GAME_MODES.pulse;
  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  ));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
  };

  const handleAnswer = (isCorrect) => {
    setAnsweredQuestionKey(questionKey);
    guestAnswer(isCorrect);
  };

  const handleHostBlackout = async () => {
    const hiddenTrack = getCurrentHiddenTrack();
    const spotifyQuestion = hiddenTrack ? createQuestionFromTrack(hiddenTrack, gameMode, round) : null;
    await pauseSpotifyPlayback().catch((error) => console.warn('No se pudo pausar Spotify:', error));
    setAudioPlaying(false);
    await hostTriggerBlackout(spotifyQuestion);
  };

  return (
    <div className={`relative z-10 min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-500 ${phase === 'blackout' ? 'bg-black' : 'bg-transparent'}`}>
      {role === 'host' && phase !== 'blackout' && (
        <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-margin-mobile z-50 bg-surface/60 backdrop-blur-xl border-b border-white/10">
          <button onClick={() => navigate('/lobby')} className="text-on-surface-variant font-label-caps text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span> CANCELAR
          </button>
          <span className="font-label-caps text-xs text-neon-green">RONDA {round}</span>
        </header>
      )}

      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.7, 1.08, 1], opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.75 }}
            className="w-full max-w-[430px] px-margin-mobile text-center"
          >
            <p className="font-label-caps text-electric-purple tracking-widest">PREPARA EL OIDO</p>
            <motion.div
              key={countdownValue}
              initial={{ scale: 0.45, opacity: 0 }}
              animate={{ scale: [0.8, 1.12, 1], opacity: 1 }}
              transition={{ duration: 0.28 }}
              className="mt-3 font-stats-xl text-9xl text-neon-green drop-shadow-[0_0_24px_rgba(57,255,20,0.4)]"
            >
              {countdownValue}
            </motion.div>
            <p className="mt-4 text-sm text-on-surface-variant">La musica empieza al terminar la cuenta.</p>
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
            <div className="relative w-64 h-64 rounded-full border-4 border-neon-green flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(57,255,20,0.28)] bg-black/15">
              <div className="absolute inset-4 rounded-full border border-white/10" />
              <div>
                <p className="font-label-caps text-[10px] text-electric-purple tracking-widest">{mode.name}</p>
                <span className="block mt-2 font-headline-lg-mobile text-3xl text-neon-green font-bold tracking-widest">
                  {role === 'host' ? 'SONANDO' : 'ESCUCHA'}
                </span>
                <p className="mt-2 font-label-caps text-xs text-white/70 tracking-widest">EL HOST DECIDE EL CORTE</p>
              </div>
            </div>

            <div className="flex gap-3 items-end h-16">
              {EQUALIZER_BARS.map((duration, index) => (
                <motion.div
                  key={`${duration}-${index}`}
                  animate={{ height: ['22%', '100%', '32%'] }}
                  transition={{ repeat: Infinity, duration, delay: index * 0.04 }}
                  className="w-4 bg-neon-green rounded-t-sm shadow-[0_0_12px_rgba(57,255,20,0.3)]"
                />
              ))}
            </div>

            <p className="max-w-xs text-sm text-on-surface-variant">
              {role === 'host' && spotifyMessage ? spotifyMessage : `${activePlaylist ? `Playlist: ${activePlaylist.name}. ` : ''}Memoriza el ritmo, la epoca, la letra y el ambiente.`}
            </p>

            {role === 'host' && (
              <div className="w-full max-w-xs grid gap-3">
                <button
                  onClick={handleHostBlackout}
                  className="w-full h-16 bg-intense-red hover:bg-red-600 text-white font-headline-lg-mobile text-2xl rounded-2xl shadow-[0_0_20px_rgba(255,0,0,0.38)] active:scale-95 transition-transform font-black border-2 border-white/20"
                >
                  CORTE BLACKOUT
                </button>
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
              <p className="font-label-caps text-intense-red text-xs tracking-widest">BLACKOUT · {currentQuestion.type}</p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-3 text-white font-headline-lg-mobile text-3xl leading-tight"
              >
                {currentQuestion.text}
              </motion.h2>
            </div>

            {role === 'host' && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="font-label-caps text-neon-green text-xs">VOTOS RECIBIDOS</p>
                <p className="mt-1 text-4xl font-black text-white">{answerCount}/{expectedGuestVotes}</p>
                <button
                  type="button"
                  onClick={hostRevealResults}
                  className="mt-4 w-full h-12 rounded-xl bg-neon-green text-black font-label-caps font-bold active:scale-95 transition-transform"
                >
                  REVELAR RESULTADOS
                </button>
              </div>
            )}

            {role !== 'host' && hasAnswered ? (
              <div className="mt-8 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-5 text-center">
                <span className="material-symbols-outlined text-neon-green text-4xl">check_circle</span>
                <p className="mt-3 text-on-surface-variant font-label-caps text-sm animate-pulse">RESPUESTA ENVIADA</p>
                <p className="mt-2 text-xs text-on-surface-variant">Pantalla en negro hasta que el anfitrión revele.</p>
              </div>
            ) : role !== 'host' && currentQuestion.answerType === 'timeline-placement' ? (
              <TimelinePlacementQuestion
                question={currentQuestion}
                disabled={hasAnswered}
                onPick={handleAnswer}
              />
            ) : role !== 'host' ? (
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
                    className="w-full min-h-16 p-4 bg-white/10 text-white rounded-xl border border-white/20 hover:border-neon-green active:bg-white/30 text-left font-body-md text-base transition-colors flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-lg bg-black/20 text-neon-green flex items-center justify-center font-black shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="leading-snug">{option}</span>
                  </motion.button>
                ))}
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

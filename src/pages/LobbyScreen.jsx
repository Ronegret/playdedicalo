import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChaosEconomyBubbles from '../components/ChaosEconomyBubbles';
import { GAME_MODES, SABOTAGE_OPTIONS, VICTORY_MODES, useGameStore } from '../store/useGameStore';
import { explainSpotifyError, prepareSpotifyPlayback } from '../services/spotify';

function InfoDetails({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="ml-auto shrink-0 w-7 h-7 rounded-full border border-white/15 bg-white/5 text-on-surface-variant flex items-center justify-center"
        aria-label={`Ver información de ${title}`}
      >
        <span className="material-symbols-outlined text-sm">info</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center px-5"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 18 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-container p-5 text-left shadow-[0_0_40px_rgba(189,0,255,0.22)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-black text-white leading-tight">{title}</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant"
                  aria-label="Cerrar información"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CheckRow({ title, subtitle, selected, onSelect, children }) {
  return (
    <div className={`rounded-xl border transition-colors ${selected ? 'border-neon-green bg-neon-green/10' : 'border-white/10 bg-black/10'}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onSelect}
          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${selected ? 'border-neon-green bg-neon-green text-black' : 'border-white/20 bg-white/5 text-transparent'}`}
          aria-pressed={selected}
        >
          <span className="material-symbols-outlined text-base">check</span>
        </button>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-bold text-white leading-tight">{title}</span>
          {subtitle && <span className="mt-1 block text-[11px] text-on-surface-variant truncate">{subtitle}</span>}
        </button>
        {children}
      </div>
    </div>
  );
}

function ModeCard({ mode, selected, onSelect }) {
  return (
    <CheckRow title={mode.name} subtitle={mode.short} selected={selected} onSelect={onSelect}>
      <InfoDetails title={mode.name}>
        <p>{mode.description}</p>
        <p className="mt-2 text-neon-green">{mode.rhythm}</p>
      </InfoDetails>
    </CheckRow>
  );
}

function VictoryCard({ mode, selected, onSelect }) {
  return (
    <CheckRow title={`${mode.targetScore} pts`} subtitle={mode.name} selected={selected} onSelect={onSelect}>
      <InfoDetails title={mode.name}>
        <p>{mode.description}</p>
      </InfoDetails>
    </CheckRow>
  );
}

function SabotageCard({ option, canUse, onUse }) {
  const colorClass = option.color === 'green'
    ? 'border-neon-green/40 text-neon-green'
    : option.color === 'red'
      ? 'border-intense-red/50 text-intense-red'
      : 'border-electric-purple/60 text-electric-purple';

  return (
    <div className={`rounded-xl border bg-white/5 ${colorClass}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => canUse && onUse(option.id)}
          disabled={!canUse}
          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${canUse ? 'border-current bg-black/15 text-current' : 'border-white/15 text-transparent opacity-50'}`}
          aria-label={`Activar ${option.name}`}
        >
          <span className="material-symbols-outlined text-base">check</span>
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white leading-tight">{option.name}</h3>
          <p className="mt-1 font-label-caps text-[10px] text-current">{option.cost} pts</p>
        </div>
        <InfoDetails title={option.name}>
          <p>{option.effect}</p>
        </InfoDetails>
      </div>
    </div>
  );
}

function TimelineYears({ years = [] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-9">
      <span className="font-label-caps text-[10px] text-on-surface-variant">Línea {Math.min(years.length, 12)}/12</span>
      {years.slice(0, 12).map((year) => (
        <span key={year} className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1 text-[10px] font-black text-neon-green">
          {year}
        </span>
      ))}
    </div>
  );
}

export default function LobbyScreen() {
  const navigate = useNavigate();
  const {
    role,
    pin,
    players,
    phase,
    round,
    gameMode,
    targetScore,
    hostStartGame,
    setGameSettings,
    guestUseSabotage,
    guestLeaveRoom,
    hostCloseRoom
  } = useGameStore();
  const [showQR, setShowQR] = useState(false);
  const [startError, setStartError] = useState('');
  const gameLocked = round > 1;

  useEffect(() => {
    if (phase === 'countdown' || phase === 'listen' || phase === 'blackout') navigate('/game');
    if (phase === 'result' || phase === 'final') navigate('/game/result');
  }, [phase, navigate]);

  const handleExit = () => {
    if (role === 'guest') guestLeaveRoom();
    if (role === 'host') hostCloseRoom();
    navigate('/role-selection');
  };

  const handleSettingsChange = (nextSettings) => {
    setGameSettings({ gameMode, targetScore, ...nextSettings });
  };

  const handleHostStartGame = async () => {
    setStartError('');
    try {
      await prepareSpotifyPlayback();
      await hostStartGame();
    } catch (error) {
      console.error(error);
      setStartError(explainSpotifyError(error));
    }
  };

  const canUseSabotage = role === 'guest' && round > 1;

  return (
    <motion.main className="relative z-10 min-h-screen px-margin-mobile pt-20 pb-28 max-w-lg mx-auto flex flex-col items-center w-full">
      <ChaosEconomyBubbles />

      <header className="fixed top-0 left-0 right-0 h-16 bg-surface/85 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-margin-mobile z-50">
        <button onClick={handleExit} className="text-on-surface-variant hover:text-white transition-colors flex items-center font-label-caps text-xs gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span> SALIR
        </button>
        <span className="font-headline-lg-mobile text-xl font-black italic tracking-tighter text-white">DEDICALO</span>
        <div className="w-8 h-8 opacity-0" />
      </header>

      <section className="w-full flex flex-col gap-4 z-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-label-caps text-neon-green text-xs">RONDA {round}</p>
              <h2 className="font-headline-lg-mobile text-2xl font-bold text-on-surface mt-1">PIN DE SALA</h2>
            </div>
            <button
              onClick={() => setShowQR(true)}
              className="w-11 h-11 bg-white/5 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center"
              aria-label="Mostrar QR de la sala"
            >
              <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {pin ? pin.split('').map((char, index) => (
              <input key={`${char}-${index}`} className="h-14 bg-black/20 border-2 border-white/10 rounded-xl text-center font-stats-xl text-3xl text-neon-green" value={char} readOnly />
            )) : <p className="text-on-surface-variant col-span-4">Cargando sala...</p>}
          </div>
        </div>

        {role === 'host' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-left">
            <p className="font-label-caps text-neon-green text-xs mb-3">{gameLocked ? 'PARTIDA EN CURSO' : 'ELIGE LA PARTIDA'}</p>

            {gameLocked ? (
              <div className="rounded-xl border border-neon-green/30 bg-neon-green/10 p-4">
                <p className="text-lg font-black text-white">{GAME_MODES[gameMode]?.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">Meta: {targetScore} puntos. La partida sigue con las mismas reglas hasta el final.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">Meta</span>
                    <span className="text-xs text-neon-green font-label-caps">{targetScore} puntos</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {VICTORY_MODES.map((mode) => (
                      <VictoryCard
                        key={mode.targetScore}
                        mode={mode}
                        selected={targetScore === mode.targetScore}
                        onSelect={() => handleSettingsChange({ targetScore: mode.targetScore })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">Modo</span>
                    <span className="text-xs text-neon-green font-label-caps">{GAME_MODES[gameMode]?.short}</span>
                  </div>
                  <div className="grid gap-2">
                    {Object.values(GAME_MODES).map((mode) => (
                      <ModeCard
                        key={mode.id}
                        mode={mode}
                        selected={gameMode === mode.id}
                        onSelect={() => handleSettingsChange({ gameMode: mode.id })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleHostStartGame}
              className="mt-5 w-full h-12 bg-neon-green text-black font-label-caps text-label-caps rounded-xl transition-all flex items-center justify-center gap-2 font-bold active:scale-95"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              INICIAR RONDA
            </button>
            {startError && (
              <p className="mt-3 rounded-xl border border-intense-red/40 bg-intense-red/10 px-3 py-2 text-xs text-intense-red">
                {startError}
              </p>
            )}
          </div>
        )}

        {role !== 'host' && (
          <div className="w-full h-12 bg-white/5 text-on-surface-variant font-label-caps text-label-caps rounded-xl flex items-center justify-center border border-white/10">
            ESPERANDO AL ANFITRIÓN...
          </div>
        )}

        {role === 'guest' && (
          <details className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-left overflow-hidden">
            <summary className="list-none p-4 flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="font-label-caps text-electric-purple text-xs">SABOTAJES</p>
                <h2 className="text-base font-bold text-white">Opciones de esta ronda</h2>
              </div>
              <span className="material-symbols-outlined text-electric-purple">expand_more</span>
            </summary>
            <div className="px-4 pb-4 grid gap-2">
              {SABOTAGE_OPTIONS.map((option) => (
                <SabotageCard
                  key={option.id}
                  option={option}
                  canUse={canUseSabotage}
                  onUse={guestUseSabotage}
                />
              ))}
              {!canUseSabotage && (
                <p className="text-[11px] text-on-surface-variant">Se desbloquean después de la primera ronda.</p>
              )}
            </div>
          </details>
        )}
      </section>

      <section className="mt-8 w-full z-10">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10" />
          <span className="font-label-caps text-label-caps text-on-surface-variant/70 tracking-widest">JUGADORES ({players.length})</span>
          <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-white/10" />
        </div>

        <div className="flex flex-col gap-3">
          {players.length === 0 && <p className="text-center text-on-surface-variant text-sm">No hay jugadores aún.</p>}
          {players.map((player, index) => (
            <div key={player.id} className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-label-caps text-xs text-on-surface-variant">#{index + 1}</span>
                  {player.avatar?.startsWith?.('http') ? (
                    <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-electric-purple" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-white/10 border border-white/5 shrink-0">
                      {player.avatar || '•'}
                    </div>
                  )}
                  <span className="font-body-md font-bold text-white truncate">{player.name}</span>
                </div>
                <div className="text-right text-neon-green shrink-0">
                  <span className="font-black">{player.points}</span>
                  <span className="text-xs ml-1">PTS</span>
                </div>
              </div>
              {gameMode === 'timeline' && <TimelineYears years={player.timelineYears || []} />}
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-margin-mobile"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-container p-7 rounded-2xl border border-white/10 flex flex-col items-center gap-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="font-headline-lg text-2xl text-white">Escanea para unirte</h3>
              <div className="p-4 bg-white rounded-2xl">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/guest/join?pin=${pin}`)}`} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="font-stats-xl text-4xl text-primary tracking-widest">{pin}</p>
              <button onClick={() => setShowQR(false)} className="px-6 py-2 bg-white/10 rounded-full font-label-caps text-xs hover:bg-white/20 transition-colors">CERRAR</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}



import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChaosEconomyBubbles from '../components/ChaosEconomyBubbles';
import { GAME_MODES, SABOTAGE_OPTIONS, TIMELINE_GOAL_YEARS, VICTORY_MODES, getCombinedTimelineYears, useGameStore } from '../store/useGameStore';
import { explainSpotifyError, prepareSpotifyPlayback } from '../services/spotify';
import ProfileMenu from '../components/ProfileMenu';
import { auth } from '../firebase';

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

function SabotageCard({ option }) {
  const colorClass = option.color === 'green'
    ? 'border-neon-green/40 text-neon-green'
    : option.color === 'red'
      ? 'border-intense-red/50 text-intense-red'
      : 'border-electric-purple/60 text-electric-purple';

  return (
    <div className={`rounded-xl border bg-white/5 ${colorClass}`}>
      <div className="flex items-center gap-3 p-3">
        <span className="material-symbols-outlined text-4xl shrink-0">{option.icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white leading-tight">{option.name}</h3>
          <p className="mt-0.5 font-label-caps text-[10px] text-current">{option.cost} pts</p>
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
      <span className="font-label-caps text-[10px] text-on-surface-variant">Años {Math.min(years.length, TIMELINE_GOAL_YEARS)}/{TIMELINE_GOAL_YEARS}</span>
      {years.slice(0, TIMELINE_GOAL_YEARS).map((year) => (
        <span key={year} className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1 text-[10px] font-black text-neon-green">
          {year}
        </span>
      ))}
    </div>
  );
}

const SABOTAGE_CONFIG_STYLES = {
  red: { border: 'border-intense-red/50', bg: 'bg-intense-red/10', text: 'text-intense-red', icon: 'text-intense-red' },
  green: { border: 'border-neon-green/45', bg: 'bg-neon-green/10', text: 'text-neon-green', icon: 'text-neon-green' },
  purple: { border: 'border-electric-purple/60', bg: 'bg-electric-purple/12', text: 'text-electric-purple', icon: 'text-electric-purple' }
};

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
    sabotageConfig,
    lastDisconnectedPlayer,
    hostStartGame,
    setGameSettings,
    guestLeaveRoom,
    hostCloseRoom,
    roomError,
    clearRoomError,
    guestAvatar
  } = useGameStore();
  const [showQR, setShowQR] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  const [sabotageOpen, setSabotageOpen] = useState(false);
  const [startError, setStartError] = useState('');
  const [disconnectToast, setDisconnectToast] = useState('');
  const gameLocked = round > 1;

  useEffect(() => {
    if (phase === 'countdown' || phase === 'listen' || phase === 'blackout') navigate('/game');
    if (phase === 'result' || phase === 'final') navigate('/game/result');
  }, [phase, navigate]);

  useEffect(() => {
    if (roomError) {
      clearRoomError();
      navigate('/role-selection');
    }
  }, [roomError, clearRoomError, navigate]);

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

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
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
    <motion.main className="relative z-10 min-h-screen px-margin-mobile pt-safe-header pb-28 max-w-lg mx-auto flex flex-col items-center w-full">
      <ChaosEconomyBubbles />

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
                <p className="text-[10px] text-vinyl-orange/80">Ha sido eliminado de la sala.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 h-16 bg-surface/85 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-margin-mobile z-50">
        <button onClick={handleExit} className="text-on-surface-variant hover:text-white transition-colors flex items-center font-label-caps text-xs gap-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span> SALIR
        </button>
        <img src="/images/logo-main.png" alt="Dedícalo" className="h-8 w-auto object-contain" />
        <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
      </header>

      {/* Host vinyl hero */}
      {role === 'host' && (
        <div className="w-full flex flex-col items-center gap-1 mb-2 z-10">
          <div className="relative" style={{ width: 'min(180px, 45vw)', aspectRatio: '1' }}>
            {/* Rings */}
            {[0, 0.9].map((delay) => (
              <div
                key={delay}
                className="absolute inset-[-20%] rounded-full border border-vinyl-orange/15 ring-expand-anim"
                style={{ animationDelay: `${delay}s`, animationDuration: '3.8s' }}
              />
            ))}
            <div className="absolute -inset-6 rounded-full bg-vinyl-orange/10 blur-2xl pointer-events-none" />
            {/* Spinning disc */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                background: `repeating-radial-gradient(circle, #0b0b0b 0px, #0b0b0b 2px, #191919 3px, #191919 5px, #0b0b0b 6px, #0b0b0b 9px)`,
                boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.8)',
              }}
            />
            {/* Logo label */}
            <div
              className="absolute rounded-full bg-white overflow-hidden flex items-center justify-center"
              style={{ inset: '20%', boxShadow: '0 0 0 3px rgba(0,0,0,0.5), 0 0 20px rgba(255,122,26,0.4)' }}
            >
              <img src="/images/logo-main.png" alt="Dedícalo" className="w-[78%] h-[78%] object-contain" draggable={false} />
            </div>
            <div className="absolute rounded-full bg-black" style={{ inset: '47.5%' }} />
          </div>
          {/* Mini EQ under vinyl */}
          <div className="flex items-end gap-[3px] h-5 mt-1 opacity-60">
            {[0.4,0.7,0.55,0.9,0.45,0.8,0.6,0.35,0.75,0.5].map((h, i) => (
              <div key={i} className="w-[4px] rounded-full eq-bar"
                style={{ height: `${h*100}%`, background: i%3===0?'#ff7a1a':i%3===1?'#a855f7':'#3f78ff',
                  animationDelay: `${i*0.09}s`, animationDuration: `${0.6+(i%4)*0.18}s` }} />
            ))}
          </div>
        </div>
      )}

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
              <motion.div
                key={`${char}-${index}`}
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
                className="h-16 bg-black/25 border-2 border-neon-green/35 rounded-xl flex items-center justify-center font-stats-xl text-4xl text-neon-green shadow-[0_0_16px_rgba(57,255,20,0.15),inset_0_0_10px_rgba(0,0,0,0.3)] select-none"
              >
                {char}
              </motion.div>
            )) : <p className="text-on-surface-variant col-span-4">Cargando sala...</p>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(pin).catch(() => {});
                setPinCopied(true);
                setTimeout(() => setPinCopied(false), 2000);
              }}
              className="h-10 rounded-xl border border-white/10 bg-white/5 text-on-surface-variant font-label-caps text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-sm">{pinCopied ? 'check' : 'content_copy'}</span>
              {pinCopied ? 'COPIADO' : 'COPIAR PIN'}
            </button>
            <button
              type="button"
              onClick={async () => {
                const shareUrl = `${window.location.origin}/guest/join?pin=${pin}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: 'Únete a Dedícalo', text: `Únete a mi sala con PIN ${pin}`, url: shareUrl });
                  } catch {
                    // El usuario canceló el panel de compartir.
                  }
                } else {
                  navigator.clipboard?.writeText(shareUrl).catch(() => {});
                  setLinkShared(true);
                  setTimeout(() => setLinkShared(false), 2000);
                }
              }}
              className="h-10 rounded-xl border border-neon-green/25 bg-neon-green/8 text-neon-green font-label-caps text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-neon-green/15"
            >
              <span className="material-symbols-outlined text-sm">{linkShared ? 'check' : 'share'}</span>
              {linkShared ? 'COPIADO' : 'COMPARTIR'}
            </button>
          </div>
        </div>

        {role === 'host' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-left">
            <p className="font-label-caps text-neon-green text-xs mb-3">{gameLocked ? 'PARTIDA EN CURSO' : 'ELIGE LA PARTIDA'}</p>

            {gameLocked ? (
              <div className="rounded-xl border border-neon-green/30 bg-neon-green/10 p-4">
                <p className="text-lg font-black text-white">{GAME_MODES[gameMode]?.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {gameMode === 'timeline'
                    ? `Meta de Años Locos: ${TIMELINE_GOAL_YEARS} años. Cada jugador arranca con un año base distinto.`
                    : `Meta: ${targetScore} puntos. La partida sigue con las mismas reglas hasta el final.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {gameMode === 'timeline' ? (
                  <div className="rounded-xl border border-vinyl-orange/30 bg-vinyl-orange/10 p-4 text-left">
                    <p className="font-label-caps text-[10px] text-vinyl-orange tracking-[0.2em]">META DE AÑOS LOCOS</p>
                    <h3 className="mt-1 text-lg font-black text-white">{TIMELINE_GOAL_YEARS} años</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Cada jugador arranca con un año base distinto y va completando su línea hasta llegar a la meta.
                    </p>
                  </div>
                ) : (
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
                )}

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

                <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-sm font-bold text-white">Sabotajes</span>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        Los sabotajes permiten gastar puntos para atacar al líder. ¡Ideal para las revancha!
                      </p>
                    </div>
                    <InfoDetails title="¿Qué son los sabotajes?">
                      <p>Son cartas especiales que los jugadores pueden usar mientras suena la música.</p>
                      <p className="mt-2">Cada sabotaje tiene un coste en puntos. Bien usados, pueden cambiar el resultado de la partida.</p>
                      <p className="mt-2 text-neon-green">Se desbloquean a partir de la ronda 2.</p>
                    </InfoDetails>
                  </div>

                  <div className="grid gap-2 mb-3">
                    {[
                      { id: 'none', label: 'Sin sabotajes', desc: 'Juego limpio, solo música y respuestas.', icon: 'block', selected: !sabotageConfig?.enabled },
                      { id: 'all', label: 'Con todos los sabotajes', desc: 'Más caos, más drama y más revancha.', icon: 'auto_awesome', selected: sabotageConfig?.enabled && sabotageConfig?.types === 'all' },
                      { id: 'custom', label: 'Solo algunos sabotajes', desc: 'Tú eliges cuáles aparecen en la partida.', icon: 'tune', selected: sabotageConfig?.enabled && sabotageConfig?.types === 'custom' }
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        className={`rounded-xl border transition-colors ${opt.selected ? 'border-electric-purple/60 bg-electric-purple/10' : 'border-white/10 bg-black/10'}`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (opt.id === 'none') handleSettingsChange({ sabotageConfig: { enabled: false, types: 'none', allowedIds: [] } });
                              else if (opt.id === 'all') handleSettingsChange({ sabotageConfig: { enabled: true, types: 'all', allowedIds: [] } });
                              else handleSettingsChange({ sabotageConfig: { enabled: true, types: 'custom', allowedIds: sabotageConfig?.allowedIds || [] } });
                            }}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${opt.selected ? 'border-electric-purple bg-electric-purple text-white' : 'border-white/20 bg-white/5 text-transparent'}`}
                            aria-pressed={opt.selected}
                          >
                            <span className="material-symbols-outlined text-base">check</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (opt.id === 'none') handleSettingsChange({ sabotageConfig: { enabled: false, types: 'none', allowedIds: [] } });
                              else if (opt.id === 'all') handleSettingsChange({ sabotageConfig: { enabled: true, types: 'all', allowedIds: [] } });
                              else handleSettingsChange({ sabotageConfig: { enabled: true, types: 'custom', allowedIds: sabotageConfig?.allowedIds || [] } });
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block text-sm font-bold text-white leading-tight">{opt.label}</span>
                            <span className="mt-0.5 block text-[11px] text-on-surface-variant">{opt.desc}</span>
                          </button>
                          <span className={`material-symbols-outlined text-2xl shrink-0 ${opt.selected ? 'text-electric-purple' : 'text-white/20'}`}>{opt.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {sabotageConfig?.enabled && sabotageConfig?.types === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="overflow-hidden"
                    >
                      <p className="text-[11px] text-on-surface-variant mb-2 font-bold">¿Cuáles habilitas?</p>
                      <div className="grid gap-1.5">
                        {SABOTAGE_OPTIONS.map((option) => {
                          const s = SABOTAGE_CONFIG_STYLES[option.color] || SABOTAGE_CONFIG_STYLES.purple;
                          const isSelected = sabotageConfig?.allowedIds?.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                const current = sabotageConfig?.allowedIds || [];
                                const next = isSelected
                                  ? current.filter((id) => id !== option.id)
                                  : [...current, option.id];
                                handleSettingsChange({ sabotageConfig: { ...sabotageConfig, allowedIds: next } });
                              }}
                              className={`rounded-xl border p-2.5 flex items-center gap-2.5 text-left transition-all active:scale-[0.98] ${isSelected ? `${s.border} ${s.bg}` : 'border-white/10 bg-black/15'}`}
                            >
                              <span className={`material-symbols-outlined text-3xl shrink-0 ${isSelected ? s.icon : 'text-white/30'}`}>{option.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs font-black leading-tight ${isSelected ? 'text-white' : 'text-white/50'}`}>{option.name}</span>
                                <span className={`block text-[9px] leading-snug mt-0.5 ${isSelected ? s.text : 'text-white/25'}`}>{option.cost}pts · {option.effect.slice(0, 55)}{option.effect.length > 55 ? '...' : ''}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? s.border : 'border-white/15'}`}>
                                {isSelected && <span className={`material-symbols-outlined text-sm ${s.text}`}>check</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {players.length < 2 && (
              <p className="mt-4 rounded-xl border border-vinyl-orange/30 bg-vinyl-orange/8 px-3 py-2 text-xs text-vinyl-orange/90 text-center">
                Comparte el PIN para que se unan jugadores. Puedes empezar cuando estés listo.
              </p>
            )}
            <button
              onClick={handleHostStartGame}
              className="mt-3 w-full h-12 bg-neon-green text-black font-label-caps text-label-caps rounded-xl transition-all flex items-center justify-center gap-2 font-bold active:scale-95"
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

        {role === 'guest' && sabotageConfig?.enabled !== false && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-left overflow-hidden">
            <button
              type="button"
              onClick={() => setSabotageOpen((prev) => !prev)}
              className="w-full p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-label-caps text-electric-purple text-xs">SABOTAJES</p>
                <h2 className="text-base font-bold text-white">Opciones de esta ronda</h2>
              </div>
              <motion.span
                animate={{ rotate: sabotageOpen ? 180 : 0 }}
                transition={{ duration: 0.22 }}
                className="material-symbols-outlined text-electric-purple text-2xl"
              >
                expand_more
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {sabotageOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 grid gap-2">
                    {(sabotageConfig?.types === 'custom' && sabotageConfig?.allowedIds?.length > 0
                      ? SABOTAGE_OPTIONS.filter((o) => sabotageConfig.allowedIds.includes(o.id))
                      : SABOTAGE_OPTIONS
                    ).map((option) => (
                      <SabotageCard
                        key={option.id}
                        option={option}
                      />
                    ))}
                    {!canUseSabotage && (
                      <p className="text-[11px] text-on-surface-variant">Se desbloquean después de la primera ronda.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, type: 'spring', stiffness: 180 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-label-caps text-xs text-on-surface-variant">#{index + 1}</span>
                  {player.avatar?.startsWith?.('http') ? (
                    <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border-2 border-electric-purple/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-white/10 border border-white/10 shrink-0">
                      {player.avatar || '•'}
                    </div>
                  )}
                  <span className="font-body-md font-bold text-white truncate">{player.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-neon-green drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]">{player.points}</span>
                  <span className="text-xs ml-1 text-on-surface-variant">PTS</span>
                </div>
              </div>
              {gameMode === 'timeline' && <TimelineYears years={getCombinedTimelineYears(player)} />}
            </motion.div>
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

        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-4 sm:pb-0"
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
              <span className="material-symbols-outlined text-intense-red" style={{ fontSize: '2.5rem' }}>logout</span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">
                {role === 'host' ? '¿Cerrar la sala?' : '¿Salir de la sala?'}
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                {role === 'host'
                  ? 'La partida terminará para todos los jugadores.'
                  : 'Perderás tu progreso en esta partida.'}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleConfirmExit}
                  className="w-full h-12 rounded-xl bg-intense-red text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  {role === 'host' ? 'SÍ, CERRAR SALA' : 'SÍ, SALIR'}
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

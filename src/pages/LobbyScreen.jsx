import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MusicNotesBubbles from '../components/MusicNotesBubbles';
import { DEDICALO_PLAYLISTS, MAX_TIMELINE_GOAL_YEARS, MIN_TIMELINE_GOAL_YEARS, PLAYLIST_META, getCombinedTimelineYears, getPlayerPresence, getTimelineProgress, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';
import { desbloquearAudio } from '../services/musica';
import ConectarTv from '../components/ConectarTv';
import CodigoQr from '../components/CodigoQr';
import ProfileMenu from '../components/ProfileMenu';
import HeaderLogo from '../components/HeaderLogo';
import SabotageSettings from '../components/SabotageSettings';
import { auth } from '../firebase';
import { useWakeLock } from '../hooks/useWakeLock';
import { sfx } from '../services/audio';
import { vibrar } from '../services/haptics';
import TimelineYears from '../components/TimelineYears';



// La ruta de años vive en un componente compartido con ResultScreen: antes
// había dos copias que ya se habían separado.

export default function LobbyScreen() {
  const navigate = useNavigate();
  const {
    role,
    pin,
    players,
    phase,
    round,
    hostStartGame,
    guestLeaveRoom,
    hostCloseRoom,
    roomError,
    clearRoomError,
    guestAvatar,
    lastDisconnectedPlayer,
    targetYears,
    setGameSettings,
    sabotageEnabled,
    sabotageTypes,
    spotifyPlaylistUrl,
    hostSetSpotifyPlaylistUrl,
    audioEnTv
  } = useGameStore();
  const [showQR, setShowQR] = useState(false);
  // Mientras el QR está en pantalla, el móvil no puede atenuarse: nadie lo
  // está tocando (lo sostiene en alto para que OTRO lo escanee) y a los
  // treinta segundos el sistema baja el brillo. Atenuada, la cámara de
  // enfrente deja de leer el código.
  useWakeLock(showQR);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  const [startError, setStartError] = useState('');
  const [conectandoTv, setConectandoTv] = useState(false);
  const [disconnectToast, setDisconnectToast] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const gameLocked = round > 1;
  const targetOptions = [6, 8, 12, 15, 20];
  const selectedPlaylistId = DEDICALO_PLAYLISTS.find(
    (playlist) => normalizeSpotifyPlaylistUrl(playlist.url) === spotifyPlaylistUrl
  )?.id || DEDICALO_PLAYLISTS[0].id;

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
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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



  const handleHostStartGame = async () => {
    setStartError('');
    try {
      // El desbloqueo del audio NO puede impedir que empiece la partida.
      // Antes se esperaba a que terminara y, sobre un audio sin fuente, esa
      // promesa no resolvía nunca: el botón de empezar no hacía nada.
      desbloquearAudio().catch(() => {});
      await hostStartGame();
    } catch (error) {
      console.error(error);
      setStartError(error?.message || 'No pudimos empezar la partida. Inténtalo otra vez.');
    }
  };

  const handleTargetYearsChange = (nextValue) => {
    if (gameLocked) return;
    const next = Math.min(MAX_TIMELINE_GOAL_YEARS, Math.max(MIN_TIMELINE_GOAL_YEARS, Number(nextValue)));
    setGameSettings({ targetYears: next });
  };

  return (
    <motion.main className="app-screen safe-bottom-action sala-lobby relative z-10 mx-auto flex w-full max-w-lg flex-col items-center overflow-y-auto pt-safe-header">
      <MusicNotesBubbles />

      <AnimatePresence>
        {disconnectToast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed top-20 inset-x-0 z-[290] flex justify-center px-5 pointer-events-none"
          >
            <div className="rounded-2xl border border-vinyl-orange/50 bg-vinyl-orange/15 p-3 flex items-center gap-3 max-w-sm w-full">
              <span aria-hidden="true" className="material-symbols-outlined text-vinyl-orange text-2xl shrink-0">wifi_off</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white">{disconnectToast} se desconectó</p>
                <p className="text-xs text-vinyl-orange/80">Tiene 30 segundos para volver antes de quedar fuera.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 h-16 bg-surface/97 border-b border-white/10 flex justify-between items-center px-margin-mobile z-50">
        <button onClick={handleExit} className="min-h-touch text-on-surface-variant hover:text-white transition-colors flex items-center font-label-caps text-xs gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-xl">arrow_back</span> SALIR
        </button>
        <HeaderLogo />
        <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
      </header>

      {/* Host vinyl hero */}
      {role === 'host' && (
        <div className="sala-disco z-10 mb-2 flex w-full flex-col items-center gap-1">
          {/* Más chico (antes hasta 180 px): es decoración y se comía la
              mejor parte de la pantalla, encima del PIN que sí hay que ver. */}
          <div className="relative" style={{ width: 'min(96px, 26vw)', aspectRatio: '1' }}>
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
              style={{ inset: '13%', boxShadow: '0 0 0 5px rgba(0,0,0,0.6), 0 0 0 8px rgba(255,122,26,0.22), 0 0 34px rgba(255,122,26,0.5)' }}
            >
              <img src="/images/logo-main.webp" alt="Dedícalo" className="w-[92%] h-[92%] object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.28)]" draggable={false} />
            </div>
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

      <section className="sala-cuerpo z-10 flex w-full flex-col gap-3 sm:gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            {/* Sin el "RONDA 1" de encima: antes de jugar no aporta nada y
                empujaba el PIN hacia abajo. */}
            <div>
              <h2 className="font-headline-lg-mobile text-2xl font-bold text-on-surface">PIN DE SALA</h2>
            </div>
            {/* Era un icono naranja sobre un fondo al 5%: no se leía como
                botón, y es justo el que abre el código que tienen que
                escanear los demás — la acción más usada del lobby. Ahora
                lleva el verde de marca, borde, etiqueta y respuesta al
                toque. */}
            <button
              onClick={() => { vibrar('toque'); sfx.toque(); setShowQR(true); }}
              className="app-pulsable flex min-h-touch flex-col items-center justify-center gap-0.5 rounded-xl border border-neon-green/45 bg-neon-green/12 px-3 py-2 text-neon-green transition-colors hover:bg-neon-green/20"
              aria-label="Mostrar QR de la sala"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl leading-none">qr_code_scanner</span>
              <span className="app-etiqueta whitespace-nowrap text-micro-caps leading-none">Ver QR</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {pin ? pin.split('').map((char, index) => (
              <motion.div
                key={`${char}-${index}`}
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
                className="flex h-14 select-none items-center justify-center rounded-xl border-2 border-neon-green/35 bg-black/25 font-stats-xl text-3xl text-neon-green shadow-[0_0_16px_rgba(57,255,20,0.15),inset_0_0_10px_rgba(0,0,0,0.3)] sm:h-16 sm:text-4xl"
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
              className="min-h-touch rounded-xl border border-white/10 bg-white/5 text-on-surface-variant font-label-caps text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/10"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">{pinCopied ? 'check' : 'content_copy'}</span>
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
              className="min-h-touch rounded-xl border border-neon-green/25 bg-neon-green/8 text-neon-green font-label-caps text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-neon-green/15"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">{linkShared ? 'check' : 'share'}</span>
              {linkShared ? 'COPIADO' : 'COMPARTIR'}
            </button>
          </div>

          {/* Quién ya entró, sin bajar hasta la lista: el lobby del anfitrión
              es largo y la lista completa queda varias pantallas más abajo. */}
          {role === 'host' && players.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <ul className="flex min-w-0 -space-x-2" aria-label={`${players.length} jugadores en la sala`}>
                {players.slice(0, 8).map((player) => (
                  <li key={player.id} className="shrink-0">
                    {isImageAvatar(player.avatar) ? (
                      <img src={player.avatar} alt={player.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-[#1a1030]" />
                    ) : (
                      <span title={player.name} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg ring-2 ring-[#1a1030]">
                        {player.avatar || '•'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {players.length > 8 && (
                <span className="font-label-caps text-xs text-on-surface-variant tabular-nums">+{players.length - 8}</span>
              )}
            </div>
          )}
        </div>

        {role === 'host' && (
          <div className={`rounded-2xl border p-4 text-left ${
            audioEnTv ? 'border-neon-green/40 bg-neon-green/8' : 'border-white/10 bg-white/5'
          }`}>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={`material-symbols-outlined text-2xl ${audioEnTv ? 'text-neon-green' : 'text-on-surface-variant'}`}>
                tv
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">
                  {audioEnTv ? 'Tele conectada' : 'Jugar en la tele'}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-on-surface-variant">
                  {audioEnTv
                    ? 'La partida y la música se ven y suenan en la pantalla grande.'
                    : 'Abre Dedícalo en la televisión y conecta el código que aparezca.'}
                </p>
              </div>
            </div>
            {!audioEnTv && (
              <button
                type="button"
                onClick={() => setConectandoTv(true)}
                className="mt-3 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-neon-green/40 bg-neon-green/10 font-label-caps text-sm font-black text-neon-green active:scale-[0.98]"
              >
                <span aria-hidden="true" className="material-symbols-outlined">qr_code_scanner</span>
                CONECTAR TELE
              </button>
            )}
          </div>
        )}

        {conectandoTv && <ConectarTv onCerrar={() => setConectandoTv(false)} />}

        {role === 'host' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <p className="font-label-caps text-neon-green text-xs mb-3">{gameLocked ? 'PARTIDA EN CURSO' : 'MODO DE JUEGO'}</p>
            <div className="rounded-2xl border border-vinyl-orange/30 bg-[linear-gradient(135deg,rgba(255,122,26,0.14),rgba(168,85,247,0.12))] p-4 text-left">
              <p className="font-label-caps text-micro-caps text-vinyl-orange tracking-[0.2em]">AÑOS LOCOS</p>
              <h3 className="mt-1 text-lg font-black text-white">{targetYears} canciones para ganar</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Una sola mecánica: escucha, coloca el año y completa tu ruta antes que los demás.
              </p>
              {!gameLocked && (
                <div className="mt-4">
                  <div className="grid grid-cols-5 gap-1.5">
                    {targetOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleTargetYearsChange(option)}
                        className={`min-h-touch rounded-xl border font-label-caps text-xs font-black transition-all active:scale-95 ${
                          targetYears === option
                            ? 'border-neon-green bg-neon-green text-black'
                            : 'border-white/10 bg-black/20 text-white/75'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">12 es recomendado, pero puedes hacer la partida más rápida o más larga.</p>
                </div>
              )}
            </div>

            {!gameLocked && (
              <div className="mt-4">
                <p className="mb-2 font-label-caps text-micro-caps text-vinyl-orange tracking-[0.2em]">ESTILO DE PLAYLIST</p>
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {DEDICALO_PLAYLISTS.map((playlist) => {
                    const meta = PLAYLIST_META[playlist.id] || { icon: 'music_note', color: '#ff7a1a' };
                    const isSelected = playlist.id === selectedPlaylistId;
                    return (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() => hostSetSpotifyPlaylistUrl(playlist.url)}
                        aria-pressed={isSelected}
                        className="flex min-h-touch shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition-all active:scale-95"
                        style={isSelected
                          ? { borderColor: `${meta.color}cc`, backgroundColor: `${meta.color}18` }
                          : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' }}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg" style={{ color: isSelected ? meta.color : 'rgba(255,255,255,0.6)' }}>
                          {meta.icon}
                        </span>
                        {/* La seleccionada no se distingue solo por color (daltonismo,
                            poca luz): lleva además check y peso negro. */}
                        <span
                          className={`whitespace-nowrap font-label-caps text-micro-caps ${isSelected ? 'font-black' : 'font-bold'}`}
                          style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.85)' }}
                        >
                          {playlist.name}
                        </span>
                        {isSelected && (
                          <span aria-hidden="true" className="material-symbols-outlined text-base text-white">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sabotaje: se puede cambiar de opinion hasta que arranca la
                primera ronda. */}
            <div className="mt-4">
              <SabotageSettings
                enabled={sabotageEnabled}
                types={sabotageTypes}
                disabled={gameLocked}
                onChange={(next) => setGameSettings(next)}
              />
            </div>

            {players.length < 2 && (
              <p className="mt-4 rounded-xl border border-vinyl-orange/30 bg-vinyl-orange/8 px-3 py-2 text-xs text-vinyl-orange/90 text-center">
                Comparte el PIN para que se unan jugadores. Puedes empezar cuando estés listo.
              </p>
            )}
            {startError && (
              <p className="mt-3 rounded-xl border border-intense-red/40 bg-intense-red/10 px-3 py-2 text-xs text-intense-red">
                {startError}
              </p>
            )}
          </div>
        )}

        {/* ── INICIAR RONDA, anclado abajo ───────────────────────────────
            Estaba al final del flujo, y el lobby mide unos 2.000 px: PIN,
            televisión, modo, lista, sabotajes y jugadores. Es decir, la única
            acción que hace empezar la partida quedaba a dos pantallas de
            scroll — con toda la mesa esperando.

            Anclada abajo está siempre a un toque, y el hueco lo reserva solo
            `useBarraInferior` gracias a la clase `barra-inferior`. Al girar,
            pasa al carril vertical del borde derecho.
        ─────────────────────────────────────────────────────────────────── */}
        {role === 'host' && (
          <div className="barra-inferior accion-lobby fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/97 px-4 pt-3"
               style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            {/* El botón más importante del lobby era el más plano de la app.
                Ahora usa `btn-primario`, el mismo estilo que los demás
                botones principales del juego (se hunde al pulsarlo). Sin
                app-pulsable: su scale() pelearía con el translate del hundido. */}
            <button
              data-accion="principal"
              onClick={handleHostStartGame}
              className="btn-primario mx-auto flex w-full max-w-lg items-center justify-center gap-2"
            >
              <span aria-hidden="true" className="material-symbols-outlined">play_arrow</span>
              INICIAR RONDA
            </button>
          </div>
        )}

        {role !== 'host' && (
          <div className="w-full h-12 bg-white/5 text-on-surface-variant font-label-caps text-label-caps rounded-xl flex items-center justify-center border border-white/10">
            ESPERANDO AL ANFITRIÓN...
          </div>
        )}
      </section>

      <section className="z-10 mt-6 w-full sm:mt-8">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10" />
          <span className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">JUGADORES ({players.length})</span>
          <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-white/10" />
        </div>

        <div className="flex flex-col gap-3">
          {players.length === 0 && <p className="text-center text-on-surface-variant text-sm">No hay jugadores aún.</p>}
          {players.map((player, index) => {
            const presence = getPlayerPresence(player, now);
            const seconds = Math.ceil((presence.remainingMs || 0) / 1000);
            return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, type: 'spring', stiffness: 180 }}
              className={`rounded-xl border p-3.5 transition-colors hover:border-white/20 sm:p-4 ${
                presence.status === 'kicked'
                  ? 'border-white/8 bg-white/[0.03] opacity-55'
                  : presence.status === 'reconnecting'
                    ? 'border-chaos-gold/35 bg-chaos-gold/8'
                    : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* #n y puntos solo con la partida ya en marcha: antes de
                      empezar, un ranking de todos en cero es ruido. */}
                  {gameLocked && (
                    <span className="w-6 text-center font-label-caps text-xs text-on-surface-variant">#{index + 1}</span>
                  )}
                  {/* w-16 y no 5.5rem: con la letra XL el avatar se comía la
                      fila y el nombre chocaba con la columna derecha. */}
                  {isImageAvatar(player.avatar) ? (
                    <img src={player.avatar} alt={player.name} className="w-16 h-16 rounded-full object-cover border-2 border-electric-purple/60 shadow-[0_0_14px_rgba(168,85,247,0.35)] shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl bg-white/10 border border-white/10 shrink-0">
                      {player.avatar || '•'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate font-label-caps text-xl font-black uppercase tracking-wide text-white">{player.name}</span>
                    <span className={`mt-0.5 block truncate font-label-caps text-micro-caps ${
                      presence.status === 'online'
                        ? 'text-neon-green'
                        : presence.status === 'reconnecting'
                          ? 'text-chaos-gold'
                          : 'text-on-surface-variant'
                    }`}>
                      {presence.status === 'online'
                        ? 'CONECTADO'
                        : presence.status === 'reconnecting'
                          ? `RECONECTANDO ${seconds}s`
                          : 'FUERA'}
                    </span>
                  </div>
                </div>
                {gameLocked && (
                  <div className="text-right shrink-0 pl-2">
                    <p className="font-black text-neon-green drop-shadow-[0_0_8px_rgba(57,255,20,0.4)] leading-none">
                      {getTimelineProgress(player)}<span className="text-xs text-on-surface-variant">/{targetYears}</span>
                    </p>
                    <p className="mt-1 text-micro-caps text-on-surface-variant leading-none">{player.points} pts</p>
                  </div>
                )}
              </div>
              <TimelineYears years={getCombinedTimelineYears(player)} wildcards={Number(player.wildcards || 0)} goalYears={targetYears} glow className={gameLocked ? 'pl-0 sm:pl-9' : 'pl-0'} />
            </motion.div>
          );})}
        </div>
      </section>

      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 px-margin-mobile"
            onClick={() => setShowQR(false)}
          >
            {/* TARJETA BLANCA, no oscura, y a propósito.
                Esto se levanta en alto para que OTRA persona lo escanee, así
                que manda la cámara de enfrente, no la estética de la app:
                una pantalla casi toda blanca sale mucho más brillante que una
                oscura con un cuadrito blanco, y es lo que decide si la cámara
                engancha el código o no en una habitación con poca luz.
                Y ocupa casi todo el ancho: antes eran 12rem —unos 200 px— en
                mitad de una pantalla negra. */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="app-etiqueta text-xs text-black/50">Escanea para unirte</h3>

              <CodigoQr
                valor={`${window.location.origin}/guest/join?pin=${pin}`}
                tam="min(72vw, 20rem)"
                alt="Código QR para unirse a la sala"
              />

              <div className="text-center">
                <p className="app-etiqueta text-micro-caps text-black/60">o escribe este PIN</p>
                {/* selectable: es lo único de la app que la gente necesita
                    copiar de verdad, y el bloqueo global de selección lo
                    habría dejado sin poder copiarse. */}
                <p className="app-cifra selectable mt-1 text-5xl tracking-[0.2em] text-black">{pin}</p>
              </div>

              <button
                onClick={() => setShowQR(false)}
                className="app-pulsable mt-1 w-full rounded-2xl bg-black/8 py-3 app-etiqueta text-xs text-black/70"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}

        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/92 px-4 pb-4 sm:pb-0"
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
              <span aria-hidden="true" className="material-symbols-outlined text-intense-red" style={{ fontSize: '2.5rem' }}>logout</span>
              <h3 className="mt-3 font-headline-lg text-xl font-black text-white">
                {role === 'host' ? '¿Cerrar la sala' : '¿Salir de la sala'}
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

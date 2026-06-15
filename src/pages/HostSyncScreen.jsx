import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { DEDICALO_PLAYLISTS, useGameStore } from '../store/useGameStore';
import { auth, googleProvider } from '../firebase';
import VinylVisualizer from '../components/VinylVisualizer';
import NeonButton from '../components/NeonButton';
import {
  connectSpotify,
  explainSpotifyError,
  getSpotifyDiagnostics,
  getSpotifyStatus,
  pauseSpotifyPlayback,
  startRandomPlaylistTrack
} from '../services/spotify';

const PLAYLIST_META = {
  'reggaeton-historia':     { icon: 'whatshot',              color: '#ff5500' },
  'hits-todos-los-tiempos': { icon: 'public',                color: '#00c8ff' },
  'rock-latino':            { icon: 'electric_bolt',         color: '#ffd000' },
  'mix-latino':             { icon: 'shuffle',               color: '#aa44ff' },
  'bailable':               { icon: 'nightlife',             color: '#ff44aa' },
  'romanticos':             { icon: 'favorite',              color: '#ff4466' },
  'perreo-clasico':         { icon: 'local_fire_department', color: '#ff2222' },
  'temazos-espanoles':      { icon: 'stadium',               color: '#ffaa00' },
  'rock-ska-espanolisimo':  { icon: 'music_note',            color: '#00dd88' },
  'de-to2':                 { icon: 'apps',                  color: '#6655ff' },
  'fiestas-en-el-pueblo':   { icon: 'celebration',           color: '#dd44ff' },
  'just-go':                { icon: 'rocket_launch',         color: '#00ddff' },
};

export default function HostSyncScreen() {
  const navigate = useNavigate();
  const { hostCreateRoom, setSpotifyPlaylistUrl } = useGameStore((state) => ({
    hostCreateRoom: state.hostCreateRoom,
    setSpotifyPlaylistUrl: state.setSpotifyPlaylistUrl,
  }));

  const [googleUser, setGoogleUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(DEDICALO_PLAYLISTS[0].id);
  const [spotifyStatus, setSpotifyStatus] = useState(() => getSpotifyStatus());
  const [spotifyCheck, setSpotifyCheck] = useState(null);
  const [isTestingSpotify, setIsTestingSpotify] = useState(false);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const createStartedRef = useRef(false);

  const selectedPlaylistData = DEDICALO_PLAYLISTS.find((p) => p.id === selectedPlaylist) || DEDICALO_PLAYLISTS[0];
  const selectedMeta = PLAYLIST_META[selectedPlaylist] || { icon: 'music_note', color: '#ff7a1a' };
  const canCreateRoom = Boolean(googleUser && spotifyStatus.connected && selectedPlaylistData);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setGoogleUser(user); setAuthStatus('idle'); setAuthMessage(''); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) { setGoogleUser(result.user); setAuthStatus('idle'); setAuthMessage(''); }
      })
      .catch((err) => console.warn('Google redirect result error', err));
  }, []);

  useEffect(() => {
    const onFocus = () => setSpotifyStatus(getSpotifyStatus());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleGoogleLogin = async () => {
    setAuthStatus('loading');
    setAuthMessage('Abriendo Google...');
    try {
      const useRedirect = window.matchMedia('(max-width: 900px)').matches
        || /FBAN|FBAV|Instagram|wv|WebView/i.test(navigator.userAgent);
      if (useRedirect) { await signInWithRedirect(auth, googleProvider); return; }
      const result = await signInWithPopup(auth, googleProvider);
      setGoogleUser(result.user);
      setAuthStatus('idle');
      setAuthMessage('');
    } catch (error) {
      const msg = {
        'auth/unauthorized-domain': 'No pudimos abrir Google en este dominio.',
        'auth/popup-blocked': 'El navegador bloqueó la ventana. Usando redirección...',
        'auth/popup-closed-by-user': 'Se cerró Google antes de terminar.',
      };
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try { await signInWithRedirect(auth, googleProvider); return; } catch {}
      }
      setAuthStatus('error');
      setAuthMessage(msg[error.code] || 'No se pudo abrir Google. Inténtalo de nuevo.');
    }
  };

  const handleHostCreate = async () => {
    if (!canCreateRoom || createStartedRef.current) return;
    createStartedRef.current = true;
    setIsCreating(true);
    if (isSpotifyPlaying) {
      await pauseSpotifyPlayback().catch(() => {});
      setIsSpotifyPlaying(false);
    }
    try {
      setSpotifyPlaylistUrl(selectedPlaylistData.url);
      await hostCreateRoom(googleUser);
      navigate('/lobby');
    } catch (error) {
      setSpotifyCheck({ type: 'error', message: error.message || 'No se pudo crear la sala. Inténtalo otra vez.' });
      createStartedRef.current = false;
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleSpotify = async () => {
    if (isSpotifyPlaying) {
      await pauseSpotifyPlayback().catch(() => {});
      setIsSpotifyPlaying(false);
      setSpotifyCheck({ type: 'info', message: 'Música pausada.' });
      return;
    }
    setIsTestingSpotify(true);
    setSpotifyCheck({ type: 'info', message: 'Conectando con Spotify...' });
    try {
      const diagnostic = await getSpotifyDiagnostics();
      if (!diagnostic.ok) {
        setSpotifyCheck({ type: 'error', message: diagnostic.message });
        return;
      }
      await startRandomPlaylistTrack(selectedPlaylistData.url);
      setIsSpotifyPlaying(true);
      setSpotifyCheck({ type: 'success', message: '¡Suena! Toca el botón para parar.' });
    } catch (error) {
      setSpotifyCheck({ type: 'error', message: explainSpotifyError(error) });
    } finally {
      setIsTestingSpotify(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="relative z-10 w-full min-h-screen px-4 md:px-8 lg:px-16 pt-20 pb-12"
    >
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/8 flex justify-between items-center px-4 md:px-8 h-16">
        <button
          onClick={() => navigate('/role-selection')}
          className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
        <h1 className="font-headline-xl text-2xl italic tracking-tighter text-electric-purple select-none">
          ANFITRIÓN
        </h1>
        <div className="w-8 h-8 rounded-full border-2 border-electric-purple overflow-hidden flex items-center justify-center bg-electric-purple/20">
          {googleUser?.photoURL
            ? <img src={googleUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            : <span className="material-symbols-outlined text-sm text-electric-purple">headphones</span>}
        </div>
      </header>

      {/* ── Page body — responsive 2-col when logged in ── */}
      <div className={`w-full max-w-6xl mx-auto flex ${googleUser ? 'flex-col md:flex-row md:items-start gap-8 md:gap-10' : 'flex-col items-center'}`}>

        {/* ── LEFT: auth + Spotify ── */}
        <div className={`flex flex-col items-center gap-5 ${googleUser ? 'w-full md:w-80 lg:w-96 md:self-start md:sticky md:top-24' : 'w-full max-w-sm'}`}>

          <div className="mt-1">
            <VinylVisualizer rotating={spotifyStatus.connected} size="compact" logoSrc="/images/icon-app.png" />
          </div>

          <div className="text-center">
            <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">CREA SALA</p>
            <h2 className="mt-2 font-headline-lg text-2xl md:text-3xl font-black text-on-surface leading-tight">
              Tú mandas la música y también juegas
            </h2>
            <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
              Elige una lista, comparte el PIN y responde como todos.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">

            {/* Google */}
            {!googleUser ? (
              <NeonButton
                color="white"
                onClick={handleGoogleLogin}
                disabled={authStatus === 'loading'}
                icon={<span className="material-symbols-outlined font-bold">login</span>}
              >
                {authStatus === 'loading' ? 'CONECTANDO...' : 'ENTRAR CON GOOGLE'}
              </NeonButton>
            ) : (
              <div className="rounded-2xl border border-vinyl-orange/30 bg-vinyl-orange/10 px-4 py-3 flex items-center justify-center gap-2 font-bold text-sm text-white">
                <span className="material-symbols-outlined text-vinyl-orange text-lg">check_circle</span>
                {googleUser.displayName?.split(' ')[0] || 'Google'} listo
              </div>
            )}
            {authMessage && (
              <p className={`text-xs text-center leading-relaxed ${authStatus === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
                {authMessage}
              </p>
            )}

            {/* Spotify */}
            {googleUser && (
              <div className="rounded-2xl border border-white/10 bg-surface-container/70 p-5 text-center">
                <p className="font-label-caps text-neon-green text-[10px] tracking-[0.22em] mb-3">SPOTIFY PREMIUM</p>

                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {spotifyStatus.connected ? 'Cuenta conectada' : 'Conecta tu cuenta'}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Solo el anfitrión necesita Premium.</p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={connectSpotify}
                    whileTap={{ scale: 0.94 }}
                    className={`h-9 px-3 rounded-xl font-label-caps text-[10px] tracking-[0.15em] shrink-0 ${
                      spotifyStatus.connected
                        ? 'border border-white/15 bg-white/5 text-on-surface-variant'
                        : 'bg-vinyl-orange text-black font-bold'
                    }`}
                  >
                    {spotifyStatus.connected ? 'RECONECTAR' : 'CONECTAR'}
                  </motion.button>
                </div>

                {/* Single CD/vinyl toggle button */}
                {spotifyStatus.connected && (
                  <div className="flex flex-col items-center gap-3">
                    <motion.button
                      type="button"
                      onClick={handleToggleSpotify}
                      disabled={isTestingSpotify}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.06 }}
                      aria-label={isSpotifyPlaying ? 'Parar música de prueba' : 'Probar música'}
                      className="relative w-24 h-24 rounded-full flex items-center justify-center disabled:opacity-50"
                      style={{
                        background: 'repeating-radial-gradient(circle, #060606 0 3px, #111 4px 5px, #060606 6px 9px)',
                        boxShadow: isSpotifyPlaying
                          ? `0 0 0 2px #ff7a1a55, 0 0 36px #ff7a1a55`
                          : `0 0 0 2px rgba(255,255,255,0.08), 0 8px 28px rgba(0,0,0,0.7)`,
                      }}
                    >
                      {/* Spinning outer ring when playing */}
                      {isSpotifyPlaying && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,122,26,0.25) 8%, rgba(255,122,26,0.06) 16%, transparent 24%)',
                          }}
                        />
                      )}
                      {/* Centre label disc */}
                      <div
                        className="absolute rounded-full flex items-center justify-center"
                        style={{
                          inset: '28%',
                          background: isSpotifyPlaying ? '#ff7a1a' : 'rgba(255,122,26,0.15)',
                          border: `2px solid ${isSpotifyPlaying ? '#ff7a1a' : 'rgba(255,122,26,0.35)'}`,
                          transition: 'background 0.3s, border-color 0.3s',
                        }}
                      />
                      {/* Spindle hole */}
                      <div className="absolute w-2 h-2 rounded-full bg-black z-10" />
                      {/* Icon overlay */}
                      <span
                        className="relative z-20 material-symbols-outlined"
                        style={{ fontSize: '2rem', color: isSpotifyPlaying ? '#000' : '#ff7a1a' }}
                      >
                        {isTestingSpotify ? 'hourglass_empty' : isSpotifyPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </motion.button>

                    <p className="font-label-caps text-[10px] text-on-surface-variant tracking-[0.2em]">
                      {isTestingSpotify
                        ? 'CONECTANDO...'
                        : isSpotifyPlaying
                          ? 'SONANDO · TOCA PARA PARAR'
                          : 'PROBAR SONIDO'}
                    </p>
                  </div>
                )}

                {spotifyCheck && (
                  <p className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                    spotifyCheck.type === 'success'
                      ? 'border-vinyl-orange/40 bg-vinyl-orange/10 text-white'
                      : spotifyCheck.type === 'error'
                        ? 'border-intense-red/40 bg-intense-red/10 text-intense-red'
                        : 'border-white/10 bg-black/15 text-on-surface-variant'
                  }`}>
                    {spotifyCheck.message}
                  </p>
                )}
              </div>
            )}

            {/* Create Room */}
            {googleUser && (
              <motion.button
                type="button"
                onClick={handleHostCreate}
                disabled={isCreating || !canCreateRoom}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
                className="w-full h-14 border-2 border-electric-purple/50 rounded-2xl flex items-center justify-center gap-2 text-white font-label-caps text-sm uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-purple/10 transition-colors bg-transparent"
              >
                {isCreating
                  ? 'CREANDO SALA...'
                  : !spotifyStatus.connected
                    ? 'CONECTA SPOTIFY PRIMERO'
                    : <>CREAR SALA <span className="material-symbols-outlined text-base">arrow_forward</span></>}
              </motion.button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Playlist grid ── */}
        {googleUser && (
          <div className="flex-1 min-w-0">
            {/* Section header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="font-label-caps text-xs tracking-[0.22em] text-neon-green">ELIGE EL ESTILO</p>
                <p className="mt-0.5 text-sm text-on-surface-variant">Toca una tarjeta para jugar con esa vibe.</p>
              </div>
              <div
                className="h-9 px-3 rounded-xl flex items-center gap-2 font-label-caps text-[11px] text-white border shrink-0"
                style={{
                  backgroundColor: `${selectedMeta.color}18`,
                  borderColor: `${selectedMeta.color}44`,
                }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: selectedMeta.color }}>
                  {selectedMeta.icon}
                </span>
                {selectedPlaylistData.name}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {DEDICALO_PLAYLISTS.map((playlist) => {
                const meta = PLAYLIST_META[playlist.id] || { icon: 'music_note', color: '#ff7a1a' };
                const isSelected = playlist.id === selectedPlaylist;

                return (
                  <motion.button
                    key={playlist.id}
                    type="button"
                    onClick={() => setSelectedPlaylist(playlist.id)}
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="relative min-h-[130px] rounded-2xl border p-4 text-left flex flex-col justify-between overflow-hidden transition-all duration-200"
                    style={{
                      borderColor: isSelected ? meta.color : 'rgba(255,255,255,0.09)',
                      backgroundColor: isSelected ? `${meta.color}15` : 'rgba(0,0,0,0.20)',
                      boxShadow: isSelected ? `0 0 28px ${meta.color}22, inset 0 0 20px ${meta.color}06` : 'none',
                    }}
                  >
                    {/* Big icon */}
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '2.6rem',
                        color: meta.color,
                        opacity: isSelected ? 1 : 0.65,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {meta.icon}
                    </span>

                    {/* Name + mood */}
                    <div className="mt-2">
                      <p
                        className="font-label-caps text-[11px] font-black tracking-[0.14em] leading-snug"
                        style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.82)' }}
                      >
                        {playlist.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-on-surface-variant leading-snug">
                        {playlist.mood}
                      </p>
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: meta.color }}
                      >
                        <span className="material-symbols-outlined text-black" style={{ fontSize: '12px', lineHeight: 1 }}>
                          check
                        </span>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Selected summary bar */}
            <div
              className="mt-4 rounded-2xl border px-4 py-3 flex items-center gap-3"
              style={{
                borderColor: `${selectedMeta.color}35`,
                backgroundColor: `${selectedMeta.color}0d`,
              }}
            >
              <span
                className="material-symbols-outlined text-2xl shrink-0"
                style={{ color: selectedMeta.color }}
              >
                {selectedMeta.icon}
              </span>
              <div className="min-w-0">
                <p className="font-label-caps text-[10px] text-on-surface-variant tracking-widest">SELECCIONADO</p>
                <p className="text-sm font-black text-white uppercase mt-0.5">{selectedPlaylistData.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{selectedPlaylistData.mood}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.main>
  );
}

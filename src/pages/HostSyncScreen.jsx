import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { DEDICALO_PLAYLISTS, useGameStore } from '../store/useGameStore';
import { auth, authReady, googleProvider } from '../firebase';
import VinylVisualizer from '../components/VinylVisualizer';
import NeonButton from '../components/NeonButton';
import ProfileMenu from '../components/ProfileMenu';
import {
  connectSpotify,
  explainSpotifyError,
  getSpotifyDiagnostics,
  getSpotifyStatus,
  pauseSpotifyPlayback,
  preWarmSpotifyPlayer,
  prepareSpotifyPlayback,
  startRandomPlaylistTrack
} from '../services/spotify';

const PLAYLIST_META = {
  'reggaeton-historia':     { icon: 'whatshot',              color: '#ff5500' },
  'hits-todos-los-tiempos': { icon: 'public',                color: '#00c8ff' },
  'rock-latino':            { icon: 'electric_bolt',         color: '#ffd000' },
  'mix-latino':             { icon: 'shuffle',               color: '#aa44ff' },
  'bailable-todos-los-tiempos': { icon: 'nightlife',           color: '#ff44aa' },
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
      if (user) {
        setGoogleUser(user);
        setAuthStatus('idle');
        setAuthMessage('');
      } else {
        setGoogleUser(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const redirectIntent = localStorage.getItem('auth_redirect_intent');
    const intentTime = Number(localStorage.getItem('auth_redirect_intent_time') || 0);
    const hasFreshRedirectIntent = Boolean(redirectIntent) && Date.now() - intentTime < 10 * 60 * 1000;

    authReady.then(() => getRedirectResult(auth))
      .then((result) => {
        if (result?.user) {
          setGoogleUser(result.user);
          setAuthStatus('idle');
          setAuthMessage('');
          return;
        }

        if (hasFreshRedirectIntent && !auth.currentUser) {
          localStorage.removeItem('auth_redirect_intent');
          localStorage.removeItem('auth_redirect_intent_time');
          setAuthStatus('error');
          setAuthMessage('Google volvió sin completar el acceso. Inténtalo otra vez.');
        }
      })
      .catch((err) => {
        console.warn('Google redirect result error', err);
        const code = err?.code || '';
        // Only surface errors the user must act on — don't let transient errors
        // overwrite an already-valid login state set by onAuthStateChanged.
        if (code === 'auth/unauthorized-domain') {
          setAuthStatus('error');
          setAuthMessage('Google todavía no permite entrar desde este dominio. Avísanos y vuelve a intentarlo.');
        } else if (code === 'auth/account-exists-with-different-credential') {
          setAuthStatus('error');
          setAuthMessage('Ya existe una cuenta con ese correo con otro proveedor.');
        }
        // All other errors: log only — onAuthStateChanged will set the correct state.
      });
  }, []);

  useEffect(() => {
    const onFocus = () => setSpotifyStatus(getSpotifyStatus());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Pre-warm Spotify SDK so activateElement() fires instantly on user click
  useEffect(() => {
    if (!spotifyStatus.connected) return;
    preWarmSpotifyPlayer();
  }, [spotifyStatus.connected]);

  const handleGoogleLogin = async () => {
    setAuthStatus('loading');
    setAuthMessage('');

    try {
      await authReady;
      localStorage.removeItem('auth_redirect_intent');
      localStorage.removeItem('auth_redirect_intent_time');

      const result = await signInWithPopup(auth, googleProvider);
      setGoogleUser(result.user);
      setAuthStatus('idle');
    } catch (loginError) {
      let error = loginError;
      const fallbackToRedirect = [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
      ].includes(error.code);

      if (fallbackToRedirect) {
        try {
          localStorage.setItem('auth_redirect_intent', '/host/sync');
          localStorage.setItem('auth_redirect_intent_time', String(Date.now()));
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          error = redirectError;
        }
      }

      const msg = {
        'auth/unauthorized-domain': 'Google todavía no permite entrar desde este dominio.',
        'auth/popup-closed-by-user': 'Se cerró Google antes de terminar. Inténtalo de nuevo.',
      };
      setAuthStatus('error');
      setAuthMessage(msg[error.code] || 'No pudimos entrar con Google. Inténtalo de nuevo.');
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
      // activateElement() debe ejecutarse dentro de la gestura del usuario o móvil bloquea el audio
      await prepareSpotifyPlayback();
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
      // Refresh connection state — if invalid_grant occurred, the token was
      // discarded and the UI must reflect "not connected" immediately.
      setSpotifyStatus(getSpotifyStatus());
    } finally {
      setIsTestingSpotify(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="relative z-10 w-full min-h-screen px-4 md:px-8 lg:px-16 pt-safe-header pb-28"
    >
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
        {googleUser && <ProfileMenu user={googleUser} />}
      </header>

            <div className={`w-full max-w-6xl mx-auto flex ${googleUser ? 'flex-col md:flex-row md:items-start gap-8 md:gap-10' : 'flex-col items-center'}`}>

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

                                {spotifyStatus.connected && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative flex items-center justify-center">
                                            <div
                        className="absolute rounded-full pointer-events-none transition-all duration-500"
                        style={{
                          inset: '-16px',
                          background: isSpotifyPlaying
                            ? 'radial-gradient(circle, rgba(255,122,26,0.35) 0%, transparent 65%)'
                            : 'radial-gradient(circle, rgba(0,0,0,0.55) 0%, transparent 65%)',
                          filter: 'blur(12px)',
                          transform: 'translateY(8px)',
                        }}
                      />
                      <motion.button
                        type="button"
                        onClick={handleToggleSpotify}
                        disabled={isTestingSpotify}
                        whileHover={!isTestingSpotify ? { scale: 1.06, y: -2 } : {}}
                        whileTap={!isTestingSpotify ? { scale: 0.95, y: 5 } : {}}
                        aria-label={isSpotifyPlaying ? 'Parar música de prueba' : 'Probar música'}
                        className="relative w-24 h-24 rounded-full flex items-center justify-center disabled:opacity-50 select-none"
                        style={{
                          background: 'repeating-radial-gradient(circle, #060606 0 3px, #111 4px 5px, #060606 6px 9px)',
                          boxShadow: isSpotifyPlaying
                            ? [
                                '0 0 0 2px #ff7a1a66',
                                '0 0 28px #ff7a1a66',
                                '0 6px 0 #1a0800',
                                '0 10px 30px rgba(0,0,0,0.9)',
                                'inset 0 1px 0 rgba(255,255,255,0.07)',
                              ].join(', ')
                            : [
                                '0 0 0 1px rgba(255,255,255,0.07)',
                                '0 6px 0 #050505',
                                '0 10px 30px rgba(0,0,0,0.9)',
                                'inset 0 1px 0 rgba(255,255,255,0.05)',
                              ].join(', '),
                          transition: 'box-shadow 0.3s',
                        }}
                      >
                                                {isSpotifyPlaying && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,122,26,0.25) 8%, rgba(255,122,26,0.06) 16%, transparent 24%)',
                            }}
                          />
                        )}
                                                <div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, transparent 45%)',
                          }}
                        />
                                                <div
                          className="absolute rounded-full"
                          style={{
                            inset: '28%',
                            background: isSpotifyPlaying ? '#ff7a1a' : 'rgba(255,122,26,0.15)',
                            border: `2px solid ${isSpotifyPlaying ? '#ff9a40' : 'rgba(255,122,26,0.35)'}`,
                            boxShadow: isSpotifyPlaying
                              ? '0 0 10px rgba(255,122,26,0.8), inset 0 1px 0 rgba(255,255,255,0.3)'
                              : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                            transition: 'all 0.3s',
                          }}
                        />
                                                <div className="absolute w-2 h-2 rounded-full bg-black z-10" />
                                                <span
                          className="relative z-20 material-symbols-outlined"
                          style={{
                            fontSize: '2rem',
                            color: isSpotifyPlaying ? '#000' : '#ff7a1a',
                            textShadow: isSpotifyPlaying ? 'none' : '0 0 12px rgba(255,122,26,0.5)',
                          }}
                        >
                          {isTestingSpotify ? 'hourglass_empty' : isSpotifyPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </motion.button>
                    </div>

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

                {googleUser && (
          <div className="flex-1 min-w-0">
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

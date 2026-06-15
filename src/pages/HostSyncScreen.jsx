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

export default function HostSyncScreen() {
  const navigate = useNavigate();
  const { hostCreateRoom, setSpotifyPlaylistUrl } = useGameStore((state) => ({
    hostCreateRoom: state.hostCreateRoom,
    setSpotifyPlaylistUrl: state.setSpotifyPlaylistUrl
  }));
  const [googleUser, setGoogleUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(DEDICALO_PLAYLISTS[0].id);
  const [spotifyStatus, setSpotifyStatus] = useState(() => getSpotifyStatus());
  const [spotifyCheck, setSpotifyCheck] = useState(null);
  const [isTestingSpotify, setIsTestingSpotify] = useState(false);
  const createStartedRef = useRef(false);

  const selectedCuratedPlaylist = DEDICALO_PLAYLISTS.find((playlist) => playlist.id === selectedPlaylist) || DEDICALO_PLAYLISTS[0];
  const canCreateRoom = Boolean(googleUser && spotifyStatus.connected && selectedCuratedPlaylist);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setGoogleUser(user);
        setAuthStatus('idle');
        setAuthMessage('');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setGoogleUser(result.user);
          setAuthStatus('idle');
          setAuthMessage('');
        }
      })
      .catch((error) => {
        console.warn('Google redirect result error', error);
      });
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
      const useRedirect = window.matchMedia('(max-width: 900px)').matches || /FBAN|FBAV|Instagram|wv|WebView/i.test(navigator.userAgent);
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      setGoogleUser(result.user);
      setAuthStatus('idle');
      setAuthMessage('');
    } catch (error) {
      console.error('Google popup error', error);
      const messageByCode = {
        'auth/unauthorized-domain': 'No pudimos abrir Google en este dominio. Avisanos y lo dejamos listo.',
        'auth/operation-not-allowed': 'Google no está disponible ahora. Prueba otra vez en un momento.',
        'auth/popup-blocked': 'El navegador bloqueó la ventana. Vamos a usar la redirección.',
        'auth/popup-closed-by-user': 'Se cerró Google antes de terminar.'
      };

      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error('Google redirect error', redirectError);
        }
      }

      setAuthStatus('error');
      setAuthMessage(messageByCode[error.code] || 'No se pudo abrir Google. Inténtalo de nuevo.');
    }
  };

  const handleHostCreate = async () => {
    if (!canCreateRoom || createStartedRef.current) return;
    createStartedRef.current = true;
    setIsCreating(true);

    try {
      setSpotifyPlaylistUrl(selectedCuratedPlaylist.url);
      await hostCreateRoom(googleUser);
      navigate('/lobby');
    } catch (error) {
      setSpotifyCheck({ type: 'error', message: error.message || 'No se pudo crear la sala. Inténtalo otra vez.' });
      createStartedRef.current = false;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCheckSpotify = async () => {
    setIsTestingSpotify(true);
    setSpotifyCheck({ type: 'info', message: 'Probando sonido...' });

    try {
      const diagnostic = await getSpotifyDiagnostics();
      if (!diagnostic.ok) {
        setSpotifyCheck({ type: 'error', message: diagnostic.message });
        return;
      }

      await startRandomPlaylistTrack(selectedCuratedPlaylist.url);
      setSpotifyCheck({
        type: 'success',
        message: 'Suena bien. El anfitrión controla la música y también juega.'
      });
    } catch (error) {
      setSpotifyCheck({ type: 'error', message: explainSpotifyError(error) });
    } finally {
      setIsTestingSpotify(false);
    }
  };

  const handleStopSpotifyTest = async () => {
    await pauseSpotifyPlayback().catch((error) => console.warn('No se pudo parar Spotify:', error));
    setSpotifyCheck({ type: 'info', message: 'Música pausada.' });
  };

  return (
    <motion.main
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col items-center px-margin-mobile gap-6 pt-20 pb-10 box-border overflow-x-hidden text-center"
    >
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/78 backdrop-blur-xl border-b border-white/8 flex justify-between items-center px-margin-mobile h-16 box-border">
        <button
          onClick={() => navigate('/role-selection')}
          className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
        <h1 className="font-headline-xl text-2xl italic tracking-tighter text-electric-purple leading-none select-none">
          ANFITRIÓN
        </h1>
        <div className="w-8 h-8 rounded-full border-2 border-electric-purple overflow-hidden flex items-center justify-center bg-electric-purple/20">
          {googleUser?.photoURL ? (
            <img src={googleUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-sm text-electric-purple">headphones</span>
          )}
        </div>
      </header>

      <div className="mt-1">
        <VinylVisualizer rotating={spotifyStatus.connected} size="compact" logoSrc="/images/icon-app.png" />
      </div>

      <section className="w-full max-w-sm flex flex-col items-center">
        <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">CREA SALA</p>
        <h2 className="mt-2 font-headline-lg text-3xl font-black text-on-surface leading-tight">
          Tú mandas la música y también juegas
        </h2>
        <p className="text-on-surface-variant text-sm mt-3 mb-6 font-body-md leading-relaxed">
          Elige una lista, comparte el PIN y responde como todos.
        </p>

        <div className="w-full space-y-4">
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
            <div className="rounded-[1.5rem] border border-vinyl-orange/30 bg-vinyl-orange/10 text-white px-4 py-4 flex items-center justify-center gap-2 font-bold text-sm">
              <span className="material-symbols-outlined text-vinyl-orange">check_circle</span>
              GOOGLE LISTO
            </div>
          )}

          {authMessage && (
            <p className={`text-xs leading-relaxed ${authStatus === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
              {authMessage}
            </p>
          )}

          {googleUser && (
            <section className="rounded-[1.75rem] border border-white/10 bg-surface-container/72 p-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="text-xs text-neon-green font-label-caps mb-2 tracking-[0.22em]">SPOTIFY</p>
              <div className="flex flex-col items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{spotifyStatus.connected ? 'LISTO PARA SONAR' : 'CONECTA TU CUENTA'}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Solo el anfitrión necesita Spotify Premium.</p>
                </div>
                <motion.button
                  type="button"
                  onClick={connectSpotify}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.03 }}
                  className="h-10 px-4 rounded-xl bg-vinyl-orange text-black font-label-caps text-[10px] tracking-[0.2em] shrink-0"
                >
                  {spotifyStatus.connected ? 'RECONECTAR' : 'CONECTAR'}
                </motion.button>
              </div>
              {spotifyStatus.connected && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    onClick={handleCheckSpotify}
                    disabled={isTestingSpotify}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02 }}
                    className="h-10 rounded-xl border border-vinyl-orange/40 bg-vinyl-orange/10 text-white font-label-caps text-[10px] tracking-[0.2em] disabled:opacity-50"
                  >
                    {isTestingSpotify ? 'PROBANDO...' : 'PROBAR'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleStopSpotifyTest}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02 }}
                    className="h-10 rounded-xl border border-white/10 bg-black/15 text-white font-label-caps text-[10px] tracking-[0.2em]"
                  >
                    PARAR
                  </motion.button>
                </div>
              )}
              {spotifyCheck && (
                <p
                  className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                    spotifyCheck.type === 'success'
                      ? 'border-vinyl-orange/40 bg-vinyl-orange/10 text-white'
                      : spotifyCheck.type === 'error'
                        ? 'border-intense-red/40 bg-intense-red/10 text-intense-red'
                        : 'border-white/10 bg-black/15 text-on-surface-variant'
                  }`}
                >
                  {spotifyCheck.message}
                </p>
              )}
            </section>
          )}

          {googleUser && (
            <section className="rounded-[1.75rem] border border-white/10 bg-surface-container/72 p-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-xs text-neon-green font-label-caps tracking-[0.22em]">ELIGE ESTILO</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant">Toca una tarjeta para jugar.</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full border border-vinyl-orange/30 bg-vinyl-orange/10 text-xl">
                  {selectedCuratedPlaylist.icon}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center" role="listbox" aria-label="Estilos disponibles">
                {DEDICALO_PLAYLISTS.map((playlist) => {
                  const isSelected = playlist.id === selectedPlaylist;

                  return (
                    <motion.button
                      key={playlist.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelectedPlaylist(playlist.id)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      className={`min-h-[82px] rounded-[1.4rem] border p-3 text-center transition-all duration-200 ${
                        isSelected
                          ? 'border-vinyl-orange bg-vinyl-orange/14 shadow-[0_0_22px_rgba(255,122,26,0.18)]'
                          : 'border-white/10 bg-black/16 hover:border-electric-purple/60 hover:bg-electric-purple/10'
                      }`}
                    >
                      <span className="flex flex-col items-center justify-center gap-1">
                        <span className="text-lg leading-none">{playlist.icon}</span>
                        <span
                          className={`font-label-caps text-[11px] leading-tight tracking-[0.18em] ${
                            isSelected ? 'text-white' : 'text-on-surface'
                          }`}
                        >
                          {playlist.name.toUpperCase()}
                        </span>
                      </span>
                      {isSelected && (
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white justify-center">
                          <span className="material-symbols-outlined text-[12px]">check</span>
                          LISTA
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-xl border border-vinyl-orange/25 bg-vinyl-orange/10 px-3 py-3 text-center">
                <p className="font-label-caps text-[10px] text-vinyl-orange tracking-[0.22em]">SELECCIONADO</p>
                <p className="mt-1 text-sm font-black uppercase tracking-wide text-white">{selectedCuratedPlaylist.name}</p>
                <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">{selectedCuratedPlaylist.mood}</p>
              </div>
            </section>
          )}

          {googleUser && (
            <motion.button
              type="button"
              onClick={handleHostCreate}
              disabled={isCreating || !canCreateRoom}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              className="mt-6 w-full h-14 bg-glass-surface border-2 border-electric-purple/50 rounded-2xl flex items-center justify-center text-white font-label-caps text-sm uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-purple/10 transition-colors"
            >
              {isCreating ? 'CREANDO...' : !spotifyStatus.connected ? 'CONECTA SPOTIFY' : 'CREAR SALA'}
            </motion.button>
          )}
        </div>
      </section>
    </motion.main>
  );
}

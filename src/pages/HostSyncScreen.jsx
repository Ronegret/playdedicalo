import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { DEDICALO_PLAYLISTS, useGameStore } from '../store/useGameStore';
import { auth, googleProvider } from '../firebase';
import VinylVisualizer from '../components/VinylVisualizer';
import NeonButton from '../components/NeonButton';
import { connectSpotify, getSpotifyStatus } from '../services/spotify';

const SAVED_PLAYLISTS_KEY = 'dedicalo_saved_spotify_playlists';

function readSavedPlaylists() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVED_PLAYLISTS_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function HostSyncScreen() {
  const navigate = useNavigate();
  const { hostCreateRoom, spotifyPlaylistUrl, setSpotifyPlaylistUrl } = useGameStore((state) => ({
    hostCreateRoom: state.hostCreateRoom,
    spotifyPlaylistUrl: state.spotifyPlaylistUrl,
    setSpotifyPlaylistUrl: state.setSpotifyPlaylistUrl
  }));
  const [googleUser, setGoogleUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [musicMode, setMusicMode] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(DEDICALO_PLAYLISTS[0].id);
  const [customPlaylistUrl, setCustomPlaylistUrl] = useState(spotifyPlaylistUrl);
  const [customPlaylistName, setCustomPlaylistName] = useState('');
  const [savedPlaylists, setSavedPlaylists] = useState(() => readSavedPlaylists());
  const [spotifyStatus, setSpotifyStatus] = useState(() => getSpotifyStatus());
  const createStartedRef = useRef(false);

  const allPresetPlaylists = [...DEDICALO_PLAYLISTS, ...savedPlaylists];
  const selectedCuratedPlaylist = allPresetPlaylists.find((playlist) => playlist.id === selectedPlaylist) || DEDICALO_PLAYLISTS[0];
  const hasMusicSelection = musicMode === 'curated' || (musicMode === 'custom' && customPlaylistUrl.trim().length > 0) || (musicMode === 'saved' && selectedCuratedPlaylist);

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
    const onFocus = () => setSpotifyStatus(getSpotifyStatus());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleGoogleLogin = async () => {
    setAuthStatus('loading');
    setAuthMessage('Abriendo Google...');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setGoogleUser(result.user);
      setAuthStatus('idle');
      setAuthMessage('');
    } catch (error) {
      console.error('Google popup error', error);
      const messageByCode = {
        'auth/unauthorized-domain': 'Este dominio no esta autorizado en Firebase Authentication. Anade dedicalo-app.vercel.app y play.dedicalo.es en Authentication > Settings > Authorized domains.',
        'auth/operation-not-allowed': 'Google Sign-In no esta habilitado en Firebase. Activalo en Authentication > Sign-in method > Google.',
        'auth/popup-blocked': 'El navegador bloqueo la ventana de Google. Permite popups para esta pagina.',
        'auth/popup-closed-by-user': 'Se cerro la ventana de Google antes de terminar el inicio de sesion.'
      };
      setAuthStatus('error');
      setAuthMessage(messageByCode[error.code] || 'No se pudo abrir Google. Permite popups para esta pagina o revisa que Google Sign-In este habilitado en Firebase.');
    }
  };

  const handleHostCreate = async () => {
    if (!googleUser || !hasMusicSelection || createStartedRef.current) return;
    createStartedRef.current = true;
    setIsCreating(true);

    try {
      const playlistUrl = musicMode === 'custom' ? customPlaylistUrl : selectedCuratedPlaylist.url;
      setSpotifyPlaylistUrl(playlistUrl);
      await hostCreateRoom(googleUser);
      navigate('/lobby');
    } catch (error) {
      alert(error.message);
      createStartedRef.current = false;
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveCustomPlaylist = () => {
    const cleanUrl = customPlaylistUrl.trim();
    if (!cleanUrl) return;

    const nextPlaylist = {
      id: `saved-${Date.now()}`,
      name: customPlaylistName.trim() || 'Mi playlist',
      mood: 'Guardada en este dispositivo.',
      url: cleanUrl
    };
    const nextSaved = [nextPlaylist, ...savedPlaylists.filter((playlist) => playlist.url !== cleanUrl)].slice(0, 8);
    window.localStorage.setItem(SAVED_PLAYLISTS_KEY, JSON.stringify(nextSaved));
    setSavedPlaylists(nextSaved);
    setSelectedPlaylist(nextPlaylist.id);
    setMusicMode('saved');
  };

  const goBackToMusicMenu = () => setMusicMode(null);

  return (
    <motion.main
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen flex flex-col items-center px-margin-mobile gap-5 pt-20 pb-10 box-border overflow-x-hidden"
    >
      <header className="fixed top-0 left-0 right-0 z-50 bg-glass-surface backdrop-blur-md border-b border-white/10 flex justify-between items-center px-margin-mobile h-16 box-border">
        <button onClick={() => navigate('/role-selection')} className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs">
          <span className="material-symbols-outlined text-sm">arrow_back</span> VOLVER
        </button>
        <h1 className="font-headline-xl text-2xl italic tracking-tighter text-electric-purple leading-none select-none">ANFITRION</h1>
        <div className="w-8 h-8 rounded-full border-2 border-electric-purple overflow-hidden flex items-center justify-center bg-electric-purple/20">
          {googleUser?.photoURL ? (
            <img src={googleUser.photoURL} alt="Host Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-sm text-electric-purple">headphones</span>
          )}
        </div>
      </header>

      <VinylVisualizer rotating={true} />

      <section className="text-center w-full max-w-sm">
        <p className="font-label-caps text-neon-green text-xs tracking-widest">PASO 1 DE 2</p>
        <h2 className="font-headline-lg text-3xl font-black mt-2 text-on-surface leading-tight">Crea la sala y juega tambien</h2>
        <p className="text-on-surface-variant text-base mt-3 mb-5 font-body-md leading-relaxed">
          El anfitrion muestra el PIN, controla cuando cortar la musica y tambien responde para sumar puntos.
        </p>

        <div className="w-full space-y-4">
          {!googleUser ? (
            <NeonButton
              color="white"
              onClick={handleGoogleLogin}
              disabled={authStatus === 'loading'}
              icon={<span className="material-symbols-outlined font-bold">login</span>}
            >
              {authStatus === 'loading' ? 'Conectando...' : 'Iniciar sesion con Google'}
            </NeonButton>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-neon-green bg-neon-green/10 text-neon-green flex items-center justify-between font-bold text-sm"
            >
              <span>Google conectado</span>
              <span className="material-symbols-outlined">check_circle</span>
            </motion.div>
          )}

          {authMessage && (
            <p className={`text-xs leading-relaxed ${authStatus === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
              {authMessage}
            </p>
          )}

          {googleUser && (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <p className="text-xs text-neon-green font-label-caps mb-2">SPOTIFY DEL HOST</p>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{spotifyStatus.connected ? 'Conectado' : 'Conectar para reproducir'}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Solo el host necesita Spotify Premium.</p>
                </div>
                <button
                  type="button"
                  onClick={connectSpotify}
                  className="h-10 px-3 rounded-lg bg-neon-green text-black font-label-caps text-[10px] shrink-0"
                >
                  {spotifyStatus.connected ? 'RECONECTAR' : 'CONECTAR'}
                </button>
              </div>
            </section>
          )}

          <AnimatePresence mode="wait">
            {googleUser && !musicMode && (
              <motion.section
                key="music-question"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
              >
                <p className="text-xs text-neon-green font-label-caps mb-2">PASO 2 DE 2 - MUSICA</p>
                <h3 className="text-white font-headline-lg text-xl leading-tight">Que musica quieres usar?</h3>
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <button type="button" onClick={() => setMusicMode('curated')} className="rounded-xl border border-electric-purple/60 bg-electric-purple/15 p-4 text-left hover:bg-electric-purple/25 transition-colors">
                    <span className="block text-sm font-bold text-white">Playlists sugeridas</span>
                    <span className="block text-xs text-on-surface-variant mt-1">Listas para abrir en Spotify y jugar.</span>
                  </button>
                  <button type="button" onClick={() => setMusicMode('custom')} className="rounded-xl border border-white/10 bg-black/10 p-4 text-left hover:bg-white/10 transition-colors">
                    <span className="block text-sm font-bold text-white">Pegar una playlist</span>
                    <span className="block text-xs text-on-surface-variant mt-1">Ponle nombre y guardala para despues.</span>
                  </button>
                  {savedPlaylists.length > 0 && (
                    <button type="button" onClick={() => setMusicMode('saved')} className="rounded-xl border border-neon-green/50 bg-neon-green/10 p-4 text-left hover:bg-neon-green/15 transition-colors">
                      <span className="block text-sm font-bold text-white">Mis guardadas</span>
                      <span className="block text-xs text-on-surface-variant mt-1">{savedPlaylists.length} playlist guardadas en este dispositivo.</span>
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {googleUser && musicMode === 'curated' && (
              <motion.section key="curated" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <button type="button" onClick={goBackToMusicMenu} className="mb-4 h-10 px-3 rounded-lg border border-white/10 bg-black/15 text-white font-label-caps text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  VOLVER
                </button>
                <p className="text-xs text-neon-green font-label-caps mb-3">PLAYLISTS SUGERIDAS</p>
                <div className="space-y-2">
                  {DEDICALO_PLAYLISTS.map((playlist) => (
                    <button key={playlist.id} type="button" onClick={() => setSelectedPlaylist(playlist.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedPlaylist === playlist.id ? 'border-electric-purple bg-electric-purple/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <span className="block text-sm font-bold text-white">{playlist.name}</span>
                      <span className="block text-xs text-on-surface-variant mt-1">{playlist.mood}</span>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            {googleUser && musicMode === 'saved' && (
              <motion.section key="saved" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <button type="button" onClick={goBackToMusicMenu} className="mb-4 h-10 px-3 rounded-lg border border-white/10 bg-black/15 text-white font-label-caps text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  VOLVER
                </button>
                <p className="text-xs text-neon-green font-label-caps mb-3">MIS PLAYLISTS</p>
                <div className="space-y-2">
                  {savedPlaylists.map((playlist) => (
                    <button key={playlist.id} type="button" onClick={() => setSelectedPlaylist(playlist.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedPlaylist === playlist.id ? 'border-electric-purple bg-electric-purple/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <span className="block text-sm font-bold text-white">{playlist.name}</span>
                      <span className="block text-xs text-on-surface-variant mt-1 truncate">{playlist.url}</span>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            {googleUser && musicMode === 'custom' && (
              <motion.section key="custom" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <button type="button" onClick={goBackToMusicMenu} className="mb-4 h-10 px-3 rounded-lg border border-white/10 bg-black/15 text-white font-label-caps text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  VOLVER
                </button>
                <p className="text-xs text-neon-green font-label-caps mb-2">TU PLAYLIST</p>
                <h3 className="text-white font-bold mb-2">Pega el link publico de Spotify.</h3>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-body-md mt-1 focus:border-neon-green outline-none transition-colors"
                  placeholder="Nombre para guardarla"
                  value={customPlaylistName}
                  onChange={(event) => setCustomPlaylistName(event.target.value)}
                />
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-body-md mt-1 focus:border-neon-green outline-none transition-colors"
                  placeholder="https://open.spotify.com/playlist/..."
                  value={customPlaylistUrl}
                  onChange={(event) => setCustomPlaylistUrl(event.target.value)}
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomPlaylist}
                    disabled={!customPlaylistUrl.trim()}
                    className="h-10 rounded-lg border border-neon-green/40 bg-neon-green/10 text-neon-green font-label-caps text-[10px] disabled:opacity-40"
                  >
                    GUARDAR
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpotifyPlaylistUrl(customPlaylistUrl)}
                    disabled={!customPlaylistUrl.trim()}
                    className="h-10 rounded-lg border border-white/10 bg-white/5 text-white font-label-caps text-[10px] disabled:opacity-40"
                  >
                    USAR AHORA
                  </button>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant/70">Tambien puedes pegar solo el ID de la playlist.</p>
              </motion.section>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleHostCreate}
            disabled={isCreating || !googleUser || !hasMusicSelection}
            className="mt-6 w-full h-14 bg-glass-surface glass-blur border-2 border-electric-purple/50 rounded-xl flex items-center justify-center text-on-surface font-label-caps text-label-caps uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-purple/10 transition-colors"
          >
            {isCreating ? 'CREANDO SALA...' : hasMusicSelection ? 'CREAR SALA' : 'ELIGE LA MUSICA'}
          </button>
        </div>
      </section>
    </motion.main>
  );
}

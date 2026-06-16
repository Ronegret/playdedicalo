import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import ShaderBackground from './components/ShaderBackground';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { tryStartBgMusic, useBgMusic } from './hooks/useBgMusic';

const WelcomeScreen = lazy(() => import('./pages/WelcomeScreen'));
const HowToPlayScreen = lazy(() => import('./pages/HowToPlayScreen'));
const RoleSelectionScreen = lazy(() => import('./pages/RoleSelectionScreen'));
const HostSyncScreen = lazy(() => import('./pages/HostSyncScreen'));
const GuestJoinScreen = lazy(() => import('./pages/GuestJoinScreen'));
const LobbyScreen = lazy(() => import('./pages/LobbyScreen'));
const GameScreen = lazy(() => import('./pages/GameScreen'));
const ResultScreen = lazy(() => import('./pages/ResultScreen'));
const SpotifyCallbackScreen = lazy(() => import('./pages/SpotifyCallbackScreen'));

function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface">
      <div className="w-14 h-14 rounded-full border-2 border-neon-green/30 ring-expand-anim" />
    </div>
  );
}

function BgMusicButton() {
  const { paused, toggle } = useBgMusic();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={paused ? 'Activar música' : 'Silenciar música'}
      className="fixed top-3 left-3 z-[600] w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/12 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 active:scale-90 transition-all"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
        {paused ? 'volume_off' : 'volume_up'}
      </span>
    </button>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // Start bg music on first user interaction (mobile autoplay policy)
  useEffect(() => {
    const start = () => tryStartBgMusic();
    window.addEventListener('click', start, { once: true });
    window.addEventListener('touchend', start, { once: true });
    return () => {
      window.removeEventListener('click', start);
      window.removeEventListener('touchend', start);
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const dest = localStorage.getItem('auth_redirect_intent');
        if (dest) {
          localStorage.removeItem('auth_redirect_intent');
          navigate(dest);
        }
      }
    });
    return unsub;
  }, [navigate]);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BgMusicButton />
      <ShaderBackground />

      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/how-to-play" element={<HowToPlayScreen />} />
            <Route path="/role-selection" element={<RoleSelectionScreen />} />
            <Route path="/host/sync" element={<HostSyncScreen />} />
            <Route path="/spotify/callback" element={<SpotifyCallbackScreen />} />
            <Route path="/guest/join" element={<GuestJoinScreen />} />
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/game/result" element={<ResultScreen />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;

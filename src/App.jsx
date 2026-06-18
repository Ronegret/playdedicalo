import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import ShaderBackground from './components/ShaderBackground';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { stopBgMusic, tryStartBgMusic } from './hooks/useBgMusic';

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

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Start bg music on first interaction while on welcome screen
  useEffect(() => {
    const start = () => tryStartBgMusic();
    window.addEventListener('click', start, { once: true });
    window.addEventListener('touchend', start, { once: true });
    return () => {
      window.removeEventListener('click', start);
      window.removeEventListener('touchend', start);
    };
  }, []);

  // Stop music permanently when navigating away from welcome screen
  useEffect(() => {
    if (location.pathname !== '/') stopBgMusic();
  }, [location.pathname]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const dest = localStorage.getItem('auth_redirect_intent');
        const intentTime = Number(localStorage.getItem('auth_redirect_intent_time') || 0);
        // Intents older than 10 min are stale (e.g. a redirect that failed and was
        // never cleaned up). Ignore them so they don't cause unexpected navigation.
        const isStale = intentTime > 0 && Date.now() - intentTime > 10 * 60 * 1000;

        if (dest) {
          localStorage.removeItem('auth_redirect_intent');
          localStorage.removeItem('auth_redirect_intent_time');
          if (!isStale && window.location.pathname !== dest) {
            navigate(dest);
          }
        }
      }
    });
    return unsub;
  }, [navigate]);

  return (
    <ErrorBoundary>
      <OfflineBanner />
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

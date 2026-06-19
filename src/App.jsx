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
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-vinyl-orange/25 ring-expand-anim" />
        <div className="absolute inset-3 rounded-full bg-[repeating-radial-gradient(circle,#05070c_0_4px,#172033_5px_6px,#05070c_7px_10px)] vinyl-spin shadow-[0_18px_42px_rgba(0,0,0,0.45)]" />
        <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white p-1.5">
          <img src="/images/icon-app.png" alt="Dedícalo" className="h-full w-full object-contain" />
        </div>
      </div>
      <div>
        <p className="font-label-caps text-xs tracking-[0.28em] text-neon-green">CARGANDO</p>
        <p className="mt-2 text-sm font-bold text-on-surface">Preparando la sala musical...</p>
      </div>
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

  // Keep the intro track available on the first two entry screens.
  useEffect(() => {
    if (!['/', '/role-selection'].includes(location.pathname)) stopBgMusic();
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

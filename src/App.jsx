import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ShaderBackground from './components/ShaderBackground';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';

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

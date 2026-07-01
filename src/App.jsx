import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import ShaderBackground from './components/ShaderBackground';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { stopBgMusic, tryStartBgMusic } from './hooks/useBgMusic';

// After a new deploy, a tab left open from before still points at the old,
// content-hashed chunk filenames — those 404 on the server and the dynamic
// import() rejects, which looks like "the button does nothing" to the user.
// Reload once (guarded by sessionStorage so a genuine error doesn't loop) to
// pick up the current index.html and its correct chunk map.
function lazyWithReload(importer) {
  return lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem('chunk-reload-attempted');
      return mod;
    } catch (error) {
      if (!sessionStorage.getItem('chunk-reload-attempted')) {
        sessionStorage.setItem('chunk-reload-attempted', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const WelcomeScreen = lazyWithReload(() => import('./pages/WelcomeScreen'));
const HowToPlayScreen = lazyWithReload(() => import('./pages/HowToPlayScreen'));
const RoleSelectionScreen = lazyWithReload(() => import('./pages/RoleSelectionScreen'));
const HostSyncScreen = lazyWithReload(() => import('./pages/HostSyncScreen'));
const GuestJoinScreen = lazyWithReload(() => import('./pages/GuestJoinScreen'));
const LobbyScreen = lazyWithReload(() => import('./pages/LobbyScreen'));
const GameScreen = lazyWithReload(() => import('./pages/GameScreen'));
const ResultScreen = lazyWithReload(() => import('./pages/ResultScreen'));
const SpotifyCallbackScreen = lazyWithReload(() => import('./pages/SpotifyCallbackScreen'));

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
      if (!user) {
        // No session at all yet (guest, or host before choosing "Sign in with Google").
        // An anonymous session is enough to satisfy the database rules' `auth != null`
        // check without asking guests to log in. If the host later signs in with
        // Google, that call replaces this anonymous session on its own.
        signInAnonymously(auth).catch((error) => console.error('No se pudo iniciar sesión anónima:', error));
        return;
      }

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

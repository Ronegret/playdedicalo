import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, ensureAuthenticated } from './firebase';
import ShaderBackground from './components/ShaderBackground';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { stopBgMusic } from './hooks/useBgMusic';
import { useLandscapeBodyClass } from './hooks/useOrientation';

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
// La pantalla de televisión va en su propio trozo: quien juega desde el móvil
// no descarga nada de ella, y la tele no descarga el juego.
const TvScreen = lazyWithReload(() => import('./pages/TvScreen'));

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

import { useGameStore } from './store/useGameStore';

function App() {
  useLandscapeBodyClass();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const sessionCheckedRef = useRef(false);

  // On mobile, a call, a locked screen or switching apps can freeze the tab
  // long enough for the socket to drop. Returning to the foreground (or wifi
  // coming back) re-subscribes and re-marks this player as online instead of
  // leaving them stuck on "Reconectando" until they touch something.
  useEffect(() => {
    const reconnect = () => {
      const { pin, _subscribeToRoom, markPresenceOnline } = useGameStore.getState();
      if (!pin) return;
      _subscribeToRoom(pin);
      markPresenceOnline();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') reconnect();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', reconnect);
    window.addEventListener('pageshow', reconnect);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('pageshow', reconnect);
    };
  }, []);

  // Keep the intro track available on the first two entry screens.
  useEffect(() => {
    if (!['/', '/role-selection'].includes(location.pathname)) stopBgMusic();
  }, [location.pathname]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No session at all yet (guest, or host before choosing "Sign in with Google").
        // An anonymous session is enough to satisfy the database rules' `auth != null`
        // check without asking guests to log in. If the host later signs in with
        // Google, that call replaces this anonymous session on its own.
        // ensureAuthenticated reintenta con backoff — sin esto, un error
        // transitorio (común cuando muchos dispositivos se conectan a la vez
        // desde la misma red) dejaba a esa persona sin poder unirse nunca.
        ensureAuthenticated().catch((error) => console.error('No se pudo iniciar sesión anónima:', error));
        return;
      }

      const dest = localStorage.getItem('auth_redirect_intent');
      const intentTime = Number(localStorage.getItem('auth_redirect_intent_time') || 0);
      // Intents older than 10 min are stale (e.g. a redirect that failed and was
      // never cleaned up). Ignore them so they don't cause unexpected navigation.
      const isStale = intentTime > 0 && Date.now() - intentTime > 10 * 60 * 1000;
      let navigatedByIntent = false;

      if (dest) {
        localStorage.removeItem('auth_redirect_intent');
        localStorage.removeItem('auth_redirect_intent_time');
        if (!isStale && window.location.pathname !== dest) {
          navigate(dest);
          navigatedByIntent = true;
        }
      }

      // A tab that got reloaded (stale-chunk recovery, browser/OS killing a
      // backgrounded tab and restoring it, PWA relaunch) loses all in-memory
      // state even though the room and player id are still in localStorage.
      // Try once per app load to rejoin exactly where the player left off
      // instead of dumping them back on the welcome screen.
      if (!sessionCheckedRef.current) {
        sessionCheckedRef.current = true;
        if (!useGameStore.getState().pin) {
          const resumed = await useGameStore.getState().resumeSession().catch(() => false);
          if (resumed && !navigatedByIntent) {
            const inRoomRoute = ['/lobby', '/game', '/game/result'].includes(window.location.pathname);
            if (!inRoomRoute) {
              navigate(useGameStore.getState().phase === 'lobby' ? '/lobby' : '/game');
            }
          }
        }
        setSessionChecked(true);
      }
    });
    return unsub;
  }, [navigate]);

  // Safety net: never let a broken/slow auth handshake strand the player on
  // the loading screen — show the app anyway after a few seconds.
  useEffect(() => {
    const timeout = window.setTimeout(() => setSessionChecked(true), 4000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <ShaderBackground />

      {sessionChecked ? (
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/how-to-play" element={<HowToPlayScreen />} />
              <Route path="/role-selection" element={<RoleSelectionScreen />} />
              <Route path="/host/sync" element={<HostSyncScreen />} />
              <Route path="/guest/join" element={<GuestJoinScreen />} />
              <Route path="/lobby" element={<LobbyScreen />} />
              <Route path="/game" element={<GameScreen />} />
              <Route path="/tv" element={<TvScreen />} />
              <Route path="/game/result" element={<ResultScreen />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      ) : (
        <PageLoader />
      )}
    </ErrorBoundary>
  );
}

export default App;

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
import { useModoLigero } from './hooks/useModoLigero';
import { useBarraInferior } from './hooks/useBarraInferior';
import { despertarAudio } from './services/audio';

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
const LegalScreen = lazyWithReload(() => import('./pages/LegalScreen'));
const RoleSelectionScreen = lazyWithReload(() => import('./pages/RoleSelectionScreen'));
const HostSyncScreen = lazyWithReload(() => import('./pages/HostSyncScreen'));
const GuestJoinScreen = lazyWithReload(() => import('./pages/GuestJoinScreen'));
const LobbyScreen = lazyWithReload(() => import('./pages/LobbyScreen'));
const GameScreen = lazyWithReload(() => import('./pages/GameScreen'));
const ResultScreen = lazyWithReload(() => import('./pages/ResultScreen'));
// La pantalla de televisión va en su propio trozo: quien juega desde el móvil
// no descarga nada de ella, y la tele no descarga el juego.
const TvScreen = lazyWithReload(() => import('./pages/TvScreen'));
// Lo que abre el anfitrión al escanear el QR del televisor.
const TvLinkScreen = lazyWithReload(() => import('./pages/TvLinkScreen'));

/* ── Precarga del camino probable ───────────────────────────────────────────
   Antes, la PRIMERA vez que alguien iba a cualquier pantalla, su trozo de
   JavaScript aún no estaba descargado: React suspendía, se desmontaba todo y
   salía el cartel de "CARGANDO — Preparando la sala musical" a pantalla
   completa. Ninguna app instalada borra la pantalla para cambiar de sección.

   Desde cada pantalla solo se puede ir a dos o tres sitios. Así que en cuanto
   una pantalla está pintada y el navegador está ocioso, se traen los trozos
   de los sitios a los que se puede ir desde ahí. Cuando la persona toca el
   botón, el código YA está: la transición es instantánea y el cartel no
   aparece nunca.

   Va en requestIdleCallback a propósito: precargar es lo menos urgente que
   hay, y no puede robarle tiempo a la pantalla que se está pintando ahora.
─────────────────────────────────────────────────────────────────────────── */
const VECINAS = {
  '/': [() => import('./pages/RoleSelectionScreen'), () => import('./pages/HowToPlayScreen')],
  '/role-selection': [() => import('./pages/HostSyncScreen'), () => import('./pages/GuestJoinScreen')],
  '/host/sync': [() => import('./pages/LobbyScreen')],
  '/guest/join': [() => import('./pages/LobbyScreen')],
  '/lobby': [() => import('./pages/GameScreen')],
  '/game': [() => import('./pages/ResultScreen')],
  '/game/result': [() => import('./pages/LobbyScreen')],
  '/tv-link': [() => import('./pages/TvScreen')]
};

/* ── La pantalla de entrada, sin esperar a la sesión ───────────────────────
   Nada se pinta hasta que Firebase confirma la sesión (sessionChecked), y
   solo entonces React pedía el trozo de la pantalla que toca: una espera de
   red DETRÁS de otra. Pidiéndolo aquí, al cargar este archivo, viaja a la vez
   que la sesión y cuando esta llega el código ya está. El import() de abajo y
   el de lazy() son el mismo módulo: el navegador lo descarga una sola vez.
   Si falla no pasa nada: lazyWithReload lo vuelve a pedir y gestiona el error.
─────────────────────────────────────────────────────────────────────────── */
const PANTALLA_DE_ENTRADA = {
  '/': () => import('./pages/WelcomeScreen'),
  '/how-to-play': () => import('./pages/HowToPlayScreen'),
  '/legal': () => import('./pages/LegalScreen'),
  '/role-selection': () => import('./pages/RoleSelectionScreen'),
  '/host/sync': () => import('./pages/HostSyncScreen'),
  '/guest/join': () => import('./pages/GuestJoinScreen'),
  '/lobby': () => import('./pages/LobbyScreen'),
  '/game': () => import('./pages/GameScreen'),
  '/game/result': () => import('./pages/ResultScreen'),
  '/tv': () => import('./pages/TvScreen'),
  '/tv-link': () => import('./pages/TvLinkScreen')
};
{
  const ruta = window.location.pathname.startsWith('/legal/') ? '/legal' : window.location.pathname;
  PANTALLA_DE_ENTRADA[ruta]?.().catch(() => {});
}

const yaPrecargadas = new Set();

function precargarVecinas(ruta) {
  const vecinas = VECINAS[ruta];
  if (!vecinas || yaPrecargadas.has(ruta)) return;
  yaPrecargadas.add(ruta);

  const traer = () => vecinas.forEach((importar) => { importar().catch(() => {}); });
  if ('requestIdleCallback' in window) window.requestIdleCallback(traer, { timeout: 2500 });
  else window.setTimeout(traer, 1200);
}

/**
 * Espera.
 *
 * Es deliberadamente IGUAL que la pantalla de arranque de index.html: mismo
 * fondo, mismo logo, misma barra, mismo tamaño. Antes esto era otra cosa
 * —disco girando, "CARGANDO", "Preparando la sala musical..."— así que al
 * abrir la app se veían DOS esperas distintas seguidas, y cada cambio de
 * aspecto se lee como un paso más.
 *
 * Siendo idénticas, el usuario no percibe una transición: percibe una sola
 * espera que sigue ahí. Y con la precarga de vecinas, esta pantalla ya casi
 * nunca llega a aparecer al navegar.
 */
function PageLoader() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-[22px] bg-[#050816] px-6">
      {/* La misma imagen que la pantalla de arranque de index.html (ver allí
          por qué es la webp): así ya está en caché y no se descarga dos veces. */}
      <img src="/images/icon-app.webp" alt="" width={124} height={124} className="h-[124px] w-[124px] object-contain" />
      <div className="h-[3px] w-32 overflow-hidden rounded-[3px] bg-white/10">
        <i className="block h-full w-2/5 rounded-[3px] bg-gradient-to-r from-vinyl-orange to-electric-purple [animation:arranque-vaiven_1.1s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

import { useGameStore } from './store/useGameStore';

function App() {
  useLandscapeBodyClass();
  // Mide los fotogramas reales en este móvil y baja la calidad si no llega.
  useModoLigero();
  // Reserva el hueco exacto de la barra fija de abajo — y ninguno cuando no
  // hay barra, que es lo que dejaba una franja vacía al final de la pantalla.
  useBarraInferior();
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
      // El contexto de Web Audio se SUSPENDE solo cuando la app pasa a
      // segundo plano (una llamada, bloquear la pantalla, cambiar de app).
      // Al volver no se reanuda por su cuenta: sin esto, el anfitrión vuelve
      // a la partida y ni la música ni los efectos suenan nunca más, sin
      // ningún mensaje de error. Es barato y no depende de estar en una sala.
      despertarAudio();

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

  // En cuanto esta pantalla está pintada, se traen en segundo plano los
  // trozos de las pantallas a las que se puede ir desde aquí. Es lo que hace
  // que el cartel de "CARGANDO" deje de salir al navegar.
  useEffect(() => {
    precargarVecinas(location.pathname);
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
              {/* Con dirección propia cada documento: Google Play pide un
                  enlace directo a la política de privacidad, y una consulta
                  se responde con un enlace concreto. */}
              <Route path="/legal" element={<LegalScreen />} />
              <Route path="/legal/:documento" element={<LegalScreen />} />
              <Route path="/role-selection" element={<RoleSelectionScreen />} />
              <Route path="/host/sync" element={<HostSyncScreen />} />
              <Route path="/guest/join" element={<GuestJoinScreen />} />
              <Route path="/lobby" element={<LobbyScreen />} />
              <Route path="/game" element={<GameScreen />} />
              <Route path="/tv" element={<TvScreen />} />
              <Route path="/tv-link" element={<TvLinkScreen />} />
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

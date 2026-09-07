import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { DEDICALO_PLAYLISTS, MAX_TIMELINE_GOAL_YEARS, MIN_TIMELINE_GOAL_YEARS, PLAYLIST_META, useGameStore } from '../store/useGameStore';
import { auth, authReady, googleProvider } from '../firebase';
import { getPlaylistRequestUrl, openMailto } from '../config/support';
import VinylVisualizer from '../components/VinylVisualizer';
import NeonButton from '../components/NeonButton';
import ProfileMenu from '../components/ProfileMenu';
import FontSizeControl from '../components/FontSizeControl';
import AlertDialog from '../components/AlertDialog';
import SabotageSettings from '../components/SabotageSettings';
import { StepActionBar, StepPanel, StepProgress } from '../components/WizardSteps';

// Crear sala en pasos en vez de un solo muro con todo a la vez: primero
// los requisitos (cuentas), después la música, después la duración. El PIN
// aparece en el lobby, donde además se puede seguir cambiando playlist y
// duración antes de arrancar.
const HOST_STEPS = ['Tu cuenta', 'Elige la música', 'Duración'];
// Ya no se importa nada del SDK de Spotify: la música la pone el juego.
import { coberturaDeLista } from '../services/musica';

// La mini "carátula" solo tiene que comunicar la vibra con color + ícono —
// el nombre y el formato de la playlist ya se leen justo al lado (pill +
// título). Antes también metía un código de 2 letras y la etiqueta de
// formato ABAJO en posición absoluta, que en una tarjeta de 72px de ancho
// terminaba encimada sobre el ícono: texto ilegible sobre la carátula.
function PlaylistArtwork({ meta, isSelected }) {
  return (
    <div className="relative h-[88px] w-[88px] shrink-0 overflow-visible sm:h-[104px] sm:w-[104px]">
      <div
        className="absolute left-5 top-1 h-[78px] w-[78px] rounded-full border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.45)] sm:h-[94px] sm:w-[94px]"
        style={{
          background: `radial-gradient(circle at center, #050816 0 13%, ${meta.accent} 14% 17%, #0a1020 18% 32%, ${meta.color} 33% 36%, #050816 37% 58%, ${meta.accent} 59% 62%, #050816 63%)`,
          transform: isSelected ? 'rotate(14deg) translateX(3px)' : 'rotate(8deg)',
          opacity: isSelected ? 1 : 0.72
        }}
      />
      <div
        className="absolute inset-y-0 left-0 my-auto flex h-[88px] w-[72px] flex-col overflow-hidden rounded-xl border p-2 shadow-[0_18px_45px_rgba(0,0,0,0.45)] sm:h-[104px] sm:w-[84px]"
        style={{
          borderColor: isSelected ? `${meta.color}cc` : 'rgba(255,255,255,0.14)',
          background: `linear-gradient(145deg, ${meta.color} 0%, #111827 48%, ${meta.accent} 145%)`
        }}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-black/35 px-1.5 py-0.5 font-label-caps text-[0.471rem] tracking-[0.16em] text-white/90">
            DED
          </span>
          <span className="h-2 w-2 rounded-full bg-white/80" />
        </div>
        <div className="mt-2 flex flex-1 items-center justify-center rounded-lg bg-black/25 ring-1 ring-white/10">
          <span className="material-symbols-outlined text-[1.765rem] text-white drop-shadow">
            {meta.icon}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HostSyncScreen() {
  const navigate = useNavigate();
  const { hostCreateRoom, setSpotifyPlaylistUrl, setGameSettings, targetYears, loadUserProfile, sabotageEnabled, sabotageTypes } = useGameStore((state) => ({
    hostCreateRoom: state.hostCreateRoom,
    setSpotifyPlaylistUrl: state.setSpotifyPlaylistUrl,
    setGameSettings: state.setGameSettings,
    targetYears: state.targetYears,
    loadUserProfile: state.loadUserProfile,
    sabotageEnabled: state.sabotageEnabled,
    sabotageTypes: state.sabotageTypes,
  }));

  const [googleUser, setGoogleUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(DEDICALO_PLAYLISTS[0].id);
  const [step, setStep] = useState(0);
  const [alert, setAlert] = useState(null);
  const createStartedRef = useRef(false);

  const selectedPlaylistData = DEDICALO_PLAYLISTS.find((p) => p.id === selectedPlaylist) || DEDICALO_PLAYLISTS[0];

  // Solo se puede jugar con las canciones que tienen fragmento de audio. Si
  // una lista se queda corta hay que decirlo AQUÍ, no cuando ya hay diez
  // personas en la sala esperando a que suene algo.
  const [cobertura, setCobertura] = useState(null);
  useEffect(() => {
    let vivo = true;
    coberturaDeLista(selectedPlaylistData.url)
      .then((c) => { if (vivo) setCobertura(c); })
      .catch(() => { if (vivo) setCobertura(null); });
    return () => { vivo = false; };
  }, [selectedPlaylistData.url]);
  const selectedMeta = PLAYLIST_META[selectedPlaylist] || { icon: 'music_note', color: '#ff7a1a' };
  // Ya no se exige cuenta de música: la pone el juego.
  const canCreateRoom = Boolean(googleUser && selectedPlaylistData && (cobertura === null || cobertura.jugables > 0));
  const targetOptions = [6, 8, 12, 15, 20];

  // Todo el mundo (host incluido) recibe una sesión anónima automática solo
  // para satisfacer las reglas de Firebase — no es un login real. Si se
  // trata como si lo fuera, en cuanto esa sesión anónima termina de armarse
  // la pantalla ya muestra "Google conectado" sin que el anfitrión haya
  // tocado el botón, y el perfil (nombre/avatar) nunca queda ligado a su
  // cuenta real. isAnonymous es la señal que distingue ambos casos.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        setGoogleUser(user);
        await loadUserProfile(user);
        setAuthStatus('idle');
        setAuthMessage('');
      } else {
        setGoogleUser(null);
      }
    });
    return unsubscribe;
  }, [loadUserProfile]);

  useEffect(() => {
    const redirectIntent = localStorage.getItem('auth_redirect_intent');
    const intentTime = Number(localStorage.getItem('auth_redirect_intent_time') || 0);
    const hasFreshRedirectIntent = Boolean(redirectIntent) && Date.now() - intentTime < 10 * 60 * 1000;

    authReady.then(() => getRedirectResult(auth))
      .then(async (result) => {
        if (result?.user && !result.user.isAnonymous) {
          setGoogleUser(result.user);
          await loadUserProfile(result.user);
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
  }, [loadUserProfile]);

  const handleGoogleLogin = async () => {
    setAuthStatus('loading');
    setAuthMessage('');

    try {
      await authReady;
      localStorage.removeItem('auth_redirect_intent');
      localStorage.removeItem('auth_redirect_intent_time');

      const result = await signInWithPopup(auth, googleProvider);
      setGoogleUser(result.user);
      await loadUserProfile(result.user);
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
  // Igual que en el flujo de invitado: en vez de dejar el botón apagado sin
  // explicación, se deja pulsar y el aviso emergente dice exactamente qué
  // falta.
  const handleNextStep = () => {
    if (step === 0) {
      if (!googleUser) {
        setAlert({
          tone: 'warning',
          title: 'Falta tu cuenta de Google',
          message: 'El anfitrión entra con Google para que la sala quede ligada a su perfil. Toca "Entrar con Google" para continuar.'
        });
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handleHostCreate = async () => {
    if (createStartedRef.current) return;
    if (!canCreateRoom) {
      setAlert({
        tone: 'warning',
        title: 'Faltan datos',
        message: !googleUser
          ? 'Vuelve al primer paso y entra con Google.'
          : cobertura && cobertura.jugables === 0
            ? 'Esa lista todavía no tiene canciones listas para sonar. Elige otra.'
            : 'Elige una playlist antes de crear la sala.'
      });
      return;
    }
    createStartedRef.current = true;
    setIsCreating(true);
    try {
      setSpotifyPlaylistUrl(selectedPlaylistData.url);
      await hostCreateRoom(googleUser);
      navigate('/lobby');
    } catch (error) {
      setAlert({
        tone: 'error',
        title: 'No se pudo crear la sala',
        message: error.message || 'No se pudo crear la sala. Inténtalo otra vez.'
      });
      createStartedRef.current = false;
    } finally {
      setIsCreating(false);
    }
  };

  const handleTargetYearsChange = (nextValue) => {
    const next = Math.min(MAX_TIMELINE_GOAL_YEARS, Math.max(MIN_TIMELINE_GOAL_YEARS, Number(nextValue)));
    setGameSettings({ targetYears: next });
  };

  return (
    <motion.main
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="app-screen safe-bottom-action relative z-10 overflow-y-auto pt-safe-header md:px-8 lg:px-16"
    >
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/8 flex justify-between items-center px-4 md:px-8 h-16">
        <button
          onClick={() => navigate('/role-selection')}
          className="min-h-touch text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
        <h1 className="font-headline-xl text-2xl italic tracking-tighter text-electric-purple select-none">
          ANFITRIÓN
        </h1>
        {googleUser ? <ProfileMenu user={googleUser} /> : <FontSizeControl />}
      </header>

      <div className="app-shell mx-auto flex w-full flex-col items-center gap-5">
        <StepProgress steps={HOST_STEPS} current={step} onGoTo={setStep} />

        <AnimatePresence mode="wait">
        {/* PASO 1 — Entrar con la cuenta. Es lo único que se pide: la
            música la pone el propio juego. */}
        {step === 0 && (
        <StepPanel stepKey="connect">
        <div className="flex w-full flex-col items-center gap-4">

          <div className="mt-1">
            <VinylVisualizer rotating={Boolean(googleUser)} size="compact" logoSrc="/images/icon-app.png" />
          </div>

          <div className="text-center">
            <p className="font-label-caps text-neon-green text-xs tracking-[0.28em]">CREA SALA</p>
            <h2 className="mt-2 font-headline-lg text-2xl font-black leading-tight text-on-surface md:text-3xl">
              Tú mandas la música y también juegas
            </h2>
            <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
              Entra con tu cuenta para guardar tu perfil y tus partidas.
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

          </div>
        </div>
        </StepPanel>
        )}

        {/* PASO 3 — Duración (cuántas canciones para ganar) */}
        {step === 2 && (
        <StepPanel stepKey="years">
          <div className="w-full">
            <div className="mb-4 text-center">
              <h2 className="heading-page font-headline-lg font-black uppercase text-on-surface">¿Cuánto dura?</h2>
              <p className="copy-readable mx-auto mt-2 max-w-md text-on-surface-variant">
                Cuántas canciones hay que acertar para ganar la partida.
              </p>
            </div>
              <div className="rounded-3xl border border-electric-purple/35 bg-electric-purple/10 p-4 text-left shadow-[0_0_34px_rgba(168,85,247,0.10)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-label-caps text-xs tracking-[0.2em] text-electric-purple">DURACIÓN</p>
                    <h3 className="mt-1 text-xl font-black text-white">{targetYears} canciones para ganar</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTargetYearsChange(targetYears - 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white active:scale-95"
                      aria-label="Reducir duración"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTargetYearsChange(targetYears + 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white active:scale-95"
                      aria-label="Aumentar duración"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {targetOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleTargetYearsChange(option)}
                      className={`min-h-touch rounded-xl border font-label-caps text-xs font-black transition-all active:scale-95 ${
                        targetYears === option
                          ? 'border-neon-green bg-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.25)]'
                          : 'border-white/10 bg-black/20 text-white/75'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                  12 es el ritmo recomendado. Baja para una partida rápida o sube si la noche pide más música.
                </p>
              </div>

              {/* El sabotaje es opcional: se decide aqui, junto a la
                  duracion, antes de crear la sala. */}
              <div className="mt-4">
                <SabotageSettings
                  enabled={sabotageEnabled}
                  types={sabotageTypes}
                  onChange={(next) => setGameSettings(next)}
                />
              </div>

              {/* Resumen de lo elegido antes de crear — para que se vea de
                  un vistazo qué sala se va a crear, sin volver atrás. */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <p className="font-label-caps text-xs tracking-[0.2em] text-neon-green">RESUMEN</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl" style={{ color: selectedMeta.color }}>
                    {selectedMeta.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black uppercase text-white">{selectedPlaylistData.name}</p>
                    <p className="text-sm text-on-surface-variant">
                      {targetYears} canciones para ganar · {sabotageEnabled !== false ? 'con sabotaje' : 'sin sabotaje'}
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </StepPanel>
        )}

        {/* PASO 2 — Playlist */}
        {step === 1 && (
        <StepPanel stepKey="playlist">
          <div className="w-full min-w-0">
                        <div className="mb-4 text-center">
              <div>
                <h2 className="heading-page font-headline-lg font-black uppercase text-on-surface">Elige la música</h2>
                <p className="copy-readable mx-auto mt-2 max-w-md text-on-surface-variant">Define la vibra de la partida: una sola mecánica, muchas energías.</p>
              </div>
              <div
                className="h-9 px-3 rounded-xl flex items-center gap-2 font-label-caps text-[0.647rem] text-white border shrink-0"
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
              {cobertura && (
                <p className={`mt-2 text-sm ${cobertura.jugables === 0 ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
                  {cobertura.jugables === 0
                    ? 'Esta lista aún no tiene canciones listas para sonar.'
                    : `${cobertura.jugables} canciones listas para sonar`}
                </p>
              )}
            </div>

            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 xl:grid-cols-4">
              {DEDICALO_PLAYLISTS.map((playlist) => {
                const meta = PLAYLIST_META[playlist.id] || {
                  icon: 'music_note',
                  color: '#ff7a1a',
                  accent: '#39ff14',
                  format: 'MIX'
                };
                const isSelected = playlist.id === selectedPlaylist;

                return (
                  <motion.button
                    key={playlist.id}
                    type="button"
                    onClick={() => setSelectedPlaylist(playlist.id)}
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.015, y: -2 }}
                    className="group relative min-h-[120px] w-full overflow-hidden rounded-3xl border p-3 text-left transition-all duration-200 sm:min-h-[150px] sm:p-4"
                    style={{
                      borderColor: isSelected ? `${meta.color}dd` : 'rgba(255,255,255,0.10)',
                      background: isSelected
                        ? `linear-gradient(135deg, ${meta.color}24, rgba(5,8,22,0.92) 52%, ${meta.accent}18)`
                        : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(5,8,22,0.86))',
                      boxShadow: isSelected ? `0 0 32px ${meta.color}2e, inset 0 0 22px ${meta.color}0d` : 'none',
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-35"
                      style={{
                        backgroundImage: `linear-gradient(90deg, transparent 0 30%, ${meta.color} 30% 31%, transparent 31% 60%, ${meta.accent} 60% 61%, transparent 61%), radial-gradient(circle at 86% 18%, ${meta.color}33, transparent 28%)`,
                      }}
                    />
                    <div className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-4">
                      <PlaylistArtwork meta={meta} isSelected={isSelected} />

                      <div className="min-w-0 flex-1 sm:w-full">
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className="inline-flex h-6 items-center rounded-full px-2 font-label-caps text-[0.529rem] tracking-[0.18em] text-black"
                            style={{ backgroundColor: meta.accent }}
                          >
                            {meta.format}
                          </span>
                          {isSelected && (
                            <span className="inline-flex h-6 items-center rounded-full bg-white px-2 font-label-caps text-[0.529rem] tracking-[0.18em] text-black">
                              ACTIVA
                            </span>
                          )}
                        </div>
                        <p className="font-headline-lg text-[1.059rem] font-black uppercase leading-[1.05] text-white sm:min-h-[38px]">
                          {playlist.name}
                        </p>
                        <p className="mt-1.5 text-xs font-semibold leading-snug text-on-surface-variant sm:min-h-[34px]">
                          {playlist.mood}
                        </p>
                        <div className="mt-3 hidden items-center gap-2 text-[0.588rem] font-black uppercase tracking-[0.18em] text-white/55 sm:flex">
                          <span className="h-px flex-1" style={{ backgroundColor: `${meta.color}66` }} />
                          Portada Dedicalo
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full shadow-lg"
                        style={{ backgroundColor: meta.color }}
                      >
                        <span className="material-symbols-outlined text-black" style={{ fontSize: '16px', lineHeight: 1 }}>
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
                <p className="font-label-caps text-[0.588rem] text-on-surface-variant tracking-widest">SELECCIONADO</p>
                <p className="mt-0.5 truncate text-sm font-black uppercase text-white">{selectedPlaylistData.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{selectedPlaylistData.mood}</p>
              </div>
            </div>

            <p className="mt-3 text-center text-sm text-on-surface-variant">
              ¿No está tu playlist? Con una donación voluntaria la incluimos.{' '}
              <button
                type="button"
                onClick={() => openMailto(getPlaylistRequestUrl())}
                className="underline underline-offset-2 text-vinyl-orange"
              >
                Saber cómo
              </button>
            </p>
          </div>
        </StepPanel>
        )}
        </AnimatePresence>
      </div>

      <StepActionBar
        onBack={step > 0 ? () => setStep((prev) => prev - 1) : undefined}
        onNext={step === HOST_STEPS.length - 1 ? handleHostCreate : handleNextStep}
        nextLabel={
          step === HOST_STEPS.length - 1
            ? (isCreating ? 'CREANDO SALA...' : 'CREAR SALA')
            : 'SIGUIENTE'
        }
        nextIcon={step === HOST_STEPS.length - 1 ? 'meeting_room' : 'arrow_forward'}
        nextDisabled={isCreating}
        hint={
          step === 0 && !googleUser ? 'Entra con Google para continuar' : undefined
        }
      />

      <AlertDialog
        open={Boolean(alert)}
        tone={alert?.tone}
        title={alert?.title}
        message={alert?.message || ''}
        onClose={() => setAlert(null)}
      />
    </motion.main>
  );
}

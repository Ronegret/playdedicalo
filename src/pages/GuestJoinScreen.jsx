import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { useGameStore } from '../store/useGameStore';
import ProfileMenu from '../components/ProfileMenu';
import FontSizeControl from '../components/FontSizeControl';
import AvatarPicker from '../components/AvatarPicker';
import AlertDialog from '../components/AlertDialog';
import HeaderLogo from '../components/HeaderLogo';
import { StepActionBar, StepPanel, StepProgress } from '../components/WizardSteps';
import { findCharacterAvatarByUrl, isImageAvatar } from '../data/characterAvatars';
import { escanearQr } from '../services/escanerQr';
import { auth, authReady, googleProvider } from '../firebase';
import { sfx } from '../services/audio';
import { vibrar } from '../services/haptics';

// Orden deliberado: primero el PIN (lo que la persona tiene delante en ese
// momento), después su nombre, después el personaje. Antes todo estaba en
// una sola pantalla larga con el personaje arriba y el PIN al fondo.
const GUEST_STEPS = ['PIN de la sala', 'Tu nombre', 'Tu personaje'];

function getPinFromQrValue(value) {
  const text = String(value || '');
  try {
    const url = new URL(text);
    return url.searchParams.get('pin')?.replace(/\D/g, '').slice(0, 4) || '';
  } catch {
    return text.replace(/\D/g, '').slice(0, 4);
  }
}

export default function GuestJoinScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guestJoinRoom = useGameStore((state) => state.guestJoinRoom);
  const loadUserProfile = useGameStore((state) => state.loadUserProfile);
  const cancelJoinRequest = useGameStore((state) => state.cancelJoinRequest);
  const pendingJoinStatus = useGameStore((state) => state.pendingJoinStatus);
  const checkRoomPin = useGameStore((state) => state.checkRoomPin);
  const inputRefs = useRef([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [pin, setPin] = useState(() => searchParams.get('pin')?.replace(/\D/g, '').slice(0, 4) || '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [isLoading, setIsLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  // Si llega con ?pin=... (enlace compartido) ya tiene el paso 1 resuelto,
  // así que arranca directamente en "tu nombre".
  const [step, setStep] = useState(() => (searchParams.get('pin')?.replace(/\D/g, '').length === 4 ? 1 : 0));
  // Aviso emergente para errores / datos que faltan: { title, message, tone }
  const [alert, setAlert] = useState(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // El nombre es opcional: si la persona no escribe nada, se usa el nombre
  // de su personaje elegido (o un alias genérico) — no debe bloquear la
  // entrada a la sala solo por no haber escrito un alias.
  const canJoin = pin.length === 4 && !isLoading;
  const pinDigits = pin.padEnd(4, ' ').split('').slice(0, 4);

  // Cada invitado también recibe una sesión anónima automática (la necesita
  // Firebase para autorizar la lectura/escritura de la sala). Esa sesión
  // anónima NO es un login de Google — si se trata como tal, en cuanto
  // termina de armarse (uno o varios segundos después de cargar la
  // pantalla) pisa el alias/emoji que la persona ya empezó a escribir con
  // el perfil vacío "Jugador"/"DJ" de esa sesión anónima. isAnonymous
  // distingue exactamente ese caso.
  // También protegemos con esta ref: si la persona ya tocó el nombre o el
  // avatar a mano, ningún autocompletado (ni de un login real de Google)
  // puede volver a pisarlo.
  const hasEditedNameRef = useRef(false);
  const hasEditedAvatarRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.isAnonymous) {
        setGoogleUser(null);
        return;
      }
      setGoogleUser(user);
      const profile = await loadUserProfile(user);
      if (!hasEditedNameRef.current) setName(profile.name || user.displayName || '');
      if (!hasEditedAvatarRef.current) setAvatar(profile.avatar || user.photoURL || 'DJ');
      setAuthStatus('idle');
      setAuthMessage('');
    });
    return unsubscribe;
  }, [loadUserProfile]);

  useEffect(() => {
    const redirectIntent = localStorage.getItem('auth_redirect_intent');
    const intentTime = Number(localStorage.getItem('auth_redirect_intent_time') || 0);
    const hasFreshRedirectIntent = redirectIntent === '/guest/join' && Date.now() - intentTime < 10 * 60 * 1000;

    authReady.then(() => getRedirectResult(auth))
      .then(async (result) => {
        if (result?.user && !result.user.isAnonymous) {
          const profile = await loadUserProfile(result.user);
          setGoogleUser(result.user);
          if (!hasEditedNameRef.current) setName(profile.name || result.user.displayName || '');
          if (!hasEditedAvatarRef.current) setAvatar(profile.avatar || result.user.photoURL || 'DJ');
          setAuthStatus('idle');
          setAuthMessage('');
        } else if (hasFreshRedirectIntent && !auth.currentUser) {
          localStorage.removeItem('auth_redirect_intent');
          localStorage.removeItem('auth_redirect_intent_time');
          setAuthStatus('error');
          setAuthMessage('Google volvio sin completar el acceso. Intentalo otra vez.');
        }
      })
      .catch(() => {
        setAuthStatus('error');
        setAuthMessage('No pudimos completar el acceso con Google.');
      });
  }, [loadUserProfile]);

  const handleGoogleLogin = async () => {
    setAuthStatus('loading');
    setAuthMessage('');
    try {
      await authReady;
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await loadUserProfile(result.user);
      setGoogleUser(result.user);
      setName(profile.name || result.user.displayName || '');
      setAvatar(profile.avatar || result.user.photoURL || 'DJ');
      setAuthStatus('idle');
    } catch (loginError) {
      const fallbackToRedirect = [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
      ].includes(loginError.code);
      if (fallbackToRedirect) {
        localStorage.setItem('auth_redirect_intent', '/guest/join');
        localStorage.setItem('auth_redirect_intent_time', String(Date.now()));
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setAuthStatus('error');
      setAuthMessage('No pudimos entrar con Google. Puedes jugar con alias igualmente.');
    }
  };

  // Comprueba contra la base que esa sala existe de verdad y avanza. No se
  // limita a contar 4 dígitos: así nadie rellena nombre y personaje para
  // enterarse al final de que el PIN estaba mal.
  // El guard de "ya hay una comprobación en curso" usa una ref (no el
  // estado) para que este callback sea estable y el escáner de QR pueda
  // depender de él sin re-montar la cámara en cada render.
  const checkingPinRef = useRef(false);
  const advanceFromPin = useCallback(async (candidate) => {
    if (checkingPinRef.current) return;
    checkingPinRef.current = true;
    setIsCheckingPin(true);
    try {
      const result = await checkRoomPin(candidate);
      if (!result.ok) {
        setAlert({ tone: 'error', title: 'PIN incorrecto', message: result.message });
        return;
      }
      vibrar('toque'); sfx.toque();
      setStep(1);
    } finally {
      checkingPinRef.current = false;
      setIsCheckingPin(false);
    }
  }, [checkRoomPin]);

  useEffect(() => {
    if (!scannerOpen) return undefined;
    // El estado se toca solo desde callbacks, nunca en el cuerpo del efecto.
    const limpiar = window.setTimeout(() => setScannerError(''), 0);

    // El escáner vive en services/escanerQr: analiza la imagen reducida y
    // unas diez veces por segundo, no a resolución completa en cada
    // fotograma como antes. Eso era lo que hacía tiritar la vista previa
    // incluso en móviles potentes.
    const parar = escanearQr(
      videoRef.current,
      (texto) => {
        const nextPin = getPinFromQrValue(texto);
        if (nextPin.length !== 4) return false;
        setPin(nextPin);
        setScannerOpen(false);
        vibrar('confirmar'); sfx.confirmar();
        // Mismo camino que escribirlo a mano: así un QR de una sala ya
        // cerrada también avisa en vez de dejar seguir.
        advanceFromPin(nextPin);
        return true;
      },
      (motivo) => {
        setScannerError(motivo === 'permiso-denegado'
          ? 'No pudimos abrir la cámara. Revisa los permisos y vuelve a intentarlo.'
          : 'Tu navegador no permite acceder a la cámara. Escribe el PIN manualmente.');
      }
    );

    return () => { window.clearTimeout(limpiar); parar(); };
  }, [scannerOpen, advanceFromPin]);

  const updatePinAt = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = pin.padEnd(4, ' ').split('').slice(0, 4);
    nextDigits[index] = digit || ' ';
    const nextPin = nextDigits.join('').replace(/\s/g, '').slice(0, 4);
    setPin(nextPin);

    // PIN completo: el paso ya está resuelto, así que se comprueba y se
    // avanza solo. Tener que buscar y tocar "SIGUIENTE" después de llenar
    // el último hueco era un paso de más. Se comprueba por longitud (no
    // por índice) para que también funcione al corregir un dígito del
    // medio, no solo al escribir el cuarto.
    if (digit && nextPin.length === 4) {
      inputRefs.current[index]?.blur();
      advanceFromPin(nextPin);
      return;
    }

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !pinDigits[index].trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (event) => {
    const pastedPin = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedPin) {
      event.preventDefault();
      setPin(pastedPin);
      if (pastedPin.length === 4) {
        // Pegar el PIN completo también resuelve el paso — avanzar solo.
        advanceFromPin(pastedPin);
        return;
      }
      inputRefs.current[Math.min(pastedPin.length, 4) - 1]?.focus();
    }
  };

  // Cuando la partida ya empezó, guestJoinRoom no entra directo: manda un
  // pedido y queda esperando que el anfitrión lo acepte. awaitingApproval
  // controla la pantalla de espera; el useEffect de abajo navega solo en
  // cuanto el store detecta que el pedido fue aceptado (pendingJoinStatus
  // vuelve a null porque ya quedó suscripto a la sala como jugador).
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  useEffect(() => {
    if (!awaitingApproval || pendingJoinStatus !== null) return;
    // navigate() desmonta esta pantalla, así que no hace falta (ni conviene)
    // apagar awaitingApproval acá mismo — evita el setState síncrono dentro
    // del efecto.
    const { phase: roomPhase } = useGameStore.getState();
    navigate(roomPhase === 'lobby' ? '/lobby' : '/game');
  }, [awaitingApproval, pendingJoinStatus, navigate]);

  const handleJoin = async () => {
    if (!canJoin) return;

    // Si no escribió nombre, usar el nombre del personaje elegido como
    // alias por defecto en vez de forzarlos a escribir algo.
    const fallbackName = findCharacterAvatarByUrl(avatar)?.name || 'DJ Invitado';
    const finalName = name.trim() || fallbackName;

    setIsLoading(true);
    try {
      await guestJoinRoom(pin, finalName, avatar, googleUser);
      const { pendingJoinStatus: status, phase: roomPhase } = useGameStore.getState();
      if (status === 'pending') {
        setAwaitingApproval(true);
      } else {
        // Sala en lobby (entrada normal) o reconexión a una partida en
        // curso donde ya era jugador — no hace falta esperar aprobación.
        navigate(roomPhase === 'lobby' ? '/lobby' : '/game');
      }
    } catch (error) {
      setAlert({
        tone: 'error',
        title: 'No pudimos unirte',
        message: error.message || 'No pudimos unirte a la sala. Revisa el PIN e inténtalo de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPending = async () => {
    setAwaitingApproval(false);
    await cancelJoinRequest();
  };

  return (
    <motion.main className="app-screen safe-bottom-action app-shell relative z-10 overflow-y-auto pt-safe-header text-center">
      <header className="fixed top-0 w-full z-50 bg-glass-surface border-b border-white/10 flex items-center justify-between px-margin-mobile h-16 left-0">
        <button onClick={() => navigate('/role-selection')} className="min-h-touch text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]">
          <span className="material-symbols-outlined text-xl">arrow_back</span> VOLVER
        </button>
        <HeaderLogo />
        {googleUser ? <ProfileMenu user={googleUser} /> : <FontSizeControl />}
      </header>

      {/* `min-h-full` + `justify-center`: los pasos de este asistente son
          cortos y se quedaban pegados arriba con media pantalla vacía debajo,
          que es de las cosas que más "sin terminar" hacen parecer una app.
          Centrado cuando cabe, y si un paso crece (el selector de avatar) el
          contenedor sigue desplazándose con normalidad. */}
      <div className="flex min-h-full flex-col items-center justify-center gap-5 pb-6 sm:gap-6">
        <StepProgress steps={GUEST_STEPS} current={step} onGoTo={setStep} />

        <AnimatePresence mode="wait">
          {/* PASO 1 — PIN primero: es lo que la persona tiene delante (el
              anfitrión se lo canta o le muestra el QR). Antes estaba al
              final, debajo de todo el selector de personajes. */}
          {step === 0 && (
            <StepPanel stepKey="pin">
              <section className="w-full text-center">
                <h1 className="heading-page font-headline-lg font-black uppercase text-on-surface">
                  Escribe el PIN
                </h1>
                <p className="copy-readable mx-auto mt-2 max-w-md text-on-surface-variant">
                  Los 4 dígitos que muestra el anfitrión. O escanea su QR.
                </p>
              </section>

              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="mt-5 flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl border-2 border-neon-green/45 bg-neon-green/10 px-4 py-3 font-label-caps text-base font-black text-neon-green active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
                {isCheckingPin ? 'COMPROBANDO...' : 'ESCANEAR QR'}
              </button>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/12" />
                <span className="font-label-caps text-xs text-on-surface-variant">O ESCRÍBELO</span>
                <span className="h-px flex-1 bg-white/12" />
              </div>

              <div className="grid grid-cols-4 gap-3" onPaste={handlePinPaste}>
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { inputRefs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Dígito ${index + 1} del PIN`}
                    className={`h-20 rounded-2xl border-2 text-center font-stats-xl text-4xl text-neon-green outline-none transition-all focus:border-neon-green focus:bg-black/60 focus:shadow-[0_0_0_4px_rgba(57,255,20,0.14)] ${
                      digit.trim()
                        ? 'border-neon-green/55 bg-black/50'
                        : index === pinDigits.findIndex((d) => !d.trim())
                          // La SIGUIENTE casilla vacía se marca sola. Cuatro
                          // cuadros oscuros e idénticos no decían dónde
                          // escribir —ni siquiera que fueran escribibles—; con
                          // una resaltada el sitio es obvio sin leer nada.
                          ? 'border-neon-green/45 bg-black/45 animate-pulse'
                          : 'border-white/10 bg-black/30'
                    }`}
                    value={digit.trim()}
                    onChange={(event) => updatePinAt(index, event.target.value)}
                    onKeyDown={(event) => handlePinKeyDown(event, index)}
                  />
                ))}
              </div>
            </StepPanel>
          )}

          {/* PASO 2 — Nombre */}
          {step === 1 && (
            <StepPanel stepKey="name">
              <section className="w-full text-center">
                <h1 className="heading-page font-headline-lg font-black uppercase text-on-surface">
                  ¿Cómo te llamas?
                </h1>
                <p className="copy-readable mx-auto mt-2 max-w-md text-on-surface-variant">
                  Así te verán los demás en el ranking. Puedes dejarlo vacío.
                </p>
              </section>

              <input
                id="guest-name"
                type="text"
                maxLength={18}
                autoFocus
                className="mt-6 h-20 w-full rounded-2xl border-2 border-white/10 bg-black/30 px-4 text-center text-3xl font-black text-on-surface outline-none transition-colors focus:border-neon-green focus:ring-2 focus:ring-neon-green/30 placeholder:text-on-surface-variant/40"
                value={name}
                onChange={(event) => { hasEditedNameRef.current = true; setName(event.target.value); }}
                onKeyDown={(event) => { if (event.key === 'Enter') setStep(2); }}
                placeholder={findCharacterAvatarByUrl(avatar)?.name || 'DJ Invitado'}
                autoComplete="nickname"
                enterKeyHint="next"
              />
              <p className="mt-3 text-center text-sm text-on-surface-variant">
                Si lo dejas vacío usamos el nombre de tu personaje · máx. 18 caracteres
              </p>

              {/* Aquí, justo debajo del campo, y no en una barra pegada al
                  fondo: el nombre es lo único que se escribe en todo el
                  juego, y la barra fija se comía media pantalla con el
                  teclado abierto. La tecla "intro" hace lo mismo. */}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-neon-green px-4 font-label-caps text-base font-black text-black transition-transform active:scale-[0.98]"
              >
                ELEGIR PERSONAJE
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>

              <section className="mt-6 w-full rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-label-caps text-xs tracking-[0.18em] text-on-surface-variant">OPCIONAL · GUARDAR PERFIL</p>
                    <p className="mt-0.5 text-sm font-bold text-white/80">
                      {googleUser ? '✓ Google conectado' : 'Recupera tu perfil con Gmail'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={authStatus === 'loading' || Boolean(googleUser)}
                    className="min-h-touch shrink-0 rounded-xl border border-white/10 bg-white px-4 font-label-caps text-xs font-black text-black disabled:opacity-60 active:scale-95 transition-transform"
                  >
                    {googleUser ? 'LISTO' : authStatus === 'loading' ? '...' : 'GMAIL'}
                  </button>
                </div>
                {authMessage && (
                  <p className={`mt-2 text-sm ${authStatus === 'error' ? 'text-intense-red' : 'text-on-surface-variant'}`}>
                    {authMessage}
                  </p>
                )}
              </section>
            </StepPanel>
          )}

          {/* PASO 3 — Personaje */}
          {step === 2 && (
            <StepPanel stepKey="avatar">
              <section className="w-full text-center">
                <h1 className="heading-page font-headline-lg font-black uppercase text-on-surface">
                  Elige tu personaje
                </h1>
                <p className="copy-readable mx-auto mt-2 max-w-md text-on-surface-variant">
                  Es tu cara en la partida. Toca uno para verlo en grande.
                </p>
              </section>

              <div className="my-5 flex items-center justify-center">
                <div className="relative">
                  <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-electric-purple bg-electric-purple/20 text-6xl shadow-[0_0_36px_rgba(168,85,247,0.45)]">
                    {isImageAvatar(avatar) ? (
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      avatar || '😎'
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-neon-green shadow-[0_0_16px_rgba(57,255,20,0.6)]">
                    <span className="material-symbols-outlined text-black" style={{ fontSize: '20px' }}>check</span>
                  </div>
                </div>
              </div>

              <AvatarPicker
                value={avatar}
                onChange={(nextAvatar) => { hasEditedAvatarRef.current = true; setAvatar(nextAvatar); }}
              />
            </StepPanel>
          )}
        </AnimatePresence>

      </div>

      {/* Barra de abajo SOLO para entrar en la sala.
          El PIN ya avanzaba solo al cuarto dígito y el nombre se confirma
          desde el propio campo, así que en esos pasos la barra no hacía otra
          cosa que ocupar sitio. "UNIRSE" se queda: es la acción de verdad, y
          esa conviene pulsarla a propósito. */}
      {step === GUEST_STEPS.length - 1 && (
        <StepActionBar
          onBack={() => setStep((prev) => prev - 1)}
          onNext={handleJoin}
          nextLabel={isLoading ? 'ENTRANDO...' : 'UNIRSE'}
          nextIcon="login"
          nextDisabled={!canJoin}
        />
      )}

      <AlertDialog
        open={Boolean(alert)}
        tone={alert?.tone}
        title={alert?.title}
        message={alert?.message || ''}
        onClose={() => setAlert(null)}
      />

      {/* La partida ya empezó: espera a que el anfitrión acepte el pedido
          de ingreso en vez de dejarla afuera sin más. */}
      <AnimatePresence>
        {awaitingApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 px-6"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-electric-purple/40 bg-[#160725] p-6 text-center shadow-[0_0_80px_rgba(168,85,247,0.42)]"
            >
              {pendingJoinStatus === 'denied' ? (
                <>
                  <span className="material-symbols-outlined text-intense-red" style={{ fontSize: '3rem' }}>block</span>
                  <h3 className="mt-3 font-headline-lg text-xl font-black text-white">El anfitrión no aceptó tu ingreso</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">La partida ya está en curso y esta vez prefirió no sumarte a mitad de ronda. Puedes intentarlo de nuevo más tarde.</p>
                  <button
                    type="button"
                    onClick={handleCancelPending}
                    className="mt-5 w-full min-h-touch rounded-xl bg-white/8 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                  >
                    ENTENDIDO
                  </button>
                </>
              ) : pendingJoinStatus === 'expired' ? (
                <>
                  <span className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '3rem' }}>error</span>
                  <h3 className="mt-3 font-headline-lg text-xl font-black text-white">No pudimos confirmar tu ingreso</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">Puede que la sala haya cerrado. Revisa el PIN y vuelve a intentarlo.</p>
                  <button
                    type="button"
                    onClick={handleCancelPending}
                    className="mt-5 w-full min-h-touch rounded-xl bg-white/8 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                  >
                    REINTENTAR
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-electric-purple bg-electric-purple/20 text-4xl">
                    {isImageAvatar(avatar) ? (
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      avatar || '😎'
                    )}
                  </div>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                    className="material-symbols-outlined mt-4 inline-block text-electric-purple"
                    style={{ fontSize: '2.5rem' }}
                  >
                    progress_activity
                  </motion.span>
                  <h3 className="mt-2 font-headline-lg text-xl font-black text-white">La partida ya empezó</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Le avisamos al anfitrión que <span className="text-white font-bold">{name.trim() || findCharacterAvatarByUrl(avatar)?.name || 'DJ Invitado'}</span> quiere sumarse. Espera su confirmación...
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelPending}
                    className="mt-5 w-full min-h-touch rounded-xl border border-white/10 bg-white/5 text-white font-label-caps text-sm font-bold active:scale-95 transition-all"
                  >
                    CANCELAR
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center px-margin-mobile"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-container p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-headline-lg text-xl text-white">Escanear QR</h2>
                  <p className="text-xs text-on-surface-variant mt-1">Apunta al QR del anfitrión.</p>
                </div>
                <button type="button" onClick={() => setScannerOpen(false)} aria-label="Cerrar escáner" className="min-w-touch min-h-touch rounded-full bg-white/10 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="aspect-square rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                {scannerError ? (
                  <p className="text-center text-sm text-on-surface-variant px-6">{scannerError}</p>
                ) : (
                  <>
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}




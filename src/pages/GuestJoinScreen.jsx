import { AnimatePresence, motion } from 'framer-motion';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { useGameStore } from '../store/useGameStore';
import NeonButton from '../components/NeonButton';
import ProfileMenu from '../components/ProfileMenu';
import { auth, authReady, googleProvider } from '../firebase';

const EMOJI_AVATARS = [
  '😎', '🎸', '🎧', '👽', '🤠', '👾', '🥳', '🔥', '🎤', '🎹',
  '🎵', '🎶', '🕺', '💃', '🦄', '🦊', '🦈', '👻', '🤡', '🤖',
  '🎃', '⚡', '🏆', '🎭', '🎨', '🚀', '⭐', '🌈', '🎲', '💎'
];

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
  const inputRefs = useRef([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);
  const streamRef = useRef(null);
  const [pin, setPin] = useState(() => searchParams.get('pin')?.replace(/\D/g, '').slice(0, 4) || '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [isLoading, setIsLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [googleUser, setGoogleUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const canJoin = pin.length === 4 && name.trim().length > 0 && !isLoading;
  const pinDigits = pin.padEnd(4, ' ').split('').slice(0, 4);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setGoogleUser(user);
      if (user) {
        const profile = await loadUserProfile(user);
        setName(profile.name || user.displayName || '');
        setAvatar(profile.avatar || user.photoURL || 'DJ');
        setAuthStatus('idle');
        setAuthMessage('');
      }
    });
    return unsubscribe;
  }, [loadUserProfile]);

  useEffect(() => {
    const redirectIntent = localStorage.getItem('auth_redirect_intent');
    const intentTime = Number(localStorage.getItem('auth_redirect_intent_time') || 0);
    const hasFreshRedirectIntent = redirectIntent === '/guest/join' && Date.now() - intentTime < 10 * 60 * 1000;

    authReady.then(() => getRedirectResult(auth))
      .then(async (result) => {
        if (result?.user) {
          const profile = await loadUserProfile(result.user);
          setGoogleUser(result.user);
          setName(profile.name || result.user.displayName || '');
          setAvatar(profile.avatar || result.user.photoURL || 'DJ');
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

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let isActive = true;

    async function startScanner() {
      setScannerError('');

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError('Tu navegador no permite acceder a la cámara. Escribe el PIN manualmente.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scan = () => {
          if (!isActive || !videoRef.current || videoRef.current.readyState < 2) {
            scanLoopRef.current = window.requestAnimationFrame(scan);
            return;
          }

          const { videoWidth: w, videoHeight: h } = videoRef.current;
          if (w && h) {
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code) {
              const nextPin = getPinFromQrValue(code.data);
              if (nextPin.length === 4) {
                setPin(nextPin);
                setScannerOpen(false);
                return;
              }
            }
          }

          scanLoopRef.current = window.requestAnimationFrame(scan);
        };

        scan();
      } catch {
        setScannerError('No pudimos abrir la cámara. Revisa los permisos del navegador y vuelve a intentarlo.');
      }
    }

    startScanner();

    return () => {
      isActive = false;
      if (scanLoopRef.current) window.cancelAnimationFrame(scanLoopRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [scannerOpen]);

  const updatePinAt = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = pin.padEnd(4, ' ').split('').slice(0, 4);
    nextDigits[index] = digit || ' ';
    const nextPin = nextDigits.join('').replace(/\s/g, '').slice(0, 4);
    setPin(nextPin);

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
      inputRefs.current[Math.min(pastedPin.length, 4) - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    if (!canJoin) return;

    setIsLoading(true);
    setJoinError('');
    try {
      await guestJoinRoom(pin, name, avatar, googleUser);
      navigate('/lobby');
    } catch (error) {
      setJoinError(error.message || 'No pudimos unirte a la sala. Revisa el PIN e inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.main className="app-screen safe-bottom-action app-shell relative z-10 overflow-y-auto pt-safe-header text-center">
      <header className="fixed top-0 w-full z-50 bg-glass-surface backdrop-blur-md border-b border-white/10 flex items-center justify-between px-margin-mobile h-16 left-0">
        <button onClick={() => navigate('/role-selection')} className="min-h-touch text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs tracking-[0.18em]">
          <span className="material-symbols-outlined text-xl">arrow_back</span> VOLVER
        </button>
        <img src="/images/logo-main.png" alt="Dedícalo" className="h-8 w-auto object-contain" />
        {googleUser ? <ProfileMenu user={googleUser} /> : <div className="w-8 opacity-0" />}
      </header>

      <div className="flex flex-col items-center gap-4 sm:gap-6">
        <section className="w-full">
          <p className="font-label-caps text-neon-green text-xs mb-2">INVITADO</p>
          <h1 className="heading-page font-headline-lg font-black uppercase text-on-surface">UNIRSE A LA SALA</h1>
          <p className="copy-readable mx-auto mt-2 max-w-md text-on-surface-variant">
            Escribe el PIN de 4 dígitos o escanea el QR que muestra el anfitrión. Entras con 10 puntos base.
          </p>
        </section>

        <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-label-caps text-[10px] tracking-[0.2em] text-neon-green">PERFIL</p>
              <p className="mt-1 text-sm font-bold text-white">
                {googleUser ? 'Google conectado' : 'Alias rapido o Google'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                {googleUser
                  ? 'Guardaremos tu nombre y avatar para futuras partidas.'
                  : 'Puedes entrar sin registro o usar Gmail para recuperar tu perfil.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authStatus === 'loading' || Boolean(googleUser)}
              className="min-h-touch shrink-0 rounded-xl border border-white/10 bg-white px-3 font-label-caps text-[10px] font-black text-black disabled:opacity-60"
            >
              {googleUser ? 'LISTO' : authStatus === 'loading' ? '...' : 'GMAIL'}
            </button>
          </div>
          {authMessage && (
            <p className={`mt-2 text-xs ${authStatus === 'error' ? 'text-intense-red' : 'text-on-surface-variant'}`}>
              {authMessage}
            </p>
          )}
        </section>

        <section className="space-y-3 w-full">
          <div className="flex items-center justify-between gap-3">
            <label className="font-label-caps text-on-surface-variant text-xs">PIN DE LA SALA</label>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="min-h-touch rounded-lg border border-neon-green/40 bg-neon-green/10 px-3 text-xs font-label-caps text-neon-green flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-base">qr_code_scanner</span>
              ESCANEAR QR
            </button>
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
                className="h-14 rounded-xl border-2 border-white/10 bg-white/5 text-center font-stats-xl text-2xl text-neon-green outline-none transition-colors focus:border-neon-green sm:h-16 sm:text-3xl"
                value={digit.trim()}
                onChange={(event) => updatePinAt(index, event.target.value)}
                onKeyDown={(event) => handlePinKeyDown(event, index)}
              />
            ))}
          </div>
        </section>

        <section className="w-full">
          <label htmlFor="guest-name" className="font-label-caps text-on-surface-variant text-xs mb-2 block">TU ALIAS (MAX. 12)</label>
          <input
            id="guest-name"
            type="text"
            maxLength={18}
            className="h-13 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-base font-bold text-on-surface outline-none transition-colors focus:border-neon-green focus:ring-2 focus:ring-neon-green/30 sm:h-14"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="DJ Invitado"
          />
        </section>

        <section className="w-full">
          <label className="font-label-caps text-on-surface-variant text-xs mb-2 block">ELIGE TU IDENTIDAD</label>
          {avatar?.startsWith?.('http') && (
            <div className="mb-2 flex items-center justify-center">
              <img src={avatar} alt="Avatar Google" className="h-12 w-12 rounded-full border-2 border-electric-purple object-cover" />
            </div>
          )}
          <div className="grid max-h-[28svh] grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3 no-scrollbar sm:max-h-none sm:grid-cols-6 sm:p-4">
            {EMOJI_AVATARS.map((emoji) => (
              <motion.button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.06 }}
                className={`flex h-10 items-center justify-center rounded-lg text-2xl transition-all ${avatar === emoji ? 'bg-primary/40 border border-primary scale-110 shadow-[0_0_18px_rgba(57,255,20,0.22)]' : 'hover:bg-white/10 border border-transparent'}`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </section>

        {joinError && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-xl border border-intense-red/40 bg-intense-red/10 px-4 py-3 text-sm text-intense-red text-center"
          >
            {joinError}
          </motion.p>
        )}

        <NeonButton
          primary={true}
          onClick={handleJoin}
          disabled={!canJoin}
          className="mt-2"
        >
          {isLoading ? 'CONECTANDO...' : 'ENTRAR A JUGAR'}
        </NeonButton>
      </div>

      <AnimatePresence>
        {scannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center px-margin-mobile"
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




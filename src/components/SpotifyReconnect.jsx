import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  connectSpotify,
  explainSpotifyError,
  getSpotifyDiagnostics,
  getSpotifyStatus,
  prepareSpotifyPlayback
} from '../services/spotify';

// Control de Spotify siempre a mano para el anfitrión durante la partida.
// Antes solo aparecía un botón de reconectar DESPUÉS de que una ronda
// fallara: si el reproductor se caía a mitad de partida (pantalla
// bloqueada, la app de Spotify tomando el control en otro dispositivo, el
// token expirando) no había forma de arreglarlo sin salir de la sala.
// Ahora vive en el header, muestra el estado de un vistazo y ofrece las
// dos reparaciones posibles.
export default function SpotifyReconnect() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(() => getSpotifyStatus());
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);

  // El token puede expirar mientras la pestaña está abierta: se refresca al
  // volver al primer plano y cada 30s, para que el indicador no mienta.
  useEffect(() => {
    const refresh = () => setStatus(getSpotifyStatus());
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Reparación suave: vuelve a activar el elemento de audio (el navegador
  // exige un gesto reciente para reanudar sonido después de que la pestaña
  // estuvo en segundo plano) y re-registra el dispositivo. Resuelve la
  // mayoría de las caídas sin perder la sesión.
  const handleReactivate = async () => {
    setBusy('reactivate');
    setResult(null);
    try {
      await prepareSpotifyPlayback();
      const diagnostic = await getSpotifyDiagnostics();
      setStatus(getSpotifyStatus());
      setResult(diagnostic.ok
        ? { tone: 'ok', message: 'Reproductor listo otra vez. Sigue la partida con normalidad.' }
        : { tone: 'bad', message: diagnostic.message });
    } catch (error) {
      setStatus(getSpotifyStatus());
      setResult({ tone: 'bad', message: explainSpotifyError(error) });
    } finally {
      setBusy('');
    }
  };

  // Reparación dura: rehacer el login. Vuelve a /game, así el anfitrión
  // retoma su partida en curso en vez de caer en "crear sala".
  const handleFullReconnect = () => {
    setBusy('reconnect');
    connectSpotify('/game').catch(() => {
      setBusy('');
      setResult({ tone: 'bad', message: 'No pudimos abrir Spotify. Inténtalo otra vez.' });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setResult(null); setStatus(getSpotifyStatus()); setOpen(true); }}
        aria-label="Estado y reconexión de Spotify"
        className="flex min-h-touch shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 active:scale-95 transition-transform"
      >
        <span
          className="material-symbols-outlined text-lg"
          style={{ color: status.connected ? '#1ed760' : '#ffbf4d' }}
        >
          graphic_eq
        </span>
        <span className="hidden font-label-caps text-xs text-white sm:inline">
          {status.connected ? 'SPOTIFY' : 'SIN SPOTIFY'}
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] flex items-end justify-center bg-black/85 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ y: 30, scale: 0.96, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 20, scale: 0.97, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 270, damping: 26 }}
                className="w-full max-w-sm rounded-3xl border-2 border-[#1ed760]/45 bg-surface-container p-5 shadow-[0_0_60px_rgba(30,215,96,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: status.connected ? '#1ed760' : '#ffbf4d' }}
                  >
                    <span className="material-symbols-outlined text-black">graphic_eq</span>
                  </span>
                  <div className="min-w-0">
                    <p className="font-label-caps text-base font-black text-white">SPOTIFY</p>
                    <p className="text-sm text-on-surface-variant">
                      {status.connected ? 'Cuenta conectada' : 'Sesión caducada o desconectada'}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                  ¿Se cortó la música a mitad de partida? Prueba primero lo rápido; si sigue sin sonar, vuelve a entrar en Spotify.
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={Boolean(busy)}
                    className="flex min-h-touch items-center justify-center gap-2 rounded-2xl bg-[#1ed760] px-4 font-label-caps text-base font-black text-black active:scale-95 transition-transform disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {busy === 'reactivate' ? 'hourglass_empty' : 'restart_alt'}
                    </span>
                    {busy === 'reactivate' ? 'PROBANDO...' : 'REACTIVAR SONIDO'}
                  </button>

                  <button
                    type="button"
                    onClick={handleFullReconnect}
                    disabled={Boolean(busy)}
                    className="flex min-h-touch items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 font-label-caps text-sm font-bold text-white active:scale-95 transition-transform disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">login</span>
                    {busy === 'reconnect' ? 'ABRIENDO SPOTIFY...' : 'VOLVER A CONECTAR SPOTIFY'}
                  </button>
                </div>

                {result && (
                  <p
                    className={`mt-3 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
                      result.tone === 'ok'
                        ? 'border-[#1ed760]/45 bg-[#1ed760]/10 text-white'
                        : 'border-intense-red/40 bg-intense-red/10 text-intense-red'
                    }`}
                  >
                    {result.message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 min-h-touch w-full rounded-2xl border border-white/10 bg-white/5 font-label-caps text-sm font-bold text-white active:scale-95 transition-transform"
                >
                  CERRAR
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

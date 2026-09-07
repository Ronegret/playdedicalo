import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import HeaderLogo from '../components/HeaderLogo';

/**
 * ENLAZAR LA TELE — lo que se abre al escanear el QR del televisor
 *
 * Teclear el PIN con el mando de una tele es lento y se hace delante de todo
 * el mundo. Así que se le da la vuelta: la tele enseña un código y lo escanea
 * el anfitrión con su móvil, que es el aparato que tiene cámara y teclado
 * cómodo. Aquí solo se confirma y se vuelve al juego.
 */
export default function TvLinkScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const codigo = (params.get('tv') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const pin = useGameStore((s) => s.pin);
  const role = useGameStore((s) => s.role);
  const enlazar = useGameStore((s) => s.linkTvToRoom);

  const [estado, setEstado] = useState(() => {
    if (!codigo) return 'error';
    if (!pin) return 'sin-sala';
    return 'enlazando';
  });
  const [mensaje, setMensaje] = useState(codigo ? '' : 'Ese enlace no lleva ningún código de tele.');

  useEffect(() => {
    if (!codigo || !pin) return undefined;
    let vivo = true;
    enlazar(codigo).then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setEstado('listo');
        // Vuelta al juego sola: nadie quiere quedarse en una pantalla de
        // confirmación mientras la sala espera.
        setTimeout(() => navigate(role === 'host' ? '/lobby' : '/game'), 1400);
      } else {
        setEstado('error');
        setMensaje(r.message);
      }
    });
    return () => { vivo = false; };
  }, [codigo, pin, enlazar, navigate, role]);

  return (
    <div className="app-screen flex flex-col items-center justify-center px-6 text-center">
      <HeaderLogo />

      {estado === 'listo' ? (
        <>
          <span className="material-symbols-outlined text-neon-green" style={{ fontSize: '5rem' }}>
            check_circle
          </span>
          <h1 className="heading-page mt-4 font-headline-lg font-black text-on-surface">
            Tele conectada
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Ya se ve la partida en la pantalla grande.
          </p>
        </>
      ) : estado === 'sin-sala' ? (
        <>
          <span className="material-symbols-outlined text-chaos-gold" style={{ fontSize: '4rem' }}>
            meeting_room
          </span>
          <h1 className="heading-page mt-4 font-headline-lg font-black text-on-surface">
            Primero crea la sala
          </h1>
          <p className="mt-2 max-w-sm text-on-surface-variant">
            Crea tu sala y vuelve a escanear el código de la tele. Tarda un segundo.
          </p>
          <button
            type="button"
            onClick={() => navigate('/role-selection')}
            className="mt-6 flex min-h-touch w-full max-w-xs items-center justify-center rounded-2xl bg-neon-green px-5 font-label-caps font-black text-black active:scale-[0.98]"
          >
            CREAR SALA
          </button>
        </>
      ) : estado === 'error' ? (
        <>
          <span className="material-symbols-outlined text-error" style={{ fontSize: '4rem' }}>
            error
          </span>
          <h1 className="heading-page mt-4 font-headline-lg font-black text-on-surface">
            No pudimos conectar
          </h1>
          <p className="mt-2 max-w-sm text-on-surface-variant">{mensaje}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 flex min-h-touch w-full max-w-xs items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 font-label-caps font-bold text-white active:scale-[0.98]"
          >
            VOLVER
          </button>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined animate-pulse text-neon-green" style={{ fontSize: '4rem' }}>
            tv
          </span>
          <p className="mt-4 text-on-surface-variant">Conectando con la tele...</p>
        </>
      )}
    </div>
  );
}

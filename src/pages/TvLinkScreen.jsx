import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import HeaderLogo from '../components/HeaderLogo';

/**
 * ENLAZAR LA TELE — lo que se abre al escanear el QR del televisor
 *
 * Teclear el PIN con el mando de una tele es lento y se hace delante de todo
 * el mundo, así que se le da la vuelta: la tele enseña un código y lo escanea
 * el anfitrión con su móvil, que es el aparato que tiene cámara.
 *
 * OJO con algo que no es obvio: escanear un QR abre una PÁGINA NUEVA. El
 * estado del juego vive en memoria, así que aquí llega vacío — no hay sala,
 * aunque el anfitrión la tenga abierta en otra pestaña. Por eso lo primero
 * que se hace es recuperar la sesión guardada. Sin esto la pantalla decía
 * "primero crea la sala" a alguien que acababa de crearla.
 */
export default function TvLinkScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const codigo = (params.get('tv') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const enlazar = useGameStore((s) => s.linkTvToRoom);
  const recuperarSesion = useGameStore((s) => s.resumeSession);

  const [estado, setEstado] = useState(codigo ? 'comprobando' : 'error');
  const [mensaje, setMensaje] = useState(codigo ? '' : 'Ese enlace no lleva ningún código de tele.');

  useEffect(() => {
    if (!codigo) return undefined;
    let vivo = true;

    (async () => {
      // Recuperar la sala guardada antes de decidir nada. Solo hace falta si
      // esta pestaña todavía no la tiene.
      if (!useGameStore.getState().pin) {
        await recuperarSesion().catch(() => false);
      }
      if (!vivo) return;

      if (!useGameStore.getState().pin) {
        setEstado('sin-sala');
        return;
      }

      const r = await enlazar(codigo);
      if (!vivo) return;
      if (r.ok) {
        setEstado('listo');
        // Vuelta al juego sola: nadie quiere quedarse mirando una pantalla
        // de confirmación mientras la sala espera.
        const rol = useGameStore.getState().role;
        const fase = useGameStore.getState().phase;
        setTimeout(() => navigate(fase === 'lobby' || rol === 'host' ? '/lobby' : '/game'), 1500);
      } else {
        setEstado('error');
        setMensaje(r.message);
      }
    })();

    return () => { vivo = false; };
  }, [codigo, enlazar, recuperarSesion, navigate]);

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
            Crea tu sala y vuelve a escanear el código de la tele.
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
            onClick={() => navigate('/lobby')}
            className="mt-6 flex min-h-touch w-full max-w-xs items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 font-label-caps font-bold text-white active:scale-[0.98]"
          >
            VOLVER AL JUEGO
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

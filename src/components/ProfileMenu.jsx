import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useGameStore } from '../store/useGameStore';
import { useFontScale } from '../hooks/useFontScale';
import { ORIENTATION_HINTS, useOrientation } from '../hooks/useOrientation';
import AvatarPicker from './AvatarPicker';
import AlertDialog from './AlertDialog';
import { isImageAvatar } from '../data/characterAvatars';

function AvatarBubble({ avatar, fallback = 'person', className = 'h-8 w-8' }) {
  const isImage = isImageAvatar(avatar);
  return (
    <span className={`${className} overflow-hidden rounded-full border-2 border-electric-purple bg-electric-purple/20 flex items-center justify-center`}>
      {isImage ? (
        <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
      ) : avatar ? (
        <span className="px-1 text-lg font-black leading-none text-white">{avatar}</span>
      ) : (
        <span aria-hidden="true" className="material-symbols-outlined text-lg text-electric-purple">{fallback}</span>
      )}
    </span>
  );
}

// ── Menú de pausa ─────────────────────────────────────────────────────────
// Antes era un desplegable colgado del avatar: un botón "LETRA" suelto, una
// fila "ORIENTACIÓN · AUTOMÁTICO" y dos enlaces chicos, con mucho hueco
// muerto. Ahora es un menú de pausa de juego: en el móvil de pie, una hoja
// que sube desde abajo (se cierra deslizando hacia abajo); en apaisado o en
// pantallas anchas, un panel lateral a la derecha que ocupa todo el alto y
// scrollea por dentro si no cabe (nunca se recorta).

// Panel lateral cuando hay ancho de sobra o el móvil está apaisado (en
// apaisado una hoja inferior no tendría alto donde crecer).
const CONSULTA_PANEL = '(min-width: 768px), (orientation: landscape)';
function suscribirPanel(aviso) {
  const mq = window.matchMedia(CONSULTA_PANEL);
  mq.addEventListener('change', aviso);
  return () => mq.removeEventListener('change', aviso);
}
const leerPanel = () => window.matchMedia(CONSULTA_PANEL).matches;
function useEsPanelLateral() {
  return useSyncExternalStore(suscribirPanel, leerPanel, () => false);
}

// Las "A" van en px: muestran el tamaño real relativo de cada opción y no
// deben crecer con la propia escala de letra (a 320px con letra enorme
// desbordarían el botón).
const OPCIONES_LETRA = [
  { id: 'normal', etiqueta: 'Normal', muestra: 15 },
  { id: 'large', etiqueta: 'Grande', muestra: 21 },
  { id: 'xl', etiqueta: 'Enorme', muestra: 28 }
];

const OPCIONES_ORIENTACION = [
  { id: 'auto', etiqueta: 'Auto', icono: 'screen_rotation' },
  { id: 'vertical', etiqueta: 'Vertical', icono: 'stay_current_portrait' },
  { id: 'horizontal', etiqueta: 'Horizontal', icono: 'stay_current_landscape' }
];

const SELECTOR_FOCO = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Control segmentado accesible (radiogroup): un solo tabulador entra al
 * grupo y las flechas mueven la selección, como un selector nativo.
 */
function Segmentado({ etiqueta, idEtiqueta, opciones, valor, onCambiar, renderOpcion }) {
  const refs = useRef([]);
  const alTeclear = (evento, indice) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];
    if (!delta) return;
    evento.preventDefault();
    const siguiente = (indice + delta + opciones.length) % opciones.length;
    onCambiar(opciones[siguiente].id);
    refs.current[siguiente]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-labelledby={idEtiqueta}
      aria-label={idEtiqueta ? undefined : etiqueta}
      className="grid grid-cols-3 gap-1 rounded-2xl border border-white/8 bg-black/35 p-1"
    >
      {opciones.map((opcion, indice) => {
        const activa = valor === opcion.id;
        return (
          <button
            key={opcion.id}
            ref={(nodo) => { refs.current[indice] = nodo; }}
            type="button"
            role="radio"
            aria-checked={activa}
            tabIndex={activa ? 0 : -1}
            onClick={() => onCambiar(opcion.id)}
            onKeyDown={(evento) => alTeclear(evento, indice)}
            className={`relative flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 [@media(max-height:500px)]:min-h-[50px] [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:gap-1.5 [@media(max-height:500px)]:py-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-green ${
              activa
                ? 'bg-neon-green/15 text-neon-green shadow-[inset_0_0_0_2px_#39ff14,0_0_18px_rgba(57,255,20,0.25)]'
                : 'text-white/70 hover:bg-white/6 hover:text-white'
            }`}
          >
            {renderOpcion(opcion, activa)}
          </button>
        );
      })}
    </div>
  );
}

function TituloSeccion({ id, children, extra }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
      <h3 id={id} className="font-label-caps text-micro-caps uppercase text-on-surface-variant">{children}</h3>
      {extra}
    </div>
  );
}

export default function ProfileMenu({ user, guestAvatar }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  // Foco del editor: al abrir se lleva al campo de nombre, al cerrar vuelve
  // al boton que lo abrio. Sin esto, un usuario de teclado abre el modal y
  // el foco se queda detras, en la pagina, navegando lo que no se ve.
  const campoNombreRef = useRef(null);
  const disparadorRef = useRef(null);
  const panelRef = useRef(null);
  // Si el menú se cierra para abrir otra ventana (editor, confirmación,
  // otra pantalla), el foco no se devuelve al avatar: lo gestiona esa otra.
  const cederFocoRef = useRef(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const esPanelLateral = useEsPanelLateral();
  const reducirMovimiento = useReducedMotion();
  const controlesArrastre = useDragControls();
  const { scale, setScale } = useFontScale();
  const { mode: modoOrientacion, setMode: setModoOrientacion, waitingForRotation } = useOrientation();

  const hostCloseRoom = useGameStore((state) => state.hostCloseRoom);
  const guestLeaveRoom = useGameStore((state) => state.guestLeaveRoom);
  const updatePlayerProfile = useGameStore((state) => state.updatePlayerProfile);
  const role = useGameStore((state) => state.role);
  const guestId = useGameStore((state) => state.guestId);
  const players = useGameStore((state) => state.players);
  // profileName/profileAvatar del store: el perfil "de dispositivo" que se
  // guarda apenas se edita, ANTES de tener sala (guestId/currentPlayer
  // todavía no existen ahí). Sin este fallback, guardar un avatar nuevo
  // antes de crear/unirse a una sala no se veía reflejado en ningún lado
  // — parecía que "no guardaba" aunque sí había quedado guardado.
  const storedProfileName = useGameStore((state) => state.profileName);
  const storedProfileAvatar = useGameStore((state) => state.profileAvatar);
  const currentPlayer = players.find((player) => player.id === guestId);
  const canEditProfile = Boolean(guestId || user);
  const displayName = currentPlayer?.name || storedProfileName || user?.displayName || 'Jugador';
  const displayAvatar = currentPlayer?.avatar || storedProfileAvatar || user?.photoURL || guestAvatar;

  const cerrarMenu = useCallback(() => setIsOpen(false), []);

  // Abierto el menú: foco al primer control, Escape cierra, Tab no se escapa
  // del panel (trampa de foco sencilla) y al cerrar el foco vuelve al avatar.
  useEffect(() => {
    if (!isOpen) return undefined;
    cederFocoRef.current = false;
    const disparador = disparadorRef.current;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector(SELECTOR_FOCO)?.focus({ preventScroll: true });
    }, 30);
    const alPulsar = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const enfocables = [...panelRef.current.querySelectorAll(SELECTOR_FOCO)];
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault(); primero.focus();
      } else if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primero.focus();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', alPulsar);
      if (!cederFocoRef.current) disparador?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const handleSaveProfile = async () => {
    setProfileError('');
    setIsSaving(true);
    try {
      await updatePlayerProfile({ name: profileName, avatar: profileAvatar });
      setIsEditing(false);
    } catch (error) {
      setProfileError(error.message || 'No se pudo guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isEditing) return undefined;
    // Se captura el disparador al abrir: en la limpieza, `ref.current` ya
    // puede apuntar a otro nodo (o a null) y el foco se perderia.
    const disparador = disparadorRef.current;
    const t = window.setTimeout(() => campoNombreRef.current?.focus(), 60);
    const alPulsar = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setIsEditing(false); }
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', alPulsar);
      disparador?.focus();
    };
  }, [isEditing]);

  // El anfitrion no puede cerrar sesion de un toque: al cerrar la sala se
  // acaba la partida para todos los invitados a la vez. Un boton rojo con
  // la palabra "sesion" no comunica eso, asi que primero se pregunta.
  const pedirSalida = () => {
    if (role === 'host') {
      cederFocoRef.current = true;
      setIsOpen(false);
      setConfirmandoSalida(true);
      return;
    }
    salirDeVerdad();
  };

  const salirDeVerdad = async () => {
    cederFocoRef.current = true;
    setConfirmandoSalida(false);
    setIsOpen(false);
    localStorage.removeItem('auth_redirect_intent');
    localStorage.removeItem('auth_redirect_intent_time');

    if (role === 'host') {
      hostCloseRoom();
    } else if (role === 'guest') {
      guestLeaveRoom();
    }

    if (user) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Error signing out', err);
      }
    }
    navigate('/');
  };

  const openEditor = () => {
    setProfileName(displayName);
    setProfileAvatar(displayAvatar || '');
    setProfileError('');
    cederFocoRef.current = true;
    setIsOpen(false);
    setIsEditing(true);
  };

  const irAComoSeJuega = () => {
    cederFocoRef.current = true;
    setIsOpen(false);
    navigate('/how-to-play');
  };

  const etiquetaRol = role === 'host' ? 'ANFITRIÓN' : role === 'guest' ? 'INVITADO' : 'JUGADOR';
  const estiloRol = role === 'host'
    ? 'border-vinyl-orange/50 bg-vinyl-orange/15 text-vinyl-orange'
    : 'border-electric-purple/50 bg-electric-purple/15 text-[#c99bff]';
  const textoSalir = role === 'host' ? 'Cerrar la sala y salir' : role === 'guest' ? 'Salir de la partida' : 'Cerrar sesión';

  // Animación según el formato: la hoja sube desde abajo, el panel entra
  // desde la derecha. Con movimiento reducido, solo un fundido.
  const animPanel = reducirMovimiento
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : esPanelLateral
      ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: { type: 'spring', stiffness: 380, damping: 38 } }
      : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { type: 'spring', stiffness: 380, damping: 38 } };

  return (
    <>
      <div className="relative z-[200]">
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => {
              const next = !prev;
              if (next) {
                setProfileName(displayName);
                setProfileAvatar(displayAvatar || '');
                setProfileError('');
              }
              return next;
            });
          }}
          className="min-w-touch min-h-touch rounded-full flex items-center justify-center active:scale-95 transition-transform"
          ref={disparadorRef}
          aria-label="Menú de perfil"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          {/* 48 px fijos (no h-12 en rem): con la letra XL el rem lo inflaba
              y el circulo se salia de su caja tactil y chocaba con el logo. */}
          <AvatarBubble avatar={displayAvatar} className="h-[48px] w-[48px]" />
        </button>
      </div>

      {/* En portal a <body>: el header tiene backdrop-blur y atraparía
          cualquier position:fixed (ver nota del editor más abajo). */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="menu-pausa"
              className={`fixed inset-0 z-[300] flex bg-black/70 ${esPanelLateral ? 'items-stretch justify-end' : 'items-end justify-center'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducirMovimiento ? 0.1 : 0.18 }}
              onClick={cerrarMenu}
            >
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-pausa-titulo"
                {...animPanel}
                drag={esPanelLateral ? false : 'y'}
                dragListener={false}
                dragControls={controlesArrastre}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 500) cerrarMenu();
                }}
                onClick={(event) => event.stopPropagation()}
                className={`relative flex flex-col overflow-hidden border-white/10 bg-[#0d1326] shadow-[0_-20px_60px_rgba(0,0,0,0.7)] ${
                  esPanelLateral
                    ? 'h-full w-[min(420px,100vw)] border-l'
                    : 'max-h-[90dvh] w-full rounded-t-[28px] border-t'
                }`}
                style={{
                  backgroundImage: 'radial-gradient(120% 60% at 100% 0%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(90% 50% at 0% 100%, rgba(57,255,20,0.07), transparent 60%)'
                }}
              >
                {/* Cabecera: asa para arrastrar (solo hoja) + título + cerrar.
                    El arrastre arranca solo desde aquí, así el contenido
                    sigue pudiendo scrollear con el dedo. */}
                <div
                  className={`shrink-0 select-none ${esPanelLateral ? '' : 'cursor-grab touch-none'}`}
                  onPointerDown={(event) => { if (!esPanelLateral) controlesArrastre.start(event); }}
                  style={{ paddingTop: esPanelLateral ? 'env(safe-area-inset-top, 0px)' : undefined }}
                >
                  {!esPanelLateral && (
                    <div className="flex justify-center pt-2.5" aria-hidden="true">
                      <span className="h-1.5 w-11 rounded-full bg-white/25" />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 pl-5 pr-3 pt-1.5 [@media(max-height:500px)]:pt-1">
                    <h2 id="menu-pausa-titulo" className="flex items-center gap-2 font-label-caps text-base font-black uppercase tracking-[0.2em] text-white">
                      <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-neon-green">pause</span>
                      Pausa
                    </h2>
                    <button
                      type="button"
                      onClick={cerrarMenu}
                      aria-label="Cerrar menú"
                      className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-white/8 text-white transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-green"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                  </div>
                </div>

                {/* Contenido: lo único que scrollea. */}
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2"
                  style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
                >
                  {/* Tarjeta del jugador */}
                  <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-electric-purple/25 via-[#121a33] to-[#0b1022] p-3.5 [@media(max-height:500px)]:p-2.5">
                    <div className="flex items-center gap-3">
                      <span className="relative shrink-0 rounded-full p-[3px] shadow-[0_0_22px_rgba(168,85,247,0.45)]" style={{ background: 'conic-gradient(from 200deg, #39ff14, #a855f7, #ff7a1a, #39ff14)' }}>
                        <AvatarBubble avatar={displayAvatar} className={`h-[68px] w-[68px] ${'[@media(max-height:500px)]:'}h-[56px] ${'[@media(max-height:500px)]:'}w-[56px] !border-[3px] !border-[#0d1326]`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-headline-lg text-[min(1.35rem,26px)] font-black leading-tight text-white">{displayName}</p>
                        {/* Rol y Editar en la misma fila: si no caben (letra
                            enorme en 320px), Editar baja sin empujar al nombre. */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-label-caps text-micro-caps ${estiloRol}`}>
                            {etiquetaRol}
                          </span>
                          {canEditProfile && (
                            <button
                              type="button"
                              onClick={openEditor}
                              aria-label="Editar perfil"
                              className="ml-auto flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-neon-green/45 bg-neon-green/10 px-3 font-label-caps text-[min(0.875rem,16px)] font-black uppercase tracking-[0.12em] text-neon-green transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-green"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {!canEditProfile && (
                      <p className="mt-3 text-sm leading-snug text-on-surface-variant">
                        Entra con Google o crea una sala para editar nombre y avatar.
                      </p>
                    )}
                  </section>

                  {/* Ajustes */}
                  <section className="mt-5 [@media(max-height:500px)]:mt-3">
                    <TituloSeccion id="menu-letra-titulo">Tamaño de letra</TituloSeccion>
                    <Segmentado
                      idEtiqueta="menu-letra-titulo"
                      opciones={OPCIONES_LETRA}
                      valor={scale}
                      onCambiar={setScale}
                      renderOpcion={(opcion) => (
                        <>
                          <span aria-hidden="true" className="flex h-[30px] items-end font-headline-lg font-black leading-none [@media(max-height:500px)]:h-auto [@media(max-height:500px)]:items-center" style={{ fontSize: opcion.muestra }}>A</span>
                          <span className="max-w-full truncate font-label-caps text-[min(0.75rem,14px)] font-bold uppercase tracking-[0.06em]">{opcion.etiqueta}</span>
                        </>
                      )}
                    />
                  </section>

                  <section className="mt-5 [@media(max-height:500px)]:mt-3">
                    <TituloSeccion
                      id="menu-orientacion-titulo"
                      extra={(
                        <span className={`min-w-0 truncate text-[0.8rem] ${waitingForRotation ? 'text-chaos-gold' : 'text-on-surface-variant/80'}`} aria-live="polite">
                          {waitingForRotation ? 'Gira el móvil' : ORIENTATION_HINTS[modoOrientacion]}
                        </span>
                      )}
                    >
                      Orientación
                    </TituloSeccion>
                    <Segmentado
                      idEtiqueta="menu-orientacion-titulo"
                      opciones={OPCIONES_ORIENTACION}
                      valor={modoOrientacion}
                      onCambiar={setModoOrientacion}
                      renderOpcion={(opcion) => (
                        <>
                          <span aria-hidden="true" className="material-symbols-outlined flex h-[30px] items-center text-[26px] leading-none [@media(max-height:500px)]:h-auto [@media(max-height:500px)]:text-[22px]">{opcion.icono}</span>
                          <span className="max-w-full truncate font-label-caps text-[min(0.75rem,14px)] font-bold uppercase tracking-[0.03em]">{opcion.etiqueta}</span>
                        </>
                      )}
                    />
                  </section>

                  {/* Acciones */}
                  <section className="mt-6 grid gap-2.5 [@media(max-height:500px)]:mt-4 [@media(max-height:500px)]:grid-cols-2">
                    <button
                      type="button"
                      onClick={irAComoSeJuega}
                      className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2 text-left font-label-caps text-[min(1rem,19px)] font-black uppercase leading-tight tracking-[0.1em] text-white transition-colors hover:bg-white/8 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-green"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-vinyl-orange">help</span>
                      <span className="min-w-0 flex-1">Cómo se juega</span>
                      {/* Envoltorio: la regla global de los iconos fuerza display y anularía el hidden. */}
                      <span aria-hidden="true" className="flex [@media(max-height:500px)]:hidden">
                        <span className="material-symbols-outlined text-[20px] text-white/40">arrow_forward</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={pedirSalida}
                      className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-intense-red/55 bg-intense-red/10 px-4 py-2 text-left font-label-caps text-[min(1rem,19px)] font-black uppercase leading-tight tracking-[0.1em] text-intense-red transition-colors hover:bg-intense-red/18 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-intense-red"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[24px]">logout</span>
                      <span className="min-w-0 flex-1">{textoSalir}</span>
                    </button>
                  </section>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AlertDialog
        open={confirmandoSalida}
        tone="warning"
        title="¿Cerrar la sala?"
        message="Se acabará la partida para todos los jugadores conectados. Esto no se puede deshacer."
        confirmLabel="SÍ, CERRAR LA SALA"
        cancelLabel="SEGUIR JUGANDO"
        destructive
        onConfirm={salirDeVerdad}
        onClose={() => setConfirmandoSalida(false)}
      />

      {/* Editor de perfil en pantalla completa, no en el desplegable chico
          de arriba — antes GUARDAR quedaba al fondo de un panel angosto,
          debajo del selector de avatar, y costaba encontrarlo ("muy
          escondido"). Ahora el pie con CANCELAR/GUARDAR es fijo (no
          scrollea con el contenido) — siempre está a la vista, sin
          importar cuánto haya que bajar para elegir personaje.

          Va en un portal a <body> a propósito: este componente se renderiza
          dentro del <header fixed> de cada pantalla, y ese header tiene
          backdrop-blur. Un ancestro con backdrop-filter (igual que uno con
          transform) se vuelve el bloque contenedor de sus descendientes
          position:fixed — sin el portal, este `fixed inset-0` se resolvía
          contra la franja de 64px del header en vez del viewport y el
          editor aparecía aplastado ahí arriba, mostrando solo el pie con
          GUARDAR. */}
      {createPortal(
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[310] flex items-end justify-center bg-black/85 sm:items-center"
              onClick={() => setIsEditing(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="editar-perfil-titulo"
            >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-surface-container sm:max-h-[85dvh] sm:w-full sm:max-w-md sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Encabezado — fijo, no scrollea */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
                <h2 id="editar-perfil-titulo" className="font-label-caps text-lg font-black tracking-wide text-white">EDITAR PERFIL</h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  aria-label="Cerrar"
                  className="flex min-h-touch min-w-touch items-center justify-center rounded-full bg-white/8 text-white active:scale-90"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Contenido — esto es lo único que scrollea */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                <label htmlFor="perfil-nombre" className="font-label-caps text-sm tracking-[0.16em] text-on-surface-variant">
                  Nombre visible
                </label>
                <input
                  id="perfil-nombre"
                  ref={campoNombreRef}
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={18}
                  aria-describedby={profileError ? 'perfil-error' : undefined}
                  className="mt-1.5 h-14 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xl font-black text-white outline-none focus:border-neon-green/60"
                />

                <label className="mt-4 block font-label-caps text-sm tracking-[0.16em] text-on-surface-variant">
                  Tu personaje
                </label>
                <AvatarPicker value={profileAvatar} onChange={setProfileAvatar} className="mt-1.5" />

                {profileError && <p id="perfil-error" role="alert" className="mt-3 text-sm text-intense-red">{profileError}</p>}
              </div>

              {/* Pie — fijo, siempre visible, nunca hay que scrollear para
                  encontrar GUARDAR. */}
              <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="min-h-touch rounded-xl border border-white/10 bg-white/5 font-label-caps text-base font-bold text-white active:scale-95 transition-transform"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="min-h-touch rounded-xl bg-neon-green font-label-caps text-base font-black text-black shadow-[0_0_20px_rgba(57,255,20,0.35)] active:scale-95 transition-transform disabled:opacity-60"
                >
                  {isSaving ? 'GUARDANDO' : 'GUARDAR'}
                </button>
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

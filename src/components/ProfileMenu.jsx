import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useGameStore } from '../store/useGameStore';
import FontSizeControl from './FontSizeControl';
import OrientationControl from './OrientationControl';
import AvatarPicker from './AvatarPicker';
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
        <span className="material-symbols-outlined text-lg text-electric-purple">{fallback}</span>
      )}
    </span>
  );
}

export default function ProfileMenu({ user, guestAvatar }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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

  const handleLogout = async () => {
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
    setIsOpen(false);
    setIsEditing(true);
  };

  return (
    <>
      <div className="relative z-[200]" ref={menuRef}>
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
          aria-label="Menu de perfil"
          aria-expanded={isOpen}
        >
          <AvatarBubble avatar={displayAvatar} className="h-14 w-14" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 right-0 w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(34rem,calc(100dvh-6rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-surface-container/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              <div className="border-b border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <AvatarBubble avatar={displayAvatar} className="h-24 w-24 border-[3px]" />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-white">{displayName}</p>
                    <p className="mt-0.5 truncate font-label-caps text-xs text-on-surface-variant">
                      {role === 'host' ? 'ANFITRION' : 'INVITADO'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <div className="mb-1 rounded-xl px-3 py-2.5">
                  <FontSizeControl className="justify-between" />
                </div>
                <div className="mb-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                  <span className="font-label-caps text-[0.65rem] tracking-[0.14em] text-on-surface-variant">
                    ORIENTACIÓN
                  </span>
                  <OrientationControl />
                </div>
                {canEditProfile ? (
                  <button
                    type="button"
                    onClick={openEditor}
                    className="flex min-h-touch w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-white transition-colors hover:bg-white/8 active:bg-white/10"
                  >
                    <span className="material-symbols-outlined text-[1.2rem] text-neon-green">edit</span>
                    Editar perfil
                  </button>
                ) : (
                  <p className="rounded-xl px-3 py-3 text-sm leading-relaxed text-on-surface-variant">
                    Entra con Google o crea una sala para editar nombre y avatar.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-touch w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-intense-red transition-colors hover:bg-intense-red/10 active:bg-intense-red/15"
                >
                  <span className="material-symbols-outlined text-[1.2rem]">logout</span>
                  Cerrar sesion
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              className="fixed inset-0 z-[310] flex items-end justify-center bg-black/85 backdrop-blur-sm sm:items-center"
              onClick={() => setIsEditing(false)}
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
                <p className="font-label-caps text-lg font-black tracking-wide text-white">EDITAR PERFIL</p>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  aria-label="Cerrar"
                  className="flex min-h-touch min-w-touch items-center justify-center rounded-full bg-white/8 text-white active:scale-90"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Contenido — esto es lo único que scrollea */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                <label className="font-label-caps text-sm tracking-[0.16em] text-on-surface-variant">
                  Nombre visible
                </label>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={18}
                  className="mt-1.5 h-14 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xl font-black text-white outline-none focus:border-neon-green/60"
                />

                <label className="mt-4 block font-label-caps text-sm tracking-[0.16em] text-on-surface-variant">
                  Tu personaje
                </label>
                <AvatarPicker value={profileAvatar} onChange={setProfileAvatar} className="mt-1.5" />

                {profileError && <p className="mt-3 text-sm text-intense-red">{profileError}</p>}
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

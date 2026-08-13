import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useGameStore } from '../store/useGameStore';
import { resetSpotifyConnection } from '../services/spotify';

const QUICK_AVATARS = ['DJ', 'VIP', 'POP', '90s', 'ROCK', 'GO'];

function AvatarBubble({ avatar, fallback = 'person', className = 'h-8 w-8' }) {
  const isImage = avatar?.startsWith?.('http');
  return (
    <span className={`${className} overflow-hidden rounded-full border-2 border-electric-purple bg-electric-purple/20 flex items-center justify-center`}>
      {isImage ? (
        <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
      ) : avatar ? (
        <span className="px-1 text-[10px] font-black leading-none text-white">{avatar}</span>
      ) : (
        <span className="material-symbols-outlined text-sm text-electric-purple">{fallback}</span>
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
  const currentPlayer = players.find((player) => player.id === guestId);
  const canEditProfile = Boolean(guestId);
  const displayName = currentPlayer?.name || user?.displayName || 'Jugador';
  const displayAvatar = currentPlayer?.avatar || user?.photoURL || guestAvatar;

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
      resetSpotifyConnection();
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

  return (
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
        <AvatarBubble avatar={displayAvatar} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-12 right-0 w-72 overflow-hidden rounded-2xl border border-white/10 bg-surface-container/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="border-b border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <AvatarBubble avatar={displayAvatar} className="h-11 w-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{displayName}</p>
                  <p className="mt-0.5 truncate font-label-caps text-[10px] text-on-surface-variant">
                    {role === 'host' ? 'ANFITRION' : 'INVITADO'}
                  </p>
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="p-3">
                <label className="font-label-caps text-[10px] tracking-[0.18em] text-on-surface-variant">
                  Nombre visible
                </label>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={18}
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-neon-green/60"
                />

                <label className="mt-3 block font-label-caps text-[10px] tracking-[0.18em] text-on-surface-variant">
                  Avatar corto o URL
                </label>
                <input
                  value={profileAvatar}
                  onChange={(event) => setProfileAvatar(event.target.value)}
                  maxLength={80}
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-electric-purple/60"
                  placeholder="DJ, VIP, 90s o una URL"
                />

                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {QUICK_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setProfileAvatar(avatar)}
                      className="h-9 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black text-white active:scale-95"
                    >
                      {avatar}
                    </button>
                  ))}
                </div>

                {profileError && <p className="mt-2 text-xs text-intense-red">{profileError}</p>}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="min-h-touch rounded-xl border border-white/10 bg-white/5 font-label-caps text-xs font-bold text-white"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="min-h-touch rounded-xl bg-neon-green font-label-caps text-xs font-black text-black disabled:opacity-60"
                  >
                    {isSaving ? 'GUARDANDO' : 'GUARDAR'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2">
                {canEditProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex min-h-touch w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-white transition-colors hover:bg-white/8 active:bg-white/10"
                  >
                    <span className="material-symbols-outlined text-[1.2rem] text-neon-green">edit</span>
                    Editar perfil
                  </button>
                ) : (
                  <p className="rounded-xl px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
                    Podras editar nombre y avatar cuando la sala este creada.
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

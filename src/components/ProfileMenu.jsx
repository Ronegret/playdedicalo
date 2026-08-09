import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useGameStore } from '../store/useGameStore';
import { resetSpotifyConnection } from '../services/spotify';

export default function ProfileMenu({ user, guestAvatar }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  const hostCloseRoom = useGameStore((state) => state.hostCloseRoom);
  const guestLeaveRoom = useGameStore((state) => state.guestLeaveRoom);
  const role = useGameStore((state) => state.role);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
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

  const handleLogout = async () => {
    setIsOpen(false);

    localStorage.removeItem('auth_redirect_intent');
    localStorage.removeItem('auth_redirect_intent_time');

    // Cleanup game state based on role
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
        onClick={() => setIsOpen((prev) => !prev)}
        className="min-w-touch min-h-touch rounded-full flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Menú de perfil"
        aria-expanded={isOpen}
      >
        <span className="w-8 h-8 rounded-full border-2 border-electric-purple overflow-hidden flex items-center justify-center bg-electric-purple/20">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : guestAvatar ? (
            <span className="text-sm leading-none">{guestAvatar}</span>
          ) : (
            <span className="material-symbols-outlined text-sm text-electric-purple">person</span>
          )}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-12 right-0 w-48 rounded-2xl border border-white/10 bg-surface-container/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="p-3 border-b border-white/10 bg-white/5">
              <p className="text-xs font-bold text-white truncate">
                {user?.displayName || 'Jugador'}
              </p>
              <p className="text-[10px] text-on-surface-variant font-label-caps truncate mt-0.5">
                {role === 'host' ? 'ANFITRIÓN' : 'INVITADO'}
              </p>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-touch flex items-center gap-2 px-3 rounded-xl text-left text-sm font-bold text-intense-red hover:bg-intense-red/10 active:bg-intense-red/15 transition-colors"
              >
                <span className="material-symbols-outlined text-[1.2rem]">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

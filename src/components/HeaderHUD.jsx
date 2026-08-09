import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RECONNECT_GRACE_MS, useGameStore } from '../store/useGameStore';
import ProfileMenu from './ProfileMenu';
import { auth } from '../firebase';

// 🟢 online · 🟡 offline pero dentro del margen de gracia (llamada, pantalla
// bloqueada, wifi cortado) · 🔴 offline hace más de RECONNECT_GRACE_MS.
function getPresence(player, now) {
  if (player.status !== 'offline') return 'online';
  const elapsed = now - Number(player.lastSeenAt || 0);
  return elapsed < RECONNECT_GRACE_MS ? 'reconnecting' : 'offline';
}

const PRESENCE_STYLES = {
  online: { dot: 'bg-neon-green', ring: 'border-primary', label: 'Conectado' },
  reconnecting: { dot: 'bg-chaos-gold animate-pulse', ring: 'border-chaos-gold/70', label: 'Reconectando…' },
  offline: { dot: 'bg-on-surface-variant/60', ring: 'border-surface-variant opacity-50', label: 'Desconectado' }
};

function PlayerAvatar({ player, presence, size = 'w-6 h-6' }) {
  const initials = (player.name || '?').substring(0, 2).toUpperCase();
  const styles = PRESENCE_STYLES[presence];
  return (
    <div className={`relative ${size} shrink-0`}>
      <div className={`h-full w-full rounded-full overflow-hidden border ${styles.ring}`}>
        {player.avatar?.startsWith?.('http') ? (
          <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-surface-bright flex items-center justify-center text-[8px] font-bold text-on-surface">
            {initials}
          </div>
        )}
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-surface ${styles.dot}`} />
    </div>
  );
}

export default function HeaderHUD({ onExit }) {
  const players = useGameStore((state) => state.players) || [];
  const pin = useGameStore((state) => state.pin);
  const phase = useGameStore((state) => state.phase);
  const role = useGameStore((state) => state.role);
  const round = useGameStore((state) => state.round);
  const guestId = useGameStore((state) => state.guestId);
  const guestAvatar = useGameStore((state) => state.guestAvatar);
  const [rosterOpen, setRosterOpen] = useState(false);
  // Re-render every few seconds so a player's dot flips from 🟡 a 🔴 once the
  // grace period elapses, without needing a fresh write from Firebase.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(interval);
  }, []);

  // If we are not in a room, don't show the HUD
  if (!pin || phase === 'lobby' || phase === 'final') return null;

  const ownPlayer = players.find((player) => player.id === guestId);
  const onlineCount = players.filter((player) => getPresence(player, now) !== 'offline').length;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-surface/80 backdrop-blur-xl border-b border-white/10 shadow-md">
      <div className="pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between gap-2 px-2 min-h-[56px]">
          <div className="flex items-center gap-2 min-w-0">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                aria-label={role === 'host' ? 'Cancelar partida' : 'Salir de la partida'}
                className="min-w-touch min-h-touch shrink-0 rounded-xl text-on-surface-variant font-label-caps text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-xl leading-none">arrow_back</span>
              </button>
            )}
            <span className="text-[10px] font-label-caps text-on-surface-variant tracking-widest border-l border-white/10 pl-2 shrink-0">
              SALA {pin}
            </span>
          </div>

          <div className="flex-1 flex justify-center text-center px-1 min-w-0">
            <div className="min-w-0">
              <p className="font-label-caps text-xs text-neon-green">RONDA {round}</p>
              <p className="font-label-caps text-[10px] text-on-surface-variant truncate">AÑOS LOCOS</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRosterOpen((prev) => !prev)}
              aria-expanded={rosterOpen}
              aria-label="Ver jugadores conectados"
              className="min-h-touch rounded-full border border-white/10 bg-black/20 pl-1.5 pr-2.5 flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="h-2 w-2 rounded-full bg-neon-green" />
              <span className="font-label-caps text-[10px] text-white">{onlineCount}/{players.length}</span>
            </button>

            <div className="text-right">
              <p className="font-label-caps text-[9px] text-on-surface-variant leading-none">PTS</p>
              <p className="font-label-caps text-sm font-black text-neon-green leading-none mt-0.5">{ownPlayer?.points ?? 0}</p>
            </div>

            <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rosterOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar lista de jugadores"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRosterOpen(false)}
              className="fixed inset-0 z-[99] bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-2 top-[calc(56px+env(safe-area-inset-top,0px)+6px)] z-[101] w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-container/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-2"
            >
              <p className="px-2 py-1 font-label-caps text-[10px] text-on-surface-variant tracking-widest">JUGADORES</p>
              <div className="flex flex-col gap-1">
                {players.map((player) => {
                  const presence = getPresence(player, now);
                  const styles = PRESENCE_STYLES[presence];
                  return (
                    <div key={player.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                      <PlayerAvatar player={player} presence={presence} size="w-8 h-8" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{player.name}{player.id === guestId ? ' (tú)' : ''}</p>
                        <p className="text-[10px] text-on-surface-variant">{styles.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

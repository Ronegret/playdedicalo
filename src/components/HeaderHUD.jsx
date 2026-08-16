import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getPlayerPresence, useGameStore } from '../store/useGameStore';
import ProfileMenu from './ProfileMenu';
import { auth } from '../firebase';

const PRESENCE_STYLES = {
  online: { dot: 'bg-neon-green', ring: 'border-primary', label: 'Conectado' },
  reconnecting: { dot: 'bg-chaos-gold animate-pulse', ring: 'border-chaos-gold/70', label: 'Reconectando' },
  kicked: { dot: 'bg-on-surface-variant/60', ring: 'border-surface-variant opacity-50', label: 'Fuera' },
  offline: { dot: 'bg-on-surface-variant/60', ring: 'border-surface-variant opacity-50', label: 'Fuera' }
};

function PlayerAvatar({ player, presence, size = 'w-6 h-6' }) {
  const initials = (player.name || '?').substring(0, 2).toUpperCase();
  const styles = PRESENCE_STYLES[presence] || PRESENCE_STYLES.offline;
  return (
    <div className={`relative ${size} shrink-0`}>
      <div className={`h-full w-full overflow-hidden rounded-full border ${styles.ring}`}>
        {player.avatar?.startsWith?.('http') ? (
          <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-bright text-xs font-bold text-on-surface">
            {player.avatar || initials}
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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!pin || phase === 'lobby' || phase === 'final') return null;

  const ownPlayer = players.find((player) => player.id === guestId);
  const activeCount = players.filter((player) => getPlayerPresence(player, now).status !== 'kicked').length;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-surface/80 shadow-md backdrop-blur-xl">
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex min-h-[64px] items-center justify-between gap-1 px-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                aria-label={role === 'host' ? 'Cancelar partida' : 'Salir de la partida'}
              className="min-h-touch min-w-touch shrink-0 rounded-xl text-on-surface-variant font-label-caps text-xs flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform hover:text-white"
              >
                <span className="material-symbols-outlined text-xl leading-none">arrow_back</span>
              </button>
            )}
            <span className="hidden shrink-0 border-l border-white/10 pl-2.5 font-label-caps text-[11px] tracking-widest text-on-surface-variant sm:inline-block">
              SALA {pin}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 justify-center text-center">
            <div className="min-w-0">
              <p className="font-label-caps text-sm text-neon-green">RONDA {round}</p>
              <p className="truncate font-label-caps text-xs text-on-surface-variant">AÑOS LOCOS</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRosterOpen((prev) => !prev)}
              aria-expanded={rosterOpen}
              aria-label="Ver jugadores conectados"
              className="min-h-touch shrink-0 rounded-full border border-white/10 bg-black/20 pl-2 pr-2.5 flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-neon-green" />
              <span className="font-label-caps text-xs text-white">{activeCount}/{players.length}</span>
            </button>

            <div className="shrink-0 text-right leading-none">
              <p className="font-label-caps text-xs text-on-surface-variant">PTS</p>
              <p className="mt-0.5 font-label-caps text-base font-black text-neon-green">{ownPlayer?.points ?? 0}</p>
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
              className="absolute right-2 top-[calc(64px+env(safe-area-inset-top,0px)+18px)] z-[101] max-h-[60vh] w-72 overflow-y-auto rounded-2xl border border-white/10 bg-surface-container/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <p className="px-2 py-1 font-label-caps text-xs tracking-widest text-on-surface-variant">JUGADORES</p>
              <div className="flex flex-col gap-1">
                {players.map((player) => {
                  const presence = getPlayerPresence(player, now);
                  const styles = PRESENCE_STYLES[presence.status] || PRESENCE_STYLES.offline;
                  const seconds = Math.ceil((presence.remainingMs || 0) / 1000);
                  return (
                    <div key={player.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                      <PlayerAvatar player={player} presence={presence.status} size="w-8 h-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{player.name}{player.id === guestId ? ' (tu)' : ''}</p>
                        <p className="text-xs text-on-surface-variant">
                          {presence.status === 'reconnecting' ? `${styles.label} ${seconds}s` : styles.label}
                        </p>
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

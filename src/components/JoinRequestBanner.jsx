import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';

// Alguien pidió unirse a la sala después de que la partida ya empezó — solo
// el anfitrión lo ve (en GameScreen o ResultScreen, donde sea que esté) y
// decide si lo suma ahora o no. Se muestra de a uno (en cola) para no
// amontonar varias tarjetas superpuestas si piden entrar juntos.
export default function JoinRequestBanner() {
  const role = useGameStore((state) => state.role);
  const joinRequests = useGameStore((state) => state.joinRequests);
  const approveJoinRequest = useGameStore((state) => state.approveJoinRequest);
  const denyJoinRequest = useGameStore((state) => state.denyJoinRequest);
  const [busyId, setBusyId] = useState('');

  if (role !== 'host') return null;

  const pending = (joinRequests || []).filter((request) => request.status !== 'denied');
  const request = pending[0];

  return (
    <AnimatePresence>
      {request && (
        <motion.div
          key={request.id}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed top-20 inset-x-0 z-[295] flex justify-center px-5"
        >
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-neon-green/50 bg-[#0e1a10]/95 backdrop-blur-lg p-3 shadow-[0_0_40px_rgba(57,255,20,0.18)]">
            {isImageAvatar(request.avatar) ? (
              <img src={request.avatar} alt={request.name} className="h-12 w-12 shrink-0 rounded-full border-2 border-neon-green/60 object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/25 text-2xl">{request.avatar || '•'}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{request.name}</p>
              <p className="text-xs text-on-surface-variant">
                Quiere sumarse a la partida
                {pending.length > 1 && ` · +${pending.length - 1} esperando`}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={async () => {
                setBusyId(request.id);
                try {
                  await denyJoinRequest(request.id);
                } finally {
                  setBusyId('');
                }
              }}
              aria-label={`Rechazar a ${request.name}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 border border-white/10 text-white active:scale-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={async () => {
                setBusyId(request.id);
                try {
                  await approveJoinRequest(request.id);
                } finally {
                  setBusyId('');
                }
              }}
              aria-label={`Aceptar a ${request.name}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-green text-black active:scale-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">check</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

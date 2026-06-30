import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const KIND_STYLES = {
  free: 'bg-vinyl-orange/20 border-vinyl-orange text-vinyl-orange',
  realIdle: 'bg-white/5 border-white/10 text-on-surface-variant',
  realEligible: 'bg-neon-green/15 border-neon-green/60 text-neon-green shadow-[0_0_18px_rgba(57,255,20,0.25)]',
  social: 'bg-electric-purple/10 border-electric-purple/40 text-electric-purple',
  marked: 'bg-neon-green border-neon-green text-black'
};

function BingoCell({ cell, marked, eligible, onTap }) {
  const isFree = cell.kind === 'free';
  const isTappable = !marked && !isFree;

  let styleClass = KIND_STYLES.realIdle;
  if (marked) styleClass = KIND_STYLES.marked;
  else if (isFree) styleClass = KIND_STYLES.free;
  else if (cell.kind === 'social') styleClass = KIND_STYLES.social;
  else if (eligible) styleClass = KIND_STYLES.realEligible;

  return (
    <motion.button
      type="button"
      disabled={!isTappable}
      onClick={() => isTappable && onTap(cell)}
      whileTap={isTappable ? { scale: 0.92 } : undefined}
      animate={marked ? { scale: [1, 1.25, 1], rotate: [0, -6, 0] } : { scale: 1, rotate: 0 }}
      transition={{ duration: 0.4, ease: 'backOut' }}
      className={`relative aspect-square rounded-lg border p-1 flex items-center justify-center text-center transition-colors ${styleClass} ${eligible && !marked ? 'animate-pulse' : ''}`}
    >
      {isFree ? (
        <span className="material-symbols-outlined text-xl sm:text-2xl">star</span>
      ) : (
        <span className="uppercase text-[7px] sm:text-[8px] font-label-caps leading-tight line-clamp-4">{cell.label}</span>
      )}
      {marked && !isFree && (
        <span className="material-symbols-outlined absolute -top-1.5 -right-1.5 text-base bg-black rounded-full text-neon-green drop-shadow-[0_0_6px_rgba(57,255,20,0.8)]">
          check_circle
        </span>
      )}
    </motion.button>
  );
}

export default function BingoCard({ card = [], marked = [], eligibleIndices, onMarkCell }) {
  const [pendingCell, setPendingCell] = useState(null);

  const handleTap = (cell) => {
    setPendingCell(cell);
  };

  const handleConfirm = () => {
    if (!pendingCell) return;
    onMarkCell(pendingCell.index);
    setPendingCell(null);
  };

  return (
    <>
      <div className="grid grid-cols-5 gap-1.5 w-full max-w-[420px] mx-auto">
        {card.map((cell, index) => (
          <BingoCell
            key={cell.id}
            cell={{ ...cell, index }}
            marked={Boolean(marked[index])}
            eligible={eligibleIndices?.has?.(index)}
            onTap={handleTap}
          />
        ))}
      </div>

      <AnimatePresence>
        {pendingCell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0"
            onClick={() => setPendingCell(null)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-container p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`rounded-xl border p-4 mb-4 ${pendingCell.kind === 'social' ? 'border-electric-purple/50 bg-electric-purple/10 text-electric-purple' : 'border-neon-green/50 bg-neon-green/10 text-neon-green'}`}>
                <p className="font-label-caps text-[9px] opacity-70">
                  {pendingCell.kind === 'social' ? 'CASILLA SOCIAL · POR HONOR' : '¡SONÓ! · CASILLA MUSICAL'}
                </p>
                <h3 className="mt-1 text-lg font-black text-white leading-tight">{pendingCell.label}</h3>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                {pendingCell.kind === 'social'
                  ? '¿Pasó de verdad? Márcala solo si lo viste con tus propios ojos.'
                  : 'Confirma para marcar esta casilla de tu cartón.'}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirm}
                  className="w-full h-14 rounded-xl bg-neon-green text-black font-label-caps text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  MARCAR CASILLA
                </button>
                <button
                  onClick={() => setPendingCell(null)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-sm font-bold active:scale-95 transition-transform"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

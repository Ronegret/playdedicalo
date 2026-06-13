import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export default function MusicVinylControl() {
  const { role, pin, isAudioPlaying, togglePlay } = useGameStore((state) => ({
    role: state.role,
    pin: state.pin,
    isAudioPlaying: state.isAudioPlaying,
    togglePlay: state.togglePlay
  }));

  if (!role || !pin) return null;

  const canControl = role === 'host';

  return (
    <div className="fixed top-20 right-3 z-50 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={canControl ? togglePlay : undefined}
        disabled={!canControl}
        className={`relative w-14 h-14 rounded-full bg-black border border-white/15 shadow-[0_0_20px_rgba(189,0,255,0.25)] flex items-center justify-center ${canControl ? 'active:scale-95' : 'cursor-default'}`}
        aria-label={isAudioPlaying ? 'Parar musica de la sala' : 'Marcar musica en play'}
      >
        <motion.div
          animate={isAudioPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={isAudioPlaying ? { repeat: Infinity, duration: 2.2, ease: 'linear' } : { duration: 0.2 }}
          className="absolute inset-1 rounded-full border-[6px] border-neutral-800 bg-[radial-gradient(circle,#222_0_18%,#060606_19%_100%)]"
        >
          <div className="absolute inset-2 rounded-full border border-white/10" />
          <div className="absolute inset-4 rounded-full bg-neon-green" />
        </motion.div>
        <span className="relative z-10 material-symbols-outlined text-black text-base">
          {isAudioPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
      <span className={`rounded-full px-2 py-1 text-[9px] font-label-caps border ${isAudioPlaying ? 'border-neon-green/40 bg-neon-green/10 text-neon-green' : 'border-white/10 bg-black/40 text-on-surface-variant'}`}>
        {canControl ? (isAudioPlaying ? 'STOP' : 'PLAY') : (isAudioPlaying ? 'PLAY' : 'STOP')}
      </span>
    </div>
  );
}

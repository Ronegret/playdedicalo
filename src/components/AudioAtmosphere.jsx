import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { motion } from 'framer-motion';

export default function AudioAtmosphere() {
  const audioRef = useRef(null);
  const { isAudioPlaying, isAudioMuted, togglePlay, toggleMute, role } = useGameStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioPlaying) {
      audio.play().catch(console.warn);
    } else {
      audio.pause();
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isAudioMuted;
  }, [isAudioMuted]);

  return (
    <>
      <audio 
        ref={audioRef} 
        src="/DEDICALO.mp3" 
        loop 
        style={{ display: 'none' }} 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 left-4 z-40 flex gap-2"
      >
        <button 
          onClick={toggleMute}
          aria-label={isAudioMuted ? 'Activar sonido ambiente' : 'Silenciar sonido ambiente'}
          className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center justify-center text-on-surface/80 hover:text-neon-green hover:border-neon-green/40 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">
            {isAudioMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>
        {role === 'host' && (
          <button 
            onClick={togglePlay}
            aria-label={isAudioPlaying ? 'Pausar ambiente' : 'Reproducir ambiente'}
            className={`w-9 h-9 rounded-full bg-black/35 backdrop-blur-md border ${isAudioPlaying ? 'border-neon-green text-neon-green' : 'border-white/10 text-on-surface/80'} flex items-center justify-center hover:bg-white/5 transition-colors`}
          >
            <span className="material-symbols-outlined text-lg">
              {isAudioPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        )}
      </motion.div>
    </>
  );
}

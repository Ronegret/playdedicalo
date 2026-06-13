import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { pauseSpotifyPlayback, startRandomPlaylistTrack } from '../services/spotify';

export default function MusicVinylControl() {
  const [error, setError] = useState('');
  const { role, pin, isAudioPlaying, spotifyPlaylistUrl, setAudioPlaying } = useGameStore((state) => ({
    role: state.role,
    pin: state.pin,
    isAudioPlaying: state.isAudioPlaying,
    spotifyPlaylistUrl: state.spotifyPlaylistUrl,
    setAudioPlaying: state.setAudioPlaying
  }));

  if (!role || !pin) return null;

  const canControl = role === 'host';
  const handleToggle = async () => {
    if (!canControl) return;
    setError('');

    if (isAudioPlaying) {
      await pauseSpotifyPlayback().catch((error) => console.warn('No se pudo pausar Spotify:', error));
      setAudioPlaying(false);
      return;
    }

    try {
      await startRandomPlaylistTrack(spotifyPlaylistUrl);
    } catch (spotifyError) {
      console.warn('No se pudo iniciar Spotify:', spotifyError);
      setError('Conecta Spotify Premium');
      return;
    }
    setAudioPlaying(true);
  };

  return (
    <div className="fixed top-20 right-3 z-50 flex flex-col items-center gap-1 pointer-events-none">
      <button
        type="button"
        onClick={handleToggle}
        disabled={!canControl}
        className={`relative w-16 h-16 rounded-full bg-black border border-white/15 shadow-[0_0_20px_rgba(189,0,255,0.25)] flex items-center justify-center overflow-hidden pointer-events-auto ${canControl ? 'active:scale-95' : 'cursor-default'}`}
        aria-label={isAudioPlaying ? 'Parar musica de la sala' : 'Marcar musica en play'}
      >
        <motion.div
          animate={isAudioPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={isAudioPlaying ? { repeat: Infinity, duration: 1.35, ease: 'linear' } : { duration: 0.2 }}
          className="absolute inset-1 rounded-full bg-[repeating-radial-gradient(circle,#050505_0_4px,#151515_5px_6px,#050505_7px_10px)]"
        >
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent_0_18deg,rgba(255,255,255,0.12)_18deg_24deg,transparent_24deg_160deg,rgba(255,255,255,0.08)_160deg_166deg,transparent_166deg_360deg)]" />
          <div className="absolute inset-[18px] rounded-full bg-neon-green border-2 border-black/60" />
          <div className="absolute inset-[26px] rounded-full bg-black" />
        </motion.div>
        <span className={`relative z-10 material-symbols-outlined text-base ${isAudioPlaying ? 'text-neon-green' : 'text-black'}`}>
          {isAudioPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
      <span className={`rounded-full px-2 py-1 text-[9px] font-label-caps border pointer-events-none ${isAudioPlaying ? 'border-neon-green/40 bg-neon-green/10 text-neon-green' : 'border-white/10 bg-black/40 text-on-surface-variant'}`}>
        {canControl ? (isAudioPlaying ? 'STOP' : 'PLAY') : (isAudioPlaying ? 'PLAY' : 'STOP')}
      </span>
      {error && <span className="max-w-20 text-center text-[9px] text-intense-red font-label-caps">{error}</span>}
    </div>
  );
}

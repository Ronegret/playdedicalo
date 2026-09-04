import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { explainSpotifyError, pauseSpotifyPlayback, startRandomPlaylistTrack } from '../services/spotify';

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
      setError(explainSpotifyError(spotifyError));
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
        className={`relative w-16 h-16 rounded-full bg-background border border-white/12 shadow-[0_0_24px_rgba(255,122,26,0.16),0_0_30px_rgba(168,85,247,0.12)] flex items-center justify-center overflow-hidden pointer-events-auto ${canControl ? 'active:scale-95' : 'cursor-default'}`}
        aria-label={isAudioPlaying ? 'Parar musica de la sala' : 'Marcar musica en play'}
      >
        <motion.div
          animate={isAudioPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={isAudioPlaying ? { repeat: Infinity, duration: 1.35, ease: 'linear' } : { duration: 0.2 }}
          className="absolute inset-1 rounded-full bg-[repeating-radial-gradient(circle,#050505_0_4px,#151515_5px_6px,#050505_7px_10px)]"
        >
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent_0_18deg,rgba(255,255,255,0.12)_18deg_24deg,transparent_24deg_160deg,rgba(255,255,255,0.08)_160deg_166deg,transparent_166deg_360deg)]" />
          <div className="absolute inset-[18px] rounded-full bg-vinyl-orange border-2 border-black/60" />
          <div className="absolute inset-[26px] rounded-full bg-black" />
        </motion.div>
        <span className={`relative z-10 material-symbols-outlined text-base ${isAudioPlaying ? 'text-vinyl-orange' : 'text-white'}`}>
          {isAudioPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
      <span className={`rounded-full px-2 py-1 text-[0.529rem] font-label-caps border pointer-events-none tracking-[0.18em] ${isAudioPlaying ? 'border-vinyl-orange/40 bg-vinyl-orange/10 text-white' : 'border-white/10 bg-black/40 text-on-surface-variant'}`}>
        {canControl ? (isAudioPlaying ? 'STOP' : 'PLAY') : (isAudioPlaying ? 'PLAY' : 'STOP')}
      </span>
      {error && <span className="w-32 text-center text-[0.529rem] leading-tight text-intense-red font-label-caps">{error}</span>}
    </div>
  );
}


import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export default function SpotifyPlayer() {
  const { spotifyPlaylistUrl, role } = useGameStore((state) => ({
    spotifyPlaylistUrl: state.spotifyPlaylistUrl,
    role: state.role
  }));
  const [copied, setCopied] = useState(false);

  if (role !== 'host') return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(spotifyPlaylistUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copia el enlace de Spotify:', spotifyPlaylistUrl);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 w-full z-50 p-3 bg-black/85 backdrop-blur-md border-t border-white/10"
    >
      <div className="max-w-[390px] mx-auto flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-neon-green font-label-caps tracking-widest uppercase">Playlist de la sala</p>
          <p className="text-xs text-on-surface-variant truncate">{spotifyPlaylistUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          className="h-10 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-label-caps"
        >
          {copied ? 'COPIADO' : 'COPIAR'}
        </button>
        <a
          href={spotifyPlaylistUrl}
          target="_blank"
          rel="noreferrer"
          className="h-10 px-3 rounded-lg bg-neon-green text-black border border-neon-green text-xs font-label-caps flex items-center"
        >
          ABRIR
        </a>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { DEDICALO_PLAYLISTS, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';

export default function SpotifyPlayer() {
  const { spotifyPlaylistUrl, role } = useGameStore((state) => ({
    spotifyPlaylistUrl: state.spotifyPlaylistUrl,
    role: state.role
  }));

  if (role !== 'host') return null;

  const activePlaylist = DEDICALO_PLAYLISTS.find((playlist) => (
    normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl)
  )) || DEDICALO_PLAYLISTS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 w-full z-50 bg-background/92 backdrop-blur-xl border-t border-white/8"
    >
      <div className="max-w-[430px] mx-auto px-4 py-3">
        <div className="rounded-2xl border border-white/10 bg-surface-container/80 px-4 py-3 text-center shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <p className="text-[10px] text-neon-green font-label-caps tracking-[0.24em] uppercase">ESTILO ACTIVO</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-black uppercase tracking-[0.08em] text-white truncate">
            <span className="material-symbols-outlined text-base text-neon-green">{activePlaylist.icon}</span>
            {activePlaylist.name}
          </p>
          <p className="mt-2 text-[11px] text-on-surface-variant leading-snug">{activePlaylist.mood}</p>
        </div>
      </div>
    </motion.div>
  );
}


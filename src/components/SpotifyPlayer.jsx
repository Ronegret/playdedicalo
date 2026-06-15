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
      className="fixed bottom-0 left-0 w-full z-50 bg-black/[0.92] backdrop-blur-md border-t border-white/10"
    >
      <div className="max-w-[430px] mx-auto px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-neon-green font-label-caps tracking-widest uppercase">ESTILO DE LA PARTIDA</p>
            <p className="text-xs font-bold uppercase tracking-wide text-white truncate">{activePlaylist.icon} {activePlaylist.name}</p>
            <p className="mt-1 text-[10px] text-on-surface-variant leading-snug">Se mantiene hasta terminar la meta.</p>
          </div>
          <span className="h-8 px-3 rounded-lg bg-neon-green/15 text-neon-green border border-neon-green/40 text-[10px] font-label-caps flex items-center shrink-0">
            LISTA
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[10px] text-on-surface-variant leading-snug">{activePlaylist.mood}</p>
        </div>
      </div>
    </motion.div>
  );
}

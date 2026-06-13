import { motion } from 'framer-motion';
import { DEDICALO_PLAYLISTS, normalizeSpotifyPlaylistUrl, useGameStore } from '../store/useGameStore';

export default function SpotifyPlayer() {
  const { spotifyPlaylistUrl, role, hostSetSpotifyPlaylistUrl } = useGameStore((state) => ({
    spotifyPlaylistUrl: state.spotifyPlaylistUrl,
    role: state.role,
    hostSetSpotifyPlaylistUrl: state.hostSetSpotifyPlaylistUrl
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
            <p className="text-[10px] text-neon-green font-label-caps tracking-widest uppercase">Playlists listas</p>
            <p className="text-xs text-on-surface-variant truncate">Activa: {activePlaylist.name}</p>
          </div>
          <span className="h-8 px-3 rounded-lg bg-neon-green/15 text-neon-green border border-neon-green/40 text-[10px] font-label-caps flex items-center shrink-0">
            LISTA
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DEDICALO_PLAYLISTS.map((playlist) => {
            const isActive = normalizeSpotifyPlaylistUrl(playlist.url) === normalizeSpotifyPlaylistUrl(spotifyPlaylistUrl);

            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => hostSetSpotifyPlaylistUrl(playlist.url).catch((error) => console.error('Error al cambiar playlist:', error))}
                className={`min-w-[148px] rounded-xl border px-3 py-2 text-left transition-colors ${isActive ? 'border-neon-green bg-neon-green/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <span className="block text-xs font-bold text-white leading-tight">{playlist.name}</span>
                <span className="mt-1 block text-[10px] text-on-surface-variant leading-snug">{playlist.mood}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

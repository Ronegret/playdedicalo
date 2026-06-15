import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import WelcomeScreen from './pages/WelcomeScreen';
import HowToPlayScreen from './pages/HowToPlayScreen';
import RoleSelectionScreen from './pages/RoleSelectionScreen';
import HostSyncScreen from './pages/HostSyncScreen';
import GuestJoinScreen from './pages/GuestJoinScreen';
import LobbyScreen from './pages/LobbyScreen';
import GameScreen from './pages/GameScreen';
import ResultScreen from './pages/ResultScreen';
import SpotifyCallbackScreen from './pages/SpotifyCallbackScreen';
import ShaderBackground from './components/ShaderBackground';
import MusicVinylControl from './components/MusicVinylControl';

function App() {
  const location = useLocation();

  return (
    <>
      <ShaderBackground />
      <MusicVinylControl />
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/how-to-play" element={<HowToPlayScreen />} />
          <Route path="/role-selection" element={<RoleSelectionScreen />} />
          <Route path="/host/sync" element={<HostSyncScreen />} />
          <Route path="/spotify/callback" element={<SpotifyCallbackScreen />} />
          <Route path="/guest/join" element={<GuestJoinScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/game/result" element={<ResultScreen />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;


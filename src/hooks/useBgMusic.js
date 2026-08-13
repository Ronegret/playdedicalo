import { useState, useEffect, useCallback } from 'react';

let _audio = null;
let _userStarted = false;

function getAudio() {
  if (!_audio) {
    _audio = new Audio('/dedi.mp3');
    _audio.loop = true;
    _audio.volume = 0.22;
  }
  return _audio;
}

// Called on first user gesture on the welcome screen
export function tryStartBgMusic() {
  if (_userStarted) return;
  _userStarted = true;
  getAudio().play().catch(() => {});
}

// Permanently stops music for this session (navigating away from welcome screen)
export function stopBgMusic() {
  if (!_audio) return;
  _audio.pause();
  _audio.currentTime = 0;
}

export function useBgMusic() {
  const [paused, setPaused] = useState(() => getAudio().paused);

  useEffect(() => {
    const a = getAudio();
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = useCallback(() => {
    const a = getAudio();
    if (a.paused) {
      _userStarted = true;
      a.play().catch(() => {});
    }
    else { a.pause(); }
  }, []);

  return { paused, toggle };
}

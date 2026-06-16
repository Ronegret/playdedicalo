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

// Called on first user gesture anywhere in the app
export function tryStartBgMusic() {
  if (_userStarted) return;
  _userStarted = true;
  getAudio().play().catch(() => {});
}

export function useBgMusic() {
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const a = getAudio();
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    // Sync initial state in case audio already started
    setPaused(a.paused);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = useCallback(() => {
    const a = getAudio();
    if (a.paused) { a.play().catch(() => {}); }
    else { a.pause(); }
  }, []);

  return { paused, toggle };
}

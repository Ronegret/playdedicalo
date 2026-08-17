import { useCallback, useState } from 'react';

// Completa el sistema de escala de fuente que ya vive en index.css
// (--vinyl-size / --font-scale via html.fs-large / html.fs-xl) pero que no
// tenía ningún control conectado — las clases existían, nada las aplicaba.
const STORAGE_KEY = 'dedicalo_font_scale';
const SCALES = ['normal', 'large', 'xl'];
const CLASS_BY_SCALE = { normal: '', large: 'fs-large', xl: 'fs-xl' };

function applyScale(scale) {
  const root = document.documentElement;
  root.classList.remove('fs-large', 'fs-xl');
  const cls = CLASS_BY_SCALE[scale];
  if (cls) root.classList.add(cls);
}

function getStoredScale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SCALES.includes(stored) ? stored : 'normal';
}

// Se aplica en cuanto este módulo se importa (ver main.jsx), antes de que
// React pinte nada — así no hay un parpadeo de tamaño normal -> grande al
// cargar la app para alguien que ya eligió letra grande.
applyScale(getStoredScale());

export function useFontScale() {
  const [scale, setScaleState] = useState(getStoredScale);

  const setScale = useCallback((next) => {
    if (!SCALES.includes(next) || next === scale) return;
    localStorage.setItem(STORAGE_KEY, next);
    applyScale(next);
    setScaleState(next);
  }, [scale]);

  return { scale, setScale, scales: SCALES };
}

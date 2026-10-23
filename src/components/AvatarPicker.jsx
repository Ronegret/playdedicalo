import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AVATAR_CATEGORIES,
  CHARACTER_AVATARS,
  findCharacterAvatarByUrl,
  getCharacterAvatarLargeUrl,
  getCharacterAvatarThumbUrl
} from '../data/characterAvatars';
import { sfx } from '../services/audio';
import { vibrar } from '../services/haptics';

const CLASSIC_EMOJIS = [
  '😎', '🎷', '📻', '🎧', '🎤', '🎸', '🥁', '🎹', '🔥', '⚡',
  '🌟', '🚀', '👑', '🪩', '🎵', '🍻', '🥳', '🤘', '🦄', '👻'
];

// Selector de avatar tipo app móvil: categorías en pestañas horizontales,
// grid de miniaturas circulares (WebP livianos), y una pestaña extra
// "Clásicos" con los emoji de siempre para quien prefiera algo simple.
// UN toque elige: antes tocar una cara abría una vista ampliada y había que
// confirmar en un segundo botón — dos pasos para la acción más repetida de
// la pantalla, y mucha gente cerraba la vista creyendo que ya había elegido.
// La vista ampliada sigue existiendo (AvatarZoom), pero se abre desde la
// vista previa grande de quien usa este selector, no desde la rejilla.
export default function AvatarPicker({ value, onChange, className = '' }) {
  const selectedCharacter = useMemo(() => findCharacterAvatarByUrl(value), [value]);
  const [activeCategory, setActiveCategory] = useState(selectedCharacter?.category || AVATAR_CATEGORIES[0].id);
  // ¿Queda algo por debajo del borde? Es lo que enciende el degradado del
  // fondo. Empieza en `true` porque la lista casi siempre desborda, y si no
  // desborda el primer evento de scroll lo corrige al instante.
  const [hayMas, setHayMas] = useState(true);
  const rejillaRef = useRef(null);

  // Se recalcula al cambiar de categoría: cada una tiene un número distinto
  // de personajes, y en las cortas no debe quedarse el degradado encendido
  // sugiriendo un contenido que no existe.
  const revisarDesborde = useCallback(() => {
    const el = rejillaRef.current;
    if (!el) return;
    // 4 px de tolerancia: el desplazamiento no siempre cae en un entero y sin
    // margen el degradado parpadea al llegar abajo del todo.
    setHayMas(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    revisarDesborde();
  }, [activeCategory, revisarDesborde]);

  const isClassicTab = activeCategory === 'clasicos';
  const itemsInCategory = isClassicTab
    ? []
    : CHARACTER_AVATARS.filter((entry) => entry.category === activeCategory);

  const handlePickCharacter = (entry) => {
    vibrar('seleccion'); sfx.toque();
    onChange(getCharacterAvatarLargeUrl(entry.slug));
  };

  const handlePickEmoji = (emoji) => {
    vibrar('seleccion'); sfx.toque();
    onChange(emoji);
  };

  return (
    <div className={className}>
      {/* Pestañas de categoría */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {AVATAR_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`flex min-h-touch shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-label-caps text-xs font-bold transition-all active:scale-95 ${
              activeCategory === cat.id
                ? 'border-neon-green bg-neon-green/15 text-neon-green shadow-[0_0_16px_rgba(57,255,20,0.2)]'
                : 'border-white/12 bg-white/5 text-white/65'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveCategory('clasicos')}
          className={`flex min-h-touch shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-label-caps text-xs font-bold transition-all active:scale-95 ${
            isClassicTab
              ? 'border-neon-green bg-neon-green/15 text-neon-green shadow-[0_0_16px_rgba(57,255,20,0.2)]'
              : 'border-white/12 bg-white/5 text-white/65'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">mood</span>
          Clásicos
        </button>
      </div>

      {/* ── Rejilla de opciones ────────────────────────────────────────────
          TRES ARREGLOS, y los tres eran quejas reales:

          1. «Es muy grande y a veces se topa con los botones».
             La altura era `max-h-80`: 20rem FIJOS. Y rem crece con el ajuste
             de tamaño de letra, así que en "letra muy grande" pasaba de 340 a
             460 px y se comía los botones de abajo. Ahora el techo lo pone el
             VIEWPORT (`42svh`), que es lo único que no puede ser más alto que
             la pantalla; el `min()` con 22rem evita que en una tablet se
             estire sin motivo.

          2. «No se ve que se pueda deslizar más».
             No había ninguna señal de que hubiera contenido debajo: la última
             fila se cortaba limpia contra el borde y parecía el final. Ahora
             hay un degradado en el pie que solo aparece cuando queda algo por
             ver — la señal universal de "sigue".

          3. Cuatro columnas en vez de tres: caben más caras sin desplazar, y
             cada una sigue teniendo tamaño de sobra para el dedo.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          ref={rejillaRef}
          onScroll={revisarDesborde}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          style={{ maxHeight: 'min(42svh, 22rem)', overscrollBehavior: 'contain' }}
          className="grid grid-cols-4 gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-5"
        >
          {isClassicTab ? (
            CLASSIC_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePickEmoji(emoji)}
                aria-label={`Elegir ${emoji} como avatar`}
                aria-pressed={value === emoji}
                className={`flex aspect-square items-center justify-center rounded-2xl border text-4xl transition-all active:scale-90 ${
                  value === emoji
                    ? 'border-neon-green bg-neon-green/15 shadow-[0_0_18px_rgba(57,255,20,0.28)] scale-105'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                {emoji}
              </button>
            ))
          ) : (
            itemsInCategory.map((entry) => {
              const isSelected = selectedCharacter?.slug === entry.slug;
              return (
                <motion.button
                  key={entry.slug}
                  type="button"
                  onClick={() => handlePickCharacter(entry)}
                  whileTap={{ scale: 0.92 }}
                  aria-label={`Elegir a ${entry.name}`}
                  aria-pressed={isSelected}
                  className="relative flex flex-col items-center gap-1"
                >
                  {/* La elegida no se marca solo con color: anillo grueso,
                      algo más grande y check — se distingue sin ver el verde. */}
                  <span
                    className={`relative aspect-square w-full overflow-hidden rounded-full border-2 transition-[transform,border-color,box-shadow] duration-150 ${
                      isSelected
                        ? 'scale-105 border-neon-green ring-2 ring-neon-green/70 ring-offset-2 ring-offset-[#0b1120] shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                        : 'border-white/15'
                    }`}
                  >
                    <img
                      src={getCharacterAvatarThumbUrl(entry.slug)}
                      alt={entry.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute bottom-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.6)]">
                        <span aria-hidden="true" className="material-symbols-outlined text-black" style={{ fontSize: '15px' }}>check</span>
                      </span>
                    )}
                  </span>
                  <span className={`max-w-full truncate text-xs leading-tight ${isSelected ? 'font-black text-white' : 'font-bold text-white/75'}`}>
                    {entry.name}
                  </span>
                </motion.button>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>

        {/* El "sigue habiendo cosas". Solo cuando de verdad las hay, y sin
            capturar toques para que no estorbe a la fila que tapa a medias. */}
        <AnimatePresence>
          {hayMas && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-px bottom-px h-14 rounded-b-2xl bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-transparent"
            >
              <span aria-hidden="true" className="material-symbols-outlined absolute bottom-1 left-1/2 -translate-x-1/2 text-white/45 text-lg">
                expand_more
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Vista ampliada de un personaje ya elegido: solo para verlo de cerca.
// Como el toque en la rejilla ya elige, aquí no hay nada que confirmar —
// el botón solo cierra.
export function AvatarZoom({ entry, onClose }) {
  return (
    <>
      {/* Foto grande + nombre grande.
          En un portal a <body>: este selector puede vivir dentro de un
          contenedor animado (el editor de perfil) o bajo un header con
          backdrop-blur, y cualquier ancestro con transform/backdrop-filter
          se vuelve el bloque contenedor de un position:fixed — sin el
          portal, esta vista ampliada quedaría encerrada en esa caja en vez
          de cubrir la pantalla. */}
      {createPortal(
        <AnimatePresence>
          {entry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[320] flex items-center justify-center bg-black/85 px-6"
              onClick={onClose}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="relative flex w-full max-w-xs flex-col items-center gap-4 rounded-[2rem] border border-white/15 bg-surface-container p-6 shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>

              <div className="h-56 w-56 max-w-full overflow-hidden rounded-full border-4 border-neon-green shadow-[0_0_50px_rgba(57,255,20,0.4)]">
                <img
                  src={getCharacterAvatarLargeUrl(entry.slug)}
                  alt={entry.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="text-center text-3xl font-black text-white">{entry.name}</p>

              <button
                type="button"
                onClick={onClose}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon-green font-label-caps text-base font-black text-black active:scale-95"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xl">check_circle</span>
                LISTO
              </button>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

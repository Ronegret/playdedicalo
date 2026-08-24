import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AVATAR_CATEGORIES,
  CHARACTER_AVATARS,
  findCharacterAvatarByUrl,
  getCharacterAvatarLargeUrl,
  getCharacterAvatarThumbUrl
} from '../data/characterAvatars';

const CLASSIC_EMOJIS = [
  '😎', '🕺', '💃', '🎧', '🎤', '🎸', '🥁', '🎹', '🔥', '⚡',
  '🌟', '🚀', '👑', '🪩', '🎵', '🍻', '🥳', '🤘', '🦄', '👻'
];

// Selector de avatar tipo app móvil: categorías en pestañas horizontales,
// grid de miniaturas circulares (WebP livianos), y una pestaña extra
// "Clásicos" con los emoji de siempre para quien prefiera algo simple.
// Tocar un personaje abre una vista ampliada (foto grande + nombre bien
// grande) antes de confirmar — así se ve bien de cerca antes de elegirlo,
// no solo la miniatura chica del grid.
export default function AvatarPicker({ value, onChange, className = '' }) {
  const selectedCharacter = useMemo(() => findCharacterAvatarByUrl(value), [value]);
  const [activeCategory, setActiveCategory] = useState(selectedCharacter?.category || AVATAR_CATEGORIES[0].id);
  const [previewEntry, setPreviewEntry] = useState(null);

  const isClassicTab = activeCategory === 'clasicos';
  const itemsInCategory = isClassicTab
    ? []
    : CHARACTER_AVATARS.filter((entry) => entry.category === activeCategory);

  const handleOpenPreview = (entry) => {
    if (navigator.vibrate) navigator.vibrate(12);
    setPreviewEntry(entry);
  };

  const handleConfirmPreview = () => {
    if (!previewEntry) return;
    if (navigator.vibrate) navigator.vibrate([18, 30, 18]);
    onChange(getCharacterAvatarLargeUrl(previewEntry.slug));
    setPreviewEntry(null);
  };

  const handlePickEmoji = (emoji) => {
    if (navigator.vibrate) navigator.vibrate(18);
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
            <span className="material-symbols-outlined text-base">{cat.icon}</span>
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
          <span className="material-symbols-outlined text-base">mood</span>
          Clásicos
        </button>
      </div>

      {/* Grid de opciones */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-4"
        >
          {isClassicTab ? (
            CLASSIC_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePickEmoji(emoji)}
                aria-label={`Elegir ${emoji} como avatar`}
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
                  onClick={() => handleOpenPreview(entry)}
                  whileTap={{ scale: 0.92 }}
                  aria-label={`Ver a ${entry.name} en grande`}
                  className="relative flex flex-col items-center gap-1"
                >
                  <span
                    className={`relative aspect-square w-full overflow-hidden rounded-full border-2 transition-all ${
                      isSelected
                        ? 'border-neon-green shadow-[0_0_20px_rgba(57,255,20,0.4)]'
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
                        <span className="material-symbols-outlined text-black" style={{ fontSize: '15px' }}>check</span>
                      </span>
                    )}
                    <span className="absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>zoom_in</span>
                    </span>
                  </span>
                  <span className="max-w-full truncate text-xs font-bold leading-tight text-white/75">
                    {entry.name}
                  </span>
                </motion.button>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>

      {/* Vista ampliada — foto grande + nombre grande antes de confirmar.
          En un portal a <body>: este selector puede vivir dentro de un
          contenedor animado (el editor de perfil) o bajo un header con
          backdrop-blur, y cualquier ancestro con transform/backdrop-filter
          se vuelve el bloque contenedor de un position:fixed — sin el
          portal, esta vista ampliada quedaría encerrada en esa caja en vez
          de cubrir la pantalla. */}
      {createPortal(
        <AnimatePresence>
          {previewEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[320] flex items-center justify-center bg-black/85 px-6 backdrop-blur-md"
              onClick={() => setPreviewEntry(null)}
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
                onClick={() => setPreviewEntry(null)}
                aria-label="Cerrar"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="h-56 w-56 max-w-full overflow-hidden rounded-full border-4 border-neon-green shadow-[0_0_50px_rgba(57,255,20,0.4)]">
                <img
                  src={getCharacterAvatarLargeUrl(previewEntry.slug)}
                  alt={previewEntry.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="text-center text-3xl font-black text-white">{previewEntry.name}</p>

              <button
                type="button"
                onClick={handleConfirmPreview}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon-green font-label-caps text-base font-black text-black active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">check_circle</span>
                {selectedCharacter?.slug === previewEntry.slug ? 'YA ES TU PERSONAJE' : `ELEGIR A ${previewEntry.name.toUpperCase()}`}
              </button>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
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
// grid de miniaturas circulares (WebP livianos), animación de "elegido"
// con resorte + check, y una pestaña extra "Clásicos" que conserva los
// emoji de siempre para quien prefiera algo simple.
export default function AvatarPicker({ value, onChange, className = '' }) {
  const selectedCharacter = useMemo(() => findCharacterAvatarByUrl(value), [value]);
  const [activeCategory, setActiveCategory] = useState(selectedCharacter?.category || AVATAR_CATEGORIES[0].id);
  const [justPicked, setJustPicked] = useState('');

  const isClassicTab = activeCategory === 'clasicos';
  const itemsInCategory = isClassicTab
    ? []
    : CHARACTER_AVATARS.filter((entry) => entry.category === activeCategory);

  const handlePickCharacter = (entry) => {
    if (navigator.vibrate) navigator.vibrate(18);
    setJustPicked(entry.slug);
    onChange(getCharacterAvatarLargeUrl(entry.slug));
    window.setTimeout(() => setJustPicked(''), 500);
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
          className="grid max-h-64 grid-cols-4 gap-2.5 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2.5 sm:grid-cols-5"
        >
          {isClassicTab ? (
            CLASSIC_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePickEmoji(emoji)}
                aria-label={`Elegir ${emoji} como avatar`}
                className={`flex aspect-square items-center justify-center rounded-2xl border text-3xl transition-all active:scale-90 ${
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
                  whileTap={{ scale: 0.88 }}
                  animate={justPicked === entry.slug ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                  aria-label={`Elegir ${entry.name} como avatar`}
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
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.6)]"
                      >
                        <span className="material-symbols-outlined text-black" style={{ fontSize: '13px' }}>check</span>
                      </motion.span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[10px] font-bold leading-tight text-white/70">
                    {entry.name}
                  </span>
                </motion.button>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

import { motion } from 'framer-motion';
import { BINGO_CATEGORIES } from '../store/useGameStore';

const FREE_COLOR = '#ff7a1a';

function getCategory(categoryId) {
  return BINGO_CATEGORIES.find((category) => category.id === categoryId) || null;
}

function BingoCell({ cell, marked }) {
  const isFree = cell.kind === 'free';
  const color = isFree ? FREE_COLOR : (getCategory(cell.categoryId)?.color || '#ffffff');

  return (
    <motion.div
      animate={marked ? { scale: [1, 1.25, 1], rotate: [0, -6, 0] } : { scale: 1, rotate: 0 }}
      transition={{ duration: 0.4, ease: 'backOut' }}
      className="relative aspect-square rounded-lg border p-1 flex items-center justify-center text-center transition-colors"
      style={{
        borderColor: marked ? color : `${color}55`,
        backgroundColor: marked ? color : `${color}14`,
        color: marked ? '#000' : color
      }}
    >
      {isFree ? (
        <span className="material-symbols-outlined text-xl sm:text-2xl">star</span>
      ) : (
        <span className="uppercase text-[7px] sm:text-[8px] font-label-caps leading-tight line-clamp-4">
          {getCategory(cell.categoryId)?.label}
        </span>
      )}
      {marked && !isFree && (
        <span
          className="material-symbols-outlined absolute -top-1.5 -right-1.5 text-base bg-black rounded-full drop-shadow-[0_0_6px_rgba(0,0,0,0.6)]"
          style={{ color }}
        >
          check_circle
        </span>
      )}
    </motion.div>
  );
}

export default function BingoCard({ card = [], marked = [] }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 w-full max-w-[420px] mx-auto">
      {card.map((cell, index) => (
        <BingoCell key={cell.id} cell={cell} marked={Boolean(marked[index])} />
      ))}
    </div>
  );
}

export function BingoCategoryLegend({ activeCategoryId }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-[420px] mx-auto">
      {BINGO_CATEGORIES.map((category) => (
        <span
          key={category.id}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-label-caps transition-all ${
            activeCategoryId === category.id ? 'scale-110' : 'opacity-70'
          }`}
          style={{ borderColor: `${category.color}66`, backgroundColor: `${category.color}18`, color: category.color }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
          {category.label}
        </span>
      ))}
    </div>
  );
}

import { useFontScale } from '../hooks/useFontScale';

// Cada botón se dibuja a su propio tamaño real (16px / 20px / 30px) en vez
// de depender de una etiqueta chica ("A+", "A++") que alguien con poca
// visión tendría que leer para entender qué hace — el tamaño ES la
// explicación. Reutilizado en el menú de perfil (durante la partida) y en
// la pantalla de bienvenida (antes de siquiera unirse a una sala).
const OPTIONS = [
  { id: 'normal', title: 'Letra normal', textClass: 'text-base' },
  { id: 'large', title: 'Letra grande', textClass: 'text-xl' },
  { id: 'xl', title: 'Letra muy grande', textClass: 'text-3xl' }
];

export default function FontSizeControl({ className = '' }) {
  const { scale, setScale } = useFontScale();

  return (
    <div className={`flex items-center gap-2 ${className}`} role="group" aria-label="Tamaño de letra">
      <span className="material-symbols-outlined shrink-0 text-lg text-on-surface-variant">text_fields</span>
      <div className="flex items-center gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setScale(option.id)}
            aria-pressed={scale === option.id}
            aria-label={option.title}
            title={option.title}
            className={`min-w-touch min-h-touch flex items-center justify-center rounded-xl border font-black leading-none transition-all active:scale-95 ${option.textClass} ${
              scale === option.id
                ? 'border-neon-green bg-neon-green/15 text-neon-green'
                : 'border-white/12 bg-white/5 text-white/70'
            }`}
          >
            A
          </button>
        ))}
      </div>
    </div>
  );
}

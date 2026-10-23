import { ATTACK_TYPES, normalizeSabotageTypes } from '../store/useGameStore';

// Control del anfitrión para decidir si su partida lleva sabotaje y de qué
// tipo. Antes el sabotaje venía impuesto en todas las salas; hay grupos que
// lo quieren y grupos que prefieren una partida limpia, así que ahora es
// una decisión suya. Se usa igual en la creación de sala y en el lobby.
export default function SabotageSettings({ enabled, types, onChange, disabled = false }) {
  const active = enabled !== false;
  const selected = normalizeSabotageTypes(types);

  const toggleType = (id) => {
    if (disabled) return;
    const isOn = selected.includes(id);
    // Nunca dejar cero tipos con el sabotaje encendido: si intenta apagar
    // el último, se apaga el modo entero (que es lo que quiere decir).
    if (isOn && selected.length === 1) {
      onChange({ sabotageEnabled: false, sabotageTypes: Object.keys(ATTACK_TYPES) });
      return;
    }
    const next = isOn ? selected.filter((t) => t !== id) : [...selected, id];
    onChange({ sabotageEnabled: true, sabotageTypes: next });
  };

  return (
    <div className="rounded-3xl border border-vinyl-orange/30 bg-vinyl-orange/8 p-4 text-left">
      {/* Cabecera y descripción en filas separadas a propósito: si la
          descripción comparte fila con el interruptor, a tamaño de letra
          grande la columna de texto se estrangula y cae a una palabra por
          línea. Así el texto siempre dispone del ancho completo. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label-caps text-xs tracking-[0.2em] text-vinyl-orange">SABOTAJE</p>
          <h3 className="mt-0.5 text-lg font-black leading-tight text-white">
            {active ? 'Activado' : 'Partida limpia'}
          </h3>
        </div>

        {/* Interruptor grande: es una decisión de partida, no un ajuste
            escondido. */}
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="Activar o desactivar el sabotaje"
          disabled={disabled}
          onClick={() => onChange({
            sabotageEnabled: !active,
            sabotageTypes: Object.keys(ATTACK_TYPES)
          })}
          className={`relative h-11 w-20 shrink-0 rounded-full border-2 transition-colors disabled:opacity-50 ${
            active ? 'border-neon-green bg-neon-green/25' : 'border-white/20 bg-white/8'
          }`}
        >
          <span
            className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-all ${
              active ? 'left-[calc(100%-2.25rem)] bg-neon-green text-black' : 'left-1 bg-white/60 text-black'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">{active ? 'bolt' : 'block'}</span>
          </span>
        </button>
      </div>

      <p className="mt-2 text-sm leading-snug text-on-surface-variant">
        {active
          ? 'Con puntos, los jugadores pueden fastidiar al rival.'
          : 'Nadie puede atacar. Solo escuchar y acertar.'}
      </p>

      {active && (
        <div className="mt-4">
          <p className="mb-2 font-label-caps text-xs tracking-[0.18em] text-on-surface-variant">
            TIPOS PERMITIDOS
          </p>
          <div className="flex flex-col gap-2">
            {Object.values(ATTACK_TYPES).map((type) => {
              const on = selected.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => toggleType(type.id)}
                  className={`flex min-h-touch items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] disabled:opacity-50 ${
                    on ? 'border-neon-green/70 bg-neon-green/10' : 'border-white/12 bg-black/20'
                  }`}
                >
                  <span aria-hidden="true"
                    className={`material-symbols-outlined shrink-0 text-2xl ${
                      on ? 'text-neon-green' : 'text-white/40'
                    }`}
                  >
                    {type.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-label-caps text-base font-black text-white">{type.name}</span>
                    <span className="block text-sm leading-snug text-on-surface-variant">{type.short}</span>
                  </span>
                  <span aria-hidden="true"
                    className={`material-symbols-outlined shrink-0 ${on ? 'text-neon-green' : 'text-white/25'}`}
                  >
                    {on ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
              );
            })}
          </div>
          {disabled && (
            <p className="mt-2 text-sm text-on-surface-variant">
              La partida ya empezó: esto se puede cambiar al crear la siguiente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

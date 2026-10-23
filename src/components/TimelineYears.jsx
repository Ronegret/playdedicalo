/**
 * La ruta de años de un jugador, en pequeño: la que se ve en el lobby y en
 * los resultados.
 *
 * Antes este mismo componente estaba copiado en LobbyScreen y ResultScreen y
 * ya se habían separado (huecos, sombras y etiqueta distintos), y los dos
 * mostraban el año recortado a dos cifras ("87") en 11px. A distancia de
 * fiesta "87" no se lee y además es ambiguo para quien no conoce el truco.
 * Aquí va el año entero, en el tamaño del texto normal, y una sola versión.
 *
 * Los tamaños van en rem a propósito: así crecen con el control de tamaño de
 * letra (fs-large / fs-xl), que es justo cuando más falta hace leerlos.
 */
export default function TimelineYears({
  years = [],
  wildcards = 0,
  goalYears = 12,
  label = true,
  glow = false,
  className = ''
}) {
  const ordenados = [...years].map(Number).filter(Boolean).sort((a, b) => a - b).slice(0, goalYears);
  const comodines = Math.max(0, Math.min(Number(wildcards) || 0, goalYears - ordenados.length));
  const progreso = Math.min(ordenados.length + comodines, goalYears);

  return (
    <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="font-label-caps text-sm font-bold tracking-[0.12em] text-on-surface-variant tabular-nums">
        {label ? 'Ruta ' : ''}
        <span className="text-white">{progreso}</span>/{goalYears}
      </span>
      <ul className="contents" aria-label={`Años conseguidos: ${progreso} de ${goalYears}`}>
        {ordenados.map((year, index) => (
          <li
            key={`${year}-${index}`}
            className={`inline-flex h-8 items-center rounded-full border-2 border-neon-green/70 bg-black/40 px-2.5 font-stats-xl text-sm font-black tabular-nums text-neon-green ${
              glow ? 'shadow-[0_0_10px_rgba(57,255,20,0.25)]' : ''
            }`}
          >
            {year}
          </li>
        ))}
        {Array.from({ length: comodines }, (_, index) => (
          <li
            key={`comodin-${index}`}
            aria-label="Año canjeado con puntos"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-chaos-gold/70 bg-chaos-gold/15 ${
              glow ? 'shadow-[0_0_10px_rgba(255,191,77,0.28)]' : ''
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base text-chaos-gold">star</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

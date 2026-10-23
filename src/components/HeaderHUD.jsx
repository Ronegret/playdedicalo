import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getPlayerPresence, getTimelineProgress, useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';
import ProfileMenu from './ProfileMenu';
import { auth } from '../firebase';

const PRESENCE_STYLES = {
  online: { dot: 'bg-neon-green', ring: 'border-primary', label: 'Conectado' },
  reconnecting: { dot: 'bg-chaos-gold animate-pulse', ring: 'border-chaos-gold/70', label: 'Reconectando' },
  kicked: { dot: 'bg-on-surface-variant/60', ring: 'border-surface-variant opacity-50', label: 'Fuera' },
  offline: { dot: 'bg-on-surface-variant/60', ring: 'border-surface-variant opacity-50', label: 'Fuera' }
};

function PlayerAvatar({ player, presence, size = 'w-6 h-6' }) {
  const initials = (player.name || '?').substring(0, 2).toUpperCase();
  const styles = PRESENCE_STYLES[presence] || PRESENCE_STYLES.offline;
  return (
    <div className={`relative ${size} shrink-0`}>
      <div className={`h-full w-full overflow-hidden rounded-full border ${styles.ring}`}>
        {isImageAvatar(player.avatar) ? (
          <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-bright text-2xl font-bold text-on-surface">
            {player.avatar || initials}
          </div>
        )}
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-surface ${styles.dot}`} />
    </div>
  );
}

export default function HeaderHUD({ onExit }) {
  const players = useGameStore((state) => state.players) || [];
  const pin = useGameStore((state) => state.pin);
  const phase = useGameStore((state) => state.phase);
  const role = useGameStore((state) => state.role);
  const round = useGameStore((state) => state.round);
  const guestId = useGameStore((state) => state.guestId);
  const guestAvatar = useGameStore((state) => state.guestAvatar);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const targetYears = useGameStore((state) => state.targetYears);

  if (!pin || phase === 'lobby' || phase === 'final') return null;

  const ownPlayer = players.find((player) => player.id === guestId);
  const activeCount = players.filter((player) => getPlayerPresence(player, now).status !== 'kicked').length;
  // Sin jugador propio todavía (la sala aún no sincronizó) se muestra 0:
  // getTimelineProgress(undefined) cuenta el año base y daría un 1 falso.
  const myYears = ownPlayer ? getTimelineProgress(ownPlayer) : 0;
  const goalYears = targetYears || 12;
  // Puesto = 1 + jugadores con ESTRICTAMENTE más años. Antes se desempataba
  // por puntos y, al empezar (todos 1/12), medio grupo se veía "4º/4" sin
  // haber jugado: los empatados comparten puesto y se marca con "=".
  const myRank = ownPlayer
    ? 1 + players.filter((player) => getTimelineProgress(player) > myYears).length
    : 0;
  const rankTied = Boolean(ownPlayer) && players.some((player) => (
    player.id !== ownPlayer.id && getTimelineProgress(player) === myYears
  ));
  // La píldora de conectados solo se gana el ancho en móviles de 320px
  // cuando aporta algo: si alguien se está reconectando o se cayó.
  const someoneAway = players.some((player) => {
    const status = getPlayerPresence(player, now).status;
    return status === 'reconnecting' || status === 'offline';
  });
  // El sabotaje se guarda con la ronda en que se lanzó; uno viejo que aún
  // no se limpió no debe asustar al jugador en la ronda siguiente.
  const underAttack = Boolean(ownPlayer?.activeAttack && ownPlayer.activeAttack.round === round);

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-surface/80 shadow-md app-blur-permitido">
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        {/* Columnas laterales a su ancho natural (nunca se disputan espacio
            entre sí) + una única columna central flexible que se achica o
            trunca si hace falta — evita que dos elementos de ancho fijo
            terminen superpuestos en pantallas angostas. */}
        {/* Por debajo de 360px se recorta el hueco entre columnas: con la
            letra XL (raíz 23px) cada píxel va a la columna central. */}
        <div className="grid min-h-[64px] grid-cols-[auto_1fr_auto] items-center gap-1 px-1.5 min-[360px]:gap-2 min-[360px]:px-2.5">
          {/* Left: back + room */}
          <div className="flex min-w-0 items-center gap-1.5">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                aria-label={role === 'host' ? 'Cancelar partida' : 'Salir de la partida'}
                className="min-h-touch min-w-touch shrink-0 rounded-xl text-on-surface-variant font-label-caps text-xs flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform hover:text-white"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xl leading-none">arrow_back</span>
              </button>
            )}
            <span className="hidden shrink-0 border-l border-white/10 pl-2 font-label-caps text-[0.65rem] tracking-widest text-on-surface-variant sm:inline-block">
              SALA {pin}
            </span>
          </div>

          {/* Center: estado de la partida. Jerarquía: AÑOS n/meta manda
              (es lo que gana la partida), el puesto va como sello compacto
              y la ronda queda de contexto, pequeña. La meta se ve SIEMPRE,
              también en la ronda 1. Puesto y ronda comparten la fila de
              arriba porque a 320px con letra XL no caben los tres en una. */}
          <div className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-center">
            <div className="flex min-w-0 max-w-full items-center justify-center gap-1">
              <p className="min-w-0 truncate font-label-caps text-[0.8rem] font-bold leading-none text-neon-green">RONDA {round}</p>
              {myRank > 0 && (
                <span
                  className={`shrink-0 rounded-full px-1 py-0.5 font-label-caps text-[0.8rem] font-black leading-none tabular-nums ${
                    myRank === 1 ? 'bg-chaos-gold text-black' : 'border border-white/20 bg-white/10 text-white'
                  }`}
                >
                  <span className="sr-only">Puesto </span>{rankTied ? '=' : ''}{myRank}º<span className="sr-only">{rankTied ? ', empatado' : ''}</span>
                </span>
              )}
            </div>
            <p className="mt-1 flex min-w-0 max-w-full items-baseline justify-center gap-1 leading-none">
              <span className="min-w-0 truncate font-label-caps text-[0.8rem] font-bold text-on-surface-variant">AÑOS</span>
              <span className="shrink-0 font-stats-xl text-xl font-black leading-none text-white tabular-nums min-[360px]:text-2xl">{myYears}</span>
              <span className="-ml-1 shrink-0 text-sm font-bold text-on-surface-variant tabular-nums">/{goalYears}</span>
            </p>
          </div>

          {/* Right: spotify (host) + players + pts + avatar */}
          <div className="flex items-center justify-end gap-1.5">
            {/* Solo el anfitrión pone música, así que solo él necesita el
                control de reconexión — y lo necesita SIEMPRE a mano, no
                solo cuando ya falló una ronda. */}
            <button
              type="button"
              onClick={() => setRosterOpen((prev) => !prev)}
              aria-expanded={rosterOpen}
              aria-label="Ver jugadores conectados"
              className={`min-h-touch shrink-0 rounded-full border border-white/10 bg-black/20 pl-2 pr-2.5 items-center gap-1.5 active:scale-95 transition-transform ${
                someoneAway ? 'flex' : 'hidden min-[360px]:flex'
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${someoneAway ? 'bg-chaos-gold animate-pulse' : 'bg-neon-green'}`} />
              <span className="font-label-caps text-sm text-white">{activeCount}/{players.length}</span>
            </button>

            {/* Bajo 360px la etiqueta "PTS" se cambia por un icono de dinero: el
                número se queda, la palabra no cabía. El lector de pantalla
                siempre oye "puntos". */}
            <div className="shrink-0 text-right leading-none">
              <p aria-hidden="true" className="hidden font-label-caps text-sm text-on-surface-variant min-[360px]:block">PTS</p>
              <p className="flex items-center justify-end gap-0.5 font-label-caps text-base font-black text-neon-green tabular-nums min-[360px]:mt-0.5">
                {/* El `hidden` va en un envoltorio y no en el icono: la regla global
                    .material-symbols-outlined fuerza display:inline-block
                    !important y anulaba el `min-[360px]:hidden`. Y el icono es
                    `payments` porque ya viaja en la fuente autoalojada: uno nuevo
                    obliga a regenerarla (npm run iconos && npm run fuentes) o se
                    ve su nombre escrito en pantalla. */}
                <span aria-hidden="true" className="flex min-[360px]:hidden">
                  <span className="material-symbols-outlined text-base leading-none text-chaos-gold">payments</span>
                </span>
                <span className="sr-only">Puntos: </span>{ownPlayer?.points ?? 0}
              </p>
            </div>

            <ProfileMenu user={role === 'host' ? auth.currentUser : null} guestAvatar={role === 'guest' ? guestAvatar : null} />
          </div>
        </div>
      </div>

      {/* Aviso persistente de sabotaje: el modal de ataque se cierra, pero
          el jugador tiene que seguir sabiendo toda la ronda que va tocado.
          Cuelga bajo el borde de la cabecera, alineado con los puntos, para
          no robarle ancho a las tres columnas en un móvil de 375px. Lleva
          texto además del color. */}
      {underAttack && (
        <div className="pointer-events-none absolute right-2.5 top-full mt-1 flex items-center gap-1 rounded-full border border-intense-red/60 bg-black/80 px-2 py-0.5 font-label-caps text-sm font-black leading-none text-intense-red shadow-md">
          <span aria-hidden="true" className="material-symbols-outlined text-base leading-none">bolt</span>
          SABOTEADO
        </div>
      )}

      <AnimatePresence>
        {rosterOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar lista de jugadores"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRosterOpen(false)}
              className="fixed inset-0 z-[99] bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-2 top-[calc(64px+env(safe-area-inset-top,0px)+18px)] z-[101] max-h-[65vh] w-[min(21rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-white/10 bg-surface-container/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
            >
              <p className="px-2 py-1 font-label-caps text-xs tracking-widest text-on-surface-variant">JUGADORES</p>
              <div className="flex flex-col gap-1">
                {players.map((player, index) => {
                  const presence = getPlayerPresence(player, now);
                  const styles = PRESENCE_STYLES[presence.status] || PRESENCE_STYLES.offline;
                  const seconds = Math.ceil((presence.remainingMs || 0) / 1000);
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5"
                    >
                      <PlayerAvatar player={player} presence={presence.status} size="w-20 h-20" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-label-caps text-lg font-black uppercase tracking-wide text-white">{player.name}{player.id === guestId ? ' (tú)' : ''}</p>
                        <p className="text-xs text-on-surface-variant">
                          {presence.status === 'reconnecting' ? `${styles.label} ${seconds}s` : styles.label}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

import { getTimelineProgress } from '../../store/useGameStore';
import { isImageAvatar } from '../../data/characterAvatars';

/**
 * UN JUGADOR = UN VINILO
 *
 * Los jugadores son los protagonistas de la pantalla, no un pie de página con
 * avatares diminutos. Cada uno es un disco con su cara en la etiqueta
 * central, su puesto en la carrera y cuántas canciones lleva.
 *
 * Sobre el rendimiento, que aquí es la mitad del trabajo: el disco es una
 * IMAGEN que se gira. Girar un mapa de bits es casi gratis; girar un
 * degradado repetido —como estaba antes— obliga a la GPU a redibujar todos
 * los surcos en cada fotograma, y eso es lo que se quedaba pegado en la tele.
 *
 * Solo gira el disco de quien está sonando o, en la sala, ninguno: veinte
 * discos girando a la vez tumban cualquier televisor.
 */

const COLOR_PUESTO = ['#ffbf4d', '#dbe4f0', '#ff9a4d'];

export default function VinilloJugador({
  jugador, tam, puesto, meta, resultado, estado, girando = false
}) {
  const acerto = resultado?.isCorrect;
  const fallo = resultado && !resultado.isCorrect && !resultado.blocked;
  const bloqueado = resultado?.blocked || estado === 'bloqueado';
  const respondio = estado === 'respondio';

  const aro = acerto ? '#39ff14'
    : fallo ? '#ff4d4d'
      : bloqueado ? '#ff7a1a'
        : respondio ? '#39ff14'
          : puesto < 3 ? COLOR_PUESTO[puesto]
            : 'rgba(255,255,255,.22)';

  const canciones = getTimelineProgress(jugador);
  const enPodio = puesto < 3;

  return (
    <div className="tv-entra flex shrink-0 flex-col items-center" style={{ width: tam }}>
      <div className="relative" style={{ width: tam, height: tam }}>
        {/* Disco */}
        <img
          src="/images/vinilo.png"
          alt=""
          className={girando ? 'tv-vinilo' : undefined}
          style={{
            width: '100%', height: '100%', display: 'block',
            borderRadius: '50%',
            boxShadow: `0 0 0 0.5vmin ${aro}`
          }}
        />

        {/* Etiqueta central con la cara */}
        <div
          className="absolute overflow-hidden rounded-full"
          style={{
            inset: '31%',
            border: `0.3vmin solid ${aro}`,
            background: '#0b0f17'
          }}
        >
          {isImageAvatar(jugador.avatar) ? (
            <img src={jugador.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center"
              style={{ fontSize: `calc(${tam} * 0.2)` }}
            >
              {jugador.avatar || '🎵'}
            </span>
          )}
        </div>

        {/* Puesto en la carrera. Es lo que la gente mira: quién va ganando. */}
        <div
          className="absolute flex items-center justify-center rounded-full font-black tabular-nums"
          style={{
            left: '-2%', top: '-2%',
            width: `calc(${tam} * 0.34)`, height: `calc(${tam} * 0.34)`,
            fontSize: `calc(${tam} * 0.17)`,
            background: enPodio ? COLOR_PUESTO[puesto] : '#1a2130',
            color: enPodio ? '#0b0f17' : '#93a0b8',
            border: `0.25vmin solid ${enPodio ? COLOR_PUESTO[puesto] : 'rgba(255,255,255,.18)'}`
          }}
        >
          {puesto + 1}
        </div>

        {/* Acierto, fallo o bloqueo, sobre el disco */}
        {(acerto || fallo || bloqueado) && (
          <div
            className="tv-pop absolute flex items-center justify-center rounded-full"
            style={{
              right: '-2%', top: '-2%',
              width: `calc(${tam} * 0.34)`, height: `calc(${tam} * 0.34)`,
              background: acerto ? '#39ff14' : fallo ? '#ff4d4d' : '#ff7a1a'
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: `calc(${tam} * 0.2)`, color: '#0b0f17' }}
            >
              {acerto ? 'check' : fallo ? 'close' : 'block'}
            </span>
          </div>
        )}

        {/* Ya respondió, antes de saber si acertó */}
        {respondio && !resultado && (
          <div
            className="absolute flex items-center justify-center rounded-full"
            style={{
              right: '-2%', top: '-2%',
              width: `calc(${tam} * 0.28)`, height: `calc(${tam} * 0.28)`,
              background: '#39ff14'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: `calc(${tam} * 0.17)`, color: '#0b0f17' }}>
              check
            </span>
          </div>
        )}
      </div>

      <p
        className="mt-[0.8vmin] w-full truncate text-center font-black"
        style={{ fontSize: `calc(${tam} * 0.15)`, color: '#eef3ff' }}
      >
        {jugador.name}
      </p>

      <div className="flex items-baseline gap-[0.8vmin]">
        <span className="font-black tabular-nums" style={{ fontSize: `calc(${tam} * 0.17)`, color: '#39ff14' }}>
          {canciones}<span style={{ color: '#6b7686', fontWeight: 400 }}>/{meta}</span>
        </span>
        {resultado && typeof resultado.delta === 'number' && (
          <span
            className="tv-pop font-black tabular-nums"
            style={{ fontSize: `calc(${tam} * 0.15)`, color: resultado.delta >= 0 ? '#39ff14' : '#ff4d4d' }}
          >
            {resultado.delta >= 0 ? '+' : ''}{resultado.delta}
            {resultado.speedBonus > 0 && <span style={{ color: '#ffbf4d' }}>⚡</span>}
          </span>
        )}
      </div>
    </div>
  );
}

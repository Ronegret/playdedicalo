import { memo } from 'react';
import { getTimelineProgress } from '../../store/useGameStore';
import { isImageAvatar } from '../../data/characterAvatars';

/**
 * UN JUGADOR = SU CARA, DENTRO DE UN DISCO
 *
 * El cambio importante frente a la primera versión: manda la CARA, no el
 * disco. Antes la etiqueta central ocupaba un 38 % del disco y desde el sofá
 * el avatar era una mancha; ahora ocupa un 62 % y el vinilo es el marco. A
 * tres metros de distancia lo que tiene que reconocerse en medio segundo es
 * "ese soy yo", y eso es la cara.
 *
 * Sobre el rendimiento, que aquí es la mitad del trabajo:
 *
 *  - El disco es una IMAGEN que se gira. Girar un mapa de bits es casi
 *    gratis; girar un degradado repetido obliga a la GPU a redibujar todos
 *    los surcos en cada fotograma, y eso era lo que se quedaba pegado.
 *  - El aro de color va en un elemento APARTE, quieto. Antes era una
 *    `box-shadow` sobre la propia imagen que gira: la tele tenía que
 *    recalcular la sombra en cada vuelta, para dibujar exactamente el mismo
 *    círculo, porque un anillo girado no cambia.
 *  - Solo gira el disco de quien acaba de acertar. Veinte discos girando a la
 *    vez tumban cualquier televisor.
 *
 * Y va envuelto en `memo`: la pantalla se repinta varias veces por segundo
 * (la cuenta atrás, la presencia de Firebase), y sin esto se rehacían los
 * veinte discos cada vez para acabar dibujando lo mismo.
 */

const COLOR_PUESTO = ['#ffbf4d', '#dbe4f0', '#ff9a4d'];

function VinilloJugador({
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
        {/* Aro de color, quieto y aparte del disco que gira. */}
        <div
          className="absolute rounded-full"
          style={{ inset: '-2%', border: `0.5vmin solid ${aro}` }}
        />

        {/* Disco */}
        <img
          src="/images/vinilo.png"
          alt=""
          className={girando ? 'tv-vinilo' : undefined}
          style={{ width: '100%', height: '100%', display: 'block', borderRadius: '50%' }}
        />

        {/* LA CARA. Grande: es lo único que hay que reconocer desde el sofá. */}
        <div
          className="absolute overflow-hidden rounded-full"
          style={{
            inset: '19%',
            border: `0.3vmin solid ${aro}`,
            background: '#0b0f17'
          }}
        >
          {isImageAvatar(jugador.avatar) ? (
            <img src={jugador.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center"
              style={{ fontSize: `calc(${tam} * 0.36)`, lineHeight: 1 }}
            >
              {jugador.avatar || '🎵'}
            </span>
          )}
        </div>

        {/* Puesto en la carrera. Es lo que la gente mira: quién va ganando. */}
        <div
          className="absolute flex items-center justify-center rounded-full font-black tabular-nums"
          style={{
            left: '-4%', top: '-4%',
            width: `calc(${tam} * 0.34)`, height: `calc(${tam} * 0.34)`,
            fontSize: `calc(${tam} * 0.19)`,
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
              right: '-4%', top: '-4%',
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
              right: '-4%', top: '-4%',
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
        style={{ fontSize: `calc(${tam} * 0.16)`, color: '#eef3ff' }}
      >
        {jugador.name}
      </p>

      <div className="flex items-baseline gap-[0.8vmin]">
        <span className="font-black tabular-nums" style={{ fontSize: `calc(${tam} * 0.18)`, color: '#39ff14' }}>
          {canciones}<span style={{ color: '#6b7686', fontWeight: 400 }}>/{meta}</span>
        </span>
        {resultado && typeof resultado.delta === 'number' && (
          <span
            className="tv-pop font-black tabular-nums"
            style={{ fontSize: `calc(${tam} * 0.16)`, color: resultado.delta >= 0 ? '#39ff14' : '#ff4d4d' }}
          >
            {resultado.delta >= 0 ? '+' : ''}{resultado.delta}
            {resultado.speedBonus > 0 && <span style={{ color: '#ffbf4d' }}>⚡</span>}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Se compara a mano porque `jugador` y `resultado` llegan como objetos
 * nuevos en cada mensaje de Firebase aunque no haya cambiado nada dentro. Un
 * `memo` a secas no filtraría nada.
 */
function mismosDatos(a, b) {
  return a.tam === b.tam
    && a.puesto === b.puesto
    && a.meta === b.meta
    && a.estado === b.estado
    && a.girando === b.girando
    && a.jugador.id === b.jugador.id
    && a.jugador.name === b.jugador.name
    && a.jugador.avatar === b.jugador.avatar
    && getTimelineProgress(a.jugador) === getTimelineProgress(b.jugador)
    && a.resultado?.isCorrect === b.resultado?.isCorrect
    && a.resultado?.blocked === b.resultado?.blocked
    && a.resultado?.delta === b.resultado?.delta
    && a.resultado?.speedBonus === b.resultado?.speedBonus;
}

export default memo(VinilloJugador, mismosDatos);

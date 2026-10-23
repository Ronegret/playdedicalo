import { memo } from 'react';
import { getTimelineProgress } from '../../store/useGameStore';
import { isImageAvatar } from '../../data/characterAvatars';

/**
 * UN JUGADOR EN LA TELE
 *
 * Sustituye al disco de vinilo. El vinilo era bonito de cerca y un problema
 * a tres metros: la imagen del disco ocupaba el 60 % del círculo y la cara
 * quedaba reducida a una pastilla en el centro. Desde el sofá lo que hay que
 * reconocer en medio segundo es la cara, así que ahora la cara ES el
 * círculo, de borde a borde.
 *
 * Alrededor va un arco con lo que lleva acumulado, para poder ver quién va
 * ganando sin leer un solo número. El arco es un `conic-gradient`: se dibuja
 * una vez y solo se vuelve a dibujar cuando alguien acierta, así que en una
 * tele no cuesta nada. Nada aquí se anima en bucle — eso es lo que hacía que
 * la pantalla se atascara.
 */

const COLOR_PUESTO = ['#ffbf4d', '#dbe4f0', '#ff9a4d'];

function FichaJugador({ jugador, tam, puesto, meta, resultado, estado }) {
  const acerto = resultado?.isCorrect;
  const fallo = resultado && !resultado.isCorrect && !resultado.blocked;
  const bloqueado = resultado?.blocked || estado === 'bloqueado';
  const respondio = estado === 'respondio';

  const acumulados = getTimelineProgress(jugador);
  const avance = Math.min(1, meta ? acumulados / meta : 0);
  const enPodio = puesto < 3;

  const aro = acerto ? '#39ff14'
    : fallo ? '#ff4d4d'
      : bloqueado ? '#ff7a1a'
        : enPodio ? COLOR_PUESTO[puesto]
          : 'rgba(255,255,255,.28)';

  // El arco puede ser tenue —es decoración— pero el número NO: con el mismo
  // color, los años del cuarto en adelante se quedaban en un gris que no se
  // leía desde el sofá, y ese número es medio marcador de la partida.
  const colorCifra = acerto ? '#39ff14'
    : fallo ? '#ff4d4d'
      : bloqueado ? '#ff7a1a'
        : enPodio ? COLOR_PUESTO[puesto]
          : '#dfe7f5';

  return (
    <div className="tv-entra flex shrink-0 flex-col items-center" style={{ width: tam }}>
      <div className="relative" style={{ width: tam, height: tam }}>
        {/* Arco de progreso: cuánto lleva de la meta, de un vistazo. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${aro} ${avance * 360}deg, rgba(255,255,255,.10) 0deg)`
          }}
        />

        {/* La cara, de borde a borde. */}
        <div
          className="absolute overflow-hidden rounded-full"
          style={{
            inset: '7%',
            background: 'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.05) 0 0.1vmin, transparent 0.1vmin 0.7vmin), #0b0f17',
            border: `0.25vmin solid ${aro}`,
            boxShadow: `0 0 2.4vmin ${aro}33`
          }}
        >
          {isImageAvatar(jugador.avatar) ? (
            <img src={jugador.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center"
              style={{ fontSize: `calc(${tam} * 0.52)`, lineHeight: 1 }}
            >
              {jugador.avatar || '🎵'}
            </span>
          )}
        </div>

        {/* Puesto en la carrera */}
        <div
          className="tv-cifra absolute flex items-center justify-center rounded-full"
          style={{
            left: '-3%', top: '-3%',
            width: `calc(${tam} * 0.36)`, height: `calc(${tam} * 0.36)`,
            fontSize: `calc(${tam} * 0.2)`,
            background: enPodio ? COLOR_PUESTO[puesto] : '#1a2130',
            color: enPodio ? '#0b0f17' : '#93a0b8',
            border: `0.25vmin solid ${enPodio ? COLOR_PUESTO[puesto] : 'rgba(255,255,255,.18)'}`
          }}
        >
          {puesto + 1}
        </div>

        {/* Acierto, fallo, bloqueo, o "ya ha contestado" */}
        {(acerto || fallo || bloqueado || respondio) && (
          <div
            className="tv-pop absolute flex items-center justify-center rounded-full"
            style={{
              right: '-3%', top: '-3%',
              width: `calc(${tam} * 0.36)`, height: `calc(${tam} * 0.36)`,
              background: acerto ? '#39ff14' : fallo ? '#ff4d4d' : bloqueado ? '#ff7a1a' : '#39ff14',
              opacity: respondio && !resultado ? 0.85 : 1
            }}
          >
            <span aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: `calc(${tam} * 0.22)`, color: '#0b0f17' }}
            >
              {acerto ? 'check' : fallo ? 'close' : bloqueado ? 'block' : 'check'}
            </span>
          </div>
        )}

        {/* Lo ganado o perdido esta ronda, como chapa sobre la ficha. En la
            misma línea que el marcador, un "+3 ⚡" partía el renglón en dos y
            descuadraba la fila entera. */}
        {resultado && typeof resultado.delta === 'number' && resultado.delta !== 0 && (
          <div
            className="tv-pop tv-cifra absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full"
            style={{
              // Dentro del círculo, no colgando por debajo: colgando se
              // comía el nombre del jugador.
              bottom: '2%',
              padding: `calc(${tam} * 0.03) calc(${tam} * 0.12)`,
              fontSize: `calc(${tam} * 0.18)`,
              color: '#0b0f17',
              background: resultado.delta > 0 ? '#39ff14' : '#ff4d4d',
              whiteSpace: 'nowrap'
            }}
          >
            {resultado.delta > 0 ? '+' : ''}{resultado.delta}
            {resultado.speedBonus > 0 && <span>⚡</span>}
          </div>
        )}
      </div>

      <p
        className="tv-titular mt-[0.9vmin] w-full truncate text-center"
        style={{ fontSize: `calc(${tam} * 0.18)`, color: '#eef3ff' }}
      >
        {jugador.name}
      </p>

      {/* Años acumulados: el marcador de verdad de esta partida. */}
      <div className="flex items-baseline gap-[0.6vmin] whitespace-nowrap">
        <span className="tv-cifra" style={{ fontSize: `calc(${tam} * 0.26)`, color: colorCifra }}>
          {acumulados}
        </span>
        <span className="tv-etiqueta" style={{ fontSize: `calc(${tam} * 0.13)`, color: '#8695ad' }}>
          /{meta} años
        </span>
      </div>
    </div>
  );
}

/**
 * Se compara a mano porque `jugador` y `resultado` llegan como objetos nuevos
 * en cada mensaje de Firebase aunque dentro no haya cambiado nada. Un `memo`
 * a secas no filtraría ni uno.
 */
function mismosDatos(a, b) {
  return a.tam === b.tam
    && a.puesto === b.puesto
    && a.meta === b.meta
    && a.estado === b.estado
    && a.jugador.id === b.jugador.id
    && a.jugador.name === b.jugador.name
    && a.jugador.avatar === b.jugador.avatar
    && getTimelineProgress(a.jugador) === getTimelineProgress(b.jugador)
    && a.resultado?.isCorrect === b.resultado?.isCorrect
    && a.resultado?.blocked === b.resultado?.blocked
    && a.resultado?.delta === b.resultado?.delta
    && a.resultado?.speedBonus === b.resultado?.speedBonus;
}

export default memo(FichaJugador, mismosDatos);

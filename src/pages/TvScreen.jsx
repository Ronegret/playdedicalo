import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTimelineProgress, useGameStore } from '../store/useGameStore';
import { isImageAvatar } from '../data/characterAvatars';
import { desbloquearAudio, pararMusica, sonarCancionAleatoria } from '../services/musica';

/**
 * PANTALLA DE TELEVISIÓN
 *
 * La tele es un escaparate: enseña lo que pasa y no se toca nunca. El mando
 * son los móviles. Eso quita de un plumazo lo más costoso de programar para
 * televisión (mover el foco con la cruceta) y deja solo una pantalla que
 * mirar entre varios.
 *
 * Reglas propias, distintas al resto de la app a propósito:
 *
 *  - CERO desenfoque de fondo. Es el efecto que peor llevan las GPU de las
 *    teles; la app lo usa en 48 sitios y por eso esta pantalla no reutiliza
 *    los componentes normales.
 *  - Animación mínima y sin bucles infinitos.
 *  - Todo en vmin, para que escale igual en 1080p y en 4K.
 *  - Márgenes del 5 %: muchas teles recortan los bordes.
 *  - Nada de blanco puro sobre negro puro: en un panel grande hace halo.
 */

const SAFE = '5vmin';

// Único punto donde entra información: el PIN de la sala. Se teclea una vez
// por fiesta con la cruceta, sobre una rejilla de 3x4 para que basten dos o
// tres pulsaciones por dígito.
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ok'];

function Teclado({ onConfirmar }) {
  const [pin, setPin] = useState('');
  const [foco, setFoco] = useState(0);
  const contenedor = useRef(null);

  useEffect(() => {
    contenedor.current?.focus();
  }, []);

  const pulsar = useCallback((tecla) => {
    if (tecla === 'borrar') { setPin((p) => p.slice(0, -1)); return; }
    if (tecla === 'ok') { if (pin.length === 4) onConfirmar(pin); return; }
    setPin((p) => (p.length >= 4 ? p : p + tecla));
  }, [pin, onConfirmar]);

  // Navegación con la cruceta del mando. Es lo único interactivo de toda la
  // aplicación de tele, así que se resuelve aquí y no hace falta un sistema
  // de foco como el que exigen las apps de televisión al uso.
  const alPulsarTecla = (evento) => {
    const { key } = evento;
    const col = foco % 3;
    const fila = Math.floor(foco / 3);
    let siguiente;
    if (key === 'ArrowRight') siguiente = fila * 3 + Math.min(2, col + 1);
    else if (key === 'ArrowLeft') siguiente = fila * 3 + Math.max(0, col - 1);
    else if (key === 'ArrowDown') siguiente = Math.min(TECLAS.length - 1, foco + 3);
    else if (key === 'ArrowUp') siguiente = Math.max(0, foco - 3);
    else if (key === 'Enter' || key === ' ') { pulsar(TECLAS[foco]); evento.preventDefault(); return; }
    else if (/^[0-9]$/.test(key)) { pulsar(key); return; }
    else if (key === 'Backspace') { pulsar('borrar'); return; }
    else return;
    evento.preventDefault();
    setFoco(siguiente);
  };

  return (
    <div
      ref={contenedor}
      tabIndex={0}
      onKeyDown={alPulsarTecla}
      className="flex flex-col items-center outline-none"
    >
      <p style={{ fontSize: '2.6vmin', letterSpacing: '0.3em' }} className="text-tv-dim">
        PIN DE LA SALA
      </p>
      <div className="mt-[2vmin] flex gap-[1.6vmin]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-[1.4vmin] border-[0.4vmin] tabular-nums"
            style={{
              width: '11vmin',
              height: '14vmin',
              fontSize: '8vmin',
              fontWeight: 800,
              borderColor: pin.length === i ? '#39ff14' : 'rgba(255,255,255,.18)',
              background: 'rgba(255,255,255,.04)',
              color: '#eef3ff'
            }}
          >
            {pin[i] || ''}
          </div>
        ))}
      </div>

      <div className="mt-[4vmin] grid grid-cols-3 gap-[1.4vmin]">
        {TECLAS.map((tecla, i) => (
          <button
            key={tecla}
            type="button"
            onClick={() => { setFoco(i); pulsar(tecla); }}
            className="rounded-[1.2vmin] border-[0.3vmin] font-bold"
            style={{
              width: '13vmin',
              height: '8.5vmin',
              fontSize: tecla.length > 1 ? '2.2vmin' : '4vmin',
              borderColor: foco === i ? '#39ff14' : 'rgba(255,255,255,.16)',
              background: foco === i ? 'rgba(57,255,20,.16)' : 'rgba(255,255,255,.04)',
              color: foco === i ? '#39ff14' : '#c9d2e2'
            }}
          >
            {tecla === 'borrar' ? '←' : tecla === 'ok' ? 'ENTRAR' : tecla}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '2.2vmin' }} className="mt-[3vmin] text-tv-dim">
        Muévete con la cruceta · también puedes teclear los números
      </p>
    </div>
  );
}

function Avatar({ jugador, tam = '9vmin', estado }) {
  const borde = estado === 'ok' ? '#39ff14' : estado === 'bloqueado' ? '#ff7a1a' : 'rgba(255,255,255,.2)';
  return (
    <div className="flex flex-col items-center" style={{ width: tam }}>
      <div
        className="flex items-center justify-center overflow-hidden rounded-full border-[0.45vmin]"
        style={{ width: tam, height: tam, borderColor: borde, background: 'rgba(255,255,255,.06)' }}
      >
        {isImageAvatar(jugador.avatar) ? (
          <img src={jugador.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span style={{ fontSize: `calc(${tam} * 0.45)` }}>{jugador.avatar || '🎵'}</span>
        )}
      </div>
      <p
        className="mt-[0.8vmin] w-full truncate text-center"
        style={{ fontSize: '1.8vmin', color: '#c9d2e2' }}
      >
        {jugador.name}
      </p>
    </div>
  );
}

export default function TvScreen() {
  const [params] = useSearchParams();
  const [pinElegido, setPinElegido] = useState(() => (params.get('pin') || '').replace(/\D/g, '').slice(0, 4));

  const pin = useGameStore((s) => s.pin);
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.round);
  const players = useGameStore((s) => s.players);
  const roundAnswers = useGameStore((s) => s.roundAnswers) || {};
  const revealResults = useGameStore((s) => s.revealResults) || {};
  const currentTrack = useGameStore((s) => s.currentTrack);
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const targetYears = useGameStore((s) => s.targetYears);
  const observarSala = useGameStore((s) => s.tvObserveRoom);
  const dejarDeObservar = useGameStore((s) => s.tvStopObserving);
  const reclamarAudio = useGameStore((s) => s.tvClaimAudio);
  const soltarAudio = useGameStore((s) => s.tvReleaseAudio);
  const audioEnTv = useGameStore((s) => s.audioEnTv);
  const listaUrl = useGameStore((s) => s.spotifyPlaylistUrl);
  const [puedeSonar, setPuedeSonar] = useState(false);
  const rondaSonandoRef = useRef('');

  useEffect(() => {
    if (pinElegido.length !== 4) return undefined;
    observarSala(pinElegido);
    return () => dejarDeObservar();
  }, [pinElegido, observarSala, dejarDeObservar]);

  // Una partida son muchos minutos mirando sin tocar el mando: sin esto la
  // tele se pone en reposo a mitad de ronda. En la app de Android esto lo
  // refuerza además FLAG_KEEP_SCREEN_ON.
  useEffect(() => {
    let bloqueo = null;
    let cancelado = false;
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator) bloqueo = await navigator.wakeLock.request('screen');
      } catch { /* no soportado: no pasa nada */ }
    };
    pedir();
    const alVolver = () => { if (!cancelado && document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alVolver);
      bloqueo?.release?.().catch(() => {});
    };
  }, []);

  // La tele reclama la música solo si CONSIGUIÓ desbloquear el audio. Decir
  // "estoy conectada" y "puedo sonar" son cosas distintas: prometer un
  // altavoz que luego no suena dejaría la sala en silencio.
  useEffect(() => {
    if (pinElegido.length !== 4 || !puedeSonar) return undefined;
    const idTele = `tv-${Math.random().toString(36).slice(2, 10)}`;
    reclamarAudio(idTele);
    return () => { soltarAudio(); };
  }, [pinElegido, puedeSonar, reclamarAudio, soltarAudio]);

  // Reproducir la canción de la ronda, si la música es suya. El cambio de
  // altavoz solo ocurre entre rondas: mudarlo a mitad de canción sería un
  // corte feo, así que esto solo actúa al empezar una nueva.
  useEffect(() => {
    if (!audioEnTv || phase !== 'listen' || !listaUrl) return;
    const clave = `${round}-${listaUrl}`;
    if (rondaSonandoRef.current === clave) return;
    rondaSonandoRef.current = clave;
    sonarCancionAleatoria(listaUrl).catch((error) => {
      console.error('La tele no pudo poner la música:', error);
      // Se suelta el audio para que el móvil del anfitrión lo recupere en
      // vez de dejar la ronda muda.
      soltarAudio();
    });
  }, [audioEnTv, phase, round, listaUrl, soltarAudio]);

  // Cortar en cuanto acaba la escucha, y al apagar la pantalla.
  useEffect(() => {
    if (phase !== 'listen') pararMusica();
  }, [phase]);
  useEffect(() => () => pararMusica(), []);

  const conectados = useMemo(() => (players || []).filter((p) => p.status !== 'kicked'), [players]);
  const respondieron = Object.keys(roundAnswers).length;
  const hayReveal = Object.keys(revealResults).length > 0;

  const enlace = typeof window !== 'undefined'
    ? `${window.location.origin}/guest/join?pin=${pin || pinElegido}`
    : '';
  const qr = enlace
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(enlace)}`
    : '';

  if (pinElegido.length !== 4) {
    return (
      <div className="tv-root" style={{ padding: SAFE }}>
        <div className="flex h-full flex-col items-center justify-center">
          <h1 style={{ fontSize: '7vmin' }} className="font-black tracking-tight text-tv-ink">
            DEDÍCALO <span style={{ color: '#39ff14' }}>PLAY</span>
          </h1>
          <p style={{ fontSize: '2.6vmin' }} className="mt-[1vmin] mb-[5vmin] text-tv-dim">
            Crea la sala en el móvil y escribe aquí su PIN
          </p>
          <Teclado
            onConfirmar={(codigo) => {
              // Pulsar ENTRAR con el mando ES el gesto que el navegador
              // exige para dejar sonar audio. Se aprovecha aquí, que es el
              // único momento en toda la partida en que alguien toca la
              // tele.
              desbloquearAudio().then(setPuedeSonar).catch(() => setPuedeSonar(false));
              setPinElegido(codigo);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tv-root" style={{ padding: SAFE }}>
      <div className="flex h-full gap-[4vmin]">

        {/* ── Columna fija: PIN y QR SIEMPRE visibles ──────────────────────
            A la sala se puede entrar en cualquier momento, también con la
            partida empezada (el anfitrión lo acepta desde su móvil). Si el
            PIN solo apareciera en la sala de espera, quien llegase tarde no
            tendría de dónde copiarlo. */}
        <aside
          className="flex shrink-0 flex-col items-center rounded-[2vmin] px-[2.5vmin] py-[3vmin]"
          style={{
            width: '30vmin',
            background: 'rgba(255,255,255,.04)',
            border: '0.25vmin solid rgba(255,255,255,.10)'
          }}
        >
          <p style={{ fontSize: '2vmin', letterSpacing: '0.26em' }} className="text-tv-dim">ENTRA CON</p>
          <p
            style={{ fontSize: '9.5vmin', lineHeight: 1.05, color: '#39ff14', letterSpacing: '0.08em' }}
            className="font-black tabular-nums"
          >
            {pin || pinElegido}
          </p>
          {qr && (
            <div className="mt-[2vmin] rounded-[1.2vmin] bg-white p-[1vmin]">
              <img
                src={qr}
                alt="Código QR para entrar a la sala"
                style={{ width: '19vmin', height: '19vmin', display: 'block' }}
              />
            </div>
          )}
          <p style={{ fontSize: '1.9vmin' }} className="mt-[1.6vmin] text-center text-tv-dim">
            play.dedicalo.es
          </p>
          <p style={{ fontSize: '1.7vmin' }} className="mt-[1.5vmin] text-center leading-snug text-tv-dim">
            Puedes unirte en cualquier momento
          </p>

          {conectados.length > 0 && (
            <p style={{ fontSize: '2.2vmin' }} className="mt-auto pt-[2vmin] font-black tabular-nums text-tv-ink">
              {conectados.length} <span className="font-normal text-tv-dim">jugando</span>
            </p>
          )}
        </aside>

        {/* ── Zona principal: lo que está pasando en la partida ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-baseline justify-between">
            <p style={{ fontSize: '3vmin' }} className="font-black tracking-tight text-tv-ink">
              DEDÍCALO <span style={{ color: '#39ff14' }}>PLAY</span>
            </p>
            {phase !== 'lobby' && phase !== 'final' && (
              <p style={{ fontSize: '2.4vmin', letterSpacing: '0.2em' }} className="text-tv-dim">
                RONDA {round}
              </p>
            )}
          </header>

          <main className="flex flex-1 flex-col items-center justify-center">
            {phase === 'lobby' && !hayReveal && (
              <div className="flex flex-col items-center text-center">
                <p style={{ fontSize: '4.5vmin' }} className="font-black text-tv-ink">
                  {conectados.length === 0 ? 'Esperando jugadores' : 'Listos para empezar'}
                </p>
                <p style={{ fontSize: '2.4vmin' }} className="mt-[1vmin] text-tv-dim">
                  El anfitrión arranca la partida desde su móvil
                </p>
              </div>
            )}

            {phase === 'listen' && (
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '30vmin',
                    height: '30vmin',
                    border: '0.8vmin solid #39ff14',
                    background: 'radial-gradient(circle,#141a26 0 32%,#0b0f17 32% 100%)'
                  }}
                >
                  <p style={{ fontSize: '4.5vmin', color: '#39ff14' }} className="font-black tracking-widest">
                    ESCUCHA
                  </p>
                </div>
                <p style={{ fontSize: '2.6vmin' }} className="mt-[3vmin] text-tv-dim">
                  Nadie ve la canción todavía
                </p>
              </div>
            )}

            {phase === 'blackout' && !hayReveal && (
              <div className="flex flex-col items-center text-center">
                <p style={{ fontSize: '5.5vmin' }} className="font-black text-tv-ink">
                  {currentQuestion?.text || '¿De qué año es?'}
                </p>
                <p style={{ fontSize: '8vmin', color: '#39ff14' }} className="mt-[1.5vmin] font-black tabular-nums">
                  {respondieron}<span className="text-tv-dim">/{conectados.length}</span>
                </p>
                <p style={{ fontSize: '2.4vmin', letterSpacing: '0.24em' }} className="text-tv-dim">
                  HAN RESPONDIDO
                </p>
              </div>
            )}

            {hayReveal && currentTrack && (
              <div className="flex w-full flex-col items-center text-center">
                <p style={{ fontSize: '2.4vmin', letterSpacing: '0.3em' }} className="text-tv-dim">
                  LA CANCIÓN ERA
                </p>
                <p style={{ fontSize: '4.8vmin' }} className="mt-[1vmin] w-full truncate font-black text-tv-ink">
                  {currentTrack.name || currentTrack.title}
                </p>
                <p style={{ fontSize: '3vmin' }} className="w-full truncate text-tv-dim">
                  {currentTrack.artist || currentTrack.artists}
                </p>
                <p
                  style={{ fontSize: '18vmin', lineHeight: 1, color: '#ffbf4d' }}
                  className="mt-[1.5vmin] font-black tabular-nums tv-pop"
                >
                  {currentQuestion?.songYear ?? currentTrack.releaseYear}
                </p>
              </div>
            )}

            {phase === 'final' && (
              <div className="flex w-full flex-col items-center">
                <p style={{ fontSize: '6vmin', color: '#ffbf4d' }} className="font-black">FIN DE LA PARTIDA</p>
                <div className="mt-[4vmin] flex items-end justify-center gap-[4vmin]">
                  {[...conectados]
                    .sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a))
                    .slice(0, 3)
                    .map((jugador, i) => (
                      <div key={jugador.id} className="flex flex-col items-center">
                        <p
                          style={{ fontSize: '3vmin', color: ['#ffbf4d', '#e2e8f0', '#ff7a1a'][i] }}
                          className="font-black"
                        >
                          {i + 1}º
                        </p>
                        <Avatar jugador={jugador} tam={i === 0 ? '14vmin' : '10vmin'} estado="ok" />
                        <p style={{ fontSize: '2.2vmin' }} className="mt-[0.6vmin] tabular-nums text-tv-dim">
                          {getTimelineProgress(jugador)}/{targetYears}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </main>

          {/* Quién está y cómo va. En el podio sobra: ya salen en grande. */}
          {phase !== 'final' && conectados.length > 0 && (
            <footer className="flex flex-wrap justify-center gap-[2vmin] pt-[1.5vmin]">
              {conectados.slice(0, 12).map((jugador) => {
                const bloqueado = jugador.activeAttack?.type === 'block_vote'
                  && jugador.activeAttack?.round === round;
                const respondio = Boolean(roundAnswers[jugador.id]);
                return (
                  <Avatar
                    key={jugador.id}
                    jugador={jugador}
                    tam="7vmin"
                    estado={bloqueado ? 'bloqueado' : respondio ? 'ok' : 'espera'}
                  />
                );
              })}
              {conectados.length > 12 && (
                <p style={{ fontSize: '2.2vmin' }} className="self-center text-tv-dim">
                  +{conectados.length - 12}
                </p>
              )}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

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
 * televisión (mover el foco con la cruceta).
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

// Margen de seguridad. Muchos televisores recortan físicamente los bordes
// (overscan) hasta un 5 % por lado, y el navegador no se entera: cree que
// dibuja en toda la pantalla. Por eso el margen es generoso.
const SAFE = '6vmin';

// Código que enseña la tele para que lo escanee el anfitrión. Sin vocales ni
// caracteres que se confundan de lejos (0/O, 1/I): esto se lee a tres metros.
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function nuevoCodigo() {
  let c = '';
  for (let i = 0; i < 6; i += 1) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return c;
}

function urlQr(datos, tam = 340) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tam}x${tam}&margin=0&data=${encodeURIComponent(datos)}`;
}

// ── Teclado de reserva ──────────────────────────────────────────────────────
// Escanear el QR es el camino bueno, pero si alguien no puede (cámara rota,
// móvil viejo) tiene que haber una salida. Va escondido tras un botón para no
// competir con el QR, que es lo que queremos que usen.
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ok'];

function Teclado({ onConfirmar }) {
  const [pin, setPin] = useState('');
  const [foco, setFoco] = useState(0);
  const caja = useRef(null);

  useEffect(() => { caja.current?.focus(); }, []);

  const pulsar = useCallback((tecla) => {
    if (tecla === 'borrar') { setPin((p) => p.slice(0, -1)); return; }
    if (tecla === 'ok') { if (pin.length === 4) onConfirmar(pin); return; }
    setPin((p) => (p.length >= 4 ? p : p + tecla));
  }, [pin, onConfirmar]);

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
    <div ref={caja} tabIndex={0} onKeyDown={alPulsarTecla} className="flex flex-col items-center outline-none">
      <div className="flex gap-[1.4vmin]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-[1.2vmin] border-[0.35vmin] tabular-nums"
            style={{
              width: '9vmin', height: '11.5vmin', fontSize: '6.5vmin', fontWeight: 800,
              borderColor: pin.length === i ? '#39ff14' : 'rgba(255,255,255,.18)',
              background: 'rgba(255,255,255,.04)', color: '#eef3ff'
            }}
          >
            {pin[i] || ''}
          </div>
        ))}
      </div>
      <div className="mt-[2.5vmin] grid grid-cols-3 gap-[1.1vmin]">
        {TECLAS.map((tecla, i) => (
          <button
            key={tecla}
            type="button"
            onClick={() => { setFoco(i); pulsar(tecla); }}
            className="rounded-[1vmin] border-[0.25vmin] font-bold"
            style={{
              width: '11vmin', height: '7vmin',
              fontSize: tecla.length > 1 ? '1.8vmin' : '3.2vmin',
              borderColor: foco === i ? '#39ff14' : 'rgba(255,255,255,.16)',
              background: foco === i ? 'rgba(57,255,20,.16)' : 'rgba(255,255,255,.04)',
              color: foco === i ? '#39ff14' : '#c9d2e2'
            }}
          >
            {tecla === 'borrar' ? '←' : tecla === 'ok' ? 'ENTRAR' : tecla}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Ficha de jugador del marcador ───────────────────────────────────────────
// Concentra TODO lo que hay que saber de alguien: quién es, cuántas canciones
// lleva (que es lo que gana la partida), sus puntos, si ya respondió, si le
// han saboteado y —en el momento del reveal— si acertó y cuánto se lleva.
function Ficha({ jugador, tam, estado, resultado, meta }) {
  const acerto = resultado?.isCorrect;
  const fallo = resultado && !resultado.isCorrect && !resultado.blocked;
  const bloqueado = resultado?.blocked || estado === 'bloqueado';

  const borde = acerto ? '#39ff14'
    : fallo ? '#ff4d4d'
      : bloqueado ? '#ff7a1a'
        : estado === 'respondio' ? '#39ff14'
          : 'rgba(255,255,255,.18)';

  const fondo = acerto ? 'rgba(57,255,20,.14)'
    : fallo ? 'rgba(255,77,77,.12)'
      : bloqueado ? 'rgba(255,122,26,.12)'
        : 'rgba(255,255,255,.04)';

  const canciones = getTimelineProgress(jugador);

  return (
    <div
      className="flex shrink-0 flex-col items-center rounded-[1.4vmin] px-[1vmin] py-[1.2vmin] transition-colors"
      style={{ width: `calc(${tam} * 2)`, background: fondo, border: `0.25vmin solid ${borde}` }}
    >
      <div className="relative">
        <div
          className="flex items-center justify-center overflow-hidden rounded-full"
          style={{ width: tam, height: tam, border: `0.4vmin solid ${borde}`, background: 'rgba(255,255,255,.06)' }}
        >
          {isImageAvatar(jugador.avatar) ? (
            <img src={jugador.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span style={{ fontSize: `calc(${tam} * 0.45)` }}>{jugador.avatar || '🎵'}</span>
          )}
        </div>

        {/* Marca de acierto, fallo o bloqueo, encima del avatar */}
        {(acerto || fallo || bloqueado) && (
          <span
            className="absolute -right-[0.6vmin] -top-[0.6vmin] flex items-center justify-center rounded-full tv-pop"
            style={{
              width: `calc(${tam} * 0.42)`, height: `calc(${tam} * 0.42)`,
              background: acerto ? '#39ff14' : fallo ? '#ff4d4d' : '#ff7a1a'
            }}
          >
            <span
              className="material-symbols-outlined text-black"
              style={{ fontSize: `calc(${tam} * 0.3)` }}
            >
              {acerto ? 'check' : fallo ? 'close' : 'block'}
            </span>
          </span>
        )}
      </div>

      <p className="mt-[0.6vmin] w-full truncate text-center font-bold" style={{ fontSize: '1.7vmin', color: '#eef3ff' }}>
        {jugador.name}
      </p>

      {/* Canciones (lo que gana) y puntos (lo que se gasta en sabotear) */}
      <div className="mt-[0.3vmin] flex items-baseline gap-[0.8vmin]">
        <span className="font-black tabular-nums" style={{ fontSize: '2vmin', color: '#39ff14' }}>
          {canciones}<span style={{ color: '#93a0b8', fontWeight: 400 }}>/{meta}</span>
        </span>
        <span className="tabular-nums" style={{ fontSize: '1.6vmin', color: '#93a0b8' }}>
          {jugador.points ?? 0} pts
        </span>
      </div>

      {/* En el reveal: cuánto se lleva esta ronda */}
      {resultado && typeof resultado.delta === 'number' && (
        <p
          className="tv-pop font-black tabular-nums"
          style={{ fontSize: '1.9vmin', color: resultado.delta >= 0 ? '#39ff14' : '#ff4d4d' }}
        >
          {resultado.delta >= 0 ? '+' : ''}{resultado.delta}
          {resultado.speedBonus > 0 && <span style={{ color: '#ffbf4d' }}> ⚡</span>}
        </p>
      )}
    </div>
  );
}

export default function TvScreen() {
  const [params] = useSearchParams();
  const [pinElegido, setPinElegido] = useState(() => (params.get('pin') || '').replace(/\D/g, '').slice(0, 4));
  const [codigoTv] = useState(nuevoCodigo);
  const [verTeclado, setVerTeclado] = useState(false);

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
  const esperarEnlace = useGameStore((s) => s.tvWaitForLink);
  const reclamarAudio = useGameStore((s) => s.tvClaimAudio);
  const soltarAudio = useGameStore((s) => s.tvReleaseAudio);
  const audioEnTv = useGameStore((s) => s.audioEnTv);
  const listaUrl = useGameStore((s) => s.spotifyPlaylistUrl);

  const [puedeSonar, setPuedeSonar] = useState(false);
  const rondaSonandoRef = useRef('');

  // Publicar el código y quedarse escuchando hasta que el anfitrión escanee.
  useEffect(() => {
    if (pinElegido.length === 4) return undefined;
    return esperarEnlace(codigoTv, (pinRecibido) => {
      // Llega el PIN por el QR: eso NO es un gesto del usuario en esta
      // pantalla, así que el audio puede seguir bloqueado. Se intenta igual
      // y, si no cuela, la música se queda en el móvil del anfitrión.
      desbloquearAudio().then(setPuedeSonar).catch(() => setPuedeSonar(false));
      setPinElegido(pinRecibido);
    });
  }, [pinElegido, codigoTv, esperarEnlace]);

  useEffect(() => {
    if (pinElegido.length !== 4) return undefined;
    observarSala(pinElegido);
    return () => dejarDeObservar();
  }, [pinElegido, observarSala, dejarDeObservar]);

  // Una partida son muchos minutos mirando sin tocar el mando.
  useEffect(() => {
    let bloqueo = null;
    let cancelado = false;
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator) bloqueo = await navigator.wakeLock.request('screen');
      } catch { /* no soportado */ }
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

  // La tele reclama la música solo si CONSIGUIÓ desbloquear el audio, y la
  // refresca cada 15 s. Sin ese latido la marca caduca a los 45 s y el móvil
  // del anfitrión recupera la música — que es justo lo que debe pasar si la
  // tele se apaga de golpe y no llega a avisar.
  useEffect(() => {
    if (pinElegido.length !== 4 || !puedeSonar || !pin) return undefined;
    const idTele = `tv-${Math.random().toString(36).slice(2, 10)}`;
    reclamarAudio(idTele);
    const latido = window.setInterval(() => reclamarAudio(idTele), 15000);
    return () => {
      window.clearInterval(latido);
      soltarAudio();
    };
  }, [pinElegido, puedeSonar, pin, reclamarAudio, soltarAudio]);

  useEffect(() => {
    if (!audioEnTv || phase !== 'listen' || !listaUrl) return;
    const clave = `${round}-${listaUrl}`;
    if (rondaSonandoRef.current === clave) return;
    rondaSonandoRef.current = clave;
    sonarCancionAleatoria(listaUrl).catch((error) => {
      console.error('La tele no pudo poner la música:', error);
      soltarAudio();
    });
  }, [audioEnTv, phase, round, listaUrl, soltarAudio]);

  useEffect(() => { if (phase !== 'listen') pararMusica(); }, [phase]);
  useEffect(() => () => pararMusica(), []);

  const conectados = useMemo(() => (players || []).filter((p) => p.status !== 'kicked'), [players]);
  const anfitrion = useMemo(() => (players || []).find((p) => p.isHost), [players]);

  // Bienvenida al enlazar. Va como franja SUPERPUESTA, no en lugar del QR:
  // si por lo que sea se quedara pegada, el QR se sigue viendo. El QR es lo
  // único que no puede faltar.
  //
  // La dependencia es un booleano y no el objeto del anfitrión: ese objeto se
  // crea de nuevo cada vez que cambia la lista de jugadores (y cambia sola,
  // por la presencia), lo que reejecutaba el efecto y cancelaba el
  // temporizador que retira el saludo. Resultado: el saludo no se iba nunca y
  // tapaba el QR para siempre. Fue exactamente el fallo.
  const hayAnfitrion = Boolean(anfitrion);
  const [bienvenida, setBienvenida] = useState(false);
  const yaSaludoRef = useRef(false);
  useEffect(() => {
    if (yaSaludoRef.current || pinElegido.length !== 4 || !hayAnfitrion) return undefined;
    yaSaludoRef.current = true;
    const mostrar = window.setTimeout(() => setBienvenida(true), 0);
    const quitar = window.setTimeout(() => setBienvenida(false), 5000);
    return () => { window.clearTimeout(mostrar); window.clearTimeout(quitar); };
  }, [pinElegido, hayAnfitrion]);
  const respondieron = Object.keys(roundAnswers).length;
  const hayReveal = Object.keys(revealResults).length > 0;

  // Ordenados por canciones: la tele es un marcador, y quien va ganando debe
  // estar el primero sin que nadie tenga que buscarlo.
  const clasificacion = useMemo(
    () => [...conectados].sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a)),
    [conectados]
  );

  // Sabotajes de esta ronda: quién se lo hizo a quién.
  const sabotajes = useMemo(() => conectados
    .filter((p) => p.activeAttack?.round === round && p.activeAttack?.from)
    .map((p) => ({ de: p.activeAttack.from, a: p.name, tipo: p.activeAttack.type })),
  [conectados, round]);

  const ganadorRapido = Object.values(revealResults).find((r) => r?.speedWinnerName)?.speedWinnerName;

  // Con mucha gente las fichas se encogen para que quepan todas sin
  // desplazar: nadie va a hacer scroll en una tele.
  const tamFicha = conectados.length > 14 ? '5vmin' : conectados.length > 8 ? '6.5vmin' : '8vmin';

  const enlaceJugar = typeof window !== 'undefined'
    ? `${window.location.origin}/guest/join?pin=${pin || pinElegido}` : '';

  // ── Pantalla de enlace ────────────────────────────────────────────────────
  if (pinElegido.length !== 4) {
    const enlaceTv = typeof window !== 'undefined'
      ? `${window.location.origin}/tv-link?tv=${codigoTv}` : '';
    return (
      <div className="tv-root" style={{ padding: SAFE }}>
        <div className="flex h-full flex-col items-center justify-center">
          <img
            src="/images/logo-main.png"
            alt="Dedícalo Play"
            style={{ height: '13vmin', width: 'auto' }}
          />

          {verTeclado ? (
            <>
              <p style={{ fontSize: '2.4vmin' }} className="mb-[3vmin] mt-[2vmin] text-tv-dim">
                Escribe el PIN de la sala con la cruceta
              </p>
              <Teclado onConfirmar={(codigo) => {
                desbloquearAudio().then(setPuedeSonar).catch(() => setPuedeSonar(false));
                setPinElegido(codigo);
              }} />
              <button
                type="button"
                onClick={() => setVerTeclado(false)}
                className="mt-[3vmin] rounded-[1vmin] border-[0.25vmin] border-white/20 px-[2.5vmin] py-[1.2vmin]"
                style={{ fontSize: '1.9vmin', color: '#93a0b8' }}
              >
                Mejor escaneo el código
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '3.2vmin' }} className="mt-[1.5vmin] font-bold text-tv-ink">
                Escanea este código con el móvil del anfitrión
              </p>
              <p style={{ fontSize: '2.2vmin' }} className="mt-[0.5vmin] text-tv-dim">
                La tele se conecta sola a tu sala
              </p>

              <div className="mt-[3vmin] rounded-[2vmin] bg-white p-[1.6vmin]">
                <img src={urlQr(enlaceTv, 420)} alt="Código para conectar la tele"
                  style={{ width: '34vmin', height: '34vmin', display: 'block' }} />
              </div>

              <p style={{ fontSize: '2vmin', letterSpacing: '0.3em' }} className="mt-[2.5vmin] text-tv-dim">
                O ESCRIBE EN play.dedicalo.es/tv-link
              </p>
              <p style={{ fontSize: '5vmin', letterSpacing: '0.22em', color: '#39ff14' }} className="font-black">
                {codigoTv}
              </p>

              <button
                type="button"
                onClick={() => setVerTeclado(true)}
                className="mt-[3vmin] rounded-[1vmin] border-[0.25vmin] border-white/20 px-[2.5vmin] py-[1.2vmin]"
                style={{ fontSize: '1.9vmin', color: '#93a0b8' }}
              >
                No puedo escanear · escribir el PIN
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Partida ───────────────────────────────────────────────────────────────
  return (
    <div className="tv-root" style={{ padding: SAFE }}>
      {/* Franja de bienvenida: encima de todo, sin quitarle el sitio a nada.
          Si alguna vez se quedara pegada, el QR se seguiría viendo debajo. */}
      {bienvenida && anfitrion && (
        <div
          className="tv-pop absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-[1.5vmin] rounded-full px-[3vmin] py-[1.2vmin]"
          style={{
            top: SAFE,
            background: 'rgba(57,255,20,.14)',
            border: '0.25vmin solid rgba(57,255,20,.5)'
          }}
        >
          <span className="material-symbols-outlined text-neon-green" style={{ fontSize: '3vmin' }}>tv</span>
          <p style={{ fontSize: '2.6vmin' }} className="font-black text-tv-ink">
            Bienvenido, <span style={{ color: '#39ff14' }}>{anfitrion.name}</span>
          </p>
        </div>
      )}

      <div className="flex h-full gap-[3vmin]">

        {/* Columna de entrada. Se esconde en la sala de espera porque allí el
            centro ya enseña el PIN y el QR en grande: repetirlo dos veces en
            la misma pantalla solo quita sitio. En cuanto empieza la partida
            reaparece, que es cuando hace falta para quien llega tarde. */}
        {phase !== 'lobby' && (
        <aside
          className="flex shrink-0 flex-col items-center rounded-[1.8vmin] px-[2vmin] py-[2.4vmin]"
          style={{ width: '25vmin', background: 'rgba(255,255,255,.04)', border: '0.22vmin solid rgba(255,255,255,.10)' }}
        >
          <p style={{ fontSize: '1.8vmin', letterSpacing: '0.24em' }} className="text-tv-dim">ENTRA CON</p>
          <p style={{ fontSize: '8vmin', lineHeight: 1.05, color: '#39ff14', letterSpacing: '0.06em' }}
            className="font-black tabular-nums">
            {pin || pinElegido}
          </p>
          {enlaceJugar && (
            <div className="mt-[1.5vmin] rounded-[1vmin] bg-white p-[0.8vmin]">
              <img src={urlQr(enlaceJugar, 260)} alt="Código QR para entrar"
                style={{ width: '16vmin', height: '16vmin', display: 'block' }} />
            </div>
          )}
          <p style={{ fontSize: '1.7vmin' }} className="mt-[1.2vmin] text-center text-tv-dim">
            play.dedicalo.es
          </p>
          <p style={{ fontSize: '1.6vmin' }} className="mt-[1.2vmin] text-center leading-snug text-tv-dim">
            Puedes unirte en cualquier momento
          </p>
          {audioEnTv && (
            <p style={{ fontSize: '1.7vmin' }} className="mt-auto flex items-center gap-[0.6vmin] pt-[1.5vmin] text-neon-green">
              <span className="material-symbols-outlined" style={{ fontSize: '2vmin' }}>volume_up</span>
              Suena aquí
            </p>
          )}
        </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-baseline justify-between">
            <img src="/images/logo-main.png" alt="Dedícalo Play" style={{ height: '5.5vmin', width: 'auto' }} />
            {phase !== 'lobby' && phase !== 'final' && (
              <p style={{ fontSize: '2.2vmin', letterSpacing: '0.2em' }} className="text-tv-dim">
                RONDA {round}
              </p>
            )}
          </header>

          <main className="flex flex-1 flex-col items-center justify-center">
            {phase === 'lobby' && !hayReveal && (
              /* Sala de espera: el QR manda, porque es el momento en que todo
                 el mundo tiene que entrar. Grande y en el centro. */
              <div className="flex items-center gap-[5vmin]">
                <div className="rounded-[1.6vmin] bg-white p-[1.4vmin]">
                  <img src={urlQr(enlaceJugar, 420)} alt="Código QR para entrar"
                    style={{ width: '30vmin', height: '30vmin', display: 'block' }} />
                </div>
                <div className="text-left">
                  <p style={{ fontSize: '2.4vmin', letterSpacing: '0.26em' }} className="text-tv-dim">
                    ESCANEA PARA JUGAR
                  </p>
                  <p style={{ fontSize: '11vmin', lineHeight: 1.05, color: '#39ff14', letterSpacing: '0.06em' }}
                    className="font-black tabular-nums">
                    {pin || pinElegido}
                  </p>
                  <p style={{ fontSize: '2.4vmin' }} className="text-tv-dim">
                    o entra en play.dedicalo.es
                  </p>
                  <p style={{ fontSize: '3vmin' }} className="mt-[2vmin] font-black text-tv-ink">
                    {conectados.length === 0
                      ? 'Esperando jugadores...'
                      : `${conectados.length} ${conectados.length === 1 ? 'jugador dentro' : 'jugadores dentro'}`}
                  </p>
                </div>
              </div>
            )}

            {phase === 'listen' && (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center rounded-full"
                  style={{
                    width: '24vmin', height: '24vmin', border: '0.7vmin solid #39ff14',
                    background: 'radial-gradient(circle,#141a26 0 32%,#0b0f17 32% 100%)'
                  }}>
                  <p style={{ fontSize: '3.8vmin', color: '#39ff14' }} className="font-black tracking-widest">
                    ESCUCHA
                  </p>
                </div>
              </div>
            )}

            {phase === 'blackout' && !hayReveal && (
              <div className="text-center">
                <p style={{ fontSize: '4.6vmin' }} className="font-black text-tv-ink">
                  {currentQuestion?.text || '¿De qué año es?'}
                </p>
                <p style={{ fontSize: '7vmin', color: '#39ff14' }} className="mt-[1vmin] font-black tabular-nums">
                  {respondieron}<span className="text-tv-dim">/{conectados.length}</span>
                </p>
                <p style={{ fontSize: '2.2vmin', letterSpacing: '0.24em' }} className="text-tv-dim">
                  HAN RESPONDIDO
                </p>
              </div>
            )}

            {hayReveal && currentTrack && (
              <div className="w-full text-center">
                <p style={{ fontSize: '2.2vmin', letterSpacing: '0.3em' }} className="text-tv-dim">
                  LA CANCIÓN ERA
                </p>
                <p style={{ fontSize: '4vmin' }} className="mt-[0.6vmin] w-full truncate font-black text-tv-ink">
                  {currentTrack.name || currentTrack.title}
                </p>
                <p style={{ fontSize: '2.6vmin' }} className="w-full truncate text-tv-dim">
                  {currentTrack.artist || currentTrack.artists}
                </p>
                <p style={{ fontSize: '14vmin', lineHeight: 1, color: '#ffbf4d' }}
                  className="mt-[1vmin] font-black tabular-nums tv-pop">
                  {currentQuestion?.songYear ?? currentTrack.releaseYear}
                </p>
                {ganadorRapido && (
                  <p style={{ fontSize: '2.2vmin' }} className="mt-[0.5vmin] font-bold text-chaos-gold">
                    ⚡ {ganadorRapido} respondió primero
                  </p>
                )}
              </div>
            )}

            {phase === 'final' && (
              <div className="w-full text-center">
                <p style={{ fontSize: '5vmin', color: '#ffbf4d' }} className="font-black">FIN DE LA PARTIDA</p>
                <p style={{ fontSize: '3vmin' }} className="mt-[1vmin] font-black text-tv-ink">
                  Gana {clasificacion[0]?.name || '—'}
                </p>
              </div>
            )}
          </main>

          {/* Quién ha saboteado a quién. Solo mientras dura el efecto. */}
          {sabotajes.length > 0 && !hayReveal && (
            <div className="mb-[1.2vmin] flex flex-wrap justify-center gap-[1.5vmin]">
              {sabotajes.map((s, i) => (
                <p
                  key={i}
                  style={{ fontSize: '1.9vmin', background: 'rgba(255,122,26,.12)', border: '0.2vmin solid rgba(255,122,26,.35)' }}
                  className="flex items-center gap-[0.6vmin] rounded-full px-[1.5vmin] py-[0.5vmin] font-bold text-vinyl-orange"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '2.2vmin' }}>bolt</span>
                  {s.de} saboteó a {s.a}
                </p>
              ))}
            </div>
          )}

          {/* MARCADOR: todo de cada jugador en un sitio — canciones, puntos,
              si respondió, si le sabotearon y, al revelar, si acertó. */}
          {conectados.length > 0 && (
            <footer className="flex flex-wrap justify-center gap-[1.2vmin]">
              {clasificacion.map((jugador) => (
                <Ficha
                  key={jugador.id}
                  jugador={jugador}
                  tam={tamFicha}
                  meta={targetYears}
                  resultado={revealResults[jugador.id]}
                  estado={
                    jugador.activeAttack?.type === 'block_vote' && jugador.activeAttack?.round === round
                      ? 'bloqueado'
                      : roundAnswers[jugador.id] ? 'respondio' : 'espera'
                  }
                />
              ))}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

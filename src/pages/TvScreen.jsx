import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTimelineProgress, useGameStore } from '../store/useGameStore';
import VinilloJugador from '../components/tv/VinilloJugador';
import { desbloquearAudio, pararMusica, segundosRestantes, sonarCancionAleatoria } from '../services/musica';
import { vigilarFluidez } from '../services/rendimiento';

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

const COLOR_PODIO = ['#ffbf4d', '#dbe4f0', '#ff9a4d'];

/**
 * Cuenta atrás del fragmento, aislada a propósito.
 *
 * Estaba dentro de TvScreen con un `setInterval` de medio segundo, así que
 * dos veces por segundo se repintaba la pantalla entera —los veinte discos
 * incluidos— para cambiar un número de dos cifras. En un ordenador no se
 * nota; en una caja de Android TV es medio segundo de trabajo por cada
 * segundo de reloj, y es de donde salía buena parte del atasco.
 *
 * Aquí dentro, ese repintado afecta a este párrafo y a nada más.
 */
function CuentaAtras() {
  const [segundos, setSegundos] = useState(null);
  // Se monta y se desmonta con la fase, así que no hace falta apagarlo por
  // dentro: cuando deja de hacer falta, deja de existir.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const quedan = segundosRestantes();
      setSegundos(quedan > 0 ? Math.ceil(quedan) : null);
    }, 500);
    return () => window.clearInterval(tick);
  }, []);

  if (segundos === null) return null;
  return (
    <p style={{ fontSize: '2.4vmin' }} className="mt-[1vmin] tabular-nums text-tv-dim">
      {segundos}s
    </p>
  );
}

export default function TvScreen() {
  const [params] = useSearchParams();
  const [pinElegido, setPinElegido] = useState(() => (params.get('pin') || '').replace(/\D/g, '').slice(0, 4));
  const [codigoTv] = useState(nuevoCodigo);
  const [verTeclado, setVerTeclado] = useState(false);

  const pin = useGameStore((s) => s.pin);
  const rol = useGameStore((s) => s.role);
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
  const publicarCancion = useGameStore((s) => s.publicarCancionDeRonda);
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
    sonarCancionAleatoria(listaUrl).then((cancion) => {
      // La tele publica lo que ha puesto para que el anfitrión revele ESA y
      // no otra. Sin esto la canción no coincidía con la pantalla.
      publicarCancion(cancion);
    }).catch((error) => {
      console.error('La tele no pudo poner la música:', error);
      soltarAudio();
    });
  }, [audioEnTv, phase, round, listaUrl, soltarAudio, publicarCancion]);

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

  // ── CUANDO EL ANFITRIÓN SE VA ─────────────────────────────────────────
  //
  // Antes había un solo camino: que la sala se BORRARA de la base. Pero el
  // anfitrión casi nunca la borra — cierra la app, bloquea el móvil o se va
  // de la fiesta. La sala seguía existiendo, la tele seguía enseñándola, y
  // allí se quedaba: un PIN al que ya no responde nadie, para siempre. Es lo
  // que se veía en el salón.
  //
  // Ahora la tele mira lo mismo que miraría cualquiera: ¿sigue ahí el
  // anfitrión? Si no, se despide en condiciones y vuelve al inicio sola.
  //
  // Con diez segundos de margen, y no de golpe, por dos motivos: da tiempo a
  // leer quién ha ganado, y a un anfitrión que solo ha perdido la cobertura o
  // ha bloqueado el móvil le da tiempo a volver sin que la tele lo dé por
  // muerto. Si vuelve, la despedida se cancela sola.
  const salaBorrada = pinElegido.length === 4 && rol === null && pin === null;
  const anfitrionSeFue = pinElegido.length === 4 && Boolean(pin)
    && (!anfitrion || anfitrion.status === 'kicked');
  const hayQueCerrar = salaBorrada || anfitrionSeFue;

  const SEGUNDOS_DESPEDIDA = 10;
  const [restanDespedida, setRestanDespedida] = useState(null);

  const volverAlInicio = useCallback(() => {
    yaSaludoRef.current = false;
    setBienvenida(false);
    setRestanDespedida(null);
    setPinElegido('');
    dejarDeObservar();
    // Se retira la entrada que dejamos al entrar en la sala, para que el
    // historial no crezca una entrada por cada partida de la noche. No se
    // repite en bucle: al volver, `state.sala` ya no está.
    if (window.history.state?.sala) window.history.back();
  }, [dejarDeObservar]);

  useEffect(() => {
    if (!hayQueCerrar) {
      // El anfitrión ha vuelto: se cancela la despedida y sigue la partida.
      const limpiar = window.setTimeout(() => setRestanDespedida(null), 0);
      return () => window.clearTimeout(limpiar);
    }
    let quedan = SEGUNDOS_DESPEDIDA;
    const arranque = window.setTimeout(() => setRestanDespedida(quedan), 0);
    const tick = window.setInterval(() => {
      quedan -= 1;
      if (quedan <= 0) {
        window.clearInterval(tick);
        volverAlInicio();
        return;
      }
      setRestanDespedida(quedan);
    }, 1000);
    return () => { window.clearTimeout(arranque); window.clearInterval(tick); };
  }, [hayQueCerrar, volverAlInicio]);

  // ── SALIR CON EL MANDO, EN CUALQUIER MOMENTO ──────────────────────────
  //
  // Va por el historial del navegador a propósito. La app de televisión ya
  // hace `webView.goBack()` cuando hay a dónde volver, así que dejando una
  // entrada en el historial al entrar en la sala, el botón ATRÁS del mando
  // sale de la sala en vez de cerrar la aplicación entera — y funciona con
  // el APK que ya está instalado, sin reinstalar nada.
  //
  // El `keydown` cubre lo demás: un televisor con navegador, un teclado, un
  // mando que manda Escape.
  useEffect(() => {
    if (pinElegido.length !== 4) return undefined;
    window.history.pushState({ sala: pinElegido }, '');
    const alSalir = () => volverAlInicio();
    const alTeclado = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') volverAlInicio();
    };
    window.addEventListener('popstate', alSalir);
    window.addEventListener('keydown', alTeclado);
    return () => {
      window.removeEventListener('popstate', alSalir);
      window.removeEventListener('keydown', alTeclado);
    };
  }, [pinElegido, volverAlInicio]);

  useEffect(() => {
    if (yaSaludoRef.current || pinElegido.length !== 4 || !hayAnfitrion) return undefined;
    yaSaludoRef.current = true;
    const mostrar = window.setTimeout(() => setBienvenida(true), 0);
    const quitar = window.setTimeout(() => setBienvenida(false), 5000);
    return () => { window.clearTimeout(mostrar); window.clearTimeout(quitar); };
  }, [pinElegido, hayAnfitrion]);
  // La tele se mide a sí misma y baja la calidad si no da abasto. Es la
  // única forma honesta de acertar: el aparato del salón no se parece en nada
  // al ordenador donde se programa esto.
  const [ligero, setLigero] = useState(false);
  useEffect(() => vigilarFluidez((debeAligerar, datos) => {
    setLigero(debeAligerar);
    console.info(debeAligerar
      ? `Tele justa de potencia (${datos.medianaMs.toFixed(1)}ms por fotograma): se apagan las animaciones.`
      : 'La tele va sobrada: animaciones completas.');
  }), []);

  const respondieron = Object.keys(roundAnswers).length;
  const hayReveal = Object.keys(revealResults).length > 0;

  // Ordenados por canciones: la tele es un marcador, y quien va ganando debe
  // estar el primero sin que nadie tenga que buscarlo.
  const clasificacion = useMemo(
    () => [...conectados].sort((a, b) => getTimelineProgress(b) - getTimelineProgress(a)),
    [conectados]
  );

  // Orden visual del podio: segundo a la izquierda, campeón en medio, tercero
  // a la derecha. Suben de menor a mayor para que el último en aparecer sea
  // quien gana.
  const podio = useMemo(() => {
    const tres = clasificacion.slice(0, 3);
    if (!tres.length) return [];
    const orden = [1, 0, 2];
    const altos = ['9vmin', '6.5vmin', '4.5vmin'];
    const retrasos = [700, 300, 0];
    return orden
      .filter((i) => tres[i])
      .map((i) => ({ jugador: tres[i], puesto: i, alto: altos[i], retraso: retrasos[i] }));
  }, [clasificacion]);


  // Sabotajes de esta ronda: quién se lo hizo a quién.
  const sabotajes = useMemo(() => conectados
    .filter((p) => p.activeAttack?.round === round && p.activeAttack?.from)
    .map((p) => ({ de: p.activeAttack.from, a: p.name, tipo: p.activeAttack.type })),
  [conectados, round]);

  const ganadorRapido = Object.values(revealResults).find((r) => r?.speedWinnerName)?.speedWinnerName;

  // Tamaño de los jugadores.
  //
  // Con pocos salen enormes y se van encogiendo según entra gente. Pero no
  // basta con mirar cuántos son: hay que contar las FILAS, porque al partirse
  // en dos la altura se duplica y la última fila se salía de la pantalla.
  // Así que el tamaño es el menor entre lo que permite el ancho y lo que
  // permite el alto.
  const n = conectados.length;
  const { tamVinilo, columnas } = useMemo(() => {
    if (!n) return { tamVinilo: '12vmin', columnas: 1 };

    // Ancho útil: la pantalla menos la columna del PIN (25vmin, y en la sala
    // de espera ni siquiera está) y los márgenes.
    const anchoUtil = 100 * (window.innerWidth / Math.min(window.innerWidth, window.innerHeight)) - 40;
    // Alto reservado a los jugadores: un tercio largo de la pantalla.
    const altoUtil = 40;

    let mejor = { tamVinilo: '8vmin', columnas: n };
    // Se prueban repartos y se queda el que da el disco más grande.
    for (let cols = Math.min(n, 12); cols >= 1; cols -= 1) {
      const filas = Math.ceil(n / cols);
      const porAncho = (anchoUtil - cols * 2) / cols;
      // Cada jugador ocupa su disco más el nombre y el marcador debajo.
      const porAlto = (altoUtil - filas * 2) / filas / 1.45;
      // Tope de 34 y no de 30: con tres o cuatro jugadores sobra pantalla, y
      // lo que se pide desde el sofá es ver la cara, no el hueco.
      const lado = Math.min(porAncho, porAlto, 34);
      if (lado > parseFloat(mejor.tamVinilo)) {
        mejor = { tamVinilo: `${lado.toFixed(1)}vmin`, columnas: cols };
      }
    }
    return mejor;
  }, [n]);

  const enlaceJugar = typeof window !== 'undefined'
    ? `${window.location.origin}/guest/join?pin=${pin || pinElegido}` : '';

  // ── Pantalla de enlace ────────────────────────────────────────────────────
  if (pinElegido.length !== 4) {
    const enlaceTv = typeof window !== 'undefined'
      ? `${window.location.origin}/tv-link?tv=${codigoTv}` : '';
    return (
      <div className={ligero ? 'tv-root tv-ligero' : 'tv-root'} style={{ padding: SAFE }}>
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
              <p style={{ fontSize: '2vmin', letterSpacing: '0.3em' }} className="mt-[2vmin] text-tv-dim">
                PASO 1 DE 2 · CONECTAR LA TELE
              </p>
              <p style={{ fontSize: '3.2vmin' }} className="mt-[0.8vmin] font-bold text-tv-ink">
                En tu móvil: <span style={{ color: '#39ff14' }}>Conectar tele</span>
              </p>
              <p style={{ fontSize: '2.1vmin' }} className="mt-[0.5vmin] text-tv-dim">
                Crea la sala, pulsa «Conectar tele» y apunta aquí
              </p>

              <div className="mt-[3vmin] rounded-[2vmin] bg-white p-[1.6vmin]">
                <img src={urlQr(enlaceTv, 600)} alt="Código para conectar la tele"
                  style={{ width: '46vmin', height: '46vmin', display: 'block' }} />
              </div>

              <p style={{ fontSize: '2vmin', letterSpacing: '0.3em' }} className="mt-[2.5vmin] text-tv-dim">
                O ESCRIBE EN play.dedicalo.es/tv-link
              </p>
              <p style={{ fontSize: '5vmin', letterSpacing: '0.22em', color: '#39ff14' }}
                className="tv-latido font-black">
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
    <div className={ligero ? 'tv-root tv-ligero' : 'tv-root'} style={{ padding: SAFE }}>
      {/* Franja de bienvenida: encima de todo, sin quitarle el sitio a nada.
          Si alguna vez se quedara pegada, el QR se seguiría viendo debajo. */}
      {/* ── DESPEDIDA ────────────────────────────────────────────────────
          Se pone DELANTE de todo, a pantalla completa. Una sala sin
          anfitrión no es una sala: enseñar el PIN debajo, como si aún se
          pudiera entrar, sería mentir a quien esté mirando. */}
      {restanDespedida !== null && (
        <div
          className="tv-pop absolute inset-0 z-30 flex flex-col items-center justify-center"
          style={{ background: '#070a10' }}
        >
          <img src="/images/logo-main.png" alt="Dedícalo Play"
            style={{ height: '7vmin', width: 'auto' }} />

          <p style={{ fontSize: '5vmin', letterSpacing: '0.12em' }}
            className="mt-[3vmin] font-black" >
            <span style={{ color: '#ffbf4d' }}>SE ACABÓ LA PARTIDA</span>
          </p>

          {clasificacion[0] && (
            <p style={{ fontSize: '3.2vmin' }} className="mt-[1vmin] font-black text-tv-ink">
              Ganó {clasificacion[0].name} con{' '}
              <span style={{ color: '#39ff14' }}>{getTimelineProgress(clasificacion[0])}</span> canciones
            </p>
          )}

          <p style={{ fontSize: '2.2vmin' }} className="mt-[3vmin] text-tv-dim">
            El anfitrión ha salido
          </p>

          {/* La cuenta atrás se ve, no se adivina: quien mira sabe que la
              pantalla va a hacer algo y cuándo. */}
          <div className="mt-[2vmin] flex items-center gap-[2vmin]">
            <div
              className="flex items-center justify-center rounded-full font-black tabular-nums"
              style={{
                width: '10vmin', height: '10vmin', fontSize: '4.6vmin',
                color: '#39ff14', border: '0.45vmin solid rgba(57,255,20,.5)'
              }}
            >
              {restanDespedida}
            </div>
            <p style={{ fontSize: '2.4vmin' }} className="text-left text-tv-dim">
              Volviendo a la pantalla<br />de inicio...
            </p>
          </div>

          <button
            type="button"
            onClick={volverAlInicio}
            autoFocus
            className="tv-boton mt-[3.5vmin] rounded-full font-black"
            style={{
              fontSize: '2.4vmin', letterSpacing: '0.18em',
              padding: '1.4vmin 4.5vmin',
              color: '#0b0f17', background: '#39ff14'
            }}
          >
            VOLVER AHORA
          </button>

          <p style={{ fontSize: '1.8vmin' }} className="mt-[2vmin] text-tv-dim">
            o pulsa ATRÁS en el mando
          </p>
        </div>
      )}

      {bienvenida && anfitrion && phase === 'lobby' && (
        <div
          className="tv-pop absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-[2vmin] rounded-full px-[4vmin] py-[1.6vmin]"
          style={{
            top: SAFE,
            background: 'linear-gradient(90deg,rgba(57,255,20,.20),rgba(168,85,247,.18))',
            border: '0.3vmin solid rgba(57,255,20,.6)'
          }}
        >
          <span className="material-symbols-outlined text-neon-green tv-latido" style={{ fontSize: '3.4vmin' }}>
            check_circle
          </span>
          <div className="text-left">
            <p style={{ fontSize: '1.7vmin', letterSpacing: '0.24em' }} className="text-neon-green">
              TELE CONECTADA
            </p>
            <p style={{ fontSize: '3vmin' }} className="font-black text-tv-ink">
              Bienvenido, <span style={{ color: '#39ff14' }}>{anfitrion.name}</span>
            </p>
          </div>
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

          <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
            {phase === 'lobby' && !hayReveal && (
              /* Sala de espera: el QR manda, porque es el momento en que todo
                 el mundo tiene que entrar. Grande y en el centro. */
              <div className="flex items-center gap-[5vmin]">
                <div className="rounded-[1.6vmin] bg-white p-[1.4vmin]">
                  <img src={urlQr(enlaceJugar, 560)} alt="Código QR para entrar"
                    style={{ width: '38vmin', height: '38vmin', display: 'block' }} />
                </div>
                <div className="text-left">
                  <p style={{ fontSize: '1.9vmin', letterSpacing: '0.24em' }} className="text-neon-green">
                    ✓ TELE CONECTADA
                  </p>
                  <p style={{ fontSize: '2.4vmin', letterSpacing: '0.26em' }} className="mt-[0.8vmin] text-tv-dim">
                    AHORA ESCANEAD PARA JUGAR
                  </p>
                  <p style={{ fontSize: '11vmin', lineHeight: 1.05, color: '#39ff14', letterSpacing: '0.06em' }}
                    className="tv-latido font-black tabular-nums">
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
                {/* Disco de vinilo girando con ondas saliendo: la seña de
                    identidad del juego, y lo que hace que la pantalla se
                    sienta viva mientras suena la canción. */}
                <div className="relative flex shrink-0 items-center justify-center" style={{ width: '30vmin', height: '30vmin' }}>
                  {/* Dos ondas, no tres. La tercera no se distinguía y era una
                      capa más animándose sin parar en un aparato que va justo. */}
                  {[0, 1].map((i) => (
                    <span
                      key={i}
                      className="tv-onda absolute rounded-full"
                      style={{
                        width: '21vmin', height: '21vmin',
                        border: '0.35vmin solid #39ff14',
                        animationDelay: `${i * 1.1}s`
                      }}
                    />
                  ))}

                  {/* Imagen girada, no un degradado: girar un mapa de bits es
                      casi gratis, y redibujar surcos generados en cada
                      fotograma es lo que se quedaba pegado. */}
                  <div className="relative" style={{ width: '21vmin', height: '21vmin' }}>
                    {/* El aro va aparte y quieto. Cuando era una `box-shadow`
                        de la propia imagen, la tele recalculaba la sombra en
                        cada vuelta para dibujar el mismo círculo — un anillo
                        girado no cambia. */}
                    <div className="absolute rounded-full"
                      style={{ inset: '-3%', border: '0.6vmin solid #39ff14' }} />
                    <img
                      src="/images/vinilo.png"
                      alt=""
                      className="tv-vinilo"
                      style={{ width: '100%', height: '100%', display: 'block', borderRadius: '50%' }}
                    />
                    <div
                      className="absolute flex items-center justify-center overflow-hidden rounded-full"
                      style={{ inset: '31%', background: '#0b0f17', border: '0.3vmin solid #39ff14' }}
                    >
                      <img src="/images/icon-app.png" alt="" style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>

                {/* Ecualizador: doce barras con su propio ritmo. */}
                <div className="mt-[1.5vmin] flex shrink-0 items-end gap-[0.7vmin]" style={{ height: '5vmin' }}>
                  {[0.5, 0.85, 0.35, 1, 0.55, 0.9, 0.45].map((alto, i) => (
                    <span
                      key={i}
                      className="tv-barra rounded-full"
                      style={{
                        width: '1vmin',
                        height: `${alto * 100}%`,
                        background: i % 3 === 0 ? '#39ff14' : i % 3 === 1 ? '#a855f7' : '#ff7a1a',
                        animationDelay: `${(i % 5) * 0.13}s`,
                        animationDuration: `${0.5 + (i % 4) * 0.11}s`
                      }}
                    />
                  ))}
                </div>

                <p style={{ fontSize: '3.4vmin', color: '#39ff14' }} className="mt-[1.5vmin] font-black tracking-[0.3em]">
                  ESCUCHA
                </p>
                {audioEnTv && <CuentaAtras />}
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
              <div className="flex items-center gap-[4vmin]">
                {/* La carátula sobre el disco: convierte el reveal en un
                    momento, en vez de un año suelto sobre negro. */}
                <div className="relative shrink-0" style={{ width: '24vmin', height: '24vmin' }}>
                  <img src="/images/vinilo.png" alt="" className="tv-vinilo"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
                  <div
                    className="tv-pop absolute overflow-hidden"
                    style={{ inset: '13%', borderRadius: '1.2vmin', boxShadow: '0 1vmin 3vmin rgba(0,0,0,.6)' }}
                  >
                    {/* El respaldo va DEBAJO, siempre pintado: así una carátula
                        que no cargue (una de cada cinco no la tiene) deja un
                        disco decente en vez del icono de imagen rota. */}
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#1b2230,#0e131c)' }}>
                      <span className="material-symbols-outlined text-neon-green" style={{ fontSize: '6vmin' }}>
                        music_note
                      </span>
                    </div>
                    {(currentTrack.coverUrl || currentTrack.albumImage) && (
                      <img
                        src={currentTrack.coverUrl || currentTrack.albumImage}
                        alt=""
                        className="relative h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    )}
                  </div>
                </div>

                <div className="min-w-0 text-left">
                  <p style={{ fontSize: '2vmin', letterSpacing: '0.3em' }} className="text-tv-dim">
                    LA CANCIÓN ERA
                  </p>
                  <p style={{ fontSize: '3.8vmin' }} className="mt-[0.4vmin] truncate font-black text-tv-ink">
                    {currentTrack.name || currentTrack.title}
                  </p>
                  <p style={{ fontSize: '2.4vmin' }} className="truncate text-tv-dim">
                    {currentTrack.artist || currentTrack.artists}
                  </p>
                  <p style={{ fontSize: '13vmin', lineHeight: 1, color: '#ffbf4d' }}
                    className="mt-[0.5vmin] font-black tabular-nums tv-pop">
                    {currentQuestion?.songYear ?? currentTrack.releaseYear}
                  </p>
                  {ganadorRapido && (
                    <p style={{ fontSize: '2.1vmin' }} className="font-bold text-chaos-gold">
                      ⚡ {ganadorRapido} respondió primero
                    </p>
                  )}
                </div>
              </div>
            )}

            {phase === 'final' && (
              <div className="flex w-full flex-col items-center">
                <p style={{ fontSize: '4.4vmin', color: '#ffbf4d', letterSpacing: '0.1em' }} className="font-black">
                  FIN DE LA PARTIDA
                </p>

                {/* Podio de verdad: los tres suben a su cajón, primero el
                    tercero y el campeón el último, que es el momento que la
                    sala está esperando. */}
                <div className="mt-[2vmin] flex items-end justify-center gap-[3vmin]">
                  {podio.map((p) => (
                    <div
                      key={p.jugador.id}
                      className="tv-sube flex flex-col items-center"
                      style={{ animationDelay: `${p.retraso}ms` }}
                    >
                      <div className={p.puesto === 0 ? 'tv-campeon' : undefined}>
                        <VinilloJugador
                          jugador={p.jugador}
                          tam={p.puesto === 0 ? '20vmin' : '15vmin'}
                          puesto={p.puesto}
                          meta={targetYears}
                          girando={p.puesto === 0}
                        />
                      </div>
                      <div
                        className="mt-[1vmin] flex w-full items-start justify-center rounded-t-[1vmin]"
                        style={{
                          height: p.alto,
                          minWidth: p.puesto === 0 ? '20vmin' : '15vmin',
                          background: `linear-gradient(180deg, ${COLOR_PODIO[p.puesto]}, ${COLOR_PODIO[p.puesto]}22)`
                        }}
                      >
                        <span
                          className="font-black tabular-nums"
                          style={{ fontSize: '3.4vmin', color: '#0b0f17', marginTop: '0.6vmin' }}
                        >
                          {p.puesto + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {clasificacion.length > 3 && (
                  <div className="mt-[2vmin] flex flex-wrap justify-center gap-x-[3vmin] gap-y-[0.8vmin]">
                    {clasificacion.slice(3).map((j, i) => (
                      <p key={j.id} style={{ fontSize: '2vmin' }} className="text-tv-dim">
                        <span className="font-black">{i + 4}.</span> {j.name}{' '}
                        <span style={{ color: '#39ff14' }}>{getTimelineProgress(j)}</span>/{targetYears}
                      </p>
                    ))}
                  </div>
                )}
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

          {/* LOS JUGADORES: cada uno un vinilo con su puesto en la carrera,
              ordenados por canciones. Es lo que la sala mira entre rondas. */}
          {conectados.length > 0 && phase !== 'final' && (
            <footer
              className="grid shrink-0 justify-center gap-x-[2vmin] gap-y-[1.5vmin] pt-[1.5vmin]"
              style={{
                gridTemplateColumns: `repeat(${columnas}, auto)`,
                justifyItems: 'center',
                maxHeight: '42vmin'
              }}
            >
              {clasificacion.map((jugador, i) => {
                return (
                <VinilloJugador
                  key={jugador.id}
                  jugador={jugador}
                  tam={tamVinilo}
                  puesto={i}
                  meta={targetYears}
                  resultado={revealResults[jugador.id]}
                  // Solo gira el disco de quien acaba de acertar: veinte
                  // discos girando a la vez tumban cualquier televisor.
                  girando={Boolean(revealResults[jugador.id]?.isCorrect)}
                  estado={
                    jugador.activeAttack?.type === 'block_vote' && jugador.activeAttack?.round === round
                      ? 'bloqueado'
                      : roundAnswers[jugador.id] ? 'respondio' : 'espera'
                  }
                  />
                );
              })}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

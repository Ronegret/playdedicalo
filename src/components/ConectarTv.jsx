import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store/useGameStore';
import { escanearQr } from '../services/escanerQr';
import { sfx } from '../services/audio';
import { vibrar } from '../services/haptics';

/**
 * CONECTAR LA TELE
 *
 * POR QUÉ EL CÓDIGO VA PRIMERO Y LA CÁMARA DESPUÉS
 *
 * Ninguna aplicación de televisión seria empareja con la cámara: YouTube,
 * Netflix, Disney+ y Spotify enseñan un código en la tele y te lo hacen
 * escribir en el móvil. No es pereza de diseño, es física. Una televisión
 * encendida en un salón a media luz es un foco de luz rodeado de negro, y es
 * el peor caso posible para el ajuste automático de una cámara: el enfoque y
 * la exposición se pasan el rato buscando. Eso era el parpadeo.
 *
 * Escribir seis caracteres cuesta unos cinco segundos y funciona siempre: a
 * cualquier distancia, con cualquier luz y en cualquier móvil. Así que ese es
 * el camino principal. La cámara se queda como atajo para quien la prefiera.
 *
 * Y por qué esta pantalla vive dentro del juego en vez de escanear desde
 * fuera: al abrir un QR con la cámara del sistema, el enlace se abre en OTRO
 * navegador, donde la sesión del anfitrión no existe. La tele acababa
 * diciendo "primero crea la sala" a alguien que la acababa de crear.
 */
export default function ConectarTv({ onCerrar, alConectar, antesDeCrearSala = false, nombreAnfitrion }) {
  const enlazar = useGameStore((s) => s.linkTvToRoom);
  const reservar = useGameStore((s) => s.reservarTv);

  const [modo, setModo] = useState('codigo');
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const casillasRef = useRef([]);

  // `onCerrar` llega como función nueva en cada repintado del lobby (está
  // escrita en línea allí) y el lobby se repinta con cada mensaje de
  // presencia. Si el efecto de la cámara dependiera de ella, se desmontaría y
  // volvería a montar sin parar: abrir la cámara, cerrarla, reajustar.
  const refs = useRef({ onCerrar, enlazar, reservar, alConectar });
  useEffect(() => {
    refs.current = { onCerrar, enlazar, reservar, alConectar };
  }, [onCerrar, enlazar, reservar, alConectar]);

  const intentar = useCallback(async (valor) => {
    const limpio = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (limpio.length !== 6) return false;
    setEstado('Conectando...');
    setError('');

    const { enlazar: enl, reservar: res, onCerrar: cerrar, alConectar: avisar } = refs.current;
    // Antes de crear la sala solo se reserva: la tele queda enlazada y
    // esperando, y recibe el PIN sola en cuanto la sala exista.
    const r = antesDeCrearSala ? await res(limpio, nombreAnfitrion) : await enl(limpio);

    if (r.ok) {
      setEstado('¡Tele conectada!');
      vibrar('confirmar'); sfx.confirmar();
      avisar?.(limpio);
      setTimeout(() => cerrar(), 1100);
      return true;
    }
    setEstado('');
    setError(r.message);
    return false;
  }, [antesDeCrearSala, nombreAnfitrion]);

  // El botón "atrás" del móvil cierra esta pantalla, no el juego.
  useEffect(() => {
    window.history.pushState({ escaner: true }, '');
    const alAtras = () => refs.current.onCerrar();
    window.addEventListener('popstate', alAtras);
    return () => {
      window.removeEventListener('popstate', alAtras);
      if (window.history.state?.escaner) window.history.back();
    };
  }, []);

  // Cámara: solo si se pide. Se busca el código dentro de la URL del QR.
  useEffect(() => {
    if (modo !== 'camara') return undefined;
    return escanearQr(
      videoRef.current,
      (texto) => {
        const m = String(texto).match(/[?&]tv=([A-Z0-9]{6})/i);
        if (!m) return false;
        intentar(m[1]);
        return true;
      },
      () => setModo('codigo')
    );
  }, [modo, intentar]);

  const escribir = (indice, valor) => {
    const caracter = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const letras = codigo.padEnd(6, ' ').split('').slice(0, 6);
    letras[indice] = caracter || ' ';
    const nuevo = letras.join('').replace(/\s/g, '');
    setCodigo(nuevo);
    setError('');
    if (caracter && indice < 5) casillasRef.current[indice + 1]?.focus();
    if (nuevo.length === 6) intentar(nuevo);
  };

  const pegar = (evento) => {
    const texto = (evento.clipboardData?.getData('text') || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!texto) return;
    evento.preventDefault();
    setCodigo(texto);
    if (texto.length === 6) intentar(texto);
    else casillasRef.current[texto.length]?.focus();
  };

  return createPortal(
    <div className="fixed inset-0 z-[330] flex flex-col overflow-y-auto bg-[#080b12]">
      <div className="flex items-center justify-between px-4 pt-safe-header pb-3">
        <p className="font-label-caps text-sm font-black tracking-wide text-white">CONECTAR LA TELE</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex min-h-touch w-12 items-center justify-center rounded-xl border border-white/20 text-white"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-5 pb-10">
        {modo === 'codigo' ? (
          <>
            <div className="mt-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon-green/40 bg-neon-green/10">
              <span className="material-symbols-outlined text-3xl text-neon-green">tv</span>
            </div>
            <h2 className="mt-4 text-center text-2xl font-black leading-tight text-white">
              Escribe el código<br />que sale en la tele
            </h2>
            <p className="mt-2 text-center text-sm text-on-surface-variant">
              Son seis caracteres, justo debajo del cuadro del QR
            </p>

            <div className="mt-6 flex w-full max-w-sm justify-center gap-1.5" onPaste={pegar}>
              {Array.from({ length: 6 }, (_, i) => (
                <input
                  key={i}
                  ref={(el) => { casillasRef.current[i] = el; }}
                  value={codigo[i] || ''}
                  onChange={(e) => escribir(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !codigo[i] && i > 0) casillasRef.current[i - 1]?.focus();
                  }}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={1}
                  aria-label={`Carácter ${i + 1} de 6`}
                  className="h-16 w-full min-w-0 rounded-xl border-2 border-white/15 bg-white/5 text-center text-2xl font-black uppercase text-white caret-neon-green outline-none focus:border-neon-green focus:bg-neon-green/10"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setModo('camara'); setError(''); }}
              className="mt-6 flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 font-label-caps text-sm font-bold text-white"
            >
              <span className="material-symbols-outlined">qr_code_scanner</span>
              PREFIERO ESCANEAR EL QR
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-center text-xl font-black text-white">
              Apunta al código de la tele
            </h2>
            <p className="mt-2 max-w-xs text-center text-sm text-on-surface-variant">
              Con la tele muy brillante y la sala a oscuras la cámara lo pasa mal.
              Si se resiste, escribir el código va más rápido.
            </p>
            <div
              className="relative mt-4 w-full max-w-sm overflow-hidden rounded-3xl border-2 border-neon-green/50"
              style={{ aspectRatio: '1' }}
            >
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-4 border-neon-green/70" />
            </div>
            <button
              type="button"
              onClick={() => { setModo('codigo'); setError(''); }}
              className="mt-5 flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 font-label-caps text-sm font-bold text-white"
            >
              <span className="material-symbols-outlined">keyboard</span>
              ESCRIBIR EL CÓDIGO
            </button>
          </>
        )}

        {estado && <p className="mt-5 font-bold text-neon-green">{estado}</p>}
        {error && <p className="mt-3 max-w-sm text-center text-sm text-error">{error}</p>}
      </div>
    </div>,
    document.body
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store/useGameStore';
import { escanearQr } from '../services/escanerQr';

/**
 * CONECTAR LA TELE — desde dentro del juego
 *
 * Por qué aquí y no escaneando con la cámara del sistema: al escanear un QR
 * desde fuera, el enlace se abre en OTRO navegador. La sesión del anfitrión
 * vive en el almacenamiento local del navegador donde está jugando, así que
 * en ese otro no existe y la pantalla acababa diciendo "primero crea la
 * sala" a alguien que la acababa de crear. Era el motivo real de que la tele
 * no se enlazara nunca.
 *
 * Escaneando desde aquí no se sale de la app: la sala ya está en memoria y
 * el enlace es inmediato. El código escrito a mano queda como salida para
 * quien no tenga cámara o la tenga estropeada.
 */
export default function ConectarTv({ onCerrar }) {
  const enlazar = useGameStore((s) => s.linkTvToRoom);

  const [modo, setModo] = useState('camara');
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef(null);

  const intentar = useCallback(async (valor) => {
    const limpio = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (limpio.length !== 6) return false;
    setEstado('Conectando...');
    setError('');
    const r = await enlazar(limpio);
    if (r.ok) {
      setEstado('¡Tele conectada!');
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      setTimeout(() => onCerrar(), 1200);
      return true;
    }
    setEstado('');
    setError(r.message);
    return false;
  }, [enlazar, onCerrar]);

  // Cámara: se busca el código dentro de la URL del QR de la tele.
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
      () => setModo('manual')
    );
  }, [modo, intentar]);

  return createPortal(
    <div className="fixed inset-0 z-[330] flex flex-col bg-black/92">
      <div className="flex items-center justify-between px-4 pt-safe-header pb-3">
        <p className="font-label-caps text-sm font-black tracking-wide text-white">CONECTAR TELE</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex min-h-touch w-12 items-center justify-center rounded-xl border border-white/20 text-white"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pb-8">
        {modo === 'camara' ? (
          <>
            <p className="text-center text-on-surface-variant">
              Apunta al código que aparece en la televisión
            </p>
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-neon-green/50" style={{ aspectRatio: '1' }}>
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-4 border-neon-green/70" />
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-on-surface-variant">
              Escribe el código de 6 letras que sale en la televisión
            </p>
            <input
              value={codigo}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                setCodigo(v);
                if (v.length === 6) intentar(v);
              }}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ABC123"
              className="w-full max-w-xs rounded-2xl border-2 border-white/20 bg-white/5 px-4 py-4 text-center text-3xl font-black tracking-[0.3em] text-white outline-none focus:border-neon-green"
            />
          </>
        )}

        {estado && <p className="font-bold text-neon-green">{estado}</p>}
        {error && <p className="max-w-sm text-center text-sm text-error">{error}</p>}

        <button
          type="button"
          onClick={() => { setModo(modo === 'camara' ? 'manual' : 'camara'); setError(''); }}
          className="mt-2 flex min-h-touch items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 font-label-caps text-sm font-bold text-white"
        >
          {modo === 'camara' ? 'ESCRIBIR EL CÓDIGO' : 'USAR LA CÁMARA'}
        </button>
      </div>
    </div>,
    document.body
  );
}

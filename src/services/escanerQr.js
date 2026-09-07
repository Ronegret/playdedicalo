/**
 * ESCÁNER DE QR
 *
 * Había dos copias de este bucle (entrar a una sala y conectar la tele) y las
 * dos hacían lo mismo mal: analizaban la cámara a resolución completa en cada
 * fotograma. Son unos dos millones de píxeles sesenta veces por segundo — por
 * eso la vista previa iba a tirones incluso en un móvil potente.
 *
 * Dos arreglos, los dos importantes:
 *
 *  - Se reduce la imagen a 480 px de lado como mucho. Un QR se lee de sobra a
 *    ese tamaño y el trabajo baja más de diez veces.
 *  - Se analiza unas 10 veces por segundo, no 60. La cámara sigue yendo fluida
 *    porque el vídeo lo pinta el navegador aparte; lo que se espacia es el
 *    análisis.
 */

const LADO_MAXIMO = 480;
const MS_ENTRE_ANALISIS = 100;

/**
 * Arranca la cámara y busca códigos QR.
 *
 * @param {HTMLVideoElement} video  dónde se ve la cámara
 * @param {(texto: string) => boolean} alLeer  devuelve true para parar
 * @param {(motivo: string) => void} alFallar
 * @returns {() => void} función para detenerlo todo
 */
export function escanearQr(video, alLeer, alFallar) {
  let activo = true;
  let stream = null;
  let temporizador = null;
  let bucle = null;

  const parar = () => {
    activo = false;
    if (bucle) cancelAnimationFrame(bucle);
    if (temporizador) clearTimeout(temporizador);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  (async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alFallar?.('sin-camara');
      return;
    }

    let jsQR;
    try {
      // Se carga solo al abrir el escáner: quien no escanea no la descarga.
      ({ default: jsQR } = await import('jsqr'));
    } catch {
      alFallar?.('sin-libreria');
      return;
    }
    if (!activo) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          // Pedir una resolución modesta ya alivia al móvil antes incluso de
          // reducirla nosotros.
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch {
      alFallar?.('permiso-denegado');
      return;
    }
    if (!activo) { stream?.getTracks().forEach((t) => t.stop()); return; }

    if (video) {
      video.srcObject = stream;
      try { await video.play(); } catch { /* algunos navegadores lo reanudan solos */ }
    }

    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });

    const analizar = () => {
      if (!activo) return;
      if (!video || video.readyState < 2) {
        temporizador = setTimeout(analizar, MS_ENTRE_ANALISIS);
        return;
      }

      const { videoWidth: vw, videoHeight: vh } = video;
      if (vw && vh) {
        // Reducción manteniendo la proporción.
        const escala = Math.min(1, LADO_MAXIMO / Math.max(vw, vh));
        const w = Math.round(vw * escala);
        const h = Math.round(vh * escala);
        if (lienzo.width !== w || lienzo.height !== h) {
          lienzo.width = w;
          lienzo.height = h;
        }
        ctx.drawImage(video, 0, 0, w, h);
        try {
          const leido = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (leido?.data && alLeer(leido.data)) { parar(); return; }
        } catch { /* fotograma inservible: se sigue con el siguiente */ }
      }

      temporizador = setTimeout(analizar, MS_ENTRE_ANALISIS);
    };

    analizar();
  })();

  return parar;
}

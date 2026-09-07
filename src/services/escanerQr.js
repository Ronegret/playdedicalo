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

// 640 y no 480: un QR en una tele, visto desde el sofá, ocupa una parte
// pequeña del encuadre, y a 480 se perdía el detalle justo cuando más falta
// hacía. Sigue siendo ocho veces menos trabajo que analizar a resolución
// completa, que era lo que hacía tiritar la vista previa.
const LADO_MAXIMO = 640;
const MS_ENTRE_ANALISIS = 120;

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
          height: { ideal: 720 },
          // Fotogramas limitados a 30: pedir más solo hace que el móvil
          // trabaje de más para una imagen que se analiza ocho veces por
          // segundo.
          frameRate: { ideal: 30, max: 30 }
          // NO se pide `focusMode: 'continuous'`. Se probó y fue peor: los
          // móviles ya enfocan en continuo por su cuenta, y forzarlo por
          // restricción hace que la cámara "busque" el enfoque una y otra
          // vez. Ese vaivén de enfoque y exposición es lo que se veía como
          // parpadeos, y en una tele encendida dentro de una habitación a
          // oscuras —mucha luz en el centro y negro alrededor— es donde peor
          // se porta.
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

    // La cámara tarda un momento en asentar exposición y balance de blancos.
    // Analizar durante ese arranque no aporta —la imagen aún está cambiando—
    // y sí quita tiempo de CPU justo cuando el navegador está montando la
    // vista previa.
    const listoDesde = performance.now() + 600;

    let vuelta = 0;
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });

    const analizar = () => {
      if (!activo) return;
      if (!video || video.readyState < 2) {
        temporizador = setTimeout(analizar, MS_ENTRE_ANALISIS);
        return;
      }

      const { videoWidth: vw, videoHeight: vh } = video;
      if (vw && vh && performance.now() >= listoDesde) {
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
          const datos = ctx.getImageData(0, 0, w, h).data;
          // Se alterna el modo de inversión entre fotogramas: así se cubren
          // también los códigos claros sobre fondo oscuro sin pagar el doble
          // de trabajo en cada pasada.
          vuelta += 1;
          const leido = jsQR(datos, w, h, {
            inversionAttempts: vuelta % 2 ? 'dontInvert' : 'onlyInvert'
          });
          if (leido?.data && alLeer(leido.data)) { parar(); return; }
        } catch { /* fotograma inservible: se sigue con el siguiente */ }
      }

      temporizador = setTimeout(analizar, MS_ENTRE_ANALISIS);
    };

    analizar();
  })();

  return parar;
}

import { useEffect, useRef, useState } from 'react';

/**
 * CÓDIGO QR, DIBUJADO AQUÍ
 *
 * Antes los QR se pedían a `api.qrserver.com`, un servicio ajeno. Dos motivos
 * para dejar de hacerlo, y el segundo pesa más que el primero:
 *
 *  1. Privacidad. Para dibujar el código había que MANDARLE la dirección de
 *     la sala, PIN incluido. Es un tercero recibiendo datos de cada partida
 *     que se juega, que además hay que declarar en la política de privacidad.
 *
 *  2. Es un punto único de fallo. Si ese servicio se cae o tarda, en la tele
 *     no aparece el código y NADIE puede entrar a jugar. Toda la partida
 *     dependía de una web gratuita que no controlamos.
 *
 * Dibujarlo aquí cuesta unos kilobytes y funciona aunque no haya internet
 * hacia fuera. Se pinta en un `canvas` y solo se vuelve a dibujar cuando
 * cambia el contenido o el tamaño.
 */
export default function CodigoQr({ valor, tam, className, alt = 'Código QR' }) {
  const lienzoRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    if (!valor) return undefined;

    // Se carga solo cuando hace falta un QR: quien no ve ninguno no lo baja.
    import('qrcode')
      .then(({ default: QRCode }) => {
        if (cancelado || !lienzoRef.current) return null;
        return QRCode.toCanvas(lienzoRef.current, valor, {
          errorCorrectionLevel: 'M',
          margin: 1,
          // 512 de lado: sobra para una tele 4K y para que una cámara lo lea
          // desde el sofá, y el navegador lo escala al hueco que le demos.
          width: 512,
          color: { dark: '#000000', light: '#ffffff' }
        });
      })
      .then(() => { if (!cancelado) setError(false); })
      .catch(() => { if (!cancelado) setError(true); });

    return () => { cancelado = true; };
  }, [valor]);

  // Si por lo que sea no se pudo dibujar, mejor un hueco honesto que un
  // cuadro roto: al lado siempre está el PIN escrito, que es la otra forma
  // de entrar.
  if (error) {
    return (
      <div
        className={className}
        style={{ width: tam, height: tam, background: '#fff', opacity: 0.25 }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <canvas
      ref={lienzoRef}
      className={className}
      style={{ width: tam, height: tam, display: 'block' }}
      role="img"
      aria-label={alt}
    />
  );
}

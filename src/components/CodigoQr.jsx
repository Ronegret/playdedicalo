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
 *     no aparece el código y NADIE puede entrar a jugar.
 *
 * ── POR QUÉ COSTABA ESCANEARLO ────────────────────────────────────────────
 *
 * Se veía, pero a las cámaras les costaba. Tres motivos, los tres arreglados
 * aquí, y los tres invisibles si solo miras el código en pantalla:
 *
 *  1. ZONA SILENCIOSA INSUFICIENTE. Iba con `margin: 1`. La norma ISO del QR
 *     exige un borde blanco de CUATRO módulos alrededor; es lo que le dice al
 *     lector dónde empieza y acaba el código. Con uno solo, muchas cámaras no
 *     lo encuentran — sobre todo de lado o con poca luz, que es exactamente
 *     la situación de una fiesta.
 *
 *  2. MÓDULOS DIFUMINADOS. Se dibujaba un lienzo de 512 px y luego CSS lo
 *     encogía a 204. Al reescalar, el navegador INTERPOLA: los cuadritos
 *     dejan de tener el borde limpio y se funden con el vecino. Un QR es
 *     precisamente una cuadrícula de bordes limpios. Ahora el lienzo se
 *     dibuja al tamaño real que va a ocupar —en píxeles de verdad, contando
 *     la densidad de la pantalla— y redondeado a un múltiplo exacto del
 *     número de módulos, de forma que cada módulo cae en un número entero de
 *     píxeles y no queda ninguno a medias.
 *
 *  3. CORRECCIÓN DE ERRORES BAJA. Estaba en 'M' (~15%). Al pasar a 'Q'
 *     (~25%) el código aguanta reflejos, un dedo en una esquina y la mano
 *     temblando. Cuesta un código un poco más denso, y a cambio se lee.
 */

/** Zona silenciosa que exige la norma, en módulos. */
const MARGEN = 4;

export default function CodigoQr({ valor, tam, className, alt = 'Código QR' }) {
  const lienzoRef = useRef(null);
  const contenedorRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    if (!valor) return undefined;

    const dibujar = async () => {
      const lienzo = lienzoRef.current;
      const caja = contenedorRef.current;
      if (!lienzo || !caja) return;

      const { default: QRCode } = await import('qrcode');
      if (cancelado) return;

      // Cuántos píxeles de verdad ocupa esto en ESTA pantalla. En un móvil
      // con densidad 3x, 200 css-px son 600 píxeles físicos: dibujar 200 y
      // dejar que los estire es justo lo que lo volvía borroso.
      const ladoCss = caja.getBoundingClientRect().width || 256;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const ladoFisico = Math.round(ladoCss * dpr);

      // Cuántos módulos tiene este contenido concreto (varía con la longitud
      // de la URL y con el nivel de corrección).
      const datos = QRCode.create(valor, { errorCorrectionLevel: 'Q' });
      const modulos = datos.modules.size + MARGEN * 2;

      // La clave: un número ENTERO de píxeles por módulo. Si sale 7,3 px por
      // módulo, unos ocupan 7 y otros 8 y la cuadrícula deja de ser regular.
      const pxPorModulo = Math.max(1, Math.floor(ladoFisico / modulos));
      const lado = pxPorModulo * modulos;

      await QRCode.toCanvas(lienzo, valor, {
        errorCorrectionLevel: 'Q',
        margin: MARGEN,
        width: lado,
        color: { dark: '#000000', light: '#ffffff' }
      });
      if (cancelado) return;
      setError(false);
    };

    dibujar().catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, [valor, tam]);

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
    <div
      ref={contenedorRef}
      className={className}
      style={{
        width: tam,
        height: tam,
        // Blanco puro de verdad bajo el código. Antes heredaba el fondo de la
        // tarjeta, y un QR sobre gris pierde contraste justo donde más falta
        // hace.
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
      role="img"
      aria-label={alt}
    >
      <canvas
        ref={lienzoRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          // Sin esto, cualquier ajuste de tamaño vuelve a interpolar y a
          // difuminar los bordes que tanto ha costado dejar limpios.
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
}

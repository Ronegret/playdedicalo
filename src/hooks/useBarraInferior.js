import { useEffect } from 'react';

/**
 * RESERVAR EL HUECO EXACTO DE LA BARRA FIJA DE ABAJO — O NINGUNO
 *
 * EL PROBLEMA
 *
 * Varias pantallas tienen una barra anclada abajo (UNIRSE, PARAR MÚSICA,
 * SIGUIENTE…). Al ser `fixed`, flota sobre el contenido: si nadie reserva ese
 * espacio, se come la última tarjeta de la página.
 *
 * Se reservaba con un número escrito a mano —`padding-bottom: 8.5rem`— y eso
 * fallaba por los DOS lados:
 *
 *   · POR DEFECTO. La barra no mide siempre lo mismo: crece cuando el texto
 *     del botón pasa a dos líneas y, sobre todo, cuando alguien sube el tamaño
 *     de letra. Medido con "letra muy grande": hasta 72 px de contenido
 *     escondido debajo.
 *
 *   · POR EXCESO, que es el que se ve. La barra NO siempre está. En el
 *     asistente de entrada solo aparece en el último paso; en la partida, solo
 *     mientras suena la canción. El resto del tiempo se reservaban 145 px para
 *     algo que no existía: una franja vacía al final de la pantalla sin
 *     ninguna explicación.
 *
 * LA SOLUCIÓN
 *
 * Ni adivinar ni recordar: OBSERVAR. Este hook vive en App, vigila si hay
 * alguna `.barra-inferior` en pantalla y publica su alto real en la variable
 * `--alto-barra`. Si no hay ninguna, publica 0.
 *
 * Que sea global y no por pantalla es a propósito: así ninguna pantalla nueva
 * tiene que acordarse de nada. Pone la barra, le pone la clase, y el hueco
 * aparece y desaparece solo.
 */

/** Aire entre el final del contenido y la barra. Pegado se lee como si el
 *  contenido siguiera por debajo. */
const AIRE = 16;

export function useBarraInferior() {
  useEffect(() => {
    const raiz = document.documentElement;
    let pendiente = null;

    const medir = () => {
      pendiente = null;
      const barras = [...document.querySelectorAll('.barra-inferior')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden';
      });

      if (!barras.length) {
        // Sin barra, sin hueco. Este es el caso que dejaba la franja vacía.
        raiz.style.setProperty('--alto-barra', '0px');
        raiz.style.setProperty('--hay-barra', '0');
        return;
      }
      // Al girar, la barra pasa a ser un carril vertical en el borde derecho,
      // y el contenido tiene que dejarle sitio. Pero SOLO si existe: reservar
      // ese carril siempre dejaba 81 px vacíos a la derecha en la portada, el
      // manual y la selección de rol, que no tienen barra ninguna. Es el mismo
      // fallo del hueco de abajo, en horizontal.
      raiz.style.setProperty('--hay-barra', '1');

      // Si hubiera varias (una entrando y otra saliendo durante una
      // transición), manda la más alta: reservar de menos deja contenido
      // tapado, y reservar de más solo deja aire un instante.
      // Se vigila el tamaño de las PROPIAS barras, no solo el del documento.
      // Quien cambia de alto cuando alguien sube el tamaño de letra, o cuando
      // el botón pasa de "UNIRSE" a "ENTRANDO...", es la barra — y eso no
      // altera el alto del body ni dispara `resize`. Sin esto, el hueco se
      // quedaba en el valor viejo: medido con "letra muy grande", la barra
      // pasaba a 132 px y seguían reservados 114.
      // Volver a observar un elemento ya observado no hace nada, así que
      // llamarlo en cada medida es seguro.
      barras.forEach((el) => observadorTam.observe(el));

      const alto = Math.max(...barras.map((el) => el.getBoundingClientRect().height));
      if (!alto) return;
      raiz.style.setProperty('--alto-barra', `${Math.ceil(alto) + AIRE}px`);
    };

    /** Las medidas se agrupan por fotograma: una transición dispara decenas de
     *  mutaciones seguidas y no hace falta medir en todas. */
    const pedirMedida = () => {
      if (pendiente !== null) return;
      pendiente = requestAnimationFrame(medir);
    };

    // Se crea antes de la primera medida porque `medir` lo usa para engancharse
    // a cada barra que encuentra.
    const observadorTam = new ResizeObserver(pedirMedida);
    observadorTam.observe(document.body);
    // La raíz también: ahí es donde cambia el tamaño de letra base.
    observadorTam.observe(document.documentElement);

    medir();

    // La barra aparece y desaparece con la fase de la partida y con el paso
    // del asistente, así que hay que enterarse de los cambios del árbol.
    const observadorDom = new MutationObserver(pedirMedida);
    observadorDom.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    window.addEventListener('resize', pedirMedida);
    window.addEventListener('orientationchange', pedirMedida);

    return () => {
      if (pendiente !== null) cancelAnimationFrame(pendiente);
      observadorDom.disconnect();
      observadorTam.disconnect();
      window.removeEventListener('resize', pedirMedida);
      window.removeEventListener('orientationchange', pedirMedida);
      raiz.style.removeProperty('--alto-barra');
      raiz.style.removeProperty('--hay-barra');
    };
  }, []);
}

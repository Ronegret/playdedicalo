import { useCallback, useRef } from 'react';

/**
 * RESERVAR EL HUECO EXACTO DE LA BARRA FIJA DE ABAJO
 *
 * EL PROBLEMA
 *
 * Varias pantallas tienen una barra anclada abajo (PARAR MÚSICA, SIGUIENTE,
 * ENTRAR…). Al ser `fixed`, flota sobre el contenido: si nadie reserva ese
 * espacio, la barra se come la última tarjeta de la página.
 *
 * Se reservaba con un número escrito a mano — `padding-bottom: 8.5rem` en
 * `.safe-bottom-action`. Y ahí está el fallo: la barra NO mide siempre lo
 * mismo. Crece cuando el texto del botón pasa a dos líneas, cuando encima
 * lleva una frase de ayuda, y sobre todo cuando alguien sube el tamaño de
 * letra en los ajustes de accesibilidad. En "letra muy grande" la barra pasa
 * de 8,5rem y empieza a tapar contenido — medido: hasta 72 px de texto
 * escondido debajo.
 *
 * LA SOLUCIÓN
 *
 * No adivinar: MEDIR. Un ResizeObserver mira la barra de verdad y publica su
 * alto en una variable CSS que usa el contenedor que se desplaza. Así el
 * hueco reservado es siempre exactamente el que hace falta, con cualquier
 * texto, en cualquier idioma y con cualquier tamaño de letra — incluidos los
 * que todavía no existen.
 *
 * POR QUÉ UN REF DE CALLBACK Y NO UNO NORMAL
 *
 * La barra no está siempre en pantalla: aparece y desaparece según la fase de
 * la partida. Con un `useRef` corriente, el efecto se ejecuta una vez —cuando
 * `ref.current` todavía es null porque la barra aún no existe— y no vuelve a
 * ejecutarse jamás, porque la identidad del ref nunca cambia. El hook quedaba
 * muerto sin dar ningún síntoma.
 *
 * Un ref de callback lo llama React EXACTAMENTE cuando el elemento entra en el
 * árbol y cuando sale. No hay forma de perderse la aparición.
 *
 * Uso:
 *   const barraRef = useBarraInferior();
 *   …
 *   <div ref={barraRef} className="fixed inset-x-4 bottom-4">…</div>
 *
 * @returns {(el: HTMLElement | null) => void} ref para la barra fija
 */
export function useBarraInferior() {
  const observador = useRef(null);

  return useCallback((elemento) => {
    const raiz = document.documentElement;

    observador.current?.disconnect();
    observador.current = null;

    if (!elemento) {
      // La barra se fue: se suelta el hueco para que el contenido lo recupere.
      raiz.style.removeProperty('--alto-barra');
      return;
    }

    const medir = () => {
      const alto = elemento.getBoundingClientRect().height;
      // Sin alto medible (aún sin pintar) se deja el respaldo del CSS en vez
      // de escribir un 0 que quitaría todo el hueco de golpe.
      if (!alto) return;
      // Un dedo de aire: pegado a la barra, el contenido parece continuar
      // por debajo.
      raiz.style.setProperty('--alto-barra', `${Math.ceil(alto) + 16}px`);
    };

    medir();

    // ResizeObserver y no un listener de `resize`: la barra cambia de alto por
    // motivos que no son un cambio de ventana —el botón pasa de "PARAR MÚSICA"
    // a "PARANDO...", alguien sube el tamaño de letra— y eso no dispara
    // `resize`.
    observador.current = new ResizeObserver(medir);
    observador.current.observe(elemento);
  }, []);
}

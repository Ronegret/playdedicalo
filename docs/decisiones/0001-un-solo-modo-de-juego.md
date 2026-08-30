# ADR-0001 — Un solo modo de juego

- **Fecha:** 9 de agosto de 2026
- **Estado:** Vigente

## Contexto

El juego tenía tres modos: «Años Locos» (timeline), «Bingo Musical» y «Corte
Maestro». Mantener tres mecánicas suponía:

- Triplicar el trabajo de diseño, pruebas y manual.
- Una pantalla de selección de modo que añadía fricción antes de empezar.
- Confusión sobre cuál era «el juego» de verdad.

En partidas reales, «Años Locos» era el que enganchaba.

## Decisión

**Eliminar Bingo Musical y Corte Maestro.** El producto queda con una sola
mecánica: Años Locos.

## Consecuencias

**A favor**
- Pantalla de selección de modo eliminada: se entra a jugar antes.
- Todo el esfuerzo de pulido va a una sola mecánica.
- El manual se simplifica.

**En contra**
- Menos variedad para grupos que repiten mucho.
- Queda código y campos muertos en el catálogo (`question_artist`,
  `question_title`…) de los modos retirados.

**Reversibilidad:** el código de los modos eliminados sigue en el historial
de git. Volver a añadirlos es posible, pero sería una decisión nueva.

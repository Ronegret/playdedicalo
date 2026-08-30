# Game Design Document — Dedícalo Play

- **Versión del documento:** correspondiente a v0.4.0
- **Última revisión:** 30 de agosto de 2026

Todos los valores numéricos de este documento están tomados del código
(`src/store/useGameStore.js`). Si se cambian ahí, hay que actualizarlos aquí.

---

## 1. Modo de juego: «Años Locos»

**Única mecánica del producto.** Existieron antes «Bingo Musical» y «Corte
Maestro»; se eliminaron en la v0.3.0 para concentrar el diseño
(ver [ADR-0001](decisiones/0001-un-solo-modo-de-juego.md)).

### Bucle de juego

```
Anfitrión inicia ronda
        ↓
Suena una canción al azar de la playlist (nadie ve cuál es)
        ↓
Anfitrión corta la música cuando quiere
        ↓
Todos colocan la canción en SU ruta de años
        ↓
Anfitrión revela resultados
        ↓
Puntos + progreso  →  siguiente ronda
```

### La ruta de años

Cada jugador tiene su **propia línea temporal**, no compartida. Empieza con
**un año semilla** asignado de forma determinista a partir de su id
(`getTimelineBaseYear`, rango 1990-2010), de modo que cada uno arranca
distinto pero siempre igual si se reconecta.

Al responder, elige un **hueco** entre sus años: «antes de X», «entre X e Y»,
«después de Z». Acierta si la canción encaja realmente en ese hueco.

Detalle de diseño: **entre dos años iguales no se ofrece hueco**. Es
matemáticamente imposible acertar ahí, así que mostrarlo solo confundía.

## 2. Condición de victoria

Gana quien primero completa su ruta con **N canciones**.

| Ajuste | Valor |
|---|---|
| Meta por defecto | **12 canciones** |
| Mínimo configurable | 6 |
| Máximo configurable | 20 |

El progreso hacia la meta cuenta canciones acertadas **más** comodines
canjeados con puntos. **Los puntos por sí solos nunca ganan la partida.**

## 3. Economía de puntos

Los puntos son **moneda**, no marcador de victoria. Sirven para sabotear y
para comprar progreso.

| Acción | Efecto |
|---|---|
| Puntos iniciales | **10** |
| Acierto | **+5** |
| Fallo | **−3** |
| No responder (invitado) | **−3** |
| No responder (anfitrión) | **0** |
| Bloqueado por sabotaje | **−3** |
| **Acertar primero en la ronda** | **+1 extra** |
| Sabotear a un rival | **−8** |
| Canjear por una canción de progreso | **−40** |

Los puntos nunca bajan de 0 (`clampPoints`).

### Bonus por acertar primero (+1)

Solo **uno por ronda**, para quien acierta antes que nadie.

- Se ordena por **marca de tiempo del servidor** (`serverAt`), no por el reloj
  del móvil: los relojes de los teléfonos van desviados entre sí y ordenar por
  hora local regalaría el bonus siempre al mismo aparato.
- Un jugador **bloqueado** por sabotaje no puede ganarlo.
- Ser el más rápido pero **fallar** no lo gana: pasa al siguiente que acertó.
- Un empate exacto se resuelve por id, para que sea determinista.

**Balance:** +1 frente a +5 por acierto. Premia decidir rápido sin que la
velocidad pese más que acertar; quien juega lento pero seguro sigue siendo
competitivo.

### El anfitrión no es penalizado por no responder

Está gestionando la música y el ritmo. Penalizarle por atender a eso sería
castigar el rol, no el juego.

## 4. Sabotaje (opcional)

**Desde la v0.4.0 el anfitrión decide** si su partida lleva sabotaje y qué
tipos permite. Puede jugarse en modo «partida limpia».

Coste: **8 puntos**. Solo durante la fase de escucha, antes de que salga la
pregunta.

| Tipo | Efecto |
|---|---|
| **Bloqueo** | El objetivo no puede responder esa ronda. Cuenta como fallo (−3), pero su ruta no pierde nada. |
| **Robo de año** | El objetivo responde normal. Si acierta, **el año se lo lleva el atacante** y además el objetivo pierde uno de los suyos. |

Ambos tipos tienen **la misma importancia visual** en el selector: son
alternativas, no una principal y una secundaria.

### Presentación: la bomba musical

El aviso de sabotaje es una secuencia de dos actos:

1. **Mecha** — un vinilo-bomba con chispa encendida, cuenta atrás 3·2·1 con
   vibración creciente.
2. **Detonación** — destello blanco, onda expansiva, ráfaga de notas, y se
   revela quién atacó y con qué.

El objetivo es que el sabotaje **se sienta como un momento**, no como un
cartel informativo.

## 5. Compra de progreso (canje)

Por **40 puntos**, un jugador convierte puntos en una canción de progreso sin
tener que acertarla.

**Por qué existe:** evita que quien va muy por detrás desconecte de la
partida. Es la válvula anti-frustración. El coste alto (8 aciertos limpios)
garantiza que no sea una vía rápida, sino un recurso de rescate.

Los comodines se distinguen visualmente de los años acertados (círculo dorado
con estrella), para que el logro real no se confunda con el comprado.

## 6. Roles

| | Anfitrión | Invitado |
|---|---|---|
| Necesita cuenta de música | **Sí (Premium)** | No |
| Controla el ritmo | Sí | No |
| Juega y puntúa | **Sí** | Sí |
| Puede sabotear | Sí | Sí |
| Configura la partida | Sí | No |

El anfitrión **también juega**. No es un árbitro: es un jugador con mando.

## 7. Presencia y reconexión

Diseñado para fiestas reales, donde los móviles se bloquean y el wifi falla.

- **30 segundos de gracia** (`RECONNECT_GRACE_MS`) antes de mostrar a alguien
  como desconectado. Volver dentro de ese margen no cuesta el sitio ni el
  progreso.
- Un jugador que se reconecta **recupera su ruta y sus puntos**.
- **Unirse a mitad de partida** es posible con aprobación del anfitrión.

## 8. Ajustes de partida

| Ajuste | Quién | Cuándo |
|---|---|---|
| Playlist | Anfitrión | Al crear y en el lobby |
| Meta de canciones (6-20) | Anfitrión | Al crear y en el lobby |
| Sabotaje on/off y tipos | Anfitrión | Al crear y en el lobby |

Todo se congela al empezar la ronda 1.

## 9. Balance: puntos abiertos

Cosas que **no** están validadas con datos, solo con criterio de diseño:

- ¿Es **+1** el valor correcto del bonus de velocidad? Puede quedarse corto
  como incentivo o resultar irrelevante.
- ¿Es **40** el coste adecuado del canje? No se ha medido cuántas veces se usa
  en una partida real.
- ¿Es **8** un coste de sabotaje que invite a usarlo? Con partidas de 12
  canciones puede ser demasiado caro para llegar a verse.

Estos valores están centralizados como constantes exportadas, así que
ajustarlos es de una línea.

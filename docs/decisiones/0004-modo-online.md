# ADR-0004 — Modo online (jugar sin estar en el mismo sitio)

- **Fecha:** 30 de agosto de 2026
- **Estado:** 🔵 Investigado — pendiente de decidir, ligado a [ADR-0002](0002-dependencia-de-spotify.md)

## Contexto

El diseño actual asume **presencialidad**: una sola persona (el anfitrión)
reproduce la música y todos la escuchan del mismo altavoz. Surge la pregunta
de si un grupo podría jugar **en remoto**, cada uno en su casa.

La intuición de partida era que resolver esto podría resolver también otros
problemas. **Es correcta, y por una razón que no es obvia.**

## Restricción innegociable: nadie más que el anfitrión necesita cuenta

Requisito explícito del proyecto, tanto en presencial como en online:

> **Los invitados NUNCA deben necesitar cuenta de Spotify (ni de nada).**
> Como mucho, el anfitrión.

Esto **descarta de entrada** la única vía que lo incumpliría: sincronizar
varios Web Playback SDK de Spotify, donde cada oyente necesitaría su propio
Premium. Queda eliminada, no es una opción a valorar.

La vía de los previews **cumple el requisito de sobra**, y de hecho mejora la
situación actual:

| | Hoy (Spotify) | Con previews |
|---|---|---|
| Invitados | Sin cuenta ✅ | Sin cuenta ✅ |
| Anfitrión | **Premium obligatorio** | **Sin cuenta** ✅ |

Es decir: no solo no empeora el requisito de entrada, sino que **quita el
único que quedaba**. El anfitrión dejaría de necesitar Premium.

Cualquier propuesta futura que exija cuenta a los invitados se rechaza sin
más análisis.

## Hallazgo principal

Las dos preguntas —«¿cómo quitamos la dependencia de Spotify?» y «¿cómo
jugamos online?»— **tienen la misma respuesta**. No son dos proyectos: son uno.

### Con Spotify, el modo online es inviable

Técnicamente se puede sincronizar: cada cliente monta su propio Web Playback
SDK y se coordinan las posiciones. Existen proyectos que lo hacen. Pero:

- **Cada oyente necesita Spotify Premium.** Hoy solo lo necesita el anfitrión.
  El modo online **empeoraría** el requisito de entrada en vez de mejorarlo.
- **Cada oyente consume una plaza** del cupo de la app, hoy limitado a 5
  usuarios en modo desarrollo.
- Sigue incumpliendo la prohibición de juegos de la política de Spotify.

### Con previews, el modo online sale casi gratis

Si el audio son previews de 30 s del catálogo público (ver ADR-0002):

- **Nadie necesita cuenta.** Ni el anfitrión.
- Cada navegador reproduce **su propia copia** del mismo fragmento.
- No hay cupo de usuarios.

Es decir: **el modo online no es una funcionalidad aparte que haya que
construir; es un efecto secundario de resolver la base musical.**

## Sincronización: más fácil de lo que parece

La sincronización de audio entre navegadores es un problema conocido y
difícil… **cuando varias fuentes suenan en la misma habitación**. No es
nuestro caso.

En modo online cada persona está sola con su altavoz: **nadie oye dos fuentes
a la vez**, así que un desfase de 200-300 ms es imperceptible. No hace falta
precisión de muestra.

Lo que sí importa es la **equidad**: que todos tengan el mismo tiempo de
escucha antes de poder responder. Eso se resuelve con reloj compartido, no
con sincronía de audio:

1. El anfitrión publica «reproducir el fragmento X empezando en el instante T»
2. Cada cliente calcula su desfase con el reloj del servidor y programa el
   inicio
3. La ventana de respuesta se abre en T+N **para todos por igual**

### Ya tenemos la pieza clave

Firebase Realtime Database expone **`.info/serverTimeOffset`**: el desfase
estimado entre el reloj del dispositivo y el del servidor. Es exactamente la
primitiva que hace falta, y **ya está en nuestro stack**. No hay que añadir
nada.

Es la misma idea que ya se usó para el bonus por acertar primero, donde el
orden se decide con hora de servidor y no con la del móvil.

## Lo que el modo online resolvería además

| Problema actual | ¿Lo resuelve? |
|---|---|
| El anfitrión necesita Premium | ✅ Nadie necesita cuenta |
| Techo de 5 usuarios de Spotify | ✅ Desaparece |
| Spotify se cae a mitad de partida | ✅ Desaparece la causa |
| Hay que estar en el mismo sitio | ✅ Ese es el objetivo |
| Mercado limitado a reuniones presenciales | ✅ Se amplía mucho |

Buena parte del trabajo de las últimas semanas (reconexión de Spotify,
diagnósticos, reparación de reproductor) **dejaría de ser necesaria**.

## Riesgos y trabajo real que implica

No es gratis. Lo que habría que resolver:

1. **Bloqueo de autoplay.** Los navegadores no dejan sonar audio sin un gesto
   previo del usuario. En presencial esto lo resuelve el anfitrión tocando
   una vez; **en online cada jugador tendría que "armar" el audio con un
   toque al empezar**. Hay que diseñarlo explícitamente o el juego fallará en
   silencio para quien no lo haga.
2. **Cambia el rol del anfitrión.** Hoy «corta la música» a mano cuando quiere.
   En online cada cliente reproduce lo suyo, así que el corte debe ser
   programado, no manual. Es un cambio de mecánica, no solo técnico.
3. **Solo 30 segundos.** Suficiente para este juego, pero limita variantes
   futuras que necesiten más.
4. **Zona gris legal** de los previews (ver ADR-0002). El modo online no
   empeora ese riesgo, pero tampoco lo arregla.
5. **Dos modos que mantener** (presencial y online) si se conservan ambos.

## Decisión

**Ninguna todavía.** Se registra el hallazgo porque cambia el orden de
prioridades: el modo online deja de ser una idea suelta del roadmap y pasa a
ser **un argumento a favor de resolver la base musical**, que ya era la
decisión bloqueante.

**Recomendación:** no tratarlo como proyecto independiente. Si se resuelve
ADR-0002 por la vía de los previews, evaluar el modo online inmediatamente
después, porque la mayor parte del trabajo ya estará hecha.

## Requisito añadido (30/08/2026): hablar Y escuchar a la vez

Se aclara que el modo online **solo tiene sentido si los jugadores pueden
hablar entre ellos mientras suena la música**. Sin eso no se implementa. El
juego sigue enfocado a jugar en la misma sala; online sería un modo
secundario.

Esto obliga a resolver un problema acústico concreto.

### El problema: la cancelación de eco se come la música

Los navegadores aplican **cancelación de eco (AEC)** al micrófono en cualquier
llamada. Y aquí está la trampa: **el AEC solo puede cancelar el audio que pasa
por su propia tubería**. La música que reproduce una etiqueta `<audio>` de la
página **no la ve** (limitación conocida de Chrome).

Consecuencia con altavoz:

1. Tu micro capta tu propia música del altavoz
2. Como el AEC no la reconoce, no la elimina: la transmite
3. Los demás oyen su música + la tuya filtrada y desfasada
4. Además el supresor de ruido, pensado para voz, ataca la música y agacha
   las voces

Resultado: inservible.

### La solución: auriculares

Con auriculares **no hay camino acústico del altavoz al micrófono**. El
problema desaparece por completo, no se mitiga: deja de existir.

| Situación | Resultado |
|---|---|
| Altavoz del móvil/portátil | ❌ Eco, música embarullada, voces cortadas |
| **Auriculares (cualquiera)** | ✅ Funciona bien |

No se puede detectar de forma fiable si alguien lleva auriculares: no existe
una API de navegador para eso. Así que **hay que pedirlo explícitamente** en
la interfaz al entrar en modo online, y asumir que alguien lo ignorará.

### Decisión de alcance: NO construir chat de voz

Aunque se pudiera, **no conviene construir el chat de voz dentro de la app**:

- Los grupos que juegan en remoto **ya están en una llamada** (WhatsApp,
  Discord, FaceTime). Ya tienen el hábito y la app instalada.
- La calidad de voz de esas apps es mejor que la de un WebRTC casero.
- Nos ahorra el trabajo entero de señalización, servidores TURN y mantenimiento.
- El problema del eco es **acústico, no de software**: existe igual lo haga
  nuestra app o WhatsApp. Los auriculares hacen falta en ambos casos.

Es decir: la app **solo sincroniza la música**. La voz la pone el grupo.

Esto reduce el modo online a tres cosas:

1. Sincronizar el inicio del fragmento (con `.info/serverTimeOffset`)
2. Un toque por jugador para desbloquear el audio del navegador
3. Un aviso claro: **«ponte auriculares»**

### Veredicto

**Sí es posible, y bien.** Con una condición dura: **auriculares para todos**.

**Recomendación:** hacerlo, pero **después** de migrar la base musical a
previews, no antes. Si esa migración ocurre, el coste incremental del modo
online es pequeño. Como proyecto independiente sobre Spotify, no sale a cuenta.

Y comunicarlo sin adornos: «Modo online — ponte auriculares». Mejor una
condición clara de entrada que un grupo entero descubriendo a mitad de partida
que se oyen fatal.

## Siguiente paso

~~La prueba de cobertura de previews.~~ ✅ **Hecha: 94,2% — viable.**

Queda: prototipo de reproducción con previews (Fase 1 de ADR-0002). El modo
online se evalúa inmediatamente después, no antes.

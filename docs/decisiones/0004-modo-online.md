# ADR-0004 — Modo online (jugar sin estar en el mismo sitio)

- **Fecha:** 30 de agosto de 2026
- **Estado:** 🔵 Investigado — pendiente de decidir, ligado a [ADR-0002](0002-dependencia-de-spotify.md)

## Contexto

El diseño actual asume **presencialidad**: una sola persona (el anfitrión)
reproduce la música y todos la escuchan del mismo altavoz. Surge la pregunta
de si un grupo podría jugar **en remoto**, cada uno en su casa.

La intuición de partida era que resolver esto podría resolver también otros
problemas. **Es correcta, y por una razón que no es obvia.**

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

## Siguiente paso

El mismo que ADR-0002: **la prueba de cobertura de previews**
(`npm run cobertura`). Si sale viable, ambos caminos se abren a la vez.

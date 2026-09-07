# ADR-0002 — Dependencia de Spotify

- **Fecha:** 30 de agosto de 2026
- **Estado:** ✅ **RESUELTA el 7 de septiembre de 2026 — se sale de Spotify**

## Contexto

Dedícalo Play reproduce música a través del **Spotify Web Playback SDK**: el
anfitrión conecta su cuenta Premium y la app controla la reproducción. Los
invitados no necesitan cuenta.

Al investigar el plan de cobrar a los anfitriones, se revisó la política
oficial de desarrolladores de Spotify y aparecieron cuatro problemas.

### 1. La política prohíbe expresamente este tipo de juego

Sección III, «Aplicaciones prohibidas»:

> **«Do not create a game, including trivia quizzes.»**

Dedícalo Play es exactamente eso. **No es zona gris: es el caso que la
cláusula nombra.** Aplica hoy, se cobre o no.

### 2. Cobrar está prohibido para apps que reproducen

Al usar el SDK de reproducción, la app es una «Streaming SDA». Para esas:

> *«any e-commerce (e.g., in-app payment or monetization) initiated via a
> Streaming SDA»* — prohibido.

El ejemplo que da la propia Spotify como prohibido es casi idéntico al plan:
cobrar una cuota por una app que dispara música. **El flujo actual de
donaciones por Bizum ya roza esta cláusula.**

### 3. Techo de 5 usuarios

Desde febrero-marzo de 2026, el modo desarrollo permite **5 usuarios
autenticados** y exige que el dueño de la app tenga Premium activo. Las apps
existentes conservan lo que ya tenían, pero es un techo.

### 4. Salir de ese techo es un callejón sin salida

Para pedir cuota ampliada exigen empresa registrada, servicio lanzado y
**250.000 usuarios activos mensuales**. Es decir: hacen falta 250.000 usuarios
para poder tener más de 5.

### Cómo lo hace Hitster

Hitster hace lo mismo comercialmente. La conclusión, contrastada en los foros
oficiales, es que **Jumbo tiene un acuerdo comercial directo con Spotify**,
fuera de la API pública. Existe una puerta, pero se abre negociando y con una
empresa detrás.

## Decisión

**Ninguna todavía.** Se documenta el problema y se define qué hay que
averiguar antes de decidir. Se sigue con Spotify mientras tanto, siendo
conscientes del riesgo.

### Opciones sobre la mesa

| Vía | Coste | Viabilidad |
|---|---|---|
| Acuerdo directo con Spotify | Negociación | La más limpia; requiere sociedad y tracción |
| Licenciar los másters | 500-2.000 $/canción → **1,5-5,9 M$** | Descartada |
| Regrabaciones (covers) | Menor, pero licencia de sincronización por obra | Posible con catálogo reducido |
| Previews de Deezer | Gratis | **Muerta**: su ToS es «strictly non-commercial» |
| Previews de Apple | Gratis + 99 $/año de programa | Zona gris: uso «promocional, no de entretenimiento» |
| Cambiar qué se vende (producto físico) | — | Esquiva la prohibición de monetizar el streaming |

### Referencia: WhatTheHit

Competidor directo (clon digital de Hitster) que **funciona sin Spotify**.
Usa **previews de 30 segundos de Apple Music** más ShazamKit. Su web reconoce
que *«por restricciones de licencia, las canciones no pueden guardarse
localmente»*: reproducen en streaming, no alojan archivos.

Encaja bien con este juego porque **solo hace falta un fragmento**: se corta
la música y se pregunta el año. Los 30 segundos sobran.

## Consecuencias de no decidir

- **Riesgo realista:** que Spotify revoque el Client ID. La app dejaría de
  funcionar de un día para otro, sin aviso. No es una demanda millonaria: es
  perder el servicio.
- **El plan de negocio está bloqueado.** No se puede cobrar sobre esta base.
- Cuanto más tarde se resuelva, más caro sale: si la respuesta es «hay que
  salir de Spotify», cambian decisiones de arquitectura.

## Resultado de la prueba de cobertura (30/08/2026)

Ejecutada con `npm run cobertura` sobre una muestra estratificada por
playlist. Informe completo en `docs/evidencias/cobertura-previews-*.txt`.

> **94,2% de las canciones tienen preview disponible en Apple** (196/208).

Por playlist, **ninguna baja del 82%**. Las listas españolas antiguas, que
eran el riesgo principal, salen entre 91% y 100%. Dos incluso al 100%.

**Lectura: la vía de los previews es viable.** El catálogo actual se sostiene
casi entero.

Matiz importante: el **22,4% de los años de Apple discrepan** de nuestro
catálogo ya auditado — tienen el mismo problema de recopilatorios que tenía
Spotify. Pero eso **no es un obstáculo**: seguiríamos usando *nuestros* años,
que ya están corregidos y con fuente citada. De Apple solo se necesita el
audio, no la fecha.

## Qué hay que averiguar (por orden)

1. ~~**Prueba de cobertura**~~ ✅ **Hecha: 94,2% — viable.**
2. Escribir a Spotify y **pedir respuesta por escrito** sobre una vía comercial.
3. Revisar el estado real de la app en el Developer Dashboard.
4. Analizar el encuadre legal de WhatTheHit.
5. Consulta con abogado de propiedad intelectual digital **antes de facturar
   el primer euro**.

## Nota sobre una idea descartada

Se valoró **descargar los MP3 y alojarlos**. Queda descartado: es infracción
de dos derechos a la vez (composición y grabación máster), es detectable por
huella acústica, el proveedor de hosting corta el servicio ante un aviso, y
**contradice el propio aviso legal de la app**, que declara que no se descarga
ni redistribuye audio.


---

# RESOLUCIÓN — 7 de septiembre de 2026

**Decisión tomada: salir de Spotify.** El SDK, el login y la cuenta Premium
se han retirado de la aplicación. La música pasa a ser fragmentos de vista
previa de 30 segundos servidos públicamente, ya guardados en el catálogo.

## Qué se ha quitado

| Antes | Ahora |
|---|---|
| El anfitrión necesitaba **Spotify Premium** | **Nadie necesita cuenta de música** |
| Techo de **5 usuarios** del modo desarrollo | Desaparece: no hay OAuth |
| Tokens que caducaban a mitad de partida | No hay tokens |
| Botón de reconectar, diagnósticos, precalentado del SDK | Todo eliminado |
| Incumplía la prohibición de juegos de Spotify | Ya no se usa su API |

Archivos borrados: `src/services/spotify.js`, `src/components/SpotifyPlayer.jsx`,
`src/components/SpotifyReconnect.jsx`, `src/pages/SpotifyCallbackScreen.jsx`,
y la ruta `/spotify/callback`. Las claves `VITE_SPOTIFY_*` ya no las usa la
aplicación (siguen sirviendo para las herramientas de importación).

## Cómo funciona ahora

1. `npm run resolver-previews` busca el fragmento de cada canción en la API
   pública de Apple y guarda la URL en el catálogo. Se hace **una vez, en
   frío**, porque Apple corta sobre las 20 peticiones por minuto y pedirlo
   durante la partida dejaría la fiesta sin música.
2. `src/services/musica.js` reproduce esa URL con una etiqueta de audio
   normal. Sin SDK, sin sesión, sin dispositivo remoto.

Comprobado en navegador: el fragmento carga y avanza, 30 segundos exactos.
Los 30 segundos sobran para este juego, que corta la música y pregunta el año.

## El emparejamiento es estricto a propósito

Título + artista + duración con ±7 s de margen. Una canción mal emparejada
no deja un hueco: pone **otra canción** y da por mala la respuesta correcta.
Ante la duda, se queda sin fragmento y no se ofrece en la partida.

## Lo que sigue abierto

- **Cobertura ~93 %.** Las canciones sin fragmento no se ofrecen. Hay que
  vigilar que ninguna lista baje demasiado.
- **Las URLs pueden cambiar.** Habrá que volver a pasar el resolvedor de vez
  en cuando; el script detecta lo que falta y solo pide eso.
- **Zona gris legal.** Los fragmentos son públicos y se reproducen en
  streaming, sin alojar ni redistribuir nada — el mismo encuadre que usa
  WhatTheHit. Sigue pendiente la consulta con un abogado de propiedad
  intelectual **antes de facturar el primer euro**, y pesa más si algún día
  se publica en la tienda de un televisor.

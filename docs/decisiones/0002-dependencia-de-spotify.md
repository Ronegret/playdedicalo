# ADR-0002 — Dependencia de Spotify

- **Fecha:** 30 de agosto de 2026
- **Estado:** 🔴 **Abierta — decisión bloqueante para comercializar**

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

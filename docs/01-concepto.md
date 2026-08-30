# Documento de concepto — Dedícalo Play

- **Producto:** Dedícalo Play
- **Autor:** Rodrigo Negrete Aros
- **Inicio del desarrollo:** 13 de junio de 2026 (primer commit del repositorio)
- **Estado:** v0.4.0 — en desarrollo, jugable y desplegado
- **Dominio:** [play.dedicalo.es](https://play.dedicalo.es)
- **Última revisión de este documento:** 30 de agosto de 2026

---

## 1. Qué es

Dedícalo Play es un **juego musical de fiesta para grupos presenciales**. Se
juega con móviles, en el mismo sitio, alrededor de una música compartida.

Una persona hace de **anfitrión**: pone la música desde su cuenta y controla
el ritmo de la partida. El resto **se une con un PIN o un QR** desde su propio
móvil, sin instalar nada.

Suena una canción. El anfitrión corta la música. Cada jugador tiene que
decidir **de qué año es** y colocarla en el sitio correcto de su propia línea
temporal. Gana quien completa antes su ruta de canciones.

## 2. El problema que resuelve

Los juegos de fiesta musicales existentes tienen tres fricciones:

1. **Requieren comprar algo físico** (cartas, tablero) que hay que tener a mano.
2. **Cada jugador necesita instalar una app**, lo que rompe el momento.
3. **Todos necesitan cuenta** en algún servicio.

Dedícalo Play es una **web**: se abre en el navegador, se entra con un PIN, y
solo el anfitrión necesita una cuenta de música. Cero instalación para los
invitados.

## 3. Para quién es

- **Grupos de amigos y familia** en reuniones presenciales (cumpleaños,
  cenas, fiestas de pueblo).
- **Rango de edad amplio y mezclado.** Esto no es un detalle: es una
  restricción de diseño central. Se juega con gente de 20 y de 60 a la vez, a
  veces con poca luz y sin gafas. De ahí que la accesibilidad (tamaño de
  letra, contraste, botones grandes) sea un requisito, no un extra.
- **Contexto español/hispanohablante**: el catálogo está construido alrededor
  de música conocida en España y Latinoamérica.

## 4. Qué lo diferencia

| | Juegos de cartas físicos | Apps de trivia musical | **Dedícalo Play** |
|---|---|---|---|
| Instalación por jugador | — | Sí | **No** |
| Comprar material | Sí | No | **No** |
| Cuenta por jugador | — | Habitual | **Solo el anfitrión** |
| Ruta personal por jugador | No | No | **Sí** |
| Sabotaje entre jugadores | No | Raro | **Sí, opcional** |

La diferencia de diseño más propia: **cada jugador construye su propia línea
temporal**, no compiten sobre un tablero común. Eso hace que nadie quede
eliminado ni se aburra esperando, y que la partida siga siendo tensa hasta el
final.

## 5. Principios de diseño

1. **Cero fricción para el invitado.** Cualquier paso que se le pueda quitar
   a quien se une, se quita. El nombre es opcional; el PIN avanza solo; el QR
   salta un paso. **Los invitados nunca necesitan cuenta de nada** — esto es
   innegociable y aplica también a cualquier modo futuro.
2. **Legible a distancia y con prisa.** Se juega de pie, con ruido y con
   copas. Si algo hay que leerlo dos veces, está mal diseñado.
3. **El anfitrión manda el ritmo.** La partida no corre sola: para cuando él
   quiera.
4. **Nadie queda fuera.** Sin eliminación. Quien va perdiendo puede canjear
   puntos por progreso.
5. **Sin ruido visual.** La información nueva se monta sobre lo que ya está en
   pantalla antes que crear paneles nuevos.

## 6. Modelo de negocio (previsto)

Gratuito para los invitados, **de pago para el anfitrión** en el futuro.
Actualmente existe un flujo de **donación voluntaria** (Bizum) y de solicitud
de playlist propia a cambio de donación.

> **Riesgo abierto y sin resolver.** El modelo de cobro **no es compatible con
> la base musical actual**. Ver [ADR-0002](decisiones/0002-dependencia-de-spotify.md).
> Esta es la decisión más importante pendiente del proyecto y condiciona
> cualquier plan comercial.

## 7. Estado actual

- Jugable de extremo a extremo y desplegado en producción.
- Probado en partidas reales con grupos de ~20 personas.
- Catálogo propio de **2.932 canciones** con años auditados.
- Pendiente: resolver la base musical antes de comercializar.

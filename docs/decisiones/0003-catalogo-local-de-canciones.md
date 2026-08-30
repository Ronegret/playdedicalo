# ADR-0003 — Catálogo local de canciones

- **Fecha:** 15 de junio de 2026
- **Estado:** Vigente

## Contexto

El juego necesita saber, para cada canción, su **año de publicación**. Las
opciones eran consultar la API de Spotify en cada ronda, o mantener un
catálogo propio.

Consultar en vivo implicaba latencia en mitad de la partida, más superficie
de fallo, y consumo de cuota de API.

## Decisión

Mantener un **catálogo propio** en
`public/data/dedicalo-song-catalog.full.clean.json` (2.932 canciones),
extraído con herramientas a medida en `tools/`. A Spotify solo se le pide
**reproducir** una pista concreta.

## Consecuencias

**A favor**
- Sin latencia ni fallos de API al elegir canción.
- Control total sobre qué suena y con qué año.
- Permite **corregir los años a mano**, que resultó imprescindible.

**En contra**
- El catálogo hay que mantenerlo: no se actualiza solo.
- Ocupa ~4,5 MB que se descargan en el cliente.

## Nota posterior (24 de agosto de 2026)

Esta decisión demostró su valor. Se detectó que **Spotify devuelve el año del
álbum recopilatorio, no el del lanzamiento original**: «El Porompompero»
figuraba como 2007 siendo de 1970, «Bohemian Rhapsody» como 1981 siendo de
1975. Se auditaron 292 canciones sospechosas y se **corrigieron 138**.

Con consultas en vivo esto habría sido imposible de arreglar: el juego habría
dado años incorrectos de forma permanente. La auditoría con fuentes está en
`catalog-imports/song-year-corrections-2026-08-24.json`.

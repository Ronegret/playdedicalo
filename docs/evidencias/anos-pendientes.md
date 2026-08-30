# Auditoría de años — CERRADA

- **Última revisión:** 30 de agosto de 2026
- **Catálogo:** 2.932 canciones
- **Estado: sin pendientes.** Todas las candidatas resueltas.

## Resultado final

| Fase | Filas afectadas |
|---|---|
| 1ª auditoría (agosto, señal única) | 138 corregidas |
| 2ª auditoría (multi-señal), verificación automática | 151 corregidas |
| Unificación de canciones con años contradictorios | 73 corregidas |
| Verificación manual del resto | 15 corregidas |
| **Total corregido** | **377 filas** |

Integridad tras todas las pasadas: **2.932 filas, 0 años inválidos, 0 enlaces
rotos, 0 contradicciones.**

## Últimas 15 resueltas a mano

| Canción | Antes | Ahora | Fuente |
|---|---|---|---|
| Miguel de Molina — La bien pagá | 1990 | **1936** | Wikipedia (estrenada y grabada en 1936) |
| Ana María — Campanera | 1993 | **1953** | Versión original; Joselito la popularizó en 1956 |
| Luis Aguilé — Dile | 2008 | **1963** | Nº1 en España, Navidad de 1963 |
| Luis Aguilé — La vida pasa felizmente | 2002 | **1969** | Discogs |
| Fernando Esteso — La Ramona | 1998 | **1976** | Single Discophon (Discogs) |
| Camarón — Una Estrella Chiquitita | 2011 | **1969** | Álbum con Paco de Lucía |
| Hermanas Fleta — Chacachá del tren | 2005 | **1958** | Grabación documentada |
| Tijeritas — Libre Soy | 2017 | **1986** | Álbum *Sueño Con Las Estrellas* |
| Ecos del Rocío — La Niña | 1997 | **1994** | Álbum *Música por Sevillanas* |
| Los Sobraos — Quiero Verte | 2016 | **1995** | Álbum *Rumbamola* (Discogs) |
| Ángeles del Infierno — Jugando al amor | 1987 | **1993** | Web oficial del grupo (*A Cara O Cruz*) |
| Héctor «El Father» — Noche de Travesura | 2019 | **2004** | Publicada 12/10/2004 |
| No Me Pises… — ¿Y Tú de Quién Eres? | 1996 | **1990** | Álbum *Agropop* |
| Carlinhos Brown — María Caipirinha | 2011 | **2004** | Éxito en listas españolas (2 filas) |
| DJ Caribe Dance Mix — Danza Kuduro | 2014 | **2010** | Ver nota de criterio |

## Comprobadas y correctas (sin tocar)

| Canción | Año | Por qué es correcto |
|---|---|---|
| Shakira — Dai Dai | 2026 | Canción oficial del Mundial 2026, publicada el 15/05/2026 |
| Juan Magán — Ayer La Vi (BPA26) | 2026 | Versión oficial nueva con Omar Montes (27/02/2026), no una copia anónima |
| El Super Nuevo — Superman Sin Capa | 2016 | Plausible; sin fuente que lo contradiga |
| Coros y Danzas de Granada — Fandango de Huéscar | 1999 | Grabación folclórica; sin fuente mejor |

## Criterio aplicado a versiones y remezclas

Surgió un caso que obligó a decidir. Cuando una canción conocida aparece en
una **versión distinta**, ¿qué año responde el juego?

- **Versión anónima de recopilatorio** → se alinea con el original.
  *«DJ Caribe Dance Mix — Danza Kuduro»* respondía 2014 cuando cualquiera
  sitúa esa canción en 2010. El jugador acertaría y el juego le diría que
  falló. Corregido a 2010.
- **Versión oficial nueva del artista original** → mantiene su propio año.
  *«Ayer La Vi (BPA26)»* es un lanzamiento real de Juan Magán con Omar
  Montes en 2026, no una copia. Se queda en 2026.

La regla, en una frase: **el juego pregunta de qué año es la canción que
suena, y la respuesta debe ser la que un jugador informado daría.**

## Nota de método (importante si se retoma)

Las heurísticas de detección **no deben aplicarse a ciegas**. De las 405
canciones verificadas automáticamente, **264 ya tenían el año correcto**: dos
de cada tres alarmas eran falsas.

Falsos positivos confirmados:
- **Dúo Dinámico — Resistiré (1988)**: marcada por ser un grupo de los 60,
  pero la canción es realmente de 1988.
- **Remezclas y ediciones nuevas**: un año posterior puede ser legítimo.

```bash
npm run auditar-anos    # regenera la lista de sospechosas
```

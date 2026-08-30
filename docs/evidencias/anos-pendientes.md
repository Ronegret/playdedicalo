# Años pendientes de verificar

- **Última revisión:** 30 de agosto de 2026
- **Catálogo:** 2.932 canciones — **14 sin resolver (0,5%)**

Este archivo existe para que lo pendiente no se pierda. Se actualiza cada vez
que se resuelve alguna.

## Estado general

| | |
|---|---|
| Corregidas en agosto (1ª auditoría) | 138 filas |
| Corregidas el 30/08 (2ª auditoría, multi-señal) | 151 filas |
| Unificadas (misma canción, años contradictorios) | 73 filas |
| Corregidas a mano el 30/08 | 5 filas |
| **Pendientes** | **14 canciones** |

## A) Sin verificar (11)

Ninguna se ha tocado. Todas vienen de recopilatorios, así que **es probable
que su año sea el del recopilatorio y no el original**, pero no se ha
confirmado con fuente.

| Año actual | Canción | Álbum | Sospecha |
|---|---|---|---|
| 1996 | No Me Pises Que Llevo Chanclas — ¿Y Tú de Quién Eres? | Los Grandísimos Éxitos | Probable recopilatorio |
| 2002 | Luis Aguilé — La vida pasa felizmente | Grabaciones Discos Showman Vol.2 **(1968-1974)** | El álbum declara 1968-1974 |
| 2008 | Luis Aguilé — Dile | Todas Sus Canciones Del Verano Vol.3 | Probable recopilatorio |
| 1993 | Ana María — Campanera | Raíces de la Canción Española, Vol. 11 | Copla clásica, probable reedición |
| 2016 | Los Sobraos — Quiero Verte | 20 Aniversario - Reset | Edición de aniversario |
| 1997 | Ecos del Rocío — La Niña | Éxitos por Sevillanas | Probable recopilatorio |
| 2017 | Tijeritas — Libre Soy | "Leyenda Viva" 30 Aniversario | Edición de aniversario |
| 1999 | Coros y Danzas de Granada — Fandango de Huéscar | Folclore de nuestra tierra, Vol.1 | Grabación folclórica, fecha dudosa |
| 2014 | DJ Caribe Dance Mix — Danza Kuduro | Summer Hits | **Puede ser correcto**: es una versión, no el original de Don Omar (2010) |
| 2026 | Shakira — Dai Dai | Dai Dai | **Probablemente correcto**: single reciente |
| 2026 | Juan Magán — Ayer La Vi (BPA26) | Ayer La Vi (BPA26) | **Probablemente correcto**: versión 2026 |

## B) Año dudoso, deliberadamente sin aplicar (3)

Se verificaron, pero la fuente no confirmaba el año exacto. **Se dejó el año
antiguo a propósito: un año inventado es peor que uno viejo.**

| Actual | Propuesto | Canción | Por qué no se aplicó |
|---|---|---|---|
| 1990 | ~1942 | Miguel de Molina — La bien pagá | La copla es de 1936 y él la populariza desde 1938; su grabación en Odeon es de los años 40, año exacto sin confirmar. **El 1990 actual es claramente erróneo**, pero no se sabe cuál poner. |
| 1987 | ~1993 | Ángeles del Infierno — Jugando al amor | No aparece en *666* ni en *Joven para morir*; parece de la etapa de *A cara o cruz* (1993), sin confirmar. |
| 2019 | ~2004 | Héctor «El Father» — Noche de Travesura | El videoclip es de 2004 y la publicación oficial figura en 2006. Sin confirmar. |

## Cómo retomarlo

```bash
npm run auditar-anos     # regenera la lista de sospechosas
```

Para cada una: buscar el año original en Wikipedia, Discogs o MusicBrainz,
y aplicar solo si la fuente es clara. Registrar el cambio en
`catalog-imports/` con antes/después y fuente, como las anteriores.

## Nota de método

Las heurísticas dan falsos positivos y no deben aplicarse a ciegas. Casos
confirmados donde el año «sospechoso» era **correcto**:

- **Dúo Dinámico — Resistiré (1988)**: marcada por ser el grupo de los 60,
  pero la canción es realmente de 1988.
- **Remezclas y ediciones nuevas**: un año posterior es legítimo.
- De las 405 canciones verificadas en la segunda auditoría, **264 ya tenían
  el año correcto** — es decir, dos de cada tres alarmas eran falsas.

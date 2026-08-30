# Registro de cambios — Dedícalo Play

Historial de versiones del producto. Sigue el formato de
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado
[SemVer](https://semver.org/lang/es/).

Las fechas y el contenido de cada versión están **derivados del historial real
de commits** del repositorio (`git log`), no reconstruidos de memoria. Cada
versión indica el rango de fechas y los commits que la cierran, de modo que
cualquier afirmación de este documento se puede verificar con:

```bash
git log --since=<fecha-inicio> --until=<fecha-fin> --format="%h %ad %s" --date=short
```

---

## [No publicado]

En curso. Ver [roadmap](docs/05-roadmap.md).

---

## [0.4.0] — 2026-08-30 — «Usabilidad y accesibilidad»

Reescritura de los flujos de entrada y revisión completa de accesibilidad.
Primera versión pensada explícitamente para jugarse con gente de edades y
capacidades visuales distintas.

### Añadido
- Flujos de entrada como **asistentes por pasos**: crear sala (conectar
  cuentas → música → duración) y unirse (PIN → nombre → personaje).
  Componente compartido `WizardSteps`.
- **Sabotaje opcional**: el anfitrión decide si su partida lo incluye y qué
  tipos permite. Aplicado también en el store, no solo en la interfaz.
- **Bomba musical**: el aviso de sabotaje pasa a ser una secuencia de dos
  actos (mecha con cuenta atrás → detonación).
- **Punto extra por acertar primero**, ordenado por marca de tiempo de
  servidor para que sea justo entre móviles con relojes desviados.
- **Reconexión de Spotify siempre disponible** para el anfitrión durante la
  partida (`SpotifyReconnect`), con reparación suave y re-login completo.
- **Unirse a mitad de partida** con aprobación del anfitrión.
- Avisos de error en ventana emergente (`AlertDialog`) en vez de texto suelto.
- Validación real del PIN contra la base antes de avanzar de paso.

### Corregido
- **138 años de canciones erróneos** en el catálogo (Spotify devolvía la
  fecha del recopilatorio, no la del lanzamiento original). Auditoría con
  fuente citada en `catalog-imports/song-year-corrections-2026-08-24.json`.
- Tipografía de titulares que desbordaba la pantalla con la letra grande
  (patrón `clamp()` con mínimo en `rem`).
- El editor de perfil y el menú de tamaño de letra quedaban recortados por
  contenedores con `backdrop-filter` / `overflow`.
- Salir o cerrar sala llevaba al lobby con «Esperando al anfitrión».
- Controles anclados arriba inalcanzables bajo la muesca del móvil.
- Reintentos de sesión anónima de Firebase (fallos al conectar varios
  móviles a la vez desde la misma red).

### Cambiado
- Escala tipográfica base y sistema de tamaño de letra (normal / grande /
  muy grande) con etiquetas legibles.
- Política de caché: HTML y Service Worker sin cachear, `assets/*` inmutables.

---

## [0.3.0] — 2026-08-19 — «Un solo modo, identidad propia»

Simplificación del producto a una única mecánica y construcción de la
identidad visual de personajes.

### Añadido
- Sistema de **73 avatares de personaje** con pipeline WebP optimizado y
  vista ampliada antes de elegir.
- **Revancha**: volver a jugar con el mismo grupo y PIN.
- **Sabotaje con consecuencia real** sobre la ruta de años (bloqueo y robo
  de año), no solo efecto visual.
- Podio final celebratorio y ranking al salir.
- Control de tamaño de fuente conectado y accesible en todas las pantallas.

### Cambiado
- **Eliminados los modos Bingo Musical y Corte Maestro.** El producto queda
  con una sola mecánica: «Años Locos».

### Corregido
- Bloqueo del anfitrión que dejaba la partida sin salida (softlock).
- Guardado de avatar/nombre de perfil.
- Reconexiones de Spotify más robustas.

---

## [0.2.0] — 2026-07-02 — «Seguridad, legal y sostenibilidad»

Endurecimiento de la infraestructura y primera capa legal y de monetización.

### Añadido
- Sección **legal, privacidad y cookies** en el manual.
- Flujo de **donación voluntaria** (Bizum) y solicitud de playlist propia.
- Recuperación automática ante despliegues nuevos con pestañas antiguas.

### Seguridad
- Migración de REST crudo al **SDK de Firebase**.
- **Reglas de base de datos con autenticación obligatoria** (`auth != null`)
  y sesión anónima automática para invitados.

### Cambiado
- Manual reorganizado con una plantilla consistente por modo de juego.

---

## [0.1.0] — 2026-06-19 — «Primer juego jugable»

Primera versión funcional de extremo a extremo: crear sala, unirse,
escuchar, responder y ver resultados.

### Añadido
- Salas por **PIN de 4 dígitos** y unión por QR.
- Integración con **Spotify** (reproducción controlada por el anfitrión,
  diagnóstico de cuenta y dispositivo).
- Mecánica **Timeline / «Años Locos»** individual: cada jugador construye su
  propia ruta de años.
- **Catálogo propio de canciones** extraído con herramienta a medida
  (`tools/`), en vez de depender de llamadas en vivo.
- Revelación de resultados controlada por el anfitrión.
- Manual de juego y flujo de incorporación.
- Despliegue continuo en Vercel.

---

## Convenciones de versionado

| Tramo | Significado |
|---|---|
| `0.x.0` | Iteración de producto en desarrollo. Puede romper compatibilidad. |
| `0.x.y` | Correcciones sobre una iteración publicada. |
| `1.0.0-beta.n` | Beta cerrada con grupos reales. Funcionalidad congelada. |
| `1.0.0` | Versión comercial. Requiere resolver la base musical (ver ADR-0002). |

Cada versión se marca con una **etiqueta anotada de git** que incluye fecha y
autor, y se publica como *release* en GitHub para dejar constancia con sello
de tiempo de un tercero. Ver [trazabilidad](docs/06-trazabilidad.md).

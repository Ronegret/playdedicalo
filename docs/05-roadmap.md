# Roadmap — Dedícalo Play

- **Última revisión:** 30 de agosto de 2026
- **Versión actual:** v0.4.0

---

## Línea de evolución

```
v0.1.0  ✅  2026-06-19   Primer juego jugable
   ↓
v0.2.0  ✅  2026-07-02   Seguridad, legal y sostenibilidad
   ↓
v0.3.0  ✅  2026-08-19   Un solo modo, identidad propia
   ↓
v0.4.0  ✅  2026-08-30   Usabilidad y accesibilidad
   ↓
v0.5.0  ⬜               Base musical resuelta        ← BLOQUEANTE
   ↓
Beta    ⬜               Pruebas cerradas con grupos reales
   ↓
v1.0.0  ⬜               Versión comercial
```

---

## v0.5.0 — Base musical resuelta 🔴 BLOQUEANTE

**Nada de lo que viene después tiene sentido sin esto.** La política de
desarrolladores de Spotify prohíbe expresamente crear juegos de trivia, y
prohíbe monetizar aplicaciones que reproduzcan su música. El plan de cobrar a
los anfitriones es incompatible con la base actual.

Ver [ADR-0002](decisiones/0002-dependencia-de-spotify.md) para el análisis
completo.

### Tareas
- [x] **Prueba de cobertura**: `npm run cobertura`. Muestra estratificada
      por playlist contra la API pública de iTunes. Resultado en
      `docs/evidencias/cobertura-previews-*.txt`
- [ ] Escribir a Spotify pidiendo respuesta por escrito sobre una vía de
      acuerdo comercial
- [ ] Revisar el estado real de la app en el Developer Dashboard de Spotify
      (modo, número de usuarios, si está *grandfathered*)
- [ ] Analizar el modelo legal de WhatTheHit (competidor directo sin Spotify)
- [ ] Decidir arquitectura definitiva de audio
- [ ] Consulta con abogado de propiedad intelectual digital

**Puerta de decisión:** si la cobertura de previews baja del 85%, hay que
replantear el catálogo o el modelo entero.

---

## Beta — Pruebas cerradas

Funcionalidad congelada. Solo correcciones.

- [ ] Partidas reales con al menos 5 grupos distintos
- [ ] Recogida estructurada de incidencias
- [ ] Validar el balance con datos reales (ver «puntos abiertos» del
      [GDD](02-gdd.md#9-balance-puntos-abiertos))
- [ ] Rendimiento con 20+ jugadores simultáneos
- [ ] Pruebas en Android e iOS reales, no solo emulados
- [ ] Tests automatizados de la lógica de juego

---

## v1.0.0 — Comercial

- [ ] Base musical legalmente sólida para uso comercial
- [ ] Sistema de cobro al anfitrión
- [ ] Términos y condiciones y política de privacidad revisados por abogado
- [ ] Manual de marca y activos vectoriales
- [ ] Soporte y canal de incidencias
- [ ] Analítica de producto (con consentimiento)

---

## Ideas sin comprometer

No planificadas, anotadas para no perderlas:

- Modos de juego adicionales (existieron Bingo y Corte Maestro; se
  eliminaron, pero el aprendizaje está)
- ~~Partidas en remoto~~ → investigado, ver [ADR-0004](decisiones/0004-modo-online.md):
  sale casi gratis si se resuelve la base musical por la vía de previews
- Estadísticas por jugador entre partidas
- Playlists personalizadas del anfitrión (hoy es un flujo manual por donación)
- Versión física complementaria (cartas), que además esquivaría la
  prohibición de monetizar el streaming

---

## Deuda técnica conocida

| Asunto | Prioridad |
|---|---|
| Sin tests automatizados | Alta (antes de Beta) |
| Bundle principal >600 kB sin code-splitting | Media |
| Campos muertos en el catálogo (`question_*`) de modos eliminados | Baja |
| Solo PNG del logo, falta vectorial | Media (antes de v1.0) |

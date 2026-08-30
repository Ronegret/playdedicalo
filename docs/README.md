# Documentación — Dedícalo Play

Centro de documentación del proyecto. Todo lo que no es código vive aquí,
versionado junto al código para que cada documento quede fechado y atribuido
por git.

## Índice

| Documento | Qué contiene | Para quién |
|---|---|---|
| [01 · Concepto](01-concepto.md) | Qué es el juego, para quién, por qué existe | Cualquiera que llegue nuevo |
| [02 · Game Design Document](02-gdd.md) | Mecánicas, reglas, economía, balance | Diseño y desarrollo |
| [03 · Arquitectura](03-arquitectura.md) | Stack, estructura, flujos de datos | Desarrollo |
| [04 · Marca](04-marca.md) | Identidad, paleta, tipografía, uso del logo | Diseño y comunicación |
| [05 · Roadmap](05-roadmap.md) | Hacia dónde va, hitos hasta la v1.0 | Producto |
| [06 · Trazabilidad](06-trazabilidad.md) | Cómo se prueba la autoría y la evolución | Legal / futuro |
| [Decisiones (ADR)](decisiones/) | Decisiones importantes y por qué se tomaron | Todos |
| [Evidencias](evidencias/) | Capturas, vídeos, manifiestos fechados | Legal / futuro |

## Cómo se mantiene

- **El historial de versiones** vive en [`CHANGELOG.md`](../CHANGELOG.md), en
  la raíz. Se actualiza al cerrar cada versión, no commit a commit.
- **Las decisiones que cambian el rumbo** se registran como ADR en
  [`decisiones/`](decisiones/). Una decisión por archivo, numerada y fechada.
  No se editan retroactivamente: si una decisión se revierte, se escribe una
  nueva que sustituye a la anterior.
- **Las evidencias visuales** (capturas, vídeos) van a
  [`evidencias/`](evidencias/) con fecha en el nombre.

## Principio

> Documentar lo que fue verdad, cuando fue verdad.

Estos documentos describen el estado **real** del proyecto, incluyendo lo que
no funciona y los riesgos abiertos. Un documento que solo cuenta la parte
bonita no sirve ni para retomar el trabajo dentro de seis meses, ni como
prueba de nada.

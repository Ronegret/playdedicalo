# Evidencias

Material fechado que documenta el estado real del producto en cada momento.

## Manifiestos

Generados con `npm run evidencia`. Cada uno contiene el hash SHA-256 de todos
los archivos del proyecto, el commit exacto, la fecha y un **hash global**.

Ese hash global identifica de forma única el estado completo del proyecto.
Sellándolo con [OpenTimestamps](https://opentimestamps.org) (gratis) queda
demostrado que ese contenido existía antes de esa fecha, **sin necesidad de
publicar el código**:

```bash
ots stamp docs/evidencias/manifiesto-v0.4.0-2026-08-30.txt
ots verify docs/evidencias/manifiesto-v0.4.0-2026-08-30.txt.ots
```

Los archivos `.ots` resultantes **sí se versionan** junto al manifiesto.

## Capturas

En `capturas/`, nombradas con fecha y contexto:

```
2026-08-30-partida-resultado-ronda.png
2026-08-30-sabotaje-bomba-musical.png
```

Conviene capturar, al cerrar cada versión:
- Pantalla de inicio y selección de rol
- Crear sala (los 3 pasos)
- Unirse (los 3 pasos)
- Lobby con PIN y jugadores
- Partida: escucha y respuesta
- Sabotaje: mecha y detonación
- Resultado de ronda y podio final

## Vídeos

Un recorrido de 1-2 minutos por partida real es la evidencia más elocuente de
que el producto funciona. Nombrar igual: `2026-08-30-partida-completa.mp4`.

> Los vídeos pesan. Si crecen demasiado para el repositorio, guardarlos fuera
> y dejar aquí un archivo de texto con su hash SHA-256 y su fecha — el hash
> sigue probando el contenido aunque el archivo viva en otro sitio.

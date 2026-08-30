# Arquitectura — Dedícalo Play

- **Versión del documento:** correspondiente a v0.4.0
- **Última revisión:** 30 de agosto de 2026

---

## 1. Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Interfaz | **React 19 + Vite** | Web, sin instalación para el invitado |
| Estado | **Zustand** | Store único, sin ceremonia de Redux |
| Estilos | **TailwindCSS** | Sistema de escala en `rem` para accesibilidad |
| Animación | **Framer Motion** | Transiciones y efectos del juego |
| Tiempo real | **Firebase Realtime Database** | Sincronía de sala entre móviles |
| Identidad | **Firebase Auth** | Google (anfitrión) + anónimo (invitados) |
| Música | **Spotify Web Playback SDK** | Reproducción en el navegador del anfitrión |
| QR | **jsQR** | Escaneo por cámara, sin servicio externo |
| Hosting | **Vercel** | Despliegue continuo desde `main` |

Dominio de producción: **play.dedicalo.es**

## 2. Modelo de datos (Realtime Database)

```
rooms/{pin}                     ← pin = 4 dígitos
  phase           lobby | countdown | listen | blackout | result | final
  round           número de ronda
  settings
    gameMode      'timeline'
    targetYears   6..20
    sabotageEnabled
    sabotageTypes []
  players/{playerId}
    id, name, avatar, authUid, email
    points, isHost
    status        online | offline | kicked
    lastSeenAt, offlineSince
    timelineBaseYear      año semilla
    timelineYears []      años acertados
    wildcards             canciones compradas con puntos
    activeAttack  { type, round, from, fromAvatar, attackerId }
  roundAnswers/{playerId}
    isCorrect, timelineSlot, round
    at            reloj del cliente (informativo)
    serverAt      marca del SERVIDOR (la que decide el bonus)
  revealResults/{playerId}
    resultType, delta, points, speedBonus, speedWinnerName, ...
  audio           { isPlaying, isMuted, playlistUrl }
  joinRequests/{playerId}       peticiones de entrada a mitad de partida

users/{uid}                     perfil persistente entre partidas
```

## 3. Estructura del código

```
src/
  pages/          Una pantalla por archivo, mapeadas a rutas
  components/     Piezas reutilizables entre pantallas
  store/          useGameStore.js — TODA la lógica de juego y red
  services/       spotify.js — token, reproductor, catálogo
  data/           characterAvatars.js
  hooks/          useBgMusic, useFontScale
  config/         support.js (donaciones)
```

**`useGameStore.js` es el corazón del sistema.** Contiene el estado, las
acciones y la suscripción en tiempo real. Cualquier regla de juego vive ahí,
nunca en las pantallas — las pantallas solo pintan y llaman acciones.

### Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Bienvenida |
| `/how-to-play` | Manual |
| `/role-selection` | Elegir anfitrión o invitado |
| `/host/sync` | Crear sala (asistente de 3 pasos) |
| `/guest/join` | Unirse (asistente de 3 pasos) |
| `/lobby` | Sala de espera + PIN + ajustes |
| `/game` | Partida |
| `/game/result` | Resultado de ronda y podio final |
| `/spotify/callback` | Retorno del login de Spotify |

## 4. Flujo de una partida

```
ANFITRIÓN                          FIREBASE                    INVITADOS
   │                                  │                            │
   ├─ crea sala ────────────────────► rooms/{pin}                  │
   │                                  │ ◄──────── se unen con PIN ─┤
   ├─ inicia ronda ─────────────────► phase: countdown ──────────► │
   ├─ Spotify reproduce               │                            │
   ├─ corta música ─────────────────► phase: blackout ───────────► │
   │                                  │ ◄──── roundAnswers ────────┤
   ├─ revela ───────────────────────► revealResults ─────────────► │
   │                                  │                            │
```

Todos los clientes escuchan `rooms/{pin}` con `onValue`. **El anfitrión es la
única autoridad** que escribe fases y resultados; los invitados solo escriben
su propia respuesta y su presencia.

## 5. Decisiones de arquitectura que conviene conocer

### Catálogo local, no llamadas en vivo
Las canciones viven en `public/data/dedicalo-song-catalog.full.clean.json`
(2.932 temas). Se consulta en local y solo se pide a Spotify **reproducir**
una pista concreta. Reduce dependencia de la API y elimina latencia.

El único campo que la app lee de cada canción es `release_year`. El resto
(`question_*`, `difficulty`) son restos de modos eliminados.

### `position: fixed` y contenedores trampa
Varios headers usan `backdrop-blur`. **Un ancestro con `backdrop-filter` o
`transform` se convierte en el bloque contenedor de sus hijos
`position: fixed`**, que entonces se recortan a la caja del header en vez de
cubrir la pantalla.

> **Regla:** cualquier overlay a pantalla completa lanzado desde un componente
> montado en un header o dentro de un contenedor animado **debe ir en un
> portal a `document.body`**. Ya aplicado en `ProfileMenu`, `AvatarPicker`,
> `AlertDialog`, `FontSizeControl` y `SpotifyReconnect`.

### Tipografía y accesibilidad
Escala de letra en tres niveles sobre `font-size` de la raíz, así todo el
layout en `rem` crece proporcionalmente.

> **Regla:** texto **decorativo/titular** acotado por viewport
> (`min(max(...))`); texto **funcional** (cuerpo, botones, etiquetas) en `rem`
> puro para que escale del todo. Usar `clamp()` con el mínimo en `rem`
> desborda la pantalla con la letra grande.

### Presencia
Cada reconexión de socket pierde el handler `onDisconnect` anterior, así que
hay que **rearmarlo** en cada reconexión (`armPresenceDisconnect`).

### Caché y despliegues
`index.html`, `sw.js` y `manifest.json` no se cachean nunca; `assets/*` sí,
de forma inmutable (Vite les pone hash). Al cambiar la lógica del Service
Worker hay que **subir su número de versión** o el navegador no lo detecta.

## 6. Riesgos técnicos abiertos

| Riesgo | Impacto | Ver |
|---|---|---|
| Dependencia de Spotify: su política prohíbe juegos de trivia | **Alto** — puede cortar el servicio | [ADR-0002](decisiones/0002-dependencia-de-spotify.md) |
| Modo desarrollo de Spotify limitado a 5 usuarios | Alto — techo de anfitriones | [ADR-0002](decisiones/0002-dependencia-de-spotify.md) |
| Bundle principal >600 kB | Bajo — arranque lento en red mala | Pendiente code-splitting |
| Sin tests automatizados | Medio — se verifica con Playwright manual | Pendiente |

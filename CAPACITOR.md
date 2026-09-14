# Empaquetar Dedícalo como app nativa

El lado JavaScript ya está hecho y verificado. Lo que falta necesita Android
Studio o Xcode, que no había en la máquina donde se preparó esto.

## Por qué

Tres cosas que en iPhone **no tienen arreglo posible desde la web**:

| | PWA en iPhone | Capacitor |
|---|---|---|
| Vibración | No existe. Safari nunca implementó `navigator.vibrate` | Taptic Engine nativo |
| Datos guardados | Safari los **borra a los 7 días** sin usar la app | Persistentes |
| Interruptor de silencio | Parcheado vía Web Audio | Categoría de audio nativa |

Para un juego que se usa cada varias semanas, la purga de 7 días significa que
**cada partida es como la primera vez**: sin perfil, sin avatar, sin ajustes.

## Lo que ya está hecho

- `capacitor.config.json` con el `appId` (`es.dedicalo.play`), los colores de
  marca y el splash configurado para no ocultarse solo.
- Plugins instalados: `haptics`, `splash-screen`, `status-bar`.
- `src/services/haptics.js` ya usa el puente nativo. Lo carga con `import()`
  dinámico, así que **el bundle web no engorda**: el plugin queda en un chunk
  de 1,2 KB que en navegador no se descarga nunca.

## Lo que falta (en tu máquina)

```bash
npm run build
npx cap add android          # necesita Android Studio + JDK 17
npx cap sync
npx cap open android
```

Para iOS hace falta un Mac con Xcode:

```bash
npx cap add ios && npx cap sync && npx cap open ios
```

**Repite `npm run build && npx cap sync` en cada cambio del web**, o la app
nativa se queda con la versión anterior empaquetada dentro.

## Importante: la web sigue viva

El objetivo no es sustituir la web, es complementarla:

```
Anfitrión  ->  app instalada (audio sólido, háptica, datos que duran)
Invitados  ->  web por QR, sin instalar nada
```

La ventaja de Dedícalo es que se entra escaneando un código. Eso no se toca.
Lo que se quita de encima es a quien juega todas las semanas.

## Precedente

`tv-android/` ya empaqueta la app en un WebView para la televisión y produce
`public/tv.apk`. El camino está validado; Capacitor solo lo hace bien y con
acceso a las APIs nativas.

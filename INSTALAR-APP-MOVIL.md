# Convertir Dedícalo en app de móvil — guía sin tecnicismos

Esta guía asume que no has hecho esto nunca. Todo lo que hay que instalar es
gratis y legal, y no se toca nada del juego: la web sigue funcionando igual.

---

## Qué estamos haciendo y por qué

Hoy Dedícalo es una web. Funciona muy bien, y **los invitados van a seguir
entrando por QR sin instalar nada**. Eso no cambia.

Lo que añadimos es una **app de verdad para el anfitrión** — quien organiza la
partida, que es quien juega todas las semanas. Con eso gana tres cosas que una
web **no puede dar en iPhone, por mucho que se programe**:

| | Web en iPhone | App instalada |
|---|---|---|
| **Vibración** | No existe. Safari nunca la implementó | Sí |
| **Tu perfil y avatar** | Safari los **borra a los 7 días** sin abrir la app | Se quedan |
| **Interruptor de silencio** | Puede dejar la sala muda | La música suena igual |

Lo del silencio es el importante: si llevas el móvil en silencio (casi todo el
mundo), una web puede quedarse sin sonido. En una app no.

---

## Qué se instala

Dos programas. **Se instalan una vez y no se vuelven a tocar.**

### 1. Java (JDK 17)

Es el motor que compila las apps de Android. No se abre nunca, trabaja por
debajo.

- Descarga: https://learn.microsoft.com/java/openjdk/download
- O en la terminal: `winget install Microsoft.OpenJDK.17`

### 2. Android Studio

El programa de Google para crear apps de Android. Lo vas a usar sobre todo
para un botón: "generar la app firmada" cuando quieras subirla a Google Play.

- Descarga: https://developer.android.com/studio
- O en la terminal: `winget install Google.AndroidStudio`

Pesa bastante (~1 GB el instalador, y luego se descarga el SDK). Es normal.

### Si quieres también la app de iPhone

Necesitas **un Mac con Xcode**. No hay forma de hacer apps de iPhone desde
Windows — es una limitación de Apple, no nuestra. Y para publicarla en la App
Store hace falta la cuenta de desarrollador de Apple, que son **99 $ al año**.

Google Play es un pago **único de 25 $**.

Mi consejo: empieza por Android, que es donde está la mayoría del público de
un juego de fiesta en España, y mira lo de iPhone cuando veas que la gente lo
usa.

---

## La primera vez que abras Android Studio

Te saldrá un asistente. **Acepta todo lo que te proponga por defecto** y deja
que descargue lo que pida (es el SDK de Android, unos 2 GB). Tarda un rato.

Cuando termine, cierra Android Studio. Ya está configurado.

---

## Generar la app

En la terminal, dentro de la carpeta `dedicalo-app`:

```bash
npm run build          # prepara la web
npx cap add android    # crea el proyecto Android (SOLO la primera vez)
npx cap sync           # mete la web dentro de la app
npx cap open android   # abre Android Studio con el proyecto
```

Ya en Android Studio, arriba del todo: **Build → Build Bundle(s) / APK(s) →
Build APK(s)**. Te deja un archivo `.apk` que puedes instalar en tu móvil para
probar.

### ⚠️ Lo único que hay que recordar

**Cada vez que cambies algo del juego:**

```bash
npm run build && npx cap sync
```

Si te saltas eso, la app se queda con la versión anterior metida dentro y no
entiendes por qué no ves tus cambios. Es el error número uno de todo el mundo
al empezar.

---

## Subirlo a Google Play

Cuando lo tengas probado:

1. Crea la cuenta de desarrollador: https://play.google.com/console (25 $, pago único)
2. En Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**
3. Te pedirá crear una "clave de firma" (*keystore*). **Guárdala y guarda su
   contraseña en sitio seguro**: si la pierdes, no puedes volver a actualizar
   esa app nunca. Se sube una copia a tu gestor de contraseñas y se acabó.
4. Sube el archivo `.aab` que sale, rellena la ficha y envía a revisión.

Google tarda unos días en revisar la primera versión.

Para la ficha te van a pedir una **política de privacidad accesible por URL**:
ya la tienes en `play.dedicalo.es/legal/privacidad`. Pero antes **rellena tus
datos en `src/config/legal.js`**, que ahora mismo pone "PENDIENTE".

---

## Lo que ya está hecho

No tienes que tocar nada de esto, solo saber que existe:

- `capacitor.config.json` — nombre de la app, identificador
  (`es.dedicalo.play`), colores y pantalla de arranque.
- Los plugins de vibración, splash y barra de estado, ya instalados.
- `src/services/haptics.js` ya está preparado: **en cuanto la app sea nativa,
  la vibración empieza a funcionar en todas las pantallas sin tocar una línea**.
  Y en la web no pesa nada, porque el plugin se carga aparte.

Detalles técnicos en `CAPACITOR.md`.

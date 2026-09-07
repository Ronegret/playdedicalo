# Instalar Dedícalo Play en la televisión

## Con Downloader (lo más sencillo)

1. Abre **Downloader** en el televisor.
2. En el campo de la dirección escribe exactamente:

   ```
   play.dedicalo.es/tv.apk
   ```

3. Pulsa **Go**. Se descarga y la propia tele ofrece instalarlo.
4. La primera vez pedirá permiso para **instalar desde orígenes
   desconocidos**: acéptalo.
5. Al terminar puedes **borrar el archivo descargado**; la app ya está
   instalada y aparece en el menú del televisor.

Downloader guarda la dirección en favoritos: solo se teclea una vez.

## Por qué no se descarga desde GitHub

El repositorio es privado, así que GitHub pide identificarse para bajar los
archivos de una release y Downloader no puede hacerlo. Además la dirección
son 84 caracteres, imposibles de teclear con un mando. Sirviéndolo desde el
propio dominio son 23 y no hace falta cuenta de nada.

## Qué hace la aplicación

Abre la pantalla de televisión del juego a pantalla completa. La tele **no se
toca**: el mando son los móviles de quienes juegan, que entran con el PIN o el
QR que se ven siempre en el lateral de la pantalla.

## Se actualiza sola

La app carga la web, así que al publicar cambios los ven todas las teles sin
reinstalar nada. Solo hace falta un APK nuevo si cambia la propia carcasa de
Android (permisos, icono, comportamiento del mando).

## Generar un APK nuevo

En GitHub, pestaña **Actions** → **APK de televisión** → *Run workflow*.
Compila y publica el archivo. Luego se copia a `public/tv.apk` y se despliega,
que es lo que deja la dirección corta funcionando.

Se compila allí y no en local porque hacerlo aquí exige el JDK y el SDK de
Android: unos 3 GB.

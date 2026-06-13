# Dedicalo Play

Juego musical React + Vite con salas por PIN, Firebase Realtime Database, Google Sign-In para anfitriones y playlists publicas de Spotify.

## Desarrollo

```bash
npm install
npm run dev
```

## Validacion

```bash
npm run lint
npm run build
```

## Publicar en Vercel con `play.dedicalo.es`

1. Sube este proyecto a GitHub o importa la carpeta `dedicalo-app` en Vercel.
2. En Vercel usa:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
3. En el proyecto de Vercel, anade el dominio `play.dedicalo.es`.
4. En Hostinger, abre la zona DNS de `dedicalo.es` y cambia `play.dedicalo.es` para que apunte a Vercel:
   - Borra los registros `A` actuales del host `play` si apuntan a Hostinger.
   - Crea un registro:
     - Tipo: `A`
     - Nombre/Host: `play`
     - Valor/Destino: `76.76.21.21`
5. En Firebase Console, anade `play.dedicalo.es` como dominio autorizado en Authentication > Settings > Authorized domains.

`vercel.json` ya esta configurado para que las rutas internas del juego funcionen al recargar.

## Publicar en Firebase Hosting

Si prefieres Firebase Hosting:

```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting,database
```

Despues, en Firebase Hosting > Add custom domain, anade `play.dedicalo.es` y copia los registros DNS que Firebase indique en Hostinger.

## Spotify

La app usa enlaces publicos de playlists de Spotify. No necesita `client_secret` en el frontend. Si mas adelante se integra la API real de Spotify, el secreto debe ir en una funcion serverless o backend, nunca en variables `VITE_*`.

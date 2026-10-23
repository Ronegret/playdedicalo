import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Las librerías van en trozos aparte del código de la app. Cambian
        // una vez cada muchos despliegues; el código propio, en cada uno. Así
        // quien vuelve tras una actualización solo descarga lo que cambió y
        // no otra vez ~170 kB comprimidos de React y Firebase. Los tres ya
        // se cargaban enteros al arrancar: separarlos no añade bytes a la
        // primera visita, y se descargan en paralelo.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 3 },
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase|idb)[\\/]/, priority: 2 },
            { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
})

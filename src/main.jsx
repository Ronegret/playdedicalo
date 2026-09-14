import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
// Aplica la preferencia de tamaño de letra guardada antes de pintar nada.
import './hooks/useFontScale.js'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Retira la pantalla de arranque que index.html pintó antes de que existiera
// React. Se espera al fotograma SIGUIENTE al primer pintado: quitarla en el
// mismo deja ver un parpadeo del fondo desnudo entre que se va una cosa y
// aparece la otra.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const arranque = document.getElementById('arranque');
    if (!arranque) return;
    arranque.classList.add('fuera');
    // Se elimina del árbol al acabar el fundido: dejarlo ahí mantendría viva
    // una capa de composición a pantalla completa durante toda la partida.
    setTimeout(() => arranque.remove(), 450);
  });
});


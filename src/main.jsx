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

// Avisa a la intro de index.html de que React ya ha pintado. Se espera al
// fotograma SIGUIENTE al primer pintado: quitarla en el mismo deja ver un
// parpadeo del fondo desnudo. La intro decide cuándo irse (index.html).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (window.__arranqueListo) window.__arranqueListo();
    else document.getElementById('arranque')?.remove();
  });
});

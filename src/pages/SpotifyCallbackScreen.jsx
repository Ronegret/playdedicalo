import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeSpotifyLogin } from '../services/spotify';

export default function SpotifyCallbackScreen() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Conectando Spotify...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      window.setTimeout(() => setMessage(`Spotify rechazó la conexión: ${error}`), 0);
      return;
    }

    if (!code) {
      window.setTimeout(() => setMessage('No llegó el código de Spotify. Vuelve a conectar.'), 0);
      return;
    }

    completeSpotifyLogin(code)
      .then(() => {
        setMessage('Spotify conectado.');
        window.setTimeout(() => navigate('/host/sync'), 900);
      })
      .catch((spotifyError) => {
        console.error(spotifyError);
        setMessage('No pudimos conectar Spotify. Vuelve atrás y toca Conectar otra vez.');
      });
  }, [navigate]);

  return (
    <main className="relative z-10 min-h-dvh flex items-center justify-center px-margin-mobile text-center">
      <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6">
        <span className="material-symbols-outlined text-neon-green text-5xl">music_note</span>
        <h1 className="mt-4 text-2xl font-black text-white">Spotify</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{message}</p>
      </section>
    </main>
  );
}

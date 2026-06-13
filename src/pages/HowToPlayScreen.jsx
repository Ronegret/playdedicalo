import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';

const STEPS = [
  {
    number: '1',
    title: 'El anfitrion crea la sala',
    text: 'Inicia sesion, elige la musica y comparte el PIN o QR. El anfitrion tambien juega y aparece en el ranking.'
  },
  {
    number: '2',
    title: 'Todos escuchan el corte',
    text: 'Suena una playlist de Dedicalo o una playlist publica de Spotify. No hay temporizador fijo: el anfitrion decide cuando cortar.'
  },
  {
    number: '3',
    title: 'Llega el blackout',
    text: 'La musica se corta y aparece una pregunta musical: letra, artista, titulo, momento o linea del ritmo.'
  },
  {
    number: '4',
    title: 'Llega a la meta',
    text: 'Gana quien llegue primero a 40, 70 o 100 puntos. La partida puede durar lo que el grupo quiera.'
  }
];

const MODES = [
  {
    name: 'Pulso Dedicalo',
    text: 'La experiencia base: todos escuchan el mismo fragmento, llega el corte y aparece una pregunta sencilla. Funciona con cualquier playlist y es la mejor para empezar.'
  },
  {
    name: 'Linea del Ritmo',
    text: 'El modo de memoria musical: hay que ubicar canciones, artistas o momentos por epoca. No busca que todos sepan fechas exactas, sino que discutan y apuesten por intuicion.'
  },
  {
    name: 'Remix Salvaje',
    text: 'El modo mas competitivo: las preguntas siguen siendo musicales, pero los sabotajes pesan mas. Es para grupos que quieren remontadas, riesgo y un final impredecible.'
  }
];

const GOALS = [
  { score: 40, name: 'Hit Express', text: 'Partida corta y facil de explicar.' },
  { score: 70, name: 'Fiesta Principal', text: 'La opcion equilibrada para grupos.' },
  { score: 100, name: 'Sesion Legendaria', text: 'Para noches largas y remontadas grandes.' }
];

export default function HowToPlayScreen() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="relative z-10 w-full max-w-[430px] mx-auto min-h-screen px-margin-mobile pt-20 pb-10"
    >
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-surface/85 backdrop-blur-xl border-b border-white/10 flex items-center px-margin-mobile">
        <button onClick={() => navigate('/')} className="text-on-surface-variant hover:text-white transition-colors flex items-center gap-2 font-label-caps text-xs">
          <span className="material-symbols-outlined text-sm">arrow_back</span> VOLVER
        </button>
      </header>

      <section className="text-left">
        <p className="font-label-caps text-neon-green text-xs tracking-widest">REGLAS RAPIDAS</p>
        <h1 className="mt-2 font-headline-lg text-4xl text-white font-black leading-tight">Como se juega Dedicalo</h1>
        <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
          Es una batalla social de musica para jugar con amigos: una persona crea la sala, todos entran con PIN y cada ronda mezcla memoria, reflejos y estrategia.
        </p>
      </section>

      <section className="mt-7 grid gap-3">
        {STEPS.map((step) => (
          <motion.article
            key={step.number}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Number(step.number) * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 flex gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-neon-green text-black font-stats-xl text-2xl flex items-center justify-center shrink-0">
              {step.number}
            </div>
            <div>
              <h2 className="font-headline-lg-mobile text-xl text-white leading-tight">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{step.text}</p>
            </div>
          </motion.article>
        ))}
      </section>

      <section className="mt-7 rounded-2xl border border-electric-purple/40 bg-electric-purple/10 p-5">
        <p className="font-label-caps text-electric-purple text-xs tracking-widest">ESTILOS DE JUEGO</p>
        <h2 className="mt-2 font-headline-lg-mobile text-2xl text-white">Elige el ambiente de la partida</h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          Todos los estilos usan musica, PIN, ranking y sabotajes. Lo que cambia es el tipo de pregunta y el nivel de estrategia.
        </p>
        <div className="mt-4 grid gap-3">
          {MODES.map((mode) => (
            <div key={mode.name} className="rounded-xl bg-black/15 border border-white/10 p-4">
              <h3 className="font-headline-lg-mobile text-xl text-white">{mode.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{mode.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-neon-green/40 bg-neon-green/10 p-5">
        <p className="font-label-caps text-neon-green text-xs tracking-widest">FORMAS DE GANAR</p>
        <h2 className="mt-2 font-headline-lg-mobile text-2xl text-white">Elige una meta clara</h2>
        <div className="mt-4 grid gap-3">
          {GOALS.map((goal) => (
            <div key={goal.score} className="rounded-xl bg-black/15 border border-white/10 p-4 flex items-center gap-4">
              <span className="font-stats-xl text-4xl text-neon-green">{goal.score}</span>
              <div>
                <h3 className="font-bold text-white">{goal.name}</h3>
                <p className="text-sm text-on-surface-variant">{goal.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="font-label-caps text-neon-green text-xs tracking-widest">SABOTAJES</p>
        <h2 className="mt-2 font-headline-lg-mobile text-2xl text-white">Puntos como arma</h2>
        <div className="mt-4 grid gap-2 text-sm text-on-surface-variant">
          <p><span className="font-bold text-intense-red">Silencio al lider:</span> el lider no suma si acierta la proxima vuelta.</p>
          <p><span className="font-bold text-electric-purple">Letra al reves:</span> la pregunta llega invertida para subir la presion.</p>
          <p><span className="font-bold text-neon-green">Dueto dividido:</span> si otro acierta, reparte puntos contigo.</p>
          <p><span className="font-bold text-electric-purple">Cambio de aguja:</span> fuerza una categoria sorpresa.</p>
        </div>
      </section>

      <div className="mt-8">
        <NeonButton primary={true} onClick={() => navigate('/role-selection')}>
          Elegir mi rol
        </NeonButton>
      </div>
    </motion.main>
  );
}

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import VinylVisualizer from '../components/VinylVisualizer';

const FLOW = [
  { icon: 'person_add', title: 'Crea sala', text: 'Host elige playlist y comparte PIN.' },
  { icon: 'graphic_eq', title: 'Escuchan', text: 'Todos oyen el mismo fragmento.' },
  { icon: 'bolt', title: 'Blackout', text: 'Se corta la música y aparece el reto.' },
  { icon: 'emoji_events', title: 'Ranking', text: 'Suben puntos hasta la meta.' }
];

const EXAMPLES = [
  { label: 'Pulso', question: '¿Qué palabra aparece?', answers: ['Noche', 'Corazón', 'Dedícalo'] },
  { label: 'Ritmo', question: 'Colócala en la línea', timeline: [1998, 2006, 2019] },
  { label: 'Remix', question: '¿Usas jugada?', answers: ['Bloquear', 'Robar', 'Guardar'] }
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

      <section className="text-center">
        <VinylVisualizer rotating={true} isHero={false} />
        <p className="mt-3 font-label-caps text-neon-green text-xs tracking-widest">GUÍA RÁPIDA</p>
        <h1 className="mt-2 font-headline-lg text-4xl text-white font-black leading-tight">Así se juega</h1>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          Música, corte sorpresa, respuesta rápida y ranking. Simple para entrar, divertido para repetir.
        </p>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3">
        {FLOW.map((step, index) => (
          <motion.article
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl border border-white/10 bg-white/5 p-4 min-h-32"
          >
            <span className="material-symbols-outlined text-neon-green text-3xl">{step.icon}</span>
            <h2 className="mt-3 text-white font-black leading-tight">{step.title}</h2>
            <p className="mt-1 text-xs text-on-surface-variant leading-snug">{step.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="mt-7 rounded-2xl border border-electric-purple/40 bg-electric-purple/10 p-4">
        <p className="font-label-caps text-electric-purple text-xs">EJEMPLOS VISUALES</p>
        <div className="mt-4 grid gap-3">
          {EXAMPLES.map((example) => (
            <article key={example.label} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-label-caps text-neon-green text-[10px]">{example.label}</span>
                <span className="material-symbols-outlined text-white/50 text-base">touch_app</span>
              </div>
              <h3 className="mt-2 text-white font-bold">{example.question}</h3>
              {example.timeline ? (
                <div className="mt-3 overflow-x-auto">
                  <div className="min-w-max flex items-center gap-2">
                    <span className="w-16 h-12 rounded-xl border border-dashed border-neon-green/50 bg-neon-green/10 text-neon-green flex items-center justify-center text-[10px] font-label-caps">Antes</span>
                    {example.timeline.map((year, index) => (
                      <div key={year} className="flex items-center gap-2">
                        <span className="w-16 h-14 rounded-xl border border-white/10 bg-white/5 text-white flex items-center justify-center font-black">{year}</span>
                        <span className="w-16 h-12 rounded-xl border border-dashed border-neon-green/50 bg-neon-green/10 text-neon-green flex items-center justify-center text-[10px] font-label-caps">
                          {index === example.timeline.length - 1 ? 'Después' : 'Entre'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {example.answers.map((answer, index) => (
                    <div key={answer} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-neon-green/15 text-neon-green text-xs font-black flex items-center justify-center">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-sm text-white">{answer}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-neon-green/40 bg-neon-green/10 p-4">
        <p className="font-label-caps text-neon-green text-xs">LÍNEA DEL RITMO</p>
        <h2 className="mt-2 text-white text-xl font-black">Ordena por años</h2>
        <div className="mt-4 flex items-center justify-between gap-2">
          {[1985, 1999, 2008, 2021].map((year) => (
            <div key={year} className="flex-1 rounded-xl border border-white/10 bg-black/20 py-3 text-center">
              <span className="text-neon-green font-black">{year}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">Solo años. Sin meses. La idea viene de juegos tipo timeline musical: colocar antes, después o entre años.</p>
      </section>

      <section className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="font-label-caps text-on-surface-variant text-xs">META</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[40, 70, 100].map((score) => (
            <div key={score} className="rounded-xl bg-black/20 border border-white/10 p-3 text-center">
              <span className="block text-2xl text-neon-green font-black">{score}</span>
              <span className="text-[10px] text-on-surface-variant">puntos</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">Gana quien llegue primero a la meta elegida y aparezca #1 en el ranking.</p>
      </section>

      <div className="mt-8">
        <NeonButton primary={true} onClick={() => navigate('/role-selection')}>
          Elegir mi rol
        </NeonButton>
      </div>
    </motion.main>
  );
}

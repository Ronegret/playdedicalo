import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBgMusic } from '../hooks/useBgMusic';
import FontSizeControl from '../components/FontSizeControl';

function MiniVinyl({ active = false, color = '#ff7a1a', icon = 'play_arrow' }) {
  return (
    <div className="relative h-20 w-20 shrink-0">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: active ? 3.8 : 7, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-white/10 bg-[repeating-radial-gradient(circle,#05070c_0_4px,#182235_5px_6px,#05070c_7px_10px)] shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent_0_30deg,rgba(255,255,255,0.13)_30deg_36deg,transparent_36deg_170deg,rgba(255,255,255,0.08)_170deg_176deg,transparent_176deg_360deg)]" />
        <div
          className="absolute inset-[28%] rounded-full border-2 border-black/50"
          style={{ backgroundColor: color }}
        />
        <div className="absolute inset-[45%] rounded-full bg-black" />
      </motion.div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="material-symbols-outlined relative z-10 text-black" style={{ fontSize: 22 }}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function Equalizer({ color = '#ff7a1a' }) {
  return (
    <div className="flex h-8 items-end justify-center gap-1" aria-hidden="true">
      {[0.35, 0.72, 0.5, 0.92, 0.42, 0.68, 0.55].map((height, index) => (
        <span
          key={index}
          className="eq-bar w-1.5 rounded-full"
          style={{
            height: `${height * 100}%`,
            backgroundColor: color,
            animationDelay: `${index * 0.08}s`,
            animationDuration: `${0.85 + index * 0.04}s`
          }}
        />
      ))}
    </div>
  );
}

function AlbumTrackHero({ paused, onToggle }) {
  const bars = [0.35, 0.72, 0.48, 0.92, 0.58, 0.82, 0.42, 0.68, 0.52];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      className="relative w-full max-w-[320px] sm:max-w-[360px]"
      aria-label="Logo Dedícalo"
    >
      <div className="absolute -inset-6 rounded-full bg-vinyl-orange/20 blur-3xl" />
      <div className="absolute -left-8 top-12 h-20 w-20 rounded-full border border-vinyl-orange/25 ring-expand-anim" />
      <div className="absolute -right-6 bottom-8 h-16 w-16 rounded-full border border-electric-purple/25 ring-expand-anim" style={{ animationDelay: '0.8s' }} />

      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#071025]/90 p-3.5 shadow-[0_20px_56px_rgba(0,0,0,0.34),0_0_34px_rgba(255,122,26,0.16)] sm:rounded-[2rem] sm:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.26),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(63,120,255,0.24),transparent_38%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vinyl-orange/80 to-transparent" />

        <div className="relative grid grid-cols-[92px_1fr] items-center gap-3 sm:grid-cols-[112px_1fr] sm:gap-4">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 4.4, ease: 'easeInOut' }}
            className="relative aspect-square overflow-hidden rounded-3xl border border-white/12 bg-white p-2 shadow-[0_0_0_5px_rgba(0,0,0,0.35),0_0_35px_rgba(255,122,26,0.34)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,26,0.10),transparent_45%)]" />
            <img
              src="/images/logo-main.png"
              alt="Dedícalo"
              className="relative h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.28)]"
              draggable={false}
            />
          </motion.div>

          <div className="relative min-w-0 text-left">
            <p className="font-label-caps text-[10px] tracking-[0.24em] text-neon-green">NOW PLAYING</p>
            <h2 className="mt-1 text-xl font-black uppercase leading-none text-white sm:text-2xl">Dedícalo Play</h2>
            <p className="mt-1 text-xs leading-snug text-on-surface-variant">Party game musical</p>

            <div className="mt-4 flex items-center gap-3">
              <motion.button
                type="button"
                onClick={onToggle}
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vinyl-orange text-black shadow-[0_8px_0_rgba(83,28,0,0.85),0_0_22px_rgba(255,122,26,0.45)] active:translate-y-1 active:shadow-[0_4px_0_rgba(83,28,0,0.85),0_0_18px_rgba(255,122,26,0.38)] transition-all"
                aria-label={paused ? 'Reproducir canción de Dedícalo' : 'Pausar canción de Dedícalo'}
              >
                <span className="material-symbols-outlined text-2xl">{paused ? 'play_arrow' : 'pause'}</span>
              </motion.button>
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    animate={paused ? { width: '18%' } : { width: ['18%', '78%', '18%'] }}
                    transition={paused ? { duration: 0.2 } : { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-vinyl-orange via-electric-purple to-deep-blue"
                  />
                </div>
                <div className="mt-1 flex justify-between font-label-caps text-[8px] tracking-[0.14em] text-white/35">
                  <span>00:07</span>
                  <span>03:33</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-end justify-center gap-1.5 sm:mt-5">
          {bars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="eq-bar w-2 rounded-full"
              style={{
                height: `${18 + height * 34}px`,
                background: index % 3 === 0 ? '#ff7a1a' : index % 3 === 1 ? '#a855f7' : '#3f78ff',
                animationDelay: `${index * 0.07}s`,
                animationDuration: paused ? '0s' : `${0.7 + index * 0.04}s`,
                opacity: paused ? 0.32 : 1,
                boxShadow: '0 0 16px rgba(255,122,26,0.22)'
              }}
            />
          ))}
        </div>

        <div className="relative mt-3 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_12px_rgba(57,255,20,0.8)]" />
          <p className="font-label-caps text-[10px] tracking-[0.24em] text-white/60">
            {paused ? 'TOCA PLAY PARA ESCUCHAR' : 'SONANDO · TOCA PARA PAUSAR'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function RoleCard({ type, title, text, action, icon, color, glow, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.015, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="group relative w-full overflow-hidden rounded-[1.4rem] border border-white/10 bg-surface-container/72 p-4 text-left shadow-[0_20px_54px_rgba(0,0,0,0.20)] backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vinyl-orange/70 sm:rounded-[2rem] sm:p-5"
      style={{ boxShadow: `0 0 0 1px ${color}22, 0 24px 70px ${glow}` }}
    >
      <div
        className="absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-70"
        style={{ backgroundColor: `${color}28` }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />

      <div className="relative flex items-center gap-4">
        <MiniVinyl active color={color} icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="font-label-caps text-[10px] tracking-[0.24em]" style={{ color }}>
            {type}
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {text}
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
        <Equalizer color={color} />
        <span className="flex items-center gap-2 font-label-caps text-xs tracking-[0.18em] text-white">
          {action}
          <span className="material-symbols-outlined text-base" style={{ color }}>arrow_forward</span>
        </span>
      </div>
    </motion.button>
  );
}

export default function RoleSelectionScreen() {
  const navigate = useNavigate();
  const { paused: bgPaused, toggle: toggleBg } = useBgMusic();

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="app-screen safe-bottom-action relative z-10 mx-auto flex w-full max-w-[460px] flex-col items-center overflow-y-auto pt-safe-header text-center"
    >
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/8 bg-background/78 px-margin-mobile backdrop-blur-xl">
        <button
          onClick={() => navigate('/')}
          className="min-h-touch flex items-center gap-2 font-label-caps text-xs tracking-[0.18em] text-on-surface-variant transition-colors hover:text-white"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          VOLVER
        </button>
        <FontSizeControl />
      </header>

      <section className="mb-5 flex w-full flex-col items-center gap-2 sm:mb-7">
        <p className="font-label-caps text-xs tracking-[0.28em] text-neon-green">ELIGE CÓMO ENTRAS</p>
        <h1 className="heading-page mt-1 font-headline-lg font-black uppercase text-on-surface">
          A jugar
        </h1>
        <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-on-surface-variant">
          Todos participan. El anfitrión pone la música, comparte la sala y también suma puntos.
        </p>
      </section>

      {/* La mayoría de las personas que abren esto van a unirse a una sala
          ya creada por otro, no a crear una — "Unirme" va primero. */}
      <section className="flex w-full flex-col gap-4">
        <RoleCard
          type="INVITADO"
          title="Unirme"
          text="Escribe el PIN o escanea el QR. Entras directo a la partida."
          action="ENTRAR"
          icon="groups"
          color="#3f78ff"
          glow="rgba(63,120,255,0.14)"
          onClick={() => navigate('/guest/join')}
        />

        <RoleCard
          type="ANFITRIÓN"
          title="Crear sala"
          text="Conecta Google, elige playlist y muestra el PIN para que entren tus amigos."
          action="CREAR"
          icon="headphones"
          color="#ff7a1a"
          glow="rgba(255,122,26,0.16)"
          onClick={() => navigate('/host/sync')}
        />
      </section>

      {/* La vista previa de la canción es lo menos urgente de la pantalla
          — va al final, debajo de los dos botones de entrada. */}
      <section className="mt-6 flex w-full flex-col items-center sm:mt-8">
        <AlbumTrackHero paused={bgPaused} onToggle={toggleBg} />
      </section>
    </motion.main>
  );
}

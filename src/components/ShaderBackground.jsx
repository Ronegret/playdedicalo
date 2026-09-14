const EQ_HEIGHTS = [0.3, 0.5, 0.7, 0.45, 0.8, 0.35, 0.6, 0.9, 0.4, 0.65, 0.55, 0.75, 0.38, 0.62, 0.48, 0.82, 0.3, 0.5, 0.7, 0.45, 0.6, 0.8, 0.35, 0.5];
const EQ_COLORS = ['#ff7a1a', '#a855f7', '#3f78ff'];

const MUSIC_ICONS = [
  { icon: 'music_note', x: '8%',  y: '12%', size: 22, delay: '0s',    dur: '6s' },
  { icon: 'graphic_eq', x: '88%', y: '8%',  size: 18, delay: '-2.5s', dur: '7s' },
  { icon: 'album',      x: '5%',  y: '55%', size: 16, delay: '-1s',   dur: '5s' },
  { icon: 'equalizer',  x: '92%', y: '48%', size: 20, delay: '-4s',   dur: '8s' },
  { icon: 'music_note', x: '15%', y: '80%', size: 14, delay: '-1.5s', dur: '6s' },
  { icon: 'graphic_eq', x: '80%', y: '75%', size: 18, delay: '-3s',   dur: '7s' },
  { icon: 'album',      x: '50%', y: '5%',  size: 15, delay: '-0.5s', dur: '9s' },
];

export default function ShaderBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
        style={{ backgroundImage: "url('/images/background-dark.webp')" }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-surface/35 via-background/35 to-background/90" />
      <div className="absolute inset-0 animated-mesh opacity-55 mix-blend-screen" />

      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-vinyl-orange/18 blur-[90px] float-slow" />
      <div
        className="absolute top-16 right-0 h-80 w-80 rounded-full bg-electric-purple/15 blur-[80px] float-medium"
        style={{ animationDelay: '-2s' }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-72 w-[44rem] rounded-full bg-deep-blue/18 blur-[100px] float-slow"
        style={{ animationDelay: '-4s' }}
      />
      <div
        className="absolute top-1/3 left-1/4 h-56 w-56 rounded-full bg-electric-purple/10 blur-[70px] float-medium"
        style={{ animationDelay: '-1.5s' }}
      />

      {MUSIC_ICONS.map((note, index) => (
        <span
          key={`${note.icon}-${index}`}
          className="material-symbols-outlined absolute select-none float-slow"
          style={{
            left: note.x,
            top: note.y,
            fontSize: note.size,
            animationDelay: note.delay,
            animationDuration: note.dur,
            color: index % 3 === 0 ? 'rgba(255,122,26,0.18)' : index % 3 === 1 ? 'rgba(168,85,247,0.15)' : 'rgba(63,120,255,0.15)',
          }}
        >
          {note.icon}
        </span>
      ))}

      <div className="absolute inset-0 bg-grid opacity-[0.028]" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-vinyl-orange/55 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] h-20 px-3 overflow-hidden">
        {EQ_HEIGHTS.map((height, index) => (
          <div
            key={index}
            className="flex-1 max-w-[5px] rounded-t-sm eq-bar opacity-[0.07]"
            style={{
              height: `${height * 100}%`,
              background: EQ_COLORS[index % 3],
              animationDelay: `${index * 0.07}s`,
              animationDuration: `${0.7 + (index % 5) * 0.22}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

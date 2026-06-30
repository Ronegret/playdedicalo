import { useEffect, useRef } from 'react';

const NOTE_CHARS = ['♪', '♫', '♬', '♩'];
const NOTE_COLORS = ['#ff7a1a', '#39ff14', '#3f78ff', '#a855f7'];

export default function MusicNotesBubbles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const notes = [];
    for (let i = 0; i < 10; i++) {
      const note = document.createElement('span');
      note.className = 'absolute pointer-events-none opacity-15 font-headline-lg select-none';
      note.textContent = NOTE_CHARS[Math.floor(Math.random() * NOTE_CHARS.length)];
      const size = Math.random() * 30 + 20;
      note.style.fontSize = size + 'px';
      note.style.color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
      note.style.left = Math.random() * 100 + '%';
      note.style.top = Math.random() * 100 + '%';

      container.appendChild(note);

      const speed = Math.random() * 0.5 + 0.2;
      const drift = (Math.random() - 0.5) * 0.3;
      notes.push({ el: note, posY: 0, posX: 0, speed, drift });
    }

    let animationId;
    function animate() {
      notes.forEach((n) => {
        n.posY -= n.speed;
        n.posX += n.drift;
        if (n.posY < -100) n.posY = window.innerHeight + 80;
        n.el.style.transform = `translate(${n.posX}px, ${n.posY}px) rotate(${n.posX * 1.5}deg)`;
      });
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      notes.forEach((n) => n.el.remove());
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0" />;
}

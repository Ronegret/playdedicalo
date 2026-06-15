import { useEffect, useRef } from 'react';

export default function ChaosEconomyBubbles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bubbles = [];
    for (let i = 0; i < 8; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'absolute rounded-full pointer-events-none opacity-20';
      const size = Math.random() * 60 + 20;
      bubble.style.width = size + 'px';
      bubble.style.height = size + 'px';
      bubble.style.left = Math.random() * 100 + '%';
      bubble.style.top = Math.random() * 100 + '%';
      bubble.style.background = Math.random() > 0.5 ? '#BD00FF' : '#39FF14';
      bubble.style.filter = 'blur(40px)';
      
      container.appendChild(bubble);
      
      const speed = Math.random() * 0.5 + 0.2;
      bubbles.push({ el: bubble, posY: 0, speed });
    }

    let animationId;
    function animate() {
      bubbles.forEach(b => {
        b.posY -= b.speed;
        if (b.posY < -200) b.posY = window.innerHeight + 100;
        b.el.style.transform = `translateY(${b.posY}px)`;
      });
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      bubbles.forEach(b => b.el.remove());
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0" />;
}


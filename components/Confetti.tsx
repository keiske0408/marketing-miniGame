import { useMemo } from 'react';
import type { CSSProperties } from 'react';

const COLORS = ['#2ee6a6', '#ffc93c', '#ff5a7a', '#4cc9f0', '#b388ff'];

export function Confetti({ x, y }: { x: number; y: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        color: COLORS[i % COLORS.length],
        dx: (Math.random() - 0.5) * 520,
        up: -(80 + Math.random() * 180),
        down: 160 + Math.random() * 220,
        rot: (Math.random() - 0.5) * 900,
        delay: Math.random() * 0.12,
      })),
    []
  );
  return (
    <div className="confetti" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={
            {
              background: b.color,
              animationDelay: `${b.delay}s`,
              '--dx': `${b.dx}px`,
              '--up': `${b.up}px`,
              '--down': `${b.down}px`,
              '--rot': `${b.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

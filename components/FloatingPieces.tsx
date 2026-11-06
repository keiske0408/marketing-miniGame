import { useMemo } from 'react';
import { SCENES } from '../images';

export function FloatingPieces() {
  const pieces = useMemo(() => {
    return [
      { id: 1, scene: SCENES[0].src, left: '8%', top: '15%', size: '80px', rot: '-12deg', delay: '0s', dur: '6s' },
      { id: 2, scene: SCENES[1].src, left: '82%', top: '22%', size: '95px', rot: '15deg', delay: '1.2s', dur: '7.5s' },
      { id: 3, scene: SCENES[2].src, left: '12%', top: '70%', size: '90px', rot: '8deg', delay: '2.1s', dur: '8s' },
      { id: 4, scene: SCENES[3].src, left: '85%', top: '68%', size: '85px', rot: '-18deg', delay: '0.8s', dur: '6.8s' },
    ];
  }, []);

  return (
    <div className="floating-pieces-layer" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="floating-piece"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: `calc(${p.size} * 0.625)`,
            backgroundImage: `url("${p.scene}")`,
            transform: `rotate(${p.rot})`,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}


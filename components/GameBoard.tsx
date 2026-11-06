import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Scene } from '../images';
import { randomTarget } from '../levels';
import type { LevelConfig } from '../levels';
import { Confetti } from './Confetti';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

type Phase = 'moving' | 'stopping' | 'success' | 'fail';

interface Props {
  scene: Scene;
  config: LevelConfig;
  active: boolean;
  /** Called on a successful match. Return true when that match clears the level. */
  onMatch: () => boolean;
  onAccuracy?: (acc: number) => void;
  onFail?: () => void;
}

export function GameBoard({ scene, config, active, onMatch, onAccuracy, onFail }: Props) {
  const { pieceW: w, pieceH: h, tolerance, speed } = config;
  const [target, setTarget] = useState(() => randomTarget(w, h));
  const [phase, setPhase] = useState<Phase>('moving');
  const [toast, setToast] = useState('');
  const [burst, setBurst] = useState(0);

  // The piece position lives in refs and is written straight to the DOM each frame.
  const pieceRef = useRef<HTMLDivElement>(null);
  const pos = useRef(-w); // left edge, as a fraction of board width
  const vel = useRef(speed);
  const waitRef = useRef(0); // pause-aware delay before next round
  const phaseRef = useRef<Phase>('moving');
  const targetRef = useRef(target);
  const activeRef = useRef(active);
  const onMatchRef = useRef(onMatch);
  const onAccuracyRef = useRef(onAccuracy);
  const onFailRef = useRef(onFail);

  activeRef.current = active;
  onMatchRef.current = onMatch;
  onAccuracyRef.current = onAccuracy;
  onFailRef.current = onFail;

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const draw = () => {
    if (pieceRef.current) pieceRef.current.style.transform = `translate3d(${(pos.current / w) * 100}%,0,0)`;
  };
  const nextRound = () => {
    const t = randomTarget(w, h);
    targetRef.current = t;
    setTarget(t);
    pos.current = -w;
    vel.current = speed;
    waitRef.current = 0;
    draw();
    setToast('');
    go('moving');
  };
  const stop = () => {
    if (!activeRef.current || phaseRef.current !== 'moving') return;
    soundManager.playClick();
    haptics.tick();
    vel.current = speed;
    go('stopping');
  };
  const settle = () => {
    const t = targetRef.current;
    const dist = Math.abs(pos.current - t.x);
    const acc = Math.max(0, Math.round((1 - dist / w) * 100));
    if (dist <= tolerance) {
      pos.current = t.x; // snap into place
      draw();
      setToast(`${dist <= tolerance * 0.35 ? 'Perfect Vintage!' : 'Matched!'} ${acc}%`);
      setBurst((b) => b + 1);
      go('success');
      soundManager.playSuccess();
      haptics.success();
      onAccuracyRef.current?.(acc);
      if (!onMatchRef.current()) {
        waitRef.current = 1.0;
      }
    } else {
      setToast(`Missed — ${pos.current > t.x ? 'past the mark' : 'too early'} (${acc}%)`);
      go('fail');
      soundManager.playFail();
      haptics.fail();
      onFailRef.current?.();
      waitRef.current = 0.8;
    }
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (activeRef.current) {
        if (waitRef.current > 0) {
          waitRef.current -= dt;
          if (waitRef.current <= 0) {
            waitRef.current = 0;
            nextRound();
          }
        } else if (phaseRef.current === 'moving') {
          pos.current += speed * dt;
          if (pos.current > 1) pos.current = -w;
        } else if (phaseRef.current === 'stopping') {
          vel.current *= Math.exp(-dt / 0.05); // ease-out glide
          pos.current += vel.current * dt;
          if (vel.current < 0.03) settle();
        }
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !activeRef.current) return;
      e.preventDefault();
      if (!e.repeat) stop();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  targetRef.current = target;
  const rect = { left: `${target.x * 100}%`, top: `${target.y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` };
  // Same source image, cropped with background-size/position: the piece shows exactly what the hole hides.
  const pieceStyle: CSSProperties = {
    ...rect,
    left: 0,
    backgroundImage: `url("${scene.src}")`,
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: `${(target.x / (1 - w)) * 100}% ${(target.y / (1 - h)) * 100}%`,
    transform: `translate3d(${(pos.current / w) * 100}%,0,0)`,
  };

  return (
    <div className="level-in">
      <div className={`board ${phase}`} onPointerDown={stop}>
        <div className="clip">
          <div className="image" style={{ backgroundImage: `url("${scene.src}")` }} />
          <div className="lane" style={{ top: rect.top, height: rect.height }} />
          <div className="hole" style={rect} />
          <div ref={pieceRef} className="piece" style={pieceStyle} />
        </div>
        {phase === 'success' && (
          <Confetti key={burst} x={(target.x + w / 2) * 100} y={(target.y + h / 2) * 100} />
        )}
        {toast && <div className={`toast ${phase}`}>{toast}</div>}
        <div className="banner">Vintage {config.level}: {scene.label}</div>
      </div>
    </div>
  );
}

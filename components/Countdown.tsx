import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

interface CountdownProps {
  paused?: boolean;
  onComplete: () => void;
}

export function Countdown({ paused = false, onComplete }: CountdownProps) {
  const [count, setCount] = useState<number | string>(3);
  const elapsedRef = useRef(0);
  const stepRef = useRef(0);
  const pausedRef = useRef(paused);
  const onCompleteRef = useRef(onComplete);

  pausedRef.current = paused;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    soundManager.playCountdown(false);
    haptics.countdown();

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;

      if (!pausedRef.current) {
        elapsedRef.current += dt;
        const elapsed = elapsedRef.current;

        if (elapsed >= 800 && stepRef.current < 1) {
          stepRef.current = 1;
          setCount(2);
          soundManager.playCountdown(false);
          haptics.countdown();
        } else if (elapsed >= 1600 && stepRef.current < 2) {
          stepRef.current = 2;
          setCount(1);
          soundManager.playCountdown(false);
          haptics.countdown();
        } else if (elapsed >= 2400 && stepRef.current < 3) {
          stepRef.current = 3;
          setCount('GO!');
          soundManager.playCountdown(true);
          haptics.countdown();
        } else if (elapsed >= 3050 && stepRef.current < 4) {
          stepRef.current = 4;
          onCompleteRef.current();
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="overlay countdown-overlay" aria-live="assertive">
      <div className="countdown-number" key={String(count)}>
        {count}
      </div>
      <p className="countdown-hint">
        {paused ? 'Countdown Paused' : 'Get ready!'}
      </p>
    </div>
  );
}

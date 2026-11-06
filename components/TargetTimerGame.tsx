import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../types';
import { Confetti } from './Confetti';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

type TimerPhase = 'ready' | 'running' | 'win' | 'miss';

interface TargetTimerGameProps {
  level: number;
  difficulty: Difficulty;
  active: boolean;
  onMatch: () => boolean;
  onAccuracy?: (acc: number) => void;
}

const TARGET_POOL = [3.0, 4.0, 4.5, 5.0, 5.5, 6.0, 7.0, 7.5, 8.0, 10.0];

function pickTarget(level: number, prev?: number): number {
  const maxIdx = Math.min(TARGET_POOL.length, 4 + level * 2);
  const candidates = TARGET_POOL.slice(0, maxIdx).filter((t) => t !== prev);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 5.0;
}

export function TargetTimerGame({
  level,
  difficulty,
  active,
  onMatch,
  onAccuracy,
}: TargetTimerGameProps) {
  const tolerance =
    difficulty === 'chill' ? 0.16 : difficulty === 'hard' ? 0.07 : 0.1;

  const [targetSec, setTargetSec] = useState(() => pickTarget(level));
  const [phase, setPhase] = useState<TimerPhase>('ready');
  const [displayTime, setDisplayTime] = useState(0);
  const [toast, setToast] = useState('');
  const [burst, setBurst] = useState(0);

  const elapsedRef = useRef(0);
  const phaseRef = useRef<TimerPhase>('ready');
  const activeRef = useRef(active);
  const targetRef = useRef(targetSec);
  const waitRef = useRef(0);
  const onMatchRef = useRef(onMatch);
  const onAccuracyRef = useRef(onAccuracy);

  activeRef.current = active;
  targetRef.current = targetSec;
  onMatchRef.current = onMatch;
  onAccuracyRef.current = onAccuracy;

  const setGamePhase = (p: TimerPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const resetForNextTarget = () => {
    const nextT = pickTarget(level, targetRef.current);
    targetRef.current = nextT;
    setTargetSec(nextT);
    elapsedRef.current = 0;
    setDisplayTime(0);
    setToast('');
    setGamePhase('ready');
  };

  const handleAction = () => {
    if (!activeRef.current) return;

    if (phaseRef.current === 'ready') {
      soundManager.playClick();
      haptics.tick();
      elapsedRef.current = 0;
      setDisplayTime(0);
      setToast('');
      setGamePhase('running');
      return;
    }

    if (phaseRef.current === 'running') {
      const stoppedAt = Math.round(elapsedRef.current * 100) / 100;
      const target = targetRef.current;
      const diff = Math.abs(stoppedAt - target);
      const acc = Math.max(0, Math.min(100, Math.round((1 - diff / (tolerance * 3.5)) * 100)));

      setDisplayTime(stoppedAt);

      if (diff <= tolerance) {
        const isExact = diff <= 0.02;
        setToast(
          isExact
            ? `🍾 PERFECT VINTAGE! ${stoppedAt.toFixed(2)}s (Exact ±${diff.toFixed(2)}s)`
            : `🍷 YOU WIN! Hit ${stoppedAt.toFixed(2)}s (Off by ${diff.toFixed(2)}s)`
        );
        setBurst((b) => b + 1);
        setGamePhase('win');
        soundManager.playSuccess();
        haptics.success();
        onAccuracyRef.current?.(acc);

        if (!onMatchRef.current()) {
          waitRef.current = 1.4;
        }
      } else {
        const sign = stoppedAt > target ? '+' : '-';
        setToast(`Missed (${stoppedAt.toFixed(2)}s) — ${sign}${diff.toFixed(2)}s from ${target.toFixed(2)}s`);
        setGamePhase('miss');
        soundManager.playFail();
        haptics.fail();
        waitRef.current = 1.2;
      }
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
            resetForNextTarget();
          }
        } else if (phaseRef.current === 'running') {
          elapsedRef.current += dt;
          setDisplayTime(elapsedRef.current);

          // Auto-miss if player lets timer run 2.5 seconds past target
          if (elapsedRef.current > targetRef.current + 2.5) {
            setToast(`Overflowed! Passed ${targetRef.current.toFixed(2)}s target`);
            setGamePhase('miss');
            soundManager.playFail();
            haptics.fail();
            waitRef.current = 1.2;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !activeRef.current) return;
      e.preventDefault();
      if (!e.repeat) handleAction();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [level, tolerance]);

  const fillPct = Math.min(100, (displayTime / (targetSec * 1.25)) * 100);
  const targetLinePct = (1 / 1.25) * 100; // 80% height mark on glass

  return (
    <div className="level-in">
      <div
        className={`board timer-game-board ${phase === 'win' ? 'success' : phase === 'miss' ? 'fail' : ''}`}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          handleAction();
        }}
      >
        <div className="timer-game-inner">
          <div className="timer-target-header">
            <div className="target-pill">
              <span className="target-pill-label">TARGET TIME</span>
              <strong className="target-pill-value">{targetSec.toFixed(2)}s</strong>
              <span className="target-pill-tol">Win window: ±{tolerance.toFixed(2)}s</span>
            </div>
          </div>

          <div className="timer-visual-row">
            {/* Wine Glass Fill Gauge */}
            <div className="wine-glass-gauge" aria-hidden="true">
              <div className="glass-bowl">
                <div
                  className="glass-target-line"
                  style={{ bottom: `${targetLinePct}%` }}
                >
                  <span>{targetSec.toFixed(2)}s</span>
                </div>
                <div
                  className="glass-wine-fill"
                  style={{ height: `${fillPct}%` }}
                />
              </div>
              <div className="glass-stem" />
              <div className="glass-base" />
            </div>

            {/* Digital Stopwatch Readout */}
            <div className="stopwatch-readout-box">
              <span className="stopwatch-status">
                {phase === 'ready'
                  ? 'READY TO START'
                  : phase === 'running'
                  ? 'POURING... STOP ON TARGET!'
                  : phase === 'win'
                  ? 'TARGET HIT!'
                  : 'MISSED TARGET'}
              </span>
              <div className="stopwatch-digits">
                {displayTime.toFixed(2)}
                <small>s</small>
              </div>

              <button
                type="button"
                className={`btn timer-action-btn ${phase === 'running' ? 'is-stop' : ''}`}
                onClick={handleAction}
                disabled={phase === 'win' || phase === 'miss'}
              >
                {phase === 'ready'
                  ? '▶ PLAY / START TIMER'
                  : phase === 'running'
                  ? `⏹ STOP AT ${targetSec.toFixed(2)}s!`
                  : phase === 'win'
                  ? '✓ MATCH LOCKED!'
                  : '↻ RESETTING...'}
              </button>
            </div>
          </div>
        </div>

        {phase === 'win' && <Confetti key={burst} x={50} y={45} />}
        {toast && <div className={`toast ${phase === 'win' ? 'success' : 'fail'}`}>{toast}</div>}
        <div className="banner">Vintage {level}: Perfect Pour Stopwatch</div>
      </div>
    </div>
  );
}


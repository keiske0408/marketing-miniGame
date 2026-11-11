import { useEffect, useRef, useState, useCallback } from 'react';
import type { Difficulty } from '../types';
import { Confetti } from './Confetti';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { useGameStore } from '../store/gameStore';

type TimerPhase = 'ready' | 'running' | 'win' | 'miss';

interface TargetTimerGameProps {
  level: number;
  difficulty: Difficulty;
  active: boolean;
  onMatch: () => boolean;
  onAccuracy?: (acc: number) => void;
}

const FAST_TARGET_POOL = [3.0, 4.0, 5.0, 6.0, 7.0];

function pickDynamicTarget(prev?: number): number {
  const candidates = FAST_TARGET_POOL.filter((t) => t !== prev);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 5.0;
}

export function TargetTimerGame({
  level,
  difficulty,
  active,
  onMatch,
  onAccuracy,
}: TargetTimerGameProps) {
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  const tolerance =
    difficulty === 'chill' ? 0.16 : difficulty === 'hard' ? 0.07 : 0.1;

  // Determine initial target: if admin set a fixed target in settings, use it, else pick dynamic
  const [targetSec, setTargetSec] = useState(() => {
    if (settings.timerTargetMode === 'fixed' && settings.timerCustomTarget) {
      return settings.timerCustomTarget;
    }
    return pickDynamicTarget();
  });

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

  const resetForNextTarget = useCallback(() => {
    waitRef.current = 0;
    elapsedRef.current = 0;
    setDisplayTime(0);
    setToast('');

    // If dynamic, pick next fun target; if fixed by admin, keep fixed
    if (settings.timerTargetMode !== 'fixed') {
      const nextT = pickDynamicTarget(targetRef.current);
      targetRef.current = nextT;
      setTargetSec(nextT);
    }
    setGamePhase('ready');
  }, [settings.timerTargetMode]);

  const selectTargetDirect = (target: number | 'dynamic') => {
    if (phaseRef.current === 'running') return;
    soundManager.playClick();
    haptics.tick();

    if (target === 'dynamic') {
      updateSettings({ timerTargetMode: 'dynamic' });
      const nextT = pickDynamicTarget(targetRef.current);
      targetRef.current = nextT;
      setTargetSec(nextT);
    } else {
      updateSettings({ timerTargetMode: 'fixed', timerCustomTarget: target });
      targetRef.current = target;
      setTargetSec(target);
    }
    elapsedRef.current = 0;
    setDisplayTime(0);
    setToast('');
    setGamePhase('ready');
  };

  const handleAction = () => {
    if (!activeRef.current) return;

    if (phaseRef.current === 'win' || phaseRef.current === 'miss') {
      soundManager.playClick();
      haptics.tick();
      resetForNextTarget();
      return;
    }

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
          waitRef.current = 2.2;
        }
      } else {
        const sign = stoppedAt > target ? '+' : '-';
        setToast(`Missed (${stoppedAt.toFixed(2)}s) — ${sign}${diff.toFixed(2)}s from ${target.toFixed(2)}s`);
        setGamePhase('miss');
        soundManager.playFail();
        haptics.fail();
        waitRef.current = 2.0;
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
            waitRef.current = 2.0;
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
  }, [level, tolerance, resetForNextTarget]);

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
          {/* Quick Plug-and-Play Admin / Host Event Target Selector */}
          <div className="timer-quick-target-bar" role="toolbar" aria-label="Event Target Seconds">
            <span className="target-bar-label">🎯 EVENT TARGET:</span>
            <button
              type="button"
              className={`target-chip-btn ${settings.timerTargetMode !== 'fixed' ? 'is-active' : ''}`}
              onClick={() => selectTargetDirect('dynamic')}
              disabled={phase === 'running'}
            >
              🎲 Dynamic
            </button>
            {[3.0, 5.0, 7.0].map((t) => (
              <button
                key={t}
                type="button"
                className={`target-chip-btn ${settings.timerTargetMode === 'fixed' && targetSec === t ? 'is-active' : ''}`}
                onClick={() => selectTargetDirect(t)}
                disabled={phase === 'running'}
              >
                {t.toFixed(0)}s {t === 3 ? '(Fast)' : t === 5 ? '(Classic)' : '(Master)'}
              </button>
            ))}
          </div>

          <div className="timer-target-header">
            <div className="target-pill">
              <span className="target-pill-label">
                {settings.timerTargetMode === 'fixed' ? '★ EVENT BOOTH TARGET' : 'DYNAMIC TARGET'}
              </span>
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
              >
                {phase === 'ready'
                  ? '▶ PLAY / START TIMER'
                  : phase === 'running'
                  ? `⏹ STOP AT ${targetSec.toFixed(2)}s!`
                  : phase === 'win'
                  ? '🍾 NEXT TASTER / PLAY AGAIN'
                  : '↻ NEXT TASTER / TRY AGAIN'}
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


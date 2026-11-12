import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { GameResultDialog } from './GameResultDialog';
import { useTranslation } from '../services/i18n';

interface TargetTimerGameProps {
  target: number;
  playerName: string;
  onResult: (score: number) => void;
  onNewPlayer?: () => void;
  onExit?: () => void;
}

type Phase = 'ready' | 'running' | 'finished';

export function TargetTimerGame({ target, playerName, onResult, onNewPlayer, onExit }: TargetTimerGameProps) {
  const t = useTranslation();
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<{ elapsed: number; difference: number; score: number } | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const startedAt = useRef(0);
  const phaseRef = useRef<Phase>('ready');
  const actionRef = useRef<() => void>(() => {});

  const action = () => {
    if (phaseRef.current === 'finished') {
      phaseRef.current = 'ready';
      setPhase('ready');
      setResult(null);
      setDisplayTime(0);
      return;
    }
    if (phaseRef.current === 'ready') {
      startedAt.current = performance.now();
      setDisplayTime(0);
      phaseRef.current = 'running';
      setPhase('running');
      soundManager.playClick();
      haptics.tick();
      return;
    }
    const elapsed = (performance.now() - startedAt.current) / 1000;
    const difference = Math.abs(elapsed - target);
    const score = Math.max(0, 1000 - Math.round(difference * 100));
    phaseRef.current = 'finished';
    setPhase('finished');
    setDisplayTime(elapsed);
    setResult({ elapsed, difference, score });
    onResult(score);
    if (difference <= 0.1) {
      soundManager.playSuccess();
      haptics.success();
    } else {
      soundManager.playFail();
      haptics.fail();
    }
  };
  actionRef.current = action;

  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    const updateTime = (now: number) => {
      if (phaseRef.current !== 'running') return;
      setDisplayTime((now - startedAt.current) / 1000);
      frame = requestAnimationFrame(updateTime);
    };
    frame = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || document.querySelector('[role="dialog"]') || (event.target as HTMLElement).closest('button, input, select, textarea')) return;
      event.preventDefault();
      actionRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="time-stop-board">
      <div className="time-stop-board-header">
        <div className="time-stop-board-brand"><span>CHÂTEAU VINTAGE</span><strong>TIME STOP</strong></div>
        <div className="time-stop-player"><span>{t('Player')}</span><strong>{playerName}</strong></div>
      </div>
      <div className="timer-game-inner time-stop-inner">
        <div className="timer-target-header">
          <div className="target-pill time-stop-target">
            <span className="target-pill-label">{t('Event target')}</span>
            <strong className="target-pill-value">{target.toFixed(2)}s</strong>
            <span className="target-pill-tol">{t('Win window: ±0.10s')}</span>
          </div>
        </div>
        <div className="timer-visual-row time-stop-center">
          <div className="wine-glass-gauge time-stop-glass" aria-hidden="true">
            <div className="glass-bowl">
              <div className="glass-target-line"><span>{target.toFixed(2)}s</span></div>
              <div className="glass-wine-fill" style={{ transform: `scaleY(${Math.min(1, displayTime / target * 0.8)})` }} />
            </div>
            <div className="glass-stem" />
            <div className="glass-base" />
          </div>
          <div className="stopwatch-readout-box time-stop-content">
            <span className="stopwatch-status time-stop-status" aria-live="polite">{t(phase === 'ready' ? 'Ready to start' : phase === 'running' ? 'Time is running' : result && result.difference <= 0.1 ? 'Target hit' : 'Round complete')}</span>
            <strong className="stopwatch-digits time-stop-result">{displayTime.toFixed(2)}<small>s</small></strong>
            <p className="time-stop-detail">{result ? `${result.difference.toFixed(2)}s ${t('from target')} · ${result.score} ${t('points')}` : '\u00a0'}</p>
            <button type="button" className={`btn timer-action-btn time-stop-action ${phase === 'running' ? 'is-stop' : ''}`} onClick={action}>{phase === 'ready' ? <Play aria-hidden="true" /> : phase === 'running' ? <Square aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}{t(phase === 'ready' ? 'Start' : phase === 'running' ? 'Stop' : 'Try again')}</button>
          </div>
        </div>
      </div>
      <GameResultDialog isOpen={phase === 'finished'} won={Boolean(result && result.difference <= 0.1)} score={result?.score ?? 0} onAction={action} onNewPlayer={onNewPlayer} onExit={onExit} />
    </div>
  );
}
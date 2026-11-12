import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { GameResultDialog } from './GameResultDialog';
import { useTranslation } from '../services/i18n';
import { displayedSeconds, timerWon } from '../services/eventRules';
import type { TimerResult, TimerRules } from '../services/eventRules';

interface TargetTimerGameProps extends TimerRules {
  playerName: string;
  onResult: (result: TimerResult) => void;
  onNewPlayer?: () => void;
  onExit?: () => void;
}

type Phase = 'ready' | 'running' | 'finished';

export function TargetTimerGame({ target, winMin, winMax, playerName, onResult, onNewPlayer, onExit }: TargetTimerGameProps) {
  const t = useTranslation();
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<TimerResult | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const startedAt = useRef(0);
  const lastSecRef = useRef(-1);
  const phaseRef = useRef<Phase>('ready');
  const actionRef = useRef<() => void>(() => {});
  const roundRules = useRef<TimerRules>({ target, winMin, winMax });
  const activeTarget = phase === 'ready' ? target : roundRules.current.target;

  const action = () => {
    if (phaseRef.current === 'finished') {
      phaseRef.current = 'ready';
      setPhase('ready');
      setResult(null);
      setDisplayTime(0);
      lastSecRef.current = -1;
      return;
    }
    if (phaseRef.current === 'ready') {
      roundRules.current = { target, winMin, winMax };
      startedAt.current = performance.now();
      setDisplayTime(0);
      lastSecRef.current = 0;
      phaseRef.current = 'running';
      setPhase('running');
      soundManager.playClick();
      soundManager.startPouring(roundRules.current.target);
      haptics.tick();
      return;
    }
    soundManager.stopPouring();
    soundManager.playClick();
    const elapsed = displayedSeconds((performance.now() - startedAt.current) / 1000);
    const stopped = { ...roundRules.current, elapsed };
    phaseRef.current = 'finished';
    setPhase('finished');
    setDisplayTime(elapsed);
    setResult(stopped);
    if (timerWon(stopped)) {
      soundManager.playSuccess();
      haptics.success();
    } else {
      soundManager.playFail();
      haptics.fail();
    }
    onResult(stopped);
  };
  actionRef.current = action;

  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    const updateTime = (now: number) => {
      if (phaseRef.current !== 'running') return;
      const elapsed = (now - startedAt.current) / 1000;
      setDisplayTime(elapsed);
      const wholeSec = Math.floor(elapsed);
      if (wholeSec > lastSecRef.current && wholeSec > 0) {
        lastSecRef.current = wholeSec;
        soundManager.playTimerTick(Math.abs(elapsed - roundRules.current.target) <= 1.05);
      }
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
    return () => {
      window.removeEventListener('keydown', onKey);
      soundManager.stopPouring();
    };
  }, []);

  return (
    <div className="time-stop-board">
      <div className="time-stop-board-header">
        <div className="time-stop-board-brand"><span>{t('A Stop the Clock Challenge')}</span><strong>THE PERFECT 23</strong><small>{t('23 Seconds. One Perfect Moment.')}</small></div>
        <div className="time-stop-player"><span>{t('Player')}</span><strong>{playerName}</strong></div>
      </div>
      <div className="timer-game-inner time-stop-inner">
        <div className="timer-target-header">
          <div className="target-pill time-stop-target">
            <span className="target-pill-label">{t('Event target')}</span>
            <strong className="target-pill-value">{activeTarget.toFixed(2)}s</strong>
          </div>
        </div>
        <div className="timer-visual-row time-stop-center">
          <div className="wine-glass-gauge time-stop-glass" aria-hidden="true">
            <div className="glass-bowl">
              <div className="glass-target-line"><span>{activeTarget.toFixed(2)}s</span></div>
              <div className="glass-wine-fill" style={{ transform: `scaleY(${Math.min(1, displayTime / activeTarget * 0.8)})` }} />
            </div>
            <div className="glass-stem" />
            <div className="glass-base" />
          </div>
          <div className="stopwatch-readout-box time-stop-content">
            <span className="stopwatch-status time-stop-status" aria-live="polite">{t(phase === 'ready' ? 'Ready to start' : phase === 'running' ? 'Time is running' : result && timerWon(result) ? 'Target hit' : 'Round complete')}</span>
            <strong className="stopwatch-digits time-stop-result">{displayTime.toFixed(2)}<small>s</small></strong>
            <p className="time-stop-detail">{result ? `${Math.abs(result.elapsed - result.target).toFixed(2)}s ${t('from target')}` : '\u00a0'}</p>
            <button type="button" className={`btn timer-action-btn time-stop-action ${phase === 'running' ? 'is-stop' : ''}`} onClick={action}>{phase === 'ready' ? <Play aria-hidden="true" /> : phase === 'running' ? <Square aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}{t(phase === 'ready' ? 'Start' : phase === 'running' ? 'Stop' : 'Try again')}</button>
          </div>
        </div>
      </div>
      <GameResultDialog isOpen={phase === 'finished'} won={Boolean(result && timerWon(result))} result={`${(result?.elapsed ?? 0).toFixed(2)}s`} resultLabel="Your time" onAction={action} onNewPlayer={onNewPlayer} onExit={onExit} />
    </div>
  );
}
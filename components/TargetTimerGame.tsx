import { useEffect, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { GameResultDialog } from './GameResultDialog';
import { EventBrand } from './EventBrand';
import { Modal } from './Modal';
import { useTranslation } from '../services/i18n';
import { displayedSeconds, formatTimerClock, timerWon } from '../services/eventRules';
import { TIMER_GAME_NAME } from '../config/constants';
import { useGameStore } from '../store/gameStore';
import type { TimerResult, TimerRules } from '../services/eventRules';
import wineGlass from '../assets/wine_game_UI/SCREEN 2/wine glass.png';
import emptyWineGlass from '../assets/generated/wine-glass-empty.png';
import stopButton from '../assets/wine_game_UI/SCREEN 2/stop button.png';
import imReady from '../assets/wine_game_UI/SCREEN 2/IM READY.png';

interface TargetTimerGameProps extends TimerRules {
  playerName: string;
  onResult: (result: TimerResult) => void;
  onNewPlayer?: () => void;
  onExit?: () => void;
  instructionsSeen?: boolean;
  onInstructionsRead?: () => void;
}

type Phase = 'ready' | 'running' | 'finished';

const TARGET_FILL = 0.8;

export function TargetTimerGame({ target, winMin, winMax, playerName, onResult, onNewPlayer, onExit, instructionsSeen = false, onInstructionsRead }: TargetTimerGameProps) {
  const t = useTranslation();
  const language = useGameStore((state) => state.settings.language);
  const showGuidelines = useGameStore((state) => state.settings.showGuidelines !== false);
  const [showInstructions, setShowInstructions] = useState(!instructionsSeen);
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<TimerResult | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const startedAt = useRef(0);
  const lastSecRef = useRef(-1);
  const phaseRef = useRef<Phase>('ready');
  const actionRef = useRef<(fromKeyboard?: boolean) => void>(() => {});
  const roundRules = useRef<TimerRules>({ target, winMin, winMax });
  const actionButton = useRef<HTMLButtonElement>(null);
  const activeTarget = phase === 'ready' ? target : roundRules.current.target;
  const clock = formatTimerClock(displayTime);
  // The wine reaches the target line at the target time and the brim shortly after it.
  const wineFill = Math.min(1, (displayTime / activeTarget) * TARGET_FILL);
  const won = Boolean(result && timerWon(result));
  const dismissInstructions = () => {
    setShowInstructions(false);
    onInstructionsRead?.();
  };

  const reset = () => {
    phaseRef.current = 'ready';
    setPhase('ready');
    setResult(null);
    setDisplayTime(0);
    lastSecRef.current = -1;
  };

  const action = (fromKeyboard = false) => {
    if (phaseRef.current === 'finished') return;
    if (phaseRef.current === 'ready') {
      roundRules.current = { target, winMin, winMax };
      startedAt.current = performance.now();
      setDisplayTime(0);
      lastSecRef.current = 0;
      phaseRef.current = 'running';
      setPhase('running');
      if (fromKeyboard) soundManager.playClick();
      soundManager.startPouring();
      haptics.tick();
      return;
    }
    soundManager.stopPouring();
    if (fromKeyboard) soundManager.playClick();
    const elapsed = displayedSeconds((performance.now() - startedAt.current) / 1000);
    const stopped = { ...roundRules.current, elapsed };
    phaseRef.current = 'finished';
    setPhase('finished');
    setDisplayTime(elapsed);
    setResult(stopped);
    if (timerWon(stopped)) {
      soundManager.playTimerWin();
      haptics.success();
    } else {
      soundManager.playTimerMiss();
      haptics.fail();
    }
    onResult(stopped);
  };
  actionRef.current = action;

  useEffect(() => {
    if (!showInstructions) actionButton.current?.focus();
  }, [showInstructions]);

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
      actionRef.current(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      soundManager.stopPouring();
    };
  }, []);

  return (
    <>
      <section className={`stop-clock-scene is-${phase}${phase === 'finished' ? won ? ' is-won' : ' is-missed' : ''}`} aria-label={TIMER_GAME_NAME}>
        <EventBrand />
        <h1 className="event-sr-only">{TIMER_GAME_NAME}</h1>
        <strong className="stop-clock-readout" role="timer" aria-label={t('Elapsed time')}>{clock.slice(0, -2)}<b>{clock.slice(-2)}</b></strong>
        {showGuidelines && (
          <p className="stop-clock-target"><span>{t('Target')}</span> <strong>{activeTarget.toFixed(2)}s</strong></p>
        )}
        <div className="stop-clock-glass" style={{ '--wine-fill': wineFill } as React.CSSProperties}>
          <img src={emptyWineGlass} alt="" />
          <img className="stop-clock-wine" src={wineGlass} alt="" />
          {showGuidelines && <span className="stop-clock-target-line" aria-hidden="true" />}
          <span className="stop-clock-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          <button ref={actionButton} type="button" className="stop-clock-action" disabled={showInstructions || phase === 'finished'} onClick={() => action(false)}>
            {phase === 'running' && language === 'en' ? <><img src={stopButton} alt="" /><span className="event-sr-only">{t('Stop')}</span></> : t(phase === 'running' ? 'Stop' : 'Start')}
          </button>
        </div>
      </section>
      <div className="stop-clock-round-info">
        <span>{t('Player')}: <strong>{playerName}</strong></span>
        <span>{t('Event target')}: <strong>{activeTarget.toFixed(2)}s</strong></span>
        <span role="status">{t(phase === 'ready' ? 'Ready to start' : phase === 'running' ? 'Time is running' : result && timerWon(result) ? 'Target hit' : 'Round complete')}</span>
        {phase === 'ready' && <button type="button" className="event-link-button" onClick={() => setShowInstructions(true)}><CircleHelp aria-hidden="true" />{t('How to play')}</button>}
      </div>
      <Modal title={t('How to play')} isOpen={showInstructions} onClose={dismissInstructions} maxWidth="724px" className="event-dialog stop-clock-instructions" overlayClassName="event-modal-overlay stop-clock-instructions-overlay"
        actions={<button type="button" className="event-button event-art-button" data-dialog-autofocus onClick={dismissInstructions}>
          {language === 'en' && <img src={imReady} alt="" />}
          <span className={language === 'en' ? 'event-sr-only' : undefined}>{t("I'm ready")}</span>
        </button>}>
        <ol className="stop-clock-steps">
          <li><span aria-hidden="true">1</span><p>{t('Start the clock')}</p></li>
          <li><span aria-hidden="true">2</span><p>{t('Stop as close to')} <strong>{activeTarget.toFixed(2)}</strong> {t('as you can')}</p></li>
          <li><span aria-hidden="true">3</span><p>{t('Hit the winning zone!')}</p></li>
        </ol>
      </Modal>
      <GameResultDialog isOpen={phase === 'finished'} won={Boolean(result && timerWon(result))} result={`${(result?.elapsed ?? 0).toFixed(2)}s`} resultLabel="Your time" onAction={reset} onNewPlayer={onNewPlayer} onExit={onExit} variant="stop-clock" />
    </>
  );
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { Square } from 'lucide-react';
import { VintageWineGlass } from './VintageWineGlass';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { useGameStore } from '../store/gameStore';
import { GameResultDialog } from './GameResultDialog';
import { useTranslation } from '../services/i18n';
import { overlapPercentage } from '../services/eventRules';

interface VintageWineMatchProps {
  onGameOver?: (finalScore: number) => void;
  onExit?: () => void;
  onNewPlayer?: () => void;
}

type PlayPhase = 'moving' | 'finished';

export function VintageWineMatch({ onGameOver, onExit, onNewPlayer }: VintageWineMatchProps) {
  const t = useTranslation();
  const settings = useGameStore((state) => state.settings);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>('moving');
  const glassRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(-12);
  const speed = (settings.difficulty === 'chill' ? 54 : settings.difficulty === 'hard' ? 86 : 68)
    * (settings.pictureSpeed ?? 1);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const phaseRef = useRef<PlayPhase>('moving');
  const updateGlassPosition = (xPercent: number) => {
    if (glassRef.current) {
      glassRef.current.style.left = `${xPercent}%`;
    }
  };

  const handleStop = useCallback(() => {
    if (phaseRef.current !== 'moving') return;
    const movingImage = glassRef.current?.querySelector('img');
    const targetImage = targetRef.current?.querySelector('img');
    const moving = movingImage?.getBoundingClientRect();
    const target = targetImage?.getBoundingClientRect();
    if (!movingImage?.complete || !movingImage.naturalWidth || !targetImage?.complete || !targetImage.naturalWidth
      || !moving || !target || moving.width <= 0 || target.width <= 0) {
      console.error('Picture Match glass bounds are unavailable.');
      useGameStore.getState().showToast(t('Cannot measure picture alignment. Please reload the game.'), 'error');
      return;
    }
    phaseRef.current = 'finished';
    const percentage = overlapPercentage(moving, target);
    setScore(percentage);
    setPhase('finished');
    soundManager.playClick();
    if (percentage === 100) {
      soundManager.playSuccess();
      haptics.success();
    } else {
      soundManager.playFail();
      haptics.fail();
    }
    soundManager.duckMusic();
    onGameOver?.(percentage);
  }, [onGameOver, t]);

  const handleRestart = useCallback(() => {
    setScore(0);
    posRef.current = -12;
    updateGlassPosition(-12);
    phaseRef.current = 'moving';
    setPhase('moving');
    soundManager.unduckMusic();
  }, []);

  const handleStopRef = useRef(handleStop);
  handleStopRef.current = handleStop;

  // 60fps RequestAnimationFrame Loop - isolated from render callback churn
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;

      if (phaseRef.current === 'moving') {
        posRef.current += speedRef.current * dt;
        // Wrap smoothly: when glass leaves the right edge (112%), wrap back to left (-12%)
        if (posRef.current > 112) {
          posRef.current = -12;
        }
        updateGlassPosition(posRef.current);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // Keyboard Spacebar listener
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !document.querySelector('[role="dialog"]') && !(e.target as HTMLElement).closest('button, input, select, textarea, summary, a')) {
        e.preventDefault();
        if (!e.repeat) {
          handleStopRef.current();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      soundManager.unduckMusic();
    };
  }, []);

  return (
    <div className="vintage-picture-match-container">
      <header className="picture-match-hud">
        <div className="picture-match-score"><span>{t('Match percentage')}</span><strong>{phase === 'finished' ? `${score}%` : '—'}</strong></div>
        <span className="picture-attempt-note">{t('One attempt per round')}</span>
      </header>

      <div
        className="vintage-stage-board"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (phase === 'moving') handleStop();
        }}
      >
        <div
          className="vintage-background-layer"
          style={{ backgroundImage: 'url("/images/vineyard-estate.jpg")' }}
        />

        <div className="velvet-curtain-top" aria-hidden="true" />
        <div className="velvet-curtain-left" aria-hidden="true" />
        <div className="velvet-curtain-right" aria-hidden="true" />
        <div className="grape-cluster-left" aria-hidden="true">🍇</div>
        <div className="grape-cluster-right" aria-hidden="true">🍇</div>

        <div ref={targetRef} className="vintage-gold-picture-frame" style={{ left: '66.5%' }}>
          <div className="frame-outer-molding">
            <div className="frame-corner-acanthus tl" />
            <div className="frame-corner-acanthus tr" />
            <div className="frame-corner-acanthus bl" />
            <div className="frame-corner-acanthus br" />
            <div className="frame-grape-accent" />
            <div className="frame-canvas-inner">
              <VintageWineGlass isSilhouette={true} className="silhouette-target-glass" />
            </div>
          </div>
        </div>

        <div
          ref={glassRef}
          className="moving-glass-wrapper"
        >
          <VintageWineGlass isSilhouette={false} className="moving-wine-glass" />
        </div>

        <div className="cellar-table-foreground" aria-hidden="true">
          <div className="foreground-barrel">
            <div className="barrel-gold-crest">⚜️</div>
            <span className="barrel-grapes">🍇</span>
          </div>
          <div className="foreground-bottle-group">
            <span className="bottle-grapes">🍇</span>
            <div className="wine-bottle-silhouette"><span className="bottle-label-crest">CHÂTEAU</span></div>
          </div>
        </div>

      </div>

      <footer className="vintage-controls-footer">
        <button
          type="button"
          className="vintage-stop-button"
          onClick={handleStop}
          disabled={phase !== 'moving'}
        >
          <Square aria-hidden="true" />
          <span className="stop-button-title">{t('Stop')}</span>
        </button>
      </footer>

      <GameResultDialog isOpen={phase === 'finished'} won={score === 100} result={`${score}%`} resultLabel="Match percentage" onAction={handleRestart} onNewPlayer={onNewPlayer} onExit={onExit} />
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { VintageWineGlass } from './VintageWineGlass';
import { Confetti } from './Confetti';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { useGameStore } from '../store/gameStore';
import { GameResultDialog } from './GameResultDialog';
import { useTranslation } from '../services/i18n';
import { overlapPercentage } from '../services/eventRules';

interface VintageWineMatchProps {
  onGameOver?: (matches: number, percentage: number) => void;
  onExit?: () => void;
  onNewPlayer?: () => void;
}

type PlayPhase = 'moving' | 'stopping' | 'matched' | 'gameover';

export function VintageWineMatch({ onGameOver, onExit, onNewPlayer }: VintageWineMatchProps) {
  const t = useTranslation();
  const settings = useGameStore((state) => state.settings);
  const [matchCount, setMatchCount] = useState(0);
  const [lastPercentage, setLastPercentage] = useState<number | null>(null);

  const [phase, setPhase] = useState<PlayPhase>('moving');
  const [toast, setToast] = useState<string | null>(null);
  const [confettiBurst, setConfettiBurst] = useState(0);

  // Dynamic target silhouette position: shifts to a new location after each match
  const [targetX, setTargetX] = useState(66.5);
  const targetXRef = useRef(66.5);
  targetXRef.current = targetX;

  const glassRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(-12);

  // Calibrated arcade speed: smooth, responsive horizontal traverse
  const baseSpeed =
    (settings.difficulty === 'chill' ? 54 : settings.difficulty === 'hard' ? 86 : 68) *
    (settings.pictureSpeed ?? 1);

  // Progressive speedup: accelerates after every 2 successful matches!
  const calculateSpeed = useCallback((count: number) => {
    const speedLevel = Math.floor(count / 2);
    const speedStep = settings.difficulty === 'chill' ? 8.0 : settings.difficulty === 'hard' ? 14.0 : 11.0;
    const maxSpeed = settings.difficulty === 'chill' ? 120 : settings.difficulty === 'hard' ? 165 : 145;
    return Math.min(maxSpeed, baseSpeed + speedLevel * speedStep);
  }, [baseSpeed, settings.difficulty]);

  const speedRef = useRef(baseSpeed);
  const phaseRef = useRef<PlayPhase>('moving');
  const matchCountRef = useRef(0);

  matchCountRef.current = matchCount;

  const pickNextTarget = useCallback((prev: number) => {
    const pool = [26.0, 36.0, 46.0, 56.0, 66.0, 76.0].filter((x) => Math.abs(x - prev) >= 14);
    return pool[Math.floor(Math.random() * pool.length)] ?? 50.0;
  }, []);

  const updateGlassPosition = (xPercent: number) => {
    if (glassRef.current) {
      glassRef.current.style.left = `${xPercent}%`;
    }
  };

  const resetGlassToStart = useCallback(() => {
    posRef.current = -12;
    updateGlassPosition(-12);
    setToast(null);
    phaseRef.current = 'moving';
    setPhase('moving');
  }, []);

  const handleStop = useCallback(() => {
    if (phaseRef.current !== 'moving') return;

    soundManager.playClick();
    haptics.tick();
    phaseRef.current = 'stopping';
    setPhase('stopping');

    const movingImage = glassRef.current?.querySelector('img');
    const targetImage = targetRef.current?.querySelector('img');
    const moving = movingImage?.getBoundingClientRect();
    const target = targetImage?.getBoundingClientRect();

    if (!movingImage?.complete || !movingImage.naturalWidth || !targetImage?.complete || !targetImage.naturalWidth
      || !moving || !target || moving.width <= 0 || target.width <= 0) {
      console.error('Picture Match glass bounds are unavailable.');
      useGameStore.getState().showToast(t('Cannot measure picture alignment. Please reload the game.'), 'error');
      phaseRef.current = 'moving';
      setPhase('moving');
      return;
    }

    const percentage = overlapPercentage(moving, target);
    setLastPercentage(percentage);

    // Overlap threshold for a successful match (70% minimum overlap)
    if (percentage >= 70) {
      // SUCCESSFUL MATCH!
      const newMatches = matchCountRef.current + 1;

      matchCountRef.current = newMatches;
      setMatchCount(newMatches);

      // Accelerate speed after every 2 matches
      const nextSpeed = calculateSpeed(newMatches);
      speedRef.current = nextSpeed;
      const speedMult = (nextSpeed / baseSpeed).toFixed(1);

      // Snap glass into silhouette
      posRef.current = targetXRef.current;
      updateGlassPosition(targetXRef.current);

      setToast(`🍷 ${t('MATCH LOCKED!')} ${percentage}%${newMatches >= 2 && newMatches % 2 === 0 ? ` (⚡ ${speedMult}x Speed)` : ''}`);
      setConfettiBurst((c) => c + 1);

      phaseRef.current = 'matched';
      soundManager.playSuccess();
      haptics.success();
      if (settings.pictureMatchMode === 'single') {
        phaseRef.current = 'gameover';
        setPhase('gameover');
        soundManager.duckMusic();
        onGameOver?.(newMatches, percentage);
      } else {
        setPhase('matched');
      }
    } else {
      // MISS: 1 LIFE ONLY -> GAME OVER!
      phaseRef.current = 'gameover';
      setPhase('gameover');
      soundManager.playFail();
      haptics.fail();
      soundManager.duckMusic();
      onGameOver?.(matchCountRef.current, percentage);
    }
  }, [baseSpeed, calculateSpeed, onGameOver, settings.pictureMatchMode, t]);

  // Transition to next match after celebration
  useEffect(() => {
    if (phase !== 'matched') return;
    const timer = window.setTimeout(() => {
      const nextX = pickNextTarget(targetXRef.current);
      targetXRef.current = nextX;
      setTargetX(nextX);
      resetGlassToStart();
    }, 950);
    return () => window.clearTimeout(timer);
  }, [phase, pickNextTarget, resetGlassToStart]);

  const handleRestart = useCallback(() => {
    setMatchCount(0);
    setLastPercentage(null);
    matchCountRef.current = 0;
    speedRef.current = baseSpeed;
    const initialX = 66.5;
    targetXRef.current = initialX;
    setTargetX(initialX);
    resetGlassToStart();
    soundManager.unduckMusic();
  }, [baseSpeed, resetGlassToStart]);

  const handleStopRef = useRef(handleStop);
  handleStopRef.current = handleStop;

  // 60fps RequestAnimationFrame Loop
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

  const currentSpeedMultiplier = (speedRef.current / baseSpeed).toFixed(1);
  const isMultiMatch = settings.pictureMatchMode !== 'single';
  const resultValue = isMultiMatch
    ? `${matchCount} ${t(matchCount === 1 ? 'match' : 'matches')}`
    : `${lastPercentage ?? 0}%`;

  return (
    <div className="vintage-picture-match-container">
      {isMultiMatch && (
        <header className="picture-match-hud">
          <div className="picture-match-count">
            <span>{t('Matches')}</span>
            <strong>{matchCount}</strong>
          </div>
          <div className="picture-match-count">
            <span>{t('Speed')}</span>
            <strong>{currentSpeedMultiplier}x</strong>
          </div>
        </header>
      )}

      {/* Main Vintage Vineyard Stage Board */}
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

        {/* Velvet Curtain Drapery & Accents */}
        <div className="velvet-curtain-top" aria-hidden="true" />
        <div className="velvet-curtain-left" aria-hidden="true" />
        <div className="velvet-curtain-right" aria-hidden="true" />
        <div className="grape-cluster-left" aria-hidden="true">🍇</div>
        <div className="grape-cluster-right" aria-hidden="true">🍇</div>

        {/* Ornate Gold Picture Frame with Target Silhouette (Shifts position after each match!) */}
        <div ref={targetRef} className="vintage-gold-picture-frame" style={{ left: `${targetX}%` }}>
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

        {/* Single Moving Crystal Wine Glass */}
        <div
          ref={glassRef}
          className={`moving-glass-wrapper ${phase === 'matched' ? 'is-snapped' : ''}`}
        >
          {phase === 'moving' && (
            <div className="motion-speed-box" aria-hidden="true">
              <span className="speed-line line-1" />
              <span className="speed-line line-2" />
              <span className="speed-line line-3" />
              <span className="speed-line line-4" />
            </div>
          )}
          <div className="moving-glass-glow-trail" />
          <VintageWineGlass isSilhouette={false} className="moving-wine-glass" />
        </div>

        {/* Foreground Cellar Table with Vintage Oak Barrel & Wine Bottle */}
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

        {/* Match Celebration Toast Notification */}
        {toast && (
          <div className={`vintage-match-toast ${phase === 'matched' ? 'is-success' : 'is-fail'}`} role="status">
            {toast}
          </div>
        )}

        {/* Confetti Explosion on Match */}
        {phase === 'matched' && (
          <Confetti key={confettiBurst} x={targetX + 4} y={50} />
        )}
      </div>

      {/* Ornate Vintage Bottom Controls */}
      <footer className="vintage-controls-footer">
        <button
          type="button"
          className="vintage-stop-button"
          onClick={handleStop}
          disabled={phase !== 'moving'}
        >
          <span className="stop-flourish left" aria-hidden="true">⚜️</span>
          <span className="stop-button-hand" aria-hidden="true">👆</span>
          <div className="stop-button-text">
            <span className="stop-button-title">{t('Stop')}</span>
            <span className="stop-button-subtitle">{t('Stop the wine glass at the perfect moment!')}</span>
          </div>
          <span className="stop-flourish right" aria-hidden="true">⚜️</span>
        </button>
      </footer>

      {/* Sudden-Death Game Over Dialog */}
      <GameResultDialog
        isOpen={phase === 'gameover'}
        won={matchCount > 0}
        result={resultValue}
        resultLabel={isMultiMatch ? 'Matches' : 'Match percentage'}
        onAction={handleRestart}
        onNewPlayer={onNewPlayer}
        onExit={onExit}
      />
    </div>
  );
}

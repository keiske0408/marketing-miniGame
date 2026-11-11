import { useEffect, useRef, useState, useCallback } from 'react';
import { VintageWineGlass } from './VintageWineGlass';
import { Confetti } from './Confetti';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { useGameStore } from '../store/gameStore';

interface VintageWineMatchProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onExit?: () => void;
}

type PlayPhase = 'idle' | 'moving' | 'stopping' | 'matched' | 'missed' | 'gameover';

export function VintageWineMatch({ onScoreUpdate, onGameOver, onExit }: VintageWineMatchProps) {
  const settings = useGameStore((state) => state.settings);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ppm_vintage_match_best');
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });

  const [phase, setPhase] = useState<PlayPhase>('moving');
  const [toast, setToast] = useState<string | null>(null);
  const [confettiBurst, setConfettiBurst] = useState(0);

  // References for 60fps animation loop without React re-render overhead
  const boardRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(-12); // in percent (-12% offscreen to 112% offscreen)

  // Calibrated arcade speed: smooth, flowing horizontal traverse
  const baseSpeed =
    settings.difficulty === 'chill' ? 54 : settings.difficulty === 'hard' ? 86 : 68;
  const tolerance =
    settings.difficulty === 'chill' ? 5.8 : settings.difficulty === 'hard' ? 3.4 : 4.5;

  // Progressive speedup per successful match: speeds up after every match for increasing difficulty!
  const speedStep = settings.difficulty === 'chill' ? 5.5 : settings.difficulty === 'hard' ? 8.5 : 7.0;
  const maxSpeed = settings.difficulty === 'chill' ? 120 : settings.difficulty === 'hard' ? 165 : 145;

  const matchCountRef = useRef(0);
  const [matchCount, setMatchCount] = useState(0);
  const speedRef = useRef(baseSpeed);

  const phaseRef = useRef<PlayPhase>('moving');
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(bestScore);
  const delayTimerRef = useRef<number | null>(null);

  // Dynamic target silhouette position: changes to a new spot across the board after each successful match!
  const [targetX, setTargetX] = useState(66.5);
  const targetXRef = useRef(66.5);
  targetXRef.current = targetX;

  const pickNextTarget = useCallback((prev: number) => {
    const pool = [34.0, 43.0, 52.0, 61.0, 69.0, 76.0].filter((x) => Math.abs(x - prev) >= 12);
    return pool[Math.floor(Math.random() * pool.length)] ?? 52.0;
  }, []);

  livesRef.current = lives;
  scoreRef.current = score;
  bestScoreRef.current = bestScore;

  const setGamePhase = (p: PlayPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Directly sets the horizontal position across the full board width
  const updateGlassPosition = (xPercent: number) => {
    if (glassRef.current) {
      glassRef.current.style.left = `${xPercent}%`;
    }
  };

  const resetGlassToStart = useCallback(() => {
    posRef.current = -12; // Start just off-screen left
    updateGlassPosition(-12);
    setToast(null);
    setGamePhase('moving');
  }, []);

  const handleStop = useCallback(() => {
    if (phaseRef.current !== 'moving') return;

    soundManager.playClick();
    haptics.tick();
    setGamePhase('stopping');

    const currentPos = posRef.current;
    const currentTargetX = targetXRef.current;
    const diff = Math.abs(currentPos - currentTargetX);

    if (diff <= tolerance) {
      // SUCCESS: PERFECT MATCH!
      const isExact = diff <= tolerance * 0.35;
      const accuracy = Math.max(0, Math.min(100, Math.round((1 - diff / tolerance) * 100)));
      const points = 100 + (isExact ? 50 : 0);
      const newScore = scoreRef.current + points;

      // Speed up every match for progressive difficulty!
      matchCountRef.current += 1;
      const newCount = matchCountRef.current;
      setMatchCount(newCount);
      const nextSpeed = Math.min(maxSpeed, baseSpeed + newCount * speedStep);
      speedRef.current = nextSpeed;
      const speedMultiplier = (nextSpeed / baseSpeed).toFixed(1);

      // Snap exactly into silhouette
      posRef.current = currentTargetX;
      updateGlassPosition(currentTargetX);

      setScore(newScore);
      onScoreUpdate?.(newScore);

      if (newScore > bestScoreRef.current) {
        setBestScore(newScore);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ppm_vintage_match_best', String(newScore));
        }
      }

      setToast(
        isExact
          ? `🍾 A PERFECT MATCH! +150 (⚡ ${speedMultiplier}x Speed)`
          : `🍷 MATCH LOCKED! ${accuracy}% (+100) (⚡ ${speedMultiplier}x Speed)`
      );
      setConfettiBurst((b) => b + 1);
      setGamePhase('matched');

      soundManager.playSuccess();
      haptics.success();

      // Reset for next attempt while keeping score AND shift wine silhouette to a new position!
      delayTimerRef.current = window.setTimeout(() => {
        const nextX = pickNextTarget(targetXRef.current);
        targetXRef.current = nextX;
        setTargetX(nextX);
        resetGlassToStart();
      }, 1500);
    } else {
      // MISS: LOSE ONE LIFE
      const newLives = livesRef.current - 1;
      setLives(newLives);
      livesRef.current = newLives;

      soundManager.playFail();
      haptics.fail();

      if (newLives > 0) {
        setToast(`Missed! ${newLives} ${newLives === 1 ? 'life' : 'lives'} remaining`);
        setGamePhase('missed');

        delayTimerRef.current = window.setTimeout(() => {
          resetGlassToStart();
        }, 1200);
      } else {
        // GAME OVER
        setToast('No lives remaining!');
        setGamePhase('gameover');
        soundManager.duckMusic();
        onGameOver?.(scoreRef.current);
      }
    }
  }, [baseSpeed, maxSpeed, speedStep, tolerance, onScoreUpdate, onGameOver, resetGlassToStart, pickNextTarget]);

  const handleRestart = () => {
    if (delayTimerRef.current) {
      window.clearTimeout(delayTimerRef.current);
    }
    setLives(3);
    livesRef.current = 3;
    setScore(0);
    scoreRef.current = 0;
    matchCountRef.current = 0;
    setMatchCount(0);
    speedRef.current = baseSpeed;
    const initialTarget = 66.5;
    targetXRef.current = initialTarget;
    setTargetX(initialTarget);
    soundManager.unduckMusic();
    resetGlassToStart();
  };

  // 60fps RequestAnimationFrame Loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
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
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          if (phaseRef.current === 'gameover') {
            handleRestart();
          } else {
            handleStop();
          }
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      if (delayTimerRef.current) {
        window.clearTimeout(delayTimerRef.current);
      }
    };
  }, [handleStop]);

  return (
    <div className="vintage-picture-match-container">
      {/* ==============================================================================
          1. TOP LUXURY HEADER (matching Image 2)
          ============================================================================== */}
      <header className="vintage-top-header">
        {onExit && (
          <button
            type="button"
            className="vintage-exit-btn"
            onClick={onExit}
            aria-label="Return to Wine Lounge"
            title="Return to Wine Lounge"
          >
            ‹ Lounge
          </button>
        )}

        {/* Left: Life Indicator Cartouche */}
        <div className="vintage-cartouche life-cartouche" aria-label={`Lives: ${lives} of 3`}>
          <span className="grape-mini-icon" aria-hidden="true">🍇</span>
          <span className="cartouche-label">Life</span>
          <div className="hearts-row">
            {[1, 2, 3].map((heartIndex) => (
              <span
                key={heartIndex}
                className={`heart-icon ${heartIndex <= lives ? 'is-alive' : 'is-lost'}`}
                aria-hidden="true"
              >
                {heartIndex <= lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        </div>

        {/* Center: Ornate Vintage Title Plaque */}
        <div className="vintage-title-crest">
          <div className="crest-gold-frame">
            <span className="title-vintage-script">Vintage</span>
            <span className="title-picture-match">PICTURE MATCH</span>
          </div>
        </div>

        {/* Right: Score Counter Cartouche */}
        <div className="vintage-cartouche score-cartouche">
          <div className="cartouche-score-header">
            <span className="cartouche-label">Score</span>
            {matchCount > 0 && (
              <span className="cartouche-speed-tag">⚡ {((baseSpeed + matchCount * speedStep) / baseSpeed).toFixed(1)}x</span>
            )}
          </div>
          <strong className="cartouche-score-value">{score}</strong>
          <span className="cartouche-best">Best: {bestScore}</span>
        </div>
      </header>

      {/* ==============================================================================
          2. MAIN STAGE & VINEYARD ESTATE (matching Image 2)
          ============================================================================== */}
      <div
        ref={boardRef}
        className={`vintage-stage-board ${phase === 'missed' ? 'is-shaking' : ''}`}
        onPointerDown={(e) => {
          // Don't stop if clicking button or game over modal
          if ((e.target as HTMLElement).closest('button')) return;
          if (phase === 'moving') handleStop();
        }}
      >
        {/* Golden Hour Vineyard Background Image */}
        <div
          className="vintage-background-layer"
          style={{ backgroundImage: 'url("/images/vineyard-estate.jpg")' }}
        />

        {/* Velvet Drapery Top & Corners */}
        <div className="velvet-curtain-top" aria-hidden="true" />
        <div className="velvet-curtain-left" aria-hidden="true" />
        <div className="velvet-curtain-right" aria-hidden="true" />

        {/* Hanging Grape Clusters in Upper Corners */}
        <div className="grape-cluster-left" aria-hidden="true">🍇</div>
        <div className="grape-cluster-right" aria-hidden="true">🍇</div>

        {/* Horizontal Dashed Alignment Guideline */}
        <div className="vintage-alignment-lane" aria-hidden="true" />

        {/* Ornate Gold Picture Frame containing the Target Silhouette (Shifts position after each match!) */}
        <div className="vintage-gold-picture-frame" style={{ left: `${targetX}%` }}>
          <div className="frame-outer-molding">
            <div className="frame-corner-acanthus tl" />
            <div className="frame-corner-acanthus tr" />
            <div className="frame-corner-acanthus bl" />
            <div className="frame-corner-acanthus br" />
            <div className="frame-grape-accent" />

            {/* Parchment Canvas Backing */}
            <div className="frame-canvas-inner">
              <VintageWineGlass isSilhouette={true} className="silhouette-target-glass" />
            </div>
          </div>
        </div>

        {/* Single Moving Realistic Crystal Wine Glass (Left to Right) */}
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

        {/* Foreground Rustic Wooden Table with Wine Barrel & Bottle */}
        <div className="cellar-table-foreground">
          {/* Left: Vintage Oak Barrel with Gold Crest */}
          <div className="foreground-barrel" aria-hidden="true">
            <div className="barrel-gold-crest">⚜️</div>
            <span className="barrel-grapes">🍇</span>
          </div>

          {/* Right: Bordeaux Wine Bottle & Grapes */}
          <div className="foreground-bottle-group" aria-hidden="true">
            <span className="bottle-grapes">🍇</span>
            <div className="wine-bottle-silhouette">
              <span className="bottle-label-crest">CHÂTEAU</span>
            </div>
          </div>
        </div>

        {/* Toast Notification (A Perfect Match / Missed) */}
        {toast && (
          <div className={`vintage-match-toast ${phase === 'matched' ? 'is-success' : 'is-fail'}`}>
            {toast}
          </div>
        )}

        {/* Confetti Explosion on Match */}
        {phase === 'matched' && (
          <Confetti key={confettiBurst} x={targetX + 4} y={50} />
        )}
      </div>

      {/* ==============================================================================
          3. BOTTOM ORNATE "STOP" BUTTON (matching reference1.png & reference2.png)
          ============================================================================== */}
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
            <span className="stop-button-title">STOP</span>
            <span className="stop-button-sub">Stop the wine glass at the perfect moment!</span>
          </div>
          <span className="stop-flourish right" aria-hidden="true">⚜️</span>
        </button>
      </footer>

      {/* ==============================================================================
          4. ELEGANT GAME OVER MODAL (Prompt Section 6)
          ============================================================================== */}
      {phase === 'gameover' && (
        <div className="overlay vintage-gameover-overlay" role="dialog" aria-modal="true">
          <div className="card vintage-gameover-card">
            <div className="gameover-crest">
              {/* <span className="gameover-icon">🍷</span> */}
              <h2 className="gameover-title">GAME OVER</h2>
              <p className="gameover-sub">All 3 tasting lives used</p>
            </div>

            <div className="gameover-glass-display">
              <VintageWineGlass isSilhouette={false} className="gameover-wine-glass"  />
            </div>

            <div className="gameover-stats-grid">
              <div className="gameover-stat-box">
                <span className="stat-label">FINAL SCORE</span>
                <strong className="stat-value text-accent">{score}</strong>
              </div>
              <div className="gameover-stat-box">
                <span className="stat-label">ALL-TIME BEST</span>
                <strong className="stat-value text-gold">{bestScore}</strong>
              </div>
            </div>

            <div className="gameover-actions-row">
              <button
                type="button"
                className="vintage-play-again-btn"
                onClick={handleRestart}
                autoFocus
              >
                 PLAY AGAIN
              </button>
              {onExit && (
                <button
                  type="button"
                  className="vintage-exit-modal-btn"
                  onClick={onExit}
                >
                  ‹ Wine Lounge
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

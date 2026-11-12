import { useEffect, useRef, useState, useCallback } from 'react';
import { Square } from 'lucide-react';
import { VintageWineGlass } from './VintageWineGlass';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { useGameStore } from '../store/gameStore';
import { GameResultDialog } from './GameResultDialog';
import { useTranslation } from '../services/i18n';

interface VintageWineMatchProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onExit?: () => void;
  onNewPlayer?: () => void;
  paused?: boolean;
}

type PlayPhase = 'idle' | 'moving' | 'stopping' | 'matched' | 'missed' | 'gameover';

export function VintageWineMatch({ onScoreUpdate, onGameOver, onExit, onNewPlayer, paused = false }: VintageWineMatchProps) {
  const t = useTranslation();
  const settings = useGameStore((state) => state.settings);
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

  // References for 60fps animation loop without React re-render overhead
  const boardRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(-12); // in percent (-12% offscreen to 112% offscreen)

  // Calibrated arcade speed: smooth, flowing horizontal traverse
  const baseSpeed =
    settings.difficulty === 'chill' ? 54 : settings.difficulty === 'hard' ? 86 : 68;
  const tolerance =
    settings.difficulty === 'chill' ? 5.8 : settings.difficulty === 'hard' ? 3.4 : 4.5;

  // Progressive speedup per 2 successful matches for increasing arcade challenge!
  const speedStep = settings.difficulty === 'chill' ? 8.0 : settings.difficulty === 'hard' ? 14.0 : 11.0;
  const maxSpeed = settings.difficulty === 'chill' ? 120 : settings.difficulty === 'hard' ? 165 : 145;

  const calculateSpeed = useCallback((count: number) => {
    // Accelerates after every 2 matches: matches 1-2 = 1.0x, matches 3-4 = 1.2x, matches 5-6 = 1.3x...
    const speedLevel = Math.floor(count / 2);
    return Math.min(maxSpeed, baseSpeed + speedLevel * speedStep);
  }, [baseSpeed, maxSpeed, speedStep]);

  const matchCountRef = useRef(0);
  const [matchCount, setMatchCount] = useState(0);
  const speedRef = useRef(baseSpeed);

  const phaseRef = useRef<PlayPhase>('moving');
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(bestScore);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Dynamic target silhouette position: changes to a new spot across the board after each successful match!
  const [targetX, setTargetX] = useState(66.5);
  const targetXRef = useRef(66.5);
  targetXRef.current = targetX;

  const pickNextTarget = useCallback((prev: number) => {
    const pool = [34.0, 43.0, 52.0, 61.0, 69.0, 76.0].filter((x) => Math.abs(x - prev) >= 12);
    return pool[Math.floor(Math.random() * pool.length)] ?? 52.0;
  }, []);

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
    if (phaseRef.current !== 'moving' || pausedRef.current) return;

    soundManager.playClick();
    haptics.tick();
    setGamePhase('stopping');

    const currentPos = posRef.current;
    const currentTargetX = targetXRef.current;
    const diff = Math.abs(currentPos - currentTargetX);

    if (diff <= tolerance) {
      // SUCCESS: PERFECT MATCH!
      const isExact = diff <= tolerance * 0.35;
      const points = 100 + (isExact ? 50 : 0);
      const newScore = scoreRef.current + points;

      // Speed up every 2 matches for progressive difficulty!
      matchCountRef.current += 1;
      const newCount = matchCountRef.current;
      setMatchCount(newCount);
      const nextSpeed = calculateSpeed(newCount);
      speedRef.current = nextSpeed;

      // Snap exactly into silhouette
      posRef.current = currentTargetX;
      updateGlassPosition(currentTargetX);

      setScore(newScore);
      onScoreUpdate?.(newScore);
      onGameOver?.(newScore);

      if (newScore > bestScoreRef.current) {
        setBestScore(newScore);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ppm_vintage_match_best', String(newScore));
        }
      }

      setToast(`${t(isExact ? 'Perfect match!' : 'Match!')} +${points}`);
      setGamePhase('matched');

      soundManager.playSuccess();
      haptics.success();

    } else {
      soundManager.playFail();
      haptics.fail();

      setToast(null);
      setGamePhase('gameover');
      soundManager.duckMusic();
      onGameOver?.(scoreRef.current);
    }
  }, [calculateSpeed, tolerance, onScoreUpdate, onGameOver, t]);

  useEffect(() => {
    if (phase !== 'matched' || paused) return;
    const timer = window.setTimeout(() => {
      const nextX = pickNextTarget(targetXRef.current);
      targetXRef.current = nextX;
      setTargetX(nextX);
      resetGlassToStart();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, paused, pickNextTarget, resetGlassToStart]);

  const handleRestart = useCallback(() => {
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
  }, [baseSpeed, resetGlassToStart]);

  const handleStopRef = useRef(handleStop);
  handleStopRef.current = handleStop;

  // 60fps RequestAnimationFrame Loop - isolated from render callback churn
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (phaseRef.current === 'moving' && !pausedRef.current) {
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
        <div className="picture-match-score"><span>{t('Score')}</span><strong>{score}</strong></div>
        <div className="picture-match-count"><span>{t('Matches')}</span><strong>{matchCount}</strong></div>
      </header>

      <div
        ref={boardRef}
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

        <div className="vintage-gold-picture-frame" style={{ left: `${targetX}%` }}>
          <div className="frame-outer-molding">
            <div className="frame-canvas-inner">
              <VintageWineGlass isSilhouette={true} className="silhouette-target-glass" />
            </div>
          </div>
        </div>

        <div
          ref={glassRef}
          className={`moving-glass-wrapper ${phase === 'matched' ? 'is-snapped' : ''}`}
        >
          <VintageWineGlass isSilhouette={false} className="moving-wine-glass" />
        </div>

        {toast && (
          <div className={`vintage-match-toast ${phase === 'matched' ? 'is-success' : 'is-fail'}`} role="status" aria-live="polite" aria-atomic="true">
            {toast}
          </div>
        )}

      </div>

      <footer className="vintage-controls-footer">
        <button
          type="button"
          className="vintage-stop-button"
          onClick={handleStop}
          disabled={phase !== 'moving' || paused}
        >
          <Square aria-hidden="true" />
          <span className="stop-button-title">{t('Stop')}</span>
        </button>
      </footer>

      <GameResultDialog isOpen={phase === 'gameover'} won={false} score={score} onAction={handleRestart} onNewPlayer={onNewPlayer} onExit={onExit} />
    </div>
  );
}

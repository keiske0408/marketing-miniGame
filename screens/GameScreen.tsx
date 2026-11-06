import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameBoard } from '../components/GameBoard';
import { TargetTimerGame } from '../components/TargetTimerGame';
import { Hud } from '../components/Hud';
import { Overlay } from '../components/Overlay';
import { Countdown } from '../components/Countdown';
import { PauseMenu } from '../components/PauseMenu';
import { ResultsScreen } from './ResultsScreen';
import { SCENES } from '../images';
import { getLevel } from '../levels';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import type { GameMode } from '../types';

export function GameScreen() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const settings = useGameStore((state) => state.settings);
  const selectedGameMode = useGameStore((state) => state.selectedGameMode);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const decrementDemoRound = useGameStore((state) => state.decrementDemoRound);
  const recordStoreMatch = useGameStore((state) => state.recordMatch);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [matches, setMatches] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [accuracies, setAccuracies] = useState<number[]>([]);
  const [runId, setRunId] = useState(1);

  const cfg = useMemo(
    () => getLevel(level, settings.difficulty),
    [level, settings.difficulty]
  );
  const [time, setTime] = useState(cfg.time);
  const scene = SCENES[(level - 1) % SCENES.length];

  // Start background ambient music when gameplay begins
  useEffect(() => {
    soundManager.startMusic();
    return () => {
      soundManager.stopMusic();
    };
  }, []);

  // Main game countdown timer: strictly freezes when showCountdown, isPaused, levelDone, or isGameOver is true
  useEffect(() => {
    if (showCountdown || isPaused || levelDone || isGameOver) return;

    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => {
        const next = Math.max(0, t - dt);
        if (next <= 0) {
          setIsGameOver(true);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(id);
  }, [showCountdown, isPaused, levelDone, isGameOver]);

  const advanceToNextLevel = useCallback(() => {
    if (user?.isGuest && user.demoRoundsLeft <= 1) {
      decrementDemoRound();
      setIsGameOver(true);
    } else {
      const nextLv = level + 1;
      setLevel(nextLv);
      setMatches(0);
      setLevelDone(false);
      setTime(getLevel(nextLv, settings.difficulty).time);
      setShowCountdown(true);
    }
  }, [user, level, settings.difficulty, decrementDemoRound]);

  // Pause-aware level-done auto-advance timer
  useEffect(() => {
    if (!levelDone || isPaused || isGameOver) return;
    const id = window.setTimeout(() => {
      advanceToNextLevel();
    }, 1300);
    return () => window.clearTimeout(id);
  }, [levelDone, isPaused, isGameOver, advanceToNextLevel]);

  const handleMatch = (): boolean => {
    setScore((s) => s + 1);
    const m = matches + 1;
    setMatches(m);

    if (m < cfg.goal) return false;

    setLevelDone(true);
    soundManager.playLevelUp();
    return true;
  };

  const handleAccuracy = (acc: number) => {
    setAccuracies((prev) => [...prev, acc]);
    recordStoreMatch(acc);
  };

  const handleRestart = (fresh = false, nextMode?: GameMode) => {
    if (nextMode) {
      setGameMode(nextMode);
    }
    const targetLevel = fresh ? 1 : level;
    if (fresh) {
      setScore(0);
      setLevel(1);
      setAccuracies([]);
    }
    setRunId((r) => r + 1);
    setMatches(0);
    setLevelDone(false);
    setIsGameOver(false);
    setIsPaused(false);
    setTime(getLevel(targetLevel, settings.difficulty).time);
    setShowCountdown(true);
  };

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
  }, []);

  if (isGameOver) {
    return (
      <main className="app">
        <ResultsScreen
          score={score}
          level={level}
          accuracies={accuracies}
          gameMode={selectedGameMode}
          onPlayAgain={() => {
            if (user?.isGuest && user.demoRoundsLeft <= 0) {
              navigate('/login', { state: { guestExhausted: true } });
            } else {
              handleRestart(true);
            }
          }}
        />
      </main>
    );
  }

  return (
    <main className="app">
      {/* Top Game Navigation & Mode Switcher Bar */}
      <div className="game-top-bar">
        <button
          type="button"
          className="back-btn"
          onClick={() => {
            soundManager.playClick();
            haptics.tick();
            navigate(user ? '/menu' : '/home');
          }}
        >
          <span className="back-arrow">‹</span> Lounge
        </button>

        <div className="mode-switch-pills" role="tablist" aria-label="Switch Game">
          <button
            type="button"
            role="tab"
            aria-selected={selectedGameMode === 'picture-match'}
            className={`mode-pill-btn ${selectedGameMode === 'picture-match' ? 'is-active' : ''}`}
            onClick={() => {
              if (selectedGameMode !== 'picture-match') {
                soundManager.playClick();
                handleRestart(true, 'picture-match');
              }
            }}
          >
            🖼️ Picture Match
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedGameMode === 'target-timer'}
            className={`mode-pill-btn ${selectedGameMode === 'target-timer' ? 'is-active' : ''}`}
            onClick={() => {
              if (selectedGameMode !== 'target-timer') {
                soundManager.playClick();
                handleRestart(true, 'target-timer');
              }
            }}
          >
            ⏱️ Perfect Pour
          </button>
        </div>

        <button
          type="button"
          className="hud-pause-btn"
          onClick={() => {
            soundManager.playClick();
            haptics.tick();
            setIsPaused(true);
          }}
          aria-label="Pause game"
          title="Pause game"
        >
          ⏸ Pause
        </button>
      </div>

      <Hud
        score={score}
        level={level}
        time={time}
        maxTime={cfg.time}
        matches={matches}
        goal={cfg.goal}
      />

      <div className="stage">
        {selectedGameMode === 'target-timer' ? (
          <TargetTimerGame
            key={`timer-${runId}-${level}`}
            level={level}
            difficulty={settings.difficulty}
            active={!showCountdown && !isPaused && !levelDone}
            onMatch={handleMatch}
            onAccuracy={handleAccuracy}
          />
        ) : (
          <GameBoard
            key={`board-${runId}-${level}`}
            scene={scene}
            config={cfg}
            active={!showCountdown && !isPaused && !levelDone}
            onMatch={handleMatch}
            onAccuracy={handleAccuracy}
          />
        )}

        {showCountdown && (
          <Countdown
            paused={isPaused}
            onComplete={handleCountdownComplete}
          />
        )}

        {isPaused && (
          <PauseMenu
            onResume={() => setIsPaused(false)}
            onRestart={() => handleRestart(false)}
          />
        )}

        {levelDone && !isPaused && (
          <Overlay
            title={`Vintage ${level} Complete!`}
            actions={
              <button
                type="button"
                className="btn"
                onClick={advanceToNextLevel}
              >
                Next Vintage
              </button>
            }
          >
            <p>Score: {score}. Preparing the next vintage challenge...</p>
          </Overlay>
        )}
      </div>

      <div className="controls">
        <span className="hint">
          {selectedGameMode === 'target-timer'
            ? 'Click the button or press Spacebar to start & stop on the exact target second'
            : 'Click, tap or press Spacebar to lock the vineyard slice into the frame'}
        </span>
        <button
          type="button"
          className="btn ghost"
          onClick={() => handleRestart(true)}
        >
          ↺ Restart
        </button>
      </div>
    </main>
  );
}

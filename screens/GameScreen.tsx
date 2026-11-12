import { useState } from 'react';
import { ArrowLeft, Gamepad2, Trophy, UserRoundPlus } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { VintageWineMatch } from '../components/VintageWineMatch';
import { TargetTimerGame } from '../components/TargetTimerGame';
import { useGameStore } from '../store/gameStore';
import type { GameMode } from '../types';

interface LocalScore {
  id: string;
  name: string;
  score: number;
  mode: GameMode;
}

const STORAGE_KEY = 'ppm_kiosk_leaderboard';

function readScores(): LocalScore[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((entry): entry is LocalScore =>
      entry && typeof entry.id === 'string' && typeof entry.name === 'string' && typeof entry.score === 'number' &&
      (entry.mode === 'picture-match' || entry.mode === 'target-timer')) : [];
  } catch {
    return [];
  }
}

export function GameScreen() {
  const navigate = useNavigate();
  const player = useGameStore((state) => state.kioskPlayer);
  const setKioskPlayer = useGameStore((state) => state.setKioskPlayer);
  const mode = useGameStore((state) => state.selectedGameMode);
  const settings = useGameStore((state) => state.settings);
  const [scores, setScores] = useState(readScores);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const target = settings.timerTargetMode === 'fixed' && Number.isFinite(settings.timerCustomTarget) && (settings.timerCustomTarget ?? 0) >= 1
    ? settings.timerCustomTarget! : 24;

  if (!player) return <Navigate to="/player" replace />;

  const saveScore = (score: number) => {
    setCurrentScore(score);
    const updated = [...scores, { id: crypto.randomUUID(), name: player.name, score, mode }];
    const next = (['target-timer', 'picture-match'] as const).flatMap((gameMode) =>
      updated.filter((entry) => entry.mode === gameMode)
        .sort((first, second) => second.score - first.score).slice(0, 100));
    setScores(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  };

  const newPlayer = () => {
    setKioskPlayer(null);
    navigate('/player', { replace: true });
  };
  const standings = scores.filter((entry) => entry.mode === mode).slice(0, 8);

  return (
    <main className="kiosk-play">
      <header className="kiosk-play-header">
        <button type="button" className="kiosk-nav-button" onClick={() => navigate('/game')}><ArrowLeft aria-hidden="true" /><Gamepad2 aria-hidden="true" />Game menu</button>
        {mode !== 'target-timer' && <div className="kiosk-player-name"><span>PLAYER</span><strong>{player.name}</strong></div>}
        <button type="button" className="kiosk-new-player" onClick={newPlayer}><UserRoundPlus aria-hidden="true" /><span><strong>Next player</strong><small>Register &amp; play</small></span></button>
      </header>
      <div className="kiosk-play-title"><div><span>CHÂTEAU VINTAGE / GAME LOUNGE</span><h1>{mode === 'target-timer' ? 'Time Stop' : 'Vintage Picture Match'}</h1></div><div className="kiosk-current-score"><span>LAST SCORE</span><strong>{currentScore ?? '—'}</strong></div></div>
      <div className="kiosk-play-grid">
        <div className="kiosk-play-stage">
          {mode === 'target-timer' ? <TargetTimerGame target={target} playerName={player.name} onResult={saveScore} /> :
            <VintageWineMatch onScoreUpdate={setCurrentScore} onGameOver={saveScore} onExit={() => navigate('/game')} onNewPlayer={newPlayer} />}
        </div>
        <aside className="kiosk-leaderboard" aria-label="Leaderboard">
          <div className="kiosk-leaderboard-heading"><Trophy aria-hidden="true" /><div><span>THIS DEVICE</span><h2>Leaderboard</h2></div><span>TOP 8</span></div>
          {standings.length === 0 ? <p className="kiosk-empty">The top spot is waiting for you.</p> : <ol>{standings.map((entry, index) => <li key={entry.id}><span className="kiosk-rank">{String(index + 1).padStart(2, '0')}</span><strong>{entry.name}</strong><span>{entry.score}</span></li>)}</ol>}
        </aside>
      </div>
      <footer className="kiosk-play-footer"><span>{mode === 'target-timer' ? 'One attempt per round' : 'Vintage Picture Match'}</span></footer>
    </main>
  );
}
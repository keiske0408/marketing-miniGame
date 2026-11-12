import { useState } from 'react';
import { ArrowLeft, Ellipsis, Gamepad2, Trophy, UserRoundPlus } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { VintageWineMatch } from '../components/VintageWineMatch';
import { TargetTimerGame } from '../components/TargetTimerGame';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
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
  const t = useTranslation();
  const navigate = useNavigate();
  const player = useGameStore((state) => state.kioskPlayer);
  const setKioskPlayer = useGameStore((state) => state.setKioskPlayer);
  const mode = useGameStore((state) => state.selectedGameMode);
  const settings = useGameStore((state) => state.settings);
  const [scores, setScores] = useState(readScores);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const isPictureMatch = mode === 'picture-match';
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
  const scoreList = standings.length === 0 ? <p className="kiosk-empty">{t('The top spot is waiting for you.')}</p> :
    <ol>{standings.map((entry, index) => <li key={entry.id}><span className="kiosk-rank">{String(index + 1).padStart(2, '0')}</span><strong>{entry.name}</strong><span>{entry.score}</span></li>)}</ol>;

  return (
    <main className={`kiosk-play ${isPictureMatch ? 'picture-play' : ''}`}>
      <header className="kiosk-play-header">
        <button type="button" className="kiosk-nav-button" onClick={() => navigate('/game')}><ArrowLeft aria-hidden="true" />{!isPictureMatch && <Gamepad2 aria-hidden="true" />}{t('Game menu')}</button>
        {isPictureMatch ? <>
          <strong className="picture-player-name">{player.name}</strong>
          <details className="picture-options" open={optionsOpen} onToggle={(event) => setOptionsOpen(event.currentTarget.open)} onKeyDown={(event) => { if (event.key === 'Escape') setOptionsOpen(false); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOptionsOpen(false); }}>
            <summary aria-label={t('More options')} title={t('More options')}><Ellipsis aria-hidden="true" /></summary>
            <div className="picture-options-list">
              <button type="button" onClick={() => { setOptionsOpen(false); document.getElementById('game-leaderboard')?.scrollIntoView({ block: 'nearest' }); }}><Trophy aria-hidden="true" />{t('Leaderboard')}</button>
              <button type="button" onClick={newPlayer}><UserRoundPlus aria-hidden="true" />{t('Next player')}</button>
            </div>
          </details>
        </> : <button type="button" className="kiosk-new-player" onClick={newPlayer}><UserRoundPlus aria-hidden="true" /><span><strong>{t('Next player')}</strong><small>{t('Register & play')}</small></span></button>}
      </header>
      <div className="kiosk-play-title"><div><span>{isPictureMatch ? 'CHÂTEAU VINTAGE' : 'CHÂTEAU VINTAGE / GAME LOUNGE'}</span><h1>{isPictureMatch ? t('Picture match') : 'Time Stop'}</h1></div>{!isPictureMatch && <div className="kiosk-current-score"><span>{t('Last score')}</span><strong>{currentScore ?? '—'}</strong></div>}</div>
      <div className="kiosk-play-grid">
        <div className="kiosk-play-stage">
          {mode === 'target-timer' ? <TargetTimerGame target={target} playerName={player.name} onResult={saveScore} onNewPlayer={newPlayer} onExit={() => navigate('/game')} /> :
            <VintageWineMatch paused={optionsOpen} onScoreUpdate={setCurrentScore} onGameOver={saveScore} onExit={() => navigate('/game')} onNewPlayer={newPlayer} />}
        </div>
        <aside id="game-leaderboard" className="kiosk-leaderboard" aria-label={t('Leaderboard')}>
          <div className="kiosk-leaderboard-heading"><Trophy aria-hidden="true" /><div><span>{t('This device')}</span><h2>{t('Leaderboard')}</h2></div><span>{t('Top 8')}</span></div>
          {scoreList}
        </aside>
      </div>
      {!isPictureMatch && <footer className="kiosk-play-footer"><span>{t('One attempt per round')}</span></footer>}
    </main>
  );
}
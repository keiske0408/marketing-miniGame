import { useState } from 'react';
import { ArrowLeft, Gamepad2, Trophy, UserRoundPlus } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { VintageWineMatch } from '../components/VintageWineMatch';
import { TargetTimerGame } from '../components/TargetTimerGame';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { timerRules } from '../services/eventRules';
import { formatEventScore, rankScores } from '../services/eventScores';
import type { NewEventScore } from '../services/eventScores';
import { useEventScores } from '../services/useEventScores';

export function GameScreen() {
  const t = useTranslation();
  const navigate = useNavigate();
  const player = useGameStore((state) => state.kioskPlayer);
  const setKioskPlayer = useGameStore((state) => state.setKioskPlayer);
  const mode = useGameStore((state) => state.selectedGameMode);
  const settings = useGameStore((state) => state.settings);
  const { scores, save, error } = useEventScores();
  const [currentScore, setCurrentScore] = useState<NewEventScore | null>(null);
  const isPictureMatch = mode === 'picture-match';
  const rules = timerRules(settings);

  if (!player) return <Navigate to="/player" replace />;

  const saveScore = (result: NewEventScore) => {
    setCurrentScore(result);
    save(player.name, result);
  };

  const newPlayer = () => {
    setKioskPlayer(null);
    navigate('/player', { replace: true });
  };
  const standings = rankScores(scores, mode).slice(0, 8);
  const scoreList = error ? <p role="alert" className="kiosk-empty">{error}</p> : standings.length === 0 ? <p className="kiosk-empty">{t('The top spot is waiting for you.')}</p> :
    <ol>{standings.map((entry, index) => <li key={entry.id}><span className="kiosk-rank">{String(index + 1).padStart(2, '0')}</span><strong>{entry.name}</strong><span>{formatEventScore(entry)}</span></li>)}</ol>;

  return (
    <main className={`kiosk-play ${isPictureMatch ? 'picture-play' : ''}`}>
      <header className="kiosk-play-header">
        <button type="button" className="kiosk-nav-button" onClick={() => navigate('/game')}><ArrowLeft aria-hidden="true" />{!isPictureMatch && <Gamepad2 aria-hidden="true" />}{t('Game menu')}</button>
        {isPictureMatch && <strong className="picture-player-name">{player.name}</strong>}
        <button type="button" className="kiosk-new-player" onClick={newPlayer}><UserRoundPlus aria-hidden="true" /><span><strong>{t('Next player')}</strong><small>{t('Register & play')}</small></span></button>
      </header>
      <div className="kiosk-play-title"><div><span>{isPictureMatch ? 'CHÂTEAU VINTAGE' : 'CHÂTEAU VINTAGE / GAME LOUNGE'}</span><h1>{isPictureMatch ? t('Picture match') : 'Time Stop'}</h1></div>{!isPictureMatch && <div className="kiosk-current-score"><span>{t('Last time')}</span><strong>{currentScore ? formatEventScore(currentScore) : '—'}</strong></div>}</div>
      <div className="kiosk-play-grid">
        <div className="kiosk-play-stage">
          {mode === 'target-timer' ? <TargetTimerGame {...rules} playerName={player.name} onResult={(result) => saveScore({ mode: 'target-timer', ...result })} onNewPlayer={newPlayer} onExit={() => navigate('/game')} /> :
            <VintageWineMatch onGameOver={(percentage) => saveScore({ mode: 'picture-match', percentage })} onExit={() => navigate('/game')} onNewPlayer={newPlayer} />}
        </div>
        <aside id="game-leaderboard" className="kiosk-leaderboard" aria-label={t('Leaderboard')}>
          <div className="kiosk-leaderboard-heading"><Trophy aria-hidden="true" /><div><span>{t('This device')}</span><h2>{t('Leaderboard')}</h2></div><span>{t('Top 8')}</span></div>
          <p className="leaderboard-rule">{t(isPictureMatch ? 'Highest match percentage first' : 'Closest to each round’s target first')}</p>
          {scoreList}
          <button type="button" className="text-link-btn leaderboard-view-all" onClick={() => navigate('/leaderboard')}>{t('View leaderboard')}</button>
        </aside>
      </div>
      {!isPictureMatch && <footer className="kiosk-play-footer"><span>{t('One attempt per round')}</span></footer>}
    </main>
  );
}
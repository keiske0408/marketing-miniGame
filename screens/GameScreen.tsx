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
  const isMultiMatch = isPictureMatch && settings.pictureMatchMode !== 'single';
  const showLeaderboard = settings.showLeaderboard !== false;
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
    <ol>{standings.map((entry, index) => <li key={entry.id}><span className="kiosk-rank">{String(index + 1).padStart(2, '0')}</span><strong>{entry.name}</strong><span>{formatEventScore(entry, t)}</span></li>)}</ol>;
  const navigation = (
    <header className={isPictureMatch ? 'kiosk-play-header' : 'event-support-nav'}>
      <button type="button" className={isPictureMatch ? 'kiosk-nav-button' : 'event-link-button'} onClick={() => navigate('/game')}><ArrowLeft aria-hidden="true" />{!isPictureMatch && <Gamepad2 aria-hidden="true" />}{t('Game menu')}</button>
      {isPictureMatch && <strong className="picture-player-name">{player.name}</strong>}
      <button type="button" className={isPictureMatch ? 'kiosk-new-player' : 'event-button stop-clock-next-player'} onClick={newPlayer}><UserRoundPlus aria-hidden="true" /><span><strong>{t('Next player')}</strong><small>{t('Register & play')}</small></span></button>
    </header>
  );

  return (
    <main className={isPictureMatch ? 'kiosk-play picture-play' : 'event-theme stop-clock-play'}>
      {isPictureMatch && navigation}
      {isPictureMatch && <div className="kiosk-play-title">
        <div>
          <span>CHÂTEAU VINTAGE</span>
          <h1>{t('Picture match')}</h1>
        </div>
        <div className="kiosk-current-score">
          <span>{t(isPictureMatch ? 'Last result' : 'Last time')}</span>
          <strong>{currentScore ? formatEventScore(currentScore, t) : '—'}</strong>
        </div>
      </div>}
      <div className={isPictureMatch ? `kiosk-play-grid${showLeaderboard ? '' : ' is-without-leaderboard'}` : 'stop-clock-layout'}>
        <div className={isPictureMatch ? 'kiosk-play-stage' : 'stop-clock-stage'}>
          {mode === 'target-timer' ? (
            <TargetTimerGame
              key={player.id}
              {...rules}
              playerName={player.name}
              instructionsSeen={player.timerInstructionsSeen}
              onInstructionsRead={() => setKioskPlayer({ ...player, timerInstructionsSeen: true })}
              onResult={(result) => saveScore({ mode: 'target-timer', ...result })}
              onNewPlayer={newPlayer}
              onExit={() => navigate('/game')}
            />
          ) : (
            <VintageWineMatch
              onGameOver={(matches, percentage) => saveScore({
                mode: 'picture-match',
                percentage,
                ...(settings.pictureMatchMode === 'single' ? {} : { matches }),
              })}
              onExit={() => navigate('/game')}
              onNewPlayer={newPlayer}
            />
          )}
        </div>
        {!isPictureMatch && navigation}
        {!isPictureMatch && <p className="stop-clock-last-time">{t('Last time')}: <strong>{currentScore ? formatEventScore(currentScore, t) : '—'}</strong></p>}
        {showLeaderboard && <aside id="game-leaderboard" className={`kiosk-leaderboard${isPictureMatch ? '' : ' stop-clock-leaderboard'}`} aria-label={t('Leaderboard')}>
          <div className="kiosk-leaderboard-heading"><Trophy aria-hidden="true" /><div><span>{t('This device')}</span><h2>{t('Leaderboard')}</h2></div><span>{t('Top 8')}</span></div>
          <p className="leaderboard-rule">{t(isPictureMatch ? isMultiMatch ? 'Most matches first' : 'Highest match percentage first' : 'Closest to each round’s target first')}</p>
          {scoreList}
          <button type="button" className="text-link-btn leaderboard-view-all" onClick={() => navigate('/leaderboard')}>{t('View leaderboard')}</button>
        </aside>}
      </div>
      {!isPictureMatch && <footer className="stop-clock-footer"><span>{t('One attempt per round')}</span></footer>}
    </main>
  );
}
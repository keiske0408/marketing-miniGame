import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Tabs } from '../components/Tabs';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { formatEventScore, rankScores } from '../services/eventScores';
import { useEventScores } from '../services/useEventScores';
import type { GameMode } from '../types';

export function LeaderboardScreen() {
  const t = useTranslation();
  const mode = useGameStore((state) => state.selectedGameMode);
  const [tab, setTab] = useState<GameMode>(mode);
  const { scores, refresh, error } = useEventScores();
  const entries = rankScores(scores, tab);

  return (
    <Screen title={t('Leaderboard')} subtitle={t('This device')} showBack backTo="/game"
      headerRight={<button type="button" className="kiosk-nav-button" aria-label={t('Refresh')} title={t('Refresh')} onClick={refresh}><RefreshCw aria-hidden="true" /></button>}
      className="leaderboard-screen">
      <Tabs tabs={[
        { id: 'picture-match', label: t('Picture match') },
        { id: 'target-timer', label: 'Time Stop' },
      ]} activeTab={tab} onChange={(id) => {
        if (id === 'picture-match' || id === 'target-timer') setTab(id);
      }} />
      <section className="kiosk-leaderboard" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        <h2>{tab === 'picture-match' ? t('Picture match') : 'Time Stop'}</h2>
        <p className="leaderboard-rule">{t(tab === 'picture-match' ? 'Highest match percentage first' : 'Closest to each round’s target first')}</p>
        {error ? <p role="alert">{error}</p> : entries.length === 0
          ? <p className="kiosk-empty">{t('The top spot is waiting for you.')}</p>
          : <ol>{entries.map((entry, index) => (
            <li key={entry.id}>
              <span className="kiosk-rank">{index + 1}</span>
              <div><strong>{entry.name}</strong>{entry.mode === 'target-timer' && <small className="leaderboard-target">{t('Event target')}: {entry.target.toFixed(2)}s</small>}</div>
              <span>{formatEventScore(entry)}</span>
            </li>
          ))}</ol>}
      </section>
    </Screen>
  );
}

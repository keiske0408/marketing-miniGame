import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Tabs } from '../components/Tabs';
import { Avatar } from '../components/Avatar';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { rankScores } from '../services/eventScores';
import { useEventScores } from '../services/useEventScores';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

export function LeaderboardScreen() {
  const t = useTranslation();
  const player = useGameStore((state) => state.kioskPlayer);
  const user = useGameStore((state) => state.user);
  const activeName = player?.name || user?.displayName || '';
  const [tab, setTab] = useState<'all' | 'picture-match' | 'target-timer'>('all');
  const { scores, refresh, error } = useEventScores();

  const handleRefresh = () => {
    soundManager.playClick();
    haptics.tick();
    refresh();
  };

  const entries = useMemo(() => {
    if (tab === 'all') {
      const pictures = rankScores(scores, 'picture-match');
      const timers = rankScores(scores, 'target-timer');
      return [...pictures, ...timers].sort((a, b) => {
        const scoreA = a.mode === 'picture-match' ? (a.score ?? a.percentage) : Math.max(0, 100 - Math.abs(a.elapsed - a.target) * 20);
        const scoreB = b.mode === 'picture-match' ? (b.score ?? b.percentage) : Math.max(0, 100 - Math.abs(b.elapsed - b.target) * 20);
        return scoreB - scoreA || a.createdAt - b.createdAt;
      });
    }
    return rankScores(scores, tab);
  }, [scores, tab]);

  // Determine current player's personal best
  const personalBest = useMemo(() => {
    if (!activeName) return null;
    const playerScores = scores.filter((s) => s.name.toLowerCase() === activeName.toLowerCase());
    if (playerScores.length === 0) return null;
    const bestPicture = playerScores
      .filter((s) => s.mode === 'picture-match')
      .sort((a, b) => ((b.score ?? b.percentage) - (a.score ?? a.percentage)))[0];
    const bestTimer = playerScores
      .filter((s) => s.mode === 'target-timer')
      .sort((a, b) => Math.abs(a.elapsed - a.target) - Math.abs(b.elapsed - b.target))[0];

    return {
      name: activeName,
      bestPicture: bestPicture ? (bestPicture.score ?? bestPicture.percentage) : null,
      bestTimer: bestTimer ? `${bestTimer.elapsed.toFixed(2)}s` : null,
    };
  }, [scores, activeName]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Screen
      title="GRAND VINTAGE STANDINGS"
      subtitle={t('Top Sommeliers competing for Reserve Bottles & Tasting Vouchers')}
      showBack
      backTo="/game"
      headerRight={
        <button
          type="button"
          className="kiosk-nav-button"
          aria-label={t('Refresh')}
          title={t('Refresh')}
          onClick={handleRefresh}
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>
      }
      className="leaderboard-screen"
    >
      <Tabs
        tabs={[
          { id: 'all', label: t('ALL CHALLENGES') },
          { id: 'picture-match', label: `🖼️ ${t('PICTURE MATCH')}` },
          { id: 'target-timer', label: `⏱️ ${t('THE PERFECT 23')}` },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as 'all' | 'picture-match' | 'target-timer')}
        className="leaderboard-tabs"
      />

      {/* Current User Standing Card */}
      {personalBest && (
        <div className="current-user-rank-card">
          <span className="rank-tag">{t('YOUR PERSONAL BEST')}</span>
          <div className="rank-info-row">
            <Avatar name={personalBest.name} size="sm" />
            <div className="rank-details">
              <span className="rank-player-name">{personalBest.name}</span>
              <span className="rank-player-score">
                {personalBest.bestPicture !== null && (
                  <span>Best Match: <strong>{personalBest.bestPicture} pts</strong></span>
                )}
                {personalBest.bestTimer !== null && (
                  <span style={{ marginLeft: personalBest.bestPicture !== null ? '12px' : 0 }}>
                    Best Time: <strong>{personalBest.bestTimer}</strong>
                  </span>
                )}
              </span>
            </div>
            <div className="rank-medal" aria-hidden="true">🍷</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="leaderboard-table-card">
        <div className="leaderboard-header-row">
          <span className="col-rank">{t('RANK')}</span>
          <span className="col-player">{t('SOMMELIER')}</span>
          <span className="col-score">{t('SCORE')}</span>
          <span className="col-acc">{t('PRECISION')}</span>
        </div>

        {error ? (
          <p role="alert" className="kiosk-empty">{t('Cannot access leaderboard. Check browser storage.')}</p>
        ) : entries.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p className="kiosk-empty" style={{ margin: 0, fontSize: '1.05rem', color: '#e0c58c' }}>
              🍷 {t('The top spot is waiting for you.')}
            </p>
            <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
              {t('Step up to the vintage challenge and leave your mark on the standings!')}
            </small>
          </div>
        ) : (
          <div className="leaderboard-list">
            {entries.map((item, index) => {
              const rank = index + 1;
              const isPicture = item.mode === 'picture-match';
              const displayScore = isPicture ? (item.score ?? item.percentage) : item.elapsed.toFixed(2);
              const displayPrecision = isPicture ? `${item.percentage}%` : `${Math.abs(item.elapsed - item.target).toFixed(2)}s`;

              return (
                <div
                  key={`${item.id}-${rank}`}
                  className={`leaderboard-row ${rank <= 3 ? 'is-podium' : ''}`}
                >
                  <div className="col-rank">
                    <span className="rank-indicator">{getRankBadge(rank)}</span>
                  </div>
                  <div className="col-player">
                    <Avatar name={item.name} size="sm" />
                    <div className="player-meta">
                      <span className="leaderboard-name">{item.name}</span>
                      <span className="leaderboard-level">
                        Vintage 1 • {isPicture ? `🖼️ ${t('Match')}` : `⏱️ ${t('Pour')}`}
                      </span>
                    </div>
                  </div>
                  <div className="col-score">
                    <b>{displayScore}</b>
                  </div>
                  <div className="col-acc">{displayPrecision}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}

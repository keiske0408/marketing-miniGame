import { useEffect, useState, useCallback } from 'react';
import { Screen } from '../components/Screen';
import { Tabs } from '../components/Tabs';
import { Avatar } from '../components/Avatar';
import { useGameStore } from '../store/gameStore';
import { INITIAL_LEADERBOARD } from '../config/constants';
import { supabaseService } from '../services/supabase';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import type { LeaderboardEntry, GameMode } from '../types';

export function LeaderboardScreen() {
  const user = useGameStore((state) => state.user);
  const highScore = useGameStore((state) => state.highScore);
  const [tab, setTab] = useState<'all' | 'picture-match' | 'target-timer'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async (filterMode: 'all' | GameMode) => {
    setIsRefreshing(true);
    try {
      const remote = await supabaseService.fetchLeaderboard(
        filterMode === 'all' ? undefined : filterMode
      );
      if (remote.length > 0) {
        setEntries(remote);
      } else {
        const filtered =
          filterMode === 'all'
            ? INITIAL_LEADERBOARD
            : INITIAL_LEADERBOARD.filter((e) => e.gameMode === filterMode);
        setEntries(
          filtered.map((item, idx) => ({
            ...item,
            rank: idx + 1,
          }))
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(tab);
  }, [tab, loadLeaderboard]);

  const handleRefresh = () => {
    soundManager.playClick();
    haptics.tick();
    loadLeaderboard(tab);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Screen
      title="Grand Vintage Standings"
      subtitle="Top Sommeliers competing for Reserve Bottles & Tasting Vouchers"
      showBack={true}
      backTo={user ? '/menu' : '/home'}
      headerRight={
        <button
          type="button"
          className="refresh-btn"
          onClick={handleRefresh}
          aria-label="Refresh Leaderboard"
          title="Refresh"
        >
          {isRefreshing ? '⌛' : '↻'}
        </button>
      }
      className="leaderboard-screen"
    >
      <Tabs
        tabs={[
          { id: 'all', label: 'All Challenges' },
          { id: 'picture-match', label: '🖼️ Picture Match' },
          { id: 'target-timer', label: '⏱️ Perfect Pour' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as 'all' | 'picture-match' | 'target-timer')}
        className="leaderboard-tabs"
      />

      {/* Current User Standing Card */}
      {user && highScore > 0 && (
        <div className="current-user-rank-card">
          <span className="rank-tag">YOUR PERSONAL BEST</span>
          <div className="rank-info-row">
            <Avatar name={user.displayName} isGuest={user.isGuest} size="sm" />
            <div className="rank-details">
              <span className="rank-player-name">{user.displayName}</span>
              <span className="rank-player-score">
                Best Score: <strong>{highScore} pts</strong> 
              </span>
            </div>
            <div className="rank-medal">🍷</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="leaderboard-table-card">
        <div className="leaderboard-header-row">
          <span className="col-rank">Rank</span>
          <span className="col-player">Sommelier</span>
          <span className="col-score">Score</span>
          <span className="col-acc">Precision</span>
        </div>

        <div className="leaderboard-list">
          {entries.map((item) => (
            <div
              key={`${item.userId}-${item.rank}`}
              className={`leaderboard-row ${item.rank <= 3 ? 'is-podium' : ''}`}
            >
              <div className="col-rank">
                <span className="rank-indicator">{getRankBadge(item.rank)}</span>
              </div>
              <div className="col-player">
                <Avatar name={item.displayName} size="sm" />
                <div className="player-meta">
                  <span className="leaderboard-name">{item.displayName}</span>
                  <span className="leaderboard-level">
                    Vintage {item.level} •{' '}
                    {item.gameMode === 'target-timer' ? '⏱️ Pour' : '🖼️ Match'}
                  </span>
                </div>
              </div>
              <div className="col-score">
                <b>{item.score}</b>
              </div>
              <div className="col-acc">{item.accuracy}%</div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

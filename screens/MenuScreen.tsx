import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { MenuButton } from '../components/MenuButton';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { HOW_TO_PLAY_STEPS, SHOW_PICTURE_MATCH, TIMER_GAME_NAME } from '../config/constants';
import { soundManager } from '../services/audio';
import type { GameMode } from '../types';

export function MenuScreen() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const run = useGameStore((state) => state.run);
  const highScore = useGameStore((state) => state.highScore);
  const rewards = useGameStore((state) => state.rewards);
  const logout = useGameStore((state) => state.logout);
  const startRun = useGameStore((state) => state.startRun);
  const showLeaderboard = useGameStore((state) => state.settings.showLeaderboard !== false);

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const unclaimedRewardsCount = rewards.filter((r) => !r.claimed).length;
  const guestBlocked = Boolean(user?.isGuest && user.demoRoundsLeft <= 0);

  useEffect(() => {
    soundManager.startMusic();
  }, []);

  const handlePlayGame = (mode: GameMode) => {
    if (guestBlocked) {
      navigate('/login', { state: { guestExhausted: true } });
      return;
    }
    startRun(true, mode);
    navigate('/play');
  };

  const handleContinue = () => {
    navigate('/play');
  };

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  return (
    <Screen showEventBanner={true} className="menu-screen">
      {/* Player Sommelier Pass Card */}
      <div className="player-card">
        <Avatar
          name={user?.displayName || 'Taster'}
          isGuest={user?.isGuest}
          size="lg"
        />
        <div className="player-details">
          <div className="player-name-row">
            <h2 className="player-name">{user?.displayName || 'Wine Guest'}</h2>
            {user?.isAdmin ? (
              <span className="badge-verified" style={{ background: '#d4af37', color: '#1c050d', fontWeight: 800 }}>👑 CHÂTEAU ADMIN</span>
            ) : user?.isGuest ? (
              <span className="badge-guest">GUEST ({user.demoRoundsLeft} left)</span>
            ) : (
              <span className="badge-verified">🍷 VIP TASTER</span>
            )}
          </div>
          <div className="player-stats-row">
            <div className="player-stat-item">
              <span className="stat-label">BEST SCORE</span>
              <span className="stat-num">{highScore} pts</span>
            </div>
            {/* <div className="player-stat-divider" /> */}
            <div className="player-stat-item">
              {/* <span className="stat-label">BEST VINTAGE</span> */}
              {/* <span className="stat-num">Lv.{highestLevel}</span> */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="menu-actions-stack">
        {SHOW_PICTURE_MATCH && (run.isActive && run.gameMode === 'picture-match' ? (
          <MenuButton
            variant="accent"
            onClick={handleContinue}
            icon="🍷"
            badge={`RESUME • ${run.score} PTS`}
            // subtitle="Continue your active wine tasting challenge"
          >
            ▶ RESUME VINTAGE PICTURE MATCH
          </MenuButton>
        ) : (
          <MenuButton
            variant="primary"
            onClick={() => handlePlayGame('picture-match')}
            icon="🍷"
            badge="GAME 1 • 3 LIVES"
            subtitle="Stop the moving wine glass into the golden silhouette"
          >
            PLAY VINTAGE PICTURE MATCH
          </MenuButton>
        ))}

        {run.isActive && run.gameMode === 'target-timer' ? (
          <MenuButton
            variant="accent"
            onClick={handleContinue}
            icon="⏱️"
            badge={`RESUME • ${run.score} PTS`}
            // subtitle="Continue your active stopwatch challenge"
          >
            ▶ RESUME {TIMER_GAME_NAME.toUpperCase()}
          </MenuButton>
        ) : (
          <MenuButton
            variant="secondary"
            onClick={() => handlePlayGame('target-timer')}
            icon="⏱️"
            badge="GAME 2 • FAST PACED"
            // subtitle="Hit the target second on the stopwatch to win"
          >
            PLAY {TIMER_GAME_NAME.toUpperCase()}
          </MenuButton>
        )}

        <div className={showLeaderboard ? 'menu-two-col' : undefined}>
          {showLeaderboard && <MenuButton
            variant="ghost"
            onClick={() => navigate('/leaderboard')}
            badge="LIVE"
          >
            🏆 LEADERBOARD
          </MenuButton>}

          <MenuButton
            variant="ghost"
            onClick={() => navigate('/rewards')}
            badge={unclaimedRewardsCount > 0 ? `${unclaimedRewardsCount} VOUCHERS` : undefined}
          >
            🍾 MY REWARDS
          </MenuButton>
        </div>

        {user?.isAdmin ? (
          <div className="menu-two-col">
            <MenuButton
              variant="ghost"
              onClick={() => setShowHowToPlay(true)}
            >
              ❓ HOW TO PLAY
            </MenuButton>

            <MenuButton
              variant="accent"
              onClick={() => navigate('/settings')}
              badge="ADMIN"
            >
              ⚙ ADMIN SETTINGS
            </MenuButton>
          </div>
        ) : (
          <MenuButton
            variant="ghost"
            onClick={() => setShowHowToPlay(true)}
          >
            ❓ HOW TO PLAY
          </MenuButton>
        )}

        <MenuButton
          variant="danger"
          onClick={handleLogout}
          className="btn-logout"
        >
          🚪 SIGN OUT OF PASS
        </MenuButton>
      </div>

      <Modal
        title="Wine Lounge Rules & Controls"
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      >
        <div className="how-to-play-list">
          {HOW_TO_PLAY_STEPS.map((step, idx) => (
            <div key={idx} className="how-step">
              <h3 className="how-step-title">{step.title}</h3>
              <p className="how-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </Modal>
    </Screen>
  );
}

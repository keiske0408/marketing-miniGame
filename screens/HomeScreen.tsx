import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { MenuButton } from '../components/MenuButton';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { HOW_TO_PLAY_STEPS } from '../config/constants';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import type { GameMode } from '../types';

export function HomeScreen() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const selectedGameMode = useGameStore((state) => state.selectedGameMode);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const startRun = useGameStore((state) => state.startRun);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSelectMode = (mode: GameMode) => {
    soundManager.playClick();
    haptics.tick();
    setGameMode(mode);
  };

  const handlePlayClick = (modeOverride?: GameMode) => {
    const mode = modeOverride || selectedGameMode;
    setGameMode(mode);
    if (user) {
      if (user.isGuest && user.demoRoundsLeft <= 0) {
        navigate('/login', { state: { guestExhausted: true } });
      } else {
        startRun(true, mode);
        navigate('/play');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <Screen showEventBanner={true} className="home-screen">
      <div className="wine-lounge-panel">
        <div className="home-hero">
          <div className="home-badge-row">
            <span className="arcade-pill">🍷 SOMMELIER CHALLENGE</span>
            <span className="live-status-pill">● TASTING BAR OPEN</span>
          </div>

          <h1 className="logo home-logo">CHÂTEAU VINTAGE</h1>
          <p className="home-tagline">
            Choose your wine challenge below, test your precision, and unlock complimentary tasting pours &amp; cellar rewards!
          </p>
        </div>

        {/* Two Wine Games Selector Grid */}
        <div className="game-mode-grid" role="radiogroup" aria-label="Select Game Mode">
          <div
            role="radio"
            aria-checked={selectedGameMode === 'picture-match'}
            tabIndex={0}
            className={`game-mode-card ${selectedGameMode === 'picture-match' ? 'is-selected' : ''}`}
            onClick={() => handleSelectMode('picture-match')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectMode('picture-match');
              }
            }}
          >
            <div className="game-mode-top">
              <span className="game-mode-icon">🖼️</span>
              <span className="game-mode-tag">GAME 1</span>
            </div>
            <h3 className="game-mode-title">Vintage Picture Match</h3>
            <p className="game-mode-desc">
              Stop the sliding vineyard &amp; cellar artwork slice right inside the matching frame gap.
            </p>
            <span className="game-mode-select-indicator">
              {selectedGameMode === 'picture-match' ? '✓ Selected' : 'Tap to Select'}
            </span>
          </div>

          <div
            role="radio"
            aria-checked={selectedGameMode === 'target-timer'}
            tabIndex={0}
            className={`game-mode-card ${selectedGameMode === 'target-timer' ? 'is-selected' : ''}`}
            onClick={() => handleSelectMode('target-timer')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectMode('target-timer');
              }
            }}
          >
            <div className="game-mode-top">
              <span className="game-mode-icon">⏱️</span>
              <span className="game-mode-tag">GAME 2 • NEW</span>
            </div>
            <h3 className="game-mode-title">The Perfect Pour Timer</h3>
            <p className="game-mode-desc">
              Start the stopwatch and stop it on the exact target second to pour the winning vintage!
            </p>
            <span className="game-mode-select-indicator">
              {selectedGameMode === 'target-timer' ? '✓ Selected' : 'Tap to Select'}
            </span>
          </div>
        </div>

        <div className="home-actions-card">
          <MenuButton
            variant="primary"
            onClick={() => handlePlayClick()}
            className="btn-play-large"
            badge={selectedGameMode === 'target-timer' ? 'STOPWATCH' : 'PUZZLE'}
          >
            {selectedGameMode === 'target-timer'
              ? '🍷 PLAY PERFECT POUR TIMER'
              : '🍷 PLAY PICTURE MATCH'}
          </MenuButton>

          {!user ? (
            <MenuButton
              variant="secondary"
              onClick={() => navigate('/login')}
              badge="INSTANT PASS"
            >
              🎟️ Register Tasting Pass / Sign In
            </MenuButton>
          ) : (
            <MenuButton
              variant="secondary"
              onClick={() => navigate('/menu')}
              badge={user.displayName}
            >
              🍇 Open Sommelier Lounge Menu
            </MenuButton>
          )}

          <div className="home-secondary-grid">
            <MenuButton variant="ghost" onClick={() => setShowHowToPlay(true)}>
              ❓ How to Play
            </MenuButton>
            <MenuButton variant="ghost" onClick={() => navigate('/leaderboard')}>
              🏆 Leaderboard
            </MenuButton>
          </div>
        </div>
      </div>

      <Modal
        title="How to Play & Win Wine Rewards"
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
          <div className="how-tip-box">
            🍾 <strong>Sommelier Tip:</strong> You can switch between <em>Vintage Picture Match</em> and <em>The Perfect Pour Timer</em> anytime from the Home screen or Lounge Menu!
          </div>
        </div>
      </Modal>
    </Screen>
  );
}

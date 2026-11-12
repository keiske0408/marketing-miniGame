import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sliders, Wine, Clock } from 'lucide-react';
import { Screen } from '../components/Screen';
import { useGameStore } from '../store/gameStore';
import type { GameMode } from '../types';

export function HomeScreen() {
  const navigate = useNavigate();
  const setGameMode = useGameStore((state) => state.setGameMode);
  const selectGame = (mode: GameMode) => {
    setGameMode(mode);
    navigate('/game');
  };

  return (
    <Screen className="kiosk-selection vintage-landing-screen" maxWidth="980px">
      {/* Top Vintage Vineyard Crest */}
      <div className="vintage-brand-crest">
        <div className="crest-insignia">🍇 CHÂTEAU VINTAGE ⚜️ GRAND CRU ARCADE</div>
      </div>

      <div className="vintage-landing-header">
        <span className="landing-badge">SELECT YOUR TASTING CHALLENGE</span>
        <h1 className="landing-title">The Tasting Lounge</h1>
        <p className="landing-subtitle">
          Test your split-second sommelier precision, climb the live event standings, and claim reserve tasting rewards.
        </p>
      </div>

      {/* Ornate 2-Game Selection Grid */}
      <div className="vintage-game-selection-grid">
        {/* Game 1: Time Stop */}
        <button
          type="button"
          className="vintage-selection-card time-stop-card"
          onClick={() => selectGame('target-timer')}
        >
          <div className="card-top-tag">
            <span className="game-num">CHALLENGE 01</span>
            <span className="game-type-badge">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              PRECISION TIMER
            </span>
          </div>

          <div className="card-media-stage">
            <div className="wine-glow-backdrop" />
            <img
              src="/images/vintage-wine-glass.png"
              alt="Vintage crystal wine glass"
              className="card-wine-glass-preview"
            />
          </div>

          <div className="card-content-footer">
            <div className="card-title-row">
              <h3>Time Stop</h3>
              <ArrowRight className="card-arrow" aria-hidden="true" />
            </div>
            <p className="card-description">
              Stop the pour clock at the exact designated target second with sommelier accuracy.
            </p>
            <span className="card-action-pill">SELECT GAME ↗</span>
          </div>
        </button>

        {/* Game 2: Vintage Picture Match */}
        <button
          type="button"
          className="vintage-selection-card picture-match-card"
          onClick={() => selectGame('picture-match')}
        >
          <div className="card-top-tag">
            <span className="game-num">CHALLENGE 02</span>
            <span className="game-type-badge">
              <Wine className="w-3.5 h-3.5" aria-hidden="true" />
              WINE ALIGNMENT
            </span>
          </div>

          <div className="card-media-stage picture-stage">
            <img
              src="/images/vintage-game-scene.jpg"
              alt="Vintage vineyard estate picture match scene"
              className="card-vineyard-preview"
            />
            <div className="picture-stage-overlay" />
          </div>

          <div className="card-content-footer">
            <div className="card-title-row">
              <h3>Vintage Picture Match</h3>
              <ArrowRight className="card-arrow" aria-hidden="true" />
            </div>
            <p className="card-description">
              Stop the moving Bordeaux wine glass right into the golden silhouette. Accelerates every 2 matches!
            </p>
            <span className="card-action-pill">SELECT GAME ↗</span>
          </div>
        </button>
      </div>

      {/* Art-Rich Ornate Admin Settings Medallion Button */}
      <div className="vintage-landing-footer">
        <button
          type="button"
          className="vintage-admin-medallion-btn"
          onClick={() => navigate('/settings')}
        >
          <div className="medallion-inner">
            <span className="medallion-gear" aria-hidden="true">
              <Sliders className="w-5 h-5 text-gold" />
            </span>
            <div className="medallion-text">
              <strong className="medallion-title">CELLAR CONTROLS &amp; ADMIN SETTINGS</strong>
              <small className="medallion-desc">Calibrate pour targets, audio volumes &amp; device parameters</small>
            </div>
            <span className="medallion-flourish" aria-hidden="true">⚜️</span>
          </div>
        </button>
      </div>
    </Screen>
  );
}

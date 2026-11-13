import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sliders, Wine, Clock, Gamepad2, Sparkles } from 'lucide-react';
import { EventBrand } from '../components/EventBrand';
import { TIMER_GAME_NAME } from '../config/constants';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { timerRules } from '../services/eventRules';
import type { GameMode } from '../types';
import wineGlass from '../assets/wine_game_UI/SCREEN 2/wine glass.png';

export function HomeScreen() {
  const t = useTranslation();
  const navigate = useNavigate();
  const setGameMode = useGameStore((state) => state.setGameMode);
  const settings = useGameStore((state) => state.settings);
  const target = timerRules(settings).target;
  const selectGame = (mode: GameMode) => {
    setGameMode(mode);
    navigate('/game');
  };

  return (
    <main className="event-theme event-page">
      <div className="event-entry">
        <header className="event-lobby-header">
          <div className="event-lobby-orbit" aria-hidden="true">
            <Sparkles className="event-lobby-star" />
            <Sparkles className="event-lobby-star" />
            <Sparkles className="event-lobby-star" />
          </div>
          <EventBrand />
          <div className="event-lobby-title">
            <span className="event-eyebrow">{t('YOUR NEXT CHALLENGE')}</span>
            <h1 className="event-heading">{t('Choose a game')}</h1>
            <div className="event-lobby-divider" aria-hidden="true"><span /><Gamepad2 /><span /></div>
          </div>
        </header>
        <div className="event-game-grid">
          <button
            type="button"
            className="event-game-card"
            onClick={() => selectGame('target-timer')}
          >
            <div className="event-card-tags">
              <span className="game-num">{t('CHALLENGE')} 01</span>
              <span className="game-type-badge">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                {t('Precision timer')}
              </span>
            </div>

            <div className="event-card-media event-card-timer">
              <img
                src={wineGlass}
                alt=""
              />
            </div>

            <div className="event-card-copy">
              <div className="event-card-title">
                <h2>{TIMER_GAME_NAME}</h2>
                <ArrowRight className="card-arrow" aria-hidden="true" />
              </div>
              <p className="card-description">
                {t('The challenge: Participants must stop a running timer as close as possible to')} {target.toFixed(2)} {t('seconds to win a prize.')}
              </p>
              <span className="event-card-action">{t('Select game')} <ArrowRight aria-hidden="true" /></span>
            </div>
          </button>

          <button
            type="button"
            className="event-game-card"
            onClick={() => selectGame('picture-match')}
          >
            <div className="event-card-tags">
              <span className="game-num">{t('CHALLENGE')} 02</span>
              <span className="game-type-badge">
                <Wine className="w-3.5 h-3.5" aria-hidden="true" />
                {t('Picture match')}
              </span>
            </div>

            <div className="event-card-media event-card-picture">
              <img
                src="/images/vintage-game-scene.jpg"
                alt="Vintage vineyard estate picture match scene"
              />
            </div>

            <div className="event-card-copy">
              <div className="event-card-title">
                <h2>Vintage Picture Match</h2>
                <ArrowRight className="card-arrow" aria-hidden="true" />
              </div>
              <p className="card-description">
                {t('Match the glass to its outline.')}
              </p>
              <span className="event-card-action">{t('Select game')} <ArrowRight aria-hidden="true" /></span>
            </div>
          </button>
        </div>

        <footer className="event-entry-footer">
          <button
            type="button"
            className="event-link-button"
            onClick={() => navigate('/settings')}
          >
            <Sliders aria-hidden="true" />{t('Admin settings')}
          </button>
        </footer>
      </div>
    </main>
  );
}

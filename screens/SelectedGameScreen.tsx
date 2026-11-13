import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clapperboard, Gamepad2, Play, Sliders, UserRoundPlus } from 'lucide-react';
import { EventBrand } from '../components/EventBrand';
import { TIMER_GAME_NAME } from '../config/constants';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import wineGlass from '../assets/wine_game_UI/SCREEN 2/wine glass.png';

export function SelectedGameScreen() {
  const t = useTranslation();
  const navigate = useNavigate();
  const mode = useGameStore((state) => state.selectedGameMode);
  const player = useGameStore((state) => state.kioskPlayer);
  return (
    <main className="event-theme event-page">
      <div className="event-entry">
        <EventBrand />
        <nav className="event-support-nav" aria-label={t('Game navigation')}>
          <button type="button" className="event-link-button" onClick={() => navigate('/home')}><ArrowLeft aria-hidden="true" /><Gamepad2 aria-hidden="true" />{t('All games')}</button>
        </nav>
        <div className="event-selected-layout">
          <div>
            <span className="event-eyebrow">{t('YOUR NEXT CHALLENGE')}</span>
            <h1 className="event-heading">{mode === 'target-timer' ? TIMER_GAME_NAME : 'Vintage Picture Match'}</h1>
            <div className="event-selected-tags"><span><Gamepad2 aria-hidden="true" />{t('Solo challenge')}</span><span>{t(mode === 'target-timer' ? 'Perfect timing' : 'Find your match')}</span></div>
            <div className="event-menu-actions">
              <button type="button" className="event-button event-play-button" onClick={() => navigate(player ? '/play' : '/player')}>
                {player ? <Play aria-hidden="true" /> : <UserRoundPlus aria-hidden="true" />}<span><strong>{t(player ? "Let's play" : 'Register & play')}</strong>{player && <small>{t('Playing as')} {player.name}</small>}</span><ArrowRight aria-hidden="true" />
              </button>
              <button type="button" className="event-link-button" onClick={() => navigate('/avp')}><Clapperboard aria-hidden="true" />{t('Play AVP')}</button>
            </div>
          </div>
          <img className="event-selected-image" src={mode === 'target-timer' ? wineGlass : '/images/vintage-game-scene.jpg'} width="360" height="460" alt={mode === 'target-timer' ? 'A glass of red wine' : 'Vintage wine picture match scene'} />
        </div>
        <footer className="event-entry-footer">
          <button
            type="button"
            className="event-link-button"
            onClick={() => navigate('/settings', { state: { from: '/game' } })}
          >
            <Sliders aria-hidden="true" />{t('Admin settings')}
          </button>
        </footer>
      </div>
    </main>
  );
}
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clapperboard, Gamepad2, Play, Sliders, UserRoundPlus } from 'lucide-react';
import { Screen } from '../components/Screen';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';

export function SelectedGameScreen() {
  const t = useTranslation();
  const navigate = useNavigate();
  const mode = useGameStore((state) => state.selectedGameMode);
  const player = useGameStore((state) => state.kioskPlayer);
  return (
    <Screen className="kiosk-selection kiosk-selected" maxWidth="1000px">
      <nav className="kiosk-selection-nav" aria-label={t('Game navigation')}>
        <button type="button" className="kiosk-nav-button" onClick={() => navigate('/home')}><ArrowLeft aria-hidden="true" /><Gamepad2 aria-hidden="true" />{t('All games')}</button>
        <span className="kiosk-lounge-label">{t('THE GAME LOUNGE')}</span>
      </nav>
      <div className="kiosk-selected-layout">
        <div className="kiosk-selected-copy">
          <div className="kiosk-brand">CHÂTEAU VINTAGE <span> / GAME LOUNGE</span></div>
          <div className="kiosk-heading"><span>{t('YOUR NEXT CHALLENGE')}</span><h1>{mode === 'target-timer' ? 'THE PERFECT 23' : 'Vintage Picture Match'}</h1></div>
          <div className="kiosk-game-tags"><span><Gamepad2 aria-hidden="true" />{t('Solo challenge')}</span><span>{t(mode === 'target-timer' ? 'Perfect timing' : 'Find your match')}</span></div>
          <div className="kiosk-menu-actions">
            <button type="button" className="btn btn-primary kiosk-play-cta" onClick={() => navigate(player ? '/play' : '/player')}>
              {player ? <Play aria-hidden="true" /> : <UserRoundPlus aria-hidden="true" />}<span><strong>{t(player ? "Let's play" : 'Register & play')}</strong>{player && <small>{t('Playing as')} {player.name}</small>}</span><ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate('/avp')}><Clapperboard aria-hidden="true" />{t('Play AVP')}</button>
          </div>
        </div>
        <img className="kiosk-selected-image" src={mode === 'target-timer' ? '/images/vintage-wine-glass.png' : '/images/vintage-game-scene.jpg'} width="360" height="460" alt={mode === 'target-timer' ? 'A glass of red wine' : 'Vintage wine picture match scene'} />
      </div>
      <footer className="kiosk-selection-footer">
        <span className="footer-vintage-motto">CHÂTEAU VINTAGE · GRAND CRU ARCADE</span>
        <button
          type="button"
          className="vintage-admin-medallion-btn"
          style={{ width: 'auto', padding: '8px 22px' }}
          onClick={() => navigate('/settings', { state: { from: '/game' } })}
        >
          <div className="medallion-inner" style={{ gap: '10px' }}>
            <span className="medallion-gear" aria-hidden="true">
              <Sliders className="w-4 h-4 text-gold" />
            </span>
            <div className="medallion-text">
              <strong className="medallion-title" style={{ fontSize: '0.85rem' }}>{t('Admin settings')}</strong>
            </div>
            <span className="medallion-flourish" aria-hidden="true">⚜️</span>
          </div>
        </button>
      </footer>
    </Screen>
  );
}
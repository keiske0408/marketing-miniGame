import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clapperboard, Gamepad2, Play, Settings2, UserRoundPlus } from 'lucide-react';
import { Screen } from '../components/Screen';
import { useGameStore } from '../store/gameStore';

export function SelectedGameScreen() {
  const navigate = useNavigate();
  const mode = useGameStore((state) => state.selectedGameMode);
  const player = useGameStore((state) => state.kioskPlayer);
  return (
    <Screen className="kiosk-selection kiosk-selected" maxWidth="1000px">
      <nav className="kiosk-selection-nav" aria-label="Game navigation">
        <button type="button" className="kiosk-nav-button" onClick={() => navigate('/home')}><ArrowLeft aria-hidden="true" /><Gamepad2 aria-hidden="true" /> All games</button>
        <span className="kiosk-lounge-label">THE GAME LOUNGE</span>
      </nav>
      <div className="kiosk-selected-layout">
        <div className="kiosk-selected-copy">
          <div className="kiosk-brand">CHÂTEAU VINTAGE <span> / GAME LOUNGE</span></div>
          <div className="kiosk-heading"><span>YOUR NEXT CHALLENGE</span><h1>{mode === 'target-timer' ? 'Time Stop' : 'Vintage Picture Match'}</h1></div>
          <div className="kiosk-game-tags"><span><Gamepad2 aria-hidden="true" /> Solo challenge</span><span>{mode === 'target-timer' ? 'Perfect timing' : 'Find your match'}</span></div>
          <div className="kiosk-menu-actions">
            <button type="button" className="btn btn-primary kiosk-play-cta" onClick={() => navigate(player ? '/play' : '/player')}>
              {player ? <Play aria-hidden="true" /> : <UserRoundPlus aria-hidden="true" />}<span><strong>{player ? "Let's play" : 'Register & play'}</strong><small>{player ? `Playing as ${player.name}` : 'Join the challenge'}</small></span><ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate('/avp')}><Clapperboard aria-hidden="true" />Play AVP</button>
          </div>
        </div>
        <img className="kiosk-selected-image" src={mode === 'target-timer' ? '/images/vintage-wine-glass.png' : '/images/vintage-game-scene.jpg'} width="360" height="460" alt={mode === 'target-timer' ? 'A glass of red wine' : 'Vintage wine picture match scene'} />
      </div>
      <footer className="kiosk-selection-footer">
        <span className="footer-vintage-motto">CHÂTEAU VINTAGE · GRAND CRU ARCADE</span>
        <button
          type="button"
          className="vintage-admin-mini-btn"
          onClick={() => navigate('/settings', { state: { from: '/game' } })}
        >
          <Settings2 className="w-4 h-4 text-gold" aria-hidden="true" />
          <span>CELLAR &amp; ADMIN CONTROLS ⚜️</span>
        </button>
      </footer>
    </Screen>
  );
}
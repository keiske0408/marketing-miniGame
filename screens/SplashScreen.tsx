import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { EVENT_NAME, TIMER_GAME_NAME } from '../config/constants';
import { SCENES } from '../images';

export function SplashScreen() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const [progress, setProgress] = useState(20);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const preload = async () => {
      SCENES.forEach((scene) => {
        const img = new Image();
        img.src = scene.src;
      });

      for (let i = 25; i <= 100; i += 25) {
        await new Promise((r) => setTimeout(r, 110));
        setProgress(i);
      }
      setIsLoaded(true);
    };

    preload();
  }, []);

  const handleStart = async () => {
    await soundManager.unlock();
    soundManager.startMusic();
    soundManager.playClick();
    haptics.tick();

    if (user && !user.isGuest) {
      navigate('/menu');
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="splash-container">
      <div className="splash-card">
        <div className="splash-event-tag">🍷 {EVENT_NAME}</div>

        <div className="splash-crest" aria-hidden="true">
          <span>🍇</span>
          <span className="crest-main">🍷</span>
          <span>🍾</span>
        </div>

        <div className="splash-logo-box">
          <h1 className="logo splash-logo">CHÂTEAU ARCADE</h1>
          <p className="splash-subtitle">
            Vintage Picture Match &amp; {TIMER_GAME_NAME}
          </p>
        </div>

        <div className="splash-actions-box">
          {!isLoaded ? (
            <div className="splash-loading-bar-wrapper">
              <div className="splash-loading-label">
                Decanting Experience ({progress}%)
              </div>
              <div className="splash-progress-track">
                <div
                  className="splash-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="splash-start-btn"
              onClick={handleStart}
              autoFocus
            >
              🍷 TAP TO ENTER LOUNGE
            </button>
          )}
        </div>

        <footer className="splash-footer">
          <span>Complimentary Tasting Rewards • Touch &amp; Spacebar Ready</span>
        </footer>
      </div>
    </div>
  );
}

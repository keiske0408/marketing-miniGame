import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { SelectedGameScreen } from './screens/SelectedGameScreen';
import { PlayerConsentScreen } from './screens/PlayerConsentScreen';
import { AvpScreen } from './screens/AvpScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { RequireAuth } from './components/RequireAuth';
import { Toast } from './components/Toast';
import { useGameStore } from './store/gameStore';
import { soundManager } from './services/audio';

export default function App() {
  const settings = useGameStore((state) => state.settings);

  useEffect(() => {
    document.documentElement.lang = settings.language === 'tl' ? 'tl' : 'en';
    // Synchronize HTML theme data-attribute
    if (settings.theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    // Synchronize sound settings on mount
    soundManager.updateSettings(settings);
  }, [settings]);

  useEffect(() => {
    // Global user-gesture listener to unlock AudioContext on any screen upon first tap/click/key
    const handleUnlock = () => {
      soundManager.unlock();
      soundManager.startMusic();
    };
    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    window.addEventListener('keydown', handleUnlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/game" element={<SelectedGameScreen />} />
          <Route path="/player" element={<PlayerConsentScreen />} />
          <Route path="/avp" element={<AvpScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/menu"
            element={
              <RequireAuth>
                <MenuScreen />
              </RequireAuth>
            }
          />
          <Route path="/play" element={<GameScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route
            path="/rewards"
            element={
              <RequireAuth>
                <RewardsScreen />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
      </div>
    </BrowserRouter>
  );
}

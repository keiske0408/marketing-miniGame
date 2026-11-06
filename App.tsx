import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { RequireAuth } from './components/RequireAuth';
import { Toast } from './components/Toast';
import { useGameStore } from './store/gameStore';

export default function App() {
  const theme = useGameStore((state) => state.settings.theme);

  useEffect(() => {
    // Synchronize HTML theme data-attribute
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/menu"
            element={
              <RequireAuth>
                <MenuScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/play"
            element={
              <RequireAuth allowGuestDemo={true}>
                <GameScreen />
              </RequireAuth>
            }
          />
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

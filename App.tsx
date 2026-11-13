import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { translate } from './services/i18n';
import { EVENT_NAME, TIMER_GAME_NAME } from './config/constants';
import { designPalette } from './services/eventRules';

function RoutePresentation() {
  const { pathname } = useLocation();
  const mode = useGameStore((state) => state.selectedGameMode);

  useEffect(() => {
    const gamePage = ['/game', '/player', '/play'].includes(pathname);
    const title = gamePage ? mode === 'target-timer' ? TIMER_GAME_NAME : 'Vintage Picture Match' : 'Game Lounge';
    document.title = `${title} | ${EVENT_NAME}`;
  }, [pathname, mode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const settings = useGameStore((state) => state.settings);

  useEffect(() => {
    const handleAudioError = () => {
      const state = useGameStore.getState();
      state.showToast(translate('Background audio could not be played. Check the MP3 file.', state.settings.language), 'error');
    };
    window.addEventListener('ppm-audio-error', handleAudioError);
    return () => window.removeEventListener('ppm-audio-error', handleAudioError);
  }, []);

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
    const root = document.documentElement;
    const palette = designPalette(settings);
    const variables: Record<string, string | undefined> = {
      '--design-color': palette?.color,
      '--design-panel': palette?.panel,
      '--design-card': palette?.card,
      '--design-card-hover': palette?.cardHover,
    };
    Object.entries(variables).forEach(([name, value]) => (value ? root.style.setProperty(name, value) : root.style.removeProperty(name)));
    root.toggleAttribute('data-design-tint', Boolean(palette));
    root.setAttribute('data-event-bg', settings.eventBackground ?? 'ribbon');
    root.toggleAttribute('data-reduced-motion', settings.reducedMotion);
  }, [settings.designColor, settings.customDesignColor, settings.eventBackground, settings.reducedMotion]);

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

  useEffect(() => {
    const INTERACTIVE_SELECTOR = [
      'button:not(:disabled)',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="tab"]',
      '[role="switch"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="link"]',
      'a[href]',
      'input[type="button"]:not(:disabled)',
      'input[type="submit"]:not(:disabled)',
      'input[type="reset"]:not(:disabled)',
      'input[type="checkbox"]:not(:disabled)',
      'input[type="radio"]:not(:disabled)',
      '.btn',
      '.kiosk-nav-button',
      '.kiosk-play-cta',
      '.kiosk-new-player',
      '.vintage-selection-card',
      '.vintage-admin-medallion-btn',
      '.medallion-btn',
      '.tab-btn',
      '.menu-btn',
      'summary',
    ].join(', ');

    let lastHandledEl: Element | null = null;
    let lastHandledAt = 0;

    const findInteractive = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      return target.closest(INTERACTIVE_SELECTOR);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const interactive = findInteractive(event.target);
      if (interactive) {
        lastHandledEl = interactive;
        lastHandledAt = performance.now();
        soundManager.playClick();
      }
    };

    const handleClick = (event: MouseEvent) => {
      const interactive = findInteractive(event.target);
      if (!interactive) return;
      // Avoid double-triggering if pointerdown or keydown already handled this element press
      if (interactive === lastHandledEl && performance.now() - lastHandledAt < 1500) {
        lastHandledEl = null;
        return;
      }
      soundManager.playClick();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
      const interactive = findInteractive(event.target);
      if (interactive) {
        lastHandledEl = interactive;
        lastHandledAt = performance.now();
        soundManager.playClick();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('click', handleClick, { capture: true, passive: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return (
    <BrowserRouter>
      <RoutePresentation />
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
          <Route path="/leaderboard" element={settings.showLeaderboard === false ? <Navigate to="/" replace /> : <LeaderboardScreen />} />
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

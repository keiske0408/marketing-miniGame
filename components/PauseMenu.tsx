import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuButton } from './MenuButton';
import { Modal } from './Modal';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { useGameStore } from '../store/gameStore';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseMenu({ onResume, onRestart }: PauseMenuProps) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  const handleQuit = () => {
    navigate('/menu');
  };

  return (
    <>
      <div className="overlay pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <div className="card pause-card">
          <h2 id="pause-title">Game Paused</h2>
          <p>Catch your breath! The timer is stopped.</p>

          <div className="pause-actions">
            <MenuButton variant="primary" onClick={onResume}>
              ▶ Resume
            </MenuButton>
            <MenuButton variant="secondary" onClick={onRestart}>
              ↺ Restart Round
            </MenuButton>
            <MenuButton variant="ghost" onClick={() => setShowSettings(true)}>
              ⚙ Quick Settings
            </MenuButton>
            <MenuButton variant="danger" onClick={handleQuit}>
              ✕ Quit to Menu
            </MenuButton>
          </div>
        </div>
      </div>

      <Modal
        title="Quick Audio Settings"
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      >
        <div className="quick-settings-list">
          <Slider
            label="Master Volume"
            value={settings.masterVolume}
            onChange={(val) => updateSettings({ masterVolume: val })}
          />
          <Slider
            label="SFX Volume"
            value={settings.sfxVolume}
            onChange={(val) => updateSettings({ sfxVolume: val })}
          />
          <Toggle
            label="Mute Audio"
            checked={settings.muted}
            onChange={(val) => updateSettings({ muted: val })}
          />
          <Toggle
            label="Haptic Vibrations"
            checked={settings.haptics}
            onChange={(val) => updateSettings({ haptics: val })}
          />
        </div>
      </Modal>
    </>
  );
}


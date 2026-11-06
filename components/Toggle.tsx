import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

interface ToggleProps {
  label: string;
  checked: boolean;
  description?: string;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}

export function Toggle({ label, checked, description, disabled = false, onChange }: ToggleProps) {
  const handleToggle = () => {
    if (disabled) return;
    soundManager.playClick();
    haptics.tick();
    onChange(!checked);
  };

  return (
    <div className={`toggle-control ${disabled ? 'is-disabled' : ''}`}>
      <div className="toggle-text">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-description">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={handleToggle}
        className={`toggle-switch ${checked ? 'is-checked' : ''}`}
      >
        <span className="toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}


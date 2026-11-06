import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (val: number) => void;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  disabled = false,
  onChange,
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onChange(val);
  };

  const handlePointerUp = () => {
    soundManager.playClick();
    haptics.tick();
  };

  return (
    <div className={`slider-control ${disabled ? 'is-disabled' : ''}`}>
      <div className="slider-header">
        <label htmlFor={`slider-${label}`} className="slider-label">
          {label}
        </label>
        <span className="slider-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        onPointerUp={handlePointerUp}
        className="slider-input"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}


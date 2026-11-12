import { useNavigate } from 'react-router-dom';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { useTranslation } from '../services/i18n';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export function BackButton({ to, label, className = '' }: BackButtonProps) {
  const t = useTranslation();
  const buttonLabel = label ?? t('Back');
  const navigate = useNavigate();

  const handleClick = () => {
    soundManager.playClick();
    haptics.tick();
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      className={`back-btn ${className}`}
      onClick={handleClick}
      aria-label={buttonLabel}
    >
      <span className="back-arrow" aria-hidden="true">‹</span>
      <span className="back-text">{buttonLabel}</span>
    </button>
  );
}


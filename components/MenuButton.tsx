import type { ReactNode } from 'react';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

interface MenuButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  icon?: ReactNode;
  badge?: string;
  subtitle?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function MenuButton({
  onClick,
  children,
  variant = 'primary',
  icon,
  badge,
  subtitle,
  disabled = false,
  type = 'button',
  className = '',
}: MenuButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    soundManager.playClick();
    haptics.tick();
    onClick?.();
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`menu-btn menu-btn-${variant} ${className} ${disabled ? 'is-disabled' : ''}`}
    >
      <div className="menu-btn-content">
        {icon && <span className="menu-btn-icon" aria-hidden="true">{icon}</span>}
        <div className="menu-btn-text-group">
          <span className="menu-btn-title">{children}</span>
          {subtitle && <span className="menu-btn-subtitle">{subtitle}</span>}
        </div>
      </div>
      {badge && <span className="menu-btn-badge">{badge}</span>}
    </button>
  );
}


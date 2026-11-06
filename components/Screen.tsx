import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import { EVENT_NAME } from '../config/constants';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  headerRight?: ReactNode;
  showEventBanner?: boolean;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export function Screen({
  title,
  subtitle,
  showBack = false,
  backTo,
  headerRight,
  showEventBanner = false,
  children,
  className = '',
  maxWidth = '620px',
}: ScreenProps) {
  const hasHeader = Boolean(title || showBack || headerRight);

  return (
    <div className={`screen-wrapper ${className}`}>
      {showEventBanner && (
        <div className="event-top-banner">
          <span className="event-tag">🍷 LIVE TASTING</span>
          <span className="event-name">{EVENT_NAME}</span>
          <span className="event-badge">🍾 Rewards Available</span>
        </div>
      )}

      {hasHeader && (
        <header className="screen-header" style={{ maxWidth }}>
          <div className="screen-header-left">
            {showBack && <BackButton to={backTo} />}
            {title && (
              <div className="screen-titles">
                <h1 className="screen-title">{title}</h1>
                {subtitle && <p className="screen-subtitle">{subtitle}</p>}
              </div>
            )}
          </div>
          {headerRight && <div className="screen-header-right">{headerRight}</div>}
        </header>
      )}

      <main className="screen-content" style={{ maxWidth }}>
        {children}
      </main>
    </div>
  );
}

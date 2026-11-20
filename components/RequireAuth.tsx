import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../services/i18n';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const auth = useAuthStore((state) => state.auth);
  const location = useLocation();
  const t = useTranslation();

  if (auth.status === 'checking') {
    return <main className="screen-wrapper" role="status">{t('Checking admin session...')}</main>;
  }
  if (auth.status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location.pathname + location.search + location.hash }} replace />;
  }

  return <>{children}</>;
}


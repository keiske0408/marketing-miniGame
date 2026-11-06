import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';

interface RequireAuthProps {
  children: ReactNode;
  allowGuestDemo?: boolean;
}

export function RequireAuth({ children, allowGuestDemo = false }: RequireAuthProps) {
  const user = useGameStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.isGuest && !allowGuestDemo && user.demoRoundsLeft <= 0) {
    return <Navigate to="/login" state={{ from: location, guestExhausted: true }} replace />;
  }

  return <>{children}</>;
}


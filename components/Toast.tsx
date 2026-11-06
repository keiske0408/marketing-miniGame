import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function Toast() {
  const toast = useGameStore((state) => state.toast);
  const clearToast = useGameStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className={`app-toast toast-${toast.type}`}
      role="status"
      aria-live="polite"
      onClick={clearToast}
    >
      <span className="toast-icon">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'ℹ'}
      </span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}


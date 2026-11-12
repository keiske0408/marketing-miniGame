import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { translate, useTranslation } from './i18n';
import { appendEventScore, EVENT_SCORES_CHANGED, EVENT_SCORES_KEY, readEventScores } from './eventScores';
import type { EventScore, NewEventScore } from './eventScores';

export function useEventScores() {
  const [scores, setScores] = useState<EventScore[]>([]);
  const [error, setError] = useState(false);
  const language = useGameStore((state) => state.settings.language);
  const t = useTranslation();

  const reportError = useCallback((cause: unknown) => {
    console.error('Event leaderboard storage failed:', cause);
    setError(true);
    useGameStore.getState().showToast(
      translate('Cannot access leaderboard. Check browser storage.', language),
      'error',
    );
  }, [language]);

  const refresh = useCallback(() => {
    try {
      setScores(readEventScores(localStorage));
      setError(false);
    } catch (cause) {
      reportError(cause);
    }
  }, [reportError]);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === EVENT_SCORES_KEY || event.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT_SCORES_CHANGED, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVENT_SCORES_CHANGED, refresh);
    };
  }, [refresh]);

  const save = (name: string, result: NewEventScore) => {
    try {
      const next = appendEventScore(localStorage, {
        ...result, id: crypto.randomUUID(), name, createdAt: Date.now(),
      });
      setScores(next);
      setError(false);
      window.dispatchEvent(new Event(EVENT_SCORES_CHANGED));
    } catch (cause) {
      reportError(cause);
    }
  };

  return { scores, save, refresh, error: error ? t('Cannot access leaderboard. Check browser storage.') : null };
}

import type { GameMode } from '../types';
import { hundredths, validTimerRules } from './eventRules';
import type { TimerResult } from './eventRules';

interface Entry {
  id: string;
  name: string;
  createdAt: number;
}

export type EventScore = Entry & (
  { mode: 'picture-match'; percentage: number }
  | ({ mode: 'target-timer' } & TimerResult)
);

export type NewEventScore =
  { mode: 'picture-match'; percentage: number }
  | ({ mode: 'target-timer' } & TimerResult);

export const EVENT_SCORES_KEY = 'ppm_event_results_v2';
export const EVENT_SCORES_CHANGED = 'ppm-event-results-changed';

export function isEventScore(value: unknown): value is EventScore {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string'
    || typeof entry.createdAt !== 'number' || !Number.isFinite(entry.createdAt)) return false;
  if (entry.mode === 'picture-match') {
    return typeof entry.percentage === 'number' && Number.isFinite(entry.percentage)
      && entry.percentage >= 0 && entry.percentage <= 100;
  }
  return entry.mode === 'target-timer'
    && typeof entry.elapsed === 'number' && Number.isFinite(entry.elapsed) && entry.elapsed >= 0
    && typeof entry.target === 'number' && typeof entry.winMin === 'number' && typeof entry.winMax === 'number'
    && validTimerRules({ target: entry.target, winMin: entry.winMin, winMax: entry.winMax });
}

export function rankScores(entries: EventScore[], mode: GameMode): EventScore[] {
  return entries.filter((entry) => entry.mode === mode).sort((a, b) => {
    const first = a.mode === 'picture-match' ? -a.percentage : Math.abs(hundredths(a.elapsed) - hundredths(a.target));
    const second = b.mode === 'picture-match' ? -b.percentage : Math.abs(hundredths(b.elapsed) - hundredths(b.target));
    return first - second || a.createdAt - b.createdAt || a.id.localeCompare(b.id);
  });
}

export function formatEventScore(entry: NewEventScore): string {
  return entry.mode === 'picture-match' ? `${entry.percentage}%` : `${entry.elapsed.toFixed(2)}s`;
}

export function readEventScores(storage: Storage): EventScore[] {
  const raw = storage.getItem(EVENT_SCORES_KEY);
  if (raw === null) {
    storage.removeItem('ppm_kiosk_leaderboard');
    storage.removeItem('ppm_vintage_match_best');
    storage.setItem(EVENT_SCORES_KEY, '[]');
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isEventScore)) {
    throw new Error('Invalid event leaderboard data.');
  }
  return parsed;
}

export function appendEventScore(storage: Storage, entry: EventScore): EventScore[] {
  if (!isEventScore(entry)) throw new Error('Invalid event result.');
  const entries = [...readEventScores(storage), entry];
  const next = (['picture-match', 'target-timer'] as const).flatMap((mode) => rankScores(entries, mode).slice(0, 100));
  storage.setItem(EVENT_SCORES_KEY, JSON.stringify(next));
  return next;
}

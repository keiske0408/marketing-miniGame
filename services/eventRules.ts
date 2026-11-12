import { DEFAULT_SETTINGS } from '../config/constants';
import type { UserSettings } from '../types';

export interface TimerRules {
  target: number;
  winMin: number;
  winMax: number;
}

export interface TimerResult extends TimerRules {
  elapsed: number;
}

export const hundredths = (seconds: number) => Math.round(seconds * 100);
export const displayedSeconds = (seconds: number) => hundredths(seconds) / 100;

export function timerWon(result: TimerResult): boolean {
  const elapsed = hundredths(result.elapsed);
  return elapsed >= hundredths(result.winMin) && elapsed <= hundredths(result.winMax);
}

export function timerRules(settings: UserSettings): TimerRules {
  return {
    target: settings.timerTargetMode === 'fixed' ? settings.timerCustomTarget ?? 23 : 23,
    winMin: settings.timerWinMin ?? 22.34,
    winMax: settings.timerWinMax ?? 23.99,
  };
}

export function validTimerRules(rules: TimerRules): boolean {
  return [rules.target, rules.winMin, rules.winMax].every(Number.isFinite)
    && rules.target >= 1 && rules.target <= 300
    && rules.winMin >= 0 && rules.winMax <= 300 && rules.winMin <= rules.winMax;
}

export function normalizeSettings(saved: Partial<UserSettings>): UserSettings {
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  const rules = timerRules(settings);
  if (!validTimerRules(rules)) {
    console.warn('Invalid saved Time Stop rules; restoring event defaults.');
    settings.timerTargetMode = 'fixed';
    settings.timerCustomTarget = DEFAULT_SETTINGS.timerCustomTarget;
    settings.timerWinMin = DEFAULT_SETTINGS.timerWinMin;
    settings.timerWinMax = DEFAULT_SETTINGS.timerWinMax;
  }
  const speed = settings.pictureSpeed;
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0.25 || speed > 2) {
    console.warn('Invalid saved Picture Match speed; restoring 1x.');
    settings.pictureSpeed = 1;
  }
  if (settings.pictureMatchMode !== 'single' && settings.pictureMatchMode !== 'multi') {
    console.warn('Invalid saved Picture Match mode; restoring multi-match.');
    settings.pictureMatchMode = DEFAULT_SETTINGS.pictureMatchMode;
  }
  return settings;
}

export function overlapPercentage(
  moving: { left: number; width: number },
  target: { left: number; width: number },
): number {
  if (![moving.left, moving.width, target.left, target.width].every(Number.isFinite)
    || moving.width <= 0 || target.width <= 0) {
    throw new Error('Cannot measure picture alignment.');
  }
  const overlap = Math.max(0, Math.min(moving.left + moving.width, target.left + target.width)
    - Math.max(moving.left, target.left));
  const width = Math.max(moving.width, target.width);
  if (Math.abs(overlap - width) < 0.000001) return 100;
  return Math.min(99, Math.floor(overlap / width * 100));
}

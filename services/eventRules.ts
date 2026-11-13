import { DEFAULT_SETTINGS, DESIGN_COLORS } from '../config/constants';
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

export function formatTimerClock(seconds: number): string {
  const total = hundredths(seconds);
  const minutes = Math.floor(total / 6000);
  const wholeSeconds = Math.floor(total / 100) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(total % 100).padStart(2, '0')}`;
}

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
  if (!['violet', 'mischka', 'slate', 'custom'].includes(settings.designColor as string)) {
    settings.designColor = DEFAULT_SETTINGS.designColor;
  }
  if (typeof settings.customDesignColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(settings.customDesignColor)) {
    settings.customDesignColor = DEFAULT_SETTINGS.customDesignColor;
  }
  if (settings.eventBackground !== 'ribbon' && settings.eventBackground !== 'circles') {
    settings.eventBackground = DEFAULT_SETTINGS.eventBackground;
  }
  if (typeof settings.showLeaderboard !== 'boolean') settings.showLeaderboard = true;
  if (typeof settings.showGuidelines !== 'boolean') settings.showGuidelines = true;
  return settings;
}

export interface DesignPalette {
  color: string;
  panel: string;
  card: string;
  cardHover: string;
}

function mixHex(color: string, base: string, amount: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  return `#${[0, 1, 2].map((index) => Math.round(channel(color, index) * amount + channel(base, index) * (1 - amount)).toString(16).padStart(2, '0')).join('')}`;
}

/** Returns null for the default Violet Velocity design, which keeps the stylesheet's exact colours. */
export function designPalette(settings: Pick<UserSettings, 'designColor' | 'customDesignColor'>): DesignPalette | null {
  const choice = settings.designColor ?? 'violet';
  const color = choice === 'custom' ? settings.customDesignColor : DESIGN_COLORS[choice];
  if (!color || !/^#[0-9a-f]{6}$/i.test(color) || color.toLowerCase() === DESIGN_COLORS.violet) return null;
  // Panels mix the chosen colour into deep violet so white text keeps strong contrast even for light colours.
  return {
    color: color.toLowerCase(),
    panel: mixHex(color, '#14092f', 0.3),
    card: `${mixHex(color, '#14092f', 0.32)}ed`,
    cardHover: mixHex(color, '#14092f', 0.38),
  };
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

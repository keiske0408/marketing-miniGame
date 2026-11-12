import type { UserSettings } from '../types';

export const EVENT_NAME =
  import.meta.env?.VITE_EVENT_NAME || 'GRAND VINTAGE 2026 // WINE TASTING GALA';

export const BRAND_COLORS = {
  primary: '#4A0718',   // Deep Burgundy
  darkWine: '#720D28',  // Dark Wine Red
  accent: '#C9A45C',    // Antique Gold
  cream: '#F5E8D0',     // Champagne Cream
  darkBrown: '#302018', // Dark Brown
  darkBg: '#180910',
  cardBg: '#26101b',
};

export const DEFAULT_SETTINGS: UserSettings = {
  masterVolume: 80,
  musicVolume: 65,
  sfxVolume: 85,
  muted: false,
  haptics: true,
  reducedMotion:
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  theme: 'auto',
  language: 'en',
  difficulty: 'normal',
  timerTargetMode: 'fixed',
  timerCustomTarget: 23,
  timerWinMin: 22.34,
  timerWinMax: 23.99,
  pictureSpeed: 1,
  pictureMatchMode: 'multi',
  requirePlayerName: false,
  requirePlayerEmail: false,
  requirePlayerPhone: false,
};

export const HOW_TO_PLAY_STEPS = [
  {
    title: 'Game 1: Vintage Picture Match (Wine Edition)',
    desc: 'In Multi-match mode, each successful stop earns another match until you miss. In One match mode, the game ends after your first successful match. Tap Stop or press Space when the moving glass overlaps its outline.',
  },
  {
    title: 'Game 2: THE PERFECT 23',
    desc: 'A Stop the Clock Challenge. 23 Seconds. One Perfect Moment. Participants must stop a running timer as close as possible to 23.00 seconds to win a prize. The event host can adjust the target and winning range in Settings.',
  },
  {
    title: 'Claim Tasting & Bottle Rewards',
    desc: 'Score points in either challenge to unlock complimentary tasting pours, sommelier vouchers, and cellar discounts at the Grand Vintage Tasting Bar.',
  },
];

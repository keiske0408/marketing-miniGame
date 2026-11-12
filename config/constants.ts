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
  requirePlayerName: false,
  requirePlayerEmail: false,
  requirePlayerPhone: false,
};

export const HOW_TO_PLAY_STEPS = [
  {
    title: 'Game 1: Vintage Picture Match (Wine Edition)',
    desc: 'Stop the moving glass once by tapping Stop or pressing Space. Your result is the percentage of horizontal overlap with its outline. Full alignment earns 100%. One attempt per round.',
  },
  {
    title: 'Game 2: Time Stop',
    desc: 'Start the round and stop as close as you can to the target time. The event host sets the winning minimum and maximum in Settings. Results are shown in seconds.',
  },
  {
    title: 'Claim Tasting & Bottle Rewards',
    desc: 'Score points in either challenge to unlock complimentary tasting pours, sommelier vouchers, and cellar discounts at the Grand Vintage Tasting Bar.',
  },
];

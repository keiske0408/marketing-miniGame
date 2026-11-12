import type { UserSettings } from '../types';

export const EVENT_NAME =
  import.meta.env.VITE_EVENT_NAME || 'GRAND VINTAGE 2026 // WINE TASTING GALA';

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
  timerCustomTarget: 24,
  requirePlayerName: false,
  requirePlayerEmail: false,
  requirePlayerPhone: false,
};

export const HOW_TO_PLAY_STEPS = [
  {
    title: 'Game 1: Vintage Picture Match (Wine Edition)',
    desc: 'Watch the crystal wine glass filled with Bordeaux red wine glide horizontally across the vineyard. Tap "Click to Stop" or press Spacebar at the exact moment it fits into the golden silhouette cutout in the picture frame! You have 3 tasting lives (hearts) — each miss costs 1 life. No timer, pure precision!',
  },
  {
    title: 'Game 2: Time Stop',
    desc: 'Start the round and stop as close as you can to the target time.',
  },
  {
    title: 'Claim Tasting & Bottle Rewards',
    desc: 'Score points in either challenge to unlock complimentary tasting pours, sommelier vouchers, and cellar discounts at the Grand Vintage Tasting Bar.',
  },
];

import type { UserSettings, LeaderboardEntry } from '../types';

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
  timerTargetMode: 'dynamic',
  timerCustomTarget: 5.0,
};

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u-1', displayName: 'ChateauMaster', score: 38, accuracy: 98, level: 7, gameMode: 'picture-match' },
  { rank: 2, userId: 'u-2', displayName: 'SommelierEva', score: 34, accuracy: 96, level: 6, gameMode: 'target-timer' },
  { rank: 3, userId: 'u-3', displayName: 'VinoViper', score: 29, accuracy: 92, level: 5, gameMode: 'picture-match' },
  { rank: 4, userId: 'u-4', displayName: 'PinotNoir99', score: 24, accuracy: 89, level: 4, gameMode: 'target-timer' },
  { rank: 5, userId: 'u-5', displayName: 'GoldenCask', score: 19, accuracy: 85, level: 4, gameMode: 'picture-match' },
];

export const HOW_TO_PLAY_STEPS = [
  {
    title: 'Game 1: Vintage Picture Match (Wine Edition)',
    desc: 'Watch the crystal wine glass filled with Bordeaux red wine glide horizontally across the vineyard. Tap "Click to Stop" or press Spacebar at the exact moment it fits into the golden silhouette cutout in the picture frame! You have 3 tasting lives (hearts) — each miss costs 1 life. No timer, pure precision!',
  },
  {
    title: 'Game 2: The Perfect Pour (Stopwatch Challenge)',
    desc: 'Given a target time in seconds (e.g., 5.00s), press Start Pouring to start the clock, then tap Stop right on the target second! Stopping within ±0.10s wins the round, and ±0.02s earns a Perfect Vintage Bonus!',
  },
  {
    title: 'Claim Tasting & Bottle Rewards',
    desc: 'Score points in either challenge to unlock complimentary tasting pours, sommelier vouchers, and cellar discounts at the Grand Vintage Tasting Bar.',
  },
];

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Difficulty = 'chill' | 'normal' | 'hard';
export type Language = 'en' | 'tl' | 'es' | 'fr' | 'de';
export type GameMode = 'picture-match' | 'target-timer';
export type TimerTargetMode = 'dynamic' | 'fixed';
export type PictureMatchMode = 'single' | 'multi';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  isGuest: boolean;
  isAdmin?: boolean;
  role?: 'admin' | 'player';
  demoRoundsLeft: number;
  createdAt: string;
}

export interface UserSettings {
  masterVolume: number; // 0 - 100
  musicVolume: number;  // 0 - 100
  sfxVolume: number;    // 0 - 100
  muted: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  theme: ThemeMode;
  language: Language;
  difficulty: Difficulty;
  // Event Host / Admin settings for Perfect Pour Timer
  timerTargetMode?: TimerTargetMode; // 'dynamic' (randomized each round) or 'fixed'
  timerCustomTarget?: number;        // e.g. 5.0, 3.0, 7.0 seconds
  timerWinMin?: number;
  timerWinMax?: number;
  pictureSpeed?: number;
  pictureMatchMode?: PictureMatchMode;
  requirePlayerName?: boolean;
  requirePlayerEmail?: boolean;
  requirePlayerPhone?: boolean;
}

export interface Consents {
  termsAccepted: boolean;
  marketingAccepted: boolean;
  consentedAt: string;
}

export interface ScoreSubmission {
  userId: string;
  runId: string;
  gameMode?: GameMode;
  score: number;
  level: number;
  accuracy: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  accuracy: number;
  level: number;
  gameMode?: GameMode;
  isCurrentUser?: boolean;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  code: string;
  unlockedAt: string;
  claimed: boolean;
}

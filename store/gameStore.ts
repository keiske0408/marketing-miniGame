import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile, UserSettings, Consents, RewardItem, GameMode } from '../types';
import { DEFAULT_SETTINGS, SHOW_PICTURE_MATCH } from '../config/constants';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { supabaseService } from '../services/supabase';
import { migrateLegacyTimerDefaults, normalizeSettings } from '../services/eventRules';
import { EVENT_SCORES_CHANGED, EVENT_SCORES_KEY } from '../services/eventScores';

interface GameRunState {
  isActive: boolean;
  gameMode: GameMode;
  level: number;
  score: number;
  matches: number;
  time: number;
  accuracies: number[];
  isPaused: boolean;
  runId: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface KioskPlayer {
  id: string;
  name: string;
  email: string;
  phone: string;
  timerInstructionsSeen?: boolean;
  timerRoundCompleted?: boolean;
}

interface GameStoreState {
  kioskPlayer: KioskPlayer | null;
  setKioskPlayer: (player: KioskPlayer | null) => void;
  // Game Mode Selection
  selectedGameMode: GameMode;
  setGameMode: (mode: GameMode) => void;

  // Auth
  user: UserProfile | null;
  consents: Consents | null;
  setOperator: (user: UserProfile | null) => void;
  updateDisplayName: (name: string) => Promise<void>;
  decrementDemoRound: () => void;
  deleteAccountData: () => Promise<void>;

  // Settings
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;

  // Run
  run: GameRunState;
  startRun: (fresh?: boolean, mode?: GameMode) => void;
  pauseRun: () => void;
  resumeRun: () => void;
  recordMatch: (accuracy: number) => void;
  setRunTime: (time: number) => void;
  advanceLevel: () => void;
  endRun: () => void;

  // Stats & Rewards
  highScore: number;
  highestLevel: number;
  rewards: RewardItem[];
  addReward: (reward: RewardItem) => void;
  claimReward: (id: string) => void;

  // Global Toasts
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

type PersistedGameState = Omit<Partial<Pick<GameStoreState,
  'selectedGameMode' | 'user' | 'consents' | 'settings' | 'highScore' | 'highestLevel' | 'rewards'
>>, 'settings'> & { settings?: Partial<UserSettings> };

const DEFAULT_GAME_MODE: GameMode = SHOW_PICTURE_MATCH ? 'picture-match' : 'target-timer';

const initialRunState: GameRunState = {
  isActive: false,
  gameMode: DEFAULT_GAME_MODE,
  level: 1,
  score: 0,
  matches: 0,
  time: 40,
  accuracies: [],
  isPaused: false,
  runId: '',
};

export const useGameStore = create<GameStoreState>()(
  persist<GameStoreState, [], [], PersistedGameState>(
    (set, get) => ({
      kioskPlayer: null,
      setKioskPlayer: (player) => set({ kioskPlayer: player }),
      selectedGameMode: DEFAULT_GAME_MODE,
      setGameMode: (mode) => set({ selectedGameMode: !SHOW_PICTURE_MATCH && mode === 'picture-match' ? 'target-timer' : mode }),

      // Auth
      user: null,
      consents: null,

      setOperator: (user) => {
        if (user && get().user?.id === user.id) return;
        set({ user, consents: null, kioskPlayer: null, run: initialRunState });
      },

      updateDisplayName: async (name: string) => {
        const current = get().user;
        if (!current) return;
        const updated = { ...current, displayName: name.trim() };
        if (!current.isGuest) {
          const saved = await supabaseService.updateAdminName(updated);
          if (!saved) {
            get().showToast('Unable to update the admin profile. Please try again.', 'error');
            return;
          }
        }
        set({ user: updated });
        get().showToast('Sommelier profile updated', 'success');
      },

      decrementDemoRound: () => {
        const current = get().user;
        if (current && current.isGuest) {
          set({
            user: {
              ...current,
              demoRoundsLeft: Math.max(0, current.demoRoundsLeft - 1),
            },
          });
        }
      },

      deleteAccountData: async () => {
        const current = get().user;
        if (current && !current.isGuest) {
          const deleted = await supabaseService.deleteUserData(current.id);
          if (!deleted) throw new Error('Unable to clear event data. Please try again.');
        }
        localStorage.removeItem(EVENT_SCORES_KEY);
        localStorage.removeItem('ppm_kiosk_leaderboard');
        localStorage.removeItem('ppm_vintage_match_best');
        window.dispatchEvent(new Event(EVENT_SCORES_CHANGED));
        haptics.setEnabled(DEFAULT_SETTINGS.haptics);
        set({
          consents: null,
          kioskPlayer: null,
          settings: DEFAULT_SETTINGS,
          highScore: 0,
          highestLevel: 1,
          rewards: [],
          run: initialRunState,
        });
        get().showToast('Event data cleared. Your admin account is preserved.', 'info');
      },

      // Settings
      settings: DEFAULT_SETTINGS,

      updateSettings: (partial) => {
        const merged = normalizeSettings({ ...get().settings, ...partial });
        set({ settings: merged });
        soundManager.updateSettings(merged);
        haptics.setEnabled(merged.haptics);

        if (typeof document !== 'undefined') {
          if (merged.theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', merged.theme);
          }
        }

        const user = get().user;
        if (user && !user.isGuest) {
          supabaseService.syncSettings(user.id, merged);
        }
      },

      // Run state
      run: initialRunState,

      startRun: (fresh = false, mode) => {
        const current = get().run;
        const targetMode = mode || get().selectedGameMode;
        if (mode) set({ selectedGameMode: mode });

        if (fresh) {
          set({
            run: {
              isActive: true,
              gameMode: targetMode,
              level: 1,
              score: 0,
              matches: 0,
              time: 40,
              accuracies: [],
              isPaused: false,
              runId: `run-${Date.now()}`,
            },
          });
        } else {
          set({
            run: {
              ...current,
              gameMode: targetMode,
              isActive: true,
              matches: 0,
              isPaused: false,
            },
          });
        }
      },

      pauseRun: () => {
        set((state) => ({ run: { ...state.run, isPaused: true } }));
      },

      resumeRun: () => {
        set((state) => ({ run: { ...state.run, isPaused: false } }));
      },

      recordMatch: (accuracy: number) => {
        const current = get().run;
        const newScore = current.score + 1;
        const newMatches = current.matches + 1;
        const newAccs = [...current.accuracies, accuracy];

        const newHigh = Math.max(get().highScore, newScore);
        const newHighLevel = Math.max(get().highestLevel, current.level);

        set({
          highScore: newHigh,
          highestLevel: newHighLevel,
          run: {
            ...current,
            score: newScore,
            matches: newMatches,
            accuracies: newAccs,
          },
        });
      },

      setRunTime: (time: number) => {
        set((state) => ({ run: { ...state.run, time } }));
      },

      advanceLevel: () => {
        const current = get().run;
        const nextLv = current.level + 1;
        set({
          highestLevel: Math.max(get().highestLevel, nextLv),
          run: {
            ...current,
            level: nextLv,
            matches: 0,
            isPaused: false,
          },
        });
      },

      endRun: () => {
        set((state) => ({ run: { ...state.run, isActive: false, isPaused: false } }));
      },

      // High Score & Rewards
      highScore: 0,
      highestLevel: 1,
      rewards: [
        {
          id: 'rew-starter',
          title: 'Welcome Tasting Pour',
          description: 'Complimentary 2oz welcome tasting pour at the Grand Vintage Sommelier Bar',
          badge: '🍷',
          code: 'VINTAGE-WELCOME',
          unlockedAt: new Date().toISOString(),
          claimed: false,
        },
      ],

      addReward: (reward) => {
        set((state) => {
          if (state.rewards.some((r) => r.id === reward.id)) return state;
          return { rewards: [reward, ...state.rewards] };
        });
      },

      claimReward: (id: string) => {
        set((state) => ({
          rewards: state.rewards.map((r) => (r.id === id ? { ...r, claimed: true } : r)),
        }));
        get().showToast('Voucher marked as redeemed at Sommelier Bar!', 'success');
      },

      // Toasts
      toast: null,
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } });
      },
      clearToast: () => {
        set({ toast: null });
      },
    }),
    {
      name: 'ppm_wine_event_storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persisted, version) => {
        if (version !== 0 || !persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
          throw new Error('Cannot migrate saved event data.');
        }
        const saved = persisted as PersistedGameState;
        if (saved.settings !== undefined && (
          saved.settings === null || typeof saved.settings !== 'object' || Array.isArray(saved.settings)
        )) {
          throw new Error('Cannot migrate invalid event settings.');
        }
        return {
          ...saved,
          settings: saved.settings ? migrateLegacyTimerDefaults(saved.settings) : saved.settings,
        };
      },
      merge: (persisted, current) => {
        const saved = persisted as PersistedGameState | undefined;
        const selectedGameMode =
          !SHOW_PICTURE_MATCH && saved?.selectedGameMode === 'picture-match'
            ? 'target-timer'
            : (saved?.selectedGameMode ?? current.selectedGameMode);
        return { ...current, ...saved, user: null, consents: null, selectedGameMode, settings: normalizeSettings(saved?.settings ?? {}) };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('Unable to restore saved event data:', error);
        if (state?.settings) {
          soundManager.updateSettings(state.settings);
          haptics.setEnabled(state.settings.haptics);
        }
      },
      partialize: (state) => ({
        selectedGameMode: state.selectedGameMode,
        settings: state.settings,
        highScore: state.highScore,
        highestLevel: state.highestLevel,
        rewards: state.rewards,
      }),
    }
  )
);

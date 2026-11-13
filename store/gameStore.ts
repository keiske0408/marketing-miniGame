import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile, UserSettings, Consents, RewardItem, GameMode } from '../types';
import { DEFAULT_SETTINGS } from '../config/constants';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { supabaseService } from '../services/supabase';
import { normalizeSettings } from '../services/eventRules';

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
  loginAsGuest: (name?: string) => void;
  loginAsAdmin: () => Promise<void>;
  loginWithEmail: (
    identifier: string,
    displayName: string,
    consents: { terms: boolean; marketing: boolean }
  ) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  decrementDemoRound: () => void;
  logout: () => void;
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

const initialRunState: GameRunState = {
  isActive: false,
  gameMode: 'picture-match',
  level: 1,
  score: 0,
  matches: 0,
  time: 40,
  accuracies: [],
  isPaused: false,
  runId: '',
};

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      kioskPlayer: null,
      setKioskPlayer: (player) => set({ kioskPlayer: player }),
      selectedGameMode: 'picture-match',
      setGameMode: (mode) => set({ selectedGameMode: mode }),

      // Auth
      user: null,
      consents: null,

      loginAsGuest: (name?: string) => {
        const guestUser: UserProfile = {
          id: `guest-${Date.now()}`,
          displayName: name?.trim() || 'Guest Taster',
          isGuest: true,
          isAdmin: false,
          role: 'player',
          demoRoundsLeft: 1,
          createdAt: new Date().toISOString(),
        };
        set({ user: guestUser });
        get().showToast('Welcome, Guest Taster (1 demo round)', 'info');
      },

      loginAsAdmin: async () => {
        const adminUser: UserProfile = {
          id: 'admin-chateau-01',
          displayName: 'Château Grand Admin',
          email: 'admin@chateauvintage.com',
          isGuest: false,
          isAdmin: true,
          role: 'admin',
          demoRoundsLeft: 9999,
          createdAt: new Date().toISOString(),
        };
        const consents: Consents = {
          termsAccepted: true,
          marketingAccepted: true,
          consentedAt: new Date().toISOString(),
        };

        set({ user: adminUser, consents });
        await supabaseService.upsertProfile(adminUser);
        await supabaseService.saveConsents(adminUser.id, consents);
        get().showToast('👑 Welcome, Château Grand Admin! Full event settings unlocked.', 'success');
      },

      loginWithEmail: async (identifier, displayName, consentOpts) => {
        const cleanId = identifier.trim().toLowerCase();
        const isEmail = cleanId.includes('@');
        const isAdmin = cleanId === 'admin@chateauvintage.com' || cleanId.startsWith('admin@');
        const id = isAdmin
          ? 'admin-chateau-01'
          : `vino-${cleanId.replace(/[^a-z0-9]/g, '').slice(0, 18)}-${Date.now().toString(36)}`;

        const newUser: UserProfile = {
          id,
          email: isEmail ? cleanId : undefined,
          phone: !isEmail ? identifier.trim() : undefined,
          displayName:
            displayName.trim() ||
            (isAdmin ? 'Château Grand Admin' : isEmail ? cleanId.split('@')[0] : 'Wine Guest'),
          isGuest: false,
          isAdmin,
          role: isAdmin ? 'admin' : 'player',
          demoRoundsLeft: 9999,
          createdAt: new Date().toISOString(),
        };
        const consents: Consents = {
          termsAccepted: consentOpts.terms,
          marketingAccepted: consentOpts.marketing,
          consentedAt: new Date().toISOString(),
        };

        set({ user: newUser, consents });

        // Sync directly with Supabase
        await supabaseService.upsertProfile(newUser);
        await supabaseService.saveConsents(id, consents);
        await supabaseService.syncSettings(id, get().settings);

        get().showToast(`Cheers, ${newUser.displayName}! Pass registered.`, 'success');
      },

      updateDisplayName: async (name: string) => {
        const current = get().user;
        if (!current) return;
        const updated = { ...current, displayName: name.trim() };
        set({ user: updated });
        if (!current.isGuest) {
          await supabaseService.upsertProfile(updated);
        }
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

      logout: () => {
        set({ user: null, run: initialRunState });
        get().showToast('Signed out of Tasting Pass', 'info');
      },

      deleteAccountData: async () => {
        const current = get().user;
        if (current && !current.isGuest) {
          await supabaseService.deleteUserData(current.id);
        }
        set({
          user: null,
          consents: null,
          settings: DEFAULT_SETTINGS,
          highScore: 0,
          highestLevel: 1,
          rewards: [],
          run: initialRunState,
        });
        get().showToast('All tasting data permanently deleted', 'info');
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
      merge: (persisted, current) => {
        const saved = persisted as Partial<GameStoreState> | undefined;
        return { ...current, ...saved, settings: normalizeSettings(saved?.settings ?? {}) };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.settings) {
          soundManager.updateSettings(state.settings);
          haptics.setEnabled(state.settings.haptics);
        }
      },
      partialize: (state) => ({
        selectedGameMode: state.selectedGameMode,
        user: state.user,
        consents: state.consents,
        settings: state.settings,
        highScore: state.highScore,
        highestLevel: state.highestLevel,
        rewards: state.rewards,
      }),
    }
  )
);

import { createClient } from '@supabase/supabase-js';
import type { UserProfile, UserSettings, Consents, LeaderboardEntry, GameMode } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) return null;
      return {
        id: data.id,
        displayName: data.display_name,
        email: data.email,
        phone: data.phone,
        isGuest: false,
        demoRoundsLeft: 9999,
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  },

  async upsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: profile.id,
        display_name: profile.displayName,
        email: profile.email || null,
        phone: profile.phone || null,
      });
      return !error;
    } catch {
      return false;
    }
  },

  async syncSettings(userId: string, settings: UserSettings): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        settings,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async saveConsents(userId: string, consents: Consents): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('consents').upsert({
        user_id: userId,
        terms_accepted: consents.termsAccepted,
        marketing_accepted: consents.marketingAccepted,
        consented_at: consents.consentedAt,
      });
      return !error;
    } catch {
      return false;
    }
  },

  async submitScore(params: {
    userId: string;
    displayName: string;
    gameMode: GameMode;
    score: number;
    level: number;
    accuracy: number;
  }): Promise<{ rank: number | null }> {
    if (!supabase) return { rank: null };
    try {
      await supabase.from('scores').insert({
        user_id: params.userId,
        display_name: params.displayName,
        game_mode: params.gameMode,
        score: params.score,
        level: params.level,
        accuracy: params.accuracy,
      });

      const { count } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .gt('score', params.score);

      return { rank: typeof count === 'number' ? count + 1 : 1 };
    } catch {
      return { rank: null };
    }
  },

  async fetchLeaderboard(gameMode?: GameMode): Promise<LeaderboardEntry[]> {
    if (!supabase) return [];
    try {
      let query = supabase
        .from('scores')
        .select('user_id, display_name, game_mode, score, level, accuracy')
        .order('score', { ascending: false })
        .order('accuracy', { ascending: false })
        .limit(15);

      if (gameMode) {
        query = query.eq('game_mode', gameMode);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((row, idx) => ({
        rank: idx + 1,
        userId: row.user_id,
        displayName: row.display_name || 'Guest Sommelier',
        score: row.score,
        level: row.level,
        accuracy: row.accuracy,
        gameMode: (row.game_mode as GameMode) || 'picture-match',
      }));
    } catch {
      return [];
    }
  },

  async deleteUserData(userId: string): Promise<boolean> {
    if (!supabase) return true;
    try {
      await supabase.from('consents').delete().eq('user_id', userId);
      await supabase.from('user_settings').delete().eq('user_id', userId);
      await supabase.from('scores').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      return true;
    } catch {
      return false;
    }
  },
};

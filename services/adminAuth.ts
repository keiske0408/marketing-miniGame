import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export type AdminAuthState =
  | { status: 'checking' | 'signed-out'; user: null; error: null }
  | { status: 'authenticated'; user: UserProfile; error: null }
  | { status: 'error'; user: null; error: string };

export function isAdminUser(user: Pick<User, 'app_metadata'> | null): boolean {
  return user?.app_metadata?.role === 'admin';
}

export function adminProfile(user: User): UserProfile {
  if (!isAdminUser(user)) throw new Error('This account does not have admin access.');
  return {
    id: user.id,
    email: user.email,
    displayName: typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name : 'Event Admin',
    isGuest: false,
    isAdmin: true,
    role: 'admin',
    demoRoundsLeft: 9999,
    createdAt: user.created_at,
  };
}

export function loginDestination(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || /[\\\u0000-\u0020]/.test(value)) return '/';
  const path = value.split(/[?#]/)[0];
  return ['/', '/home', '/game', '/player', '/avp', '/menu', '/play', '/settings', '/leaderboard', '/rewards'].includes(path)
    ? value : '/';
}

export function createAdminAuth(
  client: Pick<SupabaseClient, 'auth'> | null,
  onChange: (state: AdminAuthState) => void,
) {
  let generation = 0;
  let disposed = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let subscription: { unsubscribe: () => void } | undefined;

  const emit = (state: AdminAuthState) => {
    if (!disposed) onChange(state);
  };
  const clearExpiry = () => {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  };
  const fail = (message: string) => {
    clearExpiry();
    emit({ status: 'error', user: null, error: message });
  };
  const verify = async () => {
    const request = ++generation;
    if (!client) {
      fail('Admin login is not configured. Contact the event administrator.');
      return false;
    }
    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (request !== generation || disposed) return false;
      if (sessionError) throw new Error('Unable to restore the admin session. Please try again.');
      if (!session) {
        clearExpiry();
        emit({ status: 'signed-out', user: null, error: null });
        return false;
      }
      const { data: { user }, error } = await client.auth.getUser(session.access_token);
      if (request !== generation || disposed) return false;
      if (error || !user) throw new Error('Unable to verify the admin session. Please sign in again.');
      if (!isAdminUser(user)) throw new Error('This account does not have admin access.');
      if (!session.expires_at || session.expires_at * 1000 <= Date.now()) {
        throw new Error('Your admin session has expired. Please sign in again.');
      }
      clearExpiry();
      expiryTimer = setTimeout(() => {
        emit({ status: 'checking', user: null, error: null });
        void verify();
      }, Math.min(session.expires_at * 1000 - Date.now(), 2_147_483_647));
      emit({ status: 'authenticated', user: adminProfile(user), error: null });
      return true;
    } catch (error) {
      if (request === generation && !disposed) {
        fail(error instanceof Error ? error.message : 'Unable to verify the admin session. Please try again.');
      }
      return false;
    }
  };

  return {
    start() {
      disposed = false;
      if (client) {
        subscription = client.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_OUT') {
            ++generation;
            clearExpiry();
            emit({ status: 'signed-out', user: null, error: null });
          } else {
            // Auth methods must run after Supabase releases its callback lock.
            queueMicrotask(() => { if (!disposed) void verify(); });
          }
        }).data.subscription;
      }
      void verify();
      return () => {
        disposed = true;
        ++generation;
        clearExpiry();
        subscription?.unsubscribe();
      };
    },
    retry: verify,
    async signIn(email: string, password: string) {
      if (!client) {
        fail('Admin login is not configured. Contact the event administrator.');
        return false;
      }
      ++generation;
      emit({ status: 'checking', user: null, error: null });
      try {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error('Sign-in failed. Check your email and password and try again.');
        return await verify();
      } catch (error) {
        ++generation;
        fail(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
        return false;
      }
    },
    async signOut() {
      ++generation;
      clearExpiry();
      emit({ status: 'checking', user: null, error: null });
      try {
        if (!client) throw new Error('Admin login is not configured. Contact the event administrator.');
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw new Error('Sign-out failed. Please retry signing out.');
        emit({ status: 'signed-out', user: null, error: null });
        return true;
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Sign-out failed. Please retry signing out.');
        return false;
      }
    },
  };
}

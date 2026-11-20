import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { createAdminAuth, type AdminAuthState } from '../services/adminAuth';
import { useGameStore } from './gameStore';

export const useAuthStore = create<{ auth: AdminAuthState }>(() => ({
  auth: { status: 'checking', user: null, error: null },
}));

export const adminAuth = createAdminAuth(supabase, (auth) => {
  if (auth.status === 'authenticated') {
    useGameStore.getState().setOperator(auth.user);
  } else if (auth.status !== 'checking') {
    useGameStore.getState().setOperator(null);
  }
  useAuthStore.setState({ auth });
});

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        await fetchProfile(session.user.id);
      }
      if (mounted) setLoading(false);
    }

    async function fetchProfile(userId: string) {
      // Retry a few times in case the trigger hasn't created the profile yet
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (data && mounted) {
          setUser(data as User);
          return;
        }
        if (error) console.warn('fetchProfile attempt', attempt + 1, error.message);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
      }
      // If profile still not found, sign out to avoid stuck loading
      console.error('User profile not found after retries, signing out');
      await supabase.auth.signOut();
      if (mounted) setUser(null);
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user && mounted) {
          await fetchProfile(session.user.id);
        } else if (mounted) {
          setUser(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://notion.cemedis.app',
      },
    });
    if (error) console.error('Sign in error:', error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return { user, loading, signIn, signOut };
}

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function fetchProfile(userId: string): Promise<boolean> {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          if (data && mounted) {
            setUser(data as User);
            return true;
          }
          if (error) console.warn('fetchProfile attempt', attempt + 1, error.message);
        } catch (e) {
          console.warn('fetchProfile exception', e);
        }
        if (attempt < 4) await new Promise((r) => setTimeout(r, 1500));
      }
      return false;
    }

    async function init() {
      try {
        // First check if there's a session already stored
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const found = await fetchProfile(session.user.id);
          if (!found && mounted) {
            console.error('Profile not found, clearing session');
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Listen for auth state changes (handles OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        if (event === 'SIGNED_IN' && session?.user && mounted) {
          const found = await fetchProfile(session.user.id);
          if (!found && mounted) {
            console.error('Profile not found after sign in');
            await supabase.auth.signOut();
            setUser(null);
          }
          if (mounted) setLoading(false);
        } else if (event === 'SIGNED_OUT' && mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    );

    init();

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

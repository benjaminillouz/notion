import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  const fetchProfile = useCallback(async (userId: string, email?: string): Promise<User | null> => {
    try {
      // Try by id
      const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (data) return data as User;

      // Fallback: try by email (for pre-provisioned users)
      if (email) {
        const { data: emailData } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        if (emailData) {
          // Update the id to match auth uid
          await supabase.from('users').update({ id: userId }).eq('email', email);
          return { ...emailData, id: userId } as User;
        }
      }
    } catch (e) {
      console.error('fetchProfile error:', e);
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: never stay on loading for more than 8 seconds
    const timeout = setTimeout(() => {
      if (mounted && useAuthStore.getState().loading) {
        console.warn('Auth timeout - forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await fetchProfile(session.user.id, session.user.email);
          if (profile && mounted) {
            setUser(profile);
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session?.user && mounted) {
        const profile = await fetchProfile(session.user.id, session.user.email);
        if (profile && mounted) {
          setUser(profile);
        }
        if (mounted) setLoading(false);
      } else if (event === 'SIGNED_OUT' && mounted) {
        setUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION' && mounted) {
        // INITIAL_SESSION fires on page load
        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email);
          if (profile && mounted) {
            setUser(profile);
          }
        }
        setLoading(false);
      }
    });

    init();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchProfile]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://notion.cemedis.app' },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return { user, loading, signIn, signOut };
}

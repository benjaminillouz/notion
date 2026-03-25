import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function fetchProfile(userId: string, email?: string): Promise<boolean> {
      // Try by id first, then by email (for pre-provisioned users)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Try by auth id
          let { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          // If not found by id, try by email
          if (!data && email) {
            const res = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .single();
            data = res.data;

            // If found by email, update the id to match auth.uid
            if (data) {
              await supabase
                .from('users')
                .update({ id: userId })
                .eq('email', email);
              data.id = userId;
            }
          }

          if (data && mounted) {
            setUser(data as User);
            return true;
          }
        } catch (e) {
          console.warn('fetchProfile attempt', attempt + 1, e);
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
      }
      return false;
    }

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const found = await fetchProfile(session.user.id, session.user.email);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user && mounted) {
          const found = await fetchProfile(session.user.id, session.user.email);
          if (!found && mounted) {
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

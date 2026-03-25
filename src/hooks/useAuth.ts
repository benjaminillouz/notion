import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

async function fetchProfile(userId: string, email?: string): Promise<User | null> {
  // Try by auth id
  const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (data) return data as User;

  // Fallback: try by email (pre-provisioned users)
  if (email) {
    const { data: byEmail } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (byEmail) {
      await supabase.from('users').update({ id: userId }).eq('email', email);
      return { ...byEmail, id: userId } as User;
    }
  }
  return null;
}

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    // onAuthStateChange handles EVERYTHING: initial load, OAuth callback, sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[auth]', event, session?.user?.email ?? 'no-session');

      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id, session.user.email);
          setUser(profile);
        } catch (e) {
          console.error('[auth] fetchProfile failed:', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      // ALWAYS set loading false after processing any event
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

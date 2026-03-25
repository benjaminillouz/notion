import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

async function fetchProfile(userId: string, email?: string): Promise<User | null> {
  try {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (data) return data as User;
    if (email) {
      const { data: byEmail } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (byEmail) {
        await supabase.from('users').update({ id: userId }).eq('email', email);
        return { ...byEmail, id: userId } as User;
      }
    }
  } catch (e) {
    console.error('[auth] fetchProfile error:', e);
  }
  return null;
}

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    let handled = false;

    async function handleSession(session: any) {
      if (handled) return;
      handled = true;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    // Method 1: Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[auth] event:', _event);
      handleSession(session);
    });

    // Method 2: Explicit getSession as fallback (in case onAuthStateChange doesn't fire)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[auth] getSession:', session?.user?.email ?? 'no session');
      // Only handle if onAuthStateChange hasn't already fired
      if (!handled) {
        handleSession(session);
      }
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

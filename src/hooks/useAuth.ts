import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../lib/types';

// Check if URL has an OAuth callback token
function hasOAuthCallback(): boolean {
  const hash = window.location.hash;
  return hash.includes('access_token=') || hash.includes('error=');
}

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();
  const resolved = useRef(false);

  const fetchProfile = useCallback(async (userId: string, email?: string): Promise<User | null> => {
    try {
      // Try by id
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
    } catch (e) {
      console.error('fetchProfile error:', e);
    }
    return null;
  }, []);

  const resolveAuth = useCallback((profile: User | null) => {
    if (resolved.current) return;
    resolved.current = true;
    setUser(profile);
    setLoading(false);
    // Clean up hash after OAuth callback
    if (hasOAuthCallback()) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [setUser, setLoading]);

  useEffect(() => {
    const isCallback = hasOAuthCallback();

    // Safety timeout - longer if OAuth callback in progress
    const timeout = setTimeout(() => {
      if (!resolved.current) {
        console.warn('Auth timeout');
        resolveAuth(null);
      }
    }, isCallback ? 15000 : 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth:', event, session?.user?.email);

      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email);
        resolveAuth(profile);
      } else if (event === 'SIGNED_OUT') {
        resolveAuth(null);
      } else if (event === 'INITIAL_SESSION' && !isCallback) {
        // No session and not an OAuth callback = genuinely not logged in
        resolveAuth(null);
      }
      // If INITIAL_SESSION + isCallback: do nothing, wait for SIGNED_IN
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile, resolveAuth]);

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

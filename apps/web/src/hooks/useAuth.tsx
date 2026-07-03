import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setUnauthorizedHandler } from '@/integrations/supabase/shim/http';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear in-memory auth when any API call gets a 401 (http.ts handles the
    // redirect to /auth/login as the single choke-point).
    setUnauthorizedHandler(() => {
      setSession(null);
      setUser(null);
    });

    // Retry helper: attempts getSession() up to 4 times with increasing delays
    // to handle transient 504 database timeouts during token refresh
    const retryGetSession = async (): Promise<boolean> => {
      const delays = [2000, 3000, 5000, 8000]; // Increasing backoff
      for (let attempt = 0; attempt < delays.length; attempt++) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        try {
          const { data: { session: recovered } } = await supabase.auth.getSession();
          if (recovered) {
            setSession(recovered);
            setUser(recovered.user);
            return true;
          }
        } catch {
          // Transient error (504/network) — keep retrying, never log out.
        }
      }
      return false;
    };

    // Track whether we had a valid session before — only log out if we
    // explicitly receive SIGNED_OUT, never on transient null sessions.
    let hadSession = false;

    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Intentional logout — clear immediately
        if (event === 'SIGNED_OUT') {
          hadSession = false;
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Valid session received — update state
        if (session) {
          hadSession = true;
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }

        // Session is null but NOT a sign-out — likely a token refresh failure (504 timeout)
        // Only attempt recovery if we previously had a session
        if (hadSession) {
          const recovered = await retryGetSession();
          if (recovered) {
            hadSession = true;
          } else {
            // All retries exhausted. Do one final getSession to distinguish a
            // transient error (504/network — keep state, the next refresh may
            // succeed) from a confirmed no-session (clear state so the UI
            // matches the 401 choke-point redirect — no zombie logged-in state).
            try {
              const { data: { session: lastChance } } = await supabase.auth.getSession();
              if (lastChance) {
                setSession(lastChance);
                setUser(lastChance.user);
                hadSession = true;
              } else {
                // Confirmed no session (an actual null, not an error) — clear.
                hadSession = false;
                setSession(null);
                setUser(null);
              }
            } catch {
              // Transient failure on the final check — preserve current state.
            }
          }
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        hadSession = true;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      setUnauthorizedHandler(null);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

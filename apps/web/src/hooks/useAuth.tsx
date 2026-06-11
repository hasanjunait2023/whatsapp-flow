import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retry helper: attempts getSession() up to 4 times with increasing delays
    // to handle transient 504 database timeouts during token refresh
    const retryGetSession = async (): Promise<boolean> => {
      const delays = [2000, 3000, 5000, 8000]; // Increasing backoff
      for (let attempt = 0; attempt < delays.length; attempt++) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        try {
          const { data: { session: recovered } } = await supabase.auth.getSession();
          if (recovered) {
            console.log(`[Auth] Session recovered on retry attempt ${attempt + 1}`);
            setSession(recovered);
            setUser(recovered.user);
            return true;
          }
        } catch (err) {
          console.warn(`[Auth] Retry attempt ${attempt + 1} failed:`, err);
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
          console.warn(`[Auth] Null session on event "${event}" — attempting recovery (had previous session)...`);
          const recovered = await retryGetSession();
          if (recovered) {
            hadSession = true;
          } else {
            // Even after all retries failed, check localStorage for persisted session
            // before giving up — the SDK may recover on its own
            console.warn('[Auth] All retries failed — checking for persisted session...');
            try {
              const { data: { session: lastChance } } = await supabase.auth.getSession();
              if (lastChance) {
                console.log('[Auth] Persisted session found — keeping user logged in');
                setSession(lastChance);
                setUser(lastChance.user);
                hadSession = true;
              } else {
                console.warn('[Auth] No persisted session — keeping current state (not logging out)');
                // Do NOT clear session state here — let the user stay on the page
                // They can manually refresh or the next token refresh cycle may succeed
              }
            } catch {
              console.warn('[Auth] Final session check failed — preserving current state');
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

    return () => subscription.unsubscribe();
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
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
